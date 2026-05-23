
# Área do Coordenador

Criar uma nova área dedicada ao **Coordenador** (acessível também pela Incorporadora/Gerente/Master) que centraliza toda a operação de um empreendimento. Baseada nos mockups enviados (Painel de Operações Pro).

## Nova rota

`src/routes/_authenticated/coordenador.tsx` — protegida por role `coordenador` (ou superior). Adicionar link **"Gerente/Coordenador"** no header de navegação.

## Estrutura da página (seções, top → bottom)

### 1. Cabeçalho de ações
- Seletor de empreendimento ativo
- Botões: **Bater Roleta Oficial**, **Salvar Alterações**, **Envia WhatsApp**, **PDF / Imprimir**

### 2. Ciclo Operacional Ativo
Três cards selecionáveis (radio): **Roleta Única** · **Roleta Manhã** · **Roleta Tarde**

### 3. Configuração de Períodos
Cards por turno (Comercial / Matutino / Vespertino) com horário início–fim editável.

### 4. Anexar Políticas e Regras do Plantão (PDF)
Upload de PDF por empreendimento (storage bucket `plantao-regras`). Mostra arquivo vinculado ou "Nenhum PDF vinculado (usando normas padrão)".

### 5. Identidade & Comunicação
- Nome do empreendimento ativo
- WhatsApp Grupo (DDD+número) — link do grupo oficial de vendas

### 6. Protocolos de Blindagem e Presença
4 cards indicadores (Geofencing / QR Code / Stand Wi-Fi / Liberação Mestra) + 3 blocos de configuração:
- **Parâmetros de Cerca GPS** — latitude, longitude, raio (m)
- **QR Code de Presença** — token ativo + botão "Gerar Novo Token" + preview do QR
- **Configuração de Rede** — SSID Wi-Fi + IP homologado

### 7. Gestão de Ativos e Períodos (Equipes)
Editar nomes **Equipe Alfa** / **Equipe Beta** + botões para acessar cada equipe.

### 8. Gestão de Corretores
- **Cadastros Aguardando Habilitação** (lista com botão Ativar)
- **Corretores Ativos** com ações Ativar | Desativar | Excluir

### 9. Auditoria & Automação (Cron)
Lista de cron jobs ativos (próximas execuções) — read-only.

## Backend (migração SQL)

Adicionar colunas ao `empreendimentos`:
- `ciclo_roleta` (`unica`|`manha`|`tarde`)
- `horario_comercial_inicio/fim`, `horario_matutino_inicio/fim`, `horario_vespertino_inicio/fim`
- `regras_pdf_url`, `whatsapp_grupo_url`
- `qr_token`, `ip_homologado`
- `equipe_alfa_nome` (default 'Equipe Alfa'), `equipe_beta_nome` (default 'Equipe Beta')

Adicionar ao `corretores`:
- `equipe` (`alfa`|`beta`|null)
- `status_habilitacao` (`pendente`|`ativo`|`desativado`) — substitui/complementa `ativo`

Storage bucket `plantao-regras` (privado, RLS por empreendimento).

## Detalhes técnicos

- Componente único grande dividido em sub-componentes locais por seção
- Mutations via Supabase client direto (já temos RLS)
- Geração de token QR: `crypto.randomBytes(4).toString('hex').toUpperCase()` + lib `qrcode` para SVG preview
- Upload PDF: `supabase.storage.from('plantao-regras').upload(...)`
- Cron list: query em `cron.job` via server function admin

## Fora do escopo (perguntar depois)
- Edição visual avançada dos protocolos (cores/tema por empreendimento)
- Disparo real de WhatsApp em massa pelo botão "Envia WhatsApp" (apenas abre o grupo por enquanto)
- Tela dedicada de cada Equipe (Alfa/Beta) — por ora só renomeação

## Estimativa
1 migração SQL + 1 rota nova (~600 linhas) + 1 link no header + 1 bucket de storage.

Confirma para eu implementar?
