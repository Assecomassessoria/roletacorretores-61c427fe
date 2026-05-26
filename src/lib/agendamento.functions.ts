import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Schema = z.object({
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_whatsapp: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
  cliente_email: z.string().trim().email().max(180).optional().nullable(),
  data_agendamento: z.string().min(10).max(10), // YYYY-MM-DD
});

export const criarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve corretor logado
    const { data: corretor, error: corrErr } = await supabase
      .from("corretores")
      .select("id, nome, empreendimento_id, creci, telefone")
      .eq("user_id", userId)
      .maybeSingle();
    if (corrErr) throw new Error(corrErr.message);
    if (!corretor) throw new Error("Você precisa estar cadastrado como corretor para criar agendamentos.");

    const { data: triagem, error } = await supabase
      .from("triagens")
      .insert({
        empreendimento_id: corretor.empreendimento_id,
        opcao_codigo: "A",
        acao: "agendamento_corretor",
        origem: "painel",
        status: "aguardando",
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_whatsapp,
        criado_por: userId,
        payload: {
          origem_canal: "agendamento_corretor",
          agendamento: {
            corretor_id: corretor.id,
            corretor_nome: corretor.nome,
            data_agendamento: data.data_agendamento,
            cliente_email: data.cliente_email ?? null,
          },
        } as never,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      triagem_id: triagem.id,
      corretor: { id: corretor.id, nome: corretor.nome },
    };
  });

export const listarMeusAgendamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: corretor } = await supabase
      .from("corretores")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!corretor) return { agendamentos: [] };

    const { data, error } = await supabase
      .from("triagens")
      .select("id, cliente_nome, cliente_telefone, status, created_at, payload, atendimento_id")
      .eq("criado_por", userId)
      .eq("acao", "agendamento_corretor")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    return {
      agendamentos: (data ?? []).map((t: any) => ({
        id: t.id,
        cliente_nome: t.cliente_nome,
        cliente_telefone: t.cliente_telefone,
        cliente_email: t.payload?.agendamento?.cliente_email ?? null,
        data_agendamento: t.payload?.agendamento?.data_agendamento ?? null,
        status: t.status,
        atendimento_id: t.atendimento_id,
        created_at: t.created_at,
      })),
    };
  });
