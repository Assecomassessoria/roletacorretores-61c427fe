import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Send, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { enviarAtendimentoCRM } from "@/lib/integracoes.functions";

type Row = {
  id: string;
  status: string;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
  observacoes: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  empreendimento_id: string;
  corretor_id: string;
  empreendimentos: { nome: string; cnpj: string | null } | null;
  corretores: { nome: string } | null;
};

export const Route = createFileRoute("/_authenticated/atendimentos")({
  component: AtendimentosPage,
  head: () => ({ meta: [{ title: "Atendimentos — Roleta Corretor" }] }),
});

function AtendimentosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const enviar = useServerFn(enviarAtendimentoCRM);

  async function load() {
    setLoading(true);
    const [a, e, c] = await Promise.all([
      supabase.from("atendimentos").select("id,status,cliente_nome,cliente_email,cliente_telefone,observacoes,iniciado_em,finalizado_em,empreendimento_id,corretor_id").order("iniciado_em", { ascending: false }).limit(500),
      supabase.from("empreendimentos").select("id,nome,cnpj"),
      supabase.from("corretores").select("id,nome"),
    ]);
    if (a.error) toast.error(a.error.message);
    const empMap = new Map((e.data ?? []).map((x: any) => [x.id, { nome: x.nome, cnpj: x.cnpj }]));
    const corMap = new Map((c.data ?? []).map((x: any) => [x.id, { nome: x.nome }]));
    const merged: Row[] = (a.data ?? []).map((r: any) => ({
      ...r,
      empreendimentos: empMap.get(r.empreendimento_id) ?? null,
      corretores: corMap.get(r.corretor_id) ?? null,
    }));
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    const digits = term.replace(/\D/g, "");
    return rows.filter((r) => {
      const nome = (r.empreendimentos?.nome ?? "").toLowerCase();
      const cliente = (r.cliente_nome ?? "").toLowerCase();
      const corretor = (r.corretores?.nome ?? "").toLowerCase();
      const cnpj = (r.empreendimentos?.cnpj ?? "").replace(/\D/g, "");
      return (
        nome.includes(term) ||
        cliente.includes(term) ||
        corretor.includes(term) ||
        (digits.length > 0 && cnpj.includes(digits))
      );
    });
  }, [q, rows]);

  async function dispatch(id: string) {
    try {
      const res = await enviar({ data: { atendimento_id: id } });
      toast.success(`Enviado para ${res.enviados} integração(ões).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
          <p className="text-sm text-muted-foreground">
            Listagem por nome do cliente, nome do empreendimento ou CNPJ.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </header>

      <div className="mt-6 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, empreendimento ou CNPJ…"
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} registros</Badge>
      </div>

      <div className="mt-6 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum atendimento encontrado.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.cliente_nome}</div>
                  <div className="text-xs text-muted-foreground">{r.cliente_telefone ?? r.cliente_email ?? "—"}</div>
                </TableCell>
                <TableCell>{r.empreendimentos?.nome ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.empreendimentos?.cnpj ?? "—"}</TableCell>
                <TableCell>{r.corretores?.nome ?? "—"}</TableCell>
                <TableCell><Badge variant={r.status === "aberto" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(r.iniciado_em).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => dispatch(r.id)}>
                    <Send className="h-3 w-3" /> Enviar ao CRM
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
