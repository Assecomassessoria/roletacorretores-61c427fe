import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listarEscalaSemanal, inscreverEscala } from "@/lib/escala.functions";
import { listarMeusEmpreendimentos } from "@/lib/meus-empreendimentos.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, UserCheck, UserMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/minha-escala")({
  component: MinhaEscalaPage,
  head: () => ({ meta: [{ title: "Minha Escala — Roleta Corretor" }] }),
});

type CorretorSlot = {
  slot_id: string;
  id: string;
  nome: string;
  creci: string | null;
  equipe?: string | null;
  periodos: string[];
};

type Item = {
  data: string;
  data_br: string;
  dia_semana: string;
  corretores: CorretorSlot[];
};

type EscalaEquipe = { equipe: "alfa" | "beta"; equipe_nome: string; itens: Item[] };

function rotuloPeriodo(periodos: string[] | undefined) {
  const p = periodos ?? [];
  const manha = p.includes("manha");
  const tarde = p.includes("tarde");
  if (manha && tarde) return "Integral";
  if (manha) return "Manhã";
  if (tarde) return "Tarde";
  return "—";
}



function MinhaEscalaPage() {
  const { user } = useAuth();
  const fnListar = useServerFn(listarEscalaSemanal);
  const fnInscrever = useServerFn(inscreverEscala);
  const fnMeusEmps = useServerFn(listarMeusEmpreendimentos);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [empNome, setEmpNome] = useState<string>("");
  const [meuCorretorId, setMeuCorretorId] = useState<string | null>(null);
  const [meuNome, setMeuNome] = useState<string>("");
  const [minhaEquipe, setMinhaEquipe] = useState<"alfa" | "beta" | null>(null);
  const [escala, setEscala] = useState<EscalaEquipe[]>([]);

  const recarregar = useCallback(async (id: string) => {
    const r = await fnListar({ data: { empreendimento_id: id } });
    setEscala(r.escala as EscalaEquipe[]);
  }, [fnListar]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { empreendimentos } = await fnMeusEmps();
        const emp = empreendimentos?.[0];
        if (!emp) {
          setLoading(false);
          return;
        }
        setEmpId(emp.id);
        setEmpNome(emp.nome);
        const { data: c } = await supabase
          .from("corretores")
          .select("id,nome,equipe")
          .eq("user_id", user.id)
          .eq("empreendimento_id", emp.id)
          .maybeSingle();
        if (c) {
          setMeuCorretorId(c.id);
          setMeuNome(c.nome);
          const eq = (c as any).equipe;
          if (eq === "alfa" || eq === "beta") setMinhaEquipe(eq);
        }
        await recarregar(emp.id);

      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, fnMeusEmps, recarregar]);

  async function inscrever(equipe: "alfa" | "beta", data: string, periodos: ("manha" | "tarde")[]) {
    if (!empId || !meuNome) return;
    setBusy(`${equipe}-${data}`);
    try {
      await fnInscrever({
        data: { empreendimento_id: empId, equipe, nome: meuNome, data, periodos },
      });
      toast.success("Você foi inscrito nesse dia");
      await recarregar(empId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao inscrever");
    } finally {
      setBusy(null);
    }
  }

  async function liberar(slotId: string) {
    if (!empId) return;
    setBusy(slotId);
    try {
      const { error } = await supabase.from("escala_semanal").update({ corretor_id: null }).eq("id", slotId);
      if (error) throw error;
      toast.success("Dia liberado");
      await recarregar(empId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Carregando…</main>;
  if (!empId || !meuCorretorId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Seu usuário não está vinculado a um empreendimento ou cadastro de corretor.</p>
        <Link to="/app" className="mt-4 inline-block text-sm text-orange hover:underline">← Voltar ao painel</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Minha Escala</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana corrente — {empNome}. Você pode preencher dias vazios ou liberar os seus.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {escala.map((eq) => (
          <section key={eq.equipe} className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-orange">{eq.equipe_nome ?? `Equipe ${eq.equipe.toUpperCase()}`}</h2>
            <ul className="mt-3 divide-y divide-border">
              {eq.itens.map((it) => {
                const meuSlot = it.corretores.find((c) => c.id === meuCorretorId);
                const jaInscrito = !!meuSlot;
                const podeAgir = (minhaEquipe ? eq.equipe === minhaEquipe : true) && !jaInscrito;
                const key = `${eq.equipe}-${it.data}`;
                return (
                  <li key={key} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {it.dia_semana} <span className="text-muted-foreground">· {it.data_br}</span>
                      </p>
                      {it.corretores.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Vago</p>
                      ) : (
                        <ul className="mt-1 space-y-0.5">
                          {it.corretores.map((c) => (
                            <li key={c.slot_id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">
                                {c.nome}
                                {c.creci ? ` · ${c.creci}` : ""}
                                {c.id === meuCorretorId ? " (você)" : ""}
                              </span>
                              {c.id === meuCorretorId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  disabled={busy === c.slot_id}
                                  onClick={() => liberar(c.slot_id)}
                                >
                                  <UserMinus className="mr-1 h-3 w-3" /> Liberar
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {podeAgir && (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={busy === key} onClick={() => inscrever(eq.equipe, it.data, ["manha", "tarde"])}>
                          Integral
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === key} onClick={() => inscrever(eq.equipe, it.data, ["manha"])}>
                          Manhã
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === key} onClick={() => inscrever(eq.equipe, it.data, ["tarde"])}>
                          Tarde
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
              {eq.itens.length === 0 && (
                <li className="py-3 text-xs text-muted-foreground">Sem dias úteis nesta semana.</li>
              )}


            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
