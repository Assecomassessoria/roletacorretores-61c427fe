import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppDashboard,
  head: () => ({ meta: [{ title: "Painel — Roleta Corretor" }] }),
});

function AppDashboard() {
  const { user, roles } = useAuth();
  const semRole = roles.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Bem-vindo, {user?.email}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fase 1 concluída: autenticação e banco prontos.
      </p>

      {semRole ? (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Seu usuário ainda não tem papel atribuído.</strong>
          <p className="mt-1">
            Solicite à Incorporadora que atribua um papel (Gerente, Coordenador ou Corretor)
            para liberar acesso aos módulos.
          </p>
          <p className="mt-2 text-xs opacity-80">
            Primeiro acesso? O primeiro usuário cadastrado deve receber o papel{" "}
            <code className="rounded bg-amber-200/60 px-1 dark:bg-amber-900/60">incorporadora</code>{" "}
            via banco para liberar o sistema.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Empreendimentos" desc="Cadastre stands com geofencing e Wi-Fi." badge="Fase 2" />
          <Card title="Corretores & Escala" desc="Equipe, plantões e roleta justa." badge="Fase 2" />
          <Card title="Atendimentos" desc="Leads, status e transferências." badge="Fase 3" />
          <Card title="Relatórios" desc="Histórico semanal e envio por e-mail." badge="Fase 4" />
          <Card title="Painel Mestra" desc="Gestão de usuários e papéis." badge="Fase 3" />
        </div>
      )}
    </main>
  );
}

function Card({ title, desc, badge }: { title: string; desc: string; badge: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
