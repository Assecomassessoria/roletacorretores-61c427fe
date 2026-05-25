
-- 1. Toggle no empreendimento
ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS modo_propaganda boolean NOT NULL DEFAULT false;

-- 2. Tabela propagandas
CREATE TABLE IF NOT EXISTS public.propagandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL,
  titulo text NOT NULL,
  midia_url text NOT NULL,
  midia_tipo text NOT NULL DEFAULT 'image' CHECK (midia_tipo IN ('image','video')),
  duracao_segundos integer NOT NULL DEFAULT 8,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propagandas_emp ON public.propagandas(empreendimento_id, ordem);

ALTER TABLE public.propagandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoped read propagandas"
  ON public.propagandas FOR SELECT TO authenticated
  USING (user_in_empreendimento(auth.uid(), empreendimento_id));

CREATE POLICY "gestores manage propagandas"
  ON public.propagandas FOR ALL TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  )
  WITH CHECK (
    is_master(auth.uid())
    OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  );

CREATE TRIGGER trg_propagandas_updated_at
  BEFORE UPDATE ON public.propagandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Bucket de mídias
INSERT INTO storage.buckets (id, name, public)
VALUES ('propaganda-midias', 'propaganda-midias', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: pasta raiz = empreendimento_id
CREATE POLICY "read propaganda midias scoped"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'propaganda-midias'
    AND storage_path_emp(name) IS NOT NULL
    AND user_in_empreendimento(auth.uid(), storage_path_emp(name))
  );

CREATE POLICY "gestores write propaganda midias"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'propaganda-midias'
    AND storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, storage_path_emp(name))
    )
  );

CREATE POLICY "gestores update propaganda midias"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'propaganda-midias'
    AND storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, storage_path_emp(name))
    )
  );

CREATE POLICY "gestores delete propaganda midias"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'propaganda-midias'
    AND storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, storage_path_emp(name))
    )
  );
