import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAssinatura } from "@/lib/use-assinatura";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowRight, Megaphone } from "lucide-react";
import { NavActions } from "@/components/nav-actions";

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
  { to: "/corretores", title: "Corretores", desc: "Equipe, dados e ordem da roleta.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/plantoes", title: "Plantões & Escala", desc: "Agenda e presença dos corretores.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/presencas", title: "Presenças do dia", desc: "Check-ins validados, método e auditoria.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/roleta", title: "Roleta", desc: "Próximo da vez, status do dia.", roles: ["incorporadora", "gerente", "coordenador", "corretor"] },
  { to: "/minha-escala", title: "Minha Escala", desc: "Veja a escala da semana e gerencie seus dias.", roles: ["corretor"] },
  { to: "/minha-presenca", title: "Minha Presença Hoje", desc: "Data e hora em que você confirmou presença e entrou na roleta.", roles: ["corretor"] },
  { to: "/meu-cadastro", title: "Meu Cadastro", desc: "Atualize foto, WhatsApp e e-mail de contato.", roles: ["corretor"] },
  { to: "/meu-qrcode", title: "Meu QR Code", desc: "QR Code de identificação para clientes (abre seu WhatsApp).", roles: ["corretor"] },
  { to: "/meu-agendamento", title: "Cadastrar Agendamento", desc: "Cliente com horário marcado: gera QR que identifica você e o cliente no Totem.", roles: ["corretor"] },
  { to: "/simulacao", title: "Simulação/Análise", desc: "Cálculos automáticos de benefícios da construtora, subsídios, FGTS e parcelamento de entrada.", roles: ["corretor"] },
  { to: "/atendimentos", title: "Atendimentos", desc: "Histórico filtrável por cliente e CNPJ.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/integracoes", title: "Integrações CRM", desc: "Webhooks Zapier, Make, n8n, CRM próprio.", roles: ["incorporadora", "gerente"] },
  { to: "/usuarios", title: "Usuários & Papéis", desc: "Atribua acesso a novos membros.", roles: ["incorporadora", "gerente", "coordenador"] },
  { to: "/mensagens", title: "Central de Comunicados", desc: "Envie pelo sistema, WhatsApp manual, impressão ou PDF.", roles: ["incorporadora", "gerente", "coordenador"] },
];

function AppDashboard() {
  const { user, roles, isMaster, loading } = useAuth();
  const assinatura = useAssinatura();
  const hasFullAccess =
    isMaster ||
    roles.includes("incorporadora") ||
    roles.includes("gerente") ||
    roles.includes("coordenador");
  const visible = CARDS.filter((c) => hasFullAccess || c.roles.some((r) => roles.includes(r as never)));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Papéis: {roles.length > 0 ? roles.join(", ") : loading ? "carregando…" : "—"}
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

      <AvisosAtivos />

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

      <NavActions />
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

type Aviso = { id: string; titulo: string; corpo: string; created_at: string };

function AvisosAtivos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  useEffect(() => {
    supabase
      .from("mensagens")
      .select("id,titulo,corpo,created_at")
      .eq("ativa", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setAvisos((data ?? []) as Aviso[]));
  }, []);
  if (avisos.length === 0) return null;
  return (
    <section className="mt-6 rounded-xl border border-orange/30 bg-orange/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange">
        <Megaphone className="h-4 w-4" /> Avisos do plantão
      </div>
      <ul className="space-y-2">
        {avisos.map((a) => (
          <li key={a.id} className="rounded-md bg-background/60 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{a.titulo}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.corpo}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
