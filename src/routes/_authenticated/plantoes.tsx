import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Plantao = {
  id: string;
  empreendimento_id: string;
  corretor_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  presenca_confirmada_em: string | null;
};
type Emp = {
  id: string;
  nome: string;
  horario_comercial_inicio: string | null;
  horario_comercial_fim: string | null;
};
type Corretor = { id: string; nome: string; empreendimento_id: string };

export const Route = createFileRoute("/_authenticated/plantoes")({
  component: PlantoesPage,
  head: () => ({ meta: [{ title: "Plantões — Roleta Corretor" }] }),
});

function isoWeekRange() {
  const today = new Date();
  const day = today.getDay(); // 0=dom
  const start = new Date(today); start.setDate(today.getDate() - day);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function PlantoesPage() {
  const { roles } = useAuth();
  const canEdit = roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));
  const [rows, setRows] = useState<Plantao[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [editing, setEditing] = useState<Partial<Plantao> | null>(null);
  const [loading, setLoading] = useState(true);
  const { start, end } = isoWeekRange();

  async function load() {
    setLoading(true);
    const [{ data: ps }, { data: es }, { data: cs }] = await Promise.all([
      supabase.from("plantoes").select("*").gte("data", start).lte("data", end).order("data").order("hora_inicio"),
      supabase.from("empreendimentos").select("id,nome,horario_comercial_inicio,horario_comercial_fim").eq("ativo", true).order("nome"),
      supabase.from("corretores").select("id,nome,empreendimento_id").eq("ativo", true).order("nome"),
    ]);
    setRows((ps as Plantao[]) ?? []);
    setEmps((es as Emp[]) ?? []);
    setCorretores((cs as Corretor[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.empreendimento_id || !editing.corretor_id || !editing.data || !editing.hora_inicio || !editing.hora_fim) {
      return toast.error("Preencha todos os campos");
    }
    const payload = {
      empreendimento_id: editing.empreendimento_id,
      corretor_id: editing.corretor_id,
      data: editing.data,
      hora_inicio: editing.hora_inicio,
      hora_fim: editing.hora_fim,
    };
    const { error } = await supabase.from("plantoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Plantão agendado");
    setEditing(null);
    load();
  }

  async function remover(id: string) {
    if (!confirm("Remover este plantão?")) return;
    const { error } = await supabase.from("plantoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const empName = (id: string) => emps.find((e) => e.id === id)?.nome ?? "—";
  const corName = (id: string) => corretores.find((c) => c.id === id)?.nome ?? "—";
  const filteredCor = editing?.empreendimento_id
    ? corretores.filter((c) => c.empreendimento_id === editing.empreendimento_id)
    : corretores;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plantões da semana</h1>
          <p className="text-sm text-muted-foreground">{start} a {end}</p>
        </div>
        {canEdit && (
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ data: start, hora_inicio: "09:00", hora_fim: "18:00" })}>
                <Plus className="mr-1 h-4 w-4" /> Novo plantão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agendar plantão</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <Field label="Empreendimento (Stand)">
                  <Select value={editing?.empreendimento_id ?? ""} onValueChange={(v) => {
                    const emp = emps.find((e) => e.id === v);
                    // Aplica o horário comercial do Stand automaticamente
                    setEditing((s) => ({
                      ...s,
                      empreendimento_id: v,
                      corretor_id: undefined,
                      hora_inicio: emp?.horario_comercial_inicio?.slice(0, 5) ?? s?.hora_inicio ?? "09:00",
                      hora_fim: emp?.horario_comercial_fim?.slice(0, 5) ?? s?.hora_fim ?? "18:00",
                    }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}{e.horario_comercial_inicio && e.horario_comercial_fim ? ` (${e.horario_comercial_inicio.slice(0,5)}–${e.horario_comercial_fim.slice(0,5)})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Corretor">
                  <Select value={editing?.corretor_id ?? ""} onValueChange={(v) => setEditing((s) => ({ ...s, corretor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{filteredCor.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Data"><Input type="date" value={editing?.data ?? ""} onChange={(e) => setEditing((s) => ({ ...s, data: e.target.value }))} /></Field>
                  <Field label="Início (Stand)"><Input type="time" value={editing?.hora_inicio ?? ""} onChange={(e) => setEditing((s) => ({ ...s, hora_inicio: e.target.value }))} /></Field>
                  <Field label="Fim (Stand)"><Input type="time" value={editing?.hora_fim ?? ""} onChange={(e) => setEditing((s) => ({ ...s, hora_fim: e.target.value }))} /></Field>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O horário é preenchido com o horário comercial do Stand selecionado. Ajuste manualmente se necessário.
                </p>
                <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem plantões esta semana.</TableCell></TableRow>
              : rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.data}</TableCell>
                  <TableCell className="text-sm">{p.hora_inicio.slice(0,5)}–{p.hora_fim.slice(0,5)}</TableCell>
                  <TableCell className="text-sm">{empName(p.empreendimento_id)}</TableCell>
                  <TableCell className="text-sm font-medium">{corName(p.corretor_id)}</TableCell>
                  <TableCell>
                    {p.presenca_confirmada_em ? <Badge>presente</Badge> : <Badge variant="outline">{p.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{canEdit && <Button size="sm" variant="ghost" onClick={() => remover(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
