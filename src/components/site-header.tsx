import { Link } from "@tanstack/react-router";
import { BookMarked, LayoutDashboard, LogOut, Tag, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAssinatura } from "@/lib/use-assinatura";
import { useNavigate } from "@tanstack/react-router";

type Nav = { label: string; to: string; tone?: "default" | "orange" | "gold" };

const NAV_PUBLIC: Nav[] = [
  { label: "ÁREA DO CORRETOR", to: "/corretor", tone: "orange" },
  { label: "GERÊNCIA / COORDENAÇÃO", to: "/gerencia" },
  { label: "INCORPORADORA (SETUP)", to: "/setup", tone: "gold" },
];

export function SiteHeader() {
  const { session, signOut } = useAuth();
  const assinatura = useAssinatura();
  const navigate = useNavigate();

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
            ) : (
              <>
                <ul className="flex flex-wrap items-center justify-center gap-2">
                  {NAV_PUBLIC.map((n) => (
                    <li key={n.to}>
                      <Link
                        to={n.to}
                        className={
                          "inline-flex items-center rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition " +
                          (n.tone === "orange"
                            ? "border-orange/60 bg-orange text-orange-foreground hover:bg-orange/90"
                            : n.tone === "gold"
                              ? "border-gold/60 bg-gold text-gold-foreground hover:bg-gold/90"
                              : "border-white/15 text-white hover:bg-white/10")
                        }
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/planos"
                  className="inline-flex items-center gap-2 rounded-md bg-orange px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-orange-foreground shadow-md hover:bg-orange/90"
                >
                  <Tag className="h-3.5 w-3.5" /> + Assinatura / Preços
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
