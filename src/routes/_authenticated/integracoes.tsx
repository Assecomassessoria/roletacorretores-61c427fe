import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Send, Trash2, Webhook, Copy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { testarIntegracao } from "@/lib/integracoes.functions";

type Integ = {
  id: string;
  nome: string;
  provider: string;
  webhook_url: string;
  secret: string | null;
  headers: Record<string, string> | null;
  ativo: boolean;
  empreendimento_id: string | null;
};

type Emp = { id: string; nome: string };

export const Route = createFileRoute("/_authenticated/integracoes")({
  component: IntegracoesPage,
  head: () => ({ meta: [{ title: "Integrações CRM — Roleta Corretor" }] }),
});

function IntegracoesPage() {
  const { roles } = useAuth();
  const canEdit = roles.some((r) => ["incorporadora", "gerente"].includes(r));
  const [rows, setRows] = useState<Integ[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Integ> | null>(null);
  const testar = useServerFn(testarIntegracao);

  async function load() {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("integracoes_crm").select("*").order("created_at", { ascending: false }),
      supabase.from("empreendimentos").select("id,nome").order("nome"),
    ]);
    if (a.error) toast.error(a.error.message);
    setRows((a.data as Integ[]) ?? []);
    setEmps((b.data as Emp[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.nome || !editing.webhook_url) return toast.error("Nome e Webhook URL são obrigatórios.");
    try { new URL(editing.webhook_url); } catch { return toast.error("URL inválida."); }

    const payload = {
      nome: editing.nome,
      provider: editing.provider ?? "zapier",
      webhook_url: editing.webhook_url,
      secret: editing.secret || null,
      headers: editing.headers ?? {},
      ativo: editing.ativo ?? true,
      empreendimento_id: editing.empreendimento_id || null,
    };

    const { error } = editing.id
      ? await supabase.from("integracoes_crm").update(payload).eq("id", editing.id)
      : await supabase.from("integracoes_crm").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo.");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta integração?")) return;
    const { error } = await supabase.from("integracoes_crm").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida.");
    load();
  }

  async function test(id: string) {
    try {
      const r = await testar({ data: { integracao_id: id } });
      r.ok ? toast.success(`OK (HTTP ${r.status})`) : toast.error(`Falhou (HTTP ${r.status})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6" /> Integrações CRM</h1>
          <p className="text-sm text-muted-foreground">
            Envie atendimentos automaticamente para Zapier, Make, n8n, RD Station, HubSpot ou qualquer CRM via Webhook.
          </p>
        </div>
        {canEdit && (
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditing({ provider: "zapier", ativo: true, headers: {} })}>
                <Plus className="h-4 w-4" /> Nova integração
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} integração</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editing?.nome ?? ""} onChange={(e) => setEditing((s) => ({ ...s, nome: e.target.value }))} placeholder="Ex.: Zapier → RD Station" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Provider</Label>
                    <Select value={editing?.provider ?? "zapier"} onValueChange={(v) => setEditing((s) => ({ ...s, provider: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zapier">Zapier</SelectItem>
                        <SelectItem value="make">Make (Integromat)</SelectItem>
                        <SelectItem value="n8n">n8n</SelectItem>
                        <SelectItem value="custom">CRM customizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Empreendimento (opcional)</Label>
                    <Select value={editing?.empreendimento_id ?? "all"} onValueChange={(v) => setEditing((s) => ({ ...s, empreendimento_id: v === "all" ? null : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input value={editing?.webhook_url ?? ""} onChange={(e) => setEditing((s) => ({ ...s, webhook_url: e.target.value }))} placeholder="https://hooks.zapier.com/hooks/catch/…" />
                </div>
                <div>
                  <Label>Secret (opcional, HMAC SHA-256)</Label>
                  <Input value={editing?.secret ?? ""} onChange={(e) => setEditing((s) => ({ ...s, secret: e.target.value }))} placeholder="Chave para assinatura X-Roleta-Signature" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ativo" checked={editing?.ativo ?? true} onCheckedChange={(v) => setEditing((s) => ({ ...s, ativo: !!v }))} />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="mt-8 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma integração configurada.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.nome}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[280px]">{r.webhook_url}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{r.provider}</Badge></TableCell>
                <TableCell className="text-sm">{emps.find((e) => e.id === r.empreendimento_id)?.nome ?? <span className="text-muted-foreground">Todos</span>}</TableCell>
                <TableCell>{r.ativo ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => test(r.id)}><Send className="h-3 w-3" /> Testar</Button>
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3 w-3" /></Button>}
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Como integrar com Zapier / Make / CRM</h2>

        <Step n={1} title="No Zapier ou Make, crie um novo Zap/Cenário">
          Escolha o trigger <strong>Webhooks by Zapier → Catch Hook</strong> (Zapier) ou módulo <strong>Webhooks → Custom Webhook</strong> (Make). Copie a URL gerada.
        </Step>
        <Step n={2} title="Cadastre a URL aqui">
          Clique em <em>Nova integração</em>, cole a URL no campo <strong>Webhook URL</strong>, escolha o provider e (opcional) restrinja a um empreendimento.
        </Step>
        <Step n={3} title="Teste o envio">
          Clique em <strong>Testar</strong>. Um payload de exemplo será enviado e o Zap/Cenário ficará pronto para mapear os campos.
        </Step>
        <Step n={4} title="Mapeie campos no destino (CRM)">
          Conecte a próxima etapa ao seu CRM (RD Station, HubSpot, Pipedrive, Bitrix24, etc.) e use os campos: <code>atendimento.cliente_nome</code>, <code>cliente_telefone</code>, <code>cliente_email</code>, <code>empreendimento.nome</code>, <code>empreendimento.cnpj</code>, <code>corretor.nome</code>, <code>status</code>.
        </Step>
        <Step n={5} title="Segurança (opcional, recomendado)">
          Defina um <strong>Secret</strong>. Cada chamada incluirá o header <code>X-Roleta-Signature</code> com o HMAC-SHA256 do corpo. Valide no destino para evitar requisições falsas.
        </Step>
        <Step n={6} title="Exemplo: integração com CV CRM">
          Se você utiliza o CV CRM, abaixo está um exemplo de como enviar um lead usando o payload recebido pelo webhook:
        </Step>

        <div className="rounded-md border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exemplo CV CRM (Node.js)</span>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => { navigator.clipboard.writeText(CV_CRM_SAMPLE); toast.success("Copiado."); }}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <Textarea readOnly value={CV_CRM_SAMPLE} className="mt-2 font-mono text-xs h-56" />
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exemplo de payload</span>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => { navigator.clipboard.writeText(SAMPLE); toast.success("Copiado."); }}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <Textarea readOnly value={SAMPLE} className="mt-2 font-mono text-xs h-56" />
        </div>
      </section>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{n}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

const SAMPLE = `{
  "evento": "atendimento.enviado",
  "origem": "roleta-corretor",
  "timestamp": "2026-05-23T12:00:00.000Z",
  "atendimento": {
    "id": "uuid",
    "status": "aberto",
    "cliente_nome": "Maria Souza",
    "cliente_telefone": "+55 11 98888-7777",
    "cliente_email": "maria@exemplo.com",
    "observacoes": null,
    "iniciado_em": "2026-05-23T12:00:00Z",
    "empreendimentos": { "nome": "Residencial Aurora", "cnpj": "12.345.678/0001-90" },
    "corretores": { "nome": "João Silva", "telefone": "+55 11 97777-6666", "creci": "12345-F" }
  }
}`;
