
-- 1) empreendimentos: campos do coordenador
ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS ciclo_roleta text NOT NULL DEFAULT 'unica',
  ADD COLUMN IF NOT EXISTS horario_comercial_inicio time,
  ADD COLUMN IF NOT EXISTS horario_comercial_fim time,
  ADD COLUMN IF NOT EXISTS horario_matutino_inicio time,
  ADD COLUMN IF NOT EXISTS horario_matutino_fim time,
  ADD COLUMN IF NOT EXISTS horario_vespertino_inicio time,
  ADD COLUMN IF NOT EXISTS horario_vespertino_fim time,
  ADD COLUMN IF NOT EXISTS regras_pdf_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url text,
  ADD COLUMN IF NOT EXISTS ip_homologado text,
  ADD COLUMN IF NOT EXISTS equipe_alfa_nome text NOT NULL DEFAULT 'Equipe Alfa',
  ADD COLUMN IF NOT EXISTS equipe_beta_nome text NOT NULL DEFAULT 'Equipe Beta';

ALTER TABLE public.empreendimentos
  DROP CONSTRAINT IF EXISTS empreendimentos_ciclo_roleta_check;
ALTER TABLE public.empreendimentos
  ADD CONSTRAINT empreendimentos_ciclo_roleta_check
  CHECK (ciclo_roleta IN ('unica','manha','tarde'));

-- 2) corretores: habilitação e equipe
ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS status_habilitacao text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS equipe text;

ALTER TABLE public.corretores
  DROP CONSTRAINT IF EXISTS corretores_status_habilitacao_check;
ALTER TABLE public.corretores
  ADD CONSTRAINT corretores_status_habilitacao_check
  CHECK (status_habilitacao IN ('pendente','ativo','desativado'));

ALTER TABLE public.corretores
  DROP CONSTRAINT IF EXISTS corretores_equipe_check;
ALTER TABLE public.corretores
  ADD CONSTRAINT corretores_equipe_check
  CHECK (equipe IS NULL OR equipe IN ('alfa','beta'));

-- Migrar dados existentes: corretores já ativos => habilitação 'ativo'
UPDATE public.corretores
SET status_habilitacao = 'ativo'
WHERE ativo = true AND status_habilitacao = 'pendente';

-- 3) Bucket de regras do plantão (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plantao-regras', 'plantao-regras', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket
DROP POLICY IF EXISTS "plantao-regras read" ON storage.objects;
CREATE POLICY "plantao-regras read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'plantao-regras'
  AND (
    public.has_role(auth.uid(), 'incorporadora'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
    OR public.has_role(auth.uid(), 'corretor'::public.app_role)
  )
);

DROP POLICY IF EXISTS "plantao-regras write" ON storage.objects;
CREATE POLICY "plantao-regras write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plantao-regras'
  AND (
    public.has_role(auth.uid(), 'incorporadora'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
  )
);

DROP POLICY IF EXISTS "plantao-regras update" ON storage.objects;
CREATE POLICY "plantao-regras update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'plantao-regras'
  AND (
    public.has_role(auth.uid(), 'incorporadora'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
  )
);

DROP POLICY IF EXISTS "plantao-regras delete" ON storage.objects;
CREATE POLICY "plantao-regras delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'plantao-regras'
  AND (
    public.has_role(auth.uid(), 'incorporadora'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
  )
);
