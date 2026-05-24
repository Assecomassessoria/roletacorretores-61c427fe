
create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null,
  data date not null,
  descricao text,
  created_at timestamptz not null default now(),
  unique (empreendimento_id, data)
);
alter table public.feriados enable row level security;

create policy "scoped read feriados" on public.feriados
  for select to authenticated
  using (user_in_empreendimento(auth.uid(), empreendimento_id));

create policy "admins manage feriados" on public.feriados
  for all to authenticated
  using (is_master(auth.uid())
    or has_role_in_empreendimento(auth.uid(),'incorporadora',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'gerente',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'coordenador',empreendimento_id))
  with check (is_master(auth.uid())
    or has_role_in_empreendimento(auth.uid(),'incorporadora',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'gerente',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'coordenador',empreendimento_id));

create table if not exists public.escala_semanal (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null,
  equipe text not null,
  data date not null,
  corretor_id uuid,
  criado_por uuid,
  created_at timestamptz not null default now(),
  unique (empreendimento_id, equipe, data)
);
alter table public.escala_semanal enable row level security;
create index if not exists idx_escala_emp_data on public.escala_semanal(empreendimento_id, data);

create policy "scoped read escala" on public.escala_semanal
  for select to authenticated
  using (user_in_empreendimento(auth.uid(), empreendimento_id));

create policy "admins manage escala" on public.escala_semanal
  for all to authenticated
  using (is_master(auth.uid())
    or has_role_in_empreendimento(auth.uid(),'incorporadora',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'gerente',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'coordenador',empreendimento_id))
  with check (is_master(auth.uid())
    or has_role_in_empreendimento(auth.uid(),'incorporadora',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'gerente',empreendimento_id)
    or has_role_in_empreendimento(auth.uid(),'coordenador',empreendimento_id));

create policy "corretor self-assign escala" on public.escala_semanal
  for update to authenticated
  using (exists (select 1 from public.corretores c
    where c.empreendimento_id = escala_semanal.empreendimento_id
      and c.user_id = auth.uid()))
  with check (exists (select 1 from public.corretores c
    where c.id = escala_semanal.corretor_id
      and c.user_id = auth.uid()));
