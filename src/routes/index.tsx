import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Roleta Corretor — Elite 4.0" },
      {
        name: "description",
        content:
          "Gestão de Presença Dinâmica para stands: geofencing, Wi-Fi local, QR Code, escala e roleta justa de corretores.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
          ROLETA CORRETOR · ELITE 4.0
        </span>

        <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          Gestão de Presença Dinâmica para o seu stand
        </h1>

        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Validação de equipe por geofencing, Wi-Fi local e QR Code dinâmico.
          Roleta justa, escala de plantões e relatórios semanais automáticos.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://roletacorretor.simuladorcorretorelite.com.br"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Acessar aplicação
          </a>
          <a
            href="https://github.com/Assecomassessoria/Roleta-Corretores-Empreendimento"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Repositório
          </a>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              t: "Roleta Justa",
              d: "Distribuição automática de leads conforme escala e presença.",
            },
            {
              t: "Presença Validada",
              d: "Geofencing + Wi-Fi + QR Code dinâmico no check-in.",
            },
            {
              t: "Relatórios Semanais",
              d: "Arquivamento de 30 dias e envio automático por e-mail.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-lg border border-border bg-card p-5 text-left"
            >
              <h3 className="text-sm font-semibold text-foreground">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Backend: Cloudflare Workers + D1 · Auth: JWT/PBKDF2 · E-mail: Resend
        </p>
      </section>
    </main>
  );
}
