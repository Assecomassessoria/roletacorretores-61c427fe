import { Link, useRouterState } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Engrenagem fixa no canto inferior esquerdo.
 * - Para Master: aparece em qualquer página e leva direto ao Painel /app.
 * - Para visitantes na tela inicial ("/"): aparece como atalho para login Master.
 */
export function MestraGear() {
  const { isMaster, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  if (loading) return null;
  if (!isMaster && !isHome) return null;

  const to = isMaster ? "/app" : "/login";

  return (
    <Link
      to={to}
      title="Painel de Gestão Administrativo (Mestra)"
      aria-label="Painel de Gestão Administrativo (Mestra)"
      className="fixed bottom-4 left-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange/50 bg-[var(--navy-deep)] text-orange shadow-lg shadow-black/30 transition hover:rotate-45 hover:border-orange hover:bg-orange hover:text-orange-foreground"
    >
      <Settings className="h-5 w-5" />
      <span className="sr-only">Painel Mestra</span>
    </Link>
  );
}
