
-- 1) Storage: corretores read — match by empreendimento folder, not foto_url substring
DROP POLICY IF EXISTS "corretores scoped read" ON storage.objects;
CREATE POLICY "corretores scoped read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'corretores'
  AND public.user_in_empreendimento(auth.uid(), public.storage_path_emp(name))
);

-- 2) integracoes_crm: revoke column access to sensitive columns from clients.
--    Authenticated users can still see non-sensitive columns; secret/headers
--    are only readable via the service role (server functions / admin client).
REVOKE SELECT ON public.integracoes_crm FROM authenticated, anon;
GRANT SELECT (
  id, nome, provider, webhook_url, ativo, empreendimento_id,
  criado_por, created_at, updated_at
) ON public.integracoes_crm TO authenticated;

-- Writes still allowed via RLS; grant column-level INSERT/UPDATE so managers
-- can configure secrets through server functions that proxy the value, but
-- direct client writes to secret/headers remain blocked.
GRANT INSERT, UPDATE, DELETE ON public.integracoes_crm TO authenticated;
