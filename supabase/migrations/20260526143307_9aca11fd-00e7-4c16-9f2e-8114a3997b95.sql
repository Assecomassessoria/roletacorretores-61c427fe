-- Permite ao corretor atualizar a própria linha
CREATE POLICY "corretor update own row"
ON public.corretores
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger que impede o próprio corretor de alterar campos imutáveis (nome, cpf, creci)
CREATE OR REPLACE FUNCTION public.corretores_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin :=
    public.is_master(auth.uid())
    OR public.has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, OLD.empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'gerente'::app_role, OLD.empreendimento_id)
    OR public.has_role_in_empreendimento(auth.uid(), 'coordenador'::app_role, OLD.empreendimento_id);

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Apenas o próprio corretor caiu aqui: bloquear campos sensíveis e estruturais
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    RAISE EXCEPTION 'Nome não pode ser alterado pelo corretor';
  END IF;
  IF NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    RAISE EXCEPTION 'CPF não pode ser alterado pelo corretor';
  END IF;
  IF NEW.creci IS DISTINCT FROM OLD.creci THEN
    RAISE EXCEPTION 'CRECI não pode ser alterado pelo corretor';
  END IF;
  IF NEW.empreendimento_id IS DISTINCT FROM OLD.empreendimento_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.ordem_roleta IS DISTINCT FROM OLD.ordem_roleta
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.status_habilitacao IS DISTINCT FROM OLD.status_habilitacao
     OR NEW.equipe IS DISTINCT FROM OLD.equipe THEN
    RAISE EXCEPTION 'Campo administrativo não pode ser alterado pelo corretor';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS corretores_self_update_guard_trg ON public.corretores;
CREATE TRIGGER corretores_self_update_guard_trg
BEFORE UPDATE ON public.corretores
FOR EACH ROW
EXECUTE FUNCTION public.corretores_self_update_guard();