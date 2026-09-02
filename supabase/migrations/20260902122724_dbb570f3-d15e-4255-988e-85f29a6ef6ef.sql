-- lovable-cron-fallback-reviewed: 288 runs/day; sorteio automático precisa disparar no horário configurado sem depender de alguém com o painel aberto; 5 min é o atraso máximo aceitável.
CREATE OR REPLACE FUNCTION public.has_role_in_empreendimento(_user_id uuid, _role app_role, _empreendimento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_master(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND (empreendimento_id = _empreendimento_id OR empreendimento_id IS NULL)
    );
$function$;

CREATE OR REPLACE FUNCTION public.user_in_empreendimento(_uid uuid, _emp uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_master(_uid)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _uid
        AND (ur.empreendimento_id = _emp OR ur.empreendimento_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.corretores c
      WHERE c.user_id = _uid
        AND c.empreendimento_id = _emp
    );
$function$;

SELECT cron.unschedule('roleta-automatica') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'roleta-automatica'
);

SELECT cron.schedule(
  'roleta-automatica',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--4fb3566d-93ac-4ef2-9d10-b20744341909.lovable.app/api/public/roleta-auto',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);