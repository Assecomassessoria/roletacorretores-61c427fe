import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cadastroDemo } from "@/lib/usuarios.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { NavActions } from "@/components/nav-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupDemo,
  head: () => ({
    meta: [
      { title: "Cadastro Demonstração — Roleta Corretor Elite 4.0" },
      { name: "description", content: "Habilite a Roleta Híbrida de Elite em menos de 60 segundos." },
    ],
  }),
});

type Role = "corretor" | "coordenador" | "gerente" | "incorporadora";

const AREAS: { value: Role; label: string }[] = [
  { value: "corretor", label: "🧑‍💼 ÁREA DO CORRETOR" },
  { value: "coordenador", label: "🛎️ RECEPÇÃO & TRIAGEM" },
  { value: "gerente", label: "📊 GERÊNCIA / COORDENAÇÃO" },
  { value: "incorporadora", label: "⚙️ INCORPORADORA (SETUP)" },
];

function SetupDemo() {
  const navigate = useNavigate();
  const cadastrar = useServerFn(cadastroDemo);

  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cnpjEmpresa, setCnpjEmpresa] = useState("");
  const [nomeEmp, setNomeEmp] = useState("");
  const [cnpjEmp, setCnpjEmp] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsappEmp, setWhatsappEmp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [role, setRole] = useState<Role>("incorporadora");
  const [infoAdicionais, setInfoAdicionais] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (senha !== senha2) return toast.error("As senhas não conferem.");
    if (senha.length < 6) return toast.error("Senha deve ter no mínimo 6 caracteres.");
    setBusy(true);
    try {
      await cadastrar({
        data: {
          nome,
          empresa: empresa || null,
          cnpj_empresa: cnpjEmpresa || null,
          documento: documento || null,
          nome_empreendimento: nomeEmp || null,
          cnpj_empreendimento: cnpjEmp || null,
          telefone: telefone || null,
          whatsapp_empreendimento: whatsappEmp || null,
          informacoes_adicionais: infoAdicionais || null,
          email,
          senha,
          role,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      toast.success("Cadastro confirmado. Bem-vindo!");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy-deep)] to-navy p-6 text-navy-foreground shadow-lg sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/40">
            <Zap className="h-3 w-3" /> Plano Experiência
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Cadastro de Demonstração
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Habilite a Roleta Híbrida de Elite em menos de 60 segundos.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do Receptor/Contato">
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pedro de Alcântara" />
            </Field>
            <Field label="CPF do Receptor/Contato">
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="000.000.000-00" />
            </Field>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Incorporadora / Imobiliária / Construtora</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Razão Social">
                <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Elite Imóveis Stand Sul" />
              </Field>
              <Field label="CNPJ">
                <Input value={cnpjEmpresa} onChange={(e) => setCnpjEmpresa(e.target.value)} placeholder="00.000.000/0001-00" />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Empreendimento</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do Empreendimento">
                <Input value={nomeEmp} onChange={(e) => setNomeEmp(e.target.value)} placeholder="Ex: Elite Imoveis Empreendimentos" />
              </Field>
              <Field label="CNPJ do Empreendimento">
                <Input value={cnpjEmp} onChange={(e) => setCnpjEmp(e.target.value)} placeholder="00.000.000/0001-00" />
              </Field>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp do Receptor">
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: 5511999999999" />
            </Field>
            <Field label="WhatsApp do Empreendimento">
              <Input value={whatsappEmp} onChange={(e) => setWhatsappEmp(e.target.value)} placeholder="Ex: 5511999999999" />
            </Field>
          </div>

          <Field label="E-mail Administrativo">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="comercial@elite.com" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Senha de Acesso">
              <PasswordInput required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </Field>
            <Field label="Confirmar Senha">
              <PasswordInput required minLength={6} value={senha2} onChange={(e) => setSenha2(e.target.value)} />
            </Field>
          </div>

          <Field label="Área de acesso inicial">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Informações Adicionais">
            <textarea
              value={infoAdicionais}
              onChange={(e) => setInfoAdicionais(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Detalhes do stand, observações, particularidades…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>

          <Button type="submit" disabled={busy} className="w-full bg-orange text-orange-foreground hover:bg-orange/90">
            {busy ? "Aguarde…" : "Escolher Licença e Criar Acesso"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-orange hover:underline">Entrar</Link>
          </p>
        </form>
        <NavActions />
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

