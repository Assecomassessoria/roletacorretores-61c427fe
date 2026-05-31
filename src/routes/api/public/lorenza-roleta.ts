import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Webhook: Lorenza Roleta -> WhatsApp Cloud API
 *
 * Recebe o resultado da roleta e dispara uma mensagem WhatsApp
 * para o telefone do CLIENTE informado no payload.
 *
 * Assinatura: x-hub-signature-256 = "sha256=" + HMAC_SHA256(LORENZA_ROLETA_SECRET, rawBody)
 */

const PayloadSchema = z.object({
  cliente: z.object({
    nome: z.string().trim().min(1).max(200),
    telefone: z.string().trim().min(8).max(40),
  }),
  corretor: z.object({
    nome: z.string().trim().min(1).max(200),
    telefone: z.string().trim().min(8).max(40).optional().nullable(),
    creci: z.string().trim().max(40).optional().nullable(),
  }),
  empreendimento: z
    .object({
      nome: z.string().trim().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
  whatsapp: z.object({
    phone_number_id: z.string().trim().min(5).max(64),
  }),
  mensagem: z.string().trim().min(1).max(2000).optional().nullable(),
});

function verifyHubSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

function montarMensagem(p: z.infer<typeof PayloadSchema>) {
  if (p.mensagem) return p.mensagem;
  const emp = p.empreendimento?.nome ? ` no ${p.empreendimento.nome}` : "";
  const creci = p.corretor.creci ? ` (CRECI ${p.corretor.creci})` : "";
  return (
    `Olá, ${p.cliente.nome}! Seu atendimento${emp} foi direcionado para ` +
    `${p.corretor.nome}${creci}. Em instantes nosso corretor entrará em contato. ` +
    `Obrigado pela visita!`
  );
}

export const Route = createFileRoute("/api/public/lorenza-roleta")({
  server: {
    handlers: {
      // Verificação de webhook (Meta/Facebook handshake)
      // GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.FACEBOOK_VERIFY_TOKEN;

        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const secret = process.env.LORENZA_ROLETA_SECRET;
        const waToken = process.env.WHATSAPP_TOKEN;
        if (!secret || !waToken) {
          return new Response(JSON.stringify({ error: "Webhook not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!verifyHubSignature(rawBody, signature, secret)) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let payload: z.infer<typeof PayloadSchema>;
        try {
          payload = PayloadSchema.parse(JSON.parse(rawBody));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Invalid payload";
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const to = onlyDigits(payload.cliente.telefone);
        const body = montarMensagem(payload);

        const waUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
          payload.whatsapp.phone_number_id,
        )}/messages`;

        let waStatus = 0;
        let waResponse: unknown = null;
        try {
          const res = await fetch(waUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${waToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { preview_url: false, body },
            }),
          });
          waStatus = res.status;
          waResponse = await res.json().catch(() => null);
        } catch (e) {
          waResponse = { error: e instanceof Error ? e.message : "fetch error" };
        }

        // Best-effort audit
        try {
          await supabaseAdmin.from("audit_log").insert({
            acao: "lorenza_roleta_webhook",
            recurso: "whatsapp",
            detalhes: {
              cliente: payload.cliente,
              corretor: payload.corretor,
              empreendimento: payload.empreendimento ?? null,
              wa_status: waStatus,
              wa_response: waResponse,
            } as never,
          });
        } catch {
          /* ignore */
        }

        const ok = waStatus >= 200 && waStatus < 300;
        return new Response(
          JSON.stringify({ ok, wa_status: waStatus, wa_response: waResponse }),
          {
            status: ok ? 200 : 502,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
