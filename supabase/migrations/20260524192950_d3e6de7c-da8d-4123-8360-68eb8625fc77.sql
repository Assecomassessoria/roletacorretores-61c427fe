
-- Garante extensões
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Função: apaga slots de escala anteriores à segunda-feira da semana corrente (BRT)
create or replace function public.reset_escala_semanal()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio_semana date;
begin
  -- Segunda-feira da semana corrente em America/Sao_Paulo
  v_inicio_semana := (date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date);
  delete from public.escala_semanal where data < v_inicio_semana;
end;
$$;

revoke all on function public.reset_escala_semanal() from public, anon, authenticated;

-- Remove job antigo se existir
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reset-escala-semanal') then
    perform cron.unschedule('reset-escala-semanal');
  end if;
end$$;

-- Sábado 23:59 BRT = Domingo 02:59 UTC
select cron.schedule(
  'reset-escala-semanal',
  '59 2 * * 0',
  $$select public.reset_escala_semanal();$$
);
