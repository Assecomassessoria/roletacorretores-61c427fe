CREATE OR REPLACE FUNCTION public.reset_escala_semanal()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hoje date;
  v_inicio_semana date;
begin
  -- Semana domingo → sábado em America/Sao_Paulo.
  -- Virada: sábado 23:59:59 → domingo 00:00 libera nova escala.
  v_hoje := (now() at time zone 'America/Sao_Paulo')::date;
  v_inicio_semana := v_hoje - extract(dow from v_hoje)::int;
  delete from public.escala_semanal where data < v_inicio_semana;
end;
$function$;