import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  corretor_id: z.string().uuid(),
  email: z.string().email().max(255),
  senha: z.string().regex(/^\d{6}$/, "Senha deve ter 6 dígitos numéricos"),
});

export const habilitarCorretorAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    // Apenas papéis administrativos podem habilitar corretor
    const { userId, supabase } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin =
      (roles ?? []).some((r) =>
        ["incorporadora", "gerente", "coordenador"].includes(r.role as string),
      );
    // master bypass via has_role
    const { data: master } = await supabase.rpc("is_master", { _user_id: userId });
    if (!isAdmin && !master) throw new Error("Sem permissão");

    // Cria (ou recupera) o usuário no Auth
    let user_id: string | null = null;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.senha,
        email_confirm: true,
      });
    if (createErr) {
      // Se já existe, busca id
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error(createErr.message);
      user_id = existing.id;
      // Atualiza a senha
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.senha,
      });
    } else {
      user_id = created.user?.id ?? null;
    }
    if (!user_id) throw new Error("Falha ao obter user_id");

    // Vincula no corretor
    const { error: upErr } = await supabaseAdmin
      .from("corretores")
      .update({ user_id, email: data.email })
      .eq("id", data.corretor_id);
    if (upErr) throw new Error(upErr.message);

    // Garante role 'corretor'
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id, role: "corretor" },
        { onConflict: "user_id,role" },
      );

    return { ok: true, user_id };
  });
