import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { MapPin, ShieldCheck, Wifi, QrCode, KeyRound, Loader2, RotateCcw, Trophy, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { NavActions } from "@/components/nav-actions";
import { SugestoesPanel } from "@/components/sugestoes-panel";
import { checkInPlantao, listarEmpreendimentosPublico, roletaDoDiaPublico, lookupEmpreendimentosPorCreci } from "@/lib/plantao.functions";
import { startAuthenticationPlantao, finishAuthenticationPlantao } from "@/lib/webauthn.functions";
import { Fingerprint } from "lucide-react";
import { inscreverEscala, listarEscalaSemanal, resetarEscalaAdmin } from "@/lib/escala.functions";
import { CalendarDays, Sparkles, ShieldAlert } from "lucide-react";


export const Route = createFileRoute("/plantao")({
  component: PlantaoPage,
  head: () => ({
    meta: [
      { title: "Plantão / Presença — Roleta Corretor" },
      { name: "description", content: "Confirme presença no stand com CRECI e senha e entre na roleta do dia." },
    ],
  }),
});

type Emp = { id: string; nome: string };
type Check = { metodo: string; ok: boolean; detalhe: string };
type CheckInResult = {
  ok: boolean;
  metodo: string;
  distancia: number | null;
  checks: Check[];
  login_email?: string | null;
  corretor: { id: string; nome: string; telefone: string | null; creci: string | null; foto_url: string | null };
  empreendimento: { id: string; nome: string };
};

type RoletaItem = {
  id: string;
  nome: string;
  creci: string | null;
  telefone: string | null;
  foto_url: string | null;
  atendimentos_semana: number;
  ordem_roleta: number;
};
type RoletaDia = {
  empreendimento: { id: string; nome: string };
  data: string;
  total_presentes: number;
  proximo_id: string | null;
  fila: RoletaItem[];
};

const METODO_LABEL: Record<string, string> = {
  geofence: "Geolocalização",
  wifi: "Wi-Fi do stand",
  qrcode: "QR Code",
  pin: "PIN rotativo",
};

function PlantaoPage() {
  const listEmps = useServerFn(listarEmpreendimentosPublico);
  const checkIn = useServerFn(checkInPlantao);
  const carregarRoleta = useServerFn(roletaDoDiaPublico);
  const carregarEscala = useServerFn(listarEscalaSemanal);
  const inscrever = useServerFn(inscreverEscala);
  const resetAdmin = useServerFn(resetarEscalaAdmin);
  const startAuthBio = useServerFn(startAuthenticationPlantao);
  const finishAuthBio = useServerFn(finishAuthenticationPlantao);
  const [bioBusy, setBioBusy] = useState(false);



  const [resetOpen, setResetOpen] = useState(false);
  const [resetSenha, setResetSenha] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  async function executarResetAdmin() {
    if (!form.empreendimento_id) return toast.error("Selecione o empreendimento");
    if (!resetSenha) return toast.error("Informe a senha");
    setResetBusy(true);
    try {
      const r = await resetAdmin({ data: { empreendimento_id: form.empreendimento_id } });
      toast.success(`Escala resetada (${r.removidos} registro${r.removidos === 1 ? "" : "s"} removido${r.removidos === 1 ? "" : "s"}). Vagas abertas a partir de domingo.`);
      setResetSenha("");
      setResetOpen(false);
      await refreshEscala(form.empreendimento_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao resetar escala");
    } finally {
      setResetBusy(false);
    }
  }


  type EscalaItem = { data: string; data_br: string; dia_semana: string; slot_id: string | null; periodos: string[]; corretor: { id: string; nome: string; creci: string | null } | null };
  type Escala = { feriados: string[]; escala: Array<{ equipe: string; itens: EscalaItem[] }> };
  const [escala, setEscala] = useState<Escala | null>(null);
  const [equipeSel, setEquipeSel] = useState<"alfa" | "beta">("alfa");
  const [escalaBusy, setEscalaBusy] = useState(false);
  const [escalaNome, setEscalaNome] = useState("");
  const [escalaData, setEscalaData] = useState<string>("");
  const [periodoManha, setPeriodoManha] = useState(true);
  const [periodoTarde, setPeriodoTarde] = useState(true);


  const [emps, setEmps] = useState<Emp[]>([]);
  const [form, setForm] = useState({ empreendimento_id: "", creci: "", senha: "", wifi_ssid: "", pin: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsErr, setCoordsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [roleta, setRoleta] = useState<RoletaDia | null>(null);
  const [loadingRoleta, setLoadingRoleta] = useState(false);

  type EmpCnpj = { id: string; nome: string; cnpj: string | null };
  const [empsDoCreci, setEmpsDoCreci] = useState<EmpCnpj[] | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const lookupCreci = useServerFn(lookupEmpreendimentosPorCreci);

  useEffect(() => {
    listEmps({}).then((r) => setEmps(r.empreendimentos)).catch(() => {});
  }, [listEmps]);

  async function buscarPorCreci() {
    const creci = form.creci.trim();
    if (creci.length < 2) return toast.error("Digite seu CRECI");
    setLookupBusy(true);
    setEmpsDoCreci(null);
    setForm((s) => ({ ...s, empreendimento_id: "" }));
    try {
      const r = await lookupCreci({ data: { creci } });
      const list = r.empreendimentos as EmpCnpj[];
      if (list.length === 0) {
        toast.error("CRECI não encontrado ou inativo.");
        setEmpsDoCreci([]);
        return;
      }
      setEmpsDoCreci(list);
      if (list.length === 1) {
        setForm((s) => ({ ...s, empreendimento_id: list[0].id }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao consultar CRECI");
    } finally {
      setLookupBusy(false);
    }
  }


  const refreshEscala = async (empId: string) => {
    try {
      const r = (await carregarEscala({ data: { empreendimento_id: empId } })) as Escala;
      setEscala(r);
    } catch (err) {
      setEscala({ feriados: [], escala: [{ equipe: "alfa", itens: [] }, { equipe: "beta", itens: [] }] });
      toast.error(err instanceof Error ? err.message : "Falha ao carregar a escala");
    }
  };

  useEffect(() => {
    if (!form.empreendimento_id) { setEscala(null); return; }
    refreshEscala(form.empreendimento_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.empreendimento_id]);

  async function inscreverNaEscala() {
    if (!form.empreendimento_id) return toast.error("Selecione o empreendimento");
    if (!escalaNome.trim()) return toast.error("Digite seu nome");
    if (!escalaData) return toast.error("Selecione o dia da semana");
    const periodos = [
      ...(periodoManha ? ["manha" as const] : []),
      ...(periodoTarde ? ["tarde" as const] : []),
    ];
    if (periodos.length === 0) return toast.error("Selecione ao menos um período (Manhã ou Tarde)");
    setEscalaBusy(true);
    try {
      const r = await inscrever({ data: { empreendimento_id: form.empreendimento_id, equipe: equipeSel, nome: escalaNome.trim(), data: escalaData, periodos } });
      toast.success(r.ja_inscrito ? `${r.corretor_nome} já está em ${r.data_br} (${r.dia_semana})` : `${r.corretor_nome} escalado(a) para ${r.data_br} — ${r.dia_semana}`);
      setEscalaNome("");
      setEscalaData("");
      await refreshEscala(form.empreendimento_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar na escala");
    } finally {
      setEscalaBusy(false);
    }
  }



  useEffect(() => {
    if (!navigator.geolocation) {
      setCoordsErr("Geolocalização indisponível neste dispositivo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setCoordsErr(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const qrPayload = useMemo(() => {
    if (!result) return "";
    const phone = (result.corretor.telefone ?? "").replace(/\D/g, "");
    if (phone) return `https://wa.me/${phone}`;
    return `Corretor: ${result.corretor.nome}\nCRECI: ${result.corretor.creci ?? "-"}`;
  }, [result]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.empreendimento_id) return toast.error("Selecione o empreendimento");
    if (!form.creci || !form.senha) return toast.error("Informe CRECI e senha");
    setBusy(true);
    try {
      const r = (await checkIn({
        data: {
          empreendimento_id: form.empreendimento_id,
          creci: form.creci,
          senha: form.senha,
          latitude: coords?.lat,
          longitude: coords?.lng,
          wifi_ssid: form.wifi_ssid || undefined,
          pin: form.pin || undefined,
        },
      })) as CheckInResult;
      setResult(r);
      toast.success(`Presença confirmada por ${r.metodo}`);
      await refreshRoleta(r.empreendimento.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao confirmar presença");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRoleta(empId: string) {
    setLoadingRoleta(true);
    try {
      const r = (await carregarRoleta({ data: { empreendimento_id: empId } })) as RoletaDia;
      setRoleta(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar roleta");
    } finally {
      setLoadingRoleta(false);
    }
  }

  function reset() {
    setResult(null);
    setRoleta(null);
    setForm((s) => ({ ...s, senha: "", pin: "" }));
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Plantão / Presença</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme sua presença no stand e entre automaticamente na roleta do dia.
          </p>
        </div>

        {!result ? (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">CRECI</Label>
              <div className="flex gap-2">
                <Input
                  required
                  autoComplete="username"
                  placeholder="Ex.: 123456"
                  value={form.creci}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, creci: e.target.value, empreendimento_id: "" }));
                    setEmpsDoCreci(null);
                  }}
                  onBlur={() => { if (form.creci.trim().length >= 2 && !empsDoCreci) buscarPorCreci(); }}
                />
                <Button type="button" variant="outline" onClick={buscarPorCreci} disabled={lookupBusy}>
                  {lookupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Digite seu CRECI para localizar automaticamente o(s) empreendimento(s) vinculado(s).
              </p>
            </div>

            {empsDoCreci && empsDoCreci.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Empreendimento{empsDoCreci.length > 1 ? "s vinculados ao seu CRECI" : ""}
                </Label>
                {empsDoCreci.length === 1 ? (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <div className="font-semibold text-foreground">{empsDoCreci[0].nome}</div>
                    {empsDoCreci[0].cnpj && (
                      <div className="text-xs text-muted-foreground">CNPJ: {empsDoCreci[0].cnpj}</div>
                    )}
                  </div>
                ) : (
                  <Select
                    value={form.empreendimento_id}
                    onValueChange={(v) => setForm((s) => ({ ...s, empreendimento_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o empreendimento (CNPJ)" /></SelectTrigger>
                    <SelectContent>
                      {empsDoCreci.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}{e.cnpj ? ` — CNPJ ${e.cnpj}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Senha</Label>
              <PasswordInput
                required
                autoComplete="current-password"
                value={form.senha}
                onChange={(e) => setForm((s) => ({ ...s, senha: e.target.value }))}
              />
            </div>

            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
              <div className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Verificação de presença
              </div>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {coords ? (
                    <span className="text-foreground">Localização capturada ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})</span>
                  ) : coordsErr ? (
                    <span className="text-destructive">{coordsErr}</span>
                  ) : (
                    <span className="text-muted-foreground">Capturando localização…</span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 text-primary" />
                  <Input
                    className="h-7 max-w-[220px] text-xs"
                    placeholder="SSID do Wi-Fi (opcional)"
                    value={form.wifi_ssid}
                    onChange={(e) => setForm((s) => ({ ...s, wifi_ssid: e.target.value }))}
                  />
                </li>
                <li className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <Input
                    className="h-7 max-w-[160px] text-xs"
                    placeholder="PIN (opcional)"
                    value={form.pin}
                    onChange={(e) => setForm((s) => ({ ...s, pin: e.target.value }))}
                  />
                </li>

                <li className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5" /> QR Code do stand é capturado automaticamente quando aplicável.
                </li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={busy || bioBusy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Confirmar presença & entrar na roleta
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full border-[var(--navy-deep,#0b1e3f)] text-[var(--navy-deep,#0b1e3f)]"
              disabled={busy || bioBusy || !form.empreendimento_id || !form.creci}
              onClick={async () => {
                if (!form.empreendimento_id || !form.creci) return toast.error("Informe CRECI e empreendimento.");
                if (typeof window === "undefined" || !window.PublicKeyCredential) return toast.error("Biometria não suportada neste dispositivo.");
                setBioBusy(true);
                try {
                  const { startAuthentication } = await import("@simplewebauthn/browser");
                  const options = await startAuthBio({ data: { empreendimento_id: form.empreendimento_id, creci: form.creci } });
                  const response = await startAuthentication({ optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"] });
                  const { biometric_token } = await finishAuthBio({ data: { empreendimento_id: form.empreendimento_id, creci: form.creci, response } });
                  const r = (await checkIn({
                    data: {
                      empreendimento_id: form.empreendimento_id,
                      creci: form.creci,
                      biometric_token,
                      latitude: coords?.lat,
                      longitude: coords?.lng,
                      wifi_ssid: form.wifi_ssid || undefined,
                      pin: form.pin || undefined,
                    },
                  })) as CheckInResult;
                  setResult(r);
                  toast.success(`Presença confirmada por biometria (${r.metodo})`);
                  await refreshRoleta(r.empreendimento.id);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Falha na biometria — use a senha.");
                } finally {
                  setBioBusy(false);
                }
              }}
            >
              {bioBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              Entrar com Biometria
            </Button>
          </form>
        ) : null}

        {/* Escala Semanal removida da área do Corretor — gerenciada exclusivamente pela Coordenação/Gerência, vinculada ao CNPJ do empreendimento. */}



        {result && (
          <div className="rounded-lg border border-primary/40 bg-card p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Presença confirmada via {result.metodo}
              {result.distancia != null && <span>· {result.distancia}m</span>}
            </div>

            <div className="mx-auto inline-block rounded-lg border border-border bg-white p-4">
              <QRCodeCanvas value={qrPayload} size={208} includeMargin />
            </div>

            <div className="mt-4 space-y-1">
              {result.corretor.foto_url && (
                <img
                  src={result.corretor.foto_url}
                  alt={result.corretor.nome}
                  className="mx-auto mb-2 h-20 w-20 rounded-full border-2 border-primary/30 object-cover"
                />
              )}
              <div className="font-display text-xl font-bold text-foreground">{result.corretor.nome}</div>
              {result.corretor.telefone && (
                <div className="text-sm text-muted-foreground">WhatsApp: {result.corretor.telefone}</div>
              )}
              {result.corretor.creci && (
                <div className="text-sm text-muted-foreground">CRECI: {result.corretor.creci}</div>
              )}
              <div className="pt-2 text-sm font-semibold uppercase tracking-wider text-primary">
                {result.empreendimento.nome}
              </div>
            </div>

            {result.checks.length > 0 && (
              <ul className="mt-5 space-y-1.5 rounded-md border border-border bg-muted/30 p-3 text-left text-xs">
                <li className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Critérios verificados
                </li>
                {result.checks.map((c) => (
                  <li key={c.metodo} className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    <span className="flex-1">
                      <strong className="text-foreground">{METODO_LABEL[c.metodo] ?? c.metodo}:</strong>{" "}
                      <span className={c.ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{c.detalhe}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Novo check-in
              </Button>
              <Button
                variant="ghost"
                onClick={() => refreshRoleta(result.empreendimento.id)}
                disabled={loadingRoleta}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingRoleta ? "animate-spin" : ""}`} />
                Atualizar roleta
              </Button>
            </div>
          </div>
        )}

        {result && (
          <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Roleta do dia
                </h2>
                <p className="text-xs text-muted-foreground">
                  {roleta?.empreendimento.nome ?? result.empreendimento.nome} ·{" "}
                  {roleta ? new Date(roleta.data + "T00:00").toLocaleDateString("pt-BR") : "carregando…"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                <Users className="h-3.5 w-3.5" /> {roleta?.total_presentes ?? 0} presentes
              </span>
            </header>

            {loadingRoleta && !roleta ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando fila…
              </div>
            ) : (roleta?.fila.length ?? 0) === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Ainda não há outros corretores com presença confirmada hoje.
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {roleta!.fila.map((c, idx) => {
                  const eu = c.id === result.corretor.id;
                  const proximo = c.id === roleta!.proximo_id;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center gap-3 py-2.5 ${eu ? "rounded-md bg-primary/5 px-2" : "px-2"}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          proximo
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {c.foto_url ? (
                        <img
                          src={c.foto_url}
                          alt={c.nome}
                          className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {c.nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {c.nome}
                          {eu && (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                              VOCÊ
                            </span>
                          )}
                          {proximo && (
                            <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                              PRÓXIMO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.creci && <>CRECI {c.creci} · </>}
                          {c.atendimentos_semana} atendimento(s) na semana
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {roleta && roleta.fila.length > 0 && (
              <footer className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Auditoria do sorteio:</strong> ordenação por fila justa —
                menor número de atendimentos na semana, desempate por <code>ordem_roleta</code>. Próximo da vez:{" "}
                <strong className="text-foreground">{roleta.fila[0]?.nome}</strong>. Total elegível:{" "}
                {roleta.total_presentes}. Snapshot gerado em {new Date().toLocaleString("pt-BR")}.
              </footer>
            )}
          </section>
        )}

        <NavActions />
      </main>
      <SugestoesPanel origem="plantao" />
    </div>
  );
}
