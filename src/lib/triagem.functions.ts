import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RegistrarTriagemSchema = z.object({
  atendimento_id: z.string().uuid().optional().nullable(),
  empreendimento_id: z.string().uuid(),
  opcao_codigo: z.string().min(1).max(4).regex(/^[A-Z]$/),
  origem: z.enum(["painel", "whatsapp", "lorenza"]).default("painel"),
  cliente_nome: z.string().trim().min(1).max(255).optional().nullable(),
  cliente_telefone: z.string().trim().min(1).max(40).optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const registrarTriagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegistrarTriagemSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // resolve action from opcao_codigo
    const { data: opcao, error: opcaoErr } = await supabase
      .from("opcoes_triagem")
      .select("codigo, action, label, ativo")
      .eq("codigo", data.opcao_codigo)
      .maybeSingle();

    if (opcaoErr) throw new Error(opcaoErr.message);
    if (!opcao || !opcao.ativo) {
      throw new Error(`Opção de triagem inválida: ${data.opcao_codigo}`);
    }

    const { data: inserted, error } = await supabase
      .from("triagens")
      .insert({
        atendimento_id: data.atendimento_id ?? null,
        empreendimento_id: data.empreendimento_id,
        opcao_codigo: opcao.codigo,
        acao: opcao.action,
        origem: data.origem,
        cliente_nome: data.cliente_nome ?? null,
        cliente_telefone: data.cliente_telefone ?? null,
        payload: data.payload ?? null,
        criado_por: userId,
      })
      .select("id, opcao_codigo, acao, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { triagem: inserted, opcao: { codigo: opcao.codigo, label: opcao.label, action: opcao.action } };
  });

export const listarOpcoesTriagem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("opcoes_triagem")
      .select("codigo, label, action, ordem, ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return { opcoes: data ?? [] };
  });
