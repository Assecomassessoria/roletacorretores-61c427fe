
-- corretores: leitura por coluna, sem CPF
REVOKE SELECT ON public.corretores FROM authenticated;
GRANT SELECT (
  id, nome, creci, telefone, email,
  empreendimento_id, ordem_roleta, ativo, user_id, foto_url,
  created_at, updated_at, status_habilitacao, equipe
) ON public.corretores TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.corretores TO authenticated;

-- integracoes_crm: leitura por coluna, sem secret/headers
REVOKE SELECT ON public.integracoes_crm FROM authenticated;
GRANT SELECT (
  id, nome, provider, webhook_url, ativo, empreendimento_id,
  created_at, updated_at, criado_por
) ON public.integracoes_crm TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.integracoes_crm TO authenticated;
