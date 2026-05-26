import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function distMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const PingInput = z.object({
  plantao_id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
});

/** Envia um heartbeat de localização para um plantão.
 *  Dentro do raio → marca presente. Fora → registra fora_desde (preservando o primeiro). */
export const pingPresenca = createServerFn({ method: "POST" })
  .inputValidator((d) => PingInput.parse(d))
  .handler(async ({ data }) => {
    const { data: p, error: pe } = await supabaseAdmin
      .from("plantoes")
      .select("id, empreendimento_id, fora_desde, status_presenca")
      .eq("id", data.plantao_id)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!p) throw new Error("Plantão não encontrado");

    const { data: emp } = await supabaseAdmin
      .from("empreendimentos")
      .select("latitude, longitude, raio_metros")
      .eq("id", p.empreendimento_id)
      .single();
    if (!emp?.latitude || !emp.longitude) {
      return { ok: false, motivo: "empreendimento sem coordenadas" };
    }

    const dist = distMeters(data.lat, data.lng, emp.latitude, emp.longitude);
    const dentro = dist <= emp.raio_metros;
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = { ultimo_ping_em: now };
    if (dentro) {
      patch.fora_desde = null;
      // só reativa se ainda não foi marcado como ausente pelo varredor
      if (p.status_presenca !== "ausente") patch.status_presenca = "presente";
    } else if (!p.fora_desde) {
      patch.fora_desde = now;
    }

    const { error } = await supabaseAdmin
      .from("plantoes")
      .update(patch)
      .eq("id", data.plantao_id);
    if (error) throw new Error(error.message);

    return { ok: true, dentro, distancia: Math.round(dist) };
  });

const VarrerInput = z.object({ empreendimento_id: z.string().uuid() });

/** Marca como ausentes os plantões cujo fora_desde excedeu o período configurado. */
export const varrerAusentes = createServerFn({ method: "POST" })
  .inputValidator((d) => VarrerInput.parse(d))
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: emp } = await supabaseAdmin
      .from("empreendimentos")
      .select("periodo_ausencia_minutos")
      .eq("id", data.empreendimento_id)
      .single();
    const minutos = (emp as any)?.periodo_ausencia_minutos ?? 60;
    const limite = new Date(Date.now() - minutos * 60_000).toISOString();

    const { data: alvos } = await supabaseAdmin
      .from("plantoes")
      .select("id")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("data", today)
      .neq("status_presenca", "ausente")
      .not("fora_desde", "is", null)
      .lte("fora_desde", limite);

    if (!alvos || alvos.length === 0) return { ok: true, marcados: 0 };

    const ids = alvos.map((a) => a.id);
    const { error } = await supabaseAdmin
      .from("plantoes")
      .update({ status_presenca: "ausente", status: "ausente" } as any)
      .in("id", ids);
    if (error) throw new Error(error.message);

    return { ok: true, marcados: ids.length };
  });

const ReativarInput = z.object({ plantao_id: z.string().uuid() });

/** Coordenador/admin reativa manualmente um corretor marcado como ausente. */
export const reativarPresenca = createServerFn({ method: "POST" })
  .inputValidator((d) => ReativarInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("plantoes")
      .update({
        status_presenca: "presente",
        status: "em_andamento",
        fora_desde: null,
        ultimo_ping_em: new Date().toISOString(),
      } as any)
      .eq("id", data.plantao_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
