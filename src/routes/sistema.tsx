import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NavActions } from "@/components/nav-actions";
import {
  ArrowRight,
  ScanLine,
  User,
  Clock,
  BellRing,
  ShieldCheck,
  Building2,
  Tag,
} from "lucide-react";

const URL = "https://roletacorretor.simuladorcorretorelite.com.br/sistema";

export const Route = createFileRoute("/sistema")({
  component: SistemaPage,
  head: () => ({
    meta: [
      { title: "O Sistema e as Funcionalidades — Roleta Corretor 4.0" },
      {
        name: "description",
        content:
          "Conheça a estrutura completa do Ecossistema Elite 4.0: Totem do Cliente, Área do Corretor, Plantão, Recepção & Triagem, Gerência e Setup da Incorporadora.",
      },
      { property: "og:title", content: "O Sistema e as Funcionalidades — Elite 4.0" },
      {
        property: "og:description",
        content:
          "Estrutura completa do ecossistema: das telas do cliente ao painel da incorporadora.",
      },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});

type Area = {
  label: string;
  to: string;
  icon: typeof ScanLine;
  desc: string;
  tone: "orange" | "default" | "gold";
};

const AREAS: Area[] = [
  {
    label: "Totem do Cliente",
    to: "/totem",
    icon: ScanLine,
    desc: "Auto-atendimento na recepção via QR Code. O visitante se identifica e entra na fila em segundos.",
    tone: "orange",
  },
  {
    label: "Área do Corretor",
    to: "/corretor",
    icon: User,
    desc: "Painel individual com fila, atendimentos recebidos e confirmação de presença no plantão.",
    tone: "orange",
  },
  {
    label: "Plantão / Presença",
    to: "/plantao",
    icon: Clock,
    desc: "Escala digital, confirmação de presença e visão pública de quem está no stand agora.",
    tone: "orange",
  },
  {
    label: "Recepção & Triagem",
    to: "/atendimentos",
    icon: BellRing,
    desc: "Mesa de triagem inteligente: encaminha o lead certo para o corretor da vez (fila justa).",
    tone: "orange",
  },
  {
    label: "Gerência / Coordenação",
    to: "/gerencia",
    icon: ShieldCheck,
    desc: "Visão da equipe, métricas de plantão, atendimentos da semana e governança do stand.",
    tone: "default",
  },
  {
    label: "Incorporadora (Setup)",
    to: "/setup",
    icon: Building2,
    desc: "Cadastro de empreendimentos, corretores, integrações e configurações da operação.",
    tone: "default",
  },
];

export function SistemaPage() {
  return (
    <div className="min-h-screen bg-navy text-cream">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-orange/20">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 30%, hsl(var(--orange) / 0.35), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-orange">
            Estrutura do Ecossistema
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-cream sm:text-5xl">
            O <span className="text-orange">Sistema</span> e suas funcionalidades
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-cream/80">
            Cada engrenagem do Ecossistema Elite 4.0 — da tela do cliente ao painel da
            incorporadora. Clique em uma área para explorar.
          </p>
        </div>
      </section>

      {/* GRID DE ÁREAS */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group flex flex-col gap-3 rounded-2xl border border-cream/10 bg-navy-deep/60 p-6 shadow-lg transition hover:-translate-y-1 hover:border-orange/60 hover:shadow-orange/20"
              >
                <span
                  className={
                    "inline-flex h-11 w-11 items-center justify-center rounded-full " +
                    (a.tone === "orange"
                      ? "bg-orange text-orange-foreground"
                      : a.tone === "gold"
                        ? "bg-gold text-gold-foreground"
                        : "bg-white/10 text-cream")
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h2
                  className={
                    "font-display text-xl font-bold " +
                    (a.label === "Área do Corretor"
                      ? "text-[#0a1e3f]"
                      : "text-cream")
                  }
                >
                  {a.label}
                </h2>
                <p className="text-sm leading-relaxed text-cream/75">{a.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-orange opacity-80 group-hover:opacity-100">
                  Acessar <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA PLANOS */}
      <section className="border-t border-orange/20 bg-navy-deep/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-12 text-center">
          <h2 className="font-display text-2xl font-bold text-cream sm:text-3xl">
            Pronto para colocar o Ecossistema no seu stand?
          </h2>
          <p className="max-w-2xl text-sm text-cream/75">
            Veja os planos, condições e ative a operação completa.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/planos"
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gold-foreground shadow-lg shadow-gold/30 transition hover:brightness-110"
            >
              <Tag className="h-3.5 w-3.5" /> Ver Planos & Assinar
            </Link>
            <Link
              to="/apresentacao"
              className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-cream/90 transition hover:border-orange/60 hover:text-cream"
            >
              Voltar à Apresentação
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <NavActions />
      </div>

      <SiteFooter />
    </div>
  );
}
