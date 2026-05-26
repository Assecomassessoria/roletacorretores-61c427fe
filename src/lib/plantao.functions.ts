import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  creci: z.string().trim().min(2).max(40),
  senha: z.string().min(4).max(64).optional(),
  biometric_token: z.string().min(8).max(120).optional(),
  empreendimento_id: z.string().uuid(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  wifi_ssid: z.string().max(64).optional(),
  qr_token: z.string().max(120).optional(),
  pin: z.string().max(20).optional(),
}).refine((d) => !!d.senha || !!d.biometric_token, {
  message: "Informe a senha ou use a biometria.",
  path: ["senha"],
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

const GENERIC_AUTH_ERROR = "CRECI ou senha inválidos.";
const MAX_FALHAS = 5;
const JANELA_MIN = 15;

export const checkInPlantao = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    // Anti brute-force: bloqueia após MAX_FALHAS tentativas na janela
    const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
    const { count: falhas } = await supabaseAdmin
      .from("checkin_falhas")
      .select("id", { count: "exact", head: true })
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("creci", data.creci.trim())
      .gte("tentativa_em", desde);
    if ((falhas ?? 0) >= MAX_FALHAS) {
      throw new Error("Muitas tentativas. Tente novamente em alguns minutos.");
    }

    async function registrarFalha() {
      await supabaseAdmin.from("checkin_falhas").insert({
        empreendimento_id: data.empreendimento_id,
        creci: data.creci.trim(),
      });
    }

    const { data: corretor, error: cErr } = await supabaseAdmin
      .from("corretores")
      .select("id, nome, telefone, email, creci, user_id, empreendimento_id, ativo, ordem_roleta, foto_url")
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("creci", data.creci.trim())
      .maybeSingle();
    if (cErr) { console.error(cErr); throw new Error("Erro ao validar credenciais."); }
    if (!corretor || !corretor.ativo) {
      await registrarFalha();
      throw new Error(GENERIC_AUTH_ERROR);
    }

    // Autentica pelo e-mail REAL do auth user vinculado (se houver),
    // não pelo corretor.email — esses podem ter sido editados separadamente.
    let loginEmail: string | null = null;
    if (corretor.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(corretor.user_id);
      loginEmail = authUser?.user?.email ?? null;
    }
    if (!loginEmail) loginEmail = corretor.email;
    if (!loginEmail) {
      await registrarFalha();
      throw new Error("Corretor ainda não tem acesso habilitado. Peça à gerência para habilitar o login.");
    }

    let authUserId: string | null = null;

    if (data.biometric_token) {
      // Autenticação por biometria — valida token de uso único (TTL 60s)
      const { data: tok } = await supabaseAdmin
        .from("biometric_tokens")
        .select("id, corretor_id, empreendimento_id, used_at, expires_at")
        .eq("token", data.biometric_token)
        .maybeSingle();
      const now = new Date();
      if (
        !tok ||
        tok.used_at ||
        new Date(tok.expires_at) < now ||
        tok.corretor_id !== corretor.id ||
        tok.empreendimento_id !== data.empreendimento_id
      ) {
        await registrarFalha();
        throw new Error("Token biométrico inválido ou expirado. Tente novamente.");
      }
      await supabaseAdmin.from("biometric_tokens").update({ used_at: now.toISOString() }).eq("id", tok.id);
      authUserId = corretor.user_id ?? null;
    } else {
      if (!data.senha) {
        await registrarFalha();
        throw new Error(GENERIC_AUTH_ERROR);
      }
      const authClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data: signed, error: sErr } = await authClient.auth.signInWithPassword({
        email: loginEmail,
        password: data.senha,
      });
      if (sErr || !signed?.user) {
        await registrarFalha();
        throw new Error(GENERIC_AUTH_ERROR);
      }
      authUserId = signed.user.id;
    }

    const { data: emp, error: eErr } = await supabaseAdmin
      .from("empreendimentos")
      .select("id, nome, latitude, longitude, raio_metros, wifi_ssid, qrcode_token, metodos_presenca")
      .eq("id", data.empreendimento_id)
      .single();
    if (eErr || !emp) throw new Error("Empreendimento não encontrado");

    const metodos = ((emp.metodos_presenca ?? ["geofence"]) as string[]);
    type Check = { metodo: string; ok: boolean; detalhe: string };
    const checks: Check[] = [];
    let distancia: number | null = null;

    if (metodos.includes("geofence")) {
      if (data.latitude == null || data.longitude == null) {
        checks.push({ metodo: "geofence", ok: false, detalhe: "Localização não enviada — habilite o GPS no navegador" });
      } else if (emp.latitude == null || emp.longitude == null) {
        checks.push({ metodo: "geofence", ok: false, detalhe: "Stand sem coordenadas configuradas" });
      } else {
        const d = distMeters(data.latitude, data.longitude, emp.latitude, emp.longitude);
        distancia = Math.round(d);
        const raio = emp.raio_metros ?? 100;
        checks.push({
          metodo: "geofence",
          ok: d <= raio,
          detalhe: d <= raio ? `Dentro do raio (${distancia}m / ${raio}m)` : `Fora do raio: ${distancia}m (máx ${raio}m)`,
        });
      }
    }
    if (metodos.includes("wifi")) {
      if (!data.wifi_ssid) checks.push({ metodo: "wifi", ok: false, detalhe: "SSID não informado" });
      else if (!emp.wifi_ssid) checks.push({ metodo: "wifi", ok: false, detalhe: "Stand sem SSID configurado" });
      else {
        const ok = data.wifi_ssid.trim().toLowerCase() === emp.wifi_ssid.trim().toLowerCase();
        checks.push({ metodo: "wifi", ok, detalhe: ok ? `Conectado em "${data.wifi_ssid}"` : `SSID "${data.wifi_ssid}" não confere com o stand` });
      }
    }
    if (metodos.includes("qrcode")) {
      if (!data.qr_token) checks.push({ metodo: "qrcode", ok: false, detalhe: "QR Code não escaneado" });
      else if (!emp.qrcode_token) checks.push({ metodo: "qrcode", ok: false, detalhe: "QR Code do stand não configurado" });
      else {
        const ok = data.qr_token === emp.qrcode_token;
        checks.push({ metodo: "qrcode", ok, detalhe: ok ? "QR Code válido" : "QR Code expirado ou inválido — peça um novo na recepção" });
      }
    }
    if (metodos.includes("pin")) {
      // PIN ainda não implementado de forma segura (não há valor armazenado
      // para comparação). Tratado como método indisponível para evitar
      // bypass — usar geofence / wifi / qrcode.
      checks.push({
        metodo: "pin",
        ok: false,
        detalhe: "Validação por PIN temporariamente indisponível — use Geofence, Wi-Fi ou QR Code.",
      });
    }

    const metodoOk = checks.find((c) => c.ok)?.metodo ?? null;

    if (!metodoOk) {
      const motivos = checks.length > 0
        ? checks.map((c) => `• ${c.metodo.toUpperCase()}: ${c.detalhe}`).join("\n")
        : "Nenhum método de validação foi enviado.";
      throw new Error(`Não foi possível confirmar sua presença:\n${motivos}`);
    }

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

    await supabaseAdmin.from("audit_log").insert({
      user_id: authUserId,
      user_email: loginEmail,
      acao: "presenca_confirmada",
      recurso: `plantao:${plantaoId}`,
      detalhes: {
        empreendimento_id: emp.id,
        corretor_id: corretor.id,
        metodo_aprovado: metodoOk,
        autenticacao: data.biometric_token ? "biometria" : "senha",
        distancia_m: distancia,
        wifi_ssid_informado: data.wifi_ssid ?? null,
        qrcode_validado: checks.find((c) => c.metodo === "qrcode")?.ok ?? null,
        pin_aceito: checks.find((c) => c.metodo === "pin")?.ok ?? null,
        checks: checks.map((c) => ({ metodo: c.metodo, ok: c.ok, detalhe: c.detalhe })),
      },
    });

    return {
      ok: true,
      metodo: metodoOk,
      distancia,
      checks,
      // login_email só é devolvido quando a autenticação foi por SENHA
      // (não em fluxo biométrico), para permitir cadastrar passkey deste
      // aparelho logo após o check-in.
      login_email: data.biometric_token ? null : loginEmail,
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        telefone: corretor.telefone,
        creci: corretor.creci,
        foto_url: await signFoto(corretor.foto_url),
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
      supabaseAdmin.from("corretores").select("id, nome, telefone, creci, ordem_roleta, ativo, foto_url").eq("empreendimento_id", data.empreendimento_id).eq("ativo", true),
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

    const filaBase = presentes
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        creci: c.creci,
        telefone: c.telefone,
        foto_url: (c as { foto_url?: string | null }).foto_url ?? null,
        atendimentos_semana: counts[c.id] ?? 0,
        ordem_roleta: c.ordem_roleta ?? 0,
      }))
      .sort((a, b) => a.atendimentos_semana - b.atendimentos_semana || a.ordem_roleta - b.ordem_roleta);

    const fila = await Promise.all(filaBase.map(async (c) => ({ ...c, foto_url: await signFoto(c.foto_url) })));

    return {
      empreendimento: emp,
      data: today,
      total_presentes: fila.length,
      proximo_id: fila[0]?.id ?? null,
      fila,
    };
  });

// Lookup público: dado um CRECI **ou e-mail**, devolve a lista de
// empreendimentos (CNPJs) em que o corretor está vinculado e ativo. Não
// expõe nome/telefone/email.
const LookupInput = z.object({ creci: z.string().trim().min(2).max(120) });
export const lookupEmpreendimentosPorCreci = createServerFn({ method: "POST" })
  .inputValidator((d) => LookupInput.parse(d))
  .handler(async ({ data }) => {
    const termo = data.creci.trim();
    const isEmail = termo.includes("@");
    const query = supabaseAdmin
      .from("corretores")
      .select("empreendimento_id, ativo, empreendimentos:empreendimento_id(id, nome, cnpj, ativo)")
      .eq("ativo", true);
    const { data: rows, error } = await (isEmail
      ? query.ilike("email", termo)
      : query.ilike("creci", termo));
    if (error) throw new Error("Erro ao consultar.");
    const empMap = new Map<string, { id: string; nome: string; cnpj: string | null }>();
    (rows ?? []).forEach((r: { empreendimentos: { id: string; nome: string; cnpj: string | null; ativo: boolean } | null }) => {
      const e = r.empreendimentos;
      if (e && e.ativo) empMap.set(e.id, { id: e.id, nome: e.nome, cnpj: e.cnpj });
    });
    const empreendimentos = Array.from(empMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    return { empreendimentos };
  });

