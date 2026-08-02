import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Lista empreendimentos ativos vinculados ao usuário (via user_roles OU corretores).
 *  Usa supabaseAdmin após autenticação para evitar corrida com restauração de sessão no cliente. */
export const listarMeusEmpreendimentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: master } = await supabaseAdmin.rpc("is_master", { _user_id: userId });

    const ids = new Set<string>();
    if (!master) {
      const [{ data: roles }, { data: corr }] = await Promise.all([
        supabaseAdmin.from("user_roles").select("empreendimento_id").eq("user_id", userId),
        supabaseAdmin.from("corretores").select("empreendimento_id").eq("user_id", userId).eq("ativo", true),
      ]);
      (roles ?? []).forEach((r) => r.empreendimento_id && ids.add(r.empreendimento_id));
      (corr ?? []).forEach((c) => c.empreendimento_id && ids.add(c.empreendimento_id));
    }

    let q = supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, latitude, longitude, raio_metros, periodo_ausencia_minutos, criterios_sorteio, fila_oficial_data, fila_oficial_ids, equipe_alfa_nome, equipe_beta_nome, roleta_automatica, roleta_auto_horarios")
      .eq("ativo", true)
      .order("nome");
    if (!master) {
      if (ids.size === 0) return { empreendimentos: [] };
      q = q.in("id", Array.from(ids));
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { empreendimentos: data ?? [] };
  });
