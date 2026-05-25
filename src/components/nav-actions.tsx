import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Home, ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

/**
 * Trio padrão de ações: Sair | Voltar | Início.
 * Aparece em todas as áreas públicas do sistema.
 *
 * variant="dark" usa cores claras para fundos escuros (ex.: Totem).
 */
export function NavActions({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "dark";
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  async function handleSair() {
    if (session) {
      await signOut();
      toast.success("Sessão encerrada.");
    }
    navigate({ to: "/" });
  }

  const isDark = variant === "dark";
  const containerCls = isDark
    ? "mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-white/15 pt-4 text-xs text-white/80"
    : "mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground";
  const btnCls = isDark
    ? "inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-semibold uppercase tracking-wider text-white hover:border-orange/80 hover:bg-white/20"
    : "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-semibold uppercase tracking-wider text-foreground hover:border-orange/60 hover:text-foreground";
  const sepCls = isDark ? "text-white/30" : "text-border";

  return (
    <div className={`${containerCls} ${className}`}>
      <button type="button" onClick={handleSair} className={btnCls}>
        <LogOut className="h-3.5 w-3.5" /> Sair
      </button>
      <span className={sepCls}>|</span>
      <button type="button" onClick={() => router.history.back()} className={btnCls}>
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <span className={sepCls}>|</span>
      <Link to="/" className={btnCls}>
        <Home className="h-3.5 w-3.5" /> Início
      </Link>
    </div>
  );
}
