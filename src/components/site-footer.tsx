import { Link } from "@tanstack/react-router";
import { ShieldCheck, Phone, MessageCircle, Mail } from "lucide-react";

const ECOSSISTEMA = [
  { produto: "Simulação Personalizada", agente: "Luiza IA", url: "https://assecomassessoria.net.br" },
  { produto: "Marketing Imobiliário", agente: "Luiza Mkt", url: "https://luiza.elitemkt.nom.br/" },
  { produto: "Atendimento Mensagens", agente: "Luna Messenger • API Terminal", url: "https://elitemessenger.com.br/" },
  { produto: "Academia Elite EAD", agente: "Lowrence Elite", url: "https://www.academiaead.simuladorcorretorelite.com.br/" },
  { produto: "Tráfego Pago Imobiliário", agente: "Laurens Elite ADS", url: "https://laurens.ads.simuladorcorretorelite.com.br/" },
  { produto: "Escala de Plantão", agente: "Lorenza Roleta Corretores • API Terminal", url: "https://roletacorretor.simuladorcorretorelite.com.br/" },
  { produto: "Desenvolvedor LP/Sites", agente: "Lauren Elite 4.0", url: "https://simuladorcorretorelite.com.br/" },
  { produto: "Gestão de CRM", agente: "Lorento CRM", url: "https://lorentocrm.simuladorcorretorelite.com.br/" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[var(--navy-deep)] text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Canais de Suporte
          </h4>
          <ul className="space-y-2 text-xs leading-relaxed text-white/80">
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-orange/80" />
              <a href="tel:+5511922052470" className="hover:text-orange">
                (11) 9 2205-2470
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-orange/80" />
              <a
                href="https://wa.me/5511920024853"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange"
              >
                WhatsApp (11) 9 2002-4853
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-orange/80" />
              <a
                href="mailto:contatoapps@simuladorcorretorelite.com.br"
                className="break-all hover:text-orange"
              >
                contatoapps@simuladorcorretorelite.com.br
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Institucional
          </h4>
          <ul className="space-y-2 text-xs leading-relaxed text-white/80">
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-orange/80" />
              <a
                href="mailto:simulador@simuladorcorretorelite.com.br"
                className="break-all hover:text-orange"
              >
                simulador@simuladorcorretorelite.com.br
              </a>
            </li>
            <li>
              <a
                href="https://simuladorcorretorelite.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange/90 hover:text-orange"
              >
                www.simuladorcorretorelite.com.br
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Privacidade e Ética
          </h4>
          <ul className="space-y-1.5 text-xs text-white/80">
            <li>
              <Link to="/lgpd" className="hover:text-orange">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link to="/lgpd" className="hover:text-orange">
                Termos e Condições
              </Link>
            </li>
            <li>
              <Link to="/lgpd" className="hover:text-orange">
                Exclusão de Dados (LGPD)
              </Link>
            </li>
            <li>
              <Link to="/lgpd" className="font-semibold text-orange/90 hover:text-orange">
                Tratamento de Dados (LGPD/GDPR)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Apresentação do Sistema
          </h4>
          <ul className="space-y-1.5 text-xs text-white/80">
            <li>
              <Link
                to="/apresentacao"
                className="font-semibold text-gold hover:text-orange"
              >
                Apresentação do Sistema
              </Link>
            </li>
            <li>
              <a
                href="/docs/manual-do-usuario.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange"
              >
                Manual do Usuário (PDF)
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-8">
        <h4 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-orange">
          Ecossistema 4.0 · Roleta 360º
        </h4>
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {ECOSSISTEMA.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-md border border-orange/30 bg-navy px-3 py-2 text-center transition hover:border-orange hover:bg-orange hover:text-orange-foreground"
              >
                <span className="text-[10px] font-semibold uppercase leading-tight text-white/90">
                  {s.produto}
                </span>
                <span className="mt-0.5 text-[9px] leading-tight text-orange/70">{s.agente}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-md border border-orange/40 bg-navy px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-orange hover:bg-orange hover:text-orange-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Painel de Gestão Administrativo (Mestra)
        </Link>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/60">
        Todos os direitos reservados. Desenvolvido por{" "}
        <span className="font-bold text-orange">INFORMATIC</span> — Tecnologia em Informações ·
        CNPJ 00.921.557/0001-65
      </div>
    </footer>
  );
}
