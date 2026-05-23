import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Cron diário: marca assinaturas vencidas como `expirada` e enfileira aviso
// de renovação 5 dias antes do vencimento (≈ dia 25 de um ciclo mensal).
export const Route = createFileRoute("/api/public/hooks/assinaturas-vencimento")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date().toISOString();

        // 1) Expirar assinaturas vencidas
        const { data: expiradas, error: e1 } = await supabaseAdmin
          .from("assinaturas")
          .update({ status: "expirada" })
          .in("status", ["ativa", "trial", "inadimplente"])
          .lt("expira_em", now)
          .select("id, user_id");

        if (e1) {
          return Response.json({ ok: false, step: "expirar", error: e1.message }, { status: 500 });
        }

        // 2) Localizar assinaturas que vencem em 3 a 5 dias e ainda não receberam aviso
        const em5dias = new Date();
        em5dias.setDate(em5dias.getDate() + 5);
        const em3dias = new Date();
        em3dias.setDate(em3dias.getDate() + 3);

        const { data: aRenovar, error: e2 } = await supabaseAdmin
          .from("assinaturas")
          .select("id, user_id, plano_id, expira_em")
          .eq("status", "ativa")
          .eq("aviso_renovacao_enviado", false)
          .gte("expira_em", em3dias.toISOString())
          .lte("expira_em", em5dias.toISOString());

        if (e2) {
          return Response.json({ ok: false, step: "buscar avisos", error: e2.message }, { status: 500 });
        }

        let avisos = 0;
        for (const a of aRenovar ?? []) {
          const { error: insErr } = await supabaseAdmin.from("avisos_renovacao").insert({
            assinatura_id: a.id,
            user_id: a.user_id,
            tipo: "vencimento_proximo",
            canal: "luna",
            status: "enfileirado",
            payload: { plano_id: a.plano_id, expira_em: a.expira_em } as never,
          });
          if (!insErr) {
            await supabaseAdmin
              .from("assinaturas")
              .update({ aviso_renovacao_enviado: true })
              .eq("id", a.id);
            avisos++;
          }
        }

        return Response.json({
          ok: true,
          expiradas: expiradas?.length ?? 0,
          avisos_enfileirados: avisos,
          processado_em: now,
        });
      },
    },
  },
});
