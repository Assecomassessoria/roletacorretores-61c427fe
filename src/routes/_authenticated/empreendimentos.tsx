import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, MapPin, Wifi, QrCode, KeyRound, Navigation, UploadCloud, Image as ImageIcon, Palette, X } from "lucide-react";
import { SignedImg } from "@/components/signed-img";
import { listEmpreendimentosAdmin } from "@/lib/empreendimentos-admin.functions";

type Metodo = "geofence" | "wifi" | "qrcode" | "pin";

type Emp = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_metros: number;
  wifi_ssid: string | null;
  ativo: boolean;
  metodos_presenca: Metodo[];
  pin_intervalo_min: number;
  qrcode_token: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_destaque: string | null;
};

const METODOS: { key: Metodo; label: string; icon: any; desc: string }[] = [
  { key: "geofence", label: "Geofence (GPS)", icon: Navigation, desc: "Valida pela localização dentro do raio." },
  { key: "wifi", label: "Wi-Fi do stand", icon: Wifi, desc: "Confirma presença pelo SSID conectado." },
  { key: "qrcode", label: "QR Code", icon: QrCode, desc: "Leitura do QR físico no stand." },
  { key: "pin", label: "PIN rotativo", icon: KeyRound, desc: "Código exibido no stand a cada N minutos." },
];

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
  const listAdmin = useServerFn(listEmpreendimentosAdmin);

  async function load() {
    setLoading(true);
    try {
      const { rows } = await listAdmin();
      setRows((rows as Emp[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleMetodo(m: Metodo) {
    setEditing((s) => {
      const cur = new Set<Metodo>((s?.metodos_presenca ?? []) as Metodo[]);
      cur.has(m) ? cur.delete(m) : cur.add(m);
      return { ...s, metodos_presenca: Array.from(cur) };
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const metodos = (editing.metodos_presenca ?? []) as Metodo[];
    if (metodos.length === 0) return toast.error("Selecione ao menos 1 método de validação.");
    if (metodos.includes("wifi") && !editing.wifi_ssid) return toast.error("Informe o SSID do Wi-Fi.");
    if (metodos.includes("geofence") && (editing.latitude == null || editing.longitude == null))
      return toast.error("Capture/informe latitude e longitude para Geofence.");

    const payload = {
      nome: editing.nome ?? "",
      cnpj: editing.cnpj ?? null,
      endereco: editing.endereco ?? null,
      latitude: editing.latitude ?? null,
      longitude: editing.longitude ?? null,
      raio_metros: editing.raio_metros ?? 100,
      wifi_ssid: editing.wifi_ssid ?? null,
      ativo: editing.ativo ?? true,
      metodos_presenca: metodos,
      pin_intervalo_min: editing.pin_intervalo_min ?? 5,
      qrcode_token: editing.qrcode_token ?? null,
      logo_url: editing.logo_url ?? null,
      cor_primaria: editing.cor_primaria ?? null,
      cor_secundaria: editing.cor_secundaria ?? null,
      cor_destaque: editing.cor_destaque ?? null,
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

  function genQrToken() {
    const t = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    setEditing((s) => ({ ...s, qrcode_token: t }));
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem (PNG, JPG ou SVG)");
    if (file.size > 4 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 4MB");
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${editing?.id ?? "novo"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("empreendimento-brand").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("empreendimento-brand").getPublicUrl(path);
    setEditing((s) => ({ ...s, logo_url: data.publicUrl }));
    toast.success("Logo enviado");
  }

  function onDropLogo(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) uploadLogo(f);
  }

  const metodos = (editing?.metodos_presenca ?? ["geofence"]) as Metodo[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground">
            Stands com validação de presença: Geofence, Wi-Fi, QR Code e PIN rotativo.
          </p>
        </div>
        {canEdit && (
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ raio_metros: 100, ativo: true, metodos_presenca: ["geofence"], pin_intervalo_min: 5 })}>
                <Plus className="mr-1 h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Editar" : "Novo"} empreendimento</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome"><Input required value={editing?.nome ?? ""} onChange={(e) => setEditing((s) => ({ ...s, nome: e.target.value }))} /></Field>
                  <Field label="CNPJ (usado para vincular corretores)"><Input placeholder="00.000.000/0001-00" value={editing?.cnpj ?? ""} onChange={(e) => setEditing((s) => ({ ...s, cnpj: e.target.value }))} /></Field>
                </div>
                <Field label="Endereço"><Input value={editing?.endereco ?? ""} onChange={(e) => setEditing((s) => ({ ...s, endereco: e.target.value }))} /></Field>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Métodos de validação de presença
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    O gestor pode optar por 1 ou mais formas. O corretor precisará passar em <strong>todas</strong> as selecionadas.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {METODOS.map((m) => {
                      const Icon = m.icon;
                      const checked = metodos.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 transition ${
                            checked ? "border-orange/60 bg-orange/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleMetodo(m.key)} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="h-3.5 w-3.5 text-orange" /> {m.label}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {metodos.includes("geofence") && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geofence</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude"><Input type="number" step="any" value={editing?.latitude ?? ""} onChange={(e) => setEditing((s) => ({ ...s, latitude: e.target.value ? +e.target.value : null }))} /></Field>
                      <Field label="Longitude"><Input type="number" step="any" value={editing?.longitude ?? ""} onChange={(e) => setEditing((s) => ({ ...s, longitude: e.target.value ? +e.target.value : null }))} /></Field>
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[100px]">
                        <Field label="Raio (m)"><Input type="number" min={10} value={editing?.raio_metros ?? 100} onChange={(e) => setEditing((s) => ({ ...s, raio_metros: +e.target.value }))} /></Field>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={captureCoords}>
                        <MapPin className="mr-1 h-3.5 w-3.5" /> Capturar localização
                      </Button>
                    </div>
                  </div>
                )}

                {metodos.includes("wifi") && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wi-Fi</div>
                    <Field label="SSID da rede do stand"><Input value={editing?.wifi_ssid ?? ""} onChange={(e) => setEditing((s) => ({ ...s, wifi_ssid: e.target.value }))} placeholder="ex: STAND-EMPREENDIMENTO" /></Field>
                  </div>
                )}

                {metodos.includes("qrcode") && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QR Code</div>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[160px]">
                        <Field label="Token (impresso no QR físico)"><Input value={editing?.qrcode_token ?? ""} onChange={(e) => setEditing((s) => ({ ...s, qrcode_token: e.target.value }))} placeholder="token-secreto" /></Field>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={genQrToken}>
                        <QrCode className="mr-1 h-3.5 w-3.5" /> Gerar
                      </Button>
                    </div>
                  </div>
                )}

                {metodos.includes("pin") && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN rotativo</div>
                    <Field label="Intervalo de troca (minutos)">
                      <Input type="number" min={1} max={60} value={editing?.pin_intervalo_min ?? 5} onChange={(e) => setEditing((s) => ({ ...s, pin_intervalo_min: +e.target.value }))} />
                    </Field>
                    <p className="mt-1 text-[11px] text-muted-foreground">PIN é exibido no painel do stand e renovado a cada N minutos.</p>
                  </div>
                )}

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Palette className="h-3.5 w-3.5" /> Identidade visual do empreendimento
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Personalize a roleta com a marca do empreendimento: logo e paleta de cores.
                  </p>

                  <div>
                    <Label className="text-xs">Logo</Label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onDropLogo}
                      className="mt-1.5 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 px-4 py-5 text-center transition hover:border-orange/50 hover:bg-orange/5"
                    >
                      {editing?.logo_url ? (
                        <div className="flex items-center gap-3">
                          <SignedImg
                            bucket="empreendimento-brand"
                            src={editing.logo_url}
                            alt="Logo"
                            className="h-16 w-16 rounded-md border border-border object-contain bg-white p-1"
                          />
                          <div className="text-left">
                            <div className="text-xs text-muted-foreground">Logo atual</div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => setEditing((s) => ({ ...s, logo_url: null }))}
                            >
                              <X className="mr-1 h-3 w-3" /> Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                      <label className="cursor-pointer text-xs text-foreground hover:text-orange">
                        <UploadCloud className="mr-1 inline h-3.5 w-3.5" />
                        Arraste e solte ou <span className="font-semibold underline">clique para enviar</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                        />
                      </label>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG ou WEBP — até 4MB</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ColorField
                      label="Cor primária"
                      value={editing?.cor_primaria ?? ""}
                      onChange={(v) => setEditing((s) => ({ ...s, cor_primaria: v }))}
                    />
                    <ColorField
                      label="Cor secundária"
                      value={editing?.cor_secundaria ?? ""}
                      onChange={(v) => setEditing((s) => ({ ...s, cor_secundaria: v }))}
                    />
                    <ColorField
                      label="Cor de destaque"
                      value={editing?.cor_destaque ?? ""}
                      onChange={(v) => setEditing((s) => ({ ...s, cor_destaque: v }))}
                    />
                  </div>

                  {(editing?.logo_url || editing?.cor_primaria || editing?.cor_secundaria || editing?.cor_destaque) && (
                    <div
                      className="mt-1 flex items-center gap-3 overflow-hidden rounded-md border border-border p-3"
                      style={{
                        background: editing?.cor_primaria
                          ? `linear-gradient(135deg, ${editing.cor_primaria}, ${editing.cor_secundaria ?? editing.cor_primaria})`
                          : undefined,
                      }}
                    >
                      {editing?.logo_url && (
                        <SignedImg bucket="empreendimento-brand" src={editing.logo_url} className="h-10 w-10 rounded bg-white object-contain p-1" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white drop-shadow">
                          {editing?.nome || "Pré-visualização"}
                        </div>
                        <div
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: editing?.cor_destaque ?? "#fff",
                            color: editing?.cor_primaria ?? "#000",
                          }}
                        >
                          Roleta ao vivo
                        </div>
                      </div>
                    </div>
                  )}
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
              <TableHead>Validações</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhum cadastro.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome} {!r.ativo && <Badge variant="secondary" className="ml-1">inativo</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.endereco ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(r.metodos_presenca ?? []).map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] uppercase">{m}</Badge>
                    ))}
                    {(!r.metodos_presenca || r.metodos_presenca.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const v = value || "#000000";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
        />
        <Input
          placeholder="#FF6A00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}
