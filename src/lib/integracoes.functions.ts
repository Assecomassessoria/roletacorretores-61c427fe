import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TestSchema = z.object({ integracao_id: z.string().uuid() });
const DispatchSchema = z.object({ atendimento_id: z.string().uuid() });

type IntegracaoRow = {
  id: string;
  nome: string;
  provider: string;
  webhook_url: string;
  secret: string | null;
  headers: Record<string, string> | null;
  ativo: boolean;
  empreendimento_id: string | null;
};

async function postWebhook(integ: IntegracaoRow, payload: unknown) {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((integ.headers ?? {}) as Record<string, string>),
  };
  if (integ.secret) {
    headers["X-Roleta-Signature"] = createHmac("sha256", integ.secret).update(body).digest("hex");
  }
  const res = await fetch(integ.webhook_url, { method: "POST", headers, body });
  return { status: res.status, ok: res.ok };
}

export const testarIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TestSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: integ, error } = await context.supabase
      .from("integracoes_crm")
      .select("id,nome,provider,webhook_url,secret,headers,ativo,empreendimento_id")
      .eq("id", data.integracao_id)
      .maybeSingle();
    if (error || !integ) throw new Error(error?.message ?? "Integração não encontrada");

    const sample = {
      evento: "teste",
      origem: "roleta-corretor",
      timestamp: new Date().toISOString(),
      atendimento: {
        cliente_nome: "Cliente Teste",
        cliente_telefone: "+55 11 99999-9999",
        cliente_email: "teste@exemplo.com",
        empreendimento: { nome: "Empreendimento Demo", cnpj: "00.000.000/0001-00" },
        corretor: { nome: "Corretor Demo" },
        status: "aberto",
      },
    };
    return await postWebhook(integ as IntegracaoRow, sample);
  });

export const enviarAtendimentoCRM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DispatchSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: at, error } = await supabase
      .from("atendimentos")
      .select("id,status,cliente_nome,cliente_email,cliente_telefone,observacoes,iniciado_em,finalizado_em,empreendimento_id,corretor_id")
      .eq("id", data.atendimento_id)
      .maybeSingle();
    if (error || !at) throw new Error(error?.message ?? "Atendimento não encontrado");

    const [empRes, corRes] = await Promise.all([
      supabase.from("empreendimentos").select("nome,cnpj,endereco").eq("id", at.empreendimento_id).maybeSingle(),
      supabase.from("corretores").select("nome,telefone,email,creci").eq("id", at.corretor_id).maybeSingle(),
    ]);
    const atendimento = { ...at, empreendimento: empRes.data ?? null, corretor: corRes.data ?? null };

    const { data: integs, error: ie } = await supabase
      .from("integracoes_crm")
      .select("id,nome,provider,webhook_url,secret,headers,ativo,empreendimento_id")
      .eq("ativo", true);
    if (ie) throw new Error(ie.message);

    const targets = (integs as IntegracaoRow[]).filter(
      (i) => !i.empreendimento_id || i.empreendimento_id === at.empreendimento_id,
    );

    const payload = {
      evento: "atendimento.enviado",
      origem: "roleta-corretor",
      timestamp: new Date().toISOString(),
      atendimento: at,
    };

    let enviados = 0;
    const erros: { integracao: string; status?: number; erro?: string }[] = [];
    for (const t of targets) {
      try {
        const r = await postWebhook(t, payload);
        if (r.ok) enviados++;
        else erros.push({ integracao: t.nome, status: r.status });
      } catch (e) {
        erros.push({ integracao: t.nome, erro: e instanceof Error ? e.message : "erro" });
      }
    }

    return { enviados, total: targets.length, erros };
  });
