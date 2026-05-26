import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Building2, CheckCircle2, Loader2, FileText } from "lucide-react";
import {
  buscarEmpreendimentoPorCnpj,
  cadastroCorretorPublico,
} from "@/lib/cadastro-corretor.functions";

export const Route = createFileRoute("/corretor/cadastro")({
  component: CadastroCorretor,
  head: () => ({
    meta: [
      { title: "Cadastro do Corretor — Roleta Corretor" },
      {
        name: "description",
        content:
          "Auto-cadastro do corretor: informe o CNPJ do empreendimento, seus dados e crie sua senha de acesso à roleta.",
      },
    ],
  }),
});

function CadastroCorretor() {
  const navigate = useNavigate();
  const buscar = useServerFn(buscarEmpreendimentoPorCnpj);
  const cadastrar = useServerFn(cadastroCorretorPublico);

  const [cnpj, setCnpj] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [emp, setEmp] = useState<{ id: string; nome: string; cnpj: string | null } | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [creci, setCreci] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aceiteTermo, setAceiteTermo] = useState(false);
  const [termoAberto, setTermoAberto] = useState(false);

  async function onBuscar(e: FormEvent) {
    e.preventDefault();
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length < 11) return toast.error("Informe o CNPJ do empreendimento.");
    setBuscando(true);
    try {
      const { empreendimento } = await buscar({ data: { cnpj: digits } });
      if (!empreendimento) {
        setEmp(null);
        toast.error("CNPJ não localizado. Confirme com a Coordenação/Incorporadora.");
      } else {
        setEmp(empreendimento);
        toast.success(`Empreendimento: ${empreendimento.nome}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar empreendimento");
    } finally {
      setBuscando(false);
    }
  }

  async function onCadastrar(e: FormEvent) {
    e.preventDefault();
    if (!emp) return toast.error("Confirme o empreendimento antes.");
    if (senha.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres.");
    if (senha !== senha2) return toast.error("As senhas não conferem.");
    if (!aceiteTermo) return toast.error("É necessário aceitar o Termo de Adesão e Privacidade.");
    setEnviando(true);
    try {
      await cadastrar({
        data: {
          nome,
          cpf: cpf || null,
          creci: creci || null,
          telefone: telefone || null,
          cnpj_empreendimento: emp.cnpj ?? cnpj,
          email: email.trim().toLowerCase(),
          senha,
        },
      });
      toast.success(
        "Cadastro enviado! Aguardando aprovação da Coordenação/Incorporadora. Você já pode entrar pela área do corretor após a liberação.",
      );
      navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha no cadastro";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/30">
              <Building2 className="h-3 w-3" /> Auto-cadastro do Corretor
            </span>
            <h1 className="mt-3 text-2xl font-bold">Cadastro do Corretor</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe o <strong>CNPJ do empreendimento</strong>. Em seguida, complete seus dados e
              crie sua senha de acesso.
            </p>
          </div>

          {/* PASSO 1: CNPJ */}
          <form onSubmit={onBuscar} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-xs font-semibold uppercase tracking-wider">
              CNPJ do Empreendimento
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                required
              />
              <Button type="submit" disabled={buscando}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Localizar"}
              </Button>
            </div>
            {emp && (
              <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success ring-1 ring-success/30">
                <CheckCircle2 className="h-4 w-4" /> Empreendimento localizado:{" "}
                <strong className="ml-1">{emp.nome}</strong>
              </div>
            )}
          </form>

          {/* PASSO 2: dados do corretor */}
          {emp && (
            <form onSubmit={onCadastrar} className="mt-6 space-y-3">
              <Field label="Nome completo">
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF">
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </Field>
                <Field label="CRECI">
                  <Input value={creci} onChange={(e) => setCreci(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone / WhatsApp">
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="5511999999999"
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Senha (mín. 8 caracteres)">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </Field>
                <Field label="Confirmar senha">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={senha2}
                    onChange={(e) => setSenha2(e.target.value)}
                  />
                </Field>
              </div>

              <div className="rounded-md border border-orange/30 bg-orange/5 p-3 text-[11px] text-muted-foreground">
                Seu cadastro entra como <strong>pendente</strong>. A Coordenação ou Incorporadora libera
                o seu acesso à roleta. Você pode tentar entrar em <Link to="/plantao" className="text-orange underline">/plantao</Link> usando seu CRECI assim que for aprovado.
              </div>

              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                <Checkbox
                  id="aceite-termo"
                  checked={aceiteTermo}
                  onCheckedChange={(c) => setAceiteTermo(c === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="aceite-termo" className="text-xs leading-relaxed font-normal cursor-pointer">
                  Li e aceito o{" "}
                  <button
                    type="button"
                    onClick={() => setTermoAberto(true)}
                    className="inline-flex items-center gap-1 text-orange underline hover:text-orange/80"
                  >
                    <FileText className="h-3 w-3" />
                    Termo de Adesão e Privacidade — Lorenza Roleta 4.0
                  </button>
                </Label>
              </div>

              <Button type="submit" disabled={enviando || !aceiteTermo} className="w-full">
                {enviando ? "Enviando…" : "Enviar cadastro para aprovação"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Dialog open={termoAberto} onOpenChange={setTermoAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termo de Adesão e Privacidade — Lorenza Roleta 4.0</DialogTitle>
            <DialogDescription>
              Leia com atenção antes de prosseguir com o cadastro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
            <section>
              <h3 className="font-semibold">1. Solicitação de Acesso e Finalidade</h3>
              <p>
                O presente cadastro é uma solicitação de uso das ferramentas de engajamento da
                Lorenza Roleta 4.0. O objetivo é gerenciar mecânicas de sorteios e roletas premiadas
                para corretores, visando otimizar a conversão em atendimentos imobiliários.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">2. Condição de Aprovação</h3>
              <p>
                O acesso às funcionalidades da Lorenza Roleta 4.0 não é imediato. A ativação da conta
                depende obrigatoriamente de análise e aprovação da nossa Gerência/Coordenação, que
                validará os dados informados para garantir a segurança e a integridade da plataforma.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">3. Vínculo Empresarial</h3>
              <p>
                É obrigatório o preenchimento do campo de identificação do CNPJ vinculado ao
                empreendimento que será trabalhado através da roleta:
              </p>
              <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  CNPJ do Empreendimento
                </div>
                <div className="mt-1 font-mono text-base">
                  {emp?.cnpj || cnpj || "___________________________________"}
                </div>
                {emp && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Empreendimento: <strong>{emp.nome}</strong>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="font-semibold">4. Política de Dados</h3>
              <p>
                As informações coletadas são tratadas com total sigilo dentro do ambiente do Lorento
                CRM e da Lorenza Roleta 4.0, sendo utilizadas exclusivamente para a gestão de
                relacionamento e suporte à operação de sorteios. Não realizamos compartilhamento de
                dados sem autorização expressa.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">5. Aceite</h3>
              <p>
                Ao prosseguir, você reconhece que este cadastro é uma solicitação sujeita a aprovação
                e que a veracidade dos dados (incluindo o CNPJ informado) é de sua inteira
                responsabilidade.
              </p>
            </section>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setTermoAberto(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setAceiteTermo(true);
                setTermoAberto(false);
              }}
            >
              Li e aceito o termo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
