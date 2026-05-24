import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AssinaturaStatus = "sem" | "ativa" | "renovacao" | "expirada";

export interface AssinaturaInfo {
  status: AssinaturaStatus;
  plano_codigo: string | null;
  dias_duracao: number | null;
  expira_em: string | null;
  dias_restantes: number | null;
  loading: boolean;
}

const EMPTY: AssinaturaInfo = {
  status: "sem",
  plano_codigo: null,
  dias_duracao: null,
  expira_em: null,
  dias_restantes: null,
  loading: true,
};

/**
 * Lê o status da assinatura do usuário logado.
 * Master tem acesso pleno (status='ativa' sintético).
 */
export function useAssinatura(): AssinaturaInfo {
  const { session, isMaster, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<AssinaturaInfo>(EMPTY);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setInfo({ ...EMPTY, loading: false });
      return;
    }
    if (isMaster) {
      setInfo({
        status: "ativa",
        plano_codigo: "master",
        dias_duracao: null,
        expira_em: null,
        dias_restantes: null,
        loading: false,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("assinatura_status");
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setInfo({ ...EMPTY, loading: false });
        return;
      }
      const r = data[0] as {
        status: AssinaturaStatus;
        plano_codigo: string | null;
        dias_duracao: number | null;
        expira_em: string | null;
        dias_restantes: number | null;
      };
      setInfo({
        status: r.status,
        plano_codigo: r.plano_codigo,
        dias_duracao: r.dias_duracao,
        expira_em: r.expira_em,
        dias_restantes: r.dias_restantes,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session, isMaster, authLoading]);

  return info;
}
