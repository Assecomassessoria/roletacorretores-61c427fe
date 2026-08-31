import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Wifi, QrCode, KeyRound, ShieldCheck, Loader2, Calendar, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listarPresencasDoDia } from "@/lib/presencas.functions";
import { listarAusencias, type AusenciaItem } from "@/lib/ausencias.functions";
import { definirPresencaManual, registrarVoltaAoStand } from "@/lib/presenca.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/presencas")({
  component: PresencasPage,
  head: () => ({ meta: [{ title: "Presenças confirmadas — Roleta Corretor" }] }),
});

type Presenca = {
  plantao_id: string;
  confirmado_em: string | null;
  status: string;
  status_presenca?: string | null;
  fora_desde?: string | null;
  hora_inicio: string;
  hora_fim: string;
  lat: number | null;
  lng: number | null;
  corretor: { id: string; nome: string; creci: string | null; telefone: string | null; foto_url: string | null } | null;
  empreendimento: { id: string; nome: string; metodos_presenca: string[] | null; latitude: number | null; longitude: number | null; raio_metros: number | null } | null;
  auditoria: { metodo_aprovado: string | null; distancia_m: number | null; checks: Array<{ metodo: string; ok: boolean; detalhe: string }> } | null;
};

const METODO_ICON: Record<string, typeof MapPin> = {
  geofence: MapPin,
  wifi: Wifi,
  qrcode: QrCode,
  pin: KeyRound,
};

const METODO_LABEL: Record<string, string> = {
  geofence: "Geolocalização",
  wifi: "Wi-Fi",
  qrcode: "QR Code",
  pin: "PIN",
};

function PresencasPage() {
  const fetchPresencas = useServerFn(listarPresencasDoDia);
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [busy, setBusy] = useState(false);
  const fetchAusencias = useServerFn(listarAusencias);
  const [ausencias, setAusencias] = useState<AusenciaItem[]>([]);
  const [totalAusente, setTotalAusente] = useState(0);
  const marcarManual = useServerFn(definirPresencaManual);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const voltarFn = useServerFn(registrarVoltaAoStand);
  const [retornoHora, setRetornoHora] = useState<Record<string, string>>({});

  async function registrarVolta(plantaoId: string) {
    if (!senha.trim()) return toast.error("Informe a senha de gerência.");
    setSalvando(plantaoId + "volta");
    try {
      const hora = retornoHora[plantaoId];
      const iso = hora ? new Date(hora).toISOString() : undefined;
      const r = await voltarFn({ data: { plantao_id: plantaoId, senha: senha.trim(), ...(iso ? { retorno_em: iso } : {}) } });
      toast.success(`Volta ao stand registrada às ${fmtHora(r.retorno_em)}.`);
      setRetornoHora((m) => ({ ...m, [plantaoId]: "" }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar a volta.");
    } finally {
      setSalvando(null);
    }
  }

  async function alterarPresenca(plantaoId: string, estado: "presente" | "ausente") {
    if (!senha.trim()) return toast.error("Informe a senha de gerência.");
    setSalvando(plantaoId + estado);
    try {
      await marcarManual({ data: { plantao_id: plantaoId, estado, senha: senha.trim() } });
      toast.success(estado === "ausente" ? "Corretor marcado como ausente." : "Presença reativada.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao alterar presença.");
    } finally {
      setSalvando(null);
    }
  }

  async function load() {
    setBusy(true);
    try {
      const r = (await fetchPresencas({ data: { data: dia } })) as { presencas: Presenca[] };
      setPresencas(r.presencas);
      try {
        const a = (await fetchAusencias({ data: { de: dia, ate: dia } })) as {
          ausencias: AusenciaItem[];
          total_minutos: number;
        };
        setAusencias(a.ausencias);
        setTotalAusente(a.total_minutos);
      } catch {
        setAusencias([]);
        setTotalAusente(0);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dia]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Presenças confirmadas</h1>
          <p className="text-sm text-muted-foreground">
            Lista de plantonistas com check-in validado, método utilizado e auditoria.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Dia</Label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-44" />
          </div>
          <Button variant="outline" onClick={load} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
        <Users className="h-3.5 w-3.5" /> {presencas.length} presença(s)
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
        <div>
          <Label className="text-xs">Senha de gerência</Label>
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Necessária para marcar presença/ausência"
            className="w-72"
          />
        </div>
        <p className="pb-2 text-[11px] text-muted-foreground">
          Com a senha, o gestor pode marcar manualmente um corretor como ausente (registra a saída) ou
          reativar sua presença.
        </p>
      </div>

      {busy && presencas.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : presencas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhuma presença confirmada para esta data.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Corretor</th>
                <th className="px-4 py-2 text-left">Stand</th>
                <th className="px-4 py-2 text-left">Confirmado</th>
                <th className="px-4 py-2 text-left">Método aprovado</th>
                <th className="px-4 py-2 text-left">Verificação</th>
                <th className="px-4 py-2 text-left">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {presencas.map((p) => {
                const metodo = p.auditoria?.metodo_aprovado ?? "—";
                const Icon = METODO_ICON[metodo] ?? ShieldCheck;
                return (
                  <tr key={p.plantao_id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.corretor?.foto_url ? (
                          <img src={p.corretor.foto_url} alt={p.corretor.nome} className="h-9 w-9 rounded-full border object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {p.corretor?.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{p.corretor?.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.corretor?.creci && <>CRECI {p.corretor.creci}</>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.empreendimento?.nome}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.confirmado_em ? new Date(p.confirmado_em).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Icon className="h-3.5 w-3.5" /> {METODO_LABEL[metodo] ?? metodo}
                        {p.auditoria?.distancia_m != null && <span className="opacity-70">· {p.auditoria.distancia_m}m</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.auditoria?.checks?.length ? (
                        <ul className="space-y-0.5 text-[11px]">
                          {p.auditoria.checks.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                              <span>
                                <strong className="text-foreground">{METODO_LABEL[c.metodo] ?? c.metodo}:</strong>{" "}
                                <span className="text-muted-foreground">{c.detalhe}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem registro detalhado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            p.status_presenca === "ausente"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {p.status_presenca === "ausente" ? "Ausente" : "Presente"}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={salvando === p.plantao_id + "ausente"}
                            onClick={() => alterarPresenca(p.plantao_id, "ausente")}
                          >
                            Marcar ausente
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={salvando === p.plantao_id + "presente"}
                            onClick={() => alterarPresenca(p.plantao_id, "presente")}
                          >
                            Marcar presente
                          </Button>
                        </div>
                        {(p.status_presenca === "ausente" || p.fora_desde) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-1.5">
                            <Input
                              type="datetime-local"
                              value={retornoHora[p.plantao_id] ?? ""}
                              onChange={(e) => setRetornoHora((m) => ({ ...m, [p.plantao_id]: e.target.value }))}
                              className="h-7 w-44 text-[11px]"
                            />
                            <Button
                              size="sm"
                              className="h-7 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-600/90"
                              disabled={salvando === p.plantao_id + "volta"}
                              onClick={() => registrarVolta(p.plantao_id)}
                            >
                              {salvando === p.plantao_id + "volta" ? "..." : "Registrar volta ao stand"}
                            </Button>
                            <span className="w-full text-[10px] text-muted-foreground">
                              Sem data/hora informada, usa o horário atual.
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <footer className="border-t border-border bg-muted/20 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Auditoria:</strong> métodos validados conforme configuração do
            empreendimento (geofence/Wi-Fi/QR Code/PIN). Coordenadas e SSID exibidos para conferência; tokens de QR Code
            e senhas <em>não</em> são exibidos por segurança. Cada confirmação gera um registro em <code>audit_log</code>{" "}
            com carimbo de tempo, usuário autenticado e detalhe por método.
          </footer>
        </div>
      )}
      <section className="mt-10">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Histórico de ausências</h2>
            <p className="text-xs text-muted-foreground">
              Registro detalhado de cada saída do stand: início, retorno e duração total.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" /> {ausencias.length} ausência(s) · {fmtDur(totalAusente)} no total
          </span>
        </header>

        {ausencias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma ausência registrada nesta data.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Corretor</th>
                  <th className="px-4 py-2 text-left">Início</th>
                  <th className="px-4 py-2 text-left">Fim</th>
                  <th className="px-4 py-2 text-left">Duração</th>
                  <th className="px-4 py-2 text-left">Origem</th>
                  <th className="px-4 py-2 text-left">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ausencias.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{a.corretor?.nome ?? "—"}</div>
                      {a.corretor?.creci && (
                        <div className="text-xs text-muted-foreground">CRECI {a.corretor.creci}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtHora(a.inicio)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.fim ? fmtHora(a.fim) : <span className="font-semibold text-amber-600">em curso</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{fmtDur(a.duracao_minutos ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.origem === "manual" ? "Manual" : "Automática"}
                    </td>
                    <td className="px-4 py-3">
                      {a.fim ? (
                        <span className="text-[11px] text-muted-foreground">Encerrada</span>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-600/90"
                          disabled={salvando === a.plantao_id + "volta"}
                          onClick={() => registrarVolta(a.plantao_id)}
                        >
                          Registrar volta
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}
