
ALTER TABLE public.empreendimentos ADD COLUMN IF NOT EXISTS cnpj text;
CREATE INDEX IF NOT EXISTS empreendimentos_cnpj_idx ON public.empreendimentos (cnpj);

ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS foto_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('corretores', 'corretores', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "corretores fotos public read" ON storage.objects;
CREATE POLICY "corretores fotos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'corretores');

DROP POLICY IF EXISTS "corretores fotos auth upload" ON storage.objects;
CREATE POLICY "corretores fotos auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'corretores');

DROP POLICY IF EXISTS "corretores fotos auth update" ON storage.objects;
CREATE POLICY "corretores fotos auth update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'corretores');

DROP POLICY IF EXISTS "corretores fotos auth delete" ON storage.objects;
CREATE POLICY "corretores fotos auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'corretores');
