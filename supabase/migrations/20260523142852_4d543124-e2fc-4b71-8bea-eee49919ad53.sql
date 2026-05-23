-- 1) Função: e-mail é Master?
CREATE OR REPLACE FUNCTION public.is_master_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(_email, '')) IN (
    'contatoapps@simuladorcorretorelite.com.br',
    'contato@assecomassessoria.net.br'
  );
$$;

-- 2) Função: user_id é Master? (lê email em auth.users)
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND public.is_master_email(u.email)
  );
$$;

-- 3) Atualiza has_role: Master tem TODOS os papéis (bypass total)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_empreendimento(_user_id uuid, _role app_role, _empreendimento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND (empreendimento_id = _empreendimento_id OR empreendimento_id IS NULL)
    );
$$;

-- 4) Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  acao text NOT NULL,
  recurso text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master read audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_master(auth.uid()));

CREATE POLICY "authenticated insert audit_log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log (user_id);