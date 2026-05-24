
-- 1) Fix escala_semanal self-assign privilege escalation
DROP POLICY IF EXISTS "corretor self-assign escala" ON public.escala_semanal;

-- Allow corretor to CLAIM an empty slot (corretor_id IS NULL) in their empreendimento
CREATE POLICY "corretor claim empty escala"
ON public.escala_semanal
FOR UPDATE
TO authenticated
USING (
  corretor_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.empreendimento_id = escala_semanal.empreendimento_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = escala_semanal.corretor_id
      AND c.user_id = auth.uid()
      AND c.empreendimento_id = escala_semanal.empreendimento_id
  )
);

-- Allow corretor to RELEASE their own scheduled slot (set corretor_id back to null)
CREATE POLICY "corretor release own escala"
ON public.escala_semanal
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = escala_semanal.corretor_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  corretor_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = escala_semanal.corretor_id
      AND c.user_id = auth.uid()
  )
);

-- Enforce one entry per (empreendimento, equipe, data) — one corretor per shift slot
CREATE UNIQUE INDEX IF NOT EXISTS escala_semanal_unique_corretor_por_dia
  ON public.escala_semanal (empreendimento_id, corretor_id, data)
  WHERE corretor_id IS NOT NULL;

-- 2) Make corretores bucket private + scoped SELECT
UPDATE storage.buckets SET public = false WHERE id = 'corretores';

DROP POLICY IF EXISTS "corretores public read" ON storage.objects;
DROP POLICY IF EXISTS "corretores scoped read" ON storage.objects;
DROP POLICY IF EXISTS "corretores admin manage" ON storage.objects;

CREATE POLICY "corretores scoped read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'corretores'
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.foto_url LIKE '%' || storage.objects.name || '%'
        AND public.user_in_empreendimento(auth.uid(), c.empreendimento_id)
    )
  )
);

CREATE POLICY "corretores admin manage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'corretores'
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'incorporadora'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'corretores'
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'incorporadora'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
  )
);

-- 3) Make empreendimento-brand bucket private + scoped SELECT
UPDATE storage.buckets SET public = false WHERE id = 'empreendimento-brand';

DROP POLICY IF EXISTS "empreendimento-brand public read" ON storage.objects;
DROP POLICY IF EXISTS "empreendimento-brand scoped read" ON storage.objects;
DROP POLICY IF EXISTS "empreendimento-brand admin manage" ON storage.objects;

CREATE POLICY "empreendimento-brand scoped read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'empreendimento-brand'
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.empreendimentos e
      WHERE e.logo_url LIKE '%' || storage.objects.name || '%'
        AND public.user_in_empreendimento(auth.uid(), e.id)
    )
  )
);

CREATE POLICY "empreendimento-brand admin manage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'empreendimento-brand'
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'incorporadora'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'empreendimento-brand'
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'incorporadora'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
  )
);
