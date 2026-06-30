CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.limpar_roleta_oficial_diaria()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.empreendimentos
  SET fila_oficial_data = NULL,
      fila_oficial_ids = NULL
  WHERE fila_oficial_data IS NOT NULL
     OR fila_oficial_ids IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.limpar_roleta_oficial_diaria() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-roleta-oficial-diaria') THEN
    PERFORM cron.unschedule('limpar-roleta-oficial-diaria');
  END IF;
END $$;

-- 03:00 no Brasil (America/Sao_Paulo) = 06:00 UTC
SELECT cron.schedule(
  'limpar-roleta-oficial-diaria',
  '0 6 * * *',
  $$SELECT public.limpar_roleta_oficial_diaria();$$
);