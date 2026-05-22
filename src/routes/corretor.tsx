import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Lock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/corretor")({
  component: AreaCorretor,
  head: () => ({ meta: [{ title: "Área do Corretor — Roleta Corretor" }] }),
});

function AreaCorretor() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="h-1 bg-gradient-to-r from-orange via-gold to-orange/40" />
      <main className="mx-auto max-w-md px-4 py-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Início
        </Link>
        <div className="rounded-xl bg-card p-8 shadow-sm ring-1 ring-border text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange/10 text-orange">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-lg font-bold uppercase tracking-wider">Acesso Individual</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Entre com seu CRECI e Chave de Operação para acessar a roleta cronológica do plantão.
          </p>
          <p className="mt-6 text-[11px] text-muted-foreground">
            Fase 2 em construção — fila cronológica, ordem homologada de atendimento e botão iniciar / encerrar.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
