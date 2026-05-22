import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, MapPin } from "lucide-react";

type Emp = {
  id: string;
  nome: string;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_metros: number;
  wifi_ssid: string | null;
  ativo: boolean;
};

export const Route = createFileRoute("/_authenticated/empreendimentos")({
  component: EmpreendimentosPage,
  head: () => ({ meta: [{ title: "Empreendimentos — Roleta Corretor" }] }),
});

function EmpreendimentosPage() {
  const { roles, user } = useAuth();
  const canEdit = roles.some((r) => ["incorporadora", "gerente"].includes(r));
  const [rows, setRows] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Emp> | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("empreendimentos")
      .select("*")
      .order("nome");
    if (error) toast.error(error.message);
    setRows((data as Emp[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      nome: editing.nome ?? "",
      endereco: editing.endereco ?? null,
      latitude: editing.latitude ?? null,
      longitude: editing.longitude ?? null,
      raio_metros: editing.raio_metros ?? 100,
      wifi_ssid: editing.wifi_ssid ?? null,
      ativo: editing.ativo ?? true,
    };
    let err;
    if (editing.id) {
      ({ error: err } = await supabase.from("empreendimentos").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("empreendimentos").insert({ ...payload, criado_por: user?.id }));
    }
    if (err) return toast.error(err.message);
    toast.success("Salvo");
    setEditing(null);
    load();
  }

  async function captureCoords() {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => setEditing((e) => ({ ...e, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      (err) => toast.error(err.message),
      { enableHighAccuracy: true }
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground">Stands com geofencing e Wi-Fi de presença.</p>
        </div>
        {canEdit && (
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ raio_metros: 100, ativo: true })}>
                <Plus className="mr-1 h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Editar" : "Novo"} empreendimento</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <Field label="Nome"><Input required value={editing?.nome ?? ""} onChange={(e) => setEditing((s) => ({ ...s, nome: e.target.value }))} /></Field>
                <Field label="Endereço"><Input value={editing?.endereco ?? ""} onChange={(e) => setEditing((s) => ({ ...s, endereco: e.target.value }))} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude"><Input type="number" step="any" value={editing?.latitude ?? ""} onChange={(e) => setEditing((s) => ({ ...s, latitude: e.target.value ? +e.target.value : null }))} /></Field>
                  <Field label="Longitude"><Input type="number" step="any" value={editing?.longitude ?? ""} onChange={(e) => setEditing((s) => ({ ...s, longitude: e.target.value ? +e.target.value : null }))} /></Field>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={captureCoords}>
                  <MapPin className="mr-1 h-3.5 w-3.5" /> Capturar minha localização
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Raio (m)"><Input type="number" min={10} value={editing?.raio_metros ?? 100} onChange={(e) => setEditing((s) => ({ ...s, raio_metros: +e.target.value }))} /></Field>
                  <Field label="Wi-Fi SSID"><Input value={editing?.wifi_ssid ?? ""} onChange={(e) => setEditing((s) => ({ ...s, wifi_ssid: e.target.value }))} /></Field>
                </div>
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
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Geofence</TableHead>
              <TableHead>Wi-Fi</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum cadastro.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome} {!r.ativo && <Badge variant="secondary" className="ml-1">inativo</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.endereco ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.latitude && r.longitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)} · ${r.raio_metros}m` : "—"}</TableCell>
                <TableCell className="text-xs">{r.wifi_ssid ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
                </TableCell>
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
