import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  empreendimento_id: z.string().uuid().optional(),
});

export const listarPresencasDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const dia = data.data ?? new Date().toISOString().slice(0, 10);

    let q = supabase
      .from("plantoes")
      .select(
        "id, data, hora_inicio, hora_fim, status, presenca_confirmada_em, presenca_lat, presenca_lng, " +
          "corretor:corretores!plantoes_corretor_id_fkey(id, nome, creci, telefone, foto_url), " +
          "empreendimento:empreendimentos!plantoes_empreendimento_id_fkey(id, nome, metodos_presenca, wifi_ssid, latitude, longitude, raio_metros)"
      )
      .eq("data", dia)
      .not("presenca_confirmada_em", "is", null)
      .order("presenca_confirmada_em", { ascending: false });
    if (data.empreendimento_id) q = q.eq("empreendimento_id", data.empreendimento_id);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Buscar logs de auditoria recentes
    const ids = (rows ?? []).map((r) => `plantao:${r.id}`);
    let audits: Array<{ recurso: string | null; detalhes: unknown; created_at: string }> = [];
    if (ids.length > 0) {
      const { data: a } = await supabase
        .from("audit_log")
        .select("recurso, detalhes, created_at")
        .eq("acao", "presenca_confirmada")
        .in("recurso", ids)
        .order("created_at", { ascending: false });
      audits = a ?? [];
    }
    const auditByPlantao = new Map<string, { metodo_aprovado: string | null; distancia_m: number | null; checks: Array<{ metodo: string; ok: boolean; detalhe: string }> }>();
    audits.forEach((a) => {
      const key = a.recurso ?? "";
      if (!key.startsWith("plantao:")) return;
      const id = key.slice("plantao:".length);
      if (!auditByPlantao.has(id)) {
        const d = (a.detalhes ?? {}) as Record<string, unknown>;
        auditByPlantao.set(id, {
          metodo_aprovado: (d.metodo_aprovado as string) ?? null,
          distancia_m: (d.distancia_m as number) ?? null,
          checks: ((d.checks as Array<{ metodo: string; ok: boolean; detalhe: string }>) ?? []),
        });
      }
    });

    return {
      data: dia,
      total: rows?.length ?? 0,
      presencas: (rows ?? []).map((r) => ({
        plantao_id: r.id,
        confirmado_em: r.presenca_confirmada_em,
        status: r.status,
        hora_inicio: r.hora_inicio,
        hora_fim: r.hora_fim,
        lat: r.presenca_lat,
        lng: r.presenca_lng,
        corretor: r.corretor,
        empreendimento: r.empreendimento,
        auditoria: auditByPlantao.get(r.id) ?? null,
      })),
    };
  });
