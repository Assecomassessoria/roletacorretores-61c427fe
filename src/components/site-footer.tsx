import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

const ECOSSISTEMA = [
  { nome: "Luiza IA", url: "https://assecomassessoria.net.br", icon: "💎" },
  { nome: "Luiza Mkt", url: "https://luiza.elitemkt.nom.br/", icon: "📈" },
  { nome: "Luna Messenger", url: "https://elitemessenger.com.br/", icon: "💬" },
  { nome: "Lowrence Elite", url: "https://www.academiaead.simuladorcorretorelite.com.br/", icon: "🎓" },
  { nome: "Laurens Elite ADS", url: "https://laurens.ads.simuladorcorretorelite.com.br/", icon: "🎯" },
  { nome: "Lorenza Roleta 4.0", url: "https://roletacorretor.simuladorcorretorelite.com.br/", icon: "🎡" },
  { nome: "Lauren Elite 4.0", url: "https://simuladorcorretorelite.com.br/", icon: "🚀" },
  { nome: "Lorento CRM", url: "https://lorentocrm.simuladorcorretorelite.com.br/", icon: "📊" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[var(--navy-deep)] text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">Razão Social</h4>
          <p className="text-xs leading-relaxed text-white/70">
            CNPJ 00.000.000/0001-00<br />
            WhatsApp (00) 0 0000-0000<br />
            <a href="mailto:contato@simuladorcorretorelite.com.br" className="text-orange/80 hover:text-orange">
              contato@simuladorcorretorelite.com.br
            </a>
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">Importante</h4>
          <p className="text-xs leading-relaxed text-white/70">
            <a href="https://simuladorcorretorelite.com.br" className="block text-orange/80 hover:text-orange">
              www.simuladorcorretorelite.com.br
            </a>
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">Programações &amp; Áreas</h4>
          <ul className="space-y-1 text-xs text-white/70">
            <li>Termos de Programação</li>
            <li>Política &amp; Privacidade</li>
            <li>Manual de Operações</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">Apresentação do Sistema</h4>
          <ul className="space-y-1 text-xs text-white/70">
            <li>Manual do Usuário</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-8">
        <h4 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-orange">
          Ecossistema 4.0 · Roleta 360º
        </h4>
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2">
          {ECOSSISTEMA.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-orange/30 bg-navy px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/85 transition hover:border-orange hover:bg-orange hover:text-orange-foreground"
              >
                <span aria-hidden className="text-sm leading-none">{s.icon}</span>
                {s.nome}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/60">
        Desenvolvido por <span className="font-bold text-orange">INFORMATIC</span> — Tecnologia da Informação · CNPJ 00.000.000/0001-00
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center">
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 rounded-md border border-orange/40 bg-navy px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-orange hover:bg-orange hover:text-orange-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Painel de Gestão Administrativo (Mestra)
        </Link>
      </div>
    </footer>
  );
}
