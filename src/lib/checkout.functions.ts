import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  plano_codigo: z.string().trim().min(2).max(60),
});

export const criarCheckoutPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as { userId: string; claims: { email?: string } };
    const email = claims?.email ?? null;

    const { data: plano, error: planoErr } = await supabaseAdmin
      .from("planos")
      .select("id, codigo, nome, preco_centavos, moeda, ativo")
      .eq("codigo", data.plano_codigo)
      .maybeSingle();

    if (planoErr || !plano) throw new Error("Plano não encontrado");
    if (!plano.ativo) throw new Error("Plano indisponível no momento");

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error("Pagamento indisponível: integração não configurada");

    const origin =
      process.env.PUBLIC_APP_URL ||
      "https://roletacorretor.simuladorcorretorelite.com.br";

    const externalRef = `${userId}:${plano.codigo}:${Date.now()}`;

    const preference = {
      items: [
        {
          id: plano.codigo,
          title: plano.nome,
          quantity: 1,
          unit_price: plano.preco_centavos / 100,
          currency_id: plano.moeda ?? "BRL",
        },
      ],
      payer: email ? { email } : undefined,
      external_reference: externalRef,
      back_urls: {
        success: `${origin}/app?checkout=ok`,
        failure: `${origin}/planos?checkout=falha`,
        pending: `${origin}/planos?checkout=pendente`,
      },
      auto_return: "approved",
      metadata: { user_id: userId, plano_id: plano.id, plano_codigo: plano.codigo },
      notification_url: `${origin}/api/public/hooks/mercadopago`,
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("[mercadopago] preferences error", resp.status, txt);
      throw new Error("Não foi possível iniciar o checkout. Tente novamente.");
    }

    const pref = (await resp.json()) as { id: string; init_point?: string; sandbox_init_point?: string };

    // Registra um pagamento pendente para auditoria
    await supabaseAdmin.from("pagamentos").insert({
      user_id: userId,
      plano_id: plano.id,
      provider: "mercadopago",
      moeda: plano.moeda ?? "BRL",
      valor_centavos: plano.preco_centavos,
      status: "pendente",
      external_id: pref.id,
      payload: { preference_id: pref.id, external_reference: externalRef },
    });

    return {
      preference_id: pref.id,
      url: pref.init_point || pref.sandbox_init_point,
    };
  });
