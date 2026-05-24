
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  corpo text not null,
  canal text not null default 'sistema' check (canal in ('sistema','whatsapp','impresso','pdf')),
  destinatarios text not null default 'todos' check (destinatarios in ('todos','corretores','gestao')),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mensagens_emp on public.mensagens(empreendimento_id, created_at desc);

alter table public.mensagens enable row level security;

create policy "mensagens_select_membros"
  on public.mensagens for select
  using (public.user_in_empreendimento(auth.uid(), empreendimento_id) and ativa = true);

create policy "mensagens_insert_gestor"
  on public.mensagens for insert
  with check (
    public.is_master(auth.uid())
    or public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    or public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    or public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  );

create policy "mensagens_update_gestor"
  on public.mensagens for update
  using (
    public.is_master(auth.uid())
    or public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    or public.has_role_in_empreendimento(auth.uid(), 'coordenador', empreendimento_id)
    or public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  );

create policy "mensagens_delete_gestor"
  on public.mensagens for delete
  using (
    public.is_master(auth.uid())
    or public.has_role_in_empreendimento(auth.uid(), 'gerente', empreendimento_id)
    or public.has_role_in_empreendimento(auth.uid(), 'incorporadora', empreendimento_id)
  );

create trigger trg_mensagens_updated
  before update on public.mensagens
  for each row execute function public.update_updated_at();
