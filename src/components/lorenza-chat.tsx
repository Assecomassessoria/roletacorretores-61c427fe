import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lorenzaChat } from "@/lib/lorenza-chat.functions";
import { MAX_INTERACOES, SUPORTE_LABEL, SUPORTE_WHATSAPP } from "@/lib/lorenza-knowledge";
import lorenzaImg from "@/assets/lorenza.png";

type Lead = { nome: string; empreendimento: string; whatsapp: string; email: string };
type Msg = { role: "user" | "assistant"; content: string };

const LEAD_KEY = "lorenza-lead-v1";
const CHAT_KEY = "lorenza-chat-v1";

export function LorenzaChat() {
  const send = useServerFn(lorenzaChat);
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restaurar sessão
  useEffect(() => {
    try {
      const l = localStorage.getItem(LEAD_KEY);
      if (l) setLead(JSON.parse(l));
      const c = localStorage.getItem(CHAT_KEY);
      if (c) setMessages(JSON.parse(c));
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    if (messages.length) {
      try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-20))); } catch {/* ignore */}
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function handleLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Lead = {
      nome: String(fd.get("nome") || "").trim(),
      empreendimento: String(fd.get("empreendimento") || "").trim(),
      whatsapp: String(fd.get("whatsapp") || "").trim(),
      email: String(fd.get("email") || "").trim(),
    };
    if (!data.nome || !data.empreendimento || !data.whatsapp || !data.email) return;
    setLead(data);
    try { localStorage.setItem(LEAD_KEY, JSON.stringify(data)); } catch {/* ignore */}
    setMessages([{
      role: "assistant",
      content: `Olá, ${data.nome.split(" ")[0]}! Sou a **Lorenza**, especialista no Roleta Corretor Elite 4.0. Como posso te ajudar com o empreendimento **${data.empreendimento}**?`,
    }]);
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lead || !input.trim() || busy || escalated) return;
    const msg = input.trim();
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const out = await send({ data: { lead, history: messages, message: msg } });
      setMessages((m) => [...m, { role: "assistant", content: out.reply }]);
      if (out.escalated) setEscalated(true);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: `Tive um problema. Fale comigo pelo WhatsApp **${SUPORTE_LABEL}**.`,
      }]);
      setEscalated(true);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    try {
      localStorage.removeItem(LEAD_KEY);
      localStorage.removeItem(CHAT_KEY);
    } catch {/* ignore */}
    setLead(null);
    setMessages([]);
    setEscalated(false);
    setInput("");
  }

  const turnoAtual = messages.filter((m) => m.role === "user").length;
  const restante = Math.max(0, MAX_INTERACOES - turnoAtual);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat com Lorenza"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-lg ring-4 ring-orange/20 transition hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-3 z-50 flex max-h-[80vh] w-[min(380px,95vw)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--navy-deep)] to-navy p-3 text-navy-foreground">
            <img src={lorenzaImg} alt="Lorenza" className="h-10 w-10 rounded-full object-cover ring-2 ring-orange/60" />
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">Lorenza IA</p>
              <p className="text-[10px] text-white/70">Especialista Roleta Corretor</p>
            </div>
            {lead && (
              <button onClick={reset} className="text-[10px] text-white/70 hover:text-white">
                Reiniciar
              </button>
            )}
          </div>

          {/* Body */}
          {!lead ? (
            <form onSubmit={handleLead} className="flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-xs text-muted-foreground">
                Preencha para começarmos. Atendo até <strong>{MAX_INTERACOES} perguntas</strong> antes de
                encaminhar ao suporte humano.
              </p>
              <div className="space-y-1">
                <Label htmlFor="lz-nome" className="text-[11px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                <Input id="lz-nome" name="nome" required placeholder="Seu nome completo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lz-emp" className="text-[11px] uppercase tracking-wider text-muted-foreground">Empreendimento</Label>
                <Input id="lz-emp" name="empreendimento" required placeholder="Nome do stand / empreendimento" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lz-wpp" className="text-[11px] uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                <Input id="lz-wpp" name="whatsapp" required placeholder="55119xxxxxxxx" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lz-email" className="text-[11px] uppercase tracking-wider text-muted-foreground">E-mail</Label>
                <Input id="lz-email" name="email" type="email" required placeholder="voce@empresa.com" />
              </div>
              <Button type="submit" className="w-full bg-orange text-orange-foreground hover:bg-orange/90">
                Iniciar conversa
              </Button>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-orange/90 px-3 py-2 text-sm text-orange-foreground"
                        : "mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
                    }
                  >
                    {m.content}
                  </div>
                ))}
                {busy && (
                  <div className="mr-auto rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Lorenza está digitando…
                  </div>
                )}
              </div>

              {escalated ? (
                <a
                  href={`https://wa.me/${SUPORTE_WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="m-3 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Phone className="h-4 w-4" /> Falar com suporte {SUPORTE_LABEL}
                </a>
              ) : (
                <form onSubmit={handleSend} className="border-t border-border p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Pergunte sobre o sistema…"
                      maxLength={2000}
                      disabled={busy}
                    />
                    <Button type="submit" size="icon" disabled={busy || !input.trim()} className="bg-orange text-orange-foreground hover:bg-orange/90">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    {restante > 0
                      ? `${restante} pergunta(s) restante(s) antes do suporte humano`
                      : `Próxima pergunta encaminha para o suporte ${SUPORTE_LABEL}`}
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
