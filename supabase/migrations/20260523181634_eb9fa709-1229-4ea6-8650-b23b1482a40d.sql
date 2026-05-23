
-- ============================================
-- 1. ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.assinatura_status AS ENUM ('pendente','ativa','cancelada','expirada','inadimplente','trial');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pagamento_status AS ENUM ('pendente','aprovado','recusado','estornado','cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ciclo_plano AS ENUM ('mensal','trimestral','anual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- 2. PLANOS (catálogo)
-- ============================================
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  ciclo public.ciclo_plano NOT NULL,
  dias_duracao integer NOT NULL,
  preco_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  destaque boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  beneficios jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read planos" ON public.planos
  FOR SELECT USING (true);
CREATE POLICY "incorporadora manage planos" ON public.planos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'incorporadora'))
  WITH CHECK (has_role(auth.uid(),'incorporadora'));

CREATE TRIGGER planos_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 3. ASSINATURAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empreendimento_id uuid REFERENCES public.empreendimentos(id) ON DELETE SET NULL,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  status public.assinatura_status NOT NULL DEFAULT 'pendente',
  iniciada_em timestamptz,
  expira_em timestamptz,
  cancelada_em timestamptz,
  renovacao_automatica boolean NOT NULL DEFAULT true,
  aviso_renovacao_enviado boolean NOT NULL DEFAULT false,
  external_subscription_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assinaturas_user ON public.assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_expira ON public.assinaturas(expira_em);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own assinaturas" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR has_role(auth.uid(),'incorporadora')
      OR has_role(auth.uid(),'gerente'));

CREATE POLICY "admins manage assinaturas" ON public.assinaturas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'incorporadora') OR has_role(auth.uid(),'gerente'))
  WITH CHECK (has_role(auth.uid(),'incorporadora') OR has_role(auth.uid(),'gerente'));

CREATE TRIGGER assinaturas_updated_at BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 4. PAGAMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  plano_id uuid REFERENCES public.planos(id),
  valor_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  metodo text,
  provider text NOT NULL DEFAULT 'mercadopago',
  external_id text,
  external_status text,
  pago_em timestamptz,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagamentos_user ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura ON public.pagamentos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_external ON public.pagamentos(provider, external_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR has_role(auth.uid(),'incorporadora')
      OR has_role(auth.uid(),'gerente'));

CREATE POLICY "admins manage pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'incorporadora') OR has_role(auth.uid(),'gerente'))
  WITH CHECK (has_role(auth.uid(),'incorporadora') OR has_role(auth.uid(),'gerente'));

CREATE TRIGGER pagamentos_updated_at BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 5. AVISOS DE RENOVAÇÃO (gatilho 25º dia / Luna)
-- ============================================
CREATE TABLE IF NOT EXISTS public.avisos_renovacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  canal text NOT NULL DEFAULT 'luna',
  enviado_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'enviado',
  payload jsonb
);
CREATE INDEX IF NOT EXISTS idx_avisos_assinatura ON public.avisos_renovacao(assinatura_id);

ALTER TABLE public.avisos_renovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read avisos" ON public.avisos_renovacao
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR has_role(auth.uid(),'incorporadora')
      OR has_role(auth.uid(),'gerente'));

-- ============================================
-- 6. SEED dos 3 planos iniciais
-- ============================================
INSERT INTO public.planos (codigo, nome, descricao, ciclo, dias_duracao, preco_centavos, destaque, ordem, beneficios)
VALUES
  ('mensal_elite', 'Mensal Elite', 'Produto de entrada (tripwire). Foco em lançamentos pontuais.',
    'mensal', 30, 6990, false, 1,
    '["Roleta automatizada","Validação de presença","Painel completo de gerência","Suporte WhatsApp"]'::jsonb),
  ('trimestral', 'Trimestral', 'Estabilidade operacional para campanhas contínuas.',
    'trimestral', 90, 41970, false, 2,
    '["Tudo do Mensal Elite","Relatórios trimestrais","Integração CRM (Zapier/Make/n8n)","10% de economia"]'::jsonb),
  ('anual_executivo', 'Anual Executivo', 'Plano de ouro: maior economia + atendimento executivo.',
    'anual', 365, 167880, true, 3,
    '["Tudo do Trimestral","Atendimento de inauguração","Relatório executivo para diretoria","Customização de marca","Maior economia anual"]'::jsonb)
ON CONFLICT (codigo) DO NOTHING;
