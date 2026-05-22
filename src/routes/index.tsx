import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Headphones, Mail, Phone, Sparkles, User, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import lorenzaImg from "@/assets/lorenza.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Roleta Corretor | Simulador Corretor Elite 4.0" },
      {
        name: "description",
        content:
          "Gestão de presença dinâmica para stands de incorporadoras: roleta justa, geofencing, Wi-Fi local, QR Code, escala de plantões e relatórios automáticos.",
      },
      { property: "og:title", content: "Roleta Corretor — Elite 4.0" },
      { property: "og:description", content: "Sistema profissional de roleta digital para corretores e incorporadoras." },
    ],
  }),
});

/* ---------- Countdown (target: end-of-week Sunday 23:59:59 BRT) ---------- */
function useCountdown() {
  const [t, setT] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
  useEffect(() => {
    function tick() {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday
      const target = new Date(now);
      const diasAteDomingo = (7 - day) % 7;
      target.setDate(now.getDate() + diasAteDomingo);
      target.setHours(23, 59, 59, 0);
      const diff = Math.max(0, target.getTime() - now.getTime());
      const dias = Math.floor(diff / 86400000);
      const horas = Math.floor((diff % 86400000) / 3600000);
      const minutos = Math.floor((diff % 3600000) / 60000);
      const segundos = Math.floor((diff % 60000) / 1000);
      setT({ dias, horas, minutos, segundos });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-md bg-black/40 px-3 py-2 ring-1 ring-orange/30 min-w-[64px]">
      <span className="font-display text-2xl font-bold tabular-nums text-orange sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

/* ---------- Page ---------- */
function Landing() {
  const c = useCountdown();
  const [plano, setPlano] = useState<"auto" | "padrao">("auto");
  const [form, setForm] = useState({ nome: "", imobiliaria: "", cpf: "", whatsapp: "", email: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.cpf || !form.whatsapp || !form.email) {
      toast.error("Preencha nome, CPF, WhatsApp e e-mail.");
      return;
    }
    toast.success("Cadastro recebido! Aguarde — em breve enviaremos o acesso de teste por e-mail.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* gradient strip */}
      <div className="h-1 bg-gradient-to-r from-orange via-gold to-orange/40" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Hero card */}
        <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
          {/* avatar */}
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-orange/50">
              <img src={lorenzaImg} alt="Lorenza IA" width={160} height={160} className="h-full w-full object-cover" />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Lorenza IA — Representante de Vendas
            </p>
          </div>

          {/* dark countdown card */}
          <div className="mt-6 rounded-xl bg-[var(--navy-deep)] p-5 text-navy-foreground ring-1 ring-orange/20">
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange ring-1 ring-orange/40">
                <Sparkles className="h-3 w-3" /> Roleta Corretor · Ativada
              </span>
            </div>
            <h2 className="text-center font-display text-lg font-bold uppercase tracking-wider text-orange sm:text-xl">
              Tempo limite operacional excedido
            </h2>
            <div className="mt-4 flex justify-center gap-2 sm:gap-3">
              <CountdownCell value={c.dias} label="Dias" />
              <CountdownCell value={c.horas} label="Horas" />
              <CountdownCell value={c.minutos} label="Min" />
              <CountdownCell value={c.segundos} label="Seg" />
            </div>
            <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-center text-[11px] text-gold">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              <strong>ROLETA CORRETOR:</strong> Energia pendente no painel. Realize um plano para liberar seu acesso.
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/70">
              Para liberar o seu Roleta Corretor, basta escolher o plano ideal para o momento atual do seu negócio.{" "}
              <Link to="/planos" className="font-semibold text-orange underline">
                Vamos juntos?
              </Link>
            </p>
          </div>

          {/* status card */}
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status do Simulador de Corretor
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Código de Acesso</div>
                <div className="font-mono text-sm font-semibold">RC-XXX.YYY.ZZZ-WW</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema Plataforma</div>
                <div className="font-mono text-sm font-semibold">SIMULADOR CORRETOR ELITE 4.0</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status Operacional</div>
                <div className="text-sm font-bold text-orange">PENDENTE</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data de Verificação</div>
                <div className="font-mono text-sm font-semibold">{new Date().toLocaleDateString("pt-BR")}</div>
              </div>
            </div>
          </div>

          {/* cadastro */}
          <form onSubmit={handleSubmit} className="mt-6 rounded-lg border border-border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-orange">
              <Sparkles className="h-4 w-4" /> Cadastro de Demonstração (Plano Experiência)
            </div>
            <p className="mb-4 text-[11px] text-muted-foreground">
              Preencha e libere a versão de teste do seu painel de gestão profissional.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do Receptor</Label>
                <Input
                  placeholder="Ex.: Pedro de Alcantara"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Imobiliária / Stand</Label>
                <Input
                  placeholder="Ex.: Elite Imóveis Stand Sul"
                  value={form.imobiliaria}
                  onChange={(e) => setForm({ ...form, imobiliaria: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">CPF do Receptor</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">WhatsApp do Receptor</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">E-mail Administrativo</Label>
                <Input
                  type="email"
                  placeholder="contato@dominio.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PlanoCard
                selected={plano === "auto"}
                onClick={() => setPlano("auto")}
                title="Plano 7 dias renovação automática"
                desc="Renova automaticamente após o período de testes. Cancele a qualquer momento sem custos extras."
                badge="recomendado"
              />
              <PlanoCard
                selected={plano === "padrao"}
                onClick={() => setPlano("padrao")}
                title="Plano 7 dias padrão"
                desc="Sete dias de testes, sem cobrança automática. Requer ação manual para upgrade ao final."
              />
            </div>

            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--navy-deep)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-navy-foreground shadow-md transition hover:bg-navy"
            >
              <ShieldCheck className="h-4 w-4" /> Liberar 7 dias de testes Roleta Corretor
            </button>
          </form>

          {/* footer ctas */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/planos"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-orange px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-foreground shadow-md hover:bg-orange/90"
            >
              <Tag className="h-4 w-4" /> Visualizar planos &amp; upgrade imediato
            </Link>
            <a
              href="mailto:suporte@simuladorcorretorelite.com.br"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--navy-deep)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-navy-foreground shadow-md hover:bg-navy"
            >
              <Headphones className="h-4 w-4" /> Contactar suporte administrativo
            </a>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3" /> Dados protegidos · sessão criptografada
          </p>
        </section>

        {/* quick access trio (mirror of header tabs) */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickLink to="/corretor" icon={<User className="h-4 w-4" />} label="Área do Corretor" tone="orange" />
          <QuickLink to="/gerencia" icon={<Phone className="h-4 w-4" />} label="Gerência / Coordenação" tone="navy" />
          <QuickLink to="/setup" icon={<Mail className="h-4 w-4" />} label="Incorporadora (Setup)" tone="gold" />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------- helpers ---------- */
function Tag(props: { className?: string }) {
  return <Sparkles {...props} />;
}

function PlanoCard({
  selected,
  onClick,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative rounded-lg border p-3 text-left transition " +
        (selected
          ? "border-orange bg-orange/5 ring-2 ring-orange/40"
          : "border-border bg-card hover:border-orange/40")
      }
    >
      {badge && (
        <span className="absolute -top-2 right-2 rounded-full bg-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-orange-foreground">
          {badge}
        </span>
      )}
      <div className="flex items-start gap-2">
        <span
          className={
            "mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border " +
            (selected ? "border-orange bg-orange" : "border-muted-foreground/40")
          }
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function QuickLink({
  to,
  icon,
  label,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  tone: "orange" | "navy" | "gold";
}) {
  const cls =
    tone === "orange"
      ? "bg-orange text-orange-foreground hover:bg-orange/90"
      : tone === "gold"
      ? "bg-gold text-gold-foreground hover:bg-gold/90"
      : "bg-[var(--navy-deep)] text-navy-foreground hover:bg-navy";
  return (
    <Link
      to={to}
      className={"group inline-flex items-center justify-between rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-widest shadow-md transition " + cls}
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
      <ChevronRight className="h-4 w-4 opacity-70 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
