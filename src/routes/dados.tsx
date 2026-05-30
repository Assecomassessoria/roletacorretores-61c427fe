import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dados")({
  component: DadosPage,
  head: () => ({
    meta: [
      { title: "Tratamento de Dados (LGPD/GDPR) — Informetec" },
      { name: "description", content: "Tratamento de Dados pessoais da Informetec conforme LGPD e GDPR." },
      { property: "og:title", content: "Tratamento de Dados (LGPD/GDPR) — Informetec" },
      { property: "og:description", content: "Tratamento de Dados pessoais da Informetec." },
      { property: "og:url", content: "https://roletacorretor.simuladorcorretorelite.com.br/dados" },
    ],
    links: [
      { rel: "canonical", href: "https://roletacorretor.simuladorcorretorelite.com.br/dados" },
    ],
  }),
});

function DadosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-wider text-orange hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl uppercase tracking-wide text-[var(--navy-deep)]">
        Tratamento de Dados (LGPD/GDPR)
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Informetec · Padrão Global</p>

      <article className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">1. Coleta, Escopo e Finalidade</h2>
          <p>
            A Informetec coleta e processa dados pessoais estritamente necessários para a execução de
            serviços imobiliários de mediação, atendimento automatizado por Inteligência Artificial
            (Lorenza) e gestão de funil de vendas. Os dados coletados (Nome, WhatsApp, E-mail e número
            de CRECI) são utilizados para viabilizar o atendimento personalizado, gerenciar
            agendamentos, validar a regularidade profissional e otimizar os processos de venda.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">2. Segurança da Informação</h2>
          <p>
            Adotamos medidas técnicas, organizacionais e administrativas rigorosas para proteger os
            dados pessoais contra acessos não autorizados, destruição, perda, alteração ou vazamento
            acidental. O armazenamento é realizado em ambiente seguro, operando sob protocolos de
            criptografia em repouso e em trânsito, com políticas de acesso restrito, monitoramento
            contínuo (Audit Trail) e privilégio mínimo (Zero Trust).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">3. Direitos Globais do Titular</h2>
          <p>
            Garantimos a você controle pleno sobre suas informações. A qualquer momento, mediante
            solicitação aos nossos canais oficiais, você pode exercer os seguintes direitos:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Confirmação e Acesso:</strong> Verificar a existência de tratamento e acessar seus dados armazenados.</li>
            <li><strong>Retificação:</strong> Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li><strong>Eliminação e Oposição:</strong> Solicitar a anonimização, bloqueio ou exclusão definitiva de dados desnecessários, excessivos ou tratados em desconformidade legal.</li>
            <li><strong>Portabilidade:</strong> Requisitar a transferência dos seus dados para outro fornecedor.</li>
            <li><strong>Revogação:</strong> Retirar o consentimento para o tratamento de dados a qualquer momento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--navy-deep)]">4. Consentimento</h2>
          <p>
            Ao interagir com a Lorenza (IA), prosseguir com o seu cadastro ou utilizar as plataformas da
            Informetec, você declara de forma livre, expressa, informada e inequívoca que está ciente e
            concorda com o tratamento de seus dados pessoais nos moldes detalhados neste termo.
          </p>
        </section>
      </article>
    </main>
  );
}
