import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  ScanLine, UserPlus, QrCode, Briefcase, HandshakeIcon, Lock, ArrowLeft,
  CheckCircle2, Loader2, Camera, RefreshCw, Building2, SearchX, Phone, MessageCircle, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  criarTriagemTotem, dispararTriagemTotem, listarEmpreendimentosTotem,
  reencontrarCorretorTotem, solicitarGerenciaTotem,
} from "@/lib/totem.functions";

export const Route = createFileRoute("/totem")({
  component: TotemPage,
  head: () => ({
    meta: [
      { title: "Totem do Cliente — Roleta Corretor" },
      { name: "description", content: "Painel de autoatendimento para clientes do stand de vendas." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Mode = "menu" | "form" | "qr" | "scanner" | "result" | "reencontro" | "gerencia" | "reencontroResult" | "gerenciaResult";

function TotemPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [empreendimentos, setEmpreendimentos] = useState<{ id: string; nome: string; logo_url: string | null }[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [opcao, setOpcao] = useState<"B" | "D" | "E">("B");
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [corretorNome, setCorretorNome] = useState("");
  const [corretorWhats, setCorretorWhats] = useState("");
  const [corretorCreci, setCorretorCreci] = useState("");
  const [motivoGerencia, setMotivoGerencia] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [reencontroData, setReencontroData] = useState<any>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffPass, setStaffPass] = useState("");

  const listar = useServerFn(listarEmpreendimentosTotem);
  const criar = useServerFn(criarTriagemTotem);
  const disparar = useServerFn(dispararTriagemTotem);
  const reencontrar = useServerFn(reencontrarCorretorTotem);
  const solicitarGerencia = useServerFn(solicitarGerenciaTotem);

  useEffect(() => {
    (async () => {
      try {
        const r = await listar();
        setEmpreendimentos(r.empreendimentos);
        if (r.empreendimentos[0]) setEmpId(r.empreendimentos[0].id);
      } catch (e) {
        toast.error("Não foi possível carregar os stands.");
      }
    })();
  }, []);

  async function submeterForm() {
    if (!empId) return toast.error("Selecione o stand");
    if (nome.trim().length < 2) return toast.error("Informe seu nome");
    if (whats.replace(/\D/g, "").length < 8) return toast.error("Informe um WhatsApp válido");
    setBusy(true);
    try {
      const r = await criar({
        data: {
          empreendimento_id: empId,
          opcao_codigo: opcao,
          cliente_nome: nome.trim(),
          cliente_telefone: whats.trim(),
        },
      });
      // QR aponta de volta para esta página em modo scan com o id
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setQrUrl(`${base}/totem?triagem=${r.triagem.id}`);
      setMode("qr");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar");
    } finally {
      setBusy(false);
    }
  }

  async function dispararPorId(triagemId: string) {
    setBusy(true);
    try {
      const r = await disparar({ data: { triagem_id: triagemId } });
      setResult(r);
      setMode("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "QR inválido");
      setMode("menu");
    } finally {
      setBusy(false);
    }
  }

  // Auto-disparar quando chega via ?triagem=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("triagem");
    if (tid) {
      window.history.replaceState({}, "", "/totem");
      dispararPorId(tid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setMode("menu");
    setQrUrl(null);
    setResult(null);
    setReencontroData(null);
    setNome(""); setWhats(""); setEmail("");
    setCorretorNome(""); setCorretorWhats(""); setCorretorCreci("");
    setMotivoGerencia("");
  }

  async function submeterReencontro() {
    if (!empId) return toast.error("Selecione o stand");
    if (nome.trim().length < 2) return toast.error("Informe seu nome");
    if (whats.replace(/\D/g, "").length < 8) return toast.error("WhatsApp inválido");
    if (corretorNome.trim().length < 2) return toast.error("Informe o nome do corretor");
    if (corretorWhats.replace(/\D/g, "").length < 8) return toast.error("WhatsApp do corretor inválido");
    if (corretorCreci.trim().length < 2) return toast.error("Informe o CRECI do corretor");
    setBusy(true);
    try {
      const r = await reencontrar({
        data: {
          empreendimento_id: empId,
          cliente_nome: nome.trim(),
          cliente_telefone: whats.trim(),
          cliente_email: email.trim() ? email.trim() : null,
          corretor_nome: corretorNome.trim(),
          corretor_whatsapp: corretorWhats.trim(),
          corretor_creci: corretorCreci.trim(),
        },
      });
      setReencontroData(r);
      setMode("reencontroResult");
      // Se em plantão, abre WhatsApp automaticamente em nova aba
      if (r.em_plantao && r.whatsapp_url && typeof window !== "undefined") {
        window.open(r.whatsapp_url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar");
    } finally {
      setBusy(false);
    }
  }

  async function submeterGerencia() {
    if (!empId) return toast.error("Selecione o stand");
    if (nome.trim().length < 2) return toast.error("Informe seu nome");
    if (whats.replace(/\D/g, "").length < 8) return toast.error("WhatsApp inválido");
    setBusy(true);
    try {
      await solicitarGerencia({
        data: {
          empreendimento_id: empId,
          cliente_nome: nome.trim(),
          cliente_telefone: whats.trim(),
          motivo: motivoGerencia.trim() || null,
        },
      });
      setMode("gerenciaResult");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar");
    } finally {
      setBusy(false);
    }
  }


  function abrirStaff() {
    const senha = staffPass.trim();
    if (!senha) return toast.error("Informe a senha de acesso");
    // Senha validada apenas após login (Supabase Auth) — aqui só direciona
    sessionStorage.setItem("totem_staff_pass_hint", senha);
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.04_260)] via-navy-deep to-[oklch(0.12_0.03_260)] text-white">
      {/* TOP BAR mínima */}
      <header className="border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-orange/20 ring-1 ring-orange/40">
              <ScanLine className="h-5 w-5 text-orange" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-mono uppercase tracking-widest text-orange/80">Totem do Cliente</div>
              <div className="text-sm font-extrabold tracking-wide">ROLETA CORRETOR — Recepção Digital</div>
            </div>
          </div>
          {empreendimentos.length > 1 && mode === "menu" && (
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white"
            >
              {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {mode === "menu" && (
          <MenuView
            empNome={empreendimentos.find(e => e.id === empId)?.nome ?? "—"}
            onPick={(op) => { setOpcao(op); setMode("form"); }}
            onScan={() => setMode("scanner")}
          />
        )}

        {mode === "form" && (
          <FormView
            opcao={opcao}
            nome={nome} setNome={setNome}
            whats={whats} setWhats={setWhats}
            busy={busy}
            onSubmit={submeterForm}
            onBack={() => setMode("menu")}
          />
        )}

        {mode === "qr" && qrUrl && (
          <QrView
            url={qrUrl}
            nome={nome}
            onBack={reset}
            onSelfScan={() => {
              const id = new URL(qrUrl).searchParams.get("triagem");
              if (id) dispararPorId(id);
            }}
            busy={busy}
          />
        )}

        {mode === "scanner" && (
          <ScannerView
            onDetected={(text) => {
              try {
                const u = new URL(text);
                const tid = u.searchParams.get("triagem");
                if (tid) { dispararPorId(tid); return; }
              } catch { /* não-URL */ }
              // fallback: aceita uuid direto
              if (/^[0-9a-f-]{36}$/i.test(text)) { dispararPorId(text); return; }
              toast.error("QR não reconhecido. Aponte para o código gerado pelo totem.");
            }}
            onBack={() => setMode("menu")}
            busy={busy}
          />
        )}

        {mode === "result" && result && (
          <ResultView result={result} onBack={reset} />
        )}

        {mode === "reencontro" && (
          <ReencontroForm
            nome={nome} setNome={setNome}
            whats={whats} setWhats={setWhats}
            email={email} setEmail={setEmail}
            corretorNome={corretorNome} setCorretorNome={setCorretorNome}
            corretorWhats={corretorWhats} setCorretorWhats={setCorretorWhats}
            corretorCreci={corretorCreci} setCorretorCreci={setCorretorCreci}
            busy={busy}
            onSubmit={submeterReencontro}
            onBack={() => setMode("menu")}
          />
        )}

        {mode === "reencontroResult" && reencontroData && (
          <ReencontroResult data={reencontroData} onBack={reset} />
        )}

        {mode === "gerencia" && (
          <GerenciaForm
            nome={nome} setNome={setNome}
            whats={whats} setWhats={setWhats}
            motivo={motivoGerencia} setMotivo={setMotivoGerencia}
            busy={busy}
            onSubmit={submeterGerencia}
            onBack={() => setMode("menu")}
          />
        )}

        {mode === "gerenciaResult" && (
          <GerenciaResult nome={nome} onBack={reset} />
        )}
      </main>

      {/* RODAPÉ — acesso restrito staff */}
      <footer className="mt-10 border-t border-white/10 bg-black/40 px-4 py-6">
        <div className="mx-auto max-w-5xl">
          {!staffOpen ? (
            <button
              onClick={() => setStaffOpen(true)}
              className="mx-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Lock className="h-3.5 w-3.5" /> Acesso restrito · Recepção · Coordenação · Gerência
            </button>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/60 p-5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/60">
                <Lock className="h-3.5 w-3.5" /> Painel de acompanhamento — staff
              </div>
              <p className="mt-2 text-xs text-white/60">
                Recepção, Coordenador e Gerência: acessem com suas credenciais para acompanhar o fluxo de atendimento em tempo real.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  type="password"
                  value={staffPass}
                  onChange={(e) => setStaffPass(e.target.value)}
                  placeholder="Senha de acesso"
                  className="bg-black/40 text-white placeholder:text-white/40"
                />
                <Button onClick={abrirStaff} className="bg-orange hover:bg-orange/90">Entrar</Button>
              </div>
              <button
                onClick={() => { setStaffOpen(false); setStaffPass(""); }}
                className="mt-3 text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70"
              >
                cancelar
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

// ====================== VIEWS ======================

function MenuView({ empNome, onPick, onScan, onReencontro, onGerencia }: {
  empNome: string;
  onPick: (op: "B" | "D" | "E") => void;
  onScan: () => void;
  onReencontro: () => void;
  onGerencia: () => void;
}) {
  const tiles: { code: string; title: string; sub: string; Icon: any; onClick: () => void; highlight?: boolean }[] = [
    { code: "B", title: "1ª Vista", sub: "Quero ser atendido agora", Icon: UserPlus, onClick: () => onPick("B") },
    { code: "SCAN", title: "Já tenho QR", sub: "Apontar código de atendimento", Icon: QrCode, onClick: onScan },
    { code: "A", title: "Já sou atendido", sub: "Esqueci meu QR / retornei ao stand", Icon: SearchX, onClick: onReencontro, highlight: true },
    { code: "G", title: "Falar c/ Gerência", sub: "Coordenação / Gerência do stand", Icon: Shield, onClick: onGerencia, highlight: true },
    { code: "E", title: "Parcerias", sub: "Sou corretor parceiro / visita", Icon: HandshakeIcon, onClick: () => onPick("E") },
    { code: "D", title: "Serviços", sub: "Outros / Fornecedor", Icon: Briefcase, onClick: () => onPick("D") },
  ];
  return (
    <section className="space-y-6">
      <div className="text-center">
        <Badge className="border-orange/40 bg-orange/15 text-orange">
          <Building2 className="mr-1 h-3 w-3" /> {empNome}
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Bem-vindo(a)!</h1>
        <p className="mt-2 text-white/70">Toque na opção que descreve sua visita hoje.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <button
            key={t.code}
            onClick={t.onClick}
            className="group rounded-2xl border-2 border-white/10 bg-gradient-to-br from-white/5 to-black/40 p-6 text-left transition hover:border-orange/60 hover:bg-orange/10"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-orange/20 p-3 text-orange ring-1 ring-orange/40">
                <t.Icon className="h-7 w-7" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                opção {t.code === "SCAN" ? "QR" : t.code}
              </span>
            </div>
            <div className="mt-4 text-2xl font-extrabold tracking-tight">{t.title}</div>
            <div className="mt-1 text-sm text-white/60">{t.sub}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function FormView({ opcao, nome, setNome, whats, setWhats, busy, onSubmit, onBack }: any) {
  const titulo = opcao === "B" ? "1ª Vista — Cadastro Rápido"
    : opcao === "E" ? "Cadastro de Parceiro / Visita"
    : "Serviços / Fornecedor";
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-xs text-white/60 hover:text-white">
        <ArrowLeft className="h-3 w-3" /> voltar
      </button>
      <h2 className="text-2xl font-extrabold">{titulo}</h2>
      <p className="mt-1 text-sm text-white/60">
        Preencha e clique em <strong className="text-orange">Gerar QR Code</strong>. Em seguida, aponte o código para
        o leitor do totem (ou peça para a recepção escanear).
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-white/70">Nome completo</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 h-12 bg-black/40 text-base" placeholder="Ex: Maria Souza" />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-white/70">WhatsApp</Label>
          <Input value={whats} onChange={(e) => setWhats(e.target.value)} className="mt-1 h-12 bg-black/40 text-base" placeholder="(11) 99999-9999" />
        </div>
        <Button
          onClick={onSubmit}
          disabled={busy}
          className="h-14 w-full bg-orange text-base font-extrabold uppercase tracking-widest hover:bg-orange/90"
        >
          {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
          Gerar QR Code & Entrar
        </Button>
      </div>
    </section>
  );
}

function QrView({ url, nome, onBack, onSelfScan, busy }: any) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border-2 border-orange/40 bg-white p-8 text-navy-deep shadow-2xl">
      <div className="text-center">
        <Badge className="border-orange/40 bg-orange/15 text-orange">QR de Atendimento</Badge>
        <h2 className="mt-3 text-2xl font-extrabold">Olá, {nome}!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aponte o QR Code abaixo para o leitor do totem para acionar a roleta de corretores.
        </p>
      </div>
      <div className="mt-6 flex justify-center rounded-xl bg-white p-4 ring-2 ring-orange/30">
        <QRCodeSVG value={url} size={240} bgColor="#ffffff" fgColor="#0a0a1a" level="M" />
      </div>
      <div className="mt-4 break-all rounded bg-muted px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
        {url}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onSelfScan} disabled={busy} className="h-12 bg-orange hover:bg-orange/90">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
          Já apontei — Continuar
        </Button>
      </div>
    </section>
  );
}

function ScannerView({ onDetected, onBack, busy }: { onDetected: (txt: string) => void; onBack: () => void; busy: boolean }) {
  const elId = "totem-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const inst = new Html5Qrcode(elId, { verbose: false });
        scannerRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => { if (active) { active = false; onDetected(decoded); inst.stop().catch(() => {}); } },
          () => {},
        );
      } catch (e: any) {
        setError(e?.message ?? "Não foi possível acessar a câmera.");
      }
    })();
    return () => {
      const inst = scannerRef.current;
      if (inst) inst.stop().then(() => inst.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/60 p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-xs text-white/60 hover:text-white">
        <ArrowLeft className="h-3 w-3" /> voltar
      </button>
      <h2 className="flex items-center gap-2 text-xl font-extrabold"><Camera className="h-5 w-5 text-orange" /> Aponte o QR Code</h2>
      <p className="mt-1 text-sm text-white/60">
        Posicione o QR Code do atendimento dentro da moldura. A leitura é automática.
      </p>
      <div id={elId} className="mt-4 overflow-hidden rounded-xl bg-black ring-1 ring-white/10" />
      {error && (
        <p className="mt-3 rounded-md bg-destructive/20 px-3 py-2 text-xs text-destructive-foreground">
          {error} — verifique se concedeu permissão de câmera ao navegador.
        </p>
      )}
      {busy && <p className="mt-3 flex items-center gap-2 text-xs text-orange"><Loader2 className="h-3 w-3 animate-spin" /> processando…</p>}
    </section>
  );
}

function ResultView({ result, onBack }: any) {
  const ok = result.status === "atendido" && result.corretor;
  return (
    <section className="mx-auto max-w-xl rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-950/40 to-black/60 p-8 text-center shadow-2xl">
      {ok ? (
        <>
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
          <h2 className="mt-3 text-2xl font-extrabold">Seu corretor está a caminho!</h2>
          <p className="mt-1 text-sm text-white/70">{result.cliente_nome ?? "Cliente"}, você será atendido por:</p>
          <div className="mx-auto mt-5 flex max-w-sm items-center gap-4 rounded-xl border border-emerald-400/30 bg-black/40 p-4 text-left">
            {result.corretor.foto_url ? (
              <img src={result.corretor.foto_url} alt={result.corretor.nome} className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-400/40" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-400/20 text-2xl font-extrabold text-emerald-300">
                {result.corretor.nome?.[0] ?? "?"}
              </div>
            )}
            <div>
              <div className="text-lg font-extrabold">{result.corretor.nome}</div>
              {result.corretor.creci && <div className="text-xs text-white/60">CRECI {result.corretor.creci}</div>}
              {result.corretor.telefone && <div className="text-xs text-white/60">{result.corretor.telefone}</div>}
            </div>
          </div>
        </>
      ) : (
        <>
          <RefreshCw className="mx-auto h-14 w-14 text-amber-400" />
          <h2 className="mt-3 text-2xl font-extrabold">Recebemos sua entrada</h2>
          <p className="mt-2 text-sm text-white/70">
            No momento não há corretor com presença confirmada para roleta. A recepção será notificada
            e fará o direcionamento manualmente.
          </p>
        </>
      )}
      <Button onClick={onBack} className="mt-6 h-12 w-full bg-orange hover:bg-orange/90">
        Concluir e voltar ao início
      </Button>
    </section>
  );
}
