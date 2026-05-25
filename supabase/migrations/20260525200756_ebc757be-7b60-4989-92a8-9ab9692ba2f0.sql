-- 1) integracoes_crm: revogar SELECT em colunas sensíveis
REVOKE SELECT (secret, headers) ON public.integracoes_crm FROM authenticated, anon;

-- 2) corretores storage: exigir corretor ativo
DROP POLICY IF EXISTS "corretores scoped read" ON storage.objects;
CREATE POLICY "corretores scoped read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'corretores'
  AND public.user_in_empreendimento(auth.uid(), public.storage_path_emp(name))
  AND EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.foto_url = storage.objects.name
      AND c.ativo = true
  )
);

-- 3) sugestoes: permitir master excluir (LGPD)
CREATE POLICY "master delete sugestoes"
ON public.sugestoes
FOR DELETE
TO authenticated
USING (public.is_master(auth.uid()));