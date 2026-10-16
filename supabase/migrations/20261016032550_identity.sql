-- S0 — identidade e isolamento por tenant.
-- workspaces ↔ memberships ↔ auth.users, convites e trilha de auditoria somente-inserção.
-- Toda tabela de `public` nasce com RLS habilitada E forçada, GRANT mínimo para `authenticated` e nada
-- para `anon`. Funções de apoio ficam no schema `app`, fora da Data API (api.schemas = public).
-- Papéis: owner > admin > editor > viewer. Só owner/admin gerenciam memberships e convites; o que
-- envolve o papel owner exige owner (admin não promove ninguém a owner nem mexe em owner).

-- ---------------------------------------------------------------------------------------------------
-- Schema app
-- ---------------------------------------------------------------------------------------------------

create schema app;
revoke all on schema app from public;
-- As políticas chamam app.* com o papel de quem consulta; por isso authenticated precisa de USAGE.
grant usage on schema app to authenticated;

create type public.workspace_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.audit_actor_type as enum ('user', 'agent', 'system');

create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function app.role_rank(p_role public.workspace_role)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_role
    when 'owner' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'viewer' then 1
  end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_key unique (slug),
  constraint workspaces_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48
  ),
  constraint workspaces_name_length check (char_length(btrim(name)) between 1 and 120)
);
comment on column public.workspaces.deleted_at is 'Nulo = ativo. Workspace excluído some para os membros.';
create index workspaces_created_by_idx on public.workspaces (created_by);
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function app.set_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_workspace_user_key unique (workspace_id, user_id)
);
create index memberships_user_workspace_idx on public.memberships (user_id, workspace_id);
create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function app.set_updated_at();

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_token_hash_key unique (token_hash),
  constraint invitations_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invitations_email_format check (
    email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint invitations_expires_after_creation check (expires_at > created_at)
);
comment on column public.invitations.token_hash is 'SHA-256 (hex) do token enviado no convite. O token em claro nunca é gravado.';
create index invitations_workspace_id_idx on public.invitations (workspace_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function app.set_updated_at();

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete restrict,
  actor_type public.audit_actor_type not null,
  actor_id text,
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_actor_required check (actor_type = 'system' or actor_id is not null),
  constraint audit_events_action_format check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint audit_events_payload_object check (jsonb_typeof(payload) = 'object')
);
comment on table public.audit_events is 'Trilha imutável: só inserção. Nenhum papel da Data API ou da API tem UPDATE/DELETE. workspace_id nulo = evento de sistema.';
comment on column public.audit_events.actor_id is 'user: auth.users.id; agent: id do agente em squad/ (ex.: nexo); system: nome do processo, opcional.';
create index audit_events_workspace_created_idx on public.audit_events (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Funções de autorização (SECURITY DEFINER: leem memberships sem cair na própria RLS)
-- ---------------------------------------------------------------------------------------------------

create function app.current_user_workspace_ids(p_min_role public.workspace_role default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.workspace_id
  from public.memberships m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = (select auth.uid())
    and w.deleted_at is null
    and app.role_rank(m.role) >= app.role_rank(p_min_role)
$$;

create function app.has_role(p_workspace_id uuid, p_min_role public.workspace_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and w.deleted_at is null
      and app.role_rank(m.role) >= app.role_rank(p_min_role)
  )
$$;

-- ---------------------------------------------------------------------------------------------------
-- RLS, GRANTs e políticas
-- ---------------------------------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.invitations enable row level security;
alter table public.invitations force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on table public.workspaces, public.memberships, public.invitations, public.audit_events
  from public, anon, authenticated, service_role;

-- workspaces: membro lê o próprio workspace; criação só por app.create_workspace.
grant select on table public.workspaces to authenticated;

create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (id in (select app.current_user_workspace_ids()));

-- memberships: membro lê os memberships do workspace; owner/admin gerenciam; só o papel muda no UPDATE.
grant select, delete on table public.memberships to authenticated;
grant insert (workspace_id, user_id, role) on table public.memberships to authenticated;
grant update (role) on table public.memberships to authenticated;

create policy memberships_select_member on public.memberships
  for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

create policy memberships_insert_manager on public.memberships
  for insert to authenticated
  with check (
    app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  );

create policy memberships_update_manager on public.memberships
  for update to authenticated
  using (
    app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  )
  with check (
    app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  );

create policy memberships_delete_manager on public.memberships
  for delete to authenticated
  using (
    app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  );

-- invitations: só owner/admin leem e gerenciam (o e-mail do convidado não é de quem já é membro).
grant select, delete on table public.invitations to authenticated;
grant insert (workspace_id, email, role, token_hash, expires_at) on table public.invitations to authenticated;

create policy invitations_select_manager on public.invitations
  for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids('admin')));

create policy invitations_insert_manager on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  );

create policy invitations_delete_manager on public.invitations
  for delete to authenticated
  using (
    app.has_role(workspace_id, 'admin')
    and (role <> 'owner' or app.has_role(workspace_id, 'owner'))
  );

-- audit_events: sem GRANT e sem política para nenhum papel da Data API nem da API. Grava-se só por
-- funções SECURITY DEFINER (como app.create_workspace) ou pelo papel privilegiado (dono das tabelas).

-- ---------------------------------------------------------------------------------------------------
-- Operações
-- ---------------------------------------------------------------------------------------------------

create function app.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace public.workspaces;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  insert into public.workspaces (slug, name, created_by)
  values (lower(btrim(p_slug)), btrim(p_name), v_user_id)
  returning * into v_workspace;

  insert into public.memberships (workspace_id, user_id, role)
  values (v_workspace.id, v_user_id, 'owner');

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_workspace.id, 'user', v_user_id::text, 'workspace.created', 'workspace', v_workspace.id::text,
    jsonb_build_object('slug', v_workspace.slug, 'name', v_workspace.name)
  );

  return v_workspace;
end;
$$;

-- Workspace sem owner fica sem ninguém que o administre. Remoção em cascata (do workspace ou da conta
-- do usuário) não é bloqueada aqui; o fluxo de exclusão de conta decide o destino do workspace.
create function app.memberships_keep_one_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner'
     or (tg_op = 'UPDATE' and new.role = 'owner' and new.workspace_id = old.workspace_id) then
    return null;
  end if;

  perform 1 from public.workspaces where id = old.workspace_id for no key update;
  if not found then
    return null;
  end if;

  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then
    return null;
  end if;

  if not exists (
    select 1 from public.memberships where workspace_id = old.workspace_id and role = 'owner'
  ) then
    raise exception using
      errcode = 'check_violation',
      constraint = 'memberships_keep_one_owner',
      message = 'O workspace precisa de pelo menos um owner.';
  end if;

  return null;
end;
$$;

create trigger memberships_keep_one_owner
  after update or delete on public.memberships
  for each row execute function app.memberships_keep_one_owner();

-- ---------------------------------------------------------------------------------------------------
-- EXECUTE: nada para public/anon; authenticated só no que as políticas e a API chamam.
-- ---------------------------------------------------------------------------------------------------

revoke all on function
  app.set_updated_at(),
  app.role_rank(public.workspace_role),
  app.current_user_workspace_ids(public.workspace_role),
  app.has_role(uuid, public.workspace_role),
  app.create_workspace(text, text),
  app.memberships_keep_one_owner()
  from public, anon, authenticated, service_role;

grant execute on function
  app.current_user_workspace_ids(public.workspace_role),
  app.has_role(uuid, public.workspace_role),
  app.create_workspace(text, text)
  to authenticated;
