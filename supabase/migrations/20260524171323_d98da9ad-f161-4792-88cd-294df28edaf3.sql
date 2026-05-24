
-- =====================================================================
-- HARDENING: Multi-tenant isolation por CNPJ/empreendimento
-- =====================================================================

-- 1) user_in_empreendimento: exigir empreendimento_id NÃO-NULO para
--    qualquer papel não-master. Master continua global.
CREATE OR REPLACE FUNCTION public.user_in_empreendimento(_uid uuid, _emp uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_master(_uid)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _uid
        AND ur.empreendimento_id = _emp
    )
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.user_id = _uid
        AND c.empreendimento_id = _emp
    );
$$;

-- 2) has_role_in_empreendimento: idem (sem fallback NULL)
CREATE OR REPLACE FUNCTION public.has_role_in_empreendimento(_user_id uuid, _role app_role, _empreendimento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_master(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND empreendimento_id = _empreendimento_id
    );
$$;

-- =====================================================================
-- 3) atendimentos: escopo por empreendimento + DELETE para admins
-- =====================================================================
DROP POLICY IF EXISTS "corretor read own atendimentos" ON public.atendimentos;
DROP POLICY IF EXISTS "admins insert atendimentos" ON public.atendimentos;
DROP POLICY IF EXISTS "corretor update own atendimentos" ON public.atendimentos;

CREATE POLICY "scoped read atendimentos"
ON public.atendimentos FOR SELECT TO authenticated
USING (
  public.user_in_empreendimento(auth.uid(), empreendimento_id)
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.id = atendimentos.corretor_id
        AND c.user_id = auth.uid()
        AND c.empreendimento_id = atendimentos.empreendimento_id
    )
  )
);

CREATE POLICY "scoped insert atendimentos"
ON public.atendimentos FOR INSERT TO authenticated
WITH CHECK (
  public.user_in_empreendimento(auth.uid(), empreendimento_id)
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.id = atendimentos.corretor_id
        AND c.user_id = auth.uid()
        AND c.empreendimento_id = atendimentos.empreendimento_id
    )
  )
);

CREATE POLICY "scoped update atendimentos"
ON public.atendimentos FOR UPDATE TO authenticated
USING (
  public.user_in_empreendimento(auth.uid(), empreendimento_id)
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.id = atendimentos.corretor_id
        AND c.user_id = auth.uid()
        AND c.empreendimento_id = atendimentos.empreendimento_id
    )
  )
);

CREATE POLICY "admins delete atendimentos"
ON public.atendimentos FOR DELETE TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
);

-- =====================================================================
-- 4) historico_semanal: escopo por empreendimento
-- =====================================================================
DROP POLICY IF EXISTS "admins read historico" ON public.historico_semanal;

CREATE POLICY "scoped read historico"
ON public.historico_semanal FOR SELECT TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
);

-- =====================================================================
-- 5) integracoes_crm: escopo por empreendimento (webhook secrets!)
-- =====================================================================
DROP POLICY IF EXISTS "admins manage integracoes_crm" ON public.integracoes_crm;

CREATE POLICY "scoped read integracoes_crm"
ON public.integracoes_crm FOR SELECT TO authenticated
USING (
  empreendimento_id IS NOT NULL
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
  )
);

CREATE POLICY "scoped write integracoes_crm"
ON public.integracoes_crm FOR INSERT TO authenticated
WITH CHECK (
  empreendimento_id IS NOT NULL
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
  )
);

CREATE POLICY "scoped update integracoes_crm"
ON public.integracoes_crm FOR UPDATE TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
)
WITH CHECK (
  public.is_master(auth.uid())
  OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
);

CREATE POLICY "scoped delete integracoes_crm"
ON public.integracoes_crm FOR DELETE TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
);

-- =====================================================================
-- 6) triagens: permitir corretor inserir nas suas próprias atendimentos
-- =====================================================================
DROP POLICY IF EXISTS "admins insert triagens" ON public.triagens;

CREATE POLICY "scoped insert triagens"
ON public.triagens FOR INSERT TO authenticated
WITH CHECK (
  public.user_in_empreendimento(auth.uid(), empreendimento_id)
  AND (
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.user_id = auth.uid()
        AND c.empreendimento_id = triagens.empreendimento_id
    )
  )
);

-- =====================================================================
-- 7) Revogar EXECUTE de anon em SECURITY DEFINER
--    (assinatura_status precisa de auth.uid())
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.assinatura_status(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assinatura_status(uuid) TO authenticated;

-- =====================================================================
-- 8) Storage: remover SELECT amplo em bucket público (impede listagem).
--    Acesso continua via URL pública direta (CDN) para buckets públicos.
-- =====================================================================
DROP POLICY IF EXISTS "brand public read" ON storage.objects;
