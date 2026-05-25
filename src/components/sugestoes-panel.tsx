import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, X, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarSugestao } from "@/lib/sugestoes.functions";

/**
 * Painel flutuante de Sugestões — fica ancorado à direita,
 * abre/fecha o formulário (Nome | WhatsApp | E-mail | Sugestão).
 */
export function SugestoesPanel({ origem = "plantao" }: { origem?: string }) {
  const enviar = useServerFn(enviarSugestao);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", mensagem: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.whatsapp.trim() || !form.mensagem.trim()) {
      return toast.error("Nome, WhatsApp e Sugestão são obrigatórios.");
    }
    setBusy(true);
    try {
      await enviar({
        data: {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim() || undefined,
          mensagem: form.mensagem.trim(),
          origem,
        },
      });
      toast.success("Sugestão enviada. Obrigado!");
      setForm({ nome: "", whatsapp: "", email: "", mensagem: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar sugestão");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Botão fixo na borda direita */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-lg border border-r-0 border-orange/60 bg-orange px-3 py-4 text-[11px] font-bold uppercase tracking-wider text-orange-foreground shadow-lg shadow-orange/30 hover:bg-orange/90"
        aria-label="Abrir sugestões"
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4" /> Sugestões
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  <Lightbulb className="h-5 w-5 text-orange" /> Sugestões
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sua opinião melhora o atendimento. Campos obrigatórios marcados com *.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sug-nome" className="text-xs">Nome *</Label>
                <Input
                  id="sug-nome"
                  required
                  maxLength={120}
                  value={form.nome}
                  onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sug-wa" className="text-xs">WhatsApp *</Label>
                <Input
                  id="sug-wa"
                  required
                  maxLength={30}
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sug-email" className="text-xs">E-mail</Label>
                <Input
                  id="sug-email"
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="flex flex-1 flex-col space-y-1.5">
                <Label htmlFor="sug-msg" className="text-xs">Digite sua sugestão *</Label>
                <textarea
                  id="sug-msg"
                  required
                  maxLength={4000}
                  rows={10}
                  className="min-h-[220px] flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.mensagem}
                  onChange={(e) => setForm((s) => ({ ...s, mensagem: e.target.value }))}
                />
                <div className="text-right text-[10px] text-muted-foreground">
                  {form.mensagem.length}/4000
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar sugestão
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
