import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Senha padrão de PRIMEIRO ACESSO do corretor.
// Ele entra com email + 123456 e o sistema obriga a redefinir a senha
// vinculada ao próprio e-mail no primeiro login.
export const SENHA_PADRAO_CORRETOR = "123456";

const Input = z.object({
  corretor_id: z.string().uuid(),
  email: z.string().email().max(255),
  senha: z
    .string()
    .min(6)
    .max(64)
    .optional()
    .transform((v) => v || SENHA_PADRAO_CORRETOR),
});

export const habilitarCorretorAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) =>
      ["incorporadora", "gerente", "coordenador"].includes(r.role as string),
    );
    const { data: master } = await supabase.rpc("is_master", { _user_id: userId });
    if (!isAdmin && !master) throw new Error("Sem permissão");

    let user_id: string | null = null;

    // 1) Se o corretor já está vinculado a um auth user, sincroniza
    //    e-mail e reseta a senha padrão neste mesmo usuário.
    const { data: corretorExistente } = await supabaseAdmin
      .from("corretores")
      .select("user_id")
      .eq("id", data.corretor_id)
      .maybeSingle();

    if (corretorExistente?.user_id) {
      user_id = corretorExistente.user_id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email: data.email,
        password: data.senha,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      // 2) Tenta criar; se e-mail já existir em outra conta, reaproveita.
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.senha,
          email_confirm: true,
          user_metadata: { must_change_password: true },
        });
      if (createErr) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users.find(
          (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );
        if (!existing) throw new Error(createErr.message);
        user_id = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          email: data.email,
          password: data.senha,
          email_confirm: true,
          user_metadata: { ...(existing.user_metadata ?? {}), must_change_password: true },
        });
      } else {
        user_id = created.user?.id ?? null;
      }
    }
    if (!user_id) throw new Error("Falha ao obter user_id");

    const { error: upErr } = await supabaseAdmin
      .from("corretores")
      .update({ user_id, email: data.email })
      .eq("id", data.corretor_id);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id, role: "corretor" }, { onConflict: "user_id,role" });

    return { ok: true, user_id };
  });
