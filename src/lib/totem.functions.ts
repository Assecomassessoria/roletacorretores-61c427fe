import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// =====================================================================
// SERVER FUNCTIONS PÚBLICAS — Totem do Cliente (sem autenticação)
// Usam supabaseAdmin com validação rígida via Zod e retornam apenas
// o mínimo necessário (sem PII de outros usuários).
// =====================================================================

const CriarSchema = z.object({
  empreendimento_id: z.string().uuid(),
  opcao_codigo: z.enum(["A", "B", "C", "D", "E"]),
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
});

/** Cria triagem em status "aguardando" — usada quando o cliente preenche o formulário no totem. */
export const criarTriagemTotem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CriarSchema.parse(input))
  .handler(async ({ data }) => {
    // valida empreendimento
    const { data: emp, error: empErr } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, ativo")
      .eq("id", data.empreendimento_id)
      .eq("ativo", true)
      .maybeSingle();
    if (empErr) throw new Error(empErr.message);
    if (!emp) throw new Error("Empreendimento não encontrado.");

    const { data: opcao } = await supabaseAdmin
      .from("opcoes_triagem")
      .select("codigo, action, label")
      .eq("codigo", data.opcao_codigo)
      .maybeSingle();

    const { data: inserted, error } = await supabaseAdmin
      .from("triagens")
      .insert({
        empreendimento_id: data.empreendimento_id,
        opcao_codigo: data.opcao_codigo,
        acao: opcao?.action ?? "aguardando",
        origem: "painel",
        status: "aguardando",
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        payload: { origem_canal: "totem" } as never,
      })
      .select("id, opcao_codigo, status, cliente_nome, created_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      triagem: inserted,
      empreendimento: { id: emp.id, nome: emp.nome },
      opcao: opcao ?? null,
    };
  });

const TokenSchema = z.object({ triagem_id: z.string().uuid() });

/** Consulta status mínimo (para polling no totem após gerar QR). */
export const consultarTriagemTotem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .rpc("triagem_status_publico", { _triagem_id: data.triagem_id });
    if (error) throw new Error(error.message);
    const r = (row ?? [])[0];
    if (!r) throw new Error("Atendimento não encontrado.");
    return r as { id: string; status: string; cliente_nome: string | null; atendimento_id: string | null; opcao_codigo: string; created_at: string };
  });

/**
 * Dispara o atendimento a partir de uma triagem em "aguardando":
 * aplica fila justa e marca como atendido. Usado quando o cliente
 * (ou recepção) aponta o QR no totem para acionar o corretor.
 */
export const dispararTriagemTotem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: tri, error: triErr } = await supabaseAdmin
      .from("triagens")
      .select("id, empreendimento_id, opcao_codigo, status, cliente_nome, cliente_telefone, atendimento_id, payload")
      .eq("id", data.triagem_id)
      .maybeSingle();
    if (triErr) throw new Error(triErr.message);
    if (!tri) throw new Error("QR inválido — triagem não encontrada.");

    // Se já foi atendido, devolve o corretor original
    if (tri.status === "atendido" && tri.atendimento_id) {
      const { data: atd } = await supabaseAdmin
        .from("atendimentos")
        .select("id, corretor_id, corretores:corretor_id(id, nome, foto_url, creci, telefone)")
        .eq("id", tri.atendimento_id)
        .maybeSingle();
      return {
        status: "atendido" as const,
        triagem_id: tri.id,
        atendimento_id: tri.atendimento_id,
        corretor: (atd?.corretores as any) ?? null,
        opcao_codigo: tri.opcao_codigo,
        cliente_nome: tri.cliente_nome,
      };
    }

    let corretorEscolhido: { id: string; nome: string; foto_url: string | null; creci: string | null; telefone: string | null } | null = null;
    let atendimentoId: string | null = null;

    // Agendamento prévio do corretor — usa o corretor pré-atribuído (não passa pela fila)
    const agendamento = (tri.payload as any)?.agendamento;
    const corretorPreAtribuido: string | null = agendamento?.corretor_id ?? null;

    if (corretorPreAtribuido) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: corretor } = await supabaseAdmin
        .from("corretores")
        .select("id, nome, foto_url, creci, telefone")
        .eq("id", corretorPreAtribuido)
        .maybeSingle();
      if (corretor) {
        const { data: plantao } = await supabaseAdmin
          .from("plantoes")
          .select("id")
          .eq("corretor_id", corretor.id)
          .eq("data", today)
          .maybeSingle();
        const { data: novoAtd, error: atdErr } = await supabaseAdmin
          .from("atendimentos")
          .insert({
            empreendimento_id: tri.empreendimento_id,
            corretor_id: corretor.id,
            plantao_id: plantao?.id ?? null,
            cliente_nome: tri.cliente_nome ?? "Visitante",
            cliente_telefone: tri.cliente_telefone ?? null,
            cliente_email: agendamento?.cliente_email ?? null,
            observacoes: "Agendamento prévio do corretor — QR Code apontado no Totem.",
          })
          .select("id")
          .single();
        if (atdErr) throw new Error(atdErr.message);
        atendimentoId = novoAtd?.id ?? null;
        corretorEscolhido = {
          id: corretor.id,
          nome: corretor.nome,
          foto_url: corretor.foto_url ?? null,
          creci: corretor.creci ?? null,
          telefone: corretor.telefone ?? null,
        };
      }
    } else if (tri.opcao_codigo === "B") {
      const today = new Date().toISOString().slice(0, 10);
      const wkRef = new Date();
      wkRef.setDate(wkRef.getDate() - wkRef.getDay());
      const wkStart = wkRef.toISOString().slice(0, 10);

      const [{ data: corretores }, { data: plantoes }, { data: atendimentosSemana }] = await Promise.all([
        supabaseAdmin
          .from("corretores")
          .select("id, nome, ordem_roleta, foto_url, creci, telefone")
          .eq("empreendimento_id", tri.empreendimento_id)
          .eq("ativo", true),
        supabaseAdmin
          .from("plantoes")
          .select("id, corretor_id, presenca_confirmada_em")
          .eq("empreendimento_id", tri.empreendimento_id)
          .eq("data", today)
          .not("presenca_confirmada_em", "is", null),
        supabaseAdmin
          .from("atendimentos")
          .select("corretor_id")
          .eq("empreendimento_id", tri.empreendimento_id)
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
          id: c.id, nome: c.nome, foto_url: c.foto_url ?? null, creci: c.creci ?? null, telefone: c.telefone ?? null,
          ordem_roleta: c.ordem_roleta ?? 0,
          atendimentos_semana: counts[c.id] ?? 0,
        }))
        .sort((a, b) => a.atendimentos_semana - b.atendimentos_semana || a.ordem_roleta - b.ordem_roleta);

      const escolhido = fila[0];
      if (escolhido) {
        const plantaoId = (plantoes ?? []).find((p: any) => p.corretor_id === escolhido.id)?.id ?? null;
        const { data: novoAtd, error: atdErr } = await supabaseAdmin
          .from("atendimentos")
          .insert({
            empreendimento_id: tri.empreendimento_id,
            corretor_id: escolhido.id,
            plantao_id: plantaoId,
            cliente_nome: tri.cliente_nome ?? "Visitante",
            cliente_telefone: tri.cliente_telefone ?? null,
            observacoes: "Encaminhado automaticamente via Totem do Cliente (QR Code)",
          })
          .select("id")
          .single();
        if (atdErr) throw new Error(atdErr.message);
        atendimentoId = novoAtd?.id ?? null;
        corretorEscolhido = {
          id: escolhido.id, nome: escolhido.nome, foto_url: escolhido.foto_url,
          creci: escolhido.creci, telefone: escolhido.telefone,
        };
      }
    }

    await supabaseAdmin
      .from("triagens")
      .update({ status: "atendido", atendimento_id: atendimentoId })
      .eq("id", tri.id);

    return {
      status: corretorEscolhido ? ("atendido" as const) : ("sem_corretor" as const),
      triagem_id: tri.id,
      atendimento_id: atendimentoId,
      corretor: corretorEscolhido,
      opcao_codigo: tri.opcao_codigo,
      cliente_nome: tri.cliente_nome,
    };
  });

/** Lista pública de empreendimentos ativos (apenas id, nome, logo) para o seletor do totem. */
export const listarEmpreendimentosTotem = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, logo_url, cor_primaria")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return { empreendimentos: data ?? [] };
  });

// =====================================================================
// "Já estou sendo atendido / Esqueci o QR Code"
// O cliente informa seus dados + dados do corretor (Nome, WhatsApp, CRECI).
// Se localizarmos o corretor por CRECI e ele estiver em plantão hoje
// (presença confirmada), criamos o atendimento e devolvemos um link
// wa.me pronto. Caso contrário, registramos triagem em "aguardando"
// para a recepção tratar manualmente.
// =====================================================================
const ReencontroSchema = z.object({
  empreendimento_id: z.string().uuid(),
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
  cliente_email: z.string().trim().email().max(180).optional().nullable(),
  corretor_nome: z.string().trim().min(2).max(120),
  corretor_whatsapp: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
  corretor_creci: z.string().trim().min(2).max(40),
});

export const reencontrarCorretorTotem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReencontroSchema.parse(input))
  .handler(async ({ data }) => {
    // 1) Busca corretor por CRECI (mais confiável que nome)
    const { data: corretor } = await supabaseAdmin
      .from("corretores")
      .select("id, nome, telefone, creci, foto_url")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("ativo", true)
      .eq("creci", data.corretor_creci)
      .maybeSingle();

    // 2) Plantão de hoje com presença confirmada?
    let emPlantao = false;
    let plantaoId: string | null = null;
    if (corretor) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: plantao } = await supabaseAdmin
        .from("plantoes")
        .select("id, presenca_confirmada_em")
        .eq("corretor_id", corretor.id)
        .eq("data", today)
        .not("presenca_confirmada_em", "is", null)
        .maybeSingle();
      emPlantao = !!plantao;
      plantaoId = plantao?.id ?? null;
    }

    // 3) Registra triagem A (Atendido por corretor)
    const { data: triagem, error: triErr } = await supabaseAdmin
      .from("triagens")
      .insert({
        empreendimento_id: data.empreendimento_id,
        opcao_codigo: "A",
        acao: "verificar_presenca",
        origem: "painel",
        status: emPlantao ? "atendido" : "aguardando",
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        payload: {
          origem_canal: "totem_reencontro",
          cliente_email: data.cliente_email ?? null,
          corretor_informado: {
            nome: data.corretor_nome,
            whatsapp: data.corretor_whatsapp,
            creci: data.corretor_creci,
          },
          corretor_match_id: corretor?.id ?? null,
          em_plantao: emPlantao,
        } as never,
      })
      .select("id")
      .single();
    if (triErr) throw new Error(triErr.message);

    // 4) Se em plantão, abre atendimento vinculado
    let atendimentoId: string | null = null;
    if (corretor && emPlantao) {
      const { data: atd, error: atdErr } = await supabaseAdmin
        .from("atendimentos")
        .insert({
          empreendimento_id: data.empreendimento_id,
          corretor_id: corretor.id,
          plantao_id: plantaoId,
          cliente_nome: data.cliente_nome,
          cliente_telefone: data.cliente_telefone,
          cliente_email: data.cliente_email ?? null,
          observacoes:
            "Retorno via Totem (cliente esqueceu o QR). Encaminhado pelo WhatsApp da roleta.",
        })
        .select("id")
        .single();
      if (atdErr) throw new Error(atdErr.message);
      atendimentoId = atd?.id ?? null;
      await supabaseAdmin
        .from("triagens")
        .update({ atendimento_id: atendimentoId })
        .eq("id", triagem.id);
    }

    // 5) Monta link wa.me pronto (preferindo telefone do cadastro)
    const numeroBruto = (corretor?.telefone ?? data.corretor_whatsapp).replace(/\D/g, "");
    const numeroBR = numeroBruto.startsWith("55") ? numeroBruto : `55${numeroBruto}`;
    const msg = encodeURIComponent(
      `Olá ${corretor?.nome ?? data.corretor_nome}, aqui é ${data.cliente_nome}. ` +
      `Retornei ao stand e fui direcionado pela recepção da Roleta. Pode me atender?`,
    );
    const whatsapp_url = `https://wa.me/${numeroBR}?text=${msg}`;

    return {
      triagem_id: triagem.id,
      corretor_encontrado: !!corretor,
      em_plantao: emPlantao,
      corretor: corretor
        ? {
            id: corretor.id,
            nome: corretor.nome,
            foto_url: corretor.foto_url ?? null,
            creci: corretor.creci ?? null,
            telefone: corretor.telefone ?? null,
          }
        : null,
      whatsapp_url,
      atendimento_id: atendimentoId,
    };
  });

// =====================================================================
// "Falar com Gerência / Coordenador" — registra triagem D com flag
// e devolve confirmação para o cliente aguardar a recepção.
// =====================================================================
const GerenciaSchema = z.object({
  empreendimento_id: z.string().uuid(),
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
  motivo: z.string().trim().max(400).optional().nullable(),
});

export const solicitarGerenciaTotem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GerenciaSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: triagem, error } = await supabaseAdmin
      .from("triagens")
      .insert({
        empreendimento_id: data.empreendimento_id,
        opcao_codigo: "D",
        acao: "encaminhar_coordenador",
        origem: "painel",
        status: "aguardando",
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        payload: {
          origem_canal: "totem_gerencia",
          motivo: data.motivo ?? null,
        } as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { triagem_id: triagem.id };
  });

