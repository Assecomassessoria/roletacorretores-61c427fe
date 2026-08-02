import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pingPresenca, varrerAusentes, reativarPresenca } from "@/lib/presenca.functions";
import { listarMeusEmpreendimentos } from "@/lib/meus-empreendimentos.functions";
import { baterRoletaOficial as baterRoletaOficialFn, liberarRoletaOficial as liberarRoletaOficialFn } from "@/lib/plantao.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, UserCheck, ArrowRight, RotateCcw, ArrowLeft, LogOut } from "lucide-react";

type Emp = { id: string; nome: string; latitude: number | null; longitude: number | null; raio_metros: number; periodo_ausencia_minutos: number; criterios_sorteio?: string[] | null; fila_oficial_data?: string | null; fila_oficial_ids?: string[] | null; equipe_alfa_nome?: string | null; equipe_beta_nome?: string | null; roleta_automatica?: boolean | null; roleta_auto_horarios?: string[] | null };
type Corretor = { id: string; nome: string; empreendimento_id: string; ordem_roleta: number; user_id: string | null; ativo: boolean; equipe: string | null };
type Plantao = { id: string; corretor_id: string; empreendimento_id: string; data: string; hora_inicio: string; hora_fim: string; status: string; presenca_confirmada_em: string | null; fora_desde: string | null; ultimo_ping_em: string | null; status_presenca: "presente" | "ausente" };


export const Route = createFileRoute("/_authenticated/roleta")({
  component: RoletaPage,
  head: () => ({ meta: [{ title: "Roleta — Roleta Corretor" }] }),
});

function saoPauloParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")) };
}
function formatDateUTC(date: Date) { return date.toISOString().slice(0, 10); }
function operationalDateISO() {
  const p = saoPauloParts();
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  if (p.hour < 6) d.setUTCDate(d.getUTCDate() - 1);
  return formatDateUTC(d);
}
function weekStart() {
  const [year, month, day] = operationalDateISO().split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return formatDateUTC(d);
}

// Haversine distance in meters
function distMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function RoletaPage() {
  const { user, roles } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const isAdmin = roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));
  async function handleSair() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }
  const [emps, setEmps] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [atendOpen, setAtendOpen] = useState<Corretor | null>(null);
  const [atendForm, setAtendForm] = useState({ cliente_nome: "", cliente_telefone: "", cliente_email: "", observacoes: "" });
  const [busy, setBusy] = useState(false);
  const [localOfficial, setLocalOfficial] = useState<{ empreendimento_id: string; data: string; ids: string[] } | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  // Relógio para o cronômetro de ausência
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const pingFn = useServerFn(pingPresenca);
  const varrerFn = useServerFn(varrerAusentes);
  const reativarFn = useServerFn(reativarPresenca);
  const listarEmpsFn = useServerFn(listarMeusEmpreendimentos);
  const baterRoletaServerFn = useServerFn(baterRoletaOficialFn);
  const liberarRoletaServerFn = useServerFn(liberarRoletaOficialFn);

  async function loadEmps() {
    try {
      const { empreendimentos } = await listarEmpsFn({});
      setEmps((empreendimentos as Emp[]) ?? []);
      if (empreendimentos.length && !empId) setEmpId(empreendimentos[0].id);
    } catch (e) {
      console.error("Erro ao carregar empreendimentos", e);
    }
  }
  async function loadAll() {
    if (!empId) return;
    const wkStart = weekStart();
    const [{ data: cs }, { data: ps }, { data: ats }] = await Promise.all([
      supabase.from("corretores").select("id,nome,creci,telefone,empreendimento_id,ordem_roleta,user_id,ativo,foto_url,equipe").eq("empreendimento_id", empId).eq("ativo", true).order("ordem_roleta"),
      supabase.from("plantoes").select("*").eq("empreendimento_id", empId).eq("data", operationalDateISO()),
      supabase.from("atendimentos").select("corretor_id,iniciado_em").eq("empreendimento_id", empId).gte("iniciado_em", `${wkStart}T00:00:00Z`),
    ]);
    setCorretores((cs as Corretor[]) ?? []);
    setPlantoes((ps as Plantao[]) ?? []);
    const map: Record<string, number> = {};
    (ats ?? []).forEach((a: any) => { map[a.corretor_id] = (map[a.corretor_id] ?? 0) + 1; });
    setCounts(map);
  }

  useEffect(() => { if (user?.id) loadEmps(); }, [user?.id]);
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [empId]);

  const emp = emps.find((e) => e.id === empId);
  const minhaCorretor = corretores.find((c) => c.user_id === user?.id);
  const hojeOperacional = operationalDateISO();

  useEffect(() => { setLocalOfficial(null); }, [empId]);

  // Heartbeat de presença (corretor com check-in) + varredura de ausentes (admin) a cada 60s
  useEffect(() => {
    if (!empId) return;
    let cancelado = false;

    async function tick() {
      try {
        // Varredura central — qualquer aba aberta basta para manter o estado consistente
        await varrerFn({ data: { empreendimento_id: empId } });
      } catch { /* silencioso */ }

      // Heartbeat de geolocalização (apenas se este usuário tem plantão hoje aqui)
      const meuPlantao = plantoes.find(
        (p) => p.corretor_id === minhaCorretor?.id && p.presenca_confirmada_em,
      );
      if (meuPlantao && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelado) return;
            try {
              await pingFn({ data: { plantao_id: meuPlantao.id, lat: pos.coords.latitude, lng: pos.coords.longitude } });
            } catch { /* silencioso */ }
          },
          () => { /* sem permissão — ignora */ },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 },
        );
      }

      if (!cancelado) loadAll();
    }

    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelado = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId, minhaCorretor?.id, plantoes.length]);

  function fmtHora(iso: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  }
  function fmtDur(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
  }

  function presencaInfo(corretorId: string) {
    const p = plantoes.find((x) => x.corretor_id === corretorId);
    if (!p) return { status: "sem" as const, label: "sem plantão", min: 0, desde: null as string | null };
    const min = p.fora_desde ? Math.max(0, Math.floor((agora - new Date(p.fora_desde).getTime()) / 60000)) : 0;
    if (p.status_presenca === "ausente") {
      return {
        status: "ausente" as const,
        label: p.fora_desde ? `Ausente desde ${fmtHora(p.fora_desde)} · ${fmtDur(min)}` : "Ausente",
        min,
        desde: p.fora_desde,
      };
    }
    if (p.fora_desde) {
      return {
        status: "saindo" as const,
        label: `Saiu às ${fmtHora(p.fora_desde)} · ${fmtDur(min)}`,
        min,
        desde: p.fora_desde,
      };
    }
    if (p.presenca_confirmada_em) return { status: "presente" as const, label: "Presente", min: 0, desde: null };
    return { status: "aguardando" as const, label: "Aguardando", min: 0, desde: null };
  }


  // Ordem oficial congelada no servidor por empreendimento + dia operacional (limpa automaticamente às 06:00).
  const persistedOfficialOrder = emp?.fila_oficial_data === hojeOperacional && (emp.fila_oficial_ids?.length ?? 0) > 0
    ? emp.fila_oficial_ids ?? null
    : null;
  const optimisticOfficialOrder = localOfficial?.empreendimento_id === empId && localOfficial.data === hojeOperacional && localOfficial.ids.length > 0
    ? localOfficial.ids
    : null;
  const officialOrder = persistedOfficialOrder ?? optimisticOfficialOrder;

  // Reembaralha apenas quando NÃO há ordem oficial congelada
  const [shuffleNonce, setShuffleNonce] = useState(0);
  useEffect(() => {
    if (!officialOrder) setShuffleNonce((n) => n + 1);
  }, [plantoes, counts, officialOrder]);

  // Auto-fixa a fila do dia: assim que houver presentes e ainda não houver
  // roleta oficial congelada, o admin persiste a ordem atual para o dia,
  // evitando que F5/scroll reembaralhe. Só admins podem congelar.
  const [autoFixando, setAutoFixando] = useState(false);

  const fila = useMemo(() => {
    // só entram presentes (verde); ausentes/saindo são exibidos separadamente
    const presentes = corretores.filter((c) => {
      const p = plantoes.find((x) => x.corretor_id === c.id);
      return p?.presenca_confirmada_em && p.status_presenca !== "ausente";
    });

    // Se houver ordem oficial congelada, respeita exatamente o sorteio gravado.
    // Não remove ausentes nem adiciona novos presentes, para a ordem não mudar com F5/scroll/puxar no celular.
    if (officialOrder && officialOrder.length) {
      const byId = new Map(corretores.map((c) => [c.id, c] as const));
      return officialOrder.map((id) => byId.get(id)).filter((c): c is Corretor => Boolean(c));
    }

    const criterios: string[] = (emp?.criterios_sorteio && emp.criterios_sorteio.length)
      ? emp.criterios_sorteio
      : ["menor_atendimentos", "ordem_sorteio"];
    const rand: Record<string, number> = {};
    presentes.forEach((c) => { rand[c.id] = Math.random(); });
    const chegada: Record<string, number> = {};
    presentes.forEach((c) => {
      const p = plantoes.find((x) => x.corretor_id === c.id);
      chegada[c.id] = p?.presenca_confirmada_em ? new Date(p.presenca_confirmada_em).getTime() : Number.MAX_SAFE_INTEGER;
    });
    const valor = (c: Corretor, cr: string): number => {
      switch (cr) {
        case "ordem_chegada": return chegada[c.id] ?? Number.MAX_SAFE_INTEGER;
        case "ordem_sorteio": return rand[c.id] ?? 0;
        case "menor_atendimentos": return counts[c.id] ?? 0;
        case "participacao_semana": return 0;
        case "menor_leads_semana": return 0;
        default: return 0;
      }
    };
    return [...presentes].sort((a, b) => {
      for (const cr of criterios) {
        const va = valor(a, cr), vb = valor(b, cr);
        if (va !== vb) return va - vb;
      }
      return (rand[a.id] ?? 0) - (rand[b.id] ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corretores, plantoes, counts, emp?.criterios_sorteio, shuffleNonce, officialOrder]);

  const proximo = fila[0];

  useEffect(() => {
    if (!empId || !emp || !isAdmin || officialOrder || autoFixando || fila.length === 0) return;
    const hoje = hojeOperacional;
    if (emp.fila_oficial_data === hoje) return;
    setAutoFixando(true);
    baterRoletaServerFn({ data: { empreendimento_id: empId, ids: fila.map((c) => c.id) } })
      .then((r) => {
        setLocalOfficial({ empreendimento_id: empId, data: r.data, ids: r.ids });
        return loadEmps();
      })
      .catch(() => { /* silencioso */ })
      .finally(() => setAutoFixando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId, emp?.fila_oficial_data, isAdmin, officialOrder, fila.map((c) => c.id).join("|")]);

  async function baterRoletaOficial() {
    if (!empId) return;
    if (fila.length === 0) return toast.error("Sem corretores presentes para sortear");
    try {
      const r = await baterRoletaServerFn({ data: { empreendimento_id: empId, ids: fila.map((c) => c.id) } });
      setLocalOfficial({ empreendimento_id: empId, data: r.data, ids: r.ids });
      toast.success(r.reused
        ? `Roleta oficial já estava fixa (${r.total} corretores) — não muda até liberar ou até 06:00.`
        : `Roleta oficial fixada (${r.total} corretores) — não muda até liberar ou até 06:00.`);
      await loadEmps();
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao bater roleta");
    }
  }
  async function liberarRoletaOficial() {
    if (!empId) return;
    try {
      await liberarRoletaServerFn({ data: { empreendimento_id: empId } });
      setLocalOfficial(null);
      toast.success("Roleta liberada — será reembaralhada antes do próximo sorteio oficial.");
      await loadEmps();
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao liberar roleta");
    }
  }

  async function reativar(plantaoId: string) {
    try {
      await reativarFn({ data: { plantao_id: plantaoId } });
      toast.success("Corretor reativado");
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reativar");
    }
  }



  async function confirmarPresenca() {
    if (!minhaCorretor) return toast.error("Você não está cadastrado como corretor neste empreendimento");
    const plantao = plantoes.find((p) => p.corretor_id === minhaCorretor.id);
    if (!plantao) return toast.error("Você não tem plantão hoje aqui");
    if (!emp?.latitude || !emp.longitude) return toast.error("Empreendimento sem coordenadas cadastradas");

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const d = distMeters(pos.coords.latitude, pos.coords.longitude, emp.latitude!, emp.longitude!);
        if (d > emp.raio_metros) {
          setBusy(false);
          return toast.error(`Você está a ${Math.round(d)}m — fora do raio de ${emp.raio_metros}m.`);
        }
        const { error } = await supabase.from("plantoes").update({
          presenca_confirmada_em: new Date().toISOString(),
          presenca_lat: pos.coords.latitude,
          presenca_lng: pos.coords.longitude,
          status: "em_andamento",
        }).eq("id", plantao.id);
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success(`Presença confirmada (${Math.round(d)}m do stand)`);
        loadAll();
      },
      (err) => { setBusy(false); toast.error(err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function registrarAtendimento(e: FormEvent) {
    e.preventDefault();
    if (!atendOpen || !empId) return;
    const plantao = plantoes.find((p) => p.corretor_id === atendOpen.id);
    const { error } = await supabase.from("atendimentos").insert({
      empreendimento_id: empId,
      corretor_id: atendOpen.id,
      plantao_id: plantao?.id ?? null,
      cliente_nome: atendForm.cliente_nome,
      cliente_telefone: atendForm.cliente_telefone || null,
      cliente_email: atendForm.cliente_email || null,
      observacoes: atendForm.observacoes || null,
      criado_por: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Atendimento registrado para ${atendOpen.nome}`);
    setAtendOpen(null);
    setAtendForm({ cliente_nome: "", cliente_telefone: "", cliente_email: "", observacoes: "" });
    loadAll();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={handleSair}>
          <LogOut className="mr-1 h-4 w-4" /> Sair
        </Button>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Roleta de atendimentos</h1>
          <p className="text-sm text-muted-foreground">Distribuição justa baseada em presença e contagem semanal.</p>
        </div>
        <div className="w-64">
          <Label className="text-xs">Empreendimento</Label>
          <Select value={empId} onValueChange={setEmpId} disabled={emps.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={emps.length === 0 ? "Nenhum vinculado" : "Selecione…"} />
            </SelectTrigger>
            <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
          </Select>
          {emps.length === 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Seu usuário ainda não está vinculado a um empreendimento. Solicite à Incorporadora.
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-lg border-l-4 border-orange bg-orange/10 px-4 py-3 text-sm">
        <p className="font-semibold uppercase tracking-wider text-orange">
          A Roleta gira automaticamente conforme os atendimentos
        </p>
        <p className="mt-1 text-foreground/90">
          A ordem segue <strong>Primeiro → Segundo → Terceiro…</strong> Quando um corretor recebe
          um <strong>retorno</strong> (cliente que já é dele), ele <strong>permanece na vez</strong> —
          a roleta só avança após a finalização desse atendimento.
        </p>
      </div>

      {minhaCorretor && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Você: {minhaCorretor.nome}</div>
              <div className="text-xs text-muted-foreground">
                {plantoes.find((p) => p.corretor_id === minhaCorretor.id)?.presenca_confirmada_em
                  ? "Presença confirmada hoje ✓"
                  : plantoes.some((p) => p.corretor_id === minhaCorretor.id)
                    ? "Plantão hoje — confirme presença ao chegar"
                    : "Sem plantão hoje aqui"}
              </div>
            </div>
            <Button onClick={confirmarPresenca} disabled={busy || !plantoes.some((p) => p.corretor_id === minhaCorretor.id && !p.presenca_confirmada_em)}>
              <MapPin className="mr-1 h-4 w-4" /> Check-in
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <ArrowRight className="h-4 w-4" /> Próximo da fila
          </h2>
          {proximo ? (
            <div className="space-y-2">
              <div className="text-xl font-bold">{proximo.nome}</div>
              <div className="text-xs text-muted-foreground">{counts[proximo.id] ?? 0} atendimentos esta semana</div>
              {isAdmin && (
                <Button className="mt-3" onClick={() => setAtendOpen(proximo)}>
                  <UserCheck className="mr-1 h-4 w-4" /> Atribuir atendimento
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum corretor com presença confirmada hoje.</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fila de hoje {officialOrder && <span className="ml-2 rounded bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">OFICIAL ✓</span>}
            </h2>
            {isAdmin && (
              officialOrder ? (
                <Button size="sm" variant="outline" onClick={liberarRoletaOficial}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Liberar / Refazer
                </Button>
              ) : (
                <Button size="sm" onClick={baterRoletaOficial} className="bg-emerald-600 hover:bg-emerald-600/90 text-white">
                  <UserCheck className="mr-1 h-3.5 w-3.5" /> Bater Roleta Oficial
                </Button>
              )
            )}
          </div>
          {fila.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem presenças confirmadas.</p>
          ) : (
            <ol className="space-y-2">
              {fila.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                  <div>
                    <span className="mr-2 text-xs text-muted-foreground">#{i+1}</span>
                    <span className="font-medium">{c.nome}</span>
                  </div>
                  <Badge variant="outline">{counts[c.id] ?? 0} atend.</Badge>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {(() => {
        const nomeHouse = emp?.equipe_alfa_nome || "House";
        const nomeImob = emp?.equipe_beta_nome || "Imob";
        const stats = { alfa: 0, beta: 0 };
        corretores.forEach((c) => {
          const n = counts[c.id] ?? 0;
          if (c.equipe === "alfa") stats.alfa += n;
          else if (c.equipe === "beta") stats.beta += n;
        });
        const linhas = [
          { key: "alfa" as const, nome: nomeHouse, total: stats.alfa },
          { key: "beta" as const, nome: nomeImob, total: stats.beta },
        ].sort((a, b) => a.total - b.total);
        const proximaEquipe = linhas[0];
        return (
          <section className="mt-6 rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ordem House/Imob
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Próxima equipe a atender: <strong className="text-foreground">{proximaEquipe.nome}</strong> (menor número de atendimentos na semana)
            </p>
            <ol className="space-y-2">
              {linhas.map((l, i) => (
                <li key={l.key} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                  <div>
                    <span className="mr-2 text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{l.nome}</span>
                  </div>
                  <Badge variant="outline">{l.total} Atend.</Badge>
                </li>
              ))}
            </ol>
          </section>
        );
      })()}


      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Plantões de hoje {emp ? <span className="ml-2 normal-case text-[11px] text-muted-foreground">· período de ausência: {emp.periodo_ausencia_minutos}min</span> : null}
        </h2>
        {plantoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem plantões agendados para hoje.</p>
        ) : (
          <ul className="space-y-1.5">
            {plantoes.map((p) => {
              const c = corretores.find((x) => x.id === p.corretor_id);
              const info = presencaInfo(p.corretor_id);
              const badgeClass =
                info.status === "presente" ? "bg-emerald-600 hover:bg-emerald-600 text-white" :
                info.status === "ausente" ? "bg-red-600 hover:bg-red-600 text-white" :
                info.status === "saindo" ? "bg-amber-500 hover:bg-amber-500 text-white" :
                "";
              async function salvarHorario(campo: "hora_inicio" | "hora_fim", valor: string) {
                const v = valor.length === 5 ? `${valor}:00` : valor;
                const patch = campo === "hora_inicio" ? { hora_inicio: v } : { hora_fim: v };
                const { error } = await supabase.from("plantoes").update(patch).eq("id", p.id);
                if (error) return toast.error(error.message);
                setPlantoes((rows) => rows.map((r) => (r.id === p.id ? { ...r, ...patch } : r)));
                toast.success("Horário atualizado");
              }
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span>{c?.nome ?? "—"}</span>
                    <span className="text-muted-foreground">·</span>
                    {isAdmin ? (
                      <span className="flex items-center gap-1">
                        <Input
                          type="time"
                          defaultValue={p.hora_inicio.slice(0, 5)}
                          onBlur={(e) => e.target.value && e.target.value !== p.hora_inicio.slice(0, 5) && salvarHorario("hora_inicio", e.target.value)}
                          className="h-7 w-[92px] px-2 py-0 text-xs"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          defaultValue={p.hora_fim.slice(0, 5)}
                          onBlur={(e) => e.target.value && e.target.value !== p.hora_fim.slice(0, 5) && salvarHorario("hora_fim", e.target.value)}
                          className="h-7 w-[92px] px-2 py-0 text-xs"
                        />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{p.hora_inicio.slice(0, 5)}–{p.hora_fim.slice(0, 5)}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.presenca_confirmada_em
                      ? <Badge className={badgeClass}>{info.label}</Badge>
                      : <Badge variant="outline">aguardando</Badge>}
                    {isAdmin && info.status === "ausente" && (
                      <Button size="sm" variant="outline" onClick={() => reativar(p.id)}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reativar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>


      <Dialog open={!!atendOpen} onOpenChange={(o) => !o && setAtendOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atendimento — {atendOpen?.nome}</DialogTitle></DialogHeader>
          <form onSubmit={registrarAtendimento} className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Cliente</Label>
              <Input required value={atendForm.cliente_nome} onChange={(e) => setAtendForm((s) => ({ ...s, cliente_nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Telefone</Label>
                <Input value={atendForm.cliente_telefone} onChange={(e) => setAtendForm((s) => ({ ...s, cliente_telefone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">E-mail</Label>
                <Input type="email" value={atendForm.cliente_email} onChange={(e) => setAtendForm((s) => ({ ...s, cliente_email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observações</Label>
              <Input value={atendForm.observacoes} onChange={(e) => setAtendForm((s) => ({ ...s, observacoes: e.target.value }))} /></div>
            <DialogFooter><Button type="submit">Registrar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
