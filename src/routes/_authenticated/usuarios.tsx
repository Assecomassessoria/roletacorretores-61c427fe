import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { criarUsuarioComPapel } from "@/lib/usuarios.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ShieldCheck, AlertTriangle, UserPlus, Building2 } from "lucide-react";

type Role = "incorporadora" | "gerente" | "coordenador" | "corretor";
const ROLES: Role[] = ["incorporadora", "gerente", "coordenador", "corretor"];

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários & Papéis — Roleta Corretor" }] }),
});

const BRAND_STORAGE_KEY = "rc:brand-identity";

type Brand = {
  nome: string;
  cnpj: string;
  whatsappVendas: string;
  emailAuditoria: string;
  gerenteWhatsapp: string;
  gerenteEmail: string;
};
const BRAND_DEFAULT: Brand = {
  nome: "", cnpj: "", whatsappVendas: "", emailAuditoria: "",
  gerenteWhatsapp: "", gerenteEmail: "",
};

function UsuariosPage() {
  const { roles, user, isMaster } = useAuth();
  const isIncorporadora = roles.includes("incorporadora") || isMaster;
  const qc = useQueryClient();
  const criarUsuario = useServerFn(criarUsuarioComPapel);

  // Brand identity (persistido localmente — UI de setup)
  const [brand, setBrand] = useState<Brand>(() => {
    if (typeof window === "undefined") return BRAND_DEFAULT;
    try { return { ...BRAND_DEFAULT, ...JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY) ?? "{}") }; }
    catch { return BRAND_DEFAULT; }
  });
  function saveBrand(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
    toast.success("Identidade da Marca salva.");
  }

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

  // Criar usuário com senha
  const [novo, setNovo] = useState({
    nome: "", whatsapp: "", email: "", senha: "", senha2: "",
    role: "gerente" as Role,
  });
  const [busy, setBusy] = useState(false);
  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (novo.senha !== novo.senha2) return toast.error("As senhas não conferem.");
    if (novo.senha.length < 6) return toast.error("Senha mínima de 6 caracteres.");
    setBusy(true);
    try {
      await criarUsuario({
        data: {
          nome: novo.nome, email: novo.email.trim().toLowerCase(),
          telefone: novo.whatsapp || null, senha: novo.senha, role: novo.role,
        },
      });
      toast.success(`Usuário ${novo.email} criado com papel '${novo.role}'.`);
      setNovo({ nome: "", whatsapp: "", email: "", senha: "", senha2: "", role: novo.role });
      qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally { setBusy(false); }
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-orange" /> Painel da Incorporadora (Setup)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade da marca, criação de usuários e atribuição de papéis.
        </p>
      </div>

      {/* IDENTIDADE DA MARCA */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-4 w-4" /> Identidade da Marca
        </h2>
        <form onSubmit={saveBrand} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da Incorporadora">
            <Input value={brand.nome} onChange={(e) => setBrand({ ...brand, nome: e.target.value })} placeholder="ROLETA CORRETOR" />
          </Field>
          <Field label="CNPJ Institucional">
            <Input value={brand.cnpj} onChange={(e) => setBrand({ ...brand, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
          </Field>
          <Field label="WhatsApp Grupo de Vendas">
            <Input value={brand.whatsappVendas} onChange={(e) => setBrand({ ...brand, whatsappVendas: e.target.value })} placeholder="5511999999999" />
          </Field>
          <Field label="E-mail Administrativo (Auditoria)">
            <Input type="email" value={brand.emailAuditoria} onChange={(e) => setBrand({ ...brand, emailAuditoria: e.target.value })} />
          </Field>
          <Field label="Gerente · WhatsApp">
            <Input value={brand.gerenteWhatsapp} onChange={(e) => setBrand({ ...brand, gerenteWhatsapp: e.target.value })} />
          </Field>
          <Field label="Gerente · E-mail">
            <Input type="email" value={brand.gerenteEmail} onChange={(e) => setBrand({ ...brand, gerenteEmail: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline">Salvar identidade</Button>
          </div>
        </form>
      </section>

      {/* CRIAR USUÁRIO COM SENHA */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <UserPlus className="h-4 w-4 text-orange" /> Criar Usuário (Coordenador · Supervisor · Atendente)
        </h2>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome"><Input required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={novo.whatsapp} onChange={(e) => setNovo({ ...novo, whatsapp: e.target.value })} placeholder="5511999999999" /></Field>
          <Field label="E-mail"><Input type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></Field>
          <Field label="Papel">
            <Select value={novo.role} onValueChange={(v) => setNovo({ ...novo, role: v as Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Senha"><PasswordInput required minLength={6} value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} /></Field>
          <Field label="Confirmar Senha"><PasswordInput required minLength={6} value={novo.senha2} onChange={(e) => setNovo({ ...novo, senha2: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy} className="bg-orange text-orange-foreground hover:bg-orange/90">
              {busy ? "Criando…" : "Criar usuário"}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Acesso ao Painel GERENCIA / INCORPORADORA conforme o papel atribuído.
            </p>
          </div>
        </form>
      </section>

      {/* LISTA */}
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
                      <button title="Remover papel" onClick={() => removerPapel(r.id, p.id, r.role)} className="text-muted-foreground hover:text-destructive">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
