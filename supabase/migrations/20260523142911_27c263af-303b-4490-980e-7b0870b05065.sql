ALTER FUNCTION public.is_master_email(text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_master_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role_in_empreendimento(uuid, public.app_role, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_master_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_empreendimento(uuid, public.app_role, uuid) TO authenticated;