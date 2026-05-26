import { createFileRoute, useNavigate, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Roleta Corretor" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && mode !== "forgot") {
      let pendente: string | null = null;
      try {
        pendente = sessionStorage.getItem("plano_pendente");
      } catch {}
      navigate({ to: pendente ? "/planos" : "/app" });
    }
  }, [loading, session, navigate, mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/app" });
      } else if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("A senha deve ter pelo menos 8 caracteres.");
        }
        const fraca = ["12345678", "123456789", "1234567890", "senha123", "password", "qwerty123"];
        if (fraca.includes(password.toLowerCase())) {
          throw new Error("Senha muito fraca / conhecida em vazamentos. Use letras, números e símbolos.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Cadastro criado. Verifique seu e-mail para confirmar antes de entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Erro desconhecido";
      const code = (err as { code?: string } | null)?.code ?? "";
      const lower = raw.toLowerCase();
      let msg = raw;
      if (code === "weak_password" || lower.includes("weak") || lower.includes("pwned") || lower.includes("compromised") || lower.includes("leaked")) {
        msg = "Senha muito fraca ou já vazada em outros sites. Use ao menos 8 caracteres com letras, números e símbolos.";
      } else if (code === "user_already_exists" || lower.includes("already registered") || lower.includes("user already")) {
        msg = "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
      } else if (lower.includes("invalid login")) {
        msg = "E-mail ou senha incorretos. Se acabou de se cadastrar, confirme seu e-mail antes de entrar.";
      } else if (lower.includes("email not confirmed")) {
        msg = "Confirme seu e-mail antes de entrar — verifique a caixa de entrada e o spam.";
      } else if (lower.includes("invalid email") || lower.includes("invalid format")) {
        msg = "E-mail inválido.";
      } else if (lower.includes("rate") || lower.includes("too many")) {
        msg = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
      }
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSair() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  }

  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha";
  const subtitle =
    mode === "login"
      ? "Acesse o painel de gestão do seu stand."
      : mode === "signup"
      ? "Cadastro inicial. Seu papel será atribuído pela Incorporadora."
      : "Informe seu e-mail para receber o link de redefinição.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground">
            Roleta Corretor · Elite 4.0
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-orange hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres. Evite senhas óbvias como <code>123456</code> — o sistema bloqueia senhas vazadas em outros sites.
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy
              ? "Aguarde…"
              : mode === "login"
              ? "Entrar"
              : mode === "signup"
              ? "Criar conta"
              : "Enviar link de recuperação"}
          </Button>
        </form>

        {mode !== "forgot" ? (
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar para login
          </button>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <button type="button" onClick={handleSair} className="hover:text-foreground">
            Sair
          </button>
          <span className="text-border">|</span>
          <button type="button" onClick={() => router.history.back()} className="hover:text-foreground">
            Voltar
          </button>
          <span className="text-border">|</span>
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
        </div>
      </div>
    </main>
  );
}
