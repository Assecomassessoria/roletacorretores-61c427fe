import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Engrenagem fixa no lado esquerdo da tela, visível apenas para usuários
 * Master (Administrador irrestrito). Dá acesso direto ao Painel de Gestão
 * Administrativo (Mestra) em /app.
 */
export function MestraGear() {
  const { isMaster, loading } = useAuth();
  if (loading || !isMaster) return null;

  return (
    <Link
      to="/app"
      title="Painel de Gestão Administrativo (Mestra)"
      aria-label="Painel de Gestão Administrativo (Mestra)"
      className="fixed left-4 top-1/2 z-50 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange/50 bg-[var(--navy-deep)] text-orange shadow-lg shadow-black/30 transition hover:rotate-45 hover:border-orange hover:bg-orange hover:text-orange-foreground"
    >
      <Settings className="h-5 w-5" />
      <span className="sr-only">Painel Mestra</span>
    </Link>
  );
}
