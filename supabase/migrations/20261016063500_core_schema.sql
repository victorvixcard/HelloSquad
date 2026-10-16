-- S1a — schema do núcleo: conversa → trabalho → entrega → aprovação → histórico, e a execução (runs).
-- Mesmo padrão da S0: workspace_id NOT NULL em toda tabela, RLS habilitada E forçada, `authenticated`
-- só lê (SELECT) o que é dos seus workspaces e escreve apenas por funções app.* SECURITY DEFINER.
-- Escrita direta fica com o papel privilegiado (worker), sempre com workspace_id explícito.
-- Referências entre tabelas usam FK composta (workspace_id, id): o banco recusa um filho apontando para
-- um pai de outro workspace, mesmo que a escrita venha do papel privilegiado.

-- ---------------------------------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------------------------------

-- Ids dos agentes oficiais, os mesmos de squad/<id>/agent.yaml. Agente novo exige migration.
create domain public.agent_id as text
  check (value in ('nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris'));

create type public.principal_type as enum ('user', 'agent');
create type public.conversation_kind as enum ('squad_room', 'agent_direct', 'object');
create type public.message_author_type as enum ('user', 'agent', 'system');
create type public.project_status as enum ('draft', 'active', 'paused', 'done', 'cancelled');
-- Estados do Documento Mestre §8 (A validar/rascunho, Em andamento, Precisa de você, Programado, Aprovado,
-- Concluído, Pausado, Bloqueado, Falha) e cancelled. Transições permitidas em app.work_item_transitions.
create type public.work_item_status as enum (
  'draft', 'in_progress', 'needs_you', 'scheduled', 'approved', 'done', 'paused', 'blocked', 'failed', 'cancelled'
);
create type public.work_item_step_status as enum ('pending', 'in_progress', 'done', 'failed', 'skipped');
create type public.delivery_version_status as enum ('draft', 'approved', 'superseded');
create type public.approval_kind as enum ('review', 'approve', 'authorize', 'confirm', 'reconnect', 'respond');
create type public.approval_status as enum ('pending', 'decided', 'expired');
create type public.approval_decision as enum ('approved', 'rejected', 'changes_requested', 'answered');
create type public.run_kind as enum ('interactive', 'scheduled', 'reflection');
create type public.run_status as enum ('queued', 'running', 'waiting_approval', 'succeeded', 'failed', 'cancelled');
create type public.run_step_kind as enum ('llm_call', 'tool_call', 'wait', 'check');
create type public.run_step_status as enum ('running', 'succeeded', 'failed');

-- ---------------------------------------------------------------------------------------------------
-- Conversas
-- ---------------------------------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.conversation_kind not null,
  primary_agent_id public.agent_id,
  context_type text,
  context_id uuid,
  title text,
  created_by uuid references auth.users (id) on delete set null,
  last_message_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_workspace_id_id_key unique (workspace_id, id),
  constraint conversations_context_pair check ((context_type is null) = (context_id is null)),
  constraint conversations_object_has_context check ((kind = 'object') = (context_type is not null)),
  constraint conversations_direct_has_agent check (kind <> 'agent_direct' or primary_agent_id is not null),
  constraint conversations_context_type_format check (context_type ~ '^[a-z][a-z0-9_]*$'),
  constraint conversations_title_length check (char_length(title) <= 200)
);
comment on column public.conversations.context_type is 'Tipo do objeto de onde a conversa foi aberta (ex.: work_item, project). Só em kind = object.';
create index conversations_workspace_last_message_idx on public.conversations (workspace_id, last_message_at desc nulls last);
create index conversations_created_by_idx on public.conversations (created_by);
-- Uma Sala do Squad ativa por workspace e uma conversa ativa por objeto: "abrir" vira buscar ou criar.
create unique index conversations_one_squad_room_idx on public.conversations (workspace_id)
  where kind = 'squad_room' and archived_at is null;
create unique index conversations_one_per_object_idx on public.conversations (workspace_id, context_type, context_id)
  where kind = 'object' and archived_at is null;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function app.set_updated_at();

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null,
  participant_type public.principal_type not null,
  user_id uuid references auth.users (id) on delete cascade,
  agent_id public.agent_id,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_participants_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete cascade,
  constraint conversation_participants_one_identity check (
    (participant_type = 'user' and user_id is not null and agent_id is null)
    or (participant_type = 'agent' and agent_id is not null and user_id is null)
  ),
  constraint conversation_participants_user_key unique (conversation_id, user_id),
  constraint conversation_participants_agent_key unique (conversation_id, agent_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);
create trigger conversation_participants_set_updated_at
  before update on public.conversation_participants
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Execução (runs): vem antes de messages e delivery_versions, que apontam para o run que as produziu
-- ---------------------------------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  objective text,
  status public.project_status not null default 'active',
  owner_agent_id public.agent_id not null default 'nexo',
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_workspace_id_id_key unique (workspace_id, id),
  constraint projects_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint projects_objective_length check (char_length(objective) <= 4000)
);
create index projects_workspace_created_idx on public.projects (workspace_id, created_at desc);
create index projects_created_by_idx on public.projects (created_by);
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function app.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null,
  author_type public.message_author_type not null,
  author_user_id uuid references auth.users (id) on delete set null,
  author_agent_id public.agent_id,
  run_id uuid,
  body text not null,
  body_format text not null default 'markdown',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_workspace_id_id_key unique (workspace_id, id),
  constraint messages_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete cascade,
  -- O autor usuário pode ficar nulo depois da exclusão da conta (LGPD); o tipo do autor não muda.
  constraint messages_author_identity check (
    (author_type = 'user' and author_agent_id is null)
    or (author_type = 'agent' and author_agent_id is not null and author_user_id is null)
    or (author_type = 'system' and author_agent_id is null and author_user_id is null)
  ),
  constraint messages_body_not_blank check (char_length(btrim(body)) > 0),
  constraint messages_body_length check (char_length(body) <= 100000),
  constraint messages_body_format check (body_format in ('markdown')),
  constraint messages_attachments_array check (jsonb_typeof(attachments) = 'array')
);
comment on table public.messages is 'Imutável para usuários: sem UPDATE/DELETE para authenticated. Usuário escreve só por app.post_message.';
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc, id desc);
create index messages_author_user_idx on public.messages (author_user_id);
create index messages_run_idx on public.messages (run_id) where run_id is not null;
create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Trabalho
-- ---------------------------------------------------------------------------------------------------

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid,
  conversation_id uuid,
  origin_message_id uuid,
  title text not null,
  briefing jsonb not null default '{}'::jsonb,
  delivery_type text,
  status public.work_item_status not null default 'draft',
  primary_agent_id public.agent_id not null default 'nexo',
  collaborator_agent_ids public.agent_id[] not null default '{}',
  idempotency_key text not null default gen_random_uuid()::text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_items_workspace_id_id_key unique (workspace_id, id),
  constraint work_items_idempotency_key unique (workspace_id, idempotency_key),
  constraint work_items_project_fk foreign key (workspace_id, project_id)
    references public.projects (workspace_id, id) on delete set null (project_id),
  constraint work_items_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete set null (conversation_id),
  constraint work_items_origin_message_fk foreign key (workspace_id, origin_message_id)
    references public.messages (workspace_id, id) on delete set null (origin_message_id),
  constraint work_items_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint work_items_briefing_object check (jsonb_typeof(briefing) = 'object'),
  constraint work_items_delivery_type_format check (delivery_type ~ '^[0-9]{2}\.[0-9]{2}$'),
  constraint work_items_collaborators_exclude_primary check (not (primary_agent_id = any (collaborator_agent_ids)))
);
comment on column public.work_items.delivery_type is 'Id da delivery no catálogo do Documento Mestre (Anexo A), ex.: 04.01.';
comment on column public.work_items.status is 'Muda só por app.transition_work_item; o trigger work_items_check_transition recusa qualquer outra mudança fora da matriz.';
create index work_items_workspace_status_idx on public.work_items (workspace_id, status, updated_at desc);
create index work_items_project_idx on public.work_items (project_id) where project_id is not null;
create index work_items_conversation_idx on public.work_items (conversation_id) where conversation_id is not null;
create index work_items_origin_message_idx on public.work_items (origin_message_id) where origin_message_id is not null;
create index work_items_created_by_idx on public.work_items (created_by);
create trigger work_items_set_updated_at
  before update on public.work_items
  for each row execute function app.set_updated_at();

create table public.work_item_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid not null,
  seq integer not null,
  title text not null,
  agent_id public.agent_id,
  status public.work_item_step_status not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_item_steps_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint work_item_steps_seq_key unique (work_item_id, seq),
  constraint work_item_steps_seq_positive check (seq > 0),
  constraint work_item_steps_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint work_item_steps_finished_after_start check (finished_at >= started_at)
);
create trigger work_item_steps_set_updated_at
  before update on public.work_item_steps
  for each row execute function app.set_updated_at();

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid,
  conversation_id uuid,
  agent_id public.agent_id not null,
  kind public.run_kind not null default 'interactive',
  status public.run_status not null default 'queued',
  prompt_version text,
  model text,
  idempotency_key text not null,
  started_at timestamptz,
  finished_at timestamptz,
  error jsonb,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd numeric(14, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runs_workspace_id_id_key unique (workspace_id, id),
  constraint runs_idempotency_key unique (workspace_id, idempotency_key),
  constraint runs_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete set null (work_item_id),
  constraint runs_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete set null (conversation_id),
  constraint runs_idempotency_key_length check (char_length(idempotency_key) between 1 and 200),
  constraint runs_error_object check (error is null or jsonb_typeof(error) = 'object'),
  constraint runs_tokens_non_negative check (
    input_tokens >= 0 and output_tokens >= 0 and cache_read_tokens >= 0 and cache_write_tokens >= 0
  ),
  constraint runs_cost_non_negative check (cost_usd >= 0),
  constraint runs_finished_after_start check (finished_at >= started_at)
);
comment on table public.runs is 'Unidade auditável de execução de um agente. Usuário só lê; escreve o papel privilegiado (worker).';
create index runs_work_item_idx on public.runs (work_item_id) where work_item_id is not null;
create index runs_conversation_idx on public.runs (conversation_id) where conversation_id is not null;
create index runs_workspace_active_idx on public.runs (workspace_id, created_at) where status in ('queued', 'running');
create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function app.set_updated_at();

alter table public.messages
  add constraint messages_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id);

create table public.run_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null,
  seq integer not null,
  kind public.run_step_kind not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd numeric(14, 6) not null default 0,
  latency_ms integer,
  payload jsonb not null default '{}'::jsonb,
  status public.run_step_status not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint run_steps_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete cascade,
  constraint run_steps_seq_key unique (run_id, seq),
  constraint run_steps_seq_positive check (seq > 0),
  constraint run_steps_tokens_non_negative check (
    input_tokens >= 0 and output_tokens >= 0 and cache_read_tokens >= 0 and cache_write_tokens >= 0
  ),
  constraint run_steps_cost_non_negative check (cost_usd >= 0),
  constraint run_steps_latency_non_negative check (latency_ms >= 0),
  constraint run_steps_payload_object check (jsonb_typeof(payload) = 'object')
);
comment on column public.run_steps.payload is 'Entrada/saída da etapa já redigida: nunca token, chave ou segredo de conexão.';
create trigger run_steps_set_updated_at
  before update on public.run_steps
  for each row execute function app.set_updated_at();

-- Somente inserção: progresso do run para a UI (Realtime). Sem updated_at.
create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null,
  seq integer not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint run_events_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete cascade,
  constraint run_events_seq_key unique (run_id, seq),
  constraint run_events_seq_positive check (seq > 0),
  constraint run_events_type_format check (type ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  constraint run_events_payload_object check (jsonb_typeof(payload) = 'object')
);
create index run_events_workspace_created_idx on public.run_events (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Entregas
-- ---------------------------------------------------------------------------------------------------

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid not null,
  kind text not null,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliveries_workspace_id_id_key unique (workspace_id, id),
  constraint deliveries_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint deliveries_kind_format check (kind ~ '^[a-z][a-z0-9_]*$')
);
create index deliveries_work_item_idx on public.deliveries (work_item_id);
create trigger deliveries_set_updated_at
  before update on public.deliveries
  for each row execute function app.set_updated_at();

create table public.delivery_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delivery_id uuid not null,
  version_no integer not null,
  content jsonb not null default '{}'::jsonb,
  created_by_type public.principal_type not null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_by_agent_id public.agent_id,
  run_id uuid,
  change_note text,
  status public.delivery_version_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_versions_workspace_id_id_key unique (workspace_id, id),
  constraint delivery_versions_delivery_id_id_key unique (delivery_id, id),
  constraint delivery_versions_version_no_key unique (delivery_id, version_no),
  constraint delivery_versions_delivery_fk foreign key (workspace_id, delivery_id)
    references public.deliveries (workspace_id, id) on delete cascade,
  constraint delivery_versions_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id),
  constraint delivery_versions_version_no_positive check (version_no > 0),
  constraint delivery_versions_content_object check (jsonb_typeof(content) = 'object'),
  constraint delivery_versions_author_identity check (
    (created_by_type = 'agent' and created_by_agent_id is not null and created_by_user_id is null)
    or (created_by_type = 'user' and created_by_agent_id is null)
  ),
  constraint delivery_versions_change_note_length check (char_length(change_note) <= 2000)
);
create index delivery_versions_run_idx on public.delivery_versions (run_id) where run_id is not null;
create index delivery_versions_created_by_user_idx on public.delivery_versions (created_by_user_id);
create trigger delivery_versions_set_updated_at
  before update on public.delivery_versions
  for each row execute function app.set_updated_at();

-- A versão atual precisa ser uma versão desta mesma entrega.
alter table public.deliveries
  add constraint deliveries_current_version_fk foreign key (id, current_version_id)
    references public.delivery_versions (delivery_id, id);
create index deliveries_current_version_idx on public.deliveries (current_version_id) where current_version_id is not null;

create table public.delivery_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version_id uuid not null,
  storage_path text not null,
  mime text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_files_version_fk foreign key (workspace_id, version_id)
    references public.delivery_versions (workspace_id, id) on delete cascade,
  constraint delivery_files_storage_path_key unique (storage_path),
  -- Padrão do Storage: <workspace_id>/deliveries/<delivery_id>/<version_no>/<arquivo>. O prefixo do
  -- workspace é o que a política do bucket vai comparar; o trigger confere entrega e versão.
  constraint delivery_files_storage_path_format check (
    storage_path ~ ('^' || workspace_id::text || '/deliveries/[0-9a-f-]{36}/[1-9][0-9]*/[^/]+(/[^/]+)*$')
    and storage_path !~ '(^|/)\.\.?(/|$)'
  ),
  constraint delivery_files_mime_format check (mime ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  constraint delivery_files_size_non_negative check (size_bytes >= 0)
);
create index delivery_files_version_idx on public.delivery_files (version_id);
create trigger delivery_files_set_updated_at
  before update on public.delivery_files
  for each row execute function app.set_updated_at();

create function app.delivery_files_check_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prefix text;
begin
  select new.workspace_id::text || '/deliveries/' || v.delivery_id::text || '/' || v.version_no::text || '/'
  into v_prefix
  from public.delivery_versions v
  where v.id = new.version_id and v.workspace_id = new.workspace_id;

  if v_prefix is null or left(new.storage_path, char_length(v_prefix)) <> v_prefix then
    raise exception using
      errcode = 'check_violation',
      constraint = 'delivery_files_storage_path_matches_version',
      message = 'O caminho do arquivo não corresponde à entrega e à versão.';
  end if;

  return new;
end;
$$;

create trigger delivery_files_check_path
  before insert or update of storage_path, version_id, workspace_id on public.delivery_files
  for each row execute function app.delivery_files_check_path();

-- ---------------------------------------------------------------------------------------------------
-- Decisões ("Precisa de você")
-- ---------------------------------------------------------------------------------------------------

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid not null,
  delivery_version_id uuid,
  run_id uuid,
  kind public.approval_kind not null,
  requested_by_agent_id public.agent_id not null,
  status public.approval_status not null default 'pending',
  decision public.approval_decision,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  note text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approvals_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint approvals_delivery_version_fk foreign key (workspace_id, delivery_version_id)
    references public.delivery_versions (workspace_id, id) on delete set null (delivery_version_id),
  constraint approvals_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id),
  constraint approvals_decided_consistency check (
    (status = 'decided') = (decision is not null) and (status = 'decided') = (decided_at is not null)
  ),
  -- Decisões possíveis por tipo: revisar/aprovar aceitam ajuste; responder só tem resposta.
  constraint approvals_decision_matches_kind check (
    decision is null
    or (kind in ('review', 'approve') and decision in ('approved', 'changes_requested', 'rejected'))
    or (kind in ('authorize', 'confirm', 'reconnect') and decision in ('approved', 'rejected'))
    or (kind = 'respond' and decision = 'answered')
  ),
  constraint approvals_note_length check (char_length(note) <= 2000)
);
comment on table public.approvals is 'Decisão pedida ao usuário. Aprovar conteúdo não autoriza publicar, enviar ou investir: cada ação externa tem a própria aprovação authorize.';
create index approvals_work_item_idx on public.approvals (work_item_id);
create index approvals_pending_idx on public.approvals (workspace_id, created_at) where status = 'pending';
create index approvals_delivery_version_idx on public.approvals (delivery_version_id) where delivery_version_id is not null;
create index approvals_run_idx on public.approvals (run_id) where run_id is not null;
create index approvals_decided_by_idx on public.approvals (decided_by);
create trigger approvals_set_updated_at
  before update on public.approvals
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- RLS, GRANTs e políticas: authenticated lê o que é dos seus workspaces; nada de escrita direta
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'conversations', 'conversation_participants', 'messages', 'projects', 'work_items', 'work_item_steps',
    'deliveries', 'delivery_versions', 'delivery_files', 'approvals', 'runs', 'run_steps', 'run_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (workspace_id in (select app.current_user_workspace_ids()))',
      v_table || '_select_member', v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Operação do usuário: enviar mensagem
-- ---------------------------------------------------------------------------------------------------

-- Papel mínimo para agir (enviar mensagem, criar trabalho, decidir): editor. Viewer só lê.
create function app.post_message(p_conversation_id uuid, p_body text)
returns public.messages
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_body text := btrim(coalesce(p_body, ''));
  v_message public.messages;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
    and c.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conversa não encontrada.';
  end if;

  if not app.has_role(v_conversation.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite enviar mensagens.';
  end if;
  if v_conversation.archived_at is not null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta conversa está arquivada.';
  end if;
  if v_body = '' then
    raise exception using errcode = 'invalid_parameter_value', message = 'A mensagem não pode ficar vazia.';
  end if;
  if char_length(v_body) > 20000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A mensagem passou de 20.000 caracteres.';
  end if;

  insert into public.messages (workspace_id, conversation_id, author_type, author_user_id, body)
  values (v_conversation.workspace_id, v_conversation.id, 'user', v_user_id, v_body)
  returning * into v_message;

  update public.conversations
  set last_message_at = greatest(coalesce(last_message_at, v_message.created_at), v_message.created_at)
  where id = v_conversation.id;

  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, user_id)
  values (v_conversation.workspace_id, v_conversation.id, 'user', v_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return v_message;
end;
$$;

revoke all on function
  app.post_message(uuid, text),
  app.delivery_files_check_path()
  from public, anon, authenticated, service_role;

grant execute on function app.post_message(uuid, text) to authenticated;
