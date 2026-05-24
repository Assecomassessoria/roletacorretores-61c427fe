import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAssinatura } from "@/lib/use-assinatura";
import coverCaos from "@/assets/cover-caos.jpg";
import coverQr from "@/assets/cover-qr.jpg";
import coverRoleta from "@/assets/cover-roleta.jpg";

export const Route = createFileRoute("/apresentacao")({
  component: Apresentacao,
  head: () => ({
    meta: [
      { title: "Simulador Corretor de Elite 4.0 — Apresentação" },
      {
        name: "description",
        content:
          "Conheça o Ecossistema Elite 4.0: auto atendimento por QR Code, fila justa automática e fim do caos no plantão de vendas.",
      },
      { property: "og:title", content: "Simulador Corretor de Elite 4.0" },
      {
        property: "og:description",
        content: "O fim do sorteio manual. Auto atendimento, fila justa e plantão Elite.",
      },
    ],
  }),
});

const NAVY = "#0a1929";
const NAVY_2 = "#0f2744";
const GOLD = "#c9a961";
const GOLD_LIGHT = "#e8d5b7";

const scenes = [
  {
    tag: "O Caos",
    title: "A Experiência Tradicional",
    desc: "Desorganização, perda de tempo e conflitos de fila. Anotações ilegíveis, sorteios amadores e recepção sem controle. A realidade de muitos plantões.",
    img: coverCaos,
  },
  {
    tag: "Agilidade",
    title: "Auto Atendimento Elite",
    desc: "Primeira impressão impecável. O cliente chega, aponta o celular para o QR Code e instantaneamente o corretor da vez é notificado via WhatsApp.",
    img: coverQr,
  },
  {
    tag: "Transparência",
    title: "Fila Justa e Automática",
    desc: "O sistema faz o sorteio automático, a lista oficial cai no WhatsApp da equipe e brilha no painel. Transparência, justiça e fim das brigas de fila.",
    img: coverRoleta,
  },
];

function Apresentacao() {
  const navigate = useNavigate();
  const assinatura = useAssinatura();

  // Assinante ativo → não vê a capa, vai direto para o app
  if (assinatura.status === "ativa") {
    return <Navigate to="/app" />;
  }

  const goRoleta = () => navigate({ to: "/plantao" });

  return (
    <div
      className="min-h-screen text-[var(--cover-text)]"
      style={
        {
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`,
          ["--cover-text" as string]: "#f5f5f5",
        } as React.CSSProperties
      }
    >
      {/* HEADER */}
      <header
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 backdrop-blur-md"
        style={{
          background: "rgba(10,25,41,0.92)",
          borderBottom: `2px solid ${GOLD}`,
        }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-wider sm:text-2xl" style={{ color: GOLD }}>
            ELITE 4.0
          </span>
          <span className="text-sm font-light text-white/80 sm:text-base">Simulador Corretor</span>
        </div>
        <Link
          to="/login"
          className="hidden text-sm font-semibold sm:inline-block"
          style={{ color: GOLD_LIGHT }}
        >
          Entrar
        </Link>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(201,169,97,0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em]"
            style={{
              border: `1px solid ${GOLD}55`,
              color: GOLD,
              background: "rgba(201,169,97,0.06)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Ecossistema Elite
          </div>
          <h1
            className="text-4xl font-extrabold leading-[1.05] sm:text-6xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            O Caos Acabou
          </h1>
          <p className="mt-4 text-lg font-light sm:text-2xl" style={{ color: GOLD_LIGHT }}>
            O Futuro do Seu Plantão Começa Agora
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Enquanto a concorrência briga com sacos de pano e anotações ilegíveis, sua equipe pode
            focar no que realmente importa: <strong className="text-white">vender</strong>. Nosso
            sistema de Auto Atendimento e Fila Justa automatiza o caos e eleva o padrão do seu
            stand ao nível Elite.
          </p>

          <button
            onClick={goRoleta}
            className="group mt-10 inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-bold transition-all hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, #d4b896 100%)`,
              color: NAVY,
              boxShadow: "0 18px 45px rgba(201,169,97,0.35)",
              border: `2px solid ${GOLD}`,
            }}
          >
            Entrar na Roleta do Dia
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-4 text-xs text-white/50">
            Sistema auditado · Presença blindada · Fila justa garantida
          </p>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-px -translate-x-1/2"
          style={{ background: `linear-gradient(to bottom, transparent, ${GOLD})` }}
        />
      </section>

      {/* SCENES */}
      <section className="px-6 py-24">
        <h2
          className="text-center text-3xl font-bold tracking-wide sm:text-4xl"
          style={{ color: GOLD }}
        >
          A Jornada Visual do Ecossistema Elite
        </h2>
        <div className="mx-auto mt-14 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((s) => (
            <article
              key={s.title}
              className="group overflow-hidden rounded-2xl transition-all hover:-translate-y-2"
              style={{
                border: `2px solid ${GOLD}33`,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                background: "rgba(10,25,41,0.6)",
              }}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 flex items-end p-5"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(10,25,41,0.85) 100%)",
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                    style={{ background: GOLD, color: NAVY }}
                  >
                    {s.tag}
                  </span>
                </div>
              </div>
              <div className="p-6" style={{ borderTop: `2px solid ${GOLD}` }}>
                <h3 className="text-lg font-bold" style={{ color: GOLD }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: GOLD_LIGHT }}>
                  {s.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TRANSFORMAÇÃO */}
      <section
        className="relative my-8 flex min-h-[420px] items-center justify-center overflow-hidden px-6 py-20"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a52 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, rgba(201,169,97,0.18) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(26,58,82,0.4) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: GOLD }}>
            Transformação Operacional
          </h2>
          <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: GOLD_LIGHT }}>
            De sacos de pano para automação inteligente. De conflitos para transparência. De perda
            de tempo para foco em vendas. O Ecossistema Elite 4.0 não é apenas um sistema — é uma
            revolução na forma como você gerencia seu plantão.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className="relative px-6 py-24 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,25,41,0.92) 0%, rgba(26,58,82,0.85) 100%)",
          borderTop: `2px solid ${GOLD}`,
          borderBottom: `2px solid ${GOLD}`,
        }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: GOLD }}>
            Não Perca Mais Tempo Nem Comissões
          </h2>
          <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: GOLD_LIGHT }}>
            A desorganização custa caro. Cada minuto perdido em sorteios manuais é uma venda não
            realizada. Cada conflito de fila é um cliente insatisfeito. Transforme seu plantão em
            um modelo de eficiência Elite.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={goRoleta}
              className="group inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-bold transition-all hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #d4b896 100%)`,
                color: NAVY,
                boxShadow: "0 18px 45px rgba(201,169,97,0.35)",
                border: `2px solid ${GOLD}`,
              }}
            >
              Acessar Roleta do Dia
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <Link
              to="/planos"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-base font-semibold transition-all hover:bg-white/5"
              style={{ border: `2px solid ${GOLD}`, color: GOLD_LIGHT }}
            >
              Ver Planos
            </Link>
          </div>
        </div>
      </section>

      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ background: NAVY, borderTop: `2px solid ${GOLD}`, color: GOLD_LIGHT }}
      >
        © {new Date().getFullYear()} Simulador Corretor de Elite 4.0 — Transformando o mercado
        imobiliário brasileiro.
      </footer>
    </div>
  );
}
