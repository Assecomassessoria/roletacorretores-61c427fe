
-- Insert the new 30-day trial plan (idempotent)
INSERT INTO public.planos (codigo, nome, descricao, ciclo, dias_duracao, preco_centavos, moeda, destaque, ordem, ativo, beneficios)
VALUES (
  'trial_30d',
  'Plano 30 dias de Experiência',
  'Trial qualificado de 30 dias. Pagamento único na adesão via Mercado Pago. Aviso de renovação enviado pela Lorenza no 25º dia.',
  'mensal',
  30,
  6990,
  'BRL',
  false,
  0,
  true,
  '["Acesso total à gestão operacional por 30 dias","Cadastro ilimitado de corretores","Validação de presença (GPS/Wi-Fi/QR/PIN)","Roleta automatizada","Auditoria e relatórios","Pagamento seguro via Mercado Pago"]'::jsonb
)
ON CONFLICT (codigo) DO UPDATE
  SET nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      ciclo = EXCLUDED.ciclo,
      dias_duracao = EXCLUDED.dias_duracao,
      preco_centavos = EXCLUDED.preco_centavos,
      beneficios = EXCLUDED.beneficios,
      ativo = true,
      updated_at = now();

-- Ensure cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule prior job if any
DO $$
BEGIN
  PERFORM cron.unschedule('lorenza-trial-day25');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Daily 09:00 BRT (12:00 UTC): trigger Lorenza renewal reminder for 25-day-old active trials
SELECT cron.schedule(
  'lorenza-trial-day25',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://roletacorretores.lovable.app/api/public/lorenza',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6b3VzdnJicHd5dmFianVhZ3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzkyNjYsImV4cCI6MjA5NTA1NTI2Nn0.Xsj9YoTRyNiBzoRFVp7oVNk-SYcfmuQD9VLxAudlbD8'
    ),
    body := jsonb_build_object(
      'event','trial_day25_renewal',
      'mensagem','Sua experiência Elite está perto de completar o ciclo mensal. Para manter seus lançamentos ativos, escolha seu plano de continuidade aqui.',
      'assinaturas', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'assinatura_id', a.id,
          'user_id', a.user_id,
          'plano_codigo', p.codigo,
          'iniciada_em', a.iniciada_em,
          'expira_em', a.expira_em
        )), '[]'::jsonb)
        FROM public.assinaturas a
        JOIN public.planos p ON p.id = a.plano_id
        WHERE a.status = 'ativa'
          AND a.aviso_renovacao_enviado = false
          AND p.codigo = 'trial_30d'
          AND a.iniciada_em IS NOT NULL
          AND (now()::date - a.iniciada_em::date) >= 25
      )
    )
  );
  $$
);
