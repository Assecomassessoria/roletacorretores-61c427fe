-- Garantir extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover agendamento anterior (se houver)
DO $$
BEGIN
  PERFORM cron.unschedule('avisos-renovacao-diario')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'avisos-renovacao-diario');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Agenda diário às 12:00 UTC (= 09:00 BRT)
SELECT cron.schedule(
  'avisos-renovacao-diario',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4fb3566d-93ac-4ef2-9d10-b20744341909.lovable.app/api/public/hooks/avisos-renovacao',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6b3VzdnJicHd5dmFianVhZ3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzkyNjYsImV4cCI6MjA5NTA1NTI2Nn0.Xsj9YoTRyNiBzoRFVp7oVNk-SYcfmuQD9VLxAudlbD8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);