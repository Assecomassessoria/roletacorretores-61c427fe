import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { MapPin, ShieldCheck, Wifi, QrCode, KeyRound, Loader2, RotateCcw, Trophy, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { checkInPlantao, listarEmpreendimentosPublico, roletaDoDiaPublico } from "@/lib/plantao.functions";

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

  const [emps, setEmps] = useState<Emp[]>([]);
  const [form, setForm] = useState({ empreendimento_id: "", creci: "", senha: "", wifi_ssid: "", pin: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsErr, setCoordsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [roleta, setRoleta] = useState<RoletaDia | null>(null);
  const [loadingRoleta, setLoadingRoleta] = useState(false);

  useEffect(() => {
    listEmps({}).then((r) => setEmps(r.empreendimentos)).catch(() => {});
  }, [listEmps]);

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
              <Label className="text-xs">Empreendimento</Label>
              <Select
                value={form.empreendimento_id}
                onValueChange={(v) => setForm((s) => ({ ...s, empreendimento_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o stand" /></SelectTrigger>
                <SelectContent>
                  {emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">CRECI</Label>
                <Input
                  required
                  autoComplete="username"
                  placeholder="Ex.: 123456"
                  value={form.creci}
                  onChange={(e) => setForm((s) => ({ ...s, creci: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha</Label>
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={(e) => setForm((s) => ({ ...s, senha: e.target.value }))}
                />
              </div>
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

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Confirmar presença & entrar na roleta
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-primary/40 bg-card p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Presença confirmada via {result.metodo}
              {result.distancia != null && <span>· {result.distancia}m</span>}
            </div>

            <div className="mx-auto inline-block rounded-lg border border-border bg-white p-4">
              <QRCodeCanvas value={qrPayload} size={208} includeMargin />
            </div>

            <div className="mt-4 space-y-1">
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
          </section>
        )}
      </main>
    </div>
  );
}
