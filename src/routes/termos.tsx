import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  component: TermosPage,
  head: () => ({
    meta: [
      { title: "Termos e Condições — Informetec" },
      { name: "description", content: "Termos e Condições de uso da Informetec." },
      { property: "og:title", content: "Termos e Condições — Informetec" },
      { property: "og:description", content: "Termos e Condições de uso da Informetec." },
      { property: "og:url", content: "https://roletacorretor.simuladorcorretorelite.com.br/termos" },
    ],
    links: [
      { rel: "canonical", href: "https://roletacorretor.simuladorcorretorelite.com.br/termos" },
    ],
  }),
});

function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-wider text-orange hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl uppercase tracking-wide text-[var(--navy-deep)]">
        Termos e Condições
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Informetec · Padrão Global</p>

      <article className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar as plataformas da Informetec, você concorda em cumprir e ficar
            vinculado a estes Termos e Condições. Caso não concorde com qualquer parte destes termos,
            não deverá utilizar os serviços.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">2. Uso dos Serviços</h2>
          <p>
            Os serviços são destinados a profissionais do setor imobiliário. É proibido o uso para fins
            ilícitos, fraudulentos ou que possam causar danos a terceiros. A Informetec reserva-se o
            direito de suspender ou encerrar contas que violem estas condições.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">3. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo, software, marcas e materiais disponíveis nas plataformas são de propriedade
            da Informetec ou de seus licenciadores. O uso não autorizado é estritamente proibido.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">4. Limitação de Responsabilidade</h2>
          <p>
            A Informetec se esforça para manter os serviços disponíveis e seguros, mas não garante
            operação ininterrupta. Não nos responsabilizamos por danos indiretos, incidentais ou
            consequenciais resultantes do uso ou da impossibilidade de uso dos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">5. Alterações nos Termos</h2>
          <p>
            Estes termos podem ser atualizados a qualquer momento. O uso continuado dos serviços após
            alterações constitui aceitação dos novos termos.
          </p>
        </section>
      </article>
    </main>
  );
}
