import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarAgendamento, listarMeusAgendamentos } from "@/lib/agendamento.functions";

export const Route = createFileRoute("/_authenticated/meu-agendamento")({
  component: MeuAgendamentoPage,
  head: () => ({ meta: [{ title: "Cadastrar Agendamento — Roleta Corretor" }] }),
});

type Agendamento = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  data_agendamento: string | null;
  status: string;
  created_at: string;
};

function MeuAgendamentoPage() {
  const fnCriar = useServerFn(criarAgendamento);
  const fnListar = useServerFn(listarMeusAgendamentos);

  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [qrId, setQrId] = useState<string | null>(null);
  const [qrCliente, setQrCliente] = useState<string>("");
  const svgRef = useRef<HTMLDivElement>(null);

  const qrUrl = useMemo(() => {
    if (!qrId || typeof window === "undefined") return "";
    return `${window.location.origin}/totem?triagem=${qrId}`;
  }, [qrId]);

  async function recarregar() {
    try {
      const r = await fnListar();
      setAgendamentos(r.agendamentos as Agendamento[]);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    if (nome.trim().length < 2) return toast.error("Informe o nome do cliente");
    if (whats.replace(/\D/g, "").length < 8) return toast.error("WhatsApp inválido");
    if (!data) return toast.error("Informe a data do agendamento");
    setBusy(true);
    try {
      const r = await fnCriar({
        data: {
          cliente_nome: nome.trim(),
          cliente_whatsapp: whats.trim(),
          cliente_email: email.trim() ? email.trim() : null,
          data_agendamento: data,
        },
      });
      toast.success("Agendamento criado");
      setQrId(r.triagem_id);
      setQrCliente(nome.trim());
      setNome(""); setWhats(""); setEmail("");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  function baixarPNG() {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 1024;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `agendamento-${qrCliente.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  }

  function exibirQR(ag: Agendamento) {
    setQrId(ag.id);
    setQrCliente(ag.cliente_nome);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold print:hidden">Cadastrar Agendamento</h1>
      <p className="mt-1 text-sm text-muted-foreground print:hidden">
        Cadastre o cliente que tem horário marcado. O QR Code gerado identifica você e o cliente — basta apontar no Totem ao chegar.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6 print:hidden">
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange">Novo agendamento</h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="nome">Nome do cliente *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João da Silva" />
            </div>
            <div>
              <Label htmlFor="whats">WhatsApp *</Label>
              <Input id="whats" value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@exemplo.com" />
            </div>
            <div>
              <Label htmlFor="data">Data do agendamento *</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <Button onClick={salvar} disabled={busy} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> {busy ? "Salvando…" : "Criar agendamento e gerar QR"}
            </Button>
          </div>
        </section>

        <section className="flex flex-col items-center justify-center rounded-lg border border-border bg-white p-6 text-center text-black print:border-0">
          {qrUrl ? (
            <>
              <div ref={svgRef}>
                <QRCodeSVG value={qrUrl} size={240} level="M" includeMargin />
              </div>
              <p className="mt-4 text-lg font-bold">{qrCliente}</p>
              <p className="mt-1 text-xs text-neutral-600">Apontar este QR no Totem do stand</p>
              <div className="mt-4 flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={baixarPNG}>
                  <Download className="mr-2 h-4 w-4" /> PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-neutral-600">
              <QrCode className="mx-auto h-12 w-12 opacity-40" />
              <p className="mt-2 text-sm">Preencha o formulário para gerar o QR Code do agendamento.</p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 print:hidden">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Meus agendamentos recentes</h2>
        {agendamentos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {agendamentos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.cliente_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.data_agendamento ? new Date(a.data_agendamento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    {a.cliente_telefone ? ` · ${a.cliente_telefone}` : ""}
                    {a.cliente_email ? ` · ${a.cliente_email}` : ""}
                    {" · "}
                    <span className={a.status === "atendido" ? "text-emerald-600" : "text-orange"}>
                      {a.status === "atendido" ? "Atendido" : "Aguardando"}
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => exibirQR(a)}>
                  <QrCode className="mr-1 h-4 w-4" /> QR
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
