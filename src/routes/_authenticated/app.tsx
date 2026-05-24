import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAssinatura } from "@/lib/use-assinatura";
import { AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppDashboard,
  head: () => ({ meta: [{ title: "Painel — Roleta Corretor" }] }),
});

type CardDef = { to: string; title: string; desc: string; roles: string[] };

// Matriz de acesso por papel.
// - incorporadora / master: tudo
// - gerente, coordenador: operação (corretores, plantões, roleta, atendimentos, usuários)
// - corretor: apenas equipe / roleta
const CARDS: CardDef[] = [
  { to: "/empreendimentos", title: "Empreendimentos", desc: "Cadastre stands com geofencing e Wi-Fi.", roles: ["incorporadora"] },
  { to: "/coordenador", title: "Gerente / Coordenador", desc: "Painel de Operações Pro: ciclos, equipes, protocolos e escala.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/corretores", title: "Corretores", desc: "Equipe, dados e ordem da roleta.", roles: ["incorporadora", "gerente", "coordenador", "corretor"] },
  { to: "/plantoes", title: "Plantões & Escala", desc: "Agenda e presença dos corretores.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/presencas", title: "Presenças do dia", desc: "Check-ins validados, método e auditoria.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/roleta", title: "Roleta", desc: "Próximo da vez, status do dia.", roles: ["incorporadora", "gerente", "coordenador", "corretor"] },
  { to: "/atendimentos", title: "Atendimentos", desc: "Histórico filtrável por cliente e CNPJ.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/integracoes", title: "Integrações CRM", desc: "Webhooks Zapier, Make, n8n, CRM próprio.", roles: ["incorporadora", "gerente"] },
  { to: "/usuarios", title: "Usuários & Papéis", desc: "Atribua acesso a novos membros.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/mensagens", title: "Central de Comunicados", desc: "Envie pelo sistema, WhatsApp manual, impressão ou PDF.", roles: ["incorporadora", "gerente", "coordenador"] },
];

function AppDashboard() {
  const { user, roles, isMaster } = useAuth();
  const assinatura = useAssinatura();
  const visible = CARDS.filter((c) => isMaster || c.roles.some((r) => roles.includes(r as never)));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Papéis: {roles.length > 0 ? roles.join(", ") : "carregando…"}
        </p>
      </div>

      {assinatura.status === "renovacao" && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Sua assinatura expira em {assinatura.dias_restantes ?? 0} dia
              {assinatura.dias_restantes === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Renove agora para manter o acesso ao painel sem interrupções.
            </p>
          </div>
          <Link
            to="/planos"
            className="inline-flex items-center gap-1 rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange/90"
          >
            Renovar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <CardLink key={c.to} to={c.to} title={c.title} desc={c.desc} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          Seu usuário ainda não tem papéis atribuídos. Solicite acesso à Incorporadora.
        </p>
      )}
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
