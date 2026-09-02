import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fixarFilaOficial, saoPauloMinutosDoDia } from "@/lib/plantao.functions";

/**
 * Cron da ROLETA AUTOMÁTICA (a cada 5 minutos).
 *
 * Antes, o sorteio automático só acontecia se alguém estivesse com a tela
 * /roleta aberta no horário. Agora o banco chama este endpoint periodicamente
 * e o sorteio ocorre no horário previsto mesmo sem ninguém logado.
 *
 * A operação é idempotente e time-gated: só congela a fila do dia quando
 * `roleta_automatica` está ligada e um dos `roleta_auto_horarios` já passou.
 */
async function executar() {
  const agoraMin = saoPauloMinutosDoDia();
  const { data: emps, error } = await supabaseAdmin
    .from("empreendimentos")
    .select("id, nome, roleta_automatica, roleta_auto_horarios, fila_oficial_data, fila_oficial_ids")
    .eq("ativo", true)
    .eq("roleta_automatica", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resultados: Array<{ empreendimento: string; status: string }> = [];
  for (const emp of emps ?? []) {
    const horarios: string[] = (emp as { roleta_auto_horarios?: string[] }).roleta_auto_horarios ?? [];
    if (horarios.length === 0) {
      resultados.push({ empreendimento: emp.id, status: "sem_horarios" });
      continue;
    }
    const atingiu = horarios.some((h) => {
      const [hh, mm] = h.split(":").map(Number);
      return Number.isFinite(hh) && agoraMin >= hh * 60 + (mm || 0);
    });
    if (!atingiu) {
      resultados.push({ empreendimento: emp.id, status: "aguardando_horario" });
      continue;
    }
    try {
      const r = await fixarFilaOficial(emp.id);
      resultados.push({ empreendimento: emp.id, status: r.reused ? "ja_fixada" : "executada" });
    } catch (e) {
      resultados.push({
        empreendimento: emp.id,
        status: e instanceof Error ? `ignorada: ${e.message}` : "erro",
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, agoraMin, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/roleta-auto")({
  server: {
    handlers: {
      POST: async () => executar(),
      GET: async () => executar(),
    },
  },
});
