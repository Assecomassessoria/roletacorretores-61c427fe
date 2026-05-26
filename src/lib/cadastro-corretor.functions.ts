import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Auto-cadastro PÚBLICO do corretor (não requer auth).
// Fluxo: digita CNPJ → backend localiza o empreendimento → cria conta auth,
// profile, corretor (status pendente) e papel `corretor` escopado.
// A gerência aprova depois em /app → Corretores (status_habilitacao=ativo).

const Input = z.object({
  nome: z.string().trim().min(2).max(160),
  cpf: z.string().trim().max(32).optional().nullable(),
  creci: z.string().trim().max(40).optional().nullable(),
  telefone: z.string().trim().max(40).optional().nullable(),
  cnpj_empreendimento: z.string().trim().min(11).max(32),
  email: z.string().trim().toLowerCase().email().max(255),
  senha: z.string().min(8).max(72),
});

export const buscarEmpreendimentoPorCnpj = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ cnpj: z.string().trim().max(32) }).parse(d),
  )
  .handler(async ({ data }) => {
    const digits = (data.cnpj ?? "").replace(/\D/g, "");
    if (digits.length < 11) return { empreendimento: null as null | { id: string; nome: string; cnpj: string | null } };

    // Tenta primeiro com CNPJ exato, depois normalizado
    const { data: rows } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, cnpj")
      .eq("ativo", true);

    const match = (rows ?? []).find((e) => {
      const ec = (e.cnpj ?? "").replace(/\D/g, "");
      return ec && ec === digits;
    });
    return { empreendimento: match ?? null };
  });

export const cadastroCorretorPublico = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const cnpjDigits = data.cnpj_empreendimento.replace(/\D/g, "");

    // 1) Localiza o empreendimento pelo CNPJ
    const { data: emps } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, cnpj")
      .eq("ativo", true);
    const emp = (emps ?? []).find((e) => {
      const ec = (e.cnpj ?? "").replace(/\D/g, "");
      return ec && ec === cnpjDigits;
    });
    if (!emp) {
      throw new Error("CNPJ não encontrado. Confirme com a Incorporadora ou Coordenação.");
    }

    // 2) Cria (ou reaproveita) usuário auth com a senha escolhida
    let user_id: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, telefone: data.telefone ?? null },
    });
    if (createErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(createErr.message);
      user_id = existing.id;
      // Mantém a senha que ele digitou (não sobrescreve sem necessidade)
    } else {
      user_id = created.user?.id ?? null;
    }
    if (!user_id) throw new Error("Falha ao criar conta de acesso.");

    // 3) Profile
    await supabaseAdmin.from("profiles").upsert(
      { id: user_id, nome: data.nome, email: data.email, telefone: data.telefone ?? null },
      { onConflict: "id" },
    );

    // 4) Corretor (pendente). Se já existe corretor com este user_id no empreendimento, atualiza.
    const { data: existingCorretor } = await supabaseAdmin
      .from("corretores")
      .select("id")
      .eq("user_id", user_id)
      .eq("empreendimento_id", emp.id)
      .maybeSingle();

    const corretorPayload = {
      nome: data.nome,
      cpf: (data.cpf ?? "").replace(/\D/g, "") || null,
      creci: data.creci ?? null,
      telefone: data.telefone ?? null,
      email: data.email,
      empreendimento_id: emp.id,
      user_id,
      status_habilitacao: "pendente",
      ativo: false,
    };

    if (existingCorretor) {
      await supabaseAdmin.from("corretores").update(corretorPayload).eq("id", existingCorretor.id);
    } else {
      const { error: insErr } = await supabaseAdmin.from("corretores").insert(corretorPayload);
      if (insErr) throw new Error(insErr.message);
    }

    // 5) Papel corretor escopado ao empreendimento
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user_id)
      .eq("role", "corretor")
      .eq("empreendimento_id", emp.id)
      .maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({
        user_id,
        role: "corretor",
        empreendimento_id: emp.id,
      });
    }

    return { ok: true, empreendimento: emp.nome };
  });
