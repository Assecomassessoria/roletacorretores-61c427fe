DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-roleta-oficial-diaria') THEN
    PERFORM cron.unschedule('limpar-roleta-oficial-diaria');
  END IF;
END $$;

-- 06:00 no Brasil (America/Sao_Paulo) = 09:00 UTC
SELECT cron.schedule(
  'limpar-roleta-oficial-diaria',
  '0 9 * * *',
  $$SELECT public.limpar_roleta_oficial_diaria();$$
);