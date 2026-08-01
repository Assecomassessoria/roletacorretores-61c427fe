import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Abre um registro de ausência para o plantão (se ainda não houver um aberto). */
export async function abrirAusencia(
  plantao: { id: string; corretor_id: string; empreendimento_id: string; data?: string | null },
  inicio: string,
  origem: "automatica" | "manual" = "automatica",
) {
  const { data: aberta } = await (supabaseAdmin.from("ausencias") as any)
    .select("id")
    .eq("plantao_id", plantao.id)
    .is("fim", null)
    .maybeSingle();
  if (aberta) return;

  await (supabaseAdmin.from("ausencias") as any).insert({
    plantao_id: plantao.id,
    corretor_id: plantao.corretor_id,
    empreendimento_id: plantao.empreendimento_id,
    data: plantao.data ?? inicio.slice(0, 10),
    inicio,
    origem,
  });
}

/** Fecha o registro de ausência aberto do plantão, calculando a duração. */
export async function fecharAusencia(plantaoId: string, fim = new Date().toISOString()) {
  const { data: aberta } = await (supabaseAdmin.from("ausencias") as any)
    .select("id, inicio")
    .eq("plantao_id", plantaoId)
    .is("fim", null)
    .maybeSingle();
  if (!aberta) return;

  const minutos = Math.max(
    0,
    Math.round((new Date(fim).getTime() - new Date(aberta.inicio).getTime()) / 60000),
  );
  await (supabaseAdmin.from("ausencias") as any)
    .update({ fim, duracao_minutos: minutos })
    .eq("id", aberta.id);
}
