import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cron diário (09:00 BRT) — Aviso de renovação.
 * Varre assinaturas ATIVAS cujo `expira_em` ocorre nos próximos 5 dias,
 * envia e-mail via Resend e registra em `avisos_renovacao` para evitar
 * envios duplicados (flag `aviso_renovacao_enviado`).
 *
 * Segurança: rota pública, mas exige header `apikey` = SUPABASE_PUBLISHABLE_KEY
 * (o mesmo que o pg_cron já envia).
 */
export const Route = createFileRoute("/api/public/hooks/avisos-renovacao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const resendKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL ?? "contatoapps@simuladorcorretorelite.com.br";

        // Janela: assinaturas que expiram em até 5 dias
        const agora = new Date();
        const limite = new Date(agora.getTime() + 5 * 24 * 60 * 60 * 1000);

        const { data: assinaturas, error } = await supabaseAdmin
          .from("assinaturas")
          .select("id, user_id, plano_id, expira_em, aviso_renovacao_enviado, status")
          .eq("status", "ativa")
          .eq("aviso_renovacao_enviado", false)
          .gte("expira_em", agora.toISOString())
          .lte("expira_em", limite.toISOString());

        if (error) {
          console.error("[avisos-renovacao] erro:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let enviados = 0;
        for (const a of assinaturas ?? []) {
          // Buscar e-mail do usuário e nome do plano
          const [{ data: profile }, { data: plano }] = await Promise.all([
            supabaseAdmin.from("profiles").select("email, nome").eq("id", a.user_id).maybeSingle(),
            supabaseAdmin.from("planos").select("nome").eq("id", a.plano_id).maybeSingle(),
          ]);

          const destinatario = profile?.email;
          if (!destinatario) continue;

          const diasRestantes = Math.max(
            0,
            Math.ceil((new Date(a.expira_em as string).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)),
          );

          const assunto = `Sua assinatura ${plano?.nome ?? "Roleta Corretor"} expira em ${diasRestantes} dia(s)`;
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1733">
              <h2 style="color:#0b1733">Olá ${profile?.nome ?? ""},</h2>
              <p>Sua assinatura <strong>${plano?.nome ?? ""}</strong> expira em
              <strong>${diasRestantes} dia(s)</strong> (${new Date(a.expira_em as string).toLocaleDateString("pt-BR")}).</p>
              <p>Para manter o acesso ininterrupto à Roleta Corretor Elite 4.0, renove agora:</p>
              <p><a href="https://roletacorretor.simuladorcorretorelite.com.br/planos"
                style="background:#f59e0b;color:#0b1733;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                Renovar assinatura
              </a></p>
              <p style="font-size:12px;color:#64748b">Roleta Corretor · Ecossistema Elite 4.0</p>
            </div>`;

          let status = "skipped";
          let payload: unknown = null;

          if (resendKey) {
            try {
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: `Roleta Corretor <${adminEmail}>`,
                  to: [destinatario],
                  subject: assunto,
                  html,
                }),
              });
              payload = await res.json().catch(() => null);
              status = res.ok ? "enviado" : "erro";
            } catch (e) {
              status = "erro";
              payload = { error: String(e) };
            }
          }

          // Log + flag
          await supabaseAdmin.from("avisos_renovacao").insert({
            assinatura_id: a.id,
            user_id: a.user_id,
            tipo: "pre_vencimento_5d",
            canal: "email",
            status,
            payload: payload as never,
          });
          await supabaseAdmin.from("email_log").insert({
            destinatario,
            assunto,
            status,
            payload: payload as never,
          });
          if (status === "enviado") {
            await supabaseAdmin
              .from("assinaturas")
              .update({ aviso_renovacao_enviado: true })
              .eq("id", a.id);
            enviados++;
          }
        }

        return new Response(
          JSON.stringify({ ok: true, candidatos: assinaturas?.length ?? 0, enviados }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
