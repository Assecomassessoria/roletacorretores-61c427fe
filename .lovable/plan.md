# Reimplantação do Roleta Corretor (do zero) — TanStack Start + Lovable Cloud

A proposta da **imagem 3** (app completo: login por papel, roleta, plantões, presença por geofencing/Wi-Fi/QR, relatórios semanais, painel admin) tem ~7.700 linhas de código no `App.tsx` original + Worker + D1. **Não dá para portar tudo em uma única mensagem** — o arquivo sozinho excede o limite prático de edição. Vamos fatiar em fases curtas, cada uma testável.

## Arquitetura alvo

- **Frontend:** TanStack Start (já configurado neste projeto), rotas em `src/routes/`, UI com Tailwind/shadcn.
- **Backend:** Lovable Cloud (Postgres + Auth + Storage + Cron + Email Resend) — substitui D1/Workers/KV.
- **Auth:** Lovable Cloud Auth (email/senha) + tabela `user_roles` (`incorporadora`, `gerente`, `coordenador`, `corretor`) com função `has_role()` SECURITY DEFINER. Nada de senha hardcoded.
- **Cron:** `pg_cron` chamando endpoints `/api/public/*` com assinatura HMAC.
  - Domingo 23:59 BRT → arquiva semana e zera contadores.
  - Sexta 23:59 BRT → dispara relatório por e-mail (Resend).
- **Retenção:** dados ativos por 7–8 dias; histórico semanal por 30 dias; purga automática.

## Fases (entrega incremental, cada uma roda no preview antes da próxima)

### Fase 1 — Fundação (esta resposta, se aprovado)
- Habilitar Lovable Cloud.
- Criar schema base: `profiles`, `user_roles`, `empreendimentos`, `corretores`, `plantoes`, `atendimentos`, `historico_semanal`, `email_log`.
- RLS em todas as tabelas + função `has_role()`.
- Trigger `handle_new_user` cria profile no signup.
- Página `/login` (email/senha) + `/` landing (mantém visual da imagem 2).
- Rota protegida `/app` com layout `_authenticated`.

### Fase 2 — Cadastros e Roleta
- CRUDs de empreendimentos, corretores, escala de plantões (UI shadcn).
- Lógica de roleta justa (próximo da fila respeitando presença).
- Check-in com geofencing (geolocation API) + validação de Wi-Fi (SSID via input do gerente) + QR Code dinâmico (rotativo a cada 5 min).

### Fase 3 — Atendimentos e dashboard
- Registro de atendimento, transferência, status.
- Dashboard por papel (corretor vê só seus; gerente vê stand; incorporadora vê tudo).
- Tela de configuração mestra (substitui o painel da imagem 3).

### Fase 4 — Cron, e-mail e relatórios
- Configurar `pg_cron` + endpoints `/api/public/cron/arquivar` e `/api/public/cron/relatorio`.
- Integração Resend (peço a chave depois) para envio de relatório semanal.
- Botão "Enviar relatório agora" no painel.
- Purga automática de histórico >30 dias.

### Fase 5 — Polimento e go-live
- Auditoria de segurança (RLS, secrets, HIBP).
- SEO/meta, `_headers`, HSTS.
- Apontar DNS `roletacorretor.simuladorcorretorelite.com.br` para a publicação Lovable.

## Custo estimado (Lovable Cloud)

Para o volume descrito (uso diário em plantões, retenção curta), deve ficar **dentro do crédito gratuito mensal** (~US$ 25). Os maiores consumos serão Auth + Postgres rows + envio de e-mail. Se passar do free tier, mostro como reduzir.

## O que **não** vou trazer do ZIP

- Hardcoded passwords (`47231970`, `123456`, etc.) — vão para `user_roles` com hash bcrypt do Supabase Auth.
- Validação client-side de senha — toda autenticação no servidor.
- `worker.js`, `wrangler.toml`, D1 migrations — substituídos por Postgres + server functions.

## Confirmação necessária antes da Fase 1

1. **Confirmo que vou apagar o conteúdo atual da landing** e construir o app de verdade nas rotas (mantenho a landing como `/` opcional).
2. **Confirmo o reset:** seus dados antigos do D1 da Cloudflare **não** serão migrados — começamos com banco vazio. Se precisar migrar dados existentes, me avisa antes.
3. Posso pedir 1 secret na Fase 4: `RESEND_API_KEY` (para e-mail). Você cria conta gratuita em resend.com.

Aprova esse plano (ou ajusta) e eu começo pela Fase 1 imediatamente.