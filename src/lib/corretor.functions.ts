import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Senha de fallback (caso não consiga gerar a personalizada).
// Atende à política HIBP do servidor.
export const SENHA_PADRAO_CORRETOR = "Corretor@Elite4";

/**
 * Gera a senha de PRIMEIRO ACESSO do corretor:
 *   "2 primeiras letras do nome (1ª maiúscula, 2ª minúscula) + 6 primeiros dígitos do CPF"
 * Exemplo: nome "Luiz Lourenço" + CPF 282.767.xxx-xx  →  "Lu282767"
 *
 * Se não houver dados suficientes, retorna SENHA_PADRAO_CORRETOR.
 */
export function gerarSenhaPrimeiroAcesso(nome?: string | null, cpf?: string | null): string {
  const limpoNome = (nome ?? "").trim().replace(/[^\p{L}\s]/gu, "");
  const letras = limpoNome.replace(/\s+/g, "").slice(0, 2);
  const digitos = (cpf ?? "").replace(/\D/g, "").slice(0, 6);
  if (letras.length < 2 || digitos.length < 6) return SENHA_PADRAO_CORRETOR;
  const primeira = letras.charAt(0).toUpperCase();
  const segunda = letras.charAt(1).toLowerCase();
  return `${primeira}${segunda}${digitos}`;
}

const Input = z.object({
  corretor_id: z.string().uuid(),
  email: z.string().email().max(255),
  // opcional — quando enviados, geram a senha personalizada
  nome: z.string().max(160).optional().nullable(),
  cpf: z.string().max(32).optional().nullable(),
  // override manual (raro)
  senha: z.string().min(6).max(64).optional(),
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

    // Busca nome/cpf do corretor caso não venham no payload
    const { data: corretorExistente } = await supabaseAdmin
      .from("corretores")
      .select("user_id, nome, cpf")
      .eq("id", data.corretor_id)
      .maybeSingle();

    const senha =
      data.senha ??
      gerarSenhaPrimeiroAcesso(
        data.nome ?? corretorExistente?.nome,
        data.cpf ?? corretorExistente?.cpf,
      );

    let user_id: string | null = null;

    // 1) Já vinculado: sincroniza e-mail e reseta a senha de primeiro acesso.
    if (corretorExistente?.user_id) {
      user_id = corretorExistente.user_id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email: data.email,
        password: senha,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      // 2) Cria; se e-mail já existir em outra conta, reaproveita.
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: senha,
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
          password: senha,
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
      .update({ user_id, email: data.email, ativo: true, status_habilitacao: "ativo" })
      .eq("id", data.corretor_id);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id, role: "corretor" }, { onConflict: "user_id,role" });

    return { ok: true, user_id, senha };
  });

// ============================================================
// Definir/alterar a função (role) de um usuário ligado a um corretor.
// Permitido para Incorporadora, Gerente e Coordenador do empreendimento.
// ============================================================
const RoleEnum = z.enum(["corretor", "coordenador", "gerente", "incorporadora"]);

const DefinirFuncaoInput = z.object({
  corretor_id: z.string().uuid(),
  role: RoleEnum,
});

export const definirFuncaoCorretor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DefinirFuncaoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: corretor } = await supabaseAdmin
      .from("corretores")
      .select("user_id, empreendimento_id")
      .eq("id", data.corretor_id)
      .maybeSingle();
    if (!corretor) throw new Error("Corretor não encontrado");
    if (!corretor.user_id) throw new Error("Habilite o acesso (e-mail) antes de definir a função.");

    // Permissão: master, incorporadora, gerente ou coordenador do empreendimento
    const { data: master } = await supabase.rpc("is_master", { _user_id: userId });
    let allowed = !!master;
    if (!allowed) {
      const { data: actorRoles } = await supabase
        .from("user_roles")
        .select("role, empreendimento_id")
        .eq("user_id", userId);
      allowed = (actorRoles ?? []).some(
        (r) =>
          (r.empreendimento_id === corretor.empreendimento_id || r.empreendimento_id === null) &&
          ["incorporadora", "gerente", "coordenador"].includes(r.role as string),
      );
    }
    if (!allowed) throw new Error("Sem permissão para definir função.");

    // Limpa papéis anteriores deste user dentro deste empreendimento
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", corretor.user_id)
      .eq("empreendimento_id", corretor.empreendimento_id);

    // E papéis globais conflitantes (corretor sem empreendimento)
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", corretor.user_id)
      .is("empreendimento_id", null);

    const { error: insErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: corretor.user_id,
      role: data.role,
      empreendimento_id: corretor.empreendimento_id,
    });
    if (insErr) throw new Error(insErr.message);

    return { ok: true };
  });

/** Retorna o cadastro completo do corretor logado (incluindo CPF). */
export const getMeuCadastro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("corretores")
      .select("id,nome,cpf,creci,email,telefone,foto_url,empreendimento_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { corretor: data };
  });
