import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LORENZA_SYSTEM_PROMPT, MAX_INTERACOES, SUPORTE_LABEL, SUPORTE_WHATSAPP } from "./lorenza-knowledge";

const Lead = z.object({
  nome: z.string().trim().min(2).max(120),
  empreendimento: z.string().trim().min(1).max(160),
  whatsapp: z.string().trim().min(8).max(40),
  email: z.string().trim().toLowerCase().email().max(255),
});

const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatInput = z.object({
  lead: Lead,
  history: z.array(Msg).max(40),
  message: z.string().trim().min(1).max(2000),
});

export type LorenzaChatInput = z.infer<typeof ChatInput>;

export const lorenzaChat = createServerFn({ method: "POST" })
  .inputValidator((d) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const userTurns = data.history.filter((m) => m.role === "user").length;
    const nextTurn = userTurns + 1;

    // Persistir lead (best-effort) — usamos audit_log para não exigir tabela nova.
    try {
      await supabaseAdmin.from("audit_log").insert({
        acao: "lorenza_chat",
        recurso: "landing",
        detalhes: {
          lead: data.lead,
          turno: nextTurn,
          pergunta: data.message.slice(0, 500),
        } as never,
      });
    } catch {
      /* ignore */
    }

    // Limite de 6 interações — na 7ª, encaminhar para suporte humano.
    if (nextTurn > MAX_INTERACOES) {
      const link = `https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(
        `Olá, sou ${data.lead.nome} (${data.lead.empreendimento}). Vim do chat da Lorenza e preciso de atendimento humano.`,
      )}`;
      return {
        reply:
          `Para te atender com a profundidade que você merece, vou te encaminhar agora para nosso time humano. ` +
          `Fale com o suporte no WhatsApp **${SUPORTE_LABEL}** — [abrir conversa](${link}).`,
        escalated: true,
        turn: nextTurn,
      };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        reply: `Estou temporariamente indisponível. Fale com o suporte no WhatsApp **${SUPORTE_LABEL}**.`,
        escalated: true,
        turn: nextTurn,
      };
    }

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: LORENZA_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Lead atual: ${data.lead.nome} | ${data.lead.empreendimento} | ${data.lead.whatsapp} | ${data.lead.email}. Turno ${nextTurn}/${MAX_INTERACOES}.`,
        },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: data.message },
      ],
    };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status === 402) {
        return {
          reply: `Estou com muitas conversas agora. Fale com o suporte no WhatsApp **${SUPORTE_LABEL}**.`,
          escalated: true,
          turn: nextTurn,
        };
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("[lorenza] gateway error", res.status, t);
        return {
          reply: `Tive um problema técnico. Fale com o suporte no WhatsApp **${SUPORTE_LABEL}**.`,
          escalated: true,
          turn: nextTurn,
        };
      }

      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const reply =
        json.choices?.[0]?.message?.content?.trim() ||
        `Posso te ajudar melhor por WhatsApp: **${SUPORTE_LABEL}**.`;

      return {
        reply,
        escalated: false,
        turn: nextTurn,
        restante: MAX_INTERACOES - nextTurn,
      };
    } catch (e) {
      console.error("[lorenza] erro", e);
      return {
        reply: `Tive um problema técnico. Fale com o suporte no WhatsApp **${SUPORTE_LABEL}**.`,
        escalated: true,
        turn: nextTurn,
      };
    }
  });
