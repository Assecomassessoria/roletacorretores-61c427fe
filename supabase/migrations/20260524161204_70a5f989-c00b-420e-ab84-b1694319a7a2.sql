
ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cor_primaria text,
  ADD COLUMN IF NOT EXISTS cor_secundaria text,
  ADD COLUMN IF NOT EXISTS cor_destaque text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('empreendimento-brand', 'empreendimento-brand', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "brand public read" ON storage.objects;
CREATE POLICY "brand public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'empreendimento-brand');

DROP POLICY IF EXISTS "brand admin insert" ON storage.objects;
CREATE POLICY "brand admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'empreendimento-brand'
    AND (
      public.has_role(auth.uid(), 'incorporadora'::public.app_role)
      OR public.has_role(auth.uid(), 'gerente'::public.app_role)
      OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "brand admin update" ON storage.objects;
CREATE POLICY "brand admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'empreendimento-brand'
    AND (
      public.has_role(auth.uid(), 'incorporadora'::public.app_role)
      OR public.has_role(auth.uid(), 'gerente'::public.app_role)
      OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "brand admin delete" ON storage.objects;
CREATE POLICY "brand admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'empreendimento-brand'
    AND (
      public.has_role(auth.uid(), 'incorporadora'::public.app_role)
      OR public.has_role(auth.uid(), 'gerente'::public.app_role)
      OR public.has_role(auth.uid(), 'coordenador'::public.app_role)
    )
  );
