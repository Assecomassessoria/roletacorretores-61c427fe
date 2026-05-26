import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pingPresenca, varrerAusentes, reativarPresenca } from "@/lib/presenca.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, UserCheck, ArrowRight, RotateCcw } from "lucide-react";

type Emp = { id: string; nome: string; latitude: number | null; longitude: number | null; raio_metros: number; periodo_ausencia_minutos: number };
type Corretor = { id: string; nome: string; empreendimento_id: string; ordem_roleta: number; user_id: string | null; ativo: boolean };
type Plantao = { id: string; corretor_id: string; empreendimento_id: string; data: string; hora_inicio: string; hora_fim: string; status: string; presenca_confirmada_em: string | null; fora_desde: string | null; ultimo_ping_em: string | null; status_presenca: "presente" | "ausente" };


export const Route = createFileRoute("/_authenticated/roleta")({
  component: RoletaPage,
  head: () => ({ meta: [{ title: "Roleta — Roleta Corretor" }] }),
});

function todayISO() { return new Date().toISOString().slice(0, 10); }
function weekStart() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10);
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
  const isAdmin = roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));
  const [emps, setEmps] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [atendOpen, setAtendOpen] = useState<Corretor | null>(null);
  const [atendForm, setAtendForm] = useState({ cliente_nome: "", cliente_telefone: "", cliente_email: "", observacoes: "" });
  const [busy, setBusy] = useState(false);

  async function loadEmps() {
    const { data } = await supabase.from("empreendimentos").select("id,nome,latitude,longitude,raio_metros").eq("ativo", true).order("nome");
    setEmps((data as Emp[]) ?? []);
    if (data && data.length && !empId) setEmpId(data[0].id);
  }
  async function loadAll() {
    if (!empId) return;
    const wkStart = weekStart();
    const [{ data: cs }, { data: ps }, { data: ats }] = await Promise.all([
      supabase.from("corretores").select("id,nome,creci,telefone,empreendimento_id,ordem_roleta,user_id,ativo,foto_url").eq("empreendimento_id", empId).eq("ativo", true).order("ordem_roleta"),
      supabase.from("plantoes").select("*").eq("empreendimento_id", empId).eq("data", todayISO()),
      supabase.from("atendimentos").select("corretor_id,iniciado_em").eq("empreendimento_id", empId).gte("iniciado_em", `${wkStart}T00:00:00Z`),
    ]);
    setCorretores((cs as Corretor[]) ?? []);
    setPlantoes((ps as Plantao[]) ?? []);
    const map: Record<string, number> = {};
    (ats ?? []).forEach((a: any) => { map[a.corretor_id] = (map[a.corretor_id] ?? 0) + 1; });
    setCounts(map);
  }

  useEffect(() => { loadEmps(); }, []);
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [empId]);

  const emp = emps.find((e) => e.id === empId);
  const minhaCorretor = corretores.find((c) => c.user_id === user?.id);

  const fila = useMemo(() => {
    // presentes hoje
    const presentes = corretores.filter((c) => plantoes.some((p) => p.corretor_id === c.id && p.presenca_confirmada_em));
    return presentes.sort((a, b) => {
      const ca = counts[a.id] ?? 0, cb = counts[b.id] ?? 0;
      if (ca !== cb) return ca - cb;
      return a.ordem_roleta - b.ordem_roleta;
    });
  }, [corretores, plantoes, counts]);

  const proximo = fila[0];

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Roleta de atendimentos</h1>
          <p className="text-sm text-muted-foreground">Distribuição justa baseada em presença e contagem semanal.</p>
        </div>
        <div className="w-64">
          <Label className="text-xs">Empreendimento</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
          </Select>
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fila de hoje</h2>
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

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plantões de hoje</h2>
        {plantoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem plantões agendados para hoje.</p>
        ) : (
          <ul className="space-y-1.5">
            {plantoes.map((p) => {
              const c = corretores.find((x) => x.id === p.corretor_id);
              return (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{c?.nome ?? "—"} <span className="text-muted-foreground">· {p.hora_inicio.slice(0,5)}–{p.hora_fim.slice(0,5)}</span></span>
                  {p.presenca_confirmada_em ? <Badge>presente</Badge> : <Badge variant="outline">aguardando</Badge>}
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
