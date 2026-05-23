import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Webhook Mercado Pago (assinatura HMAC v1)
// Doc: header `x-signature: ts=...,v1=<hmac>` + `x-request-id`
// Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;

function verifyMpSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts;
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(v1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function fetchMpPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`MP API ${res.status}`);
  return res.json() as Promise<{
    id: number;
    status: string;
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    payment_method_id?: string;
    external_reference?: string;
    date_approved?: string | null;
    metadata?: Record<string, unknown>;
  }>;
}

function mapStatus(s: string): "pendente" | "aprovado" | "recusado" | "estornado" | "cancelado" {
  switch (s) {
    case "approved":
      return "aprovado";
    case "rejected":
      return "recusado";
    case "refunded":
    case "charged_back":
      return "estornado";
    case "cancelled":
      return "cancelado";
    default:
      return "pendente";
  }
}

export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!secret || !accessToken) {
          return Response.json({ error: "Webhook não configurado" }, { status: 500 });
        }

        const url = new URL(request.url);
        const rawBody = await request.text();
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = JSON.parse(rawBody);
        } catch {
          /* ignore */
        }

        const dataId =
          String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "") || null;

        const ok = verifyMpSignature({
          xSignature: request.headers.get("x-signature"),
          xRequestId: request.headers.get("x-request-id"),
          dataId,
          secret,
        });
        if (!ok) {
          return Response.json({ error: "Assinatura inválida" }, { status: 401 });
        }

        // Só processamos eventos de pagamento
        const tipo = body.type ?? url.searchParams.get("type");
        if (tipo && tipo !== "payment") {
          return Response.json({ ok: true, skipped: tipo });
        }
        if (!dataId) {
          return Response.json({ error: "data.id ausente" }, { status: 400 });
        }

        let mp;
        try {
          mp = await fetchMpPayment(dataId, accessToken);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "erro MP";
          return Response.json({ error: msg }, { status: 502 });
        }

        const status = mapStatus(mp.status);
        const externalRef = mp.external_reference ?? null;

        // external_reference esperado: "<plano_id>:<user_id>"
        let planoId: string | null = null;
        let userId: string | null = null;
        if (externalRef && externalRef.includes(":")) {
          [planoId, userId] = externalRef.split(":");
        }

        // upsert do pagamento
        const { data: pagamento, error: payErr } = await supabaseAdmin
          .from("pagamentos")
          .upsert(
            {
              provider: "mercadopago",
              external_id: String(mp.id),
              external_status: mp.status,
              status,
              valor_centavos: Math.round((mp.transaction_amount ?? 0) * 100),
              moeda: mp.currency_id ?? "BRL",
              metodo: mp.payment_method_id ?? null,
              pago_em: mp.date_approved ?? null,
              user_id: userId ?? "00000000-0000-0000-0000-000000000000",
              plano_id: planoId,
              payload: mp as never,
            },
            { onConflict: "provider,external_id" }
          )
          .select("id, status, user_id, plano_id")
          .single();

        if (payErr) {
          return Response.json({ error: payErr.message }, { status: 500 });
        }

        // Se aprovado e temos user/plano, ativa/renova assinatura
        if (pagamento.status === "aprovado" && pagamento.user_id && pagamento.plano_id) {
          const { data: plano } = await supabaseAdmin
            .from("planos")
            .select("dias_duracao")
            .eq("id", pagamento.plano_id)
            .single();

          const dias = plano?.dias_duracao ?? 30;
          const agora = new Date();
          const expira = new Date(agora.getTime() + dias * 86_400_000);

          await supabaseAdmin
            .from("assinaturas")
            .upsert(
              {
                user_id: pagamento.user_id,
                plano_id: pagamento.plano_id,
                status: "ativa",
                iniciada_em: agora.toISOString(),
                expira_em: expira.toISOString(),
                aviso_renovacao_enviado: false,
              },
              { onConflict: "user_id,plano_id" } as never
            );

          await supabaseAdmin
            .from("pagamentos")
            .update({ assinatura_id: pagamento.id })
            .eq("id", pagamento.id);
        }

        return Response.json({ ok: true, status });
      },
    },
  },
});
