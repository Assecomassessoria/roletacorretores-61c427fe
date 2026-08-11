import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
async function signFoto(urlOrPath: string | null): Promise<string | null> {
  if (!urlOrPath) return null;
  let path = urlOrPath;
  if (urlOrPath.startsWith("http")) {
    const m = urlOrPath.match(PUBLIC_RE);
    if (!m || m[1] !== "corretores") return null;
    path = decodeURIComponent(m[2]);
  }
  const { data, error } = await supabaseAdmin.storage.from("corretores").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

const Input = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  empreendimento_id: z.string().uuid().optional(),
});

export const listarPresencasDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const dia = data.data ?? new Date().toISOString().slice(0, 10);

    // Verifica privilégio admin/master para permitir consulta sem filtro
    const { data: master } = await supabaseAdmin.rpc("is_master", { _user_id: userId });
    const { data: rolesRows } = await supabaseAdmin
      .from("user_roles").select("role, empreendimento_id").eq("user_id", userId);
    const isAdmin = !!master || (rolesRows ?? []).some((r) =>
      ["incorporadora", "gerente"].includes(r.role as string));

    if (!data.empreendimento_id && !isAdmin) {
      throw new Error("Informe o empreendimento.");
    }
    if (data.empreendimento_id && !isAdmin) {
      const { data: ok } = await supabaseAdmin.rpc("user_in_empreendimento", {
        _uid: userId, _emp: data.empreendimento_id,
      });
      if (!ok) throw new Error("Sem permissão para este empreendimento.");
    }

    let q = supabase
      .from("plantoes")
      .select("id, data, hora_inicio, hora_fim, status, status_presenca, fora_desde, presenca_confirmada_em, presenca_lat, presenca_lng, corretor_id, empreendimento_id")
      .eq("data", dia)
      .not("presenca_confirmada_em", "is", null)
      .order("presenca_confirmada_em", { ascending: false });
    if (data.empreendimento_id) q = q.eq("empreendimento_id", data.empreendimento_id);

    const { data: rows, error } = await q;
    if (error) throw new Error("Erro ao listar presenças.");
    const list = rows ?? [];

    const corretorIds = Array.from(new Set(list.map((r) => r.corretor_id).filter(Boolean)));
    const empIds = Array.from(new Set(list.map((r) => r.empreendimento_id).filter(Boolean)));

    const [{ data: corretores }, { data: emps }] = await Promise.all([
      corretorIds.length
        ? supabase.from("corretores").select("id, nome, creci, telefone, foto_url").in("id", corretorIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string; creci: string | null; telefone: string | null; foto_url: string | null }> }),
      empIds.length
        ? supabase.from("empreendimentos").select("id, nome, metodos_presenca, latitude, longitude, raio_metros").in("id", empIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string; metodos_presenca: string[] | null; latitude: number | null; longitude: number | null; raio_metros: number | null }> }),
    ]);

    const cMap = new Map((corretores ?? []).map((c) => [c.id, c]));
    const eMap = new Map((emps ?? []).map((e) => [e.id, e]));

    const ids = list.map((r) => `plantao:${r.id}`);
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

    const presencas = await Promise.all(list.map(async (r) => {
      const c = cMap.get(r.corretor_id) ?? null;
      return {
        plantao_id: r.id,
        confirmado_em: r.presenca_confirmada_em,
        status: r.status,
        status_presenca: (r as any).status_presenca ?? null,
        fora_desde: (r as any).fora_desde ?? null,
        hora_inicio: r.hora_inicio,
        hora_fim: r.hora_fim,
        lat: r.presenca_lat,
        lng: r.presenca_lng,
        corretor: c ? { ...c, foto_url: await signFoto(c.foto_url) } : null,
        empreendimento: eMap.get(r.empreendimento_id) ?? null,
        auditoria: auditByPlantao.get(r.id) ?? null,
      };
    }));

    return {
      data: dia,
      total: list.length,
      presencas,
    };
  });
