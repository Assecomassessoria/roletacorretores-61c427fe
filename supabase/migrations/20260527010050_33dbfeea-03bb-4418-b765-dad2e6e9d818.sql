-- Restringe leitura do CPF: apenas service_role (server fns com checagem) pode ler.
-- Demais colunas continuam acessíveis via PostgREST conforme RLS atual.
REVOKE SELECT (cpf) ON public.corretores FROM PUBLIC;
REVOKE SELECT (cpf) ON public.corretores FROM anon;
REVOKE SELECT (cpf) ON public.corretores FROM authenticated;

-- Reafirma SELECT nas demais colunas para authenticated (mantém comportamento atual).
GRANT SELECT (
  id, empreendimento_id, nome, creci, telefone, email,
  ativo, ordem_roleta, created_at, updated_at,
  foto_url, status_habilitacao, equipe, user_id
) ON public.corretores TO authenticated;

-- service_role mantém ALL (bypassa grants).
GRANT ALL ON public.corretores TO service_role;