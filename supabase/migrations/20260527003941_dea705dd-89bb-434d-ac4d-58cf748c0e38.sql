REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role_in_empreendimento(uuid, app_role, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_empreendimento(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.users_share_empreendimento(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.corretores_self_update_guard() FROM anon, PUBLIC;