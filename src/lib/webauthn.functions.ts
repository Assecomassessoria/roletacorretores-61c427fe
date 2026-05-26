import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getRpInfo() {
  const req = getRequest();
  const url = new URL(req.url);
  const hostname = url.hostname;
  // Em produção/preview, rpID = hostname exato (funciona para subdomínio único)
  const rpID = hostname;
  const origin = `${url.protocol}//${url.host}`;
  return { rpID, origin };
}

function b64urlEncode(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out as Uint8Array<ArrayBuffer>;
}

async function cleanupChallenges() {
  await supabaseAdmin
    .from("webauthn_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString());
}

// ============ REGISTRATION (autenticado) ============

export const startRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { rpID } = getRpInfo();
    const userId = context.userId;

    // Pega email do usuário para userName
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userName = u?.user?.email ?? userId;

    // Exclui credenciais já cadastradas
    const { data: existentes } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", userId);

    const options = await generateRegistrationOptions({
      rpName: "Roleta Corretor Elite",
      rpID,
      userID: new TextEncoder().encode(userId),
      userName,
      attestationType: "none",
      excludeCredentials: (existentes ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await cleanupChallenges();
    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      tipo: "registration",
      user_id: userId,
    });

    return options;
  });

const FinishRegInput = z.object({
  response: z.unknown(),
  device_label: z.string().max(80).optional().nullable(),
});

export const finishRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FinishRegInput.parse(d))
  .handler(async ({ data, context }) => {
    const { rpID, origin } = getRpInfo();
    const userId = context.userId;

    const { data: ch } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, challenge")
      .eq("user_id", userId)
      .eq("tipo", "registration")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ch) throw new Error("Desafio expirado. Tente novamente.");

    const verification = await verifyRegistrationResponse({
      response: data.response as RegistrationResponseJSON,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Falha ao verificar biometria.");
    }

    const { credential } = verification.registrationInfo;
    const credId = credential.id; // já base64url
    const publicKeyB64 = b64urlEncode(credential.publicKey);

    // Resolve corretor_id (se existir)
    const { data: corretor } = await supabaseAdmin
      .from("corretores")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    await supabaseAdmin.from("webauthn_credentials").upsert(
      {
        user_id: userId,
        corretor_id: corretor?.id ?? null,
        credential_id: credId,
        public_key: publicKeyB64,
        counter: credential.counter,
        transports: (credential.transports ?? []) as string[],
        device_label: data.device_label ?? null,
      },
      { onConflict: "credential_id" },
    );

    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", ch.id);

    return { ok: true };
  });

// ============ AUTHENTICATION pública (para /plantao) ============

const StartAuthInput = z.object({
  empreendimento_id: z.string().uuid(),
  creci: z.string().trim().min(2).max(40),
});

export const startAuthenticationPlantao = createServerFn({ method: "POST" })
  .inputValidator((d) => StartAuthInput.parse(d))
  .handler(async ({ data }) => {
    const { rpID } = getRpInfo();

    const { data: corretor } = await supabaseAdmin
      .from("corretores")
      .select("id, user_id")
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("creci", data.creci.trim())
      .maybeSingle();

    if (!corretor || !corretor.user_id) {
      throw new Error("Nenhuma biometria cadastrada para este CRECI.");
    }

    const { data: creds } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", corretor.user_id);

    if (!creds || creds.length === 0) {
      throw new Error("Nenhuma biometria cadastrada para este CRECI.");
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
      })),
      userVerification: "preferred",
    });

    await cleanupChallenges();
    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      tipo: "authentication",
      corretor_id: corretor.id,
      empreendimento_id: data.empreendimento_id,
      creci: data.creci.trim(),
    });

    return options;
  });

const FinishAuthInput = z.object({
  empreendimento_id: z.string().uuid(),
  creci: z.string().trim().min(2).max(40),
  response: z.unknown(),
});

export const finishAuthenticationPlantao = createServerFn({ method: "POST" })
  .inputValidator((d) => FinishAuthInput.parse(d))
  .handler(async ({ data }) => {
    const { rpID, origin } = getRpInfo();

    const { data: ch } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, challenge, corretor_id")
      .eq("empreendimento_id", data.empreendimento_id)
      .ilike("creci", data.creci.trim())
      .eq("tipo", "authentication")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ch || !ch.corretor_id) throw new Error("Desafio expirado. Tente novamente.");

    const response = data.response as AuthenticationResponseJSON;
    const credentialId = response.id;

    const { data: cred } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("id, credential_id, public_key, counter, transports")
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!cred) throw new Error("Credencial não encontrada.");

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(b64urlDecode(cred.public_key)),
        counter: Number(cred.counter),
        transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new Error("Falha na verificação biométrica.");
    }

    await supabaseAdmin
      .from("webauthn_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id);

    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", ch.id);

    // Emite token de uso único (60s) para o checkInPlantao
    const token = crypto.randomUUID() + "." + crypto.randomUUID();
    await supabaseAdmin.from("biometric_tokens").insert({
      token,
      corretor_id: ch.corretor_id,
      empreendimento_id: data.empreendimento_id,
    });

    return { ok: true, biometric_token: token };
  });

// Lista credenciais do usuário atual (para a tela de gestão futura)
export const listMyCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("id, device_label, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { credentials: data ?? [] };
  });
