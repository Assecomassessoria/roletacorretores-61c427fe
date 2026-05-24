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

    // FILA JUSTA — quando a triagem encaminha para a roleta (action = "roleta"),
    // o sistema escolhe o corretor presente com MENOR número de atendimentos na
    // semana e, em caso de empate, o de menor ordem_roleta. Assim a próxima
    // triagem encontra contagens atualizadas e nunca cai duas vezes seguidas
    // no mesmo corretor — não é "sorteio", é fila justa.
    let corretorEscolhido: { id: string; nome: string; atendimentos_semana: number } | null = null;
    let atendimentoId: string | null = null;

    if (opcao.action === "roleta" || opcao.action === "alocar_roleta") {
      const today = new Date().toISOString().slice(0, 10);
      const wkRef = new Date();
      wkRef.setDate(wkRef.getDate() - wkRef.getDay()); // domingo
      const wkStart = wkRef.toISOString().slice(0, 10);

      const [{ data: corretores }, { data: plantoes }, { data: atendimentosSemana }] = await Promise.all([
        supabase
          .from("corretores")
          .select("id, nome, ordem_roleta")
          .eq("empreendimento_id", data.empreendimento_id)
          .eq("ativo", true),
        supabase
          .from("plantoes")
          .select("id, corretor_id, presenca_confirmada_em")
          .eq("empreendimento_id", data.empreendimento_id)
          .eq("data", today)
          .not("presenca_confirmada_em", "is", null),
        supabase
          .from("atendimentos")
          .select("corretor_id")
          .eq("empreendimento_id", data.empreendimento_id)
          .gte("iniciado_em", `${wkStart}T00:00:00Z`),
      ]);

      const presentes = new Set((plantoes ?? []).map((p: any) => p.corretor_id));
      const counts: Record<string, number> = {};
      (atendimentosSemana ?? []).forEach((a: any) => {
        counts[a.corretor_id] = (counts[a.corretor_id] ?? 0) + 1;
      });

      const fila = (corretores ?? [])
        .filter((c: any) => presentes.has(c.id))
        .map((c: any) => ({
          id: c.id as string,
          nome: c.nome as string,
          ordem_roleta: (c.ordem_roleta ?? 0) as number,
          atendimentos_semana: counts[c.id] ?? 0,
        }))
        .sort(
          (a, b) =>
            a.atendimentos_semana - b.atendimentos_semana ||
            a.ordem_roleta - b.ordem_roleta,
        );

      const escolhido = fila[0];
      if (escolhido) {
        const plantaoId =
          (plantoes ?? []).find((p: any) => p.corretor_id === escolhido.id)?.id ?? null;

        // Cria o atendimento — isso atualiza imediatamente a contagem da semana,
        // garantindo que a próxima triagem use a fila correta.
        const { data: novoAtd, error: atdErr } = await supabase
          .from("atendimentos")
          .insert({
            empreendimento_id: data.empreendimento_id,
            corretor_id: escolhido.id,
            plantao_id: plantaoId,
            cliente_nome: data.cliente_nome ?? "Visitante",
            cliente_telefone: data.cliente_telefone ?? null,
            observacoes: "Encaminhado automaticamente pela Mesa de Triagem (opção B)",
            criado_por: userId,
          })
          .select("id")
          .single();

        if (atdErr) throw new Error(atdErr.message);
        atendimentoId = novoAtd?.id ?? null;
        corretorEscolhido = {
          id: escolhido.id,
          nome: escolhido.nome,
          atendimentos_semana: escolhido.atendimentos_semana,
        };
      }
    }

    const { data: inserted, error } = await supabase
      .from("triagens")
      .insert({
        atendimento_id: atendimentoId ?? data.atendimento_id ?? null,
        empreendimento_id: data.empreendimento_id,
        opcao_codigo: opcao.codigo,
        acao: opcao.action,
        origem: data.origem,
        cliente_nome: data.cliente_nome ?? null,
        cliente_telefone: data.cliente_telefone ?? null,
        payload: {
          ...(data.payload ?? {}),
          corretor_escolhido: corretorEscolhido,
        } as never,
        criado_por: userId,
      })
      .select("id, opcao_codigo, acao, created_at")
      .single();

    if (error) throw new Error(error.message);
    return {
      triagem: inserted,
      opcao: { codigo: opcao.codigo, label: opcao.label, action: opcao.action },
      corretor: corretorEscolhido,
      atendimento_id: atendimentoId,
    };
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
