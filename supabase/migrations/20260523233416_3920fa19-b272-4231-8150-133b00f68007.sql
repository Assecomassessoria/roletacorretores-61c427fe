
-- Helper: scoped access to an empreendimento
create or replace function public.user_in_empreendimento(_uid uuid, _emp uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_master(_uid)
    or exists(select 1 from public.user_roles ur where ur.user_id=_uid and (ur.empreendimento_id=_emp or ur.empreendimento_id is null))
    or exists(select 1 from public.corretores c where c.user_id=_uid and c.empreendimento_id=_emp);
$$;
revoke execute on function public.user_in_empreendimento(uuid, uuid) from public, anon;
grant execute on function public.user_in_empreendimento(uuid, uuid) to authenticated;

-- Tighten SELECT on corretores
drop policy if exists "auth read corretores" on public.corretores;
create policy "scoped read corretores" on public.corretores
  for select to authenticated
  using (public.user_in_empreendimento(auth.uid(), empreendimento_id));

-- Tighten SELECT on empreendimentos
drop policy if exists "auth read empreendimentos" on public.empreendimentos;
create policy "scoped read empreendimentos" on public.empreendimentos
  for select to authenticated
  using (public.user_in_empreendimento(auth.uid(), id));

-- Tighten SELECT on plantoes
drop policy if exists "auth read plantoes" on public.plantoes;
create policy "scoped read plantoes" on public.plantoes
  for select to authenticated
  using (public.user_in_empreendimento(auth.uid(), empreendimento_id));

-- Storage: corretores bucket — restrict writes to admins; remove broad SELECT so bucket cannot be listed
drop policy if exists "corretores fotos auth upload" on storage.objects;
drop policy if exists "corretores fotos auth update" on storage.objects;
drop policy if exists "corretores fotos auth delete" on storage.objects;
drop policy if exists "corretores fotos public read" on storage.objects;

create policy "corretores fotos admin upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'corretores' and (
      public.has_role(auth.uid(),'incorporadora'::app_role)
      or public.has_role(auth.uid(),'gerente'::app_role)
      or public.has_role(auth.uid(),'coordenador'::app_role)
    )
  );
create policy "corretores fotos admin update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'corretores' and (
      public.has_role(auth.uid(),'incorporadora'::app_role)
      or public.has_role(auth.uid(),'gerente'::app_role)
      or public.has_role(auth.uid(),'coordenador'::app_role)
    )
  );
create policy "corretores fotos admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'corretores' and (
      public.has_role(auth.uid(),'incorporadora'::app_role)
      or public.has_role(auth.uid(),'gerente'::app_role)
      or public.has_role(auth.uid(),'coordenador'::app_role)
    )
  );

-- Trigger helper should not be callable directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;
