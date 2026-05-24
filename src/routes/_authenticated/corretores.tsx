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
import { Pencil, Plus, Upload, X, QrCode, Download, Share2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { habilitarCorretorAcesso } from "@/lib/corretor.functions";
import { QRCodeCanvas } from "qrcode.react";
import { SignedImg } from "@/components/signed-img";

type Corretor = {
  id: string;
  nome: string;
  creci: string | null;
  telefone: string | null;
  email: string | null;
  empreendimento_id: string;
  ordem_roleta: number;
  ativo: boolean;
  user_id: string | null;
  foto_url: string | null;
};
type Emp = { id: string; nome: string; cnpj: string | null };

export const Route = createFileRoute("/_authenticated/corretores")({
  component: CorretoresPage,
  head: () => ({ meta: [{ title: "Corretores — Roleta Corretor" }] }),
});

function CorretoresPage() {
  const { roles } = useAuth();
  const canEdit = roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));
  const [rows, setRows] = useState<Corretor[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [editing, setEditing] = useState<Partial<Corretor> | null>(null);
  const [qrAlvo, setQrAlvo] = useState<Corretor | null>(null);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [empBusca, setEmpBusca] = useState("");
  const [fotoUploading, setFotoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const habilitar = useServerFn(habilitarCorretorAcesso);

  async function load() {
    setLoading(true);
    const [{ data: cs }, { data: es }] = await Promise.all([
      supabase.from("corretores").select("*").order("ordem_roleta"),
      supabase.from("empreendimentos").select("id,nome,cnpj").eq("ativo", true).order("nome"),
    ]);
    setRows((cs as Corretor[]) ?? []);
    setEmps((es as Emp[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Sincroniza o campo de busca com o empreendimento selecionado ao abrir edição
  useEffect(() => {
    if (!editing) { setEmpBusca(""); return; }
    const e = emps.find((x) => x.id === editing.empreendimento_id);
    setEmpBusca(e ? e.nome : "");
  }, [editing?.id, emps]);

  async function uploadFoto(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem maior que 5MB");
    setFotoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("corretores").upload(path, file, { upsert: false });
      if (error) throw error;
      // Bucket privado: armazenamos a URL pública legada apenas como referência
      // do path; a leitura usa createSignedUrl. Persistir a URL pública mantém
      // compatibilidade — o helper extrai o path automaticamente.
      const { data } = supabase.storage.from("corretores").getPublicUrl(path);
      setEditing((s) => ({ ...s, foto_url: data.publicUrl }));
      toast.success("Foto enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setFotoUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.empreendimento_id) return toast.error("Selecione o empreendimento");

    // Primeiro acesso usa SENHA PADRÃO 123456 — o corretor é obrigado a
    // redefinir a senha vinculada ao próprio e-mail no primeiro login.
    const habilitarAcesso = !!editing.email && (!editing.id || !editing.user_id);

    // tenta vincular ao user_id via e-mail (caso já exista perfil)
    let user_id = editing.user_id ?? null;
    if (editing.email && !user_id) {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", editing.email).maybeSingle();
      if (prof?.id) user_id = prof.id;
    }

    const payload = {
      nome: editing.nome ?? "",
      creci: editing.creci ?? null,
      telefone: editing.telefone ?? null,
      email: editing.email ?? null,
      empreendimento_id: editing.empreendimento_id,
      ordem_roleta: editing.ordem_roleta ?? 0,
      ativo: editing.ativo ?? true,
      foto_url: editing.foto_url ?? null,
      user_id,
    };

    let corretorId = editing.id ?? null;
    if (corretorId) {
      const { error } = await supabase.from("corretores").update(payload).eq("id", corretorId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("corretores").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      corretorId = data!.id as string;
    }

    if (habilitarAcesso && corretorId && editing.email) {
      try {
        await habilitar({ data: { corretor_id: corretorId, email: editing.email } });
        toast.success("Acesso criado. Senha de primeiro acesso: 123456");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao habilitar acesso";
        toast.error(`Cadastro salvo, mas houve erro ao habilitar acesso: ${msg}`);
        setSenha(""); setSenha2("");
        setEditing(null);
        load();
        return;
      }
    }

    toast.success("Cadastro completo");
    setSenha(""); setSenha2("");
    // Recupera dados completos para o QR Code
    const { data: full } = await supabase.from("corretores").select("*").eq("id", corretorId!).single();
    setEditing(null);
    if (full) setQrAlvo(full as Corretor);
    load();
  }

  const empName = (id: string | null | undefined) =>
    id ? (emps.find((e) => e.id === id)?.nome ?? "—") : "—";


  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corretores</h1>
          <p className="text-sm text-muted-foreground">Equipe vinculada por e-mail à conta de acesso.</p>
        </div>
        {canEdit && (
          <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setSenha(""); setSenha2(""); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ ativo: true, ordem_roleta: rows.length })}>
                <Plus className="mr-1 h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editing?.id ? "Editar corretor" : "Novo corretor"}
                  <span className="rounded bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Cadastro Completo
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Insira seus dados para habilitação no ecossistema de vendas.
                </p>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                {/* Foto do corretor */}
                <Field label="Foto do corretor">
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) uploadFoto(f);
                    }}
                    className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 p-3"
                  >
                    {editing?.foto_url ? (
                      <div className="relative">
                        <SignedImg bucket="corretores" src={editing.foto_url} className="h-16 w-16 rounded-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditing((s) => ({ ...s, foto_url: null }))}
                          className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow"
                          aria-label="Remover foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                        sem foto
                      </div>
                    )}
                    <div className="flex-1 text-xs text-muted-foreground">
                      Arraste e solte aqui, cole, ou
                      <label className="ml-1 cursor-pointer text-orange underline">
                        anexar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoto(f); e.currentTarget.value = ""; }}
                        />
                      </label>
                      {fotoUploading && <span className="ml-2">enviando…</span>}
                    </div>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Field>

                <Field label="Nome"><Input required value={editing?.nome ?? ""} onChange={(e) => setEditing((s) => ({ ...s, nome: e.target.value }))} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CRECI"><Input value={editing?.creci ?? ""} onChange={(e) => setEditing((s) => ({ ...s, creci: e.target.value }))} /></Field>
                  <Field label="Telefone"><Input value={editing?.telefone ?? ""} onChange={(e) => setEditing((s) => ({ ...s, telefone: e.target.value }))} /></Field>
                </div>
                <Field label="E-mail (vincula à conta de login)"><Input type="email" value={editing?.email ?? ""} onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))} /></Field>

                {/* Empreendimento por NOME ou CNPJ */}
                <Field label="Empreendimento ou CNPJ (para vínculo ao empreendimento)">
                  <div className="relative">
                    <Input
                      list="emp-options"
                      placeholder="Digite o nome do empreendimento ou CNPJ…"
                      value={empBusca}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEmpBusca(v);
                        const term = v.trim().toLowerCase();
                        const onlyDigits = v.replace(/\D/g, "");
                        const match = emps.find((emp) => {
                          const empCnpj = (emp.cnpj ?? "").replace(/\D/g, "");
                          return (
                            emp.nome.toLowerCase() === term ||
                            (onlyDigits.length >= 11 && empCnpj && empCnpj === onlyDigits)
                          );
                        });
                        setEditing((s) => ({ ...s, empreendimento_id: match?.id ?? undefined }));
                      }}
                    />
                    <datalist id="emp-options">
                      {emps.map((e) => (
                        <option key={e.id} value={e.nome}>{e.cnpj ? `CNPJ ${e.cnpj}` : ""}</option>
                      ))}
                    </datalist>
                    {editing?.empreendimento_id ? (
                      <p className="mt-1 text-[10px] text-emerald-600">✓ vinculado a {emps.find((x) => x.id === editing.empreendimento_id)?.nome}</p>
                    ) : empBusca ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">Nenhum empreendimento corresponde ao termo. Cadastre antes em Empreendimentos.</p>
                    ) : null}
                  </div>
                </Field>

                <Field label="Ordem na roleta"><Input type="number" value={editing?.ordem_roleta ?? 0} onChange={(e) => setEditing((s) => ({ ...s, ordem_roleta: +e.target.value }))} /></Field>

                <div className="rounded-md border border-orange/30 bg-orange/5 p-3 text-xs">
                  <p className="font-bold uppercase tracking-wider text-orange">
                    Primeiro acesso do corretor
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Ao salvar, o corretor entra em <strong>ÁREA CORRETOR</strong> com o
                    e-mail informado e a senha padrão <strong>123456</strong>. No primeiro
                    login o sistema obriga ele a criar uma nova senha vinculada ao próprio e-mail.
                  </p>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setEditing(null); setSenha(""); setSenha2(""); }}
                  >
                    Fechar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>


      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum corretor.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{r.ordem_roleta}</TableCell>
                  <TableCell className="font-medium">{r.nome} {!r.ativo && <Badge variant="secondary" className="ml-1">inativo</Badge>}</TableCell>
                  <TableCell className="text-sm">{empName(r.empreendimento_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.telefone ?? "—"}<br />{r.email ?? ""}</TableCell>
                  <TableCell>{r.user_id ? <Badge>vinculado</Badge> : <Badge variant="outline">sem login</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" title="Gerar QR" onClick={() => setQrAlvo(r)}>
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <QrCorretorDialog corretor={qrAlvo} empNome={empName(qrAlvo?.empreendimento_id)} onClose={() => setQrAlvo(null)} />
    </main>
  );
}


function QrCorretorDialog({
  corretor,
  empNome,
  onClose,
}: {
  corretor: Corretor | null;
  empNome: string;
  onClose: () => void;
}) {
  if (!corretor) return null;

  const tel = (corretor.telefone ?? "").replace(/\D/g, "");
  // vCard 3.0 — ao escanear, o cliente salva o contato com WhatsApp e CRECI na nota.
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${corretor.nome}`,
    `N:${corretor.nome};;;;`,
    tel ? `TEL;TYPE=CELL:+${tel}` : "",
    corretor.email ? `EMAIL:${corretor.email}` : "",
    `ORG:${empNome}`,
    corretor.creci ? `NOTE:CRECI ${corretor.creci} — ${empNome}` : `NOTE:${empNome}`,
    "END:VCARD",
  ].filter(Boolean).join("\n");

  function baixar() {
    const canvas = document.getElementById("qr-corretor-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${corretor!.nome.replace(/\s+/g, "_")}.png`;
    a.click();
  }

  async function compartilhar() {
    const canvas = document.getElementById("qr-corretor-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `qr-${corretor!.nome}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Contato — ${corretor!.nome}`,
            text: `Contato direto: ${corretor!.nome}${corretor!.creci ? ` · CRECI ${corretor!.creci}` : ""}`,
          });
        } catch {
          /* cancelado */
        }
      } else {
        toast.message("Compartilhar não disponível neste dispositivo. Use Baixar PNG.");
      }
    }, "image/png");
  }

  return (
    <Dialog open={!!corretor} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-orange" />
            QR Code do corretor
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Envie ao cliente. Ao escanear, ele salva o contato direto com WhatsApp e CRECI.
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="rounded-md bg-white p-3 ring-1 ring-border">
            <QRCodeCanvas
              id="qr-corretor-canvas"
              value={vcard}
              size={220}
              level="M"
              includeMargin
            />
          </div>

          <div className="w-full space-y-1 text-center">
            <p className="font-display text-lg font-bold leading-tight">{corretor.nome}</p>
            {tel && (
              <p className="text-sm text-muted-foreground">
                WhatsApp: <span className="font-medium text-foreground">+{tel}</span>
              </p>
            )}
            {corretor.creci && (
              <p className="text-sm text-muted-foreground">
                CRECI: <span className="font-medium text-foreground">{corretor.creci}</span>
              </p>
            )}
          </div>

          <div className="w-full border-t border-border pt-2 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Empreendimento</p>
            <p className="text-sm font-semibold text-foreground">{empNome}</p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={baixar}>
              <Download className="mr-1 h-3.5 w-3.5" /> Baixar PNG
            </Button>
            <Button type="button" onClick={compartilhar}>
              <Share2 className="mr-1 h-3.5 w-3.5" /> Compartilhar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
