import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Printer,
  FileText,
  Copy,
  Trash2,
  Loader2,
  Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: MensagensPage,
  head: () => ({
    meta: [
      { title: "Central de Comunicados — Roleta Corretor" },
      {
        name: "description",
        content:
          "Envie comunicados pelo sistema, prepare mensagem para WhatsApp, imprima ou exporte PDF para o plantão.",
      },
    ],
  }),
});

type Emp = { id: string; nome: string; cnpj: string | null };
type Mensagem = {
  id: string;
  titulo: string;
  corpo: string;
  canal: "sistema" | "whatsapp" | "impresso" | "pdf";
  destinatarios: "todos" | "corretores" | "gestao";
  ativa: boolean;
  created_at: string;
  empreendimento_id: string;
};

const CANAL_LABEL: Record<Mensagem["canal"], string> = {
  sistema: "Sistema (in-app)",
  whatsapp: "WhatsApp (manual)",
  impresso: "Impresso",
  pdf: "PDF",
};

function MensagensPage() {
  const { user, isMaster, roles } = useAuth();
  const podeGerir =
    isMaster ||
    roles.includes("incorporadora" as never) ||
    roles.includes("gerente" as never) ||
    roles.includes("coordenador" as never);

  const [emps, setEmps] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [destinatarios, setDestinatarios] =
    useState<Mensagem["destinatarios"]>("corretores");
  const [canal, setCanal] = useState<Mensagem["canal"]>("sistema");
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("empreendimentos")
        .select("id,nome,cnpj")
        .order("nome");
      const list = (data ?? []) as Emp[];
      setEmps(list);
      if (list.length && !empId) setEmpId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!empId) return;
    setLoading(true);
    supabase
      .from("mensagens")
      .select("id,titulo,corpo,canal,destinatarios,ativa,created_at,empreendimento_id")
      .eq("empreendimento_id", empId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setLista((data ?? []) as Mensagem[]);
        setLoading(false);
      });
  }, [empId, enviando]);

  const empAtual = useMemo(() => emps.find((e) => e.id === empId), [emps, empId]);

  const mensagemPronta = useMemo(() => {
    const linhas = [
      `📣 *${titulo || "Comunicado"}*`,
      empAtual ? `🏢 ${empAtual.nome}` : "",
      "",
      corpo || "—",
      "",
      `— Lorenza Roleta 4.0 · ${new Date().toLocaleString("pt-BR")}`,
    ].filter(Boolean);
    return linhas.join("\n");
  }, [titulo, corpo, empAtual]);

  function tocarBeep() {
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      // dois beeps curtos (estilo notificação)
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.18);
      });
      setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch { /* ignore */ }
  }

  async function salvar(canalEnvio: Mensagem["canal"]) {
    if (!empId) return toast.error("Selecione um empreendimento");
    if (!titulo.trim() || !corpo.trim())
      return toast.error("Preencha título e mensagem");
    setEnviando(true);
    const { error } = await supabase.from("mensagens").insert({
      empreendimento_id: empId,
      autor_id: user?.id,
      titulo: titulo.trim(),
      corpo: corpo.trim(),
      canal: canalEnvio,
      destinatarios,
    });
    setEnviando(false);
    if (error) return toast.error(error.message);
    tocarBeep();
    toast.success(
      canalEnvio === "sistema"
        ? "Comunicado publicado no sistema"
        : "Registrado no histórico",
    );
    if (canalEnvio === "sistema") {
      setTitulo("");
      setCorpo("");
    }
  }

  async function copiarWhatsApp() {
    if (!titulo.trim() || !corpo.trim())
      return toast.error("Preencha título e mensagem");
    try {
      await navigator.clipboard.writeText(mensagemPronta);
      toast.success("Mensagem copiada — cole no grupo do WhatsApp");
      await salvar("whatsapp");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function imprimir() {
    if (!titulo.trim() || !corpo.trim())
      return toast.error("Preencha título e mensagem");
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return toast.error("Bloqueio de pop-up impediu a impressão");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>
        body{font-family:Inter,Arial,sans-serif;color:#0a1733;padding:48px;max-width:720px;margin:auto}
        h1{font-family:Georgia,serif;font-size:32px;border-bottom:3px solid #c9a84c;padding-bottom:12px}
        .meta{color:#666;font-size:12px;margin-bottom:24px}
        .corpo{white-space:pre-wrap;font-size:16px;line-height:1.6}
        footer{margin-top:48px;border-top:1px solid #ddd;padding-top:12px;font-size:11px;color:#999}
      </style></head><body>
      <h1>${escapeHtml(titulo)}</h1>
      <div class="meta">${escapeHtml(empAtual?.nome ?? "")} · ${new Date().toLocaleString("pt-BR")}</div>
      <div class="corpo">${escapeHtml(corpo)}</div>
      <footer>Lorenza Roleta 4.0 · Comunicado oficial do plantão</footer>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    salvar("impresso");
  }

  function baixarPDF() {
    if (!titulo.trim() || !corpo.trim())
      return toast.error("Preencha título e mensagem");
    // Reusa a janela de impressão — o usuário escolhe "Salvar como PDF"
    imprimir();
    salvar("pdf");
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este comunicado?")) return;
    const { error } = await supabase.from("mensagens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLista((l) => l.filter((m) => m.id !== id));
    toast.success("Removido");
  }

  if (!podeGerir) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-bold">Central de Comunicados</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas gestão pode publicar comunicados. Você visualiza os avisos ativos
          na sua tela de plantão.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-orange/10 text-orange">
          <Megaphone className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Central de Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Enquanto o WhatsApp oficial não é integrado, envie pelo sistema e
            mantenha o fluxo manual (WhatsApp, impressão, PDF).
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Composer */}
        <div className="rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Empreendimento</span>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {emps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} {e.cnpj ? `· ${e.cnpj}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Destinatários</span>
              <select
                value={destinatarios}
                onChange={(e) =>
                  setDestinatarios(e.target.value as Mensagem["destinatarios"])
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos (gestão + corretores)</option>
                <option value="corretores">Apenas Corretores</option>
                <option value="gestao">Apenas Gestão</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Título</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Plantão Sábado — briefing 8h"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Mensagem</span>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={8}
              placeholder="Escreva o comunicado…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
            />
          </label>

          <div className="mt-2 text-[11px] text-muted-foreground">
            Canal principal:{" "}
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value as Mensagem["canal"])}
              className="ml-1 rounded border bg-background px-2 py-0.5 text-[11px]"
            >
              <option value="sistema">Sistema</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="impresso">Impresso</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={enviando}
              onClick={() => salvar("sistema")}
              className="inline-flex items-center gap-2 rounded-md bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground hover:bg-orange/90 disabled:opacity-60"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar pelo Sistema
            </button>
            <button
              onClick={copiarWhatsApp}
              className="inline-flex items-center gap-2 rounded-md border bg-[#25D366]/10 px-4 py-2 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/20"
            >
              <Copy className="h-4 w-4" /> Copiar p/ WhatsApp
            </button>
            <button
              onClick={imprimir}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button
              onClick={baixarPDF}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <FileText className="h-4 w-4" /> Salvar PDF
            </button>
          </div>
        </div>

        {/* Preview */}
        <aside className="rounded-xl border bg-[var(--navy-deep,#0a1733)] p-4 text-white">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
            <MessageSquare className="h-4 w-4" /> Pré-visualização WhatsApp
          </div>
          <div
            ref={previewRef}
            className="whitespace-pre-wrap rounded-lg bg-[#075E54]/20 p-3 text-sm leading-relaxed"
          >
            {mensagemPronta}
          </div>
          <p className="mt-2 text-[11px] text-white/60">
            Use “Copiar p/ WhatsApp” e cole no grupo do plantão.
          </p>
        </aside>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Histórico de comunicados</h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum comunicado publicado ainda neste empreendimento.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border bg-card">
            {lista.map((m) => (
              <li key={m.id} className="flex items-start gap-3 p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.titulo}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {CANAL_LABEL[m.canal]}
                    </span>
                    <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange">
                      {m.destinatarios}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {m.corpo}
                  </p>
                </div>
                <button
                  onClick={() => excluir(m.id)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
