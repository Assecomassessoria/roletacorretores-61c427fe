import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Redefinir senha — Roleta Corretor" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase coloca os tokens no hash (#access_token=...&type=recovery)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("As senhas não conferem.");
    if (password.length < 6) return toast.error("Mínimo 6 caracteres.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha");
    } finally {
      setBusy(false);
    }
  }

  async function handleSair() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground">
            Roleta Corretor · Elite 4.0
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Defina sua nova senha de acesso." : "Validando link de recuperação…"}
          </p>
        </div>

        {ready && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p1">Nova senha</Label>
              <Input id="p1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p2">Confirmar nova senha</Label>
              <Input id="p2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Salvando…" : "Atualizar senha"}
            </Button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <button type="button" onClick={handleSair} className="hover:text-foreground">Sair</button>
          <span className="text-border">|</span>
          <button type="button" onClick={() => router.history.back()} className="hover:text-foreground">Voltar</button>
          <span className="text-border">|</span>
          <Link to="/login" className="hover:text-foreground">Login</Link>
        </div>
      </div>
    </main>
  );
}
