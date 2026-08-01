import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

async function userInEmpreendimento(supabase: any, userId: string, empId: string) {
  const { data } = await supabase.rpc("user_in_empreendimento", { _uid: userId, _emp: empId });
  return !!data;
}

async function userIsCoordinatorLevel(supabase: any, userId: string, empId: string) {
  const roles = ["incorporadora", "gerente", "coordenador"] as const;
  for (const r of roles) {
    const { data } = await supabase.rpc("has_role_in_empreendimento", {
      _user_id: userId,
      _role: r,
      _empreendimento_id: empId,
    });
    if (data) return true;
  }
  const { data: master } = await supabase.rpc("is_master", { _user_id: userId });
  return !!master;
}

const PingInput = z.object({
  plantao_id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
});

/** Envia um heartbeat de localização para um plantão.
 *  Dentro do raio → marca presente. Fora → registra fora_desde (preservando o primeiro). */
export const pingPresenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: p, error: pe } = await supabaseAdmin
      .from("plantoes")
      .select("id, empreendimento_id, fora_desde, status_presenca, corretor_id")
      .eq("id", data.plantao_id)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!p) throw new Error("Plantão não encontrado");

    // Apenas o próprio corretor (via vínculo) ou alguém do empreendimento pode pingar.
    const { data: corr } = await supabaseAdmin
      .from("corretores")
      .select("user_id")
      .eq("id", p.corretor_id)
      .maybeSingle();
    const isOwner = corr?.user_id === context.userId;
    const isMember = await userInEmpreendimento(context.supabase, context.userId, p.empreendimento_id);
    if (!isOwner && !isMember) throw new Error("Sem permissão");

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
      if (p.status_presenca !== "ausente") patch.status_presenca = "presente";
    } else if (!p.fora_desde) {
      patch.fora_desde = now;
    }

    const { error } = await supabaseAdmin
      .from("plantoes")
      .update(patch as any)
      .eq("id", data.plantao_id);
    if (error) throw new Error(error.message);

    return { ok: true, dentro, distancia: Math.round(dist) };
  });

const VarrerInput = z.object({ empreendimento_id: z.string().uuid() });

/** Marca como ausentes os plantões cujo fora_desde excedeu o período configurado. */
export const varrerAusentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VarrerInput.parse(d))
  .handler(async ({ data, context }) => {
    const isMember = await userInEmpreendimento(context.supabase, context.userId, data.empreendimento_id);
    if (!isMember) throw new Error("Sem permissão");

    const today = new Date().toISOString().slice(0, 10);

    const { data: emp } = await supabaseAdmin
      .from("empreendimentos")
      .select("periodo_ausencia_minutos")
      .eq("id", data.empreendimento_id)
      .single();
    const minutos = (emp as any)?.periodo_ausencia_minutos ?? 60;
    const limite = new Date(Date.now() - minutos * 60_000).toISOString();

    // 1) Sinal perdido: o corretor tinha rastreamento ativo e parou de enviar ping.
    //    Consideramos que ele saiu do stand no horário do último ping.
    const { data: semSinal } = await supabaseAdmin
      .from("plantoes")
      .select("id, ultimo_ping_em")
      .eq("empreendimento_id", data.empreendimento_id)
      .eq("data", today)
      .eq("status_presenca", "presente")
      .is("fora_desde", null)
      .not("ultimo_ping_em", "is", null)
      .lte("ultimo_ping_em", limite);

    for (const row of semSinal ?? []) {
      await supabaseAdmin
        .from("plantoes")
        .update({ fora_desde: (row as any).ultimo_ping_em } as any)
        .eq("id", row.id);
    }

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
      .update({ status_presenca: "ausente" } as any)
      .in("id", ids);
    if (error) throw new Error(error.message);

    return { ok: true, marcados: ids.length };
  });

const ReativarInput = z.object({ plantao_id: z.string().uuid() });

/** Coordenador/admin reativa manualmente um corretor marcado como ausente. */
export const reativarPresenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReativarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await supabaseAdmin
      .from("plantoes")
      .select("empreendimento_id")
      .eq("id", data.plantao_id)
      .maybeSingle();
    if (!p) throw new Error("Plantão não encontrado");
    const ok = await userIsCoordinatorLevel(context.supabase, context.userId, p.empreendimento_id);
    if (!ok) throw new Error("Apenas coordenadores podem reativar presença");

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
