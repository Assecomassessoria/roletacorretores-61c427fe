import { z } from "zod";

export const dadosPessoaisCorretorSchema = z.object({
  data_nascimento: z.string().date("Informe uma data válida.").optional().nullable(),
  tipo_logradouro: z.enum(["Rua", "Avenida"]).optional().nullable(),
  logradouro: z.string().trim().max(200).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().max(100).optional().nullable(),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, "Informe um CEP com 8 dígitos.").optional().nullable(),
  cidade: z.string().trim().max(100).optional().nullable(),
  uf: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional().nullable(),
});

// created_at is intentionally excluded: the database sets registration start.
export function dadosPessoaisCorretor(input: unknown) {
  const data = dadosPessoaisCorretorSchema.parse(input);
  return { ...data, cep: data.cep?.replace(/\D/g, "") ?? null };
}