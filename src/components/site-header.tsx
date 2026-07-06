import { Link, useRouterState } from "@tanstack/react-router";
import { BookMarked, LayoutDashboard, LogOut, Tag, RefreshCw, Monitor, User, Clock, ShieldCheck, Building2, BellRing, ScanLine, LayoutGrid, ArrowRight, LogIn, ChevronDown, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAssinatura } from "@/lib/use-assinatura";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Nav = { label: string; to: string; icon: typeof Monitor; tone?: "default" | "orange" | "gold" };
type NavGroup =
  | { kind: "link"; label: string; to: string; icon: typeof Monitor; tone?: "default" | "orange" | "gold" }
  | { kind: "menu"; label: string; icon: typeof Monitor; tone?: "default" | "orange" | "gold"; items: Nav[] };

const NAV_GROUPS: NavGroup[] = [
  { kind: "link", label: "APRESENTAÇÃO", to: "/apresentacao", icon: Monitor, tone: "gold" },
  { kind: "link", label: "TOTEM DO CLIENTE", to: "/totem", icon: ScanLine, tone: "orange" },
  { kind: "link", label: "RECEPÇÃO & TRIAGEM", to: "/atendimentos", icon: BellRing, tone: "orange" },
  {
    kind: "menu",
    label: "CORRETOR / PLANTÃO",
    icon: User,
    tone: "orange",
    items: [
      { label: "Área do Corretor", to: "/corretor", icon: User },
      { label: "Plantão ao Vivo", to: "/plantao", icon: Radio },
      { label: "Plantão / Presença", to: "/plantao", icon: Clock },
    ],
  },
  {
    kind: "menu",
    label: "GERÊNCIA / INCORPORADORA",
    icon: ShieldCheck,
    tone: "default",
    items: [
      { label: "Gerência / Coordenação", to: "/gerencia", icon: ShieldCheck },
      { label: "Incorporadora (Setup)", to: "/setup", icon: Building2 },
    ],
  },
  { kind: "link", label: "ASSINATURA / PREÇOS", to: "/planos", icon: Tag, tone: "gold" },
];



export function SiteHeader() {
  const { session, signOut } = useAuth();
  const assinatura = useAssinatura();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isApresentacao = pathname === "/" || pathname === "/apresentacao";

  const ativa = assinatura.status === "ativa";
  const renovacao = assinatura.status === "renovacao";
  const logado = !!session;

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-orange/90 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-orange-foreground py-1">
        Roleta Corretores Elite 4.0
        {renovacao && assinatura.dias_restantes !== null && (
          <span className="ml-3 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold">
            Renovação em {assinatura.dias_restantes} dia{assinatura.dias_restantes === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="bg-[var(--navy-deep)] text-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 lg:flex-row lg:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-navy ring-1 ring-orange/40">
              <BookMarked className="h-7 w-7 text-orange" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange/90">
                Profissional Roleta Digital 4.0
              </div>
              <div className="font-display text-xl font-bold tracking-wider sm:text-2xl">
                ROLETA CORRETOR <span className="text-orange">|</span>{" "}
                <span className="font-light">SIMULADOR CORRETOR</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-orange">Elite 4.0</div>
            </div>
          </Link>

          <nav className="flex flex-col items-center gap-2 lg:items-end">
            {/* Assinante ativo OU em renovação: só painel + sair (+ renovar quando aplicável) */}
            {logado && (ativa || renovacao) ? (
              <ul className="flex flex-wrap items-center justify-center gap-2">
                <li>
                  <Link
                    to="/app"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gold/60 bg-gold px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gold-foreground hover:bg-gold/90"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" /> Ir para o Painel
                  </Link>
                </li>
                {renovacao && (
                  <li>
                    <Link
                      to="/planos"
                      className="inline-flex items-center gap-1.5 rounded-md border border-orange/60 bg-orange px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-orange-foreground hover:bg-orange/90"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Renovar Plano
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    onClick={() => signOut().then(() => navigate({ to: "/" }))}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </li>
              </ul>
            ) : isApresentacao ? (
              <ul className="flex flex-wrap items-center justify-center gap-2">
                <li>
                  <Link
                    to="/sistema"
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange/60 bg-orange px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-orange-foreground transition hover:bg-orange/90"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Conhecer o Sistema
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/planos"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gold-foreground shadow-md shadow-gold/20 gold-shimmer hover:brightness-110"
                  >
                    <Tag className="h-3.5 w-3.5" /> Planos & Assinar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#b8945a]/70 bg-[#b8945a] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--navy-deep)] hover:brightness-110"
                  >
                    <LogIn className="h-3.5 w-3.5" /> Clientes / Entrar
                  </Link>
                </li>
              </ul>
            ) : (
              <ul className="flex flex-wrap items-center justify-center gap-2">
                {NAV_GROUPS.map((g) => {
                  const Icon = g.icon;
                  const baseClasses =
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition " +
                    (g.tone === "orange"
                      ? "border-orange/60 bg-orange text-orange-foreground hover:bg-orange/90"
                      : g.tone === "gold"
                        ? "border-gold/60 text-gold-foreground shadow-md shadow-gold/20 gold-shimmer hover:brightness-110"
                        : "border-white/20 bg-white/5 text-cream/90 hover:border-orange/60 hover:text-cream hover:bg-white/10");

                  if (g.kind === "link") {
                    return (
                      <li key={g.label}>
                        <Link to={g.to} className={baseClasses}>
                          <Icon className="h-3.5 w-3.5" /> {g.label}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={g.label}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={baseClasses + " outline-none"}>
                          <Icon className="h-3.5 w-3.5" /> {g.label}
                          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-56">
                          {g.items.map((it) => {
                            const ItIcon = it.icon;
                            return (
                              <DropdownMenuItem key={it.label} asChild>
                                <Link to={it.to} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                  <ItIcon className="h-3.5 w-3.5" /> {it.label}
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
