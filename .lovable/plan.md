
# Plano de implementação — Roleta Corretor Elite 4.0

Você pediu o pacote completo. Para não estourar créditos em uma única rodada (foi o problema antes), vou fatiar em **4 fases**. Cada fase é entregue e testada antes de iniciar a próxima. Você aprova fase a fase.

---

## Fase 1 — Acesso Master e Login Real (PRIORITÁRIA)

**Objetivo:** Login por e-mail/senha. Quem tem role `incorporadora` acessa tudo (Setup, Gerência, Corretor) sem outras barreiras. RLS no Supabase já está pronta — falta o front consumir.

**Entregáveis:**
- Tela única `/login` (e-mail + senha) usando `supabase.auth.signInWithPassword`
- Redirecionamento por role após login:
  - `incorporadora` → menu completo (Setup + Gerência + Corretor + Roleta)
  - `gerente` / `coordenador` → Gerência + Roleta
  - `corretor` → Área do Corretor
- Mover `/corretor`, `/gerencia`, `/setup` para baixo de `_authenticated/` (com guard por role)
- Página `/setup` (Incorporadora) com:
  - CRUD de Empreendimentos
  - CRUD de Corretores
  - Atribuição de roles (`user_roles`) a um e-mail cadastrado
  - Cadastro do **usuário master** (você define o e-mail; eu insiro a role `incorporadora`)
- Cabeçalho mostra usuário logado + botão Sair

**Sem mexer em:** UI pública da landing, planos, countdown, footer (já aprovados).

---

## Fase 2 — Painel de Recepção + QR Code do Corretor

**Objetivo:** Cada corretor tem um QR pessoal; recepcionista lê e identifica o cliente.

**Entregáveis:**
- Rota `/qr?creci=XXXX` → renderiza QR Code dinâmico (lib `qrcode.react`, sem armazenar imagem)
- Painel do Corretor mostra o próprio QR + link copiável
- Rota `/recepcao` (acesso por role `recepcao` ou `coordenador`):
  - Campo para escanear/colar código → mostra "Cliente esperado por: [Nome do Corretor]"
  - Botão "Registrar chegada" → grava em `atendimentos` e dispara webhook (placeholder p/ Luna Messenger)

**Migration necessária:** adicionar role `recepcao` ao enum `app_role` e campo `creci_unique` em `corretores`.

---

## Fase 3 — Lógica de Triagem Lorenza (Backend)

**Objetivo:** Endpoint que recebe input da Lorenza e roteia conforme as 5 opções (A/B/C/D/E).

**Entregáveis:**
- Server route `POST /api/public/triagem` (assinatura HMAC obrigatória — secret `LORENZA_WEBHOOK_SECRET`)
- Implementa o `switch(cliente.opcao)` que você descreveu:
  - **A/C** → busca corretor por CRECI/WhatsApp → se no stand, aciona; senão, último da roleta
  - **B** → próximo da fila (primeiro da vez)
  - **D/E** → encaminha ao coordenador da roleta
- Funções helper: `buscarCorretor`, `corretorNoStand` (checa `plantoes.presenca_confirmada_em` do dia), `alocarParaUltimoDaRoleta`, `alocarParaPrimeiroDaVez`, `encaminharParaCoordenadorRoleta`
- Tabela `triagens_lorenza` (log de cada chamada para auditoria)

---

## Fase 4 — Webhook Luna Messenger + Notificações

**Objetivo:** Disparar alerta WhatsApp quando recepção registra chegada ou triagem aciona corretor.

**Entregáveis:**
- Server function `notificarCorretor(corretor_id, mensagem)` que chama a API da Luna Messenger
- Secret `LUNA_MESSENGER_API_KEY` (vou pedir quando chegarmos nesta fase)
- Hook automático nos eventos: chegada registrada, triagem alocada, plantão atribuído

---

## Custos estimados (créditos Lovable)

| Fase | Complexidade | Estimativa |
|------|-------------|------------|
| 1    | Média       | ~baixa-média (auth já configurado no Supabase) |
| 2    | Baixa-média | ~baixa |
| 3    | Média       | ~média (lógica de negócio + testes) |
| 4    | Baixa       | ~baixa (depende da doc Luna) |

---

## O que preciso de você ANTES da Fase 1

1. **E-mail do usuário master** (será o seu login com role `incorporadora`)
2. **Senha inicial** (pode trocar depois; mínimo 8 caracteres) — você define no momento do primeiro signup pela tela de login

Confirme o plano e me passe o e-mail master para eu começar a Fase 1.
