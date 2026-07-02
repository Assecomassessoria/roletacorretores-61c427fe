import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MASTER_EMAILS = new Set([
  "contatoapps@simuladorcorretorelite.com.br",
  "contato@assecomassessoria.net.br",
]);

const RoleEnum = z.enum(["incorporadora", "gerente", "coordenador", "corretor"]);

const CriarUsuarioInput = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  telefone: z.string().trim().max(40).optional().nullable(),
  senha: z.string().min(6).max(72),
  role: RoleEnum,
});

async function ensureAdmin(ctx: { userId: string; supabase: any; claims: any }) {
  const email = (ctx.claims?.email as string | undefined)?.toLowerCase();
  if (email && MASTER_EMAILS.has(email)) return true;
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  const ok = (data ?? []).some((r: any) =>
    ["incorporadora", "gerente"].includes(r.role),
  );
  if (!ok) throw new Error("Sem permissão (apenas Incorporadora/Gerente).");
  return true;
}

async function upsertUserByEmail(email: string, senha: string, nome: string, telefone?: string | null) {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, telefone: telefone ?? null },
  });
  if (!error && created.user) return created.user.id;

  // Já existe → buscar e atualizar a senha
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!existing) throw new Error(error?.message ?? "Falha ao criar usuário");
  await supabaseAdmin.auth.admin.updateUserById(existing.id, {
    password: senha,
    user_metadata: { ...existing.user_metadata, nome, telefone: telefone ?? null },
  });
  return existing.id;
}

/**
 * Cria um usuário. Se o e-mail já existir, LANÇA erro em vez de resetar
 * a senha — usado apenas em fluxos públicos (ex.: cadastroDemo) para
 * evitar takeover de conta por qualquer visitante que conheça um e-mail.
 */
async function createUserOrFail(email: string, senha: string, nome: string, telefone?: string | null) {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, telefone: telefone ?? null },
  });
  if (!error && created.user) return created.user.id;
  // Se o e-mail já existe (ou qualquer outra falha), nunca sobrescrevemos a senha.
  const msg = (error?.message ?? "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("duplicate")) {
    throw new Error("E-mail já cadastrado. Faça login ou use outro e-mail.");
  }
  throw new Error(error?.message ?? "Falha ao criar usuário");
}

export const criarUsuarioComPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CriarUsuarioInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const user_id = await upsertUserByEmail(data.email, data.senha, data.nome, data.telefone);

    // Atualiza profile (nome/telefone/email)
    await supabaseAdmin.from("profiles").upsert(
      { id: user_id, nome: data.nome, email: data.email, telefone: data.telefone ?? null },
      { onConflict: "id" },
    );

    // Atribui papel (idempotente)
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user_id)
      .eq("role", data.role)
      .is("empreendimento_id", null)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("user_roles").insert({ user_id, role: data.role });
    }

    return { ok: true, user_id };
  });

// Auto-signup público para demonstração (Plano Experiência).
// SEGURANÇA: nunca permitir auto-atribuição de papéis administrativos
// (incorporadora/gerente/coordenador) via endpoint público — apenas `corretor`.
const DemoRoleEnum = z.enum(["corretor"]);
const DemoInput = z.object({
  nome: z.string().trim().min(2).max(120),
  empresa: z.string().trim().max(160).optional().nullable(),
  cnpj_empresa: z.string().trim().max(32).optional().nullable(),
  inscricao_estadual: z.string().trim().max(32).optional().nullable(),
  endereco: z.string().trim().max(200).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(80).optional().nullable(),
  bairro: z.string().trim().max(80).optional().nullable(),
  cidade: z.string().trim().max(80).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
  documento: z.string().trim().max(32).optional().nullable(),
  nome_empreendimento: z.string().trim().max(160).optional().nullable(),
  cnpj_empreendimento: z.string().trim().max(32).optional().nullable(),
  telefone: z.string().trim().max(40).optional().nullable(),
  whatsapp_empreendimento: z.string().trim().max(40).optional().nullable(),
  informacoes_adicionais: z.string().trim().max(2000).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(255),
  senha: z.string().min(6).max(72),
  role: DemoRoleEnum.optional().default("corretor"),
});

export const cadastroDemo = createServerFn({ method: "POST" })
  .inputValidator((d) => DemoInput.parse(d))
  .handler(async ({ data }) => {
    // SEGURANÇA: endpoint público nunca aceita papel administrativo do cliente.
    const safeRole = "corretor" as const;

    const user_id = await upsertUserByEmail(data.email, data.senha, data.nome, data.telefone);
    await supabaseAdmin.from("profiles").upsert(
      { id: user_id, nome: data.nome, email: data.email, telefone: data.telefone ?? null },
      { onConflict: "id" },
    );
    // Cria empreendimento se ainda não houver para este usuário.
    let empId: string | null = null;
    if (data.cnpj_empreendimento || data.nome_empreendimento || data.empresa) {
      const { data: existingEmp } = await supabaseAdmin
        .from("empreendimentos")
        .select("id")
        .eq("criado_por", user_id)
        .maybeSingle();
      if (existingEmp) {
        empId = existingEmp.id;
      } else {
        const enderecoCompleto = [
          [data.endereco, data.numero].filter(Boolean).join(", "),
          data.complemento,
          data.bairro,
          [data.cidade, data.uf].filter(Boolean).join("/"),
        ].filter((s) => s && String(s).trim().length > 0).join(" - ") || null;
        const { data: novoEmp } = await supabaseAdmin
          .from("empreendimentos")
          .insert({
            nome: data.nome_empreendimento || data.empresa || `Stand de ${data.nome}`,
            cnpj: data.cnpj_empreendimento ?? data.cnpj_empresa ?? null,
            endereco: enderecoCompleto,
            criado_por: user_id,
          })
          .select("id")
          .single();
        empId = novoEmp?.id ?? null;
      }
    }
    // Atribui papel `corretor` escopado ao empreendimento criado (se houver).
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user_id)
      .eq("role", safeRole)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("user_roles").insert({
        user_id,
        role: safeRole,
        empreendimento_id: empId,
      });
    }
    return { ok: true };
  });
