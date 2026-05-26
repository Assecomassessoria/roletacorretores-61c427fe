## Objetivo

Permitir cadastrar uma biometria (digital/Face ID) deste dispositivo logo após criar a conta e, em `/plantao`, validar a presença com Biometria **ou** Senha (fallback).

## Domínios envolvidos

- Cadastros: `/setup` (incorporadora/demo) e `/corretor/cadastro` (corretor). Após o cadastro com sucesso, mostramos o botão **“Cadastrar biometria neste dispositivo”**.
- `/plantao`: além da senha, oferecer botão **“Usar Biometria”**, que abre o sensor do aparelho. Se cancelar/falhar → cai automaticamente para o campo Senha (fallback).

## Banco de dados (1 migração)

Tabela `public.webauthn_credentials`:
- `id uuid pk`
- `user_id uuid` (FK lógica para `auth.users.id`)
- `corretor_id uuid null` (FK para `public.corretores.id`) — preenchido quando o user_id corresponde a um corretor; facilita a busca em `/plantao` por CRECI.
- `credential_id text unique` (base64url)
- `public_key text` (base64url)
- `counter bigint default 0`
- `transports text[]`
- `device_label text` (ex.: “iPhone do João”)
- `created_at`, `last_used_at`

Tabela `public.webauthn_challenges` (curtíssima duração):
- `id uuid pk`, `user_id uuid null`, `corretor_id uuid null`, `creci text null`, `empreendimento_id uuid null`
- `challenge text`, `tipo text check (tipo in ('registration','authentication'))`
- `expires_at timestamptz` (now() + 5 min)

RLS: ambas com RLS ativada. `webauthn_credentials`: SELECT/DELETE somente do próprio `user_id`. `webauthn_challenges`: sem políticas para clientes; todas as operações são feitas pelo `supabaseAdmin` em server functions.

## Dependências

- `@simplewebauthn/server` (server functions)
- `@simplewebauthn/browser` (frontend)

## Server functions (novo arquivo `src/lib/webauthn.functions.ts`)

Todas usando `supabaseAdmin` e variáveis `WEBAUTHN_RP_ID` (ex.: `simuladorcorretorelite.com.br` em prod, `localhost` em dev) e `WEBAUTHN_ORIGIN` (derivado da request).

1. `startRegistration` (auth via `requireSupabaseAuth`) — gera options + salva challenge.
2. `finishRegistration` (auth) — verifica resposta, grava em `webauthn_credentials` (linkando ao corretor se houver).
3. `startAuthenticationPlantao` (público) — input: `empreendimento_id`, `creci`. Busca corretor, lista credenciais, devolve options + challenge.
4. `finishAuthenticationPlantao` (público) — verifica assinatura, atualiza `counter`/`last_used_at`, emite **token de biometria** de uso único (UUID guardado em tabela com TTL 60s) ligado ao corretor+empreendimento+today.
5. `checkInPlantao` (alteração mínima): aceitar `biometric_token` opcional como alternativa à senha. Quando presente e válido, pula `signInWithPassword`.

## Frontend

### `/setup` e `/corretor/cadastro`
- Após sucesso do cadastro, em vez de redirecionar imediatamente, mostrar um card final com botão **“Cadastrar biometria neste dispositivo”** (e link “pular por agora”).
- Botão chama `startRegistration` → `@simplewebauthn/browser` `startRegistration()` → `finishRegistration`. Toast de sucesso/erro. Em seguida segue navegação.

### `/plantao`
- Acima do campo Senha: botão grande **“Entrar com Biometria”** (visível quando CRECI + empreendimento estão preenchidos).
- Fluxo: chama `startAuthenticationPlantao` → `startAuthentication()` no browser → `finishAuthenticationPlantao` → recebe `biometric_token` → submete `checkInPlantao` com o token (e localização/SSID/etc) — sem pedir senha.
- `try/catch`: qualquer erro (cancelamento, sem credencial, falha de hardware) exibe toast suave e mantém o campo Senha visível como fallback.

## UI / Padrão visual

- Botões “Cadastrar Biometria” / “Entrar com Biometria” em estilo navy/orange já usado no projeto (`bg-navy`/`bg-orange`), com ícone `Fingerprint` do `lucide-react`.

## Segurança / Notas

- `rpID`: derivado do host (server-side). Subdomínios funcionam se `rpID` for o domínio raiz (`simuladorcorretorelite.com.br`) — configurável via secret.
- Challenge sempre salvo no servidor; nunca confiar em valor enviado pelo cliente.
- `biometric_token` é uso único, TTL 60s, vinculado a (corretor, empreendimento, dia).
- Senha continua existindo (fallback obrigatório).
- WebAuthn exige HTTPS — preview/published já são HTTPS.

## Arquivos a criar/editar

- **Novo**: `src/lib/webauthn.functions.ts`
- **Editar**: `src/lib/plantao.functions.ts` (aceitar `biometric_token`)
- **Editar**: `src/routes/setup.tsx`, `src/routes/corretor_.cadastro.tsx` (card pós-cadastro)
- **Editar**: `src/routes/plantao.tsx` (botão Biometria)
- **Novo**: componente `src/components/biometria-button.tsx` (reuso)
- **Migração**: tabelas `webauthn_credentials`, `webauthn_challenges`, `biometric_tokens`

Confirma para eu executar?
