import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_ROLES = ["incorporadora", "gerente", "coordenador"];

/**
 * Retorna o escopo do usuário: { master: true } => acesso total;
 * caso contrário, lista de empreendimento_ids permitidos (via user_roles admin).
 * Lança erro se não for admin em nenhum empreendimento.
 */
async function getAdminScope(userId: string): Promise<{ master: boolean; empIds: string[] }> {
  const { data: master } = await supabaseAdmin.rpc("is_master", { _user_id: userId });
  if (master) return { master: true, empIds: [] };
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role, empreendimento_id")
    .eq("user_id", userId);
  const empIds = Array.from(
    new Set(
      (roles ?? [])
        .filter((r) => ADMIN_ROLES.includes(r.role as string) && r.empreendimento_id)
        .map((r) => r.empreendimento_id as string),
    ),
  );
  if (empIds.length === 0) throw new Error("Sem permissão");
  return { master: false, empIds };
}

export const listEmpreendimentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await getAdminScope(context.userId);
    let q = supabaseAdmin.from("empreendimentos").select("*").order("nome");
    if (!scope.master) q = q.in("id", scope.empIds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const GetInput = z.object({ id: z.string().uuid() });
export const getEmpreendimentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => GetInput.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await getAdminScope(context.userId);
    if (!scope.master && !scope.empIds.includes(data.id)) throw new Error("Sem permissão");
    const { data: row, error } = await supabaseAdmin
      .from("empreendimentos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const listCorretoresAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await getAdminScope(context.userId);
    let q = supabaseAdmin
      .from("corretores")
      .select("id,nome,cpf,creci,telefone,email,empreendimento_id,ordem_roleta,ativo,user_id,foto_url,status_habilitacao,equipe")
      .order("ordem_roleta");
    if (!scope.master) q = q.in("empreendimento_id", scope.empIds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const GetCorretorInput = z.object({ id: z.string().uuid() });
export const getCorretorAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => GetCorretorInput.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await getAdminScope(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("corretores")
      .select("id,nome,cpf,creci,telefone,email,empreendimento_id,ordem_roleta,ativo,user_id,foto_url,status_habilitacao,equipe")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row && !scope.master && !scope.empIds.includes(row.empreendimento_id as string)) {
      throw new Error("Sem permissão");
    }
    return { row };
  });
