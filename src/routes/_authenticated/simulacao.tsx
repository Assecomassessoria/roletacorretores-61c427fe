import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/simulacao")({
  component: SimulacaoPage,
  head: () => ({ meta: [{ title: "Simulação/Análise — Roleta Corretor" }] }),
});

function SimulacaoPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Simulação/Análise</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cálculos automáticos de benefícios da construtora, subsídios, FGTS e
        parcelamento de entrada.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aguardando o código da simulação para implementação.
      </div>
    </main>
  );
}
