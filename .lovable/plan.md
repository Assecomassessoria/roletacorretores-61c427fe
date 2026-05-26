# Período de Ausência — Detecção automática e remoção da roleta

## Objetivo
Quando o corretor sair do raio do stand (geofence) ou perder o Wi-Fi homologado, o sistema começa a contar o tempo. Ao atingir o **Período de Ausência** configurado pelo Coordenador (ex.: 60 min), o painel marca o corretor como **Ausente** e ele é **removido automaticamente da roleta** do dia.

## Passo 1 — Configuração (Coordenador)
- Novo campo `periodo_ausencia_minutos` em `empreendimentos` (default 60).
- UI em `/coordenador`, dentro do bloco "Configuração de períodos", logo acima de Comercial/Matutino/Vespertino:
  - Input numérico **"Período de ausência (minutos)"** com slider 5–240.
  - Salva junto com o restante do empreendimento.

## Passo 2 — Detecção (corretor presente)
- Em `plantoes`, novos campos:
  - `ultimo_ping_em timestamptz` — atualizado a cada heartbeat dentro do raio.
  - `fora_desde timestamptz` — primeiro momento detectado fora do raio (NULL = dentro).
  - `status_presenca text` — `'presente' | 'ausente'` (cache derivado).
- No painel `/roleta` (e `/plantao` quando o corretor tem check-in), um hook envia ping de geolocalização a cada 60s:
  - Dentro do raio → atualiza `ultimo_ping_em`, zera `fora_desde`, status `presente`.
  - Fora do raio → mantém `fora_desde` (preserva o primeiro), status calculado pelo tempo decorrido.
- Em `/roleta`, a fila marca:
  - 🟢 **Presente** (verde) — dentro do raio.
  - 🔴 **Ausente** (vermelho) — fora do raio há ≥ `periodo_ausencia_minutos`.
  - 🟡 **Saiu há X min** — fora, mas ainda dentro do prazo.

## Passo 3 — Auto-remoção da roleta
- Server fn `marcarAusentesEAtualizarRoleta` (chamada periodicamente pelo painel `/roleta` a cada 60s):
  - Para cada plantão do dia com `fora_desde IS NOT NULL` e `now() - fora_desde >= periodo_ausencia_minutos`:
    - Atualiza `status_presenca = 'ausente'`, `status = 'ausente'`.
    - Corretor sai da fila (`fila` em `/roleta` já filtra por `status_presenca = 'presente'`).
  - Se o corretor voltar (ping dentro do raio) **antes** do prazo, volta para presente; **depois** do prazo permanece ausente até admin reativar.

## Detalhes técnicos
- Migration:
  - `ALTER TABLE empreendimentos ADD COLUMN periodo_ausencia_minutos integer NOT NULL DEFAULT 60;`
  - `ALTER TABLE plantoes ADD COLUMN ultimo_ping_em timestamptz, ADD COLUMN fora_desde timestamptz, ADD COLUMN status_presenca text NOT NULL DEFAULT 'presente';`
  - Política RLS extra em `plantoes` para o corretor atualizar `ultimo_ping_em`/`fora_desde`/`status_presenca` da própria linha (o trigger guard atual já permite, pois não está na lista bloqueada — verifico).
- Server fn nova `src/lib/presenca.functions.ts`:
  - `pingPresenca({ plantao_id, lat, lng })` — calcula distância e atualiza colunas.
  - `varrerAusentes({ empreendimento_id })` — aplica regra de auto-remoção (admin via `supabaseAdmin`, sem auth).
- Frontend:
  - `/coordenador`: novo campo no bloco de períodos.
  - `/roleta`: hook `useEffect` com `setInterval(60_000)` enviando ping + varrendo ausentes; badges coloridas (verde/amarelo/vermelho) na fila.

## Arquivos afetados
- `supabase/migrations/<nova>.sql` (schema + policy)
- `src/lib/presenca.functions.ts` (nova)
- `src/routes/_authenticated/coordenador.tsx` (campo de configuração)
- `src/routes/_authenticated/roleta.tsx` (ping + badges + varredura)
- `src/integrations/supabase/types.ts` (auto-gerado pela migration)

## Fora de escopo (nesta entrega)
- Wi-Fi homologado como sinal redundante: a infra (`wifi_ssid`, `ip_homologado`) já existe, mas browser não expõe SSID; manteremos apenas geofence neste passo. Posso adicionar checagem por IP homologado num passo seguinte.
- Cron server-side: a varredura roda enquanto algum coordenador tem `/roleta` aberta. Se quiser garantir varredura 24/7, posso adicionar pg_cron num próximo passo.

Confirma para eu executar?
