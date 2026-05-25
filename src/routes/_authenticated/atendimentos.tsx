import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Phone,
  FileText,
  Gem,
  Rocket,
  RefreshCcw,
  HandshakeIcon,
  BarChart3,
  Trash2,
  Copy,
  ScanLine,
  Sparkles,
  Cog,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { registrarTriagem } from "@/lib/triagem.functions";

export const Route = createFileRoute("/_authenticated/atendimentos")({
  component: MesaTriagem,
  head: () => ({ meta: [{ title: "Mesa de Recepção e Triagem — Roleta Corretor" }] }),
});

type Emp = { id: string; nome: string; cnpj: string | null; whatsapp_grupo_url: string | null };

type OpcaoCfg = {
  codigo: "A" | "B" | "C" | "D" | "E";
  titulo: string;
  subtitulo: string;
  action: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const OPCOES: OpcaoCfg[] = [
  { codigo: "A", titulo: "Atendimento", subtitulo: "Em Curso", action: "verificar_presenca", Icon: Gem },
  { codigo: "B", titulo: "1ª Vista", subtitulo: "Roleta Vez", action: "alocar_roleta", Icon: Rocket },
  { codigo: "C", titulo: "Retorno", subtitulo: "Agendamento", action: "verificar_presenca_ou_redirecionar", Icon: RefreshCcw },
  { codigo: "D", titulo: "Outros", subtitulo: "Serviços", action: "encaminhar_coordenador", Icon: Building2 },
  { codigo: "E", titulo: "Parcerias", subtitulo: "Parceiros", action: "cadastrar_visitante", Icon: HandshakeIcon },
];

type LogRow = {
  hora: string;
  cliente: string;
  opcao: "A" | "B" | "C" | "D" | "E" | "—";
  corretor: string;
  regra: string;
};

function fmtCnpj(s?: string | null) {
  if (!s) return "—";
  const d = s.replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function MesaTriagem() {
  const [emp, setEmp] = useState<Emp | null>(null);
  const [empList, setEmpList] = useState<Emp[]>([]);
  const [plantonistas, setPlantonistas] = useState(0);
  const [hojeCount, setHojeCount] = useState(0);

  const [cliente, setCliente] = useState("");
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [opcao, setOpcao] = useState<OpcaoCfg["codigo"]>("B");
  const [lgpd, setLgpd] = useState(false);
  const [busy, setBusy] = useState(false);

  const [stand, setStand] = useState<"aguardando" | "processando" | "ok">("aguardando");
  const [terminal, setTerminal] = useState<string>(
    "Aguardando disparo de webhook de triagem. A automação enviará notificações reais para o WhatsApp com status 200 OK.",
  );
  const [log, setLog] = useState<LogRow[]>([
    {
      hora: new Date().toLocaleTimeString("pt-BR"),
      cliente: "Sistema",
      opcao: "B",
      corretor: "Nenhum",
      regra: "Sistema de triagem unificado de alta performance inicializado.",
    },
  ]);

  const registrar = useServerFn(registrarTriagem);

  useEffect(() => {
    (async () => {
      const { data: emps } = await supabase
        .from("empreendimentos")
        .select("id,nome,cnpj,whatsapp_grupo_url")
        .eq("ativo", true)
        .order("nome");
      setEmpList(emps ?? []);
      const first = (emps ?? [])[0] ?? null;
      setEmp(first);
      if (first) {
        const { count: pc } = await supabase
          .from("corretores")
          .select("*", { count: "exact", head: true })
          .eq("empreendimento_id", first.id)
          .eq("ativo", true);
        setPlantonistas(pc ?? 0);
        const since = new Date(); since.setHours(0, 0, 0, 0);
        const { count: tc } = await supabase
          .from("triagens")
          .select("*", { count: "exact", head: true })
          .eq("empreendimento_id", first.id)
          .gte("created_at", since.toISOString());
        setHojeCount(tc ?? 0);
      }
    })();
  }, []);

  const selected = useMemo(() => OPCOES.find((o) => o.codigo === opcao)!, [opcao]);

  async function bipar() {
    if (!emp) return toast.error("Nenhum empreendimento ativo");
    if (!whats.trim()) return toast.error("WhatsApp de contato é obrigatório");
    if (!lgpd) return toast.error("Aceite os Termos de Privacidade da Informetec");
    setBusy(true);
    setStand("processando");
    setTerminal("> Disparando webhook de triagem…");
    try {
      const r = await registrar({
        data: {
          empreendimento_id: emp.id,
          opcao_codigo: opcao,
          origem: "painel",
          cliente_nome: cliente.trim() || null,
          cliente_telefone: whats.trim(),
          payload: { email: email.trim() || null, marca: emp.nome, cnpj: emp.cnpj },
        },
      });
      const corresp = OPCOES.find((o) => o.codigo === r.opcao.codigo)!;
      const corretorNome = r.corretor?.nome
        ? `${r.corretor.nome} (${r.corretor.atendimentos_semana} atend./sem)`
        : corresp.codigo === "B"
          ? "Sem presença confirmada"
          : corresp.codigo === "D" ? "Coordenador" : "Designado";
      const linha: LogRow = {
        hora: new Date().toLocaleTimeString("pt-BR"),
        cliente: cliente.trim() || "Visitante",
        opcao: corresp.codigo,
        corretor: corretorNome,
        regra: `${corresp.titulo} • action=${corresp.action}`,
      };
      setLog((l) => [linha, ...l].slice(0, 50));
      setHojeCount((n) => n + 1);
      setStand("ok");
      setTerminal(
        JSON.stringify(
          {
            status: 200,
            ok: true,
            triagem_id: r.triagem.id,
            opcao: corresp.codigo,
            label: corresp.titulo,
            action: corresp.action,
            corretor_designado: r.corretor ?? null,
            atendimento_id: r.atendimento_id ?? null,
            cliente: cliente.trim() || null,
            whatsapp: whats.trim(),
            empreendimento: emp.nome,
          },
          null,
          2,
        ),
      );
      if (corresp.codigo === "B" && r.corretor) {
        toast.success(`Encaminhado para ${r.corretor.nome} (fila justa).`);
      } else {
        toast.success("Triagem registrada e webhook disparado.");
      }
      setCliente(""); setWhats(""); setEmail(""); setLgpd(false);
      setTimeout(() => setStand("aguardando"), 4000);
    } catch (e) {
      setStand("aguardando");
      const msg = e instanceof Error ? e.message : "Falha ao registrar triagem";
      setTerminal(`! ERRO 500 — ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function copiarResposta() {
    navigator.clipboard.writeText(terminal);
    toast.success("Resposta copiada.");
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header / banner */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-navy via-navy-deep to-[oklch(0.18_0.04_260)] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Badge className="bg-gold/20 text-gold border-gold/40 font-mono uppercase tracking-[0.18em]">
              Portaria Digital & Governança de Escala • Informetec
            </Badge>
            <h1 className="mt-3 flex items-center gap-3 text-2xl font-extrabold tracking-tight md:text-3xl">
              <Bell className="h-7 w-7 text-gold" /> MESA DE RECEPÇÃO E TRIAGEM
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Fluxo unificado para recepção de clientes de primeira vista, atendimentos em curso com regras de
              ausência e parceiros externos em tempo real.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/60">Plantonistas Ativos</div>
              <div className="mt-1 text-2xl font-extrabold text-gold">{plantonistas} <span className="text-sm font-semibold text-white/80">Corretores</span></div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/60">Histórico de Hoje</div>
              <div className="mt-1 text-2xl font-extrabold">{hojeCount} <span className="text-sm font-semibold text-white/80">Triagens</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — Ficha + Form (2 cols) */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gold/15 p-2 text-gold"><FileText className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-extrabold uppercase tracking-tight">Ficha de Identificação e Entrada</h2>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Selecione a situação e o corretor correspondente
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-border pt-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-gold">★★★★★</span>
                <span className="font-mono text-xs text-muted-foreground">💡 (conforme cadastro)</span>
              </div>
              {empList.length > 1 ? (
                <select
                  value={emp?.id ?? ""}
                  onChange={(e) => setEmp(empList.find((x) => x.id === e.target.value) ?? null)}
                  className="mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-bold"
                >
                  {empList.map((e) => <option key={e.id} value={e.id}>🏢 {e.nome}</option>)}
                </select>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-base font-extrabold">
                  <Building2 className="h-4 w-4 text-navy" /> {emp?.nome ?? "—"}
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">🧾 CNPJ: {fmtCnpj(emp?.cnpj)}</span>
                <span>|</span>
                <span className="font-mono flex items-center gap-1"><Phone className="h-3 w-3" /> CONTATO: {emp?.whatsapp_grupo_url?.replace(/\D/g, "") || "—"}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Nome do Cliente / Visitante</Label>
                <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ex: João Roberto Alencar" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">WhatsApp de Contato <span className="text-destructive">*</span></Label>
                <Input value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="Ex: 5511999999999" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">E-mail (Opcional)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: cliente@email.com" className="mt-1" />
              </div>
            </div>

            <div className="mt-6">
              <Label className="text-xs font-bold uppercase tracking-wider">Selecione a Situação Operacional (Caso de Uso)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {OPCOES.map((o) => {
                  const active = opcao === o.codigo;
                  return (
                    <button
                      key={o.codigo}
                      type="button"
                      onClick={() => setOpcao(o.codigo)}
                      className={`group flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition ${
                        active
                          ? "border-gold bg-gold/10 shadow-md ring-2 ring-gold/30"
                          : "border-border bg-background hover:border-navy/40 hover:bg-muted"
                      }`}
                    >
                      <o.Icon className={`h-6 w-6 ${active ? "text-gold" : "text-navy"}`} />
                      <div className="text-sm font-extrabold uppercase tracking-wide">{o.titulo}</div>
                      <div className={`text-[10px] font-mono uppercase tracking-wider ${active ? "text-gold/80" : "text-muted-foreground"}`}>
                        {o.subtitulo}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <Checkbox id="lgpd" checked={lgpd} onCheckedChange={(v) => setLgpd(!!v)} className="mt-0.5" />
              <Label htmlFor="lgpd" className="text-xs leading-relaxed">
                Li e concordo com os{" "}
                <a href="/lgpd" target="_blank" rel="noreferrer" className="font-bold text-gold underline-offset-2 hover:underline">
                  Termos de Privacidade e Proteção de Dados da Informetec
                </a>
              </Label>
            </div>

            <Button
              onClick={bipar}
              disabled={busy}
              className="mt-5 h-14 w-full bg-navy text-base font-extrabold uppercase tracking-[0.2em] text-white hover:bg-navy-deep"
            >
              <ScanLine className="mr-2 h-5 w-5" />
              {busy ? "Processando…" : "Bipar Entrada & Executar Triagem"}
            </Button>
          </div>
        </section>

        {/* RIGHT — Stand + Terminal */}
        <section className="space-y-6">
          {/* Stand */}
          <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-navy-deep to-black p-5 text-white shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
              <span className="flex items-center gap-2 text-white/70">
                <span className={`h-2 w-2 rounded-full ${stand === "ok" ? "bg-emerald-400" : stand === "processando" ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
                Leitor Digital Recepção v4.0
              </span>
              <Badge className="border-gold/40 bg-gold/15 text-gold">Stand ao vivo</Badge>
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <div className="rounded-full bg-white/5 p-4">
                <ScanLine className="h-10 w-10 text-gold" />
              </div>
              <div className="mt-4 text-lg font-extrabold uppercase tracking-wider text-white">
                {stand === "ok" ? "Triagem confirmada" : stand === "processando" ? "Processando…" : "Aguardando próxima entrada"}
              </div>
              <p className="mt-2 max-w-xs text-xs text-white/60">
                Preencha os dados e dê entrada no cliente para bipar presença e simular a automação de webhook da Lorenza.
              </p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-3 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">
              Integração Luna Messenger Certificada • Informetec
            </div>
          </div>

          {/* Terminal */}
          <div className="rounded-2xl border border-border bg-[oklch(0.18_0.04_260)] p-4 text-emerald-300 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/70">
                <span className="h-2 w-2 rounded-full bg-orange" />
                Lorenza Roleta Corretores • API Terminal
              </span>
              <Button size="sm" variant="outline" onClick={copiarResposta} className="h-7 border-gold/40 bg-transparent text-[10px] font-bold uppercase tracking-wider text-gold hover:bg-gold/10 hover:text-gold">
                <Copy className="mr-1 h-3 w-3" /> Copiar Resposta
              </Button>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed">
{terminal}
            </pre>
          </div>
        </section>
      </div>

      {/* Histórico */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-navy/10 p-2 text-navy"><BarChart3 className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Histórico Consolidado de Triagens</h2>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Log de auditoria em tempo real do stand</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLog([])} className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3 w-3" /> Limpar Histórico
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-3">Horário</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Opção</th>
                <th className="py-2 pr-3">Corretor Responsável</th>
                <th className="py-2 pr-3">Regra e Resolução do Fluxo</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sem entradas no histórico.</td></tr>
              )}
              {log.map((l, i) => (
                <tr key={i} className="border-b border-border/50 align-middle">
                  <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{l.hora}</td>
                  <td className="py-3 pr-3 font-bold">{l.cliente}</td>
                  <td className="py-3 pr-3">
                    <Badge className="border-emerald-500/40 bg-emerald-500/10 font-mono text-emerald-700 dark:text-emerald-300">
                      Opção {l.opcao}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{l.corretor}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{l.regra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guia do Arquiteto */}
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-navy-deep to-black p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="border-gold/40 bg-gold/15 text-gold font-mono uppercase tracking-wider">
              Guia do Arquiteto • Tabela opcoes_triagem
            </Badge>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight">
              <Cog className="h-5 w-5 text-gold" /> Parâmetros Operacionais & Lógica Triagem Lorenza IA
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Decodificação estruturada de transições e status para processamento inteligente no back-end/worker do ecossistema.
            </p>
          </div>
          <code className="rounded-md bg-orange/15 px-2 py-1 font-mono text-[11px] text-orange">
            tabela: public.opcoes_triagem
          </code>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {OPCOES.map((o) => (
            <div key={o.codigo} className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-bold">{o.codigo}</span>
                <Badge className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
                  {o.action}
                </Badge>
              </div>
              <div className="mt-3 text-sm font-extrabold uppercase tracking-wide">{o.titulo}</div>
              <p className="mt-1 text-xs text-white/60">
                {o.codigo === "A" && "Regra específica: se o corretor não estiver no stand, joga para o último da vez."}
                {o.codigo === "B" && "Direciona ao primeiro da vez na escala e rotaciona a fila para o final."}
                {o.codigo === "C" && "Retorno do cliente para corretor designado. Se ausente, encaminha ao último."}
                {o.codigo === "D" && "Fornecedores e serviços gerais encaminhados ao coordenador de plantão."}
                {o.codigo === "E" && "Parcerias de corretores externos e visitas cadastrados na portaria."}
              </p>
              <code className="mt-3 block font-mono text-[10px] text-gold/80">switch case: '{o.codigo}'</code>
            </div>
          ))}
        </div>

        {/* Slot global de teste */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange/40 bg-orange/10 p-4">
          <div>
            <Badge className="border-orange/50 bg-orange/20 text-orange font-mono uppercase tracking-wider">
              Console de Homologação Rápida
            </Badge>
            <div className="mt-2 text-sm font-extrabold uppercase tracking-wide">
              Slot de teste global: bater a roleta com a opção selecionada
            </div>
            <p className="mt-1 max-w-2xl text-xs text-white/70">
              Empresa/Estande ativo: <span className="font-bold text-gold">"{emp?.nome ?? "—"}"</span>. Clique ao lado para
              executar a triagem com os dados preenchidos acima.
            </p>
          </div>
          <Button onClick={bipar} disabled={busy} className="gap-2 bg-orange text-white hover:bg-orange/90">
            <Sparkles className="h-4 w-4" /> Rodar Triagem Agora
          </Button>
        </div>
      </section>
      <NavActions />
    </main>
  );
}
