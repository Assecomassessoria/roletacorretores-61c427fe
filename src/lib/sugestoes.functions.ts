import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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

export const enviarSugestao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SugestaoSchema.parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("sugestoes").insert({
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email ?? null,
      mensagem: data.mensagem,
      origem: data.origem ?? "plantao",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
