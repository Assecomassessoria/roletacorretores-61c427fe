
-- 1. TRIAGENS: restringir SELECT por empreendimento
DROP POLICY IF EXISTS "admins read triagens" ON public.triagens;
CREATE POLICY "admins read triagens"
ON public.triagens FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
  OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
  OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
  OR EXISTS (
    SELECT 1 FROM atendimentos a
    JOIN corretores c ON c.id = a.corretor_id
    WHERE a.id = triagens.atendimento_id AND c.user_id = auth.uid()
  )
);

-- 2. ATENDIMENTOS: corretor só insere para si mesmo
DROP POLICY IF EXISTS "scoped insert atendimentos" ON public.atendimentos;
CREATE POLICY "scoped insert atendimentos"
ON public.atendimentos FOR INSERT TO authenticated
WITH CHECK (
  user_in_empreendimento(auth.uid(), empreendimento_id)
  AND (
    is_master(auth.uid())
    OR has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, empreendimento_id)
    OR has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, empreendimento_id)
    OR EXISTS (
      SELECT 1 FROM corretores c
      WHERE c.id = atendimentos.corretor_id
        AND c.user_id = auth.uid()
        AND c.empreendimento_id = atendimentos.empreendimento_id
    )
  )
);

-- 3. AUDIT_LOG: restringir insert + auto-preencher email
DROP POLICY IF EXISTS "authenticated insert audit_log" ON public.audit_log;
CREATE POLICY "gestores insert audit_log"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'incorporadora'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
  )
);

CREATE OR REPLACE FUNCTION public.audit_log_set_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_email := (auth.jwt() ->> 'email');
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_set_email ON public.audit_log;
CREATE TRIGGER trg_audit_log_set_email
BEFORE INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_set_email();

-- 4. PLANTOES: restringir update do corretor às colunas de presença
DROP POLICY IF EXISTS "corretor confirm own presence" ON public.plantoes;
CREATE POLICY "corretor confirm own presence"
ON public.plantoes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM corretores c
    WHERE c.id = plantoes.corretor_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM corretores c
    WHERE c.id = plantoes.corretor_id AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.plantoes_corretor_presence_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- admins podem alterar qualquer coluna
  is_admin :=
    is_master(auth.uid())
    OR has_role(auth.uid(), 'incorporadora'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;
  -- corretor: só pode alterar colunas de presença
  IF NEW.data IS DISTINCT FROM OLD.data
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim
     OR NEW.corretor_id IS DISTINCT FROM OLD.corretor_id
     OR NEW.empreendimento_id IS DISTINCT FROM OLD.empreendimento_id THEN
    RAISE EXCEPTION 'Corretor só pode atualizar campos de presença (presenca_confirmada_em, presenca_lat, presenca_lng, status)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plantoes_corretor_presence_guard ON public.plantoes;
CREATE TRIGGER trg_plantoes_corretor_presence_guard
BEFORE UPDATE ON public.plantoes
FOR EACH ROW EXECUTE FUNCTION public.plantoes_corretor_presence_guard();

-- 5. TRIAGEM_STATUS_PUBLICO: trocar para SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.triagem_status_publico(_triagem_id uuid)
RETURNS TABLE(id uuid, status text, cliente_nome text, atendimento_id uuid, opcao_codigo text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, status, cliente_nome, atendimento_id, opcao_codigo, created_at
  FROM public.triagens
  WHERE id = _triagem_id
  LIMIT 1;
$$;
