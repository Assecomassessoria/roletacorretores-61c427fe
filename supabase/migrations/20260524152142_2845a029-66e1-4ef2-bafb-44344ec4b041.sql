create or replace function public.assinatura_status(_uid uuid default auth.uid())
returns table (
  status text,
  assinatura_id uuid,
  plano_codigo text,
  dias_duracao integer,
  expira_em timestamptz,
  dias_restantes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with a as (
    select s.id, s.expira_em, s.status as s_status, p.codigo as plano_codigo, p.dias_duracao
    from public.assinaturas s
    join public.planos p on p.id = s.plano_id
    where s.user_id = _uid
    order by s.expira_em desc nulls last, s.created_at desc
    limit 1
  )
  select
    case
      when a.id is null then 'sem'
      when a.s_status in ('cancelada','expirada') then 'expirada'
      when a.expira_em is null then 'ativa'
      when a.expira_em <= now() then 'expirada'
      when (extract(epoch from (a.expira_em - now()))/86400)::int
           <= case when a.dias_duracao <= 7 then 1 else 5 end
        then 'renovacao'
      else 'ativa'
    end as status,
    a.id,
    a.plano_codigo,
    a.dias_duracao,
    a.expira_em,
    case when a.expira_em is null then null
         else greatest(0, (extract(epoch from (a.expira_em - now()))/86400)::int)
    end as dias_restantes
  from a;
$$;

revoke all on function public.assinatura_status(uuid) from public;
grant execute on function public.assinatura_status(uuid) to authenticated;