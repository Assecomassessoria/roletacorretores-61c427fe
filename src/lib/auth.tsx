import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "incorporadora" | "gerente" | "coordenador" | "corretor";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  isMaster: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Lista de e-mails com acesso TOTAL e IRRESTRITO (Administrador Master).
// Espelha public.is_master_email() no banco. Para adicionar/remover, atualize
// AMBOS os locais.
const MASTER_EMAILS = [
  "contatoapps@simuladorcorretorelite.com.br",
  "contato@assecomassessoria.net.br",
];

const ALL_ROLES: Role[] = ["incorporadora", "gerente", "coordenador", "corretor"];

export function emailIsMaster(email?: string | null) {
  return !!email && MASTER_EMAILS.includes(email.trim().toLowerCase());
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  roles: [],
  isMaster: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id, s.user.email), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id, data.session.user.email);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(userId: string, email?: string | null) {
    if (emailIsMaster(email)) {
      setRoles(ALL_ROLES);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const loaded = (data ?? []).map((r) => r.role as Role);
    // Fallback: se nenhum papel veio via user_roles mas o usuário já está
    // vinculado a um corretor, garante o papel 'corretor' para não travar
    // a tela em "carregando…".
    if (loaded.length === 0) {
      const { data: cs } = await supabase
        .from("corretores")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if ((cs ?? []).length > 0) loaded.push("corretor");
    }
    setRoles(loaded);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRoles([]);
  };

  const isMaster = emailIsMaster(session?.user?.email);
  const effectiveRoles = isMaster ? ALL_ROLES : roles;

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        roles: effectiveRoles,
        isMaster,
        loading,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
