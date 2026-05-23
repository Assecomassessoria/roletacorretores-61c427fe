import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ShieldCheck, AlertTriangle } from "lucide-react";

type Role = "incorporadora" | "gerente" | "coordenador" | "corretor";
const ROLES: Role[] = ["incorporadora", "gerente", "coordenador", "corretor"];

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários & Papéis — Roleta Corretor" }] }),
});

function UsuariosPage() {
  const { roles, user } = useAuth();
  const isIncorporadora = roles.includes("incorporadora");
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [novoRole, setNovoRole] = useState<Role>("corretor");
  const [busy, setBusy] = useState(false);

  const profilesQ = useQuery({
    queryKey: ["profiles-with-roles"],
    enabled: isIncorporadora,
    queryFn: async () => {
      const [{ data: profs, error: e1 }, { data: rls, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email"),
        supabase.from("user_roles").select("id, user_id, role, empreendimento_id"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byUser = new Map<string, { id: string; role: Role; empreendimento_id: string | null }[]>();
      for (const r of rls ?? []) {
        const list = byUser.get(r.user_id) ?? [];
        list.push({ id: r.id, role: r.role as Role, empreendimento_id: r.empreendimento_id });
        byUser.set(r.user_id, list);
      }
      return (profs ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  if (!isIncorporadora) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-6 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Acesso restrito</div>
          <p className="mt-2">Apenas a Incorporadora pode gerenciar usuários e papéis.</p>
        </div>
      </main>
    );
  }

  async function atribuirPapel(targetEmail: string, role: Role) {
    setBusy(true);
    try {
      // Buscar profile pelo email
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", targetEmail.trim().toLowerCase())
        .maybeSingle();
      if (error) throw error;
      if (!prof) {
        toast.error("Usuário não encontrado. Ele precisa criar conta em /login primeiro.");
        return;
      }
      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: prof.id, role });
      if (insErr) {
        if (insErr.code === "23505") toast.warning("Esse papel já está atribuído.");
        else throw insErr;
      } else {
        toast.success(`Papel '${role}' atribuído a ${targetEmail}`);
        setEmail("");
        qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atribuir papel");
    } finally {
      setBusy(false);
    }
  }

  async function removerPapel(roleId: string, targetUserId: string, role: Role) {
    if (targetUserId === user?.id && role === "incorporadora") {
      if (!confirm("Você está removendo SEU PRÓPRIO acesso de Incorporadora. Continuar?")) return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) return toast.error(error.message);
    toast.success("Papel removido");
    qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    atribuirPapel(email, novoRole);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-orange" /> Usuários & Papéis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atribua papéis aos usuários cadastrados. Cada usuário precisa primeiro criar conta em <code className="rounded bg-muted px-1">/login</code>.
        </p>
      </div>

      <section className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Atribuir papel
        </h2>
        <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail do usuário</Label>
            <Input type="email" required placeholder="usuario@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Papel</Label>
            <Select value={novoRole} onValueChange={(v) => setNovoRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">Atribuir</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Usuários cadastrados ({profilesQ.data?.length ?? 0})
        </h2>
        {profilesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="divide-y divide-border">
            {profilesQ.data?.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.nome || "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.roles.length === 0 && <span className="text-xs text-muted-foreground italic">sem papel</span>}
                  {p.roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1.5">
                      <Badge variant={r.role === "incorporadora" ? "default" : "outline"}>{r.role}</Badge>
                      <button
                        title="Remover papel"
                        onClick={() => removerPapel(r.id, p.id, r.role)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
