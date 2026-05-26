
CREATE OR REPLACE FUNCTION public.corretores_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin :=
    public.is_master(uid)
    OR public.has_role_in_empreendimento(uid, 'incorporadora'::app_role, OLD.empreendimento_id)
    OR public.has_role_in_empreendimento(uid, 'gerente'::app_role, OLD.empreendimento_id)
    OR public.has_role_in_empreendimento(uid, 'coordenador'::app_role, OLD.empreendimento_id);

  IF is_admin THEN
    RETURN NEW;
  END IF;

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
$function$;

UPDATE public.corretores
SET ativo = true, status_habilitacao = 'ativo'
WHERE user_id IS NOT NULL
  AND (ativo = false OR status_habilitacao = 'pendente');
