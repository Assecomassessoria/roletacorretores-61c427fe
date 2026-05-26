import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meu-cadastro")({
  component: MeuCadastroPage,
  head: () => ({ meta: [{ title: "Meu Cadastro — Roleta Corretor" }] }),
});

type Corretor = {
  id: string;
  nome: string;
  cpf: string | null;
  creci: string | null;
  email: string | null;
  telefone: string | null;
  foto_url: string | null;
  empreendimento_id: string;
};

function MeuCadastroPage() {
  const { user } = useAuth();
  const [c, setC] = useState<Corretor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("corretores")
        .select("id,nome,cpf,creci,email,telefone,foto_url,empreendimento_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setC(data as Corretor);
        setEmail(data.email ?? "");
        setTelefone(data.telefone ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  async function handleFoto(file: File) {
    if (!c) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${c.empreendimento_id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("corretores").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("corretores").getPublicUrl(path);
      const { error: updErr } = await supabase.from("corretores").update({ foto_url: data.publicUrl }).eq("id", c.id);
      if (updErr) throw updErr;
      setC({ ...c, foto_url: data.publicUrl });
      toast.success("Foto atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSalvar() {
    if (!c) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("corretores")
        .update({ email: email.trim() || null, telefone: telefone.trim() || null })
        .eq("id", c.id);
      if (error) throw error;
      toast.success("Cadastro atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">Carregando…</main>;
  if (!c) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Seu usuário não está vinculado a um cadastro de corretor.</p>
        <Link to="/app" className="mt-4 inline-block text-sm text-orange hover:underline">← Voltar ao painel</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold">Meu Cadastro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pode atualizar sua foto, WhatsApp e e-mail de contato. Nome, CPF e CRECI só podem ser alterados pelo gestor.
      </p>

      <section className="mt-6 space-y-6 rounded-lg border border-border bg-card p-6">
        <div>
          <Label>Foto</Label>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
              {c.foto_url ? <img src={c.foto_url} alt={c.nome} className="h-full w-full object-cover" /> : null}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploading ? "Enviando…" : "Trocar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFoto(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input value={c.nome} disabled />
          </div>
          <div>
            <Label>CRECI</Label>
            <Input value={c.creci ?? ""} disabled />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">E-mail de contato</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tel">WhatsApp</Label>
            <Input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link to="/app">Sair</Link>
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </section>
    </main>
  );
}
