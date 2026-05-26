import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function semanaUteis(base = new Date()): string[] {
  const d = new Date(base);
  const dow = d.getDay();
  const diffSeg = dow === 0 ? -6 : 1 - dow;
  const seg = new Date(d);
  seg.setDate(d.getDate() + diffSeg);
  return Array.from({ length: 5 }, (_, i) => {
    const x = new Date(seg);
    x.setDate(seg.getDate() + i);
    return isoDate(x);
  });
}

const MASTER_EMAILS = new Set([
  "contatoapps@simuladorcorretorelite.com.br",
  "contato@assecomassessoria.net.br",
]);

/** Garante que o caller pertence ao empreendimento (membro, corretor ou master). */
async function ensureMembroEmpreendimento(
  ctx: { userId: string; supabase: any; claims: any },
  empreendimentoId: string,
) {
  const email = (ctx.claims?.email as string | undefined)?.toLowerCase();
  if (email && MASTER_EMAILS.has(email)) return;
  const { data, error } = await ctx.supabase.rpc("user_in_empreendimento", {
    _uid: ctx.userId,
    _emp: empreendimentoId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sem permissão para este empreendimento.");
}

/** Garante que o caller é coordenador (ou superior) no empreendimento. */
async function ensureCoordenadorOuSuperior(
  ctx: { userId: string; supabase: any; claims: any },
  empreendimentoId: string,
) {
  const email = (ctx.claims?.email as string | undefined)?.toLowerCase();
  if (email && MASTER_EMAILS.has(email)) return;
  const roles: Array<"incorporadora" | "gerente" | "coordenador"> = [
    "incorporadora",
    "gerente",
    "coordenador",
  ];
  for (const r of roles) {
    const { data } = await ctx.supabase.rpc("has_role_in_empreendimento", {
      _user_id: ctx.userId,
      _role: r,
      _empreendimento_id: empreendimentoId,
    });
    if (data === true) return;
  }
  throw new Error("Apenas Coordenador, Gerente ou Incorporadora podem executar esta ação.");
}

const ListInput = z.object({ empreendimento_id: z.string().uuid() });

export const listarEscalaSemanal = createServerFn({ method: "POST" })
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data }) => {
    // Leitura pública: a página /plantao é acessível sem login.
    const dias = semanaUteis();
    const [{ data: fer }, { data: slots }, { data: cs }, { data: emp }] = await Promise.all([
      supabaseAdmin.from("feriados").select("data").eq("empreendimento_id", data.empreendimento_id).in("data", dias),
      supabaseAdmin
        .from("escala_semanal")
        .select("id, data, equipe, corretor_id, periodos")
        .eq("empreendimento_id", data.empreendimento_id)
        .in("data", dias),
      supabaseAdmin.from("corretores").select("id, nome, creci, equipe").eq("empreendimento_id", data.empreendimento_id).eq("ativo", true),
      supabaseAdmin
        .from("empreendimentos")
        .select("equipe_alfa_nome, equipe_beta_nome")
        .eq("id", data.empreendimento_id)
        .maybeSingle(),
    ]);

    const feriadoSet = new Set((fer ?? []).map((f) => f.data as string));
    const cMap = new Map((cs ?? []).map((c) => [c.id, c]));

    const slotsBy = new Map<string, { id: string; corretor_id: string | null; periodos: string[] }>();
    (slots ?? []).forEach((s: any) =>
      slotsBy.set(`${s.equipe}|${s.data}`, {
        id: s.id,
        corretor_id: s.corretor_id,
        periodos: (s.periodos ?? ["manha", "tarde"]) as string[],
      }),
    );

    const equipes = ["alfa", "beta"] as const;
    const nomesEquipes: Record<string, string> = {
      alfa: (emp as any)?.equipe_alfa_nome ?? "Equipe Alfa",
      beta: (emp as any)?.equipe_beta_nome ?? "Equipe Beta",
    };
    const escala = equipes.map((equipe) => ({
      equipe,
      equipe_nome: nomesEquipes[equipe],
      itens: dias
        .filter((d) => !feriadoSet.has(d))
        .map((d) => {
          const key = `${equipe}|${d}`;
          const s = slotsBy.get(key);
          const corr = s?.corretor_id ? cMap.get(s.corretor_id) : null;
          const dt = new Date(`${d}T12:00:00`);
          return {
            data: d,
            data_br: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            dia_semana: DIAS[dt.getDay()],
            slot_id: s?.id ?? null,
            periodos: s?.periodos ?? [],
            corretor: corr ? { id: corr.id, nome: corr.nome, creci: corr.creci, equipe: (corr as any).equipe ?? null } : null,
          };
        }),
    }));

    return { feriados: Array.from(feriadoSet), escala, equipe_alfa_nome: nomesEquipes.alfa, equipe_beta_nome: nomesEquipes.beta };
  });


const InscreverInput = z.object({
  empreendimento_id: z.string().uuid(),
  equipe: z.enum(["alfa", "beta"]),
  nome: z.string().trim().min(2).max(120),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodos: z
    .array(z.enum(["manha", "tarde"]))
    .min(1, "Selecione ao menos um período")
    .default(["manha", "tarde"]),
});

export const inscreverEscala = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InscreverInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureMembroEmpreendimento(context, data.empreendimento_id);

    const dias = semanaUteis();
    if (!dias.includes(data.data)) throw new Error("Selecione um dia útil da semana corrente");

    const { data: fer } = await supabaseAdmin
      .from("feriados")
      .select("data")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("data", data.data);
    if ((fer ?? []).length) throw new Error("Esse dia é feriado");

    const termo = data.nome.trim();
    const { data: matches } = await supabaseAdmin
      .from("corretores")
      .select("id, nome, ativo")
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("nome", `%${termo}%`)
      .limit(5);
    if (!matches || matches.length === 0) throw new Error("Corretor não encontrado neste empreendimento");
    const exato = matches.find((m) => m.nome.toLowerCase() === termo.toLowerCase());
    if (matches.length > 1 && !exato) throw new Error("Mais de um corretor encontrado — informe o nome completo");
    const corretor = exato ?? matches[0];
    if (!corretor.ativo) throw new Error("Corretor inativo");

    const { data: existentes } = await supabaseAdmin
      .from("escala_semanal")
      .select("id, data, corretor_id, periodos")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("equipe", data.equipe)
      .in("data", dias);

    const jaInscrito = (existentes ?? []).find((s: any) => s.corretor_id === corretor.id);
    if (jaInscrito) {
      const dt = new Date(`${jaInscrito.data}T12:00:00`);
      return {
        ok: true,
        ja_inscrito: true,
        data: jaInscrito.data,
        data_br: dt.toLocaleDateString("pt-BR"),
        dia_semana: DIAS[dt.getDay()],
        corretor_nome: corretor.nome,
        periodos: (jaInscrito as any).periodos ?? [],
      };
    }

    const ocupadoNoDia = (existentes ?? []).find((s: any) => s.data === data.data && s.corretor_id);
    if (ocupadoNoDia) throw new Error("Esse dia já está ocupado para a Equipe " + data.equipe.toUpperCase());

    const { error: insErr } = await supabaseAdmin
      .from("escala_semanal")
      .insert({
        empreendimento_id: data.empreendimento_id,
        equipe: data.equipe,
        data: data.data,
        corretor_id: corretor.id,
        periodos: data.periodos,
      } as any);
    if (insErr) throw new Error(insErr.message);

    const dt = new Date(`${data.data}T12:00:00`);
    return {
      ok: true,
      ja_inscrito: false,
      data: data.data,
      data_br: dt.toLocaleDateString("pt-BR"),
      dia_semana: DIAS[dt.getDay()],
      corretor_nome: corretor.nome,
      periodos: data.periodos,
    };
  });

const ResetInput = z.object({
  empreendimento_id: z.string().uuid(),
});

export const resetarEscalaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResetInput.parse(d))
  .handler(async ({ data, context }) => {
    // Apenas Coordenador / Gerente / Incorporadora / Master do empreendimento.
    await ensureCoordenadorOuSuperior(context, data.empreendimento_id);

    const { error, count } = await supabaseAdmin
      .from("escala_semanal")
      .delete({ count: "exact" })
      .eq("empreendimento_id", data.empreendimento_id);
    if (error) throw new Error(error.message);

    return { ok: true, removidos: count ?? 0 };
  });
