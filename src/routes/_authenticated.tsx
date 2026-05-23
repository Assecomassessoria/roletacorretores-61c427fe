import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading, signOut, roles, user, isMaster } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const isAdmin = roles.some((r) => ["incorporadora", "gerente", "coordenador"].includes(r));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/app" className="text-sm font-semibold tracking-wide">
              Roleta Corretor
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
              <Link to="/app" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Painel</Link>
              <Link to="/roleta" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Roleta</Link>
              {isAdmin && (
                <>
                  <Link to="/empreendimentos" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Empreendimentos</Link>
                  <Link to="/coordenador" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Gerente/Coordenador</Link>
                  <Link to="/corretores" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Corretores</Link>
                  <Link to="/plantoes" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Plantões</Link>
                  {roles.includes("incorporadora") && (
                    <Link to="/usuarios" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Usuários</Link>
                  )}
                </>
              )}

            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user?.email}
              {isMaster && (
                <span className="ml-2 rounded bg-orange px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  MASTER
                </span>
              )}
              {!isMaster && roles.length > 0 && (
                <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs uppercase tracking-wider">
                  {roles.join(", ")}
                </span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

