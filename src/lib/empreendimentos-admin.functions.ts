import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(userId: string) {
  const { data: master } = await supabaseAdmin.rpc("is_master", { _user_id: userId });
  if (master) return true;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const ok = (roles ?? []).some((r) =>
    ["incorporadora", "gerente", "coordenador"].includes(r.role as string),
  );
  if (!ok) throw new Error("Sem permissão");
  return true;
}

export const listEmpreendimentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("empreendimentos")
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const GetInput = z.object({ id: z.string().uuid() });
export const getEmpreendimentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => GetInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
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
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("corretores")
      .select("id,nome,cpf,creci,telefone,email,empreendimento_id,ordem_roleta,ativo,user_id,foto_url,status_habilitacao,equipe")
      .order("ordem_roleta");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const GetCorretorInput = z.object({ id: z.string().uuid() });
export const getCorretorAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => GetCorretorInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("corretores")
      .select("id,nome,cpf,creci,telefone,email,empreendimento_id,ordem_roleta,ativo,user_id,foto_url,status_habilitacao,equipe")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });
