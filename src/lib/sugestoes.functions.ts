import { createServerFn, getRequestHeader } from "@tanstack/react-start";
import { z } from "zod";

const SugestaoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  whatsapp: z.string().trim().min(8, "WhatsApp obrigatório").max(30),
  email: z
    .string()
    .trim()
    .max(255)
    .email("E-mail inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  mensagem: z.string().trim().min(1, "Mensagem obrigatória").max(4000),
  origem: z.string().trim().max(60).optional(),
});

// Rate limit em memória (por IP) — mitigação contra flood/mass PII.
// Vale por instância do worker; suficiente para reduzir abuso trivial.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;
const rateBuckets = new Map<string, number[]>();

function checkRate(ip: string) {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  rateBuckets.set(ip, arr);
  return true;
}

export const enviarSugestao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SugestaoSchema.parse(input))
  .handler(async ({ data }) => {
    const ip =
      (getRequestHeader("cf-connecting-ip") as string | undefined) ||
      (getRequestHeader("x-forwarded-for") as string | undefined)?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRate(ip)) {
      throw new Error("Muitas mensagens enviadas. Tente novamente em alguns instantes.");
    }
    // Import de client admin dentro do handler (evita bundle no cliente).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sugestoes").insert({
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email ?? null,
      mensagem: data.mensagem,
      origem: data.origem ?? "plantao",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
