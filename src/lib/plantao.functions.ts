import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  creci: z.string().trim().min(2).max(40),
  senha: z.string().min(4).max(64),
  empreendimento_id: z.string().uuid(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  wifi_ssid: z.string().max(64).optional(),
  qr_token: z.string().max(120).optional(),
  pin: z.string().max(20).optional(),
});

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const checkInPlantao = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    // 1. Localizar corretor pelo CRECI no empreendimento
    const { data: corretor, error: cErr } = await supabaseAdmin
      .from("corretores")
      .select("id, nome, telefone, email, creci, user_id, empreendimento_id, ativo, ordem_roleta")
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("creci", data.creci.trim())
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!corretor) throw new Error("CRECI não encontrado neste empreendimento");
    if (!corretor.ativo) throw new Error("Corretor inativo");
    if (!corretor.email) throw new Error("Corretor sem e-mail cadastrado — fale com o coordenador");

    // 2. Validar senha via signInWithPassword em cliente isolado
    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: signed, error: sErr } = await authClient.auth.signInWithPassword({
      email: corretor.email,
      password: data.senha,
    });
    if (sErr || !signed?.user) throw new Error("Senha incorreta");

    // 3. Carregar empreendimento e verificar método(s) de presença
    const { data: emp, error: eErr } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, latitude, longitude, raio_metros, wifi_ssid, qrcode_token, metodos_presenca")
      .eq("id", data.empreendimento_id)
      .single();
    if (eErr || !emp) throw new Error("Empreendimento não encontrado");

    const metodos = (emp.metodos_presenca ?? ["geofence"]) as string[];
    let metodoOk: string | null = null;
    let distancia: number | null = null;

    if (metodos.includes("geofence") && data.latitude != null && data.longitude != null && emp.latitude != null && emp.longitude != null) {
      const d = distMeters(data.latitude, data.longitude, emp.latitude, emp.longitude);
      distancia = Math.round(d);
      if (d <= (emp.raio_metros ?? 100)) metodoOk = "geofence";
    }
    if (!metodoOk && metodos.includes("wifi") && data.wifi_ssid && emp.wifi_ssid) {
      if (data.wifi_ssid.trim().toLowerCase() === emp.wifi_ssid.trim().toLowerCase()) metodoOk = "wifi";
    }
    if (!metodoOk && metodos.includes("qrcode") && data.qr_token && emp.qrcode_token) {
      if (data.qr_token === emp.qrcode_token) metodoOk = "qrcode";
    }
    if (!metodoOk && metodos.includes("pin") && data.pin) {
      // PIN simples: aceitar enquanto não houver gerador. Mantém presença manual sob log.
      if (data.pin.length >= 4) metodoOk = "pin";
    }

    if (!metodoOk) {
      const msg =
        distancia != null
          ? `Fora do raio permitido (${distancia}m). Verifique localização, Wi-Fi ou QR Code do stand.`
          : "Não foi possível confirmar sua presença no stand. Verifique localização, Wi-Fi, QR Code ou PIN.";
      throw new Error(msg);
    }

    // 4. Garantir plantão de hoje
    const today = todayISO();
    let plantaoId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("plantoes")
      .select("id, presenca_confirmada_em")
      .eq("corretor_id", corretor.id)
      .eq("data", today)
      .maybeSingle();

    if (existing) {
      plantaoId = existing.id;
    } else {
      const { data: novo, error: nErr } = await supabaseAdmin
        .from("plantoes")
        .insert({
          corretor_id: corretor.id,
          empreendimento_id: corretor.empreendimento_id,
          data: today,
          hora_inicio: "08:00",
          hora_fim: "18:00",
          status: "em_andamento",
        })
        .select("id")
        .single();
      if (nErr) throw new Error(nErr.message);
      plantaoId = novo.id;
    }

    // 5. Marcar presença
    const { error: upErr } = await supabaseAdmin
      .from("plantoes")
      .update({
        presenca_confirmada_em: new Date().toISOString(),
        presenca_lat: data.latitude ?? null,
        presenca_lng: data.longitude ?? null,
        status: "em_andamento",
      })
      .eq("id", plantaoId!);
    if (upErr) throw new Error(upErr.message);

    return {
      ok: true,
      metodo: metodoOk,
      distancia,
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        telefone: corretor.telefone,
        creci: corretor.creci,
      },
      empreendimento: { id: emp.id, nome: emp.nome },
    };
  });

const ListInput = z.object({});
export const listarEmpreendimentosPublico = createServerFn({ method: "GET" })
  .inputValidator(() => ListInput.parse({}))
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return { empreendimentos: data ?? [] };
  });

// Roleta do dia (público) — fila dos corretores com presença confirmada hoje,
// ordenada por menor número de atendimentos na semana + ordem_roleta.
const RoletaInput = z.object({ empreendimento_id: z.string().uuid() });
export const roletaDoDiaPublico = createServerFn({ method: "POST" })
  .inputValidator((d) => RoletaInput.parse(d))
  .handler(async ({ data }) => {
    const today = todayISO();
    const wk = new Date();
    wk.setDate(wk.getDate() - wk.getDay());
    const wkStart = wk.toISOString().slice(0, 10);

    const [{ data: emp }, { data: cs }, { data: ps }, { data: ats }] = await Promise.all([
      supabaseAdmin.from("empreendimentos").select("id, nome").eq("id", data.empreendimento_id).maybeSingle(),
      supabaseAdmin.from("corretores").select("id, nome, telefone, creci, ordem_roleta, ativo").eq("empreendimento_id", data.empreendimento_id).eq("ativo", true),
      supabaseAdmin.from("plantoes").select("corretor_id, presenca_confirmada_em, status").eq("empreendimento_id", data.empreendimento_id).eq("data", today),
      supabaseAdmin.from("atendimentos").select("corretor_id").eq("empreendimento_id", data.empreendimento_id).gte("iniciado_em", `${wkStart}T00:00:00Z`),
    ]);

    if (!emp) throw new Error("Empreendimento não encontrado");

    const counts: Record<string, number> = {};
    (ats ?? []).forEach((a: { corretor_id: string }) => {
      counts[a.corretor_id] = (counts[a.corretor_id] ?? 0) + 1;
    });

    const presentes = (cs ?? []).filter((c) =>
      (ps ?? []).some((p) => p.corretor_id === c.id && p.presenca_confirmada_em),
    );

    const fila = presentes
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        creci: c.creci,
        telefone: c.telefone,
        atendimentos_semana: counts[c.id] ?? 0,
        ordem_roleta: c.ordem_roleta ?? 0,
      }))
      .sort((a, b) => a.atendimentos_semana - b.atendimentos_semana || a.ordem_roleta - b.ordem_roleta);

    return {
      empreendimento: emp,
      data: today,
      total_presentes: fila.length,
      proximo_id: fila[0]?.id ?? null,
      fila,
    };
  });
