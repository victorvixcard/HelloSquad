-- S2f — E-mail transacional atrás do EmailProvider (Mailpit local como sandbox; provedor de produção na Fase 5).
--
-- Os gatilhos do domínio chamam app.enqueue_email, que grava o e-mail em email_messages (destinatário, modelo,
-- idioma, variáveis já resolvidas no workspace do evento) e manda a mensagem para a fila pgmq email_outbox.
-- O worker lê a fila, monta o texto pelo catálogo do backend no idioma gravado e envia pelo EmailProvider,
-- com tentativas. Nenhum texto do e-mail mora no banco: só o modelo e as variáveis.
--
-- Quem recebe (só e-mail transacional; marketing não passa por aqui):
--   invitation         convite criado → o e-mail convidado
--   approval_pending   aprovação pendente ("Precisa de você") → owners do negócio (só o owner decide)
--   delivery_ready     versão nova de entrega feita por agente → membros que não são owner (o owner já recebe
--                      o "Precisa de você" da revisão da mesma entrega; um e-mail por evento e pessoa)
--   payment_confirmed  cobrança confirmada → owners
--   payment_problem    cobrança vencida, recusada ou contestada → owners
--   password_changed   senha trocada pela Auth (recuperação ou troca) → a própria pessoa
-- Idioma: o da pessoa (user_metadata.locale) → o do negócio → pt-BR.
-- Preferência por pessoa e por modelo em email_preferences (sem linha = recebe); convite e aviso de senha
-- não são opcionais (quem é convidado ainda não tem conta; aviso de segurança).

create type public.email_template as enum (
  'invitation', 'approval_pending', 'delivery_ready', 'payment_confirmed', 'payment_problem', 'password_changed'
);
create type public.email_status as enum ('queued', 'sending', 'sent', 'failed', 'refused');

select pgmq.create('email_outbox');
revoke all on all tables in schema pgmq from public, anon, authenticated, service_role;
revoke all on all sequences in schema pgmq from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Registro de cada e-mail
-- ---------------------------------------------------------------------------------------------------

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  recipient_user_id uuid references auth.users (id) on delete set null,
  recipient_email text not null,
  template public.email_template not null,
  locale text not null,
  variables jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status public.email_status not null default 'queued',
  attempts integer not null default 0,
  provider text,
  provider_message_id text,
  error jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint email_messages_idempotency_key unique (idempotency_key),
  constraint email_messages_locale_supported check (locale in ('pt-BR', 'en', 'es')),
  constraint email_messages_recipient_format check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint email_messages_workspace_scope check ((workspace_id is null) = (template = 'password_changed')),
  constraint email_messages_variables_object check (jsonb_typeof(variables) = 'object'),
  constraint email_messages_error_object check (error is null or jsonb_typeof(error) = 'object'),
  constraint email_messages_attempts_non_negative check (attempts >= 0),
  constraint email_messages_sent_consistency check (
    (status = 'sent') = (sent_at is not null) and (status <> 'sent' or provider_message_id is not null)
  )
);
comment on table public.email_messages is 'E-mail transacional (fila email_outbox): destinatário, modelo, idioma, variáveis, estado, id do provedor e tentativas. O texto sai do catálogo do backend.';
create index email_messages_workspace_idx on public.email_messages (workspace_id, created_at desc)
  where workspace_id is not null;
create index email_messages_recipient_idx on public.email_messages (recipient_user_id, created_at desc)
  where recipient_user_id is not null;
create trigger email_messages_set_updated_at
  before update on public.email_messages
  for each row execute function app.set_updated_at();

alter table public.email_messages enable row level security;
alter table public.email_messages force row level security;
grant select on table public.email_messages to authenticated;

-- A pessoa vê os e-mails que recebeu; o owner vê os do negócio (convites enviados, avisos de cobrança).
create policy email_messages_select_recipient on public.email_messages
  for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy email_messages_select_owner on public.email_messages
  for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids('owner')));

-- ---------------------------------------------------------------------------------------------------
-- Preferência mínima: receber ou não, por pessoa e por modelo
-- ---------------------------------------------------------------------------------------------------

create table public.email_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  template public.email_template not null,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, template),
  constraint email_preferences_optional_template check (template not in ('invitation', 'password_changed'))
);
comment on table public.email_preferences is 'Receber ou não cada e-mail transacional opcional. Sem linha: recebe.';
create trigger email_preferences_set_updated_at
  before update on public.email_preferences
  for each row execute function app.set_updated_at();

alter table public.email_preferences enable row level security;
alter table public.email_preferences force row level security;
grant select, delete on table public.email_preferences to authenticated;
grant insert (user_id, template, enabled), update (enabled) on table public.email_preferences to authenticated;

create policy email_preferences_select_own on public.email_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy email_preferences_insert_own on public.email_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy email_preferences_update_own on public.email_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy email_preferences_delete_own on public.email_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Enfileiramento
-- ---------------------------------------------------------------------------------------------------

create function app.user_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  )
  from auth.users u
  where u.id = p_user_id
$$;

-- Idioma do e-mail: o da pessoa → o do negócio do evento → o do primeiro negócio da pessoa → pt-BR.
create function app.email_locale(p_user_id uuid, p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.raw_user_meta_data ->> 'locale'
     from auth.users u
     where u.id = p_user_id and u.raw_user_meta_data ->> 'locale' in ('pt-BR', 'en', 'es')),
    (select w.locale from public.workspaces w where w.id = p_workspace_id),
    (select w.locale
     from public.memberships m
     join public.workspaces w on w.id = m.workspace_id
     where m.user_id = p_user_id
     order by m.created_at, m.workspace_id
     limit 1),
    'pt-BR'
  )
$$;

create function app.enqueue_email(
  p_template public.email_template,
  p_workspace_id uuid,
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_variables jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_recipient_email));
  v_id uuid;
begin
  if v_email is null or v_email = '' then
    return null;
  end if;
  if p_recipient_user_id is not null and exists (
    select 1 from public.email_preferences ep
    where ep.user_id = p_recipient_user_id and ep.template = p_template and not ep.enabled
  ) then
    return null;
  end if;

  insert into public.email_messages (
    workspace_id, recipient_user_id, recipient_email, template, locale, variables, idempotency_key
  )
  values (
    p_workspace_id, p_recipient_user_id, v_email, p_template,
    app.email_locale(p_recipient_user_id, p_workspace_id), jsonb_strip_nulls(coalesce(p_variables, '{}'::jsonb)),
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    perform pgmq.send(
      'email_outbox',
      jsonb_build_object('email_message_id', v_id, 'workspace_id', p_workspace_id, 'template', p_template)
    );
  end if;
  return v_id;
end;
$$;

-- Owners de um negócio (quem decide e quem responde pela cobrança).
create function app.workspace_owner_recipients(p_workspace_id uuid)
returns table (user_id uuid, email text, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, lower(u.email), app.user_display_name(m.user_id)
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = p_workspace_id and m.role = 'owner' and u.email is not null
$$;

-- ---------------------------------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------------------------------

create function app.invitations_enqueue_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.enqueue_email(
    'invitation', new.workspace_id,
    (select u.id from auth.users u where lower(u.email) = new.email limit 1),
    new.email,
    jsonb_build_object(
      'workspace_name', w.name, 'inviter_name', app.user_display_name(new.invited_by),
      'role', new.role, 'expires_at', new.expires_at
    ),
    'invitation:' || new.id
  )
  from public.workspaces w
  where w.id = new.workspace_id;
  return null;
end;
$$;

create trigger invitations_enqueue_email
  after insert on public.invitations
  for each row execute function app.invitations_enqueue_email();

create function app.approvals_enqueue_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.enqueue_email(
    'approval_pending', new.workspace_id, o.user_id, o.email,
    jsonb_build_object(
      'workspace_name', w.name, 'workspace_slug', w.slug, 'recipient_name', o.full_name,
      'agent_id', new.requested_by_agent_id, 'kind', new.kind, 'work_item_title', wi.title
    ),
    'approval:' || new.id || ':' || o.user_id
  )
  from public.workspaces w
  cross join app.workspace_owner_recipients(new.workspace_id) o
  left join public.work_items wi on wi.workspace_id = new.workspace_id and wi.id = new.work_item_id
  where w.id = new.workspace_id;
  return null;
end;
$$;

create trigger approvals_enqueue_email
  after insert on public.approvals
  for each row
  when (new.status = 'pending')
  execute function app.approvals_enqueue_email();

create function app.delivery_versions_enqueue_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.enqueue_email(
    'delivery_ready', new.workspace_id, m.user_id, lower(u.email),
    jsonb_build_object(
      'workspace_name', w.name, 'workspace_slug', w.slug, 'recipient_name', app.user_display_name(m.user_id),
      'agent_id', new.created_by_agent_id, 'work_item_title', wi.title, 'version_no', new.version_no
    ),
    'delivery_version:' || new.id || ':' || m.user_id
  )
  from public.workspaces w
  join public.deliveries d on d.workspace_id = new.workspace_id and d.id = new.delivery_id
  join public.work_items wi on wi.workspace_id = d.workspace_id and wi.id = d.work_item_id
  join public.memberships m on m.workspace_id = new.workspace_id and m.role <> 'owner'
  join auth.users u on u.id = m.user_id and u.email is not null
  where w.id = new.workspace_id;
  return null;
end;
$$;

create trigger delivery_versions_enqueue_email
  after insert on public.delivery_versions
  for each row
  when (new.created_by_type = 'agent')
  execute function app.delivery_versions_enqueue_email();

-- Sem valor em dinheiro nem créditos no e-mail: preço e créditos ainda são provisórios (decisão do dono, 16/10).
create function app.payments_enqueue_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.email_template;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return null;
  end if;
  v_template := case
    when new.status = 'confirmed' then 'payment_confirmed'::public.email_template
    when new.status in ('overdue', 'failed', 'charged_back') then 'payment_problem'::public.email_template
  end;
  if v_template is null then
    return null;
  end if;
  perform app.enqueue_email(
    v_template, new.workspace_id, o.user_id, o.email,
    jsonb_build_object(
      'workspace_name', w.name, 'workspace_slug', w.slug, 'recipient_name', o.full_name,
      'payment_kind', new.kind, 'method', new.method, 'status', new.status
    ),
    'payment:' || new.id || ':' || new.status || ':' || o.user_id
  )
  from public.workspaces w
  cross join app.workspace_owner_recipients(new.workspace_id) o
  where w.id = new.workspace_id;
  return null;
end;
$$;

create trigger payments_enqueue_email
  after insert or update of status on public.payments
  for each row execute function app.payments_enqueue_email();

-- Aviso de senha trocada: só quando quem troca é a Auth (recuperação ou troca pela pessoa). O seed local
-- reescreve o hash com outro sal e não é troca de senha. Falha aqui nunca derruba a operação da Auth.
create function app.auth_users_enqueue_password_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if session_user is distinct from 'supabase_auth_admin' then
    return null;
  end if;
  begin
    perform app.enqueue_email(
      'password_changed', null, new.id, new.email,
      jsonb_build_object('recipient_name', app.user_display_name(new.id), 'changed_at', now()),
      'password:' || new.id || ':' || (extract(epoch from clock_timestamp()) * 1000000)::bigint
    );
  exception when others then
    raise warning 'aviso de senha trocada não enfileirado: %', sqlerrm;
  end;
  return null;
end;
$$;

create trigger auth_users_password_changed_email
  after update of encrypted_password on auth.users
  for each row
  when (
    old.encrypted_password is distinct from new.encrypted_password
    and coalesce(old.encrypted_password, '') <> ''
    and new.email is not null
  )
  execute function app.auth_users_enqueue_password_email();

revoke all on function app.user_display_name(uuid) from public, anon, authenticated, service_role;
revoke all on function app.email_locale(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function app.enqueue_email(public.email_template, uuid, uuid, text, jsonb, text)
  from public, anon, authenticated, service_role;
revoke all on function app.workspace_owner_recipients(uuid) from public, anon, authenticated, service_role;
revoke all on function app.invitations_enqueue_email() from public, anon, authenticated, service_role;
revoke all on function app.approvals_enqueue_email() from public, anon, authenticated, service_role;
revoke all on function app.delivery_versions_enqueue_email() from public, anon, authenticated, service_role;
revoke all on function app.payments_enqueue_email() from public, anon, authenticated, service_role;
revoke all on function app.auth_users_enqueue_password_email() from public, anon, authenticated, service_role;
