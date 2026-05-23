
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_provider_external_id_idx
  ON public.pagamentos(provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS assinaturas_status_expira_idx
  ON public.assinaturas(status, expira_em);
