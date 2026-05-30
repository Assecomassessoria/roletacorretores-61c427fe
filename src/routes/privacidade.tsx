import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Informetec" },
      { name: "description", content: "Política de Privacidade da Informetec — LGPD e GDPR." },
      { property: "og:title", content: "Política de Privacidade — Informetec" },
      { property: "og:description", content: "Política de Privacidade da Informetec." },
      { property: "og:url", content: "https://roletacorretor.simuladorcorretorelite.com.br/privacidade" },
    ],
    links: [
      { rel: "canonical", href: "https://roletacorretor.simuladorcorretorelite.com.br/privacidade" },
    ],
  }),
});

function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-wider text-orange hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl uppercase tracking-wide text-[var(--navy-deep)]">
        Política de Privacidade
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Informetec · Padrão Global (LGPD &amp; GDPR)</p>

      <article className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">1. Coleta e Finalidade dos Dados</h2>
          <p>
            A Informetec coleta dados pessoais estritamente necessários para a execução de serviços
            imobiliários de mediação, atendimento automatizado por Inteligência Artificial (Lorenza) e
            gestão de funil de vendas. Os dados coletados (Nome, WhatsApp, E-mail e número de CRECI) são
            utilizados para viabilizar o atendimento personalizado, gerenciar agendamentos, validar a
            regularidade profissional e otimizar os processos de venda.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">2. Segurança da Informação</h2>
          <p>
            Adotamos medidas técnicas, organizacionais e administrativas rigorosas para proteger os
            dados pessoais contra acessos não autorizados, destruição, perda, alteração ou vazamento
            acidental. O armazenamento é realizado em ambiente seguro, operando sob protocolos de
            criptografia em repouso e em trânsito, com políticas de acesso restrito e monitoramento
            contínuo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">3. Compartilhamento de Dados</h2>
          <p>
            Os dados pessoais não são comercializados. Podem ser compartilhados apenas com parceiros
            estratégicos e autoridades quando exigido por lei, sempre respeitando os limites da
            finalidade para a qual foram coletados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">4. Direitos do Titular</h2>
          <p>
            Garantimos a você controle pleno sobre suas informações. A qualquer momento, você pode
            exercer os direitos de confirmação, acesso, retificação, eliminação, portabilidade e
            revogação de consentimento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">5. Alterações nesta Política</h2>
          <p>
            Esta política pode ser atualizada periodicamente para refletir mudanças legislativas ou
            operacionais. Recomendamos a revisão regular desta página.
          </p>
        </section>
      </article>
    </main>
  );
}
