import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save, Printer, MessageCircle, RefreshCw, Shield, MapPin, QrCode, Wifi,
  KeyRound, FileUp, Settings2, Users, UserCheck, UserX, Trash2, Sparkles,
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
};

type Corretor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  status_habilitacao: "pendente" | "ativo" | "desativado";
  equipe: "alfa" | "beta" | null;
  empreendimento_id: string;
};

export const Route = createFileRoute("/_authenticated/coordenador")({
  beforeLoad: () => {
    // gate handled inside component (need auth context); leave noop
    return;
  },
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

function CoordenadorPage() {
  const { roles, isMaster } = useAuth();
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!podeAcessar) return;
    void carregarEmps();
  }, [podeAcessar]);

  useEffect(() => {
    if (!empId) return;
    void carregarEmp();
    void carregarCorretores();
  }, [empId]);

  useEffect(() => {
    if (!emp?.qrcode_token) { setQrSvg(""); return; }
    QRCode.toString(emp.qrcode_token, { type: "svg", margin: 1, width: 180 })
      .then(setQrSvg).catch(() => setQrSvg(""));
  }, [emp?.qrcode_token]);

  async function carregarEmps() {
    const { data, error } = await supabase
      .from("empreendimentos")
      .select("id,nome")
      .eq("ativo", true)
      .order("nome");
    if (error) return toast.error(error.message);
    setEmps((data ?? []) as any);
    if (data && data.length && !empId) setEmpId(data[0].id);
  }

  async function carregarEmp() {
    const { data, error } = await supabase
      .from("empreendimentos")
      .select("*")
      .eq("id", empId)
      .maybeSingle();
    if (error) return toast.error(error.message);
    setEmp(data as Emp);
    setDirty(false);
  }

  async function carregarCorretores() {
    const { data, error } = await supabase
      .from("corretores")
      .select("id,nome,email,telefone,ativo,status_habilitacao,equipe,empreendimento_id")
      .eq("empreendimento_id", empId)
      .order("nome");
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
    const { error } = await supabase
      .from("empreendimentos")
      .update({
        nome: emp.nome,
        latitude: emp.latitude,
        longitude: emp.longitude,
        raio_metros: emp.raio_metros,
        wifi_ssid: emp.wifi_ssid,
        ciclo_roleta: emp.ciclo_roleta,
        horario_comercial_inicio: emp.horario_comercial_inicio,
        horario_comercial_fim: emp.horario_comercial_fim,
        horario_matutino_inicio: emp.horario_matutino_inicio,
        horario_matutino_fim: emp.horario_matutino_fim,
        horario_vespertino_inicio: emp.horario_vespertino_inicio,
        horario_vespertino_fim: emp.horario_vespertino_fim,
        regras_pdf_url: emp.regras_pdf_url,
        whatsapp_grupo_url: emp.whatsapp_grupo_url,
        qrcode_token: emp.qrcode_token,
        ip_homologado: emp.ip_homologado,
        equipe_alfa_nome: emp.equipe_alfa_nome,
        equipe_beta_nome: emp.equipe_beta_nome,
      } as any)
      .eq("id", emp.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    setDirty(false);
  }

  async function novoToken() {
    patch("qrcode_token", gerarToken());
    toast.message("Token gerado — clique em Salvar Alterações para persistir.");
  }

  async function uploadPdf(file: File) {
    if (!emp) return;
    const path = `${emp.id}/regras-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from("plantao-regras")
      .upload(path, file, { contentType: "application/pdf", upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("plantao-regras").createSignedUrl(path, 60 * 60 * 24 * 365);
    patch("regras_pdf_url", data?.signedUrl ?? path);
    toast.success("PDF anexado — clique em Salvar para confirmar.");
  }

  async function abrirWhatsAppGrupo() {
    if (emp?.whatsapp_grupo_url) window.open(emp.whatsapp_grupo_url, "_blank");
    else toast.message("Configure o link do grupo de WhatsApp.");
  }

  async function setStatus(c: Corretor, status: Corretor["status_habilitacao"]) {
    const { error } = await supabase
      .from("corretores")
      .update({ status_habilitacao: status, ativo: status === "ativo" } as any)
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`${c.nome}: ${status}`);
    carregarCorretores();
  }

  async function excluir(c: Corretor) {
    if (!confirm(`Excluir ${c.nome}?`)) return;
    const { error } = await supabase.from("corretores").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Corretor excluído");
    carregarCorretores();
  }

  const pendentes = useMemo(() => corretores.filter((c) => c.status_habilitacao === "pendente"), [corretores]);
  const ativos = useMemo(() => corretores.filter((c) => c.status_habilitacao !== "pendente"), [corretores]);

  if (!podeAcessar) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        Acesso restrito a Incorporadora / Gerente / Coordenador.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 print:py-2">
      {/* Cabeçalho de ações */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" />
            Painel de Operações Pro
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de equipes e escala de plantão</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
              <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={() => toast.message("Roleta oficial: use a página Roleta para bater o atendimento.")}>
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
        </div>
      </div>

      {!emp ? (
        <p className="text-sm text-muted-foreground">Selecione um empreendimento.</p>
      ) : (
        <div className="space-y-6">
          {/* 2. Ciclo Operacional */}
          <Card title="Selecione o ciclo operacional ativo">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["unica","manha","tarde"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => patch("ciclo_roleta", c)}
                  className={`rounded-lg border-2 p-4 text-left transition ${
                    emp.ciclo_roleta === c
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm font-bold uppercase tracking-wider">
                    {c === "unica" ? "Roleta Única" : c === "manha" ? "Roleta Manhã" : "Roleta Tarde"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c === "unica" ? "Período comercial corrido" : c === "manha" ? "Apenas turno matutino" : "Apenas turno vespertino"}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* 3. Períodos */}
          <Card title="Configuração de períodos">
            <div className="grid gap-4 md:grid-cols-3">
              <PeriodoCard
                titulo="Comercial"
                inicio={emp.horario_comercial_inicio}
                fim={emp.horario_comercial_fim}
                onChange={(i, f) => { patch("horario_comercial_inicio", i); patch("horario_comercial_fim", f); }}
              />
              <PeriodoCard
                titulo="Matutino"
                inicio={emp.horario_matutino_inicio}
                fim={emp.horario_matutino_fim}
                onChange={(i, f) => { patch("horario_matutino_inicio", i); patch("horario_matutino_fim", f); }}
              />
              <PeriodoCard
                titulo="Vespertino"
                inicio={emp.horario_vespertino_inicio}
                fim={emp.horario_vespertino_fim}
                onChange={(i, f) => { patch("horario_vespertino_inicio", i); patch("horario_vespertino_fim", f); }}
              />
            </div>
          </Card>

          {/* 4 + 5. PDF + Identidade */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Anexar políticas e regras do plantão (PDF)">
              <p className="mb-3 text-xs text-muted-foreground">
                Cada construtora ou imobiliária dispõe de sua própria política operacional de stand. Faça upload do arquivo PDF.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); }}
              />
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
                  <Input
                    placeholder="https://chat.whatsapp.com/... ou 5511999999999"
                    value={emp.whatsapp_grupo_url ?? ""}
                    onChange={(e) => patch("whatsapp_grupo_url", e.target.value || null)}
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* 6. Protocolos */}
          <Card title="Protocolos de blindagem e presença" icon={<Shield className="h-4 w-4" />}>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Protocolo icon={<MapPin className="h-4 w-4" />} label="Geofencing" sub="Cerca virtual GPS" />
              <Protocolo icon={<QrCode className="h-4 w-4" />} label="QR Code" sub="Leitura na recepção" />
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

          {/* 7. Equipes */}
          <Card title="Gestão de ativos e períodos" icon={<Users className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="✏ Nome Equipe Alfa">
                <Input value={emp.equipe_alfa_nome} onChange={(e) => patch("equipe_alfa_nome", e.target.value)} />
              </Field>
              <Field label="✏ Nome Equipe Beta">
                <Input value={emp.equipe_beta_nome} onChange={(e) => patch("equipe_beta_nome", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => toast.message(`Equipe: ${emp.equipe_alfa_nome}`)}>{emp.equipe_alfa_nome}</Button>
              <Button variant="secondary" onClick={() => toast.message(`Equipe: ${emp.equipe_beta_nome}`)}>{emp.equipe_beta_nome}</Button>
            </div>
          </Card>

          {/* 8. Corretores */}
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
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Corretores ({ativos.length})
              </h3>
              {ativos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem corretores cadastrados.</p>
              ) : (
                <ul className="space-y-1.5">
                  {ativos.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{c.nome}</span>
                        <Badge variant={c.status_habilitacao === "ativo" ? "default" : "outline"}>
                          {c.status_habilitacao}
                        </Badge>
                        {c.equipe && <Badge variant="outline">{c.equipe === "alfa" ? emp.equipe_alfa_nome : emp.equipe_beta_nome}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        {c.status_habilitacao === "ativo" ? (
                          <Button size="sm" variant="outline" onClick={() => setStatus(c, "desativado")}>
                            <UserX className="mr-1 h-3.5 w-3.5" /> Desativar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setStatus(c, "ativo")}>
                            <UserCheck className="mr-1 h-3.5 w-3.5" /> Ativar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => excluir(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
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
  titulo, inicio, fim, onChange,
}: { titulo: string; inicio: string | null; fim: string | null; onChange: (i: string | null, f: string | null) => void }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Configuração {titulo}</h3>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Horário {titulo.toLowerCase()}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input type="time" value={inicio?.slice(0,5) ?? ""} onChange={(e) => onChange(e.target.value || null, fim)} />
        <span className="text-muted-foreground">–</span>
        <Input type="time" value={fim?.slice(0,5) ?? ""} onChange={(e) => onChange(inicio, e.target.value || null)} />
      </div>
    </div>
  );
}

function Protocolo({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">{icon}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sub}</div>
    </div>
  );
}
