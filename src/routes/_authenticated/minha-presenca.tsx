import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/minha-presenca")({
  component: MinhaPresencaPage,
  head: () => ({ meta: [{ title: "Minha Presença — Roleta Corretor" }] }),
});

function todayISO() {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

type Plantao = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  status_presenca: string;
  presenca_confirmada_em: string | null;
  fora_desde: string | null;
  ultimo_ping_em: string | null;
};

function MinhaPresencaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [empNome, setEmpNome] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase
        .from("corretores")
        .select("id, empreendimento_id, empreendimentos(nome)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!c) {
        setLoading(false);
        return;
      }
      setEmpNome((c as any).empreendimentos?.nome ?? "");
      const { data: ps } = await supabase
        .from("plantoes")
        .select("id,data,hora_inicio,hora_fim,status,status_presenca,presenca_confirmada_em,fora_desde,ultimo_ping_em")
        .eq("corretor_id", c.id)
        .eq("data", todayISO())
        .order("hora_inicio");
      setPlantoes((ps as Plantao[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold">Minha Presença Hoje</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        {empNome && ` — ${empNome}`}
      </p>

      <section className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && plantoes.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Você não tem plantão agendado para hoje.
            <div className="mt-3">
              <Link to="/roleta" className="text-orange hover:underline">Ir para a Roleta</Link>
            </div>
          </div>
        )}
        {plantoes.map((p) => {
          const confirmado = !!p.presenca_confirmada_em;
          return (
            <article key={p.id} className="rounded-lg border border-border bg-card p-5">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Plantão {p.hora_inicio?.slice(0, 5)} — {p.hora_fim?.slice(0, 5)}
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {p.status}</p>
                </div>
                {confirmado ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Presente
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                    <XCircle className="h-4 w-4" /> Sem check-in
                  </span>
                )}
              </header>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Confirmou presença em</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {confirmado
                      ? new Date(p.presenca_confirmada_em!).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Último ping</dt>
                  <dd className="mt-1 font-medium">
                    {p.ultimo_ping_em ? new Date(p.ultimo_ping_em).toLocaleTimeString("pt-BR") : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status de presença</dt>
                  <dd className="mt-1 font-medium capitalize">{p.status_presenca}</dd>
                </div>
              </dl>

              {!confirmado && (
                <div className="mt-4">
                  <Link to="/roleta" className="text-sm font-medium text-orange hover:underline">
                    Ir para a Roleta para confirmar presença →
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
