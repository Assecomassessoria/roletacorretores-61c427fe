import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading, signOut, roles, user } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/app" className="text-sm font-semibold tracking-wide">
            Roleta Corretor
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user?.email}
              {roles.length > 0 && (
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
