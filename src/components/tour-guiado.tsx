import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MonitorSmartphone,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type Passo = {
  id: string;
  etapa: string;
  titulo: string;
  descricao: string;
  itens: string[];
  icon: typeof QrCode;
  rota?: { to: string; label: string };
};

const PASSOS: Passo[] = [
  {
    id: "totem",
    etapa: "1. Recepção",
    titulo: "O cliente chega e faz o check-in sozinho",
    descricao:
      "No totem ou pelo QR Code do stand, o visitante informa nome e WhatsApp em segundos. Nada de papel, planilha ou fila na porta.",
    itens: ["QR Code exclusivo por empreendimento", "Cadastro do lead em menos de 30s", "Entrada automática na fila do dia"],
    icon: QrCode,
    rota: { to: "/totem", label: "Ver o Totem do cliente" },
  },
  {
    id: "escala",
    etapa: "2. Escala semanal",
    titulo: "Cada corretor escolhe o dia e o período",
    descricao:
      "Integral, manhã ou tarde: o próprio corretor marca a presença na escala da equipe. O coordenador acompanha as vagas abertas em tempo real.",
    itens: ["Períodos Integral / Manhã / Tarde", "Vaga aberta visível para a equipe", "Histórico de inscrição com horário"],
    icon: CalendarDays,
    rota: { to: "/corretor", label: "Área do Corretor" },
  },
  {
    id: "presenca",
    etapa: "3. Validação de presença",
    titulo: "Presença confirmada com CRECI e GPS",
    descricao:
      "No painel exclusivo de validação, o corretor confirma o plantão. A cerca de GPS garante que ele está mesmo no stand e o sistema detecta ausências.",
    itens: ["Painel exclusivo de validação por CRECI", "Cerca de GPS por endereço e raio", "Ausência com contagem de tempo e histórico"],
    icon: MonitorSmartphone,
    rota: { to: "/plantao", label: "Abrir painel de validação" },
  },
  {
    id: "roleta",
    etapa: "4. A roleta",
    titulo: "O sorteio justo, automático e travado",
    descricao:
      "No horário configurado a roleta gira sozinha, aplica os critérios definidos pela gerência e congela a fila oficial até o fim do dia.",
    itens: ["Critérios em cascata (chegada, atendimentos, leads)", "Ordem House / Imobiliária", "Fila congelada — não muda com F5"],
    icon: Sparkles,
    rota: { to: "/plantao", label: "Ver plantão ao vivo" },
  },
  {
    id: "gestao",
    etapa: "5. Gestão",
    titulo: "A incorporadora enxerga tudo",
    descricao:
      "Configurações, auditoria do sorteio, histórico de atendimentos e ausências. Governança total sem depender de ninguém no código.",
    itens: ["Horários e critérios editáveis na tela", "Auditoria completa do sorteio", "Relatórios de presença e atendimento"],
    icon: Users,
    rota: { to: "/gerencia", label: "Área de Gerência" },
  },
];

const DURACAO = 9000;

export function TourGuiado() {
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [progresso, setProgresso] = useState(0);
  const inicio = useRef<number>(0);

  const total = PASSOS.length;
  const passo = PASSOS[i]!;

  const proximo = useCallback(() => setI((v) => (v + 1) % total), [total]);
  const anterior = useCallback(() => setI((v) => (v - 1 + total) % total), [total]);

  const abrir = () => {
    setI(0);
    setProgresso(0);
    setTocando(true);
    setAberto(true);
  };

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
      if (e.key === "ArrowRight") proximo();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === " ") {
        e.preventDefault();
        setTocando((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, proximo, anterior]);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  useEffect(() => {
    setProgresso(0);
    if (!aberto || !tocando) return;
    inicio.current = Date.now();
    const t = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - inicio.current) / DURACAO);
      setProgresso(p);
      if (p >= 1) proximo();
    }, 80);
    return () => window.clearInterval(t);
  }, [aberto, tocando, i, proximo]);

  const Icone = passo.icon;
  const percentual = useMemo(() => Math.round(((i + progresso) / total) * 100), [i, progresso, total]);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-2 rounded-full border border-cream/30 bg-cream/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-cream transition hover:border-orange/70 hover:bg-orange/10"
      >
        <Play className="h-4 w-4 text-orange" /> Tour guiado interativo
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-deep/90 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Tour guiado do sistema"
          onClick={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-orange/40 bg-navy shadow-2xl">
            {/* barra de progresso geral */}
            <div className="h-1 w-full bg-cream/10">
              <div
                className="h-full bg-gradient-to-r from-orange to-gold transition-[width] duration-100"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-cream/10 px-5 py-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-orange">
                Tour guiado · {i + 1}/{total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTocando((v) => !v)}
                  aria-label={tocando ? "Pausar" : "Reproduzir"}
                  className="rounded-full p-2 text-cream/70 transition hover:bg-cream/10 hover:text-cream"
                >
                  {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setI(0);
                    setProgresso(0);
                  }}
                  aria-label="Recomeçar"
                  className="rounded-full p-2 text-cream/70 transition hover:bg-cream/10 hover:text-cream"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar tour"
                  className="rounded-full p-2 text-cream/70 transition hover:bg-cream/10 hover:text-cream"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-orange/40 bg-orange/10 text-orange">
                  <Icone className="h-6 w-6" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold">{passo.etapa}</span>
                  <h3 className="mt-1 font-display text-2xl font-bold leading-tight text-cream sm:text-3xl">
                    {passo.titulo}
                  </h3>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-cream/80 sm:text-base">{passo.descricao}</p>

              <ul className="mt-5 grid gap-2">
                {passo.itens.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm text-cream/75">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                    {it}
                  </li>
                ))}
              </ul>

              {passo.rota && (
                <Link
                  to={passo.rota.to}
                  onClick={() => setAberto(false)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-orange/90"
                >
                  {passo.rota.label} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-cream/10 px-5 py-3">
              <button
                type="button"
                onClick={anterior}
                className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-xs font-semibold text-cream/80 transition hover:border-orange/60 hover:text-cream"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>

              <div className="flex items-center gap-1.5">
                {PASSOS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.etapa}
                    onClick={() => setI(idx)}
                    className={
                      "h-2 rounded-full transition-all " +
                      (idx === i ? "w-6 bg-orange" : "w-2 bg-cream/25 hover:bg-cream/50")
                    }
                  />
                ))}
              </div>

              {i === total - 1 ? (
                <Link
                  to="/planos"
                  onClick={() => setAberto(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110"
                >
                  Ver planos <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={proximo}
                  className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-orange/90"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
