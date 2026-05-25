import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getEmpreendimentoAdmin } from "@/lib/empreendimentos-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save, Printer, MessageCircle, RefreshCw, Shield, MapPin, QrCode, Wifi,
  KeyRound, FileUp, Settings2, Users, UserCheck, UserX, Trash2, Sparkles,
  LogOut, Clock, Plus, Timer, Zap, Search,
} from "lucide-react";

type Emp = {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  raio_metros: number;
  wifi_ssid: string | null;
  ciclo_roleta: "unica" | "manha" | "tarde";
  horario_comercial_inicio: string | null;
  horario_comercial_fim: string | null;
  horario_matutino_inicio: string | null;
  horario_matutino_fim: string | null;
  horario_vespertino_inicio: string | null;
  horario_vespertino_fim: string | null;
  regras_pdf_url: string | null;
  whatsapp_grupo_url: string | null;
  qrcode_token: string | null;
  ip_homologado: string | null;
  equipe_alfa_nome: string;
  equipe_beta_nome: string;
  roleta_automatica: boolean;
  roleta_auto_horarios: string[];
};

type Corretor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  creci: string | null;
  ativo: boolean;
  status_habilitacao: "pendente" | "ativo" | "desativado";
  equipe: "alfa" | "beta" | null;
  empreendimento_id: string;
};

export const Route = createFileRoute("/_authenticated/coordenador")({
  component: CoordenadorPage,
  head: () => ({
    meta: [
      { title: "Painel do Coordenador — Roleta Corretor" },
      { name: "description", content: "Configuração de roletas, equipes, protocolos de presença e corretores." },
    ],
  }),
});

function gerarToken() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `STAND-${s}`;
}

function imprimirListaCorretores(emp: Emp, lista: Corretor[], escopo: string, autoPrint = false) {
  const linhas = lista
    .map((c, i) => `<tr><td>${i + 1}</td><td>${c.nome}</td><td>${c.creci ?? "-"}</td><td>${c.telefone ?? "-"}</td><td>${c.equipe === "alfa" ? emp.equipe_alfa_nome : c.equipe === "beta" ? emp.equipe_beta_nome : "-"}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Corretores — ${emp.nome} — ${escopo}</title>
<style>body{font-family:system-ui,Arial,sans-serif;padding:24px;color:#111}
h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:0 0 16px;color:#555;font-weight:500}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
th{background:#f3f4f6;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
@media print{@page{margin:14mm}}</style></head><body>
<h1>${emp.nome} — Listagem de Corretores</h1>
<h2>Escopo: ${escopo} · Total: ${lista.length} · Gerado em ${new Date().toLocaleString("pt-BR")}</h2>
<table><thead><tr><th>#</th><th>Nome</th><th>CRECI</th><th>Telefone</th><th>Equipe</th></tr></thead><tbody>${linhas}</tbody></table>
${autoPrint ? "<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>" : ""}
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para gerar o documento."); return; }
  w.document.write(html); w.document.close();
  if (!autoPrint) setTimeout(() => w.print(), 400);
}

function enviarListaWhatsApp(emp: Emp, lista: Corretor[], escopo: string) {
  const txt = [`*${emp.nome}* — Corretores (${escopo}) · ${lista.length}`, "",
    ...lista.map((c, i) => `${i + 1}. ${c.nome} — CRECI ${c.creci ?? "-"} — ${c.telefone ?? "s/ tel"}`)].join("\n");
  const url = emp.whatsapp_grupo_url
    ? emp.whatsapp_grupo_url
    : `https://wa.me/?text=${encodeURIComponent(txt)}`;
  try { navigator.clipboard?.writeText(txt); toast.success("Lista copiada para a área de transferência."); } catch { /* noop */ }
  window.open(url, "_blank");
}


function CoordenadorPage() {
  const navigate = useNavigate();
  const { roles, isMaster, signOut } = useAuth();
  const podeAcessar =
    isMaster ||
    roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));

  const [emps, setEmps] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [emp, setEmp] = useState<Emp | null>(null);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [novoHorario, setNovoHorario] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "desativado">("todos");
  const [filtroEquipe, setFiltroEquipe] = useState<"todas" | "alfa" | "beta" | "sem">("todas");
  const fileRef = useRef<HTMLInputElement>(null);
  const getEmpAdmin = useServerFn(getEmpreendimentoAdmin);

  useEffect(() => { if (podeAcessar) void carregarEmps(); }, [podeAcessar]);
  useEffect(() => { if (empId) { void carregarEmp(); void carregarCorretores(); } }, [empId]);

  useEffect(() => {
    if (!emp?.qrcode_token) { setQrSvg(""); return; }
    QRCode.toString(emp.qrcode_token, { type: "svg", margin: 1, width: 180 })
      .then(setQrSvg).catch(() => setQrSvg(""));
  }, [emp?.qrcode_token]);

  async function carregarEmps() {
    const { data, error } = await supabase
      .from("empreendimentos").select("id,nome").eq("ativo", true).order("nome");
    if (error) return toast.error(error.message);
    setEmps((data ?? []) as any);
    if (data && data.length && !empId) setEmpId(data[0].id);
  }

  async function carregarEmp() {
    try {
      const { row } = await getEmpAdmin({ data: { id: empId } });
      setEmp(row as Emp);
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  async function carregarCorretores() {
    const { data, error } = await supabase
      .from("corretores")
      .select("id,nome,email,telefone,ativo,status_habilitacao,equipe,empreendimento_id")
      .eq("empreendimento_id", empId).order("nome");
    if (error) return toast.error(error.message);
    setCorretores((data ?? []) as Corretor[]);
  }

  function patch<K extends keyof Emp>(k: K, v: Emp[K]) {
    setEmp((s) => (s ? { ...s, [k]: v } : s));
    setDirty(true);
  }

  async function salvar() {
    if (!emp) return;
    setSaving(true);
    const { error } = await supabase.from("empreendimentos").update({
      nome: emp.nome,
      latitude: emp.latitude, longitude: emp.longitude, raio_metros: emp.raio_metros,
      wifi_ssid: emp.wifi_ssid, ciclo_roleta: emp.ciclo_roleta,
      horario_comercial_inicio: emp.horario_comercial_inicio,
      horario_comercial_fim: emp.horario_comercial_fim,
      horario_matutino_inicio: emp.horario_matutino_inicio,
      horario_matutino_fim: emp.horario_matutino_fim,
      horario_vespertino_inicio: emp.horario_vespertino_inicio,
      horario_vespertino_fim: emp.horario_vespertino_fim,
      regras_pdf_url: emp.regras_pdf_url, whatsapp_grupo_url: emp.whatsapp_grupo_url,
      qrcode_token: emp.qrcode_token, ip_homologado: emp.ip_homologado,
      equipe_alfa_nome: emp.equipe_alfa_nome, equipe_beta_nome: emp.equipe_beta_nome,
      roleta_automatica: emp.roleta_automatica,
      roleta_auto_horarios: emp.roleta_auto_horarios,
    } as any).eq("id", emp.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    setDirty(false);
  }

  function novoToken() { patch("qrcode_token", gerarToken()); toast.message("Token gerado — Salvar para persistir."); }

  async function uploadPdf(file: File) {
    if (!emp) return;
    const path = `${emp.id}/regras-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("plantao-regras")
      .upload(path, file, { contentType: "application/pdf", upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("plantao-regras").createSignedUrl(path, 60 * 60 * 24 * 365);
    patch("regras_pdf_url", data?.signedUrl ?? path);
    toast.success("PDF anexado — clique Salvar.");
  }

  function abrirWhatsAppGrupo() {
    if (emp?.whatsapp_grupo_url) window.open(emp.whatsapp_grupo_url, "_blank");
    else toast.message("Configure o link do grupo de WhatsApp.");
  }

  async function setStatus(c: Corretor, status: Corretor["status_habilitacao"]) {
    const { error } = await supabase.from("corretores")
      .update({ status_habilitacao: status, ativo: status === "ativo" } as any).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`${c.nome}: ${status}`);
    carregarCorretores();
  }
  async function setEquipe(c: Corretor, equipe: "alfa" | "beta" | null) {
    const { error } = await supabase.from("corretores").update({ equipe } as any).eq("id", c.id);
    if (error) return toast.error(error.message);
    carregarCorretores();
  }
  async function excluir(c: Corretor) {
    if (!confirm(`Excluir ${c.nome}?`)) return;
    const { error } = await supabase.from("corretores").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Corretor excluído"); carregarCorretores();
  }

  function adicionarHorarioAuto() {
    if (!emp) return;
    const h = novoHorario.trim();
    if (!/^\d{2}:\d{2}$/.test(h)) return toast.error("Use formato HH:MM");
    if (emp.roleta_auto_horarios.includes(h)) return toast.message("Horário já adicionado");
    patch("roleta_auto_horarios", [...emp.roleta_auto_horarios, h].sort());
    setNovoHorario("");
  }
  function removerHorarioAuto(h: string) {
    if (!emp) return;
    patch("roleta_auto_horarios", emp.roleta_auto_horarios.filter((x) => x !== h));
  }

  const pendentes = useMemo(() => corretores.filter((c) => c.status_habilitacao === "pendente"), [corretores]);
  const ativos = useMemo(() => corretores.filter((c) => c.status_habilitacao !== "pendente"), [corretores]);
  const equipeAlfa = useMemo(() => ativos.filter((c) => c.equipe === "alfa"), [ativos]);
  const equipeBeta = useMemo(() => ativos.filter((c) => c.equipe === "beta"), [ativos]);
  const semEquipe = useMemo(() => ativos.filter((c) => !c.equipe), [ativos]);

  const ativosFiltrados = useMemo(() => {
    const q = filtroBusca.trim().toLowerCase();
    return ativos.filter((c) => {
      if (filtroStatus !== "todos" && c.status_habilitacao !== filtroStatus) return false;
      if (filtroEquipe === "sem" && c.equipe) return false;
      if ((filtroEquipe === "alfa" || filtroEquipe === "beta") && c.equipe !== filtroEquipe) return false;
      if (q) {
        const hay = [c.nome, c.email ?? "", c.telefone ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ativos, filtroBusca, filtroStatus, filtroEquipe]);

  const countAtivos = useMemo(() => ativos.filter((c) => c.status_habilitacao === "ativo").length, [ativos]);
  const countDesativados = useMemo(() => ativos.filter((c) => c.status_habilitacao === "desativado").length, [ativos]);

  function ciclSubtitle(c: "unica" | "manha" | "tarde") {
    if (!emp) return "";
    if (c === "unica") return "Período comercial corrido";
    if (c === "manha") return `Matutino${emp.horario_matutino_inicio ? ` ${emp.horario_matutino_inicio.slice(0,5)}–${(emp.horario_matutino_fim ?? "").slice(0,5)}` : ""}`;
    return `Vespertino${emp.horario_vespertino_inicio ? ` ${emp.horario_vespertino_inicio.slice(0,5)}–${(emp.horario_vespertino_fim ?? "").slice(0,5)}` : ""}`;
  }

  if (!podeAcessar) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        Acesso restrito a Incorporadora / Gerente / Coordenador.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 print:py-2">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" />
            Painel de Operações Pro
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de equipes e escala de plantão</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            INFORMETEC — Tecnologia em Informações
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
              <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {emp && (
            <Button
              variant={emp.roleta_automatica ? "default" : "outline"}
              onClick={() => patch("roleta_automatica", !emp.roleta_automatica)}
              title="Alterna entre disparo automático nos horários programados e disparo manual"
              className={emp.roleta_automatica ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : ""}
            >
              <Zap className="mr-1 h-4 w-4" />
              {emp.roleta_automatica ? "Roleta Automática ✓" : "Roleta Automática"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate({ to: "/roleta" })}>
            <RefreshCw className="mr-1 h-4 w-4" /> Bater Roleta Oficial
          </Button>
          <Button onClick={salvar} disabled={!dirty || saving}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando…" : "Salvar Alterações"}
          </Button>
          <Button variant="outline" onClick={abrirWhatsAppGrupo}>
            <MessageCircle className="mr-1 h-4 w-4" /> Envia WhatsApp
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> PDF / Imprimir
          </Button>
          <Button variant="destructive" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>

      {emps.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-lg font-semibold">Nenhum empreendimento cadastrado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Para configurar ciclos, equipes, protocolos de presença e escala, primeiro cadastre ao menos um empreendimento (stand).
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/empreendimentos" })}>
            <Plus className="mr-1 h-4 w-4" /> Cadastrar empreendimento
          </Button>
        </div>
      ) : !emp ? (
        <p className="text-sm text-muted-foreground">Selecione um empreendimento.</p>
      ) : (
        <div className="space-y-6">
          {/* Modo de roleta — seleção rápida Gerente/Coordenador */}
          <Card title="Modo de operação da roleta" icon={<Zap className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => patch("roleta_automatica", true)}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition ${
                  emp.roleta_automatica ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/40"
                }`}
              >
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${emp.roleta_automatica ? "border-emerald-500" : "border-muted-foreground"}`}>
                  {emp.roleta_automatica && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                </span>
                <div>
                  <div className="text-sm font-bold">Roleta Automática</div>
                  <div className="text-xs text-muted-foreground">Dispara sozinha nos horários programados (CRON) — sem intervenção manual.</div>
                </div>
              </button>
              <button
                onClick={() => patch("roleta_automatica", false)}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition ${
                  !emp.roleta_automatica ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${!emp.roleta_automatica ? "border-primary" : "border-muted-foreground"}`}>
                  {!emp.roleta_automatica && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <div>
                  <div className="text-sm font-bold">Bater Roleta (manual)</div>
                  <div className="text-xs text-muted-foreground">Gerente/Coordenador dispara a roleta manualmente quando desejar.</div>
                </div>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Lembre de clicar em <strong>Salvar Alterações</strong>. Configure os horários da automação em <em>Auditoria & Automação (CRON)</em>.
            </p>
          </Card>


            <div className="grid gap-3 sm:grid-cols-3">
              {(["unica","manha","tarde"] as const).map((c) => {
                const active = emp.ciclo_roleta === c;
                return (
                  <button
                    key={c}
                    onClick={() => patch("ciclo_roleta", c)}
                    className={`rounded-lg border-2 p-4 text-left transition ${
                      active ? "border-primary bg-primary/5 shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-bold uppercase tracking-wider">
                      {c === "unica" ? "Roleta Única" : c === "manha" ? "Roleta Manhã" : "Roleta Tarde"}
                    </div>
                    <div className={`mt-1 text-xs ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {ciclSubtitle(c)}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Períodos */}
          <Card title="Configuração de períodos">
            <div className="grid gap-4 md:grid-cols-3">
              <PeriodoCard titulo="Comercial" badge="(2) Períodos"
                inicio={emp.horario_comercial_inicio} fim={emp.horario_comercial_fim}
                onChange={(i, f) => { patch("horario_comercial_inicio", i); patch("horario_comercial_fim", f); }} />
              <PeriodoCard titulo="Matutino" badge="(1) Período"
                inicio={emp.horario_matutino_inicio} fim={emp.horario_matutino_fim}
                onChange={(i, f) => { patch("horario_matutino_inicio", i); patch("horario_matutino_fim", f); }} />
              <PeriodoCard titulo="Vespertino" badge="(1) Período"
                inicio={emp.horario_vespertino_inicio} fim={emp.horario_vespertino_fim}
                onChange={(i, f) => { patch("horario_vespertino_inicio", i); patch("horario_vespertino_fim", f); }} />
            </div>
          </Card>

          {/* PDF + Identidade */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Anexar políticas e regras do plantão (PDF)">
              <p className="mb-3 text-xs text-muted-foreground">
                Cada construtora ou imobiliária dispõe de sua própria política operacional de stand. Faça upload do arquivo PDF.
              </p>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); }} />
              <Button onClick={() => fileRef.current?.click()}>
                <FileUp className="mr-1 h-4 w-4" /> Anexar PDF
              </Button>
              <div className="mt-3 rounded border border-dashed border-border px-3 py-2 text-xs">
                {emp.regras_pdf_url ? (
                  <a href={emp.regras_pdf_url} target="_blank" rel="noreferrer" className="text-primary underline">
                    Ver PDF vinculado
                  </a>
                ) : (
                  <span className="text-muted-foreground">Nenhum PDF vinculado (usando normas padrão)</span>
                )}
              </div>
            </Card>

            <Card title="Identidade & Comunicação" icon={<Settings2 className="h-4 w-4" />}>
              <div className="space-y-3">
                <Field label="Empreendimento ativo">
                  <Input value={emp.nome} onChange={(e) => patch("nome", e.target.value)} />
                </Field>
                <Field label="WhatsApp Grupo (link ou DDD+Número)">
                  <Input placeholder="https://chat.whatsapp.com/... ou 5511999999999"
                    value={emp.whatsapp_grupo_url ?? ""}
                    onChange={(e) => patch("whatsapp_grupo_url", e.target.value || null)} />
                </Field>
              </div>
            </Card>
          </div>

          {/* Protocolos */}
          <Card title="Protocolos de blindagem e presença" icon={<Shield className="h-4 w-4" />}>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Protocolo icon={<MapPin className="h-4 w-4" />} label="Geofencing" sub="Cerca virtual GPS" active />
              <Protocolo icon={<QrCode className="h-4 w-4" />} label="QR Code" sub="Leitura na recepção" active />
              <Protocolo icon={<Wifi className="h-4 w-4" />} label="Stand Wi-Fi" sub="Rede corporativa" />
              <Protocolo icon={<KeyRound className="h-4 w-4" />} label="Liberação Mestra" sub="Chave do gerente" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">Parâmetros de cerca GPS</h3>
                <div className="space-y-2">
                  <Field label="Latitude do estande">
                    <Input type="number" step="any" value={emp.latitude ?? ""} onChange={(e) => patch("latitude", e.target.value ? Number(e.target.value) : null)} />
                  </Field>
                  <Field label="Longitude do estande">
                    <Input type="number" step="any" value={emp.longitude ?? ""} onChange={(e) => patch("longitude", e.target.value ? Number(e.target.value) : null)} />
                  </Field>
                  <Field label="Raio limite (metros)">
                    <Input type="number" value={emp.raio_metros} onChange={(e) => patch("raio_metros", Number(e.target.value) || 0)} />
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">QR Code de presença</h3>
                <Field label="Token de validação ativo">
                  <Input value={emp.qrcode_token ?? ""} readOnly placeholder="—" />
                </Field>
                <Button className="mt-2 w-full" variant="secondary" onClick={novoToken}>
                  Gerar novo token
                </Button>
                <div className="mt-3 flex justify-center rounded bg-muted/40 p-3">
                  {qrSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  ) : (
                    <span className="py-8 text-xs text-muted-foreground">QR será gerado ao salvar.</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">Configuração de rede</h3>
                <div className="space-y-2">
                  <Field label="SSID da rede Wi-Fi">
                    <Input value={emp.wifi_ssid ?? ""} onChange={(e) => patch("wifi_ssid", e.target.value || null)} />
                  </Field>
                  <Field label="IP homologado do estande">
                    <Input placeholder="200.150.x.x" value={emp.ip_homologado ?? ""} onChange={(e) => patch("ip_homologado", e.target.value || null)} />
                  </Field>
                  <p className="text-[11px] text-muted-foreground">Restringe conexões originadas deste IP do estande.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Equipes — 2 colunas com corretores */}
          <Card title="Gestão de ativos e períodos" icon={<Users className="h-4 w-4" />}>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Listagem de corretores:
              </span>
              <Button size="sm" variant="outline" onClick={() => imprimirListaCorretores(emp, ativos, "geral")}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={() => imprimirListaCorretores(emp, ativos, "geral", true)}>
                <FileUp className="mr-1 h-3.5 w-3.5" /> Gerar PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => enviarListaWhatsApp(emp, ativos, "geral")}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> Envia WhatsApp
              </Button>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">|</span>
              <Button size="sm" variant="ghost" onClick={() => imprimirListaCorretores(emp, equipeAlfa, emp.equipe_alfa_nome, true)}>
                PDF {emp.equipe_alfa_nome}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => imprimirListaCorretores(emp, equipeBeta, emp.equipe_beta_nome, true)}>
                PDF {emp.equipe_beta_nome}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="✏ Nome Equipe Alfa">
                <Input value={emp.equipe_alfa_nome} onChange={(e) => patch("equipe_alfa_nome", e.target.value)} />
              </Field>
              <Field label="✏ Nome Equipe Beta">
                <Input value={emp.equipe_beta_nome} onChange={(e) => patch("equipe_beta_nome", e.target.value)} />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <EquipeCol titulo={emp.equipe_alfa_nome} cor="primary" lista={equipeAlfa}
                onRemover={(c) => setEquipe(c, null)} />
              <EquipeCol titulo={emp.equipe_beta_nome} cor="secondary" lista={equipeBeta}
                onRemover={(c) => setEquipe(c, null)} />
            </div>

            {semEquipe.length > 0 && (
              <div className="mt-5 rounded-lg border border-dashed border-border p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sem equipe ({semEquipe.length}) — atribua abaixo
                </h4>
                <ul className="space-y-1.5">
                  {semEquipe.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-1.5 text-sm">
                      <span>{c.nome}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEquipe(c, "alfa")}>{emp.equipe_alfa_nome}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEquipe(c, "beta")}>{emp.equipe_beta_nome}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* AUDITORIA & AUTOMAÇÃO (CRON) */}
          <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-slate-100 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
                <Timer className="h-4 w-4" /> Auditoria & Automação (CRON)
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <span className={emp.roleta_automatica ? "text-emerald-400" : "text-slate-400"}>
                  {emp.roleta_automatica ? "Automática ATIVA" : "Manual"}
                </span>
                <Switch
                  checked={emp.roleta_automatica}
                  onCheckedChange={(v) => patch("roleta_automatica", v)}
                />
              </div>
            </div>

            <p className="mb-3 text-[12px] text-slate-300">
              Quando ligado, a roleta dispara <strong>automaticamente</strong> nos horários abaixo (timezone do estande).
              Use múltiplos horários para abrir manhã e tarde do plantão.
            </p>

            <div className="space-y-2">
              {emp.roleta_auto_horarios.length === 0 ? (
                <div className="rounded border border-dashed border-slate-700 px-3 py-3 text-center text-xs text-slate-400">
                  Nenhum horário programado. Adicione abaixo.
                </div>
              ) : (
                emp.roleta_auto_horarios.map((h) => (
                  <div key={h} className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>{h}</span>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                        <Zap className="mr-1 h-3 w-3" /> agendado
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removerHorarioAuto(h)}
                      className="h-7 text-slate-300 hover:bg-slate-800 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)}
                className="h-9 max-w-[140px] bg-slate-800 text-slate-100 border-slate-700" />
              <Button size="sm" onClick={adicionarHorarioAuto} className="bg-amber-500 text-slate-950 hover:bg-amber-400">
                <Plus className="mr-1 h-4 w-4" /> Adicionar horário
              </Button>
              <span className="ml-auto text-[11px] text-slate-400">
                Lembre de clicar em <strong className="text-slate-200">Salvar Alterações</strong> para ativar
              </span>
            </div>
          </section>

          {/* Corretores */}
          <Card title="Gestão de corretores" icon={<UserCheck className="h-4 w-4" />}>
            <div className="mb-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Cadastros aguardando habilitação ({pendentes.length})
              </h3>
              {pendentes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum cadastro pendente.</p>
              ) : (
                <ul className="space-y-2">
                  {pendentes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{c.nome}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? "—"} · {c.telefone ?? "—"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setStatus(c, "ativo")}>Ativar</Button>
                        <Button size="sm" variant="outline" onClick={() => excluir(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Corretores ativos ({ativosFiltrados.length} de {ativos.length})
                </h3>
                <div className="flex items-center gap-2 text-[11px]">
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                    {countAtivos} ativos
                  </Badge>
                  <Badge variant="outline" className="border-muted-foreground/40">
                    {countDesativados} desativados
                  </Badge>
                </div>
              </div>

              {/* Filtros */}
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Buscar por nome, e-mail ou telefone…"
                    className="h-9 pl-8"
                  />
                </div>
                <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="ativo">Apenas ativos</SelectItem>
                    <SelectItem value="desativado">Desativados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroEquipe} onValueChange={(v) => setFiltroEquipe(v as any)}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas equipes</SelectItem>
                    <SelectItem value="alfa">{emp.equipe_alfa_nome}</SelectItem>
                    <SelectItem value="beta">{emp.equipe_beta_nome}</SelectItem>
                    <SelectItem value="sem">Sem equipe</SelectItem>
                  </SelectContent>
                </Select>
                {(filtroBusca || filtroStatus !== "todos" || filtroEquipe !== "todas") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFiltroBusca(""); setFiltroStatus("todos"); setFiltroEquipe("todas"); }}
                  >
                    Limpar
                  </Button>
                )}
              </div>

              {ativos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem corretores cadastrados.</p>
              ) : ativosFiltrados.length === 0 ? (
                <p className="rounded border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum corretor encontrado com os filtros atuais.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {ativosFiltrados.map((c) => {
                    const isAtivo = c.status_habilitacao === "ativo";
                    return (
                      <li
                        key={c.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm ${
                          isAtivo ? "border-border" : "border-border bg-muted/30 opacity-70"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className={`truncate font-medium ${!isAtivo ? "line-through" : ""}`}>{c.nome}</span>
                          <Badge variant={isAtivo ? "default" : "outline"} className={isAtivo ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                            {c.status_habilitacao}
                          </Badge>
                          {c.equipe && (
                            <Badge variant="outline">
                              {c.equipe === "alfa" ? emp.equipe_alfa_nome : emp.equipe_beta_nome}
                            </Badge>
                          )}
                          {c.email && <span className="hidden truncate text-xs text-muted-foreground md:inline">{c.email}</span>}
                        </div>
                        <div className="flex flex-shrink-0 gap-1">
                          <Select
                            value={c.equipe ?? "none"}
                            onValueChange={(v) => setEquipe(c, v === "none" ? null : (v as "alfa" | "beta"))}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem equipe</SelectItem>
                              <SelectItem value="alfa">{emp.equipe_alfa_nome}</SelectItem>
                              <SelectItem value="beta">{emp.equipe_beta_nome}</SelectItem>
                            </SelectContent>
                          </Select>
                          {isAtivo ? (
                            <Button size="sm" variant="outline" onClick={() => setStatus(c, "desativado")}
                              title="Desativar (mantém o cadastro, remove da roleta)">
                              <UserX className="mr-1 h-3.5 w-3.5" /> Desativar
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setStatus(c, "ativo")}
                              title="Reativar corretor">
                              <UserCheck className="mr-1 h-3.5 w-3.5" /> Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => excluir(c)}
                            title="Excluir definitivamente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

// ----- subcomponentes -----

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground/80">
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PeriodoCard({
  titulo, badge, inicio, fim, onChange,
}: { titulo: string; badge: string; inicio: string | null; fim: string | null; onChange: (i: string | null, f: string | null) => void }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Configuração {titulo}</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{badge}</span>
      </div>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Horário {titulo.toLowerCase()}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input type="time" value={inicio?.slice(0,5) ?? ""} onChange={(e) => onChange(e.target.value || null, fim)} />
        <span className="text-muted-foreground">–</span>
        <Input type="time" value={fim?.slice(0,5) ?? ""} onChange={(e) => onChange(inicio, e.target.value || null)} />
      </div>
    </div>
  );
}

function Protocolo({ icon, label, sub, active }: { icon: React.ReactNode; label: string; sub: string; active?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${active ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}>
      <div className={`mb-1 flex items-center gap-2 ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sub}</div>
    </div>
  );
}

function EquipeCol({ titulo, cor, lista, onRemover }:
  { titulo: string; cor: "primary" | "secondary"; lista: Corretor[]; onRemover: (c: Corretor) => void }) {
  return (
    <div className={`rounded-lg border-2 p-3 ${cor === "primary" ? "border-primary/40" : "border-amber-500/40"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider">{titulo}</h4>
        <Badge variant="outline">{lista.length}</Badge>
      </div>
      {lista.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Sem corretores nesta equipe.</p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-sm">
              <span className="truncate">{c.nome}</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onRemover(c)} title="Remover da equipe">
                <UserX className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
