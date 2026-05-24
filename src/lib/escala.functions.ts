import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const ListInput = z.object({ empreendimento_id: z.string().uuid() });

export const listarEscalaSemanal = createServerFn({ method: "POST" })
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data }) => {
    const dias = semanaUteis();
    const [{ data: fer }, { data: slots }, { data: cs }] = await Promise.all([
      supabaseAdmin.from("feriados").select("data").eq("empreendimento_id", data.empreendimento_id).in("data", dias),
      supabaseAdmin
        .from("escala_semanal")
        .select("id, data, equipe, corretor_id")
        .eq("empreendimento_id", data.empreendimento_id)
        .in("data", dias),
      supabaseAdmin.from("corretores").select("id, nome, creci, equipe").eq("empreendimento_id", data.empreendimento_id).eq("ativo", true),
    ]);

    const feriadoSet = new Set((fer ?? []).map((f) => f.data as string));
    const cMap = new Map((cs ?? []).map((c) => [c.id, c]));

    const slotsBy = new Map<string, { id: string; corretor_id: string | null }>();
    (slots ?? []).forEach((s) => slotsBy.set(`${s.equipe}|${s.data}`, { id: s.id, corretor_id: s.corretor_id }));

    const equipes = ["alfa", "beta"] as const;
    const escala = equipes.map((equipe) => ({
      equipe,
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
            corretor: corr ? { id: corr.id, nome: corr.nome, creci: corr.creci } : null,
          };
        }),
    }));

    return { feriados: Array.from(feriadoSet), escala };
  });

const InscreverInput = z.object({
  empreendimento_id: z.string().uuid(),
  equipe: z.enum(["alfa", "beta"]),
  nome: z.string().trim().min(2).max(120),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const inscreverEscala = createServerFn({ method: "POST" })
  .inputValidator((d) => InscreverInput.parse(d))
  .handler(async ({ data }) => {
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
      .select("id, data, corretor_id")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("equipe", data.equipe)
      .in("data", dias);

    const jaInscrito = (existentes ?? []).find((s) => s.corretor_id === corretor.id);
    if (jaInscrito) {
      const dt = new Date(`${jaInscrito.data}T12:00:00`);
      return {
        ok: true,
        ja_inscrito: true,
        data: jaInscrito.data,
        data_br: dt.toLocaleDateString("pt-BR"),
        dia_semana: DIAS[dt.getDay()],
        corretor_nome: corretor.nome,
      };
    }

    const ocupadoNoDia = (existentes ?? []).find((s) => s.data === data.data && s.corretor_id);
    if (ocupadoNoDia) throw new Error("Esse dia já está ocupado para a Equipe " + data.equipe.toUpperCase());

    const { error: insErr } = await supabaseAdmin
      .from("escala_semanal")
      .insert({
        empreendimento_id: data.empreendimento_id,
        equipe: data.equipe,
        data: data.data,
        corretor_id: corretor.id,
      });
    if (insErr) throw new Error(insErr.message);

    const dt = new Date(`${data.data}T12:00:00`);
    return {
      ok: true,
      ja_inscrito: false,
      data: data.data,
      data_br: dt.toLocaleDateString("pt-BR"),
      dia_semana: DIAS[dt.getDay()],
      corretor_nome: corretor.nome,
    };
  });
