
-- 1) Plantões: escopo por empreendimento ===================================
DROP POLICY IF EXISTS "admins manage plantoes" ON public.plantoes;
CREATE POLICY "admins manage plantoes scoped" ON public.plantoes
  FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  );

-- 2) Corretores: escopo + remoção de e-mail do acesso por cliente ===========
DROP POLICY IF EXISTS "admins manage corretores" ON public.corretores;
CREATE POLICY "admins manage corretores scoped" ON public.corretores
  FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  );

REVOKE SELECT (email) ON public.corretores FROM authenticated;
REVOKE SELECT (email) ON public.corretores FROM anon;

-- 3) Empreendimentos: escopo por id =========================================
DROP POLICY IF EXISTS "admins manage empreendimentos" ON public.empreendimentos;
CREATE POLICY "admins manage empreendimentos scoped" ON public.empreendimentos
  FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, id)
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, id)
  );

-- 4) user_roles: impedir escalonamento ======================================
CREATE OR REPLACE FUNCTION public.can_manage_user_roles(
  _actor uuid, _target_user uuid, _role app_role, _emp uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_master(_actor)
    OR (
      _emp IS NOT NULL
      AND _role <> 'incorporadora'::app_role
      AND _target_user <> _actor
      AND public.has_role_in_empreendimento(_actor, 'incorporadora'::app_role, _emp)
    );
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_user_roles(uuid, uuid, app_role, uuid) FROM anon, authenticated, public;

DROP POLICY IF EXISTS "incorporadora manages roles" ON public.user_roles;
CREATE POLICY "incorporadora manage scoped roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.can_manage_user_roles(auth.uid(), user_id, role, empreendimento_id))
  WITH CHECK (public.can_manage_user_roles(auth.uid(), user_id, role, empreendimento_id));

-- 5) checkin_falhas: política de leitura (insert continua via service_role) =
CREATE POLICY "admins read checkin_falhas" ON public.checkin_falhas
  FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  );
