
-- Revoga EXECUTE de funções SECURITY DEFINER que NÃO devem ser chamadas
-- diretamente por usuários (apenas triggers/jobs internos as utilizam).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_log_set_email() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.plantoes_corretor_presence_guard() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reset_escala_semanal() FROM anon, authenticated, public;
-- Mantém EXECUTE em has_role / has_role_in_empreendimento / is_master /
-- is_master_email / user_in_empreendimento / assinatura_status pois são
-- invocadas dentro das policies RLS pelo papel `authenticated`.
