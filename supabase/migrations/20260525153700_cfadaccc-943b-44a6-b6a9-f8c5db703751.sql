
-- Adicionar empreendimento_id em pagamentos e audit_log
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS empreendimento_id uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS empreendimento_id uuid;
CREATE INDEX IF NOT EXISTS idx_pagamentos_emp ON public.pagamentos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_emp ON public.audit_log(empreendimento_id);

-- ============ integracoes_crm ============
-- A política de SELECT já é scoped; recriamos para garantir consistência.
DROP POLICY IF EXISTS "scoped read integracoes_crm" ON public.integracoes_crm;
CREATE POLICY "scoped read integracoes_crm" ON public.integracoes_crm
  FOR SELECT TO authenticated
  USING (
    empreendimento_id IS NOT NULL AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    )
  );

-- ============ assinaturas ============
DROP POLICY IF EXISTS "admins manage assinaturas" ON public.assinaturas;
DROP POLICY IF EXISTS "user read own assinaturas" ON public.assinaturas;

CREATE POLICY "scoped manage assinaturas" ON public.assinaturas
  FOR ALL TO authenticated
  USING (
    is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  )
  WITH CHECK (
    is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  );

CREATE POLICY "user read own assinaturas" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  );

-- ============ pagamentos ============
DROP POLICY IF EXISTS "admins manage pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "user read own pagamentos" ON public.pagamentos;

CREATE POLICY "scoped manage pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (
    is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  )
  WITH CHECK (
    is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  );

CREATE POLICY "user read own pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_master(auth.uid())
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  );

-- ============ audit_log ============
DROP POLICY IF EXISTS "master e gerencia leem audit_log" ON public.audit_log;
CREATE POLICY "scoped read audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'incorporadora'::app_role)
    OR (empreendimento_id IS NOT NULL AND (
      has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    ))
  );

-- ============ Storage: helpers + políticas com escopo de empreendimento ============
CREATE OR REPLACE FUNCTION public.storage_path_emp(_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_emp uuid;
BEGIN
  BEGIN
    v_emp := split_part(_name, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    v_emp := NULL;
  END;
  RETURN v_emp;
END;
$$;

-- plantao-regras: substitui INSERT/UPDATE/DELETE por versão scoped
DROP POLICY IF EXISTS "plantao-regras write" ON storage.objects;
DROP POLICY IF EXISTS "plantao-regras update" ON storage.objects;
DROP POLICY IF EXISTS "plantao-regras delete" ON storage.objects;

CREATE POLICY "plantao-regras write scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plantao-regras'
    AND public.storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "plantao-regras update scoped" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'plantao-regras'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "plantao-regras delete scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'plantao-regras'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

-- corretores: substitui ALL ampla
DROP POLICY IF EXISTS "corretores admin manage" ON storage.objects;
DROP POLICY IF EXISTS "corretores fotos admin upload" ON storage.objects;
DROP POLICY IF EXISTS "corretores fotos admin update" ON storage.objects;
DROP POLICY IF EXISTS "corretores fotos admin delete" ON storage.objects;

CREATE POLICY "corretores write scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'corretores'
    AND public.storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "corretores update scoped" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'corretores'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "corretores delete scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'corretores'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, public.storage_path_emp(name))
    )
  );

-- empreendimento-brand: substitui ALL ampla
DROP POLICY IF EXISTS "empreendimento-brand admin manage" ON storage.objects;
DROP POLICY IF EXISTS "brand admin insert" ON storage.objects;
DROP POLICY IF EXISTS "brand admin update" ON storage.objects;
DROP POLICY IF EXISTS "brand admin delete" ON storage.objects;

CREATE POLICY "brand write scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'empreendimento-brand'
    AND public.storage_path_emp(name) IS NOT NULL
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "brand update scoped" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'empreendimento-brand'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
    )
  );

CREATE POLICY "brand delete scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'empreendimento-brand'
    AND (
      is_master(auth.uid())
      OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, public.storage_path_emp(name))
      OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, public.storage_path_emp(name))
    )
  );
