GRANT EXECUTE ON FUNCTION public.can_manage_user_roles(uuid, uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role_in_empreendimento(uuid, app_role, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_in_empreendimento(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.users_share_empreendimento(uuid, uuid) TO authenticated, anon;