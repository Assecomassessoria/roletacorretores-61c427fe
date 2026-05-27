import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import { ArrowRight, QrCode, Users, Sparkles, LayoutGrid, Tag } from "lucide-react";
import heroImg from "@/assets/apresentacao-hero.png";
import caosImg from "@/assets/apresentacao-caos.png";
import qrcodeImg from "@/assets/apresentacao-qrcode.png";
import filaImg from "@/assets/apresentacao-fila.png";

const NAV_BOTTOM = [
  { label: "Conhecer o Sistema", to: "/sistema", icon: LayoutGrid, tone: "default" },
  { label: "+ Assinatura / Preços", to: "/planos", icon: Tag, tone: "gold" },
];

const URL = "https://roletacorretor.simuladorcorretorelite.com.br/apresentacao";

export const Route = createFileRoute("/apresentacao")({
  component: ApresentacaoPage,
  head: () => ({
    meta: [
      { title: "Ecossistema Elite 4.0 — A Revolução do Plantão" },
      {
        name: "description",
        content:
          "Do caos do sorteio à fila justa automática. Conheça o Simulador Corretor de Elite 4.0: QR Code na recepção, WhatsApp do corretor e painel de fila transparente em tempo real.",
      },
      { property: "og:title", content: "Ecossistema Elite 4.0 — A Revolução do Plantão" },
      { property: "og:description", content: "Do caos do sorteio à fila justa automática para o seu stand de vendas." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "og:image", content: heroImg },
      { property: "twitter:image", content: heroImg },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});

export function ApresentacaoPage() {
  return (
    <div className="min-h-screen bg-navy text-cream">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-orange/20">
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(60% 50% at 50% 30%, hsl(var(--orange) / 0.35), transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-orange">
              <Sparkles className="h-3 w-3" /> Elite 4.0
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-cream sm:text-5xl lg:text-6xl">
              O <span className="text-orange">Caos Acabou.</span>
              <br />O futuro do seu plantão começa agora.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
              Enquanto a concorrência briga com sacos de pano e anotações ilegíveis, sua equipe foca no que importa:
              vender. Autoatendimento, Escala Semanal, fila justa, Simulador 4.0 e governança total no stand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/sistema"
                className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-sm font-bold uppercase tracking-wider text-navy shadow-lg shadow-orange/30 transition hover:scale-[1.02] hover:bg-orange/90"
              >
                Conhecer o Sistema <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/plantao"
                className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-6 py-3 text-sm font-semibold text-cream/90 transition hover:border-orange/60 hover:text-cream"
              >
                Ver plantão ao vivo
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-orange/30 via-transparent to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border-2 border-orange/40 shadow-2xl">
              <img
                src={heroImg}
                alt="Narrativa Elite 4.0: a solução, o caos e a organização"
                className="block w-full"
              />
              {/* Banner PT-BR cobrindo o rodapé em inglês da imagem */}
              <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 bg-navy-deep/95 backdrop-blur-sm border-t border-orange/40">
                {[
                  { t: "A Solução", s: "Um primeiro passo sem atrito" },
                  { t: "O Caos", s: "Confusão. Conflito. Sem clareza." },
                  { t: "A Organização", s: "Transparência. Confiança. Tecnologia." },
                ].map((b, i) => (
                  <div key={b.t} className={"px-3 py-3 text-center " + (i < 2 ? "border-r border-orange/30 " : "")}>
                    <div className="font-display text-[11px] sm:text-sm font-bold uppercase tracking-wider text-orange leading-tight">
                      {b.t}
                    </div>
                    <div className="mt-1 text-[9px] sm:text-[11px] text-cream/80 leading-tight">{b.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VÍDEO INSTITUCIONAL */}
      <section className="border-b border-orange/20 bg-navy-deep/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <header className="mb-8 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange">Vídeo Institucional</span>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream sm:text-4xl">
              Conheça o <span className="text-orange">Ecossistema 4.0</span> em movimento
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-cream/70">
              Em ~1 minuto, veja como a Roleta Corretor organiza o plantão, da recepção ao fechamento.
            </p>
          </header>
          <div className="relative mx-auto overflow-hidden rounded-2xl border-2 border-orange/40 shadow-2xl shadow-orange/10">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-orange/20 via-transparent to-transparent blur-2xl" />
            <video
              src="/videos/institucional.mp4"
              controls
              playsInline
              preload="metadata"
              poster={heroImg}
              className="block aspect-video w-full bg-black"
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          </div>
        </div>
      </section>

      {/* JORNADA EM 3 CENAS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <header className="mb-12 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange">A jornada visual</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream sm:text-4xl">
            Do caos do sorteio à <span className="text-orange">fila justa</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cream/70">
            Três cenas que mostram como o Ecossistema Elite 4.0 transforma o stand de vendas — da recepção ao contrato.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              tag: "O Caos",
              img: caosImg,
              title: "A experiência tradicional",
              desc: "Desorganização, anotações ilegíveis e sorteios amadores. O coordenador apaga incêndio enquanto leads esfriam.",
              icon: <Users className="h-4 w-4" />,
            },
            {
              tag: "Agilidade",
              img: qrcodeImg,
              title: "Autoatendimento na recepção",
              desc: "O cliente chega, aponta o celular para o QR Code do stand e o corretor da vez recebe a notificação direto no WhatsApp.",
              icon: <QrCode className="h-4 w-4" />,
            },
            {
              tag: "Transparência",
              img: filaImg,
              title: "Fila justa & automática",
              desc: "A roleta gira sozinha, a fila oficial aparece no painel e cai no grupo da equipe. Fim das brigas — quem atendeu menos, atende agora.",
              icon: <Sparkles className="h-4 w-4" />,
            },
          ].map((s) => (
            <article
              key={s.title}
              className="group overflow-hidden rounded-2xl border border-cream/10 bg-navy-deep/60 shadow-xl transition hover:-translate-y-1 hover:border-orange/50"
            >
              <div className="relative overflow-hidden">
                <img
                  src={s.img}
                  alt={s.title}
                  className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-orange/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">
                  {s.icon} {s.tag}
                </span>
              </div>
              <div className="border-t border-orange/30 p-6">
                <h3 className="font-display text-xl font-bold text-orange">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/75">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* PARALLAX / DESTAQUE */}
      <section className="relative border-y border-orange/30 bg-navy-deep py-20">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(40% 60% at 30% 50%, hsl(var(--orange) / 0.18), transparent 60%), radial-gradient(40% 60% at 70% 50%, hsl(var(--navy) / 0.6), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-orange sm:text-4xl">Transformação operacional</h2>
          <p className="mt-5 text-base leading-relaxed text-cream/85 sm:text-lg">
            De sacos de pano para automação inteligente. De conflitos para transparência. De perda de tempo para foco em
            vendas. A <strong className="text-orange">Fila Justa</strong> é só o começo da engenharia que transforma o
            lead da recepção em contrato assinado.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">
          Descubra a <span className="text-orange">engrenagem completa</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-cream/75">
          Veja como a IA Lorenza qualifica a triagem e o CRM trabalha nos bastidores para que sua equipe foque em fechar
          negócios.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/sistema"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange to-orange/80 px-7 py-3 text-sm font-bold uppercase tracking-wider text-navy shadow-xl shadow-orange/30 transition hover:scale-[1.02]"
          >
            <LayoutGrid className="h-4 w-4" /> Conhecer o Sistema <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/planos"
            className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold px-7 py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-lg shadow-gold/30 transition hover:brightness-110"
          >
            <Tag className="h-4 w-4" /> Ver Planos & Assinar
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-7 py-3 text-sm font-semibold text-cream/90 transition hover:border-orange/60 hover:text-cream"
          >
            Voltar ao início
          </Link>
        </div>
      </section>

      {/* NAVEGAÇÃO INFERIOR */}
      <section className="border-y border-orange/20 bg-navy-deep/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-5">
          {NAV_BOTTOM.map((n) => {
            const Icon = n.icon;
            const isGold = n.tone === "gold";
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition hover:shadow-lg " +
                  (isGold
                    ? "border-gold/60 bg-gold text-gold-foreground hover:bg-gold/90 hover:shadow-gold/30"
                    : "border-white/15 bg-white/5 text-cream/90 hover:border-orange/60 hover:text-cream hover:bg-white/10")
                }
              >
                <Icon className="h-3.5 w-3.5" /> {n.label}
              </Link>
            );
          })}
        </div>
      </section>


      <SiteFooter />
    </div>
  );
}
