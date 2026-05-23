import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppDashboard,
  head: () => ({ meta: [{ title: "Painel — Roleta Corretor" }] }),
});

function AppDashboard() {
  const { user, roles } = useAuth();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bem-vindo, {user?.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Papéis: {roles.length > 0 ? roles.join(", ") : "carregando…"}
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/usuarios">
            <ShieldCheck className="h-4 w-4" />
            Prosseguir como Admin
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardLink to="/empreendimentos" title="Empreendimentos" desc="Cadastre stands com geofencing e Wi-Fi." />
        <CardLink to="/coordenador" title="Gerente / Coordenador" desc="Painel de Operações Pro: ciclos, equipes, protocolos e escala." />
        <CardLink to="/corretores" title="Corretores" desc="Equipe, dados e ordem da roleta." />
        <CardLink to="/plantoes" title="Plantões & Escala" desc="Agenda e presença dos corretores." />
        <CardLink to="/roleta" title="Roleta" desc="Próximo da vez, status do dia." />
        <CardLink to="/atendimentos" title="Atendimentos" desc="Histórico filtrável por cliente e CNPJ." />
        <CardLink to="/integracoes" title="Integrações CRM" desc="Webhooks Zapier, Make, n8n, CRM próprio." />
        <CardLink to="/usuarios" title="Usuários & Papéis" desc="Atribua acesso a novos membros." />
      </div>
    </main>
  );
}

function CardLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-card p-5 transition hover:border-orange/60 hover:shadow-sm"
    >
      <h3 className="text-sm font-semibold group-hover:text-orange">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
