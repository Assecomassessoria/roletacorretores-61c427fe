import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LorenzaPayloadSchema = z.object({
  atendimento_id: z.string().uuid().optional().nullable(),
  empreendimento_id: z.string().uuid(),
  opcao_codigo: z.string().regex(/^[A-Z]$/),
  cliente_nome: z.string().trim().min(1).max(255).optional().nullable(),
  cliente_telefone: z.string().trim().min(1).max(40).optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional().nullable(),
});

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/lorenza")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.LORENZA_WEBHOOK_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "Webhook not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-lorenza-signature");
        if (!verifySignature(rawBody, signature, secret)) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let parsed: z.infer<typeof LorenzaPayloadSchema>;
        try {
          parsed = LorenzaPayloadSchema.parse(JSON.parse(rawBody));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Invalid payload";
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: opcao, error: opcaoErr } = await supabaseAdmin
          .from("opcoes_triagem")
          .select("codigo, action, ativo")
          .eq("codigo", parsed.opcao_codigo)
          .maybeSingle();

        if (opcaoErr || !opcao || !opcao.ativo) {
          return new Response(
            JSON.stringify({ error: `Opção inválida: ${parsed.opcao_codigo}` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const { data: inserted, error } = await supabaseAdmin
          .from("triagens")
          .insert({
            atendimento_id: parsed.atendimento_id ?? null,
            empreendimento_id: parsed.empreendimento_id,
            opcao_codigo: opcao.codigo,
            acao: opcao.action,
            origem: "lorenza",
            cliente_nome: parsed.cliente_nome ?? null,
            cliente_telefone: parsed.cliente_telefone ?? null,
            payload: parsed.payload ?? null,
          })
          .select("id, opcao_codigo, acao, created_at")
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, triagem: inserted }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
