import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArrowLeft, Check, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { criarCheckoutMercadoPago } from "@/lib/checkout.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/planos")({
  component: Planos,
  head: () => ({
    meta: [
      { title: "Planos — Roleta Corretor Elite 4.0" },
      { name: "description", content: "Planos profissionais: Mensal Elite, Trimestral e Anual Executivo." },
    ],
  }),
});

type Plano = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ciclo: string;
  preco_centavos: number;
  moeda: string;
  destaque: boolean;
  ordem: number;
  beneficios: unknown;
};

function formatPreco(c: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
}

function cicloLabel(ciclo: string) {
  switch (ciclo) {
    case "mensal":
      return "/mês";
    case "trimestral":
      return "/trimestre";
    case "anual":
      return "/ano";
    case "trial":
      return "ÚNICO";
    default:
      return "";
  }
}

function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const criarCheckout = useServerFn(criarCheckoutMercadoPago);

  const { data: planos, isLoading } = useQuery({
    queryKey: ["planos-publico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Plano[];
    },
  });

  const checkout = useMutation({
    mutationFn: (plano_id: string) => criarCheckout({ data: { plano_id } }),
    onSuccess: (res) => {
      if (res?.init_point) window.location.href = res.init_point;
    },
    onError: (err: Error) => toast.error(err.message ?? "Falha ao iniciar checkout"),
  });

  function handleAssinar(planoId: string) {
    if (!user) {
      toast.info("Faça login para assinar.");
      navigate({ to: "/login" });
      return;
    }
    checkout.mutate(planoId);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="h-1 bg-gradient-to-r from-orange via-gold to-orange/40" />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar à página inicial
        </Link>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy-deep)] to-navy p-6 text-navy-foreground shadow-lg sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/40">
            <Zap className="h-3 w-3" /> Profissional Roleta Digital 4.0
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Planos Profissionais e Solução de Escala
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Pagamento processado por Mercado Pago. Cancelamento a qualquer momento.
          </p>
        </section>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {(planos ?? []).map((p) => {
              const beneficios = Array.isArray(p.beneficios) ? (p.beneficios as string[]) : [];
              const isLoading = checkout.isPending && checkout.variables === p.id;
              const badge =
                p.codigo === "experiencia_90_dias"
                  ? "Plano Comercial de Entrada"
                  : p.codigo === "mensal_elite_recorrente"
                    ? "Faturamento Recorrente"
                    : p.codigo === "anual_executivo"
                      ? "Melhor Custo-Benefício"
                      : null;
              const ctaLabel =
                p.codigo === "experiencia_90_dias"
                  ? "💎 Assinar Plano Experiência 90 Dias"
                  : p.codigo === "mensal_elite_recorrente"
                    ? "Quero Assinar Mensal"
                    : p.codigo === "anual_executivo"
                      ? "👑 Assinar Plano Anual Elite"
                      : `Assinar ${p.nome}`;
              return (
                <div
                  key={p.id}
                  className={
                    "relative flex flex-col rounded-2xl p-6 shadow-md ring-1 " +
                    (p.destaque
                      ? "bg-card text-foreground ring-gold/60"
                      : "bg-card text-foreground ring-border")
                  }
                >
                  {p.destaque && (
                    <div className="absolute -top-2.5 right-4 rounded bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-foreground shadow">
                      Recomendado · Economia 33%
                    </div>
                  )}
                  {badge && (
                    <div className="mb-2 inline-block self-start rounded-full bg-orange/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/30">
                      {badge}
                    </div>
                  )}
                  <h3 className="font-display text-lg font-bold uppercase tracking-wider">{p.nome}</h3>
                  {p.descricao && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.descricao}</p>
                  )}

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-foreground">
                      {formatPreco(p.preco_centavos)}
                    </span>
                    <span className="text-xs text-muted-foreground">{cicloLabel(p.ciclo)}</span>
                  </div>

                  {beneficios.length > 0 && (
                    <ul className="mt-5 space-y-2 text-xs">
                      {beneficios.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => handleAssinar(p.id)}
                    disabled={isLoading}
                    className={
                      "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-sm transition disabled:opacity-60 " +
                      (p.destaque
                        ? "bg-gold text-gold-foreground hover:bg-gold/90"
                        : "bg-orange text-orange-foreground hover:bg-orange/90")
                    }
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {ctaLabel}
                  </button>
                </div>
              );
            })}
          </section>
        )}

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Pagamento processado por Mercado Pago · cancelamento a qualquer momento · suporte por WhatsApp.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
