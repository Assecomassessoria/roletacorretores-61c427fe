import { createFileRoute } from "@tanstack/react-router";
import { NavActions } from "@/components/nav-actions";

export const Route = createFileRoute("/_authenticated/simulacao")({
  component: SimulacaoPage,
  head: () => ({ meta: [{ title: "Simulação/Análise — Roleta Corretor" }] }),
});

function SimulacaoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Simulação/Análise</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cálculos automáticos de benefícios da construtora, subsídios, FGTS e
        parcelamento de entrada.
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <iframe
          src="/simulador/index.html"
          title="Simulador Corretor de Elite"
          className="h-[85vh] w-full"
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        (Voltar para o painel do Corretor)
      </p>
      <NavActions />
    </main>
  );
}
