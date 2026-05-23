import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  plano_id: z.string().uuid(),
});

// Cria uma preferência de pagamento Mercado Pago e devolve o init_point.
export const criarCheckoutMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Pagamentos indisponíveis: token Mercado Pago não configurado.");
    }

    const { data: plano, error } = await supabaseAdmin
      .from("planos")
      .select("id, codigo, nome, preco_centavos, moeda, dias_duracao, ativo")
      .eq("id", data.plano_id)
      .maybeSingle();

    if (error || !plano || !plano.ativo) {
      throw new Error("Plano inválido ou indisponível.");
    }

    const siteUrl = process.env.SITE_URL ?? "https://roletacorretor.simuladorcorretorelite.com.br";
    const externalReference = `${plano.id}:${userId}`;

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: plano.codigo,
            title: plano.nome,
            quantity: 1,
            currency_id: plano.moeda ?? "BRL",
            unit_price: plano.preco_centavos / 100,
          },
        ],
        external_reference: externalReference,
        notification_url: `${siteUrl}/api/public/mercadopago`,
        back_urls: {
          success: `${siteUrl}/planos?status=ok`,
          failure: `${siteUrl}/planos?status=erro`,
          pending: `${siteUrl}/planos?status=pendente`,
        },
        auto_return: "approved",
        metadata: { plano_id: plano.id, user_id: userId },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Mercado Pago: ${res.status} ${txt.slice(0, 200)}`);
    }

    const pref = (await res.json()) as { id: string; init_point: string; sandbox_init_point?: string };

    // registra pagamento pendente
    await supabaseAdmin.from("pagamentos").insert({
      provider: "mercadopago",
      external_id: pref.id,
      external_status: "preference_created",
      status: "pendente",
      valor_centavos: plano.preco_centavos,
      moeda: plano.moeda ?? "BRL",
      user_id: userId,
      plano_id: plano.id,
      payload: pref as never,
    });

    return { init_point: pref.init_point, preference_id: pref.id };
  });
