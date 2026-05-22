import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: AreaSetup,
  head: () => ({ meta: [{ title: "Incorporadora (Setup) — Roleta Corretor" }] }),
});

function AreaSetup() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="h-1 bg-gradient-to-r from-orange via-gold to-orange/40" />
      <main className="mx-auto max-w-md px-4 py-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Início
        </Link>
        <div className="rounded-xl bg-card p-8 shadow-sm ring-1 ring-border text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/15 text-gold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-lg font-bold uppercase tracking-wider">Chave de Segurança Necessária</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Entre o código correspondente para acessar o painel da <strong className="text-orange">Incorporadora</strong>.
          </p>
          <p className="mt-6 text-[11px] text-muted-foreground">
            Fase 5 em construção — configuração master, destinatários do relatório semanal, checklist de integridade do sistema.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
