import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/exclusao")({
  component: ExclusaoPage,
  head: () => ({
    meta: [
      { title: "Exclusão de Dados (LGPD) — Informetec" },
      { name: "description", content: "Solicite a exclusão definitiva dos seus dados da Informetec." },
      { property: "og:title", content: "Exclusão de Dados (LGPD) — Informetec" },
      { property: "og:description", content: "Solicite a exclusão definitiva dos seus dados." },
      { property: "og:url", content: "https://roletacorretor.simuladorcorretorelite.com.br/exclusao" },
    ],
    links: [
      { rel: "canonical", href: "https://roletacorretor.simuladorcorretorelite.com.br/exclusao" },
    ],
  }),
});

function ExclusaoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-wider text-orange hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl uppercase tracking-wide text-[var(--navy-deep)]">
        Exclusão de Dados (LGPD)
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Informetec · Direito ao Esquecimento</p>

      <article className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section className="rounded-md border border-orange/30 bg-orange/5 p-4">
          <h2 className="text-base font-bold text-[var(--navy-deep)]">Como solicitar a exclusão</h2>
          <p className="mt-2">
            Para solicitar a exclusão definitiva dos seus dados, envie um e-mail para{" "}
            <a
              href="mailto:contatoapps@simuladorcorretorelite.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20Exclus%C3%A3o%20de%20Dados%20(LGPD)"
              className="font-semibold text-orange hover:underline"
            >
              contatoapps@simuladorcorretorelite.com.br
            </a>{" "}
            com o assunto <em>"Solicitação de Exclusão de Dados (LGPD)"</em>, informando seu nome
            completo e WhatsApp cadastrado. A exclusão será processada em até 5 dias úteis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">Retenção Legal</h2>
          <p>
            Os dados pessoais serão retidos exclusivamente pelo período necessário para cumprir as
            finalidades descritas, ou para atender a obrigações legais, regulatórias e defesa em
            processos judiciais ou administrativos. Solicitações de exclusão definitiva serão
            processadas imediatamente, exceto quando a manutenção do dado for exigida por lei.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">Seus Direitos</h2>
          <p>
            Nos termos da LGPD e do GDPR, você tem o direito de solicitar a eliminação, anonimização
            ou bloqueio de dados desnecessários, excessivos ou tratados em desconformidade legal.
          </p>
        </section>
      </article>
    </main>
  );
}
