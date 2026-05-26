import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NavActions } from "@/components/nav-actions";
import { ArrowLeft, Check, Loader2, Zap } from "lucide-react";
import { useAssinatura } from "@/lib/use-assinatura";
import { useAuth } from "@/lib/auth";
import { criarCheckoutPlano } from "@/lib/checkout.functions";

export const Route = createFileRoute("/planos")({
  component: Planos,
  head: () => ({
    meta: [
      { title: "Planos — Roleta Corretor Elite 4.0" },
      {
        name: "description",
        content:
          "Planos profissionais e solução de escala: 30 Teste Elite, Experiência 7 dias, Mensal Elite e Anual Executivo.",
      },
    ],
    scripts: [
      {
        src: "https://www.mercadopago.com/v2/security.js",
        view: "checkout",
        output: "deviceId",
      } as never,
    ],
  }),
});

const PLANOS = [
  {
    codigo: "trial_30d",
    nome: "Plano 30 Teste Elite",
    cor: "white" as const,
    badge: "Trial qualificado · Pagamento único na adesão",
    preco: "R$ 79,90",
    sub: "/30 dias",
    promo: "Renovação assistida no 25º dia via Lorenza Messenger",
    features: [
      "Cadastro ilimitado de corretores",
      "Dados e relatórios mensais",
      "Validação de presença para corretores",
      "Roleta automatizada por escala",
      "Auditoria e relatórios para incorporadora",
      "100% dos recursos liberados",
      "Suporte por WhatsApp prioritário",
    ],
    cta: "Assinar 30 dias experiência",
  },
  {
    codigo: "experiencia_90_dias",
    nome: "Experiência 90 dias",
    cor: "navy" as const,
    badge: "Cadastro de demonstração / experiência",
    preco: "R$ 179,90",
    sub: "ÚNICO",
    promo: "59,90/Mês - 90 dias de uso completo",
    features: [
      "Acesso à gestão operacional completa",
      "Validação de presença para corretores",
      "Roleta automatizada por escala",
      "Auditoria e relatórios para incorporadora",
    ],
    cta: "Assinar plano experiência (90 dias)",
  },
  {
    codigo: "mensal_elite_recorrente",
    nome: "Plano Mensal Elite",
    cor: "white" as const,
    badge: "Profissional · Cobrança mensal",
    preco: "R$ 169,90",
    sub: "/mês",
    features: [
      "Cadastro ilimitado de corretores",
      "Dados &amp; relatórios mensais",
      "Validação de presença para corretores",
      "Roleta automatizada por escala",
      "Auditoria e relatórios para incorporadora",
      "100% dos recursos liberados",
      "Suporte por WhatsApp prioritário",
    ],
    cta: "Assinar plano mensal",
  },
  {
    codigo: "anual_executivo",
    nome: "Plano Anual Executivo",
    cor: "gold" as const,
    badge: "Recomendado · Maior economia",
    preco: "R$ 134,90",
    sub: "/Cobrança Anual/R$ 1.618,80",
    features: [
      "Todos os benefícios do mensal",
      "Atendimento de inauguração inclusivo",
      "Relatório executivo + área para diretoria",
      "Customização de marca da incorporadora",
    ],
    cta: "Assinar plano anual elite",
  },
];

function Planos() {
  const assinatura = useAssinatura();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(criarCheckoutPlano);
  const [busy, setBusy] = useState<string | null>(null);

  async function assinar(codigo: string) {
    if (authLoading) return;
    if (!session) {
      // Memoriza o plano e manda para o cadastro da incorporadora
      try {
        sessionStorage.setItem("plano_pendente", codigo);
      } catch {}
      toast.info("Crie sua conta de incorporadora para assinar o plano.");
      navigate({ to: "/setup" });
      return;
    }
    setBusy(codigo);
    try {
      const res = await checkout({ data: { plano_codigo: codigo } });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Não foi possível abrir o checkout.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao iniciar checkout";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  // Assinante já ativo (sem janela de renovação) não precisa ver planos.
  if (!assinatura.loading && assinatura.status === "ativa") {
    return <Navigate to="/app" />;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="h-1 bg-gradient-to-r from-orange via-gold to-orange/40" />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar à página inicial
        </Link>

        {/* hero */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy-deep)] to-navy p-6 text-navy-foreground shadow-lg sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/40">
                <Zap className="h-3 w-3" /> Profissional Roleta Digital 4.0
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-wider sm:text-3xl">
                Planos Profissionais e Solução de Escala
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Escolha o plano ideal para o momento atual do seu negócio. Toda a infraestrutura —
                autoatendimento,roleta, presença, cron semanal, e-mails — entregue sob medida para incorporadoras e
                stands de venda.
              </p>
              <ul className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/80">
                <li className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">100% web · sem instalação</li>
                <li className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Suporte humano</li>
                <li className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                  Relatórios semanais por e-mail
                </li>
              </ul>
            </div>
            <Zap className="hidden h-16 w-16 text-orange/30 sm:block" />
          </div>
        </section>

        {/* cards */}
        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANOS.map((p) => (
            <div
              key={p.nome}
              className={
                "relative flex flex-col rounded-2xl p-6 shadow-md ring-1 " +
                (p.cor === "navy"
                  ? "bg-[var(--navy-deep)] text-navy-foreground ring-orange/30"
                  : p.cor === "gold"
                    ? "bg-card text-foreground ring-gold/40"
                    : "bg-card text-foreground ring-border")
              }
            >
              <div
                className={
                  "mb-2 inline-block self-start rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest " +
                  (p.cor === "navy"
                    ? "bg-orange text-orange-foreground"
                    : p.cor === "gold"
                      ? "bg-gold text-gold-foreground"
                      : "bg-secondary text-secondary-foreground")
                }
              >
                {p.badge}
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider">{p.nome}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className={
                    "font-display text-3xl font-bold " + (p.cor === "navy" ? "text-orange" : "text-foreground")
                  }
                >
                  {p.preco}
                </span>
                <span className="text-xs text-muted-foreground">{p.sub}</span>
              </div>
              {p.promo && <div className="mt-2 text-xs font-semibold text-orange">{p.promo}</div>}

              <ul className="mt-5 space-y-2 text-xs">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={"mt-0.5 h-3.5 w-3.5 flex-none " + (p.cor === "navy" ? "text-orange" : "text-success")}
                    />
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>

              <button
                onClick={() => assinar(p.codigo)}
                disabled={busy === p.codigo}
                className={
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-sm transition disabled:opacity-60 " +
                  (p.cor === "navy"
                    ? "bg-orange text-orange-foreground hover:bg-orange/90"
                    : p.cor === "gold"
                      ? "bg-gold text-gold-foreground hover:bg-gold/90"
                      : "bg-[var(--navy-deep)] text-navy-foreground hover:bg-navy")
                }
              >
                {busy === p.codigo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {p.cta}
              </button>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Pagamento processado por Mercado Pago · cancelamento a qualquer momento · suporte por WhatsApp.
        </p>

        <NavActions />
      </main>

      <SiteFooter />
    </div>
  );
}
