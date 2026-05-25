
-- 1) Helper: dois usuários compartilham algum empreendimento?
CREATE OR REPLACE FUNCTION public.users_share_empreendimento(_actor uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_actor)
      OR _actor = _target
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur_a
        WHERE ur_a.user_id = _actor
          AND ur_a.empreendimento_id IS NOT NULL
          AND (
            EXISTS (
              SELECT 1 FROM public.user_roles ur_t
              WHERE ur_t.user_id = _target
                AND ur_t.empreendimento_id = ur_a.empreendimento_id
            )
            OR EXISTS (
              SELECT 1 FROM public.corretores c
              WHERE c.user_id = _target
                AND c.empreendimento_id = ur_a.empreendimento_id
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.corretores c_a
        WHERE c_a.user_id = _actor
          AND EXISTS (
            SELECT 1 FROM public.corretores c_t
            WHERE c_t.user_id = _target
              AND c_t.empreendimento_id = c_a.empreendimento_id
          )
      );
$$;

-- 2) profiles: restringir leitura por gerente ao mesmo empreendimento
DROP POLICY IF EXISTS "users see own profile" ON public.profiles;
CREATE POLICY "users see own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_master(auth.uid())
  OR (
    (public.has_role(auth.uid(), 'incorporadora'::app_role)
     OR public.has_role(auth.uid(), 'gerente'::app_role)
     OR public.has_role(auth.uid(), 'coordenador'::app_role))
    AND public.users_share_empreendimento(auth.uid(), id)
  )
);

-- 3) email_log: escopo por empreendimento
DROP POLICY IF EXISTS "incorporadora read email_log" ON public.email_log;
CREATE POLICY "scoped read email_log"
ON public.email_log
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    empreendimento_id IS NOT NULL
    AND (
      public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    )
  )
);

-- 4) integracoes_crm: view segura sem secret/headers para uso no frontend
DROP VIEW IF EXISTS public.integracoes_crm_publicas;
CREATE VIEW public.integracoes_crm_publicas
WITH (security_invoker = true)
AS
SELECT
  id,
  nome,
  provider,
  webhook_url,
  ativo,
  empreendimento_id,
  created_at,
  updated_at
FROM public.integracoes_crm;

GRANT SELECT ON public.integracoes_crm_publicas TO authenticated;

-- 5) storage corretores: trocar LIKE/substring por match exato de caminho
DROP POLICY IF EXISTS "corretores scoped read" ON storage.objects;
CREATE POLICY "corretores scoped read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'corretores'
  AND EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.foto_url = storage.objects.name
      AND public.user_in_empreendimento(auth.uid(), c.empreendimento_id)
  )
);
