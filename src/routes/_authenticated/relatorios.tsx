import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Row = {
  corretor_id: string;
  nome: string;
  creci: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  periodo: string;
};

function classificarPeriodo(hi: string): string {
  const h = parseInt(hi.slice(0, 2), 10);
  if (h < 12) return "Matutino";
  if (h < 18) return "Vespertino";
  return "Noturno";
}

function inicioSemana(d = new Date()) {
  const x = new Date(d);
  const dia = x.getDay(); // 0 dom
  const diff = dia === 0 ? -6 : 1 - dia; // segunda
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fimSemana(d = new Date()) {
  const i = inicioSemana(d);
  const f = new Date(i);
  f.setDate(f.getDate() + 6);
  f.setHours(23, 59, 59, 999);
  return f;
}
function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

function RelatoriosPage() {
  const [de, setDe] = useState(fmtDate(inicioSemana()));
  const [ate, setAte] = useState(fmtDate(fimSemana()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("plantoes")
      .select("corretor_id, data, hora_inicio, hora_fim, status, corretores(nome, creci)")
      .gte("data", de)
      .lte("data", ate)
      .in("status", ["confirmado", "concluido", "agendado"] as never[]);
    setLoading(false);
    if (error) return;
    const mapped: Row[] = (data ?? []).map((p: any) => ({
      corretor_id: p.corretor_id,
      nome: p.corretores?.nome ?? "—",
      creci: p.corretores?.creci ?? null,
      data: p.data,
      hora_inicio: p.hora_inicio,
      hora_fim: p.hora_fim,
      periodo: classificarPeriodo(p.hora_inicio),
    }));
    setRows(mapped);
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const resumo = useMemo(() => {
    const map = new Map<string, { nome: string; creci: string | null; horario: string; periodo: string; qtd: number }>();
    for (const r of rows) {
      const horario = `${r.hora_inicio.slice(0, 5)}–${r.hora_fim.slice(0, 5)}`;
      const key = `${r.corretor_id}|${horario}|${r.periodo}`;
      const cur = map.get(key);
      if (cur) cur.qtd += 1;
      else map.set(key, { nome: r.nome, creci: r.creci, horario, periodo: r.periodo, qtd: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows]);

  function exportCSV() {
    const head = ["Nome", "CRECI", "Horário", "Período", "Quantidade"];
    const lines = [head.join(";"), ...resumo.map((r) => [r.nome, r.creci ?? "", r.horario, r.periodo, r.qtd].join(";"))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_periodos_${de}_a_${ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <Button onClick={exportCSV} disabled={!resumo.length} size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        <header>
          <h1 className="font-display text-2xl font-bold text-foreground">Relatório de Períodos</h1>
          <p className="text-sm text-muted-foreground">
            Quantidade de plantões cumpridos por corretor, agrupado por horário e período do dia.
          </p>
        </header>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider">De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider">Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <Button onClick={carregar} disabled={loading}>{loading ? "Carregando…" : "Atualizar"}</Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">CRECI</th>
                <th className="px-3 py-2">Horário</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {resumo.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sem registros no intervalo.</td></tr>
              ) : resumo.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.creci ?? "—"}</td>
                  <td className="px-3 py-2">{r.horario}</td>
                  <td className="px-3 py-2">{r.periodo}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.qtd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
