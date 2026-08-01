import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  empreendimento_id: z.string().uuid().optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AusenciaItem = {
  id: string;
  data: string;
  inicio: string;
  fim: string | null;
  duracao_minutos: number | null;
  origem: string;
  corretor: { id: string; nome: string; creci: string | null } | null;
};

/** Histórico detalhado de ausências (início, fim e duração) por empreendimento/período. */
export const listarAusencias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const hoje = new Date().toISOString().slice(0, 10);
    const ate = data.ate ?? hoje;
    const de = data.de ?? ate;

    let q = supabase
      .from("ausencias" as never)
      .select("id, data, inicio, fim, duracao_minutos, origem, corretor_id")
      .gte("data", de)
      .lte("data", ate)
      .order("inicio", { ascending: false });
    if (data.empreendimento_id) q = q.eq("empreendimento_id", data.empreendimento_id);

    const { data: rows, error } = await q;
    if (error) throw new Error("Erro ao listar ausências.");
    const list = (rows ?? []) as unknown as Array<{
      id: string; data: string; inicio: string; fim: string | null;
      duracao_minutos: number | null; origem: string; corretor_id: string;
    }>;

    const ids = Array.from(new Set(list.map((r) => r.corretor_id)));
    const { data: corretores } = ids.length
      ? await supabase.from("corretores").select("id, nome, creci").in("id", ids)
      : { data: [] as Array<{ id: string; nome: string; creci: string | null }> };
    const cMap = new Map((corretores ?? []).map((c) => [c.id, c]));

    const now = Date.now();
    const ausencias: AusenciaItem[] = list.map((r) => ({
      id: r.id,
      data: r.data,
      inicio: r.inicio,
      fim: r.fim,
      duracao_minutos:
        r.duracao_minutos ??
        Math.max(0, Math.round((now - new Date(r.inicio).getTime()) / 60000)),
      origem: r.origem,
      corretor: cMap.get(r.corretor_id) ?? null,
    }));

    const total = ausencias.reduce((s, a) => s + (a.duracao_minutos ?? 0), 0);
    return { ausencias, total_minutos: total };
  });
