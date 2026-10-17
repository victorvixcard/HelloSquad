-- S3b — Modo Autônomo: responsabilidades (RST5), execuções (EXST5), propostas de delegação e o registro do que
-- o dono e o sistema fizeram ("Alterações"). Fonte: docs/FLUXOS_DA_V46.md §7 e §3.3; notas x1 §B.
--
-- Delegar é conversa: o Nexo monta "o combinado" (proposta) e ele só vale com o ok do dono (approvals tipo confirm,
-- no trabalho 01.04 "Delegar responsabilidade recorrente"). O scheduler (hellosquad-scheduler) dispara as ativas
-- vencidas no fuso do negócio, cria a execução e o trabalho do runtime com as etapas do modelo. A execução segue o
-- trabalho por gatilho: entrega para aprovar → "Aguarda sua aprovação"; o dono aprova → "Aprovada por você"; falha
-- → nova tentativa em 30 min; na segunda, "Falhou". Execução encerrada não muda nem se apaga (só com a
-- responsabilidade ou o workspace). Conexões são da S3a: aqui fica o gancho (blocked_by_connection e as funções
-- app.block/unblock_responsibilities_for_connection), lendo as fontes da Memória enquanto `connections` não existe.

create type public.responsibility_template as enum ('plan', 'posts', 'res', 'opp', 'reat', 'reviews', 'seo', 'crm');
-- RST5: "Ativa", "Pausada", "Bloqueada por integração", "Falha na execução", "Encerrada" e "Aguarda sua
-- confirmação" (resto da V3, sem produtor: a proposta mora em responsibility_proposals).
create type public.responsibility_status as enum ('proposed', 'active', 'paused', 'blocked', 'failed', 'ended');
-- EXST5: "Programada", "Concluída", "Falhou", "Não executada", "Aguarda sua aprovação", "Aprovada por você"; running
-- é a execução em andamento (o protótipo não rotula; a API mostra "Programada" com o trabalho aberto).
create type public.responsibility_run_status as enum (
  'scheduled', 'running', 'awaiting_approval', 'approved', 'done', 'failed', 'skipped'
);
create type public.responsibility_cadence as enum ('weekly', 'biweekly', 'monthly', 'daily', 'continuous');
create type public.autonomy_level as enum ('analyze', 'prepare', 'execute', 'never');
create type public.responsibility_proposal_status as enum ('pending', 'confirmed', 'discarded');

-- Fuso do negócio: as rotinas disparam na hora local do workspace (pergunta 2 da Fase 3, leitura conservadora).
alter table public.workspaces
  add column timezone text not null default 'America/Sao_Paulo',
  add constraint workspaces_timezone_format check (timezone ~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+){0,2}$');
comment on column public.workspaces.timezone is 'Fuso IANA do negócio; as rotinas do Modo Autônomo disparam na hora local dele.';

-- ---------------------------------------------------------------------------------------------------
-- Responsabilidades
-- ---------------------------------------------------------------------------------------------------

create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  template public.responsibility_template not null,
  title text not null,
  lead_agent_id public.agent_id not null,
  collaborator_agent_ids public.agent_id[] not null default '{}',
  coordinator_agent_id public.agent_id not null default 'nexo',
  cadence public.responsibility_cadence not null,
  weekdays smallint[] not null default '{}',
  month_day smallint,
  run_time time not null default '09:00',
  options jsonb not null default '{}'::jsonb,
  agreement text not null,
  actions jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  auto_publish boolean not null default false,
  approval_required boolean not null default true,
  required_connections text[] not null default '{}',
  status public.responsibility_status not null default 'active',
  status_reason text,
  status_params jsonb not null default '{}'::jsonb,
  blocked_by_connection text,
  since timestamptz not null default now(),
  next_run_at timestamptz,
  last_run_at timestamptz,
  paused_at timestamptz,
  ended_at timestamptz,
  conversation_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint responsibilities_workspace_id_id_key unique (workspace_id, id),
  constraint responsibilities_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete set null (conversation_id),
  constraint responsibilities_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint responsibilities_agreement_length check (char_length(btrim(agreement)) between 1 and 1000),
  constraint responsibilities_collaborators_exclude_lead check (not (lead_agent_id = any (collaborator_agent_ids))),
  constraint responsibilities_weekdays_range check (0 < all (weekdays) and 8 > all (weekdays)),
  constraint responsibilities_weekly_has_days check ((cadence = 'weekly') = (cardinality(weekdays) > 0)),
  constraint responsibilities_month_day_range check (month_day between 1 and 28),
  constraint responsibilities_options_object check (jsonb_typeof(options) = 'object'),
  constraint responsibilities_actions_array check (jsonb_typeof(actions) = 'array'),
  constraint responsibilities_limits_object check (jsonb_typeof(limits) = 'object'),
  constraint responsibilities_status_params_object check (jsonb_typeof(status_params) = 'object'),
  constraint responsibilities_auto_publish_only_content check (not auto_publish or template in ('plan', 'posts')),
  constraint responsibilities_paused_at check ((status = 'paused') = (paused_at is not null)),
  constraint responsibilities_ended_at check ((status = 'ended') = (ended_at is not null)),
  constraint responsibilities_blocked_has_connection check (
    status not in ('blocked', 'failed') or blocked_by_connection is not null or status_reason is not null
  ),
  constraint responsibilities_ended_not_scheduled check (status <> 'ended' or next_run_at is null)
);
comment on table public.responsibilities is 'Responsabilidade do Modo Autônomo (V4.6 §7). Muda só pelas funções app.*; o dono lê, pausa, retoma e encerra pela API.';
comment on column public.responsibilities.agreement is '"O combinado" renderizado no idioma do negócio quando o dono confirmou.';
comment on column public.responsibilities.actions is 'Nível por ação: [{action, level (analyze|prepare|execute|never), requirement?, granted?}]; o rótulo sai do catálogo.';
comment on column public.responsibilities.blocked_by_connection is 'Gancho da S3a: conexão que bloqueia (google_business_profile, email_marketing…).';
comment on column public.responsibilities.next_run_at is 'Próxima execução (UTC), calculada no fuso do negócio; nula se pausada, encerrada ou contínua.';
create unique index responsibilities_one_open_per_template_idx
  on public.responsibilities (workspace_id, template) where status <> 'ended';
create index responsibilities_due_idx on public.responsibilities (next_run_at) where status in ('active', 'blocked');
create trigger responsibilities_set_updated_at
  before update on public.responsibilities
  for each row execute function app.set_updated_at();

-- Proposta: "o combinado" que o Nexo apresentou na conversa e que espera o ok do dono (nova ou mudança).
create table public.responsibility_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  responsibility_id uuid,
  template public.responsibility_template not null,
  spec jsonb not null,
  agreement text not null,
  status public.responsibility_proposal_status not null default 'pending',
  conversation_id uuid,
  work_item_id uuid not null,
  approval_id uuid not null,
  message_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint responsibility_proposals_workspace_id_id_key unique (workspace_id, id),
  constraint responsibility_proposals_approval_key unique (approval_id),
  constraint responsibility_proposals_responsibility_fk foreign key (workspace_id, responsibility_id)
    references public.responsibilities (workspace_id, id) on delete cascade,
  constraint responsibility_proposals_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint responsibility_proposals_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete set null (conversation_id),
  constraint responsibility_proposals_spec_object check (jsonb_typeof(spec) = 'object'),
  constraint responsibility_proposals_decided check ((status = 'pending') = (decided_at is null))
);
comment on table public.responsibility_proposals is '"O combinado" apresentado pelo Nexo (cartão responsibility_proposal); só vale com o ok do dono (approvals confirm).';
create index responsibility_proposals_work_item_idx on public.responsibility_proposals (work_item_id);
create trigger responsibility_proposals_set_updated_at
  before update on public.responsibility_proposals
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Execuções e registro
-- ---------------------------------------------------------------------------------------------------

create table public.responsibility_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  responsibility_id uuid not null,
  code text not null,
  period_no smallint not null,
  title_key text not null,
  title_params jsonb not null default '{}'::jsonb,
  status public.responsibility_run_status not null default 'scheduled',
  message_key text,
  message_params jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  started_at timestamptz,
  finished_at timestamptz,
  attempts smallint not null default 0,
  max_attempts smallint not null default 2,
  retry_at timestamptz,
  attempt_times timestamptz[] not null default '{}',
  work_item_id uuid,
  run_id uuid,
  memory_used jsonb not null default '[]'::jsonb,
  output jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint responsibility_runs_workspace_id_id_key unique (workspace_id, id),
  constraint responsibility_runs_code_key unique (workspace_id, code),
  constraint responsibility_runs_cycle_key unique (responsibility_id, scheduled_for),
  constraint responsibility_runs_responsibility_fk foreign key (workspace_id, responsibility_id)
    references public.responsibilities (workspace_id, id) on delete cascade,
  constraint responsibility_runs_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete set null (work_item_id),
  constraint responsibility_runs_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id),
  constraint responsibility_runs_code_format check (code ~ '^[A-Z]{2}-[0-9]{1,2}[a-z]?$'),
  constraint responsibility_runs_period_range check (period_no between 1 and 53),
  constraint responsibility_runs_title_params_object check (jsonb_typeof(title_params) = 'object'),
  constraint responsibility_runs_message_params_object check (jsonb_typeof(message_params) = 'object'),
  constraint responsibility_runs_memory_used_array check (jsonb_typeof(memory_used) = 'array'),
  constraint responsibility_runs_output_object check (jsonb_typeof(output) = 'object'),
  constraint responsibility_runs_attempts_range check (attempts between 0 and max_attempts and max_attempts between 1 and 5),
  constraint responsibility_runs_retry_only_scheduled check (retry_at is null or status = 'scheduled'),
  constraint responsibility_runs_finished check (
    (status in ('approved', 'done', 'failed', 'skipped')) = (finished_at is not null)
  ),
  constraint responsibility_runs_approved check ((status = 'approved') = (approved_at is not null))
);
comment on table public.responsibility_runs is 'Execução de uma responsabilidade (EX5): código PL/RS/BL/RC-NN, estado EXST5, mensagem pelo catálogo, trabalho e run do runtime, o que usou da memória. Encerrada não muda nem se apaga.';
comment on column public.responsibility_runs.period_no is 'Semana ISO (plano: a semana seguinte, que o plano cobre) ou mês (relacionamento e reativação).';
comment on column public.responsibility_runs.memory_used is 'O que usou da Memória da Marca: [{fact_id, key, state}] dos fatos que o runtime pôs no contexto.';
create index responsibility_runs_responsibility_idx on public.responsibility_runs (responsibility_id, scheduled_for desc);
create index responsibility_runs_work_item_idx on public.responsibility_runs (work_item_id) where work_item_id is not null;
create index responsibility_runs_retry_idx on public.responsibility_runs (retry_at) where status = 'scheduled';
create trigger responsibility_runs_set_updated_at
  before update on public.responsibility_runs
  for each row execute function app.set_updated_at();

create table public.responsibility_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  responsibility_id uuid not null,
  actor_type public.audit_actor_type not null,
  actor_id text,
  action text not null,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint responsibility_events_responsibility_fk foreign key (workspace_id, responsibility_id)
    references public.responsibilities (workspace_id, id) on delete cascade,
  constraint responsibility_events_action check (action in (
    'delegated', 'changed', 'paused', 'resumed', 'ended', 'blocked', 'failed', 'unblocked'
  )),
  constraint responsibility_events_params_object check (jsonb_typeof(params) = 'object')
);
comment on table public.responsibility_events is 'Alterações da responsabilidade ("Você pausou a responsabilidade"…); somente inserção.';
create index responsibility_events_responsibility_idx on public.responsibility_events (responsibility_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Imutabilidade
-- ---------------------------------------------------------------------------------------------------

create function app.responsibility_runs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.responsibilities r where r.id = old.responsibility_id) then
      return old;
    end if;
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Execução do Modo Autônomo não se apaga: o histórico fica guardado.';
  end if;
  if old.status in ('approved', 'done', 'failed', 'skipped') then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Execução encerrada não muda: o registro fica como aconteceu.';
  end if;
  if new.workspace_id <> old.workspace_id or new.responsibility_id <> old.responsibility_id
     or new.code <> old.code or new.scheduled_for <> old.scheduled_for or new.created_at <> old.created_at then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Código, responsabilidade e horário de uma execução não mudam.';
  end if;
  return new;
end;
$$;

create trigger responsibility_runs_guard
  before update or delete on public.responsibility_runs
  for each row execute function app.responsibility_runs_guard();

create function app.responsibility_events_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1 from public.responsibilities r where r.id = old.responsibility_id
  ) then
    return old;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'O registro de alterações da responsabilidade é somente inserção.';
end;
$$;

create trigger responsibility_events_guard
  before update or delete on public.responsibility_events
  for each row execute function app.responsibility_events_guard();
create trigger responsibility_runs_no_truncate
  before truncate on public.responsibility_runs
  for each statement execute function app.responsibility_events_guard();
create trigger responsibility_events_no_truncate
  before truncate on public.responsibility_events
  for each statement execute function app.responsibility_events_guard();

-- ---------------------------------------------------------------------------------------------------
-- Ritmo: próxima execução no fuso do negócio
-- ---------------------------------------------------------------------------------------------------

-- Próxima execução estritamente depois de p_after. Semanal: os dias ISO (1 = segunda) na hora local; quinzenal:
-- 14 dias depois do dia local de p_after ("A cada 15 dias" no protótipo cai 14 dias depois: 12/10 → 26/10);
-- mensal: o dia do mês (padrão 1: "Todo mês" → 01/11); diário: a hora local de amanhã ou de hoje; contínua: nula.
create function app.responsibility_next_run(
  p_cadence public.responsibility_cadence,
  p_weekdays smallint[],
  p_month_day smallint,
  p_run_time time,
  p_timezone text,
  p_after timestamptz
)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_local timestamp := p_after at time zone p_timezone;
  v_day date := (p_after at time zone p_timezone)::date;
  v_candidate timestamp;
  v_month date;
begin
  if p_cadence = 'continuous' then
    return null;
  elsif p_cadence = 'daily' then
    v_candidate := v_day + p_run_time;
    if v_candidate <= v_local then
      v_candidate := v_candidate + interval '1 day';
    end if;
  elsif p_cadence = 'weekly' then
    for i in 0..7 loop
      v_candidate := (v_day + i) + p_run_time;
      if extract(isodow from v_day + i)::smallint = any (p_weekdays) and v_candidate > v_local then
        return v_candidate at time zone p_timezone;
      end if;
    end loop;
    return null;
  elsif p_cadence = 'biweekly' then
    v_candidate := (v_day + 14) + p_run_time;
  else
    v_month := date_trunc('month', v_day)::date;
    v_candidate := (v_month + (coalesce(p_month_day, 1) - 1)) + p_run_time;
    if v_candidate <= v_local then
      v_candidate := ((v_month + interval '1 month')::date + (coalesce(p_month_day, 1) - 1)) + p_run_time;
    end if;
  end if;
  return v_candidate at time zone p_timezone;
end;
$$;

create function app.responsibility_next_run_for(p_id uuid, p_after timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select app.responsibility_next_run(r.cadence, r.weekdays, r.month_day, r.run_time, w.timezone, p_after)
  from public.responsibilities r
  join public.workspaces w on w.id = r.workspace_id
  where r.id = p_id
$$;

-- ---------------------------------------------------------------------------------------------------
-- Conexões (gancho da S3a)
-- ---------------------------------------------------------------------------------------------------

-- Estado de uma conexão para o Modo Autônomo: connected, needs_reconnect ou not_connected. Enquanto a S3a não traz
-- `connections`, lê as fontes da Memória (fact_sources, tipo connection) pelo nome que o protótipo usa; a S3a
-- substitui o corpo desta função e mantém a assinatura.
create function app.responsibility_connection_state(p_workspace_id uuid, p_connection text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case f.state
      when 'connected' then 'connected'
      when 'outdated' then 'connected'
      when 'needs_reconnect' then 'needs_reconnect'
      else 'not_connected'
    end
    from public.fact_sources f
    where f.workspace_id = p_workspace_id and f.kind = 'connection'
      and f.name = case p_connection
        when 'google_business_profile' then 'Google Perfil'
        when 'email_marketing' then 'E-mail marketing'
        when 'instagram' then 'Instagram'
      end
    order by f.updated_at desc
    limit 1
  ), 'not_connected')
$$;

-- A conexão caiu (S3a): as responsabilidades que dependem dela param. Expirada → "Falha na execução"; ausente →
-- "Bloqueada por integração". Devolve quantas mudaram.
create function app.block_responsibilities_for_connection(
  p_workspace_id uuid, p_connection text, p_reason text
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_reason not in ('connection_expired', 'connection_missing') then
    raise exception using errcode = 'invalid_parameter_value', message = 'Motivo de bloqueio desconhecido.';
  end if;
  with changed as (
    update public.responsibilities r
    set status = case when p_reason = 'connection_expired' then 'failed' else 'blocked' end::public.responsibility_status,
        status_reason = p_reason, status_params = jsonb_build_object('connection', p_connection),
        blocked_by_connection = p_connection, paused_at = null
    where r.workspace_id = p_workspace_id and p_connection = any (r.required_connections)
      and r.status in ('active', 'paused', 'blocked', 'failed')
      and (r.status not in ('blocked', 'failed') or r.blocked_by_connection is distinct from p_connection
           or r.status_reason is distinct from p_reason)
    returning r.id, r.workspace_id, r.status
  ), logged as (
    insert into public.responsibility_events (workspace_id, responsibility_id, actor_type, action, params)
    select c.workspace_id, c.id, 'system', c.status::text, jsonb_build_object('connection', p_connection, 'reason', p_reason)
    from changed c
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

-- A conexão voltou (S3a: reconectar/conectar): as responsabilidades bloqueadas por ela voltam a "Ativa". Com
-- p_retry_at, a próxima execução é a nova tentativa ("Nova tentativa às 11h"); sem, o próximo ciclo do ritmo.
create function app.unblock_responsibilities_for_connection(
  p_workspace_id uuid, p_connection text, p_retry_at timestamptz default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with changed as (
    update public.responsibilities r
    set status = 'active', status_reason = null, status_params = '{}'::jsonb, blocked_by_connection = null,
        next_run_at = coalesce(p_retry_at, app.responsibility_next_run_for(r.id, now()))
    where r.workspace_id = p_workspace_id and r.blocked_by_connection = p_connection
      and r.status in ('blocked', 'failed')
    returning r.id, r.workspace_id
  ), logged as (
    insert into public.responsibility_events (workspace_id, responsibility_id, actor_type, action, params)
    select c.workspace_id, c.id, 'system', 'unblocked', jsonb_build_object('connection', p_connection)
    from changed c
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Ações do dono: pausar, retomar, encerrar e o interruptor do Modo Autônomo
-- ---------------------------------------------------------------------------------------------------

-- Pausar, retomar e encerrar são do owner (quem delega e autoriza é o dono da conta). Com falha ou bloqueio a
-- responsabilidade não pausa nem encerra até ser resolvida (V4.6 L13601). Repetir a mesma ação devolve o mesmo.
create function app.set_responsibility_state(p_id uuid, p_action text)
returns public.responsibilities
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.responsibilities;
  v_to public.responsibility_status;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select r.* into v_row
  from public.responsibilities r
  where r.id = p_id and r.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Responsabilidade não encontrada.';
  end if;
  if not app.has_role(v_row.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta muda o Modo Autônomo.';
  end if;
  v_to := case p_action when 'pause' then 'paused' when 'resume' then 'active' when 'end' then 'ended' end;
  if v_to is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Ação desconhecida.';
  end if;
  if v_row.status = v_to then
    return v_row;
  end if;
  if not (
    (p_action = 'pause' and v_row.status = 'active')
    or (p_action = 'resume' and v_row.status = 'paused')
    or (p_action = 'end' and v_row.status in ('active', 'paused'))
  ) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = format('A responsabilidade está em %s: %s não vale agora.', v_row.status, p_action);
  end if;

  update public.responsibilities
  set status = v_to,
      paused_at = case when v_to = 'paused' then now() end,
      ended_at = case when v_to = 'ended' then now() end,
      next_run_at = case when v_to = 'active' then app.responsibility_next_run_for(v_row.id, now()) end
  where id = v_row.id
  returning * into v_row;

  insert into public.responsibility_events (workspace_id, responsibility_id, actor_type, actor_id, action)
  values (
    v_row.workspace_id, v_row.id, 'user', v_user_id::text,
    case p_action when 'pause' then 'paused' when 'resume' then 'resumed' else 'ended' end
  );
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_row.workspace_id, 'user', v_user_id::text, 'responsibility.' || v_to::text, 'responsibility', v_row.id::text,
    jsonb_build_object('template', v_row.template)
  );
  return v_row;
end;
$$;

-- Interruptor "Ligado"/"Pausado": pausa todas as ativas ou retoma todas as pausadas de uma vez. Não alcança as com
-- falha ou bloqueio nem as encerradas (o protótipo reativava encerradas; decisão técnica: encerrada não volta).
-- Semântica do que "Pausado" interrompe além das execuções novas é pergunta ao dono (FLUXOS §11 item 4).
create function app.set_autonomy(p_workspace_id uuid, p_on boolean)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta muda o Modo Autônomo.';
  end if;
  with changed as (
    update public.responsibilities r
    set status = case when p_on then 'active' else 'paused' end::public.responsibility_status,
        paused_at = case when p_on then null else now() end,
        next_run_at = case when p_on then app.responsibility_next_run_for(r.id, now()) end
    where r.workspace_id = p_workspace_id and r.status = case when p_on then 'paused' else 'active' end::public.responsibility_status
    returning r.id
  )
  select count(*) into v_count from changed;
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, case when p_on then 'autonomy.resumed' else 'autonomy.paused' end,
    'workspace', p_workspace_id::text, jsonb_build_object('count', v_count)
  );
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Delegação pela conversa: proposta (o combinado) → ok do dono (approvals confirm) → responsabilidade
-- ---------------------------------------------------------------------------------------------------

-- O Nexo apresenta o combinado na conversa: trabalho 01.04 do Nexo (reaproveita o aberto da mesma conversa),
-- pendência confirm, mensagem do Nexo com o cartão responsibility_proposal e a proposta. Editor ou acima pede;
-- só o owner confirma (app.decide_approval). p_spec traz o que a API montou do catálogo: template, title,
-- lead_agent_id, collaborator_agent_ids, cadence, weekdays, month_day, run_time, options, actions, limits,
-- auto_publish, approval_required, required_connections; p_texts: work_title, message, card.
create function app.propose_responsibility(
  p_workspace_id uuid,
  p_conversation_id uuid,
  p_responsibility_id uuid,
  p_spec jsonb,
  p_agreement text,
  p_texts jsonb
)
returns public.responsibility_proposals
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.responsibility_template;
  v_existing public.responsibilities;
  v_item public.work_items;
  v_approval public.approvals;
  v_message_id uuid;
  v_proposal public.responsibility_proposals;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite delegar responsabilidades.';
  end if;
  v_template := (p_spec ->> 'template')::public.responsibility_template;
  if p_conversation_id is not null and not exists (
    select 1 from public.conversations c where c.id = p_conversation_id and c.workspace_id = p_workspace_id
  ) then
    raise exception using errcode = 'no_data_found', message = 'Conversa não encontrada.';
  end if;

  if p_responsibility_id is not null then
    select r.* into v_existing
    from public.responsibilities r
    where r.id = p_responsibility_id and r.workspace_id = p_workspace_id;
    if not found then
      raise exception using errcode = 'no_data_found', message = 'Responsabilidade não encontrada.';
    end if;
    if v_existing.status = 'ended' or v_existing.template <> v_template then
      raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta responsabilidade não aceita mudança no combinado.';
    end if;
  elsif exists (
    select 1 from public.responsibilities r
    where r.workspace_id = p_workspace_id and r.template = v_template and r.status <> 'ended'
  ) then
    raise exception using errcode = 'unique_violation', message = 'Já existe uma responsabilidade deste modelo.';
  end if;

  update public.responsibility_proposals p
  set status = 'discarded', decided_at = now()
  where p.workspace_id = p_workspace_id and p.status = 'pending'
    and p.conversation_id is not distinct from p_conversation_id;
  update public.approvals a
  set status = 'expired'
  from public.responsibility_proposals p
  where p.workspace_id = p_workspace_id and p.conversation_id is not distinct from p_conversation_id
    and a.id = p.approval_id and a.status = 'pending';

  select w.* into v_item
  from public.work_items w
  where w.workspace_id = p_workspace_id and w.delivery_type = '01.04' and w.status = 'needs_you'
    and w.conversation_id is not distinct from p_conversation_id and p_conversation_id is not null
  order by w.created_at desc
  limit 1
  for update;
  if not found then
    insert into public.work_items (
      workspace_id, conversation_id, title, briefing, delivery_type, status, primary_agent_id,
      idempotency_key, created_by
    ) values (
      p_workspace_id, p_conversation_id, p_texts ->> 'work_title',
      jsonb_build_object('template', v_template, 'responsibility_id', p_responsibility_id), '01.04', 'draft', 'nexo',
      'responsibility_proposal:' || gen_random_uuid(), v_user_id
    )
    returning * into v_item;
    perform app.transition_work_item(v_item.id, 'needs_you', 'agent', 'nexo', null, 'draft');
  end if;

  insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
  values (p_workspace_id, v_item.id, 'confirm', 'nexo')
  returning * into v_approval;

  if p_conversation_id is not null then
    insert into public.messages (
      workspace_id, conversation_id, author_type, author_agent_id, body, card, work_item_id, approval_id
    ) values (
      p_workspace_id, p_conversation_id, 'agent', 'nexo', p_texts ->> 'message', p_texts -> 'card', v_item.id,
      v_approval.id
    )
    returning id into v_message_id;
  end if;

  insert into public.responsibility_proposals (
    workspace_id, responsibility_id, template, spec, agreement, conversation_id, work_item_id, approval_id,
    message_id, created_by
  ) values (
    p_workspace_id, p_responsibility_id, v_template, p_spec, btrim(p_agreement), p_conversation_id, v_item.id,
    v_approval.id, v_message_id, v_user_id
  )
  returning * into v_proposal;
  return v_proposal;
end;
$$;

-- O dono confirmou (ou pediu ajuste) no cartão: confirmado, nasce a responsabilidade "Ativa" desde agora com a
-- primeira execução no ritmo (ou a existente muda o combinado, que vale a partir da próxima execução); o trabalho
-- 01.04 fecha. Ajuste ("Ajustar"): a proposta é descartada e o trabalho segue esperando o próximo combinado.
create function app.responsibility_proposal_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.responsibility_proposals;
  v_spec jsonb;
  v_row public.responsibilities;
  v_tz text;
begin
  select p.* into v_proposal
  from public.responsibility_proposals p
  where p.approval_id = new.id and p.status = 'pending'
  for update;
  if not found then
    return null;
  end if;
  if new.decision <> 'approved' then
    update public.responsibility_proposals set status = 'discarded', decided_at = now() where id = v_proposal.id;
    return null;
  end if;

  v_spec := v_proposal.spec;
  select w.timezone into v_tz from public.workspaces w where w.id = v_proposal.workspace_id;
  if v_proposal.responsibility_id is null then
    insert into public.responsibilities (
      workspace_id, template, title, lead_agent_id, collaborator_agent_ids, cadence, weekdays, month_day,
      run_time, options, agreement, actions, limits, auto_publish, approval_required, required_connections,
      status, since, conversation_id, created_by
    ) values (
      v_proposal.workspace_id, v_proposal.template, v_spec ->> 'title', (v_spec ->> 'lead_agent_id')::public.agent_id,
      coalesce(array(select jsonb_array_elements_text(v_spec -> 'collaborator_agent_ids'))::public.agent_id[], '{}'),
      (v_spec ->> 'cadence')::public.responsibility_cadence,
      coalesce(array(select jsonb_array_elements_text(v_spec -> 'weekdays'))::smallint[], '{}'),
      (v_spec ->> 'month_day')::smallint, coalesce((v_spec ->> 'run_time')::time, '09:00'),
      coalesce(v_spec -> 'options', '{}'::jsonb), v_proposal.agreement, coalesce(v_spec -> 'actions', '[]'::jsonb),
      coalesce(v_spec -> 'limits', '{}'::jsonb), coalesce((v_spec ->> 'auto_publish')::boolean, false),
      coalesce((v_spec ->> 'approval_required')::boolean, true),
      coalesce(array(select jsonb_array_elements_text(v_spec -> 'required_connections')), '{}'),
      'active', now(), v_proposal.conversation_id, new.decided_by
    )
    returning * into v_row;
    update public.responsibilities
    set next_run_at = app.responsibility_next_run(cadence, weekdays, month_day, run_time, v_tz, now())
    where id = v_row.id
    returning * into v_row;
    insert into public.responsibility_events (workspace_id, responsibility_id, actor_type, actor_id, action, params)
    values (v_row.workspace_id, v_row.id, 'user', new.decided_by::text, 'delegated', jsonb_build_object('template', v_row.template));
  else
    update public.responsibilities r
    set options = coalesce(v_spec -> 'options', r.options), agreement = v_proposal.agreement,
        cadence = (v_spec ->> 'cadence')::public.responsibility_cadence,
        weekdays = coalesce(array(select jsonb_array_elements_text(v_spec -> 'weekdays'))::smallint[], '{}'),
        month_day = (v_spec ->> 'month_day')::smallint,
        run_time = coalesce((v_spec ->> 'run_time')::time, r.run_time),
        actions = coalesce(v_spec -> 'actions', r.actions), limits = coalesce(v_spec -> 'limits', r.limits),
        auto_publish = coalesce((v_spec ->> 'auto_publish')::boolean, r.auto_publish)
    where r.id = v_proposal.responsibility_id
    returning * into v_row;
    if v_row.status = 'active' then
      update public.responsibilities
      set next_run_at = app.responsibility_next_run(cadence, weekdays, month_day, run_time, v_tz, now())
      where id = v_row.id
      returning * into v_row;
    end if;
    insert into public.responsibility_events (workspace_id, responsibility_id, actor_type, actor_id, action, params)
    values (
      v_row.workspace_id, v_row.id, 'user', new.decided_by::text, 'changed',
      jsonb_build_object('options', v_row.options, 'cadence', v_row.cadence)
    );
  end if;

  update public.responsibility_proposals
  set status = 'confirmed', decided_at = now(), responsibility_id = v_row.id
  where id = v_proposal.id;
  if exists (select 1 from public.work_items w where w.id = v_proposal.work_item_id and w.status = 'needs_you')
     and not exists (
       select 1 from public.approvals a where a.work_item_id = v_proposal.work_item_id and a.status = 'pending'
     ) then
    perform app.transition_work_item(v_proposal.work_item_id, 'approved', 'user', new.decided_by::text, null, 'needs_you');
    perform app.transition_work_item(v_proposal.work_item_id, 'done', 'system', null, null, 'approved');
  end if;
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_row.workspace_id, 'user', new.decided_by::text,
    case when v_proposal.responsibility_id is null then 'responsibility.delegated' else 'responsibility.changed' end,
    'responsibility', v_row.id::text, jsonb_build_object('template', v_row.template, 'proposal_id', v_proposal.id)
  );
  return null;
end;
$$;

create trigger responsibility_proposal_decided
  after update of status on public.approvals
  for each row
  when (old.status = 'pending' and new.status = 'decided' and new.kind = 'confirm')
  execute function app.responsibility_proposal_decided();

-- ---------------------------------------------------------------------------------------------------
-- A execução segue o trabalho do runtime
-- ---------------------------------------------------------------------------------------------------

-- O que a execução usou da Memória: os fatos que o runtime pôs no contexto dos runs do trabalho.
create function app.responsibility_run_memory(p_work_item_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('fact_id', f.id, 'key', f.key, 'state', f.state) order by f.key), '[]'::jsonb)
  from public.brand_facts f
  where f.id in (
    select c.fact_id
    from public.run_context_items c
    join public.runs r on r.id = c.run_id
    where r.work_item_id = p_work_item_id and c.kind = 'fact' and c.fact_id is not null
  )
$$;

-- Trabalho de rotina mudou de estado: a execução acompanha. Entrega para aprovar → "Aguarda sua aprovação" (ou
-- "Concluída", quando o modelo não pede aprovação, como a leitura da Íris); pergunta → aguarda você; falha → nova
-- tentativa em 30 min ou, na última, "Falhou"; cancelado pelo dono → "Não executada"; só a etapa de imagem
-- esperando o motor sem nada para aprovar → "Não executada" (nada gerado nem cobrado).
create function app.responsibility_run_follow_work()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.responsibility_runs;
  v_required boolean;
  v_pending public.approvals;
begin
  select rr.* into v_run
  from public.responsibility_runs rr
  where rr.work_item_id = new.id and rr.status in ('running', 'awaiting_approval')
  for update;
  if not found then
    return null;
  end if;
  select r.approval_required into v_required from public.responsibilities r where r.id = v_run.responsibility_id;

  if new.status = 'needs_you' then
    select a.* into v_pending
    from public.approvals a
    where a.work_item_id = new.id and a.status = 'pending'
    order by a.created_at desc
    limit 1;
    if v_pending.kind in ('review', 'approve') and not v_required then
      update public.responsibility_runs
      set status = 'done', finished_at = now(), message_key = 'delivered',
          memory_used = app.responsibility_run_memory(new.id)
      where id = v_run.id;
    else
      update public.responsibility_runs
      set status = 'awaiting_approval',
          message_key = case when v_pending.kind in ('review', 'approve') then 'awaiting_approval' else 'awaiting_answer' end,
          memory_used = app.responsibility_run_memory(new.id)
      where id = v_run.id;
    end if;
  elsif new.status = 'in_progress' and v_run.status = 'awaiting_approval' then
    update public.responsibility_runs set status = 'running', message_key = null where id = v_run.id;
  elsif new.status = 'failed' then
    if v_run.attempts < v_run.max_attempts then
      update public.responsibility_runs
      set status = 'scheduled', retry_at = now() + interval '30 minutes', message_key = 'retrying',
          message_params = jsonb_build_object('reason', 'runtime_failed')
      where id = v_run.id;
    else
      update public.responsibility_runs
      set status = 'failed', finished_at = now(), message_key = 'failed_attempts',
          message_params = jsonb_build_object('reason', 'runtime_failed', 'attempt_times', to_jsonb(v_run.attempt_times))
      where id = v_run.id;
    end if;
  elsif new.status = 'cancelled' then
    update public.responsibility_runs
    set status = 'skipped', finished_at = now(), message_key = 'cancelled'
    where id = v_run.id;
  elsif new.status = 'blocked' and v_run.status = 'running' then
    update public.responsibility_runs
    set status = 'skipped', finished_at = now(), message_key = 'waiting_engine'
    where id = v_run.id;
  elsif new.status in ('approved', 'done') then
    update public.responsibility_runs
    set status = 'done', finished_at = now(), message_key = coalesce(message_key, 'delivered'),
        memory_used = app.responsibility_run_memory(new.id)
    where id = v_run.id;
  end if;
  return null;
end;
$$;

create trigger responsibility_run_follow_work
  after update of status on public.work_items
  for each row
  when (new.origin_type = 'routine_run' and old.status is distinct from new.status)
  execute function app.responsibility_run_follow_work();

-- O dono aprovou o que saiu da execução: "Aprovada por você".
create function app.responsibility_run_follow_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.responsibility_runs rr
  set status = 'approved', approved_by = new.decided_by, approved_at = coalesce(new.decided_at, now()),
      finished_at = coalesce(new.decided_at, now()), message_key = 'approved',
      message_params = jsonb_build_object('at', coalesce(new.decided_at, now()))
  where rr.work_item_id = new.work_item_id and rr.status = 'awaiting_approval';
  return null;
end;
$$;

create trigger responsibility_run_follow_approval
  after update of status on public.approvals
  for each row
  when (
    old.status = 'pending' and new.status = 'decided' and new.kind in ('review', 'approve')
    and new.decision = 'approved'
  )
  execute function app.responsibility_run_follow_approval();

-- ---------------------------------------------------------------------------------------------------
-- Realtime: responsibility.<estado> e responsibility_run.<estado>
-- ---------------------------------------------------------------------------------------------------

create function app.responsibilities_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.next_run_at is not distinct from old.next_run_at and new.agreement is not distinct from old.agreement then
    return null;
  end if;
  perform app.broadcast_to_workspace(
    new.workspace_id,
    case
      when tg_op = 'INSERT' then 'responsibility.created'
      when new.status is distinct from old.status then 'responsibility.' || new.status::text
      else 'responsibility.updated'
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'id', new.id, 'template', new.template, 'status', new.status, 'next_run_at', new.next_run_at,
      'blocked_by_connection', new.blocked_by_connection
    ))
  );
  return null;
end;
$$;

create trigger responsibilities_broadcast
  after insert or update on public.responsibilities
  for each row execute function app.responsibilities_broadcast();

create function app.responsibility_runs_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  perform app.broadcast_to_workspace(
    new.workspace_id,
    case when tg_op = 'INSERT' then 'responsibility_run.created' else 'responsibility_run.' || new.status::text end,
    jsonb_strip_nulls(jsonb_build_object(
      'id', new.id, 'responsibility_id', new.responsibility_id, 'code', new.code, 'status', new.status,
      'work_item_id', new.work_item_id, 'scheduled_for', new.scheduled_for
    ))
  );
  return null;
end;
$$;

create trigger responsibility_runs_broadcast
  after insert or update of status on public.responsibility_runs
  for each row execute function app.responsibility_runs_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- Cartão do Nexo com o combinado
-- ---------------------------------------------------------------------------------------------------

alter table public.messages
  drop constraint messages_card_shape,
  add constraint messages_card_shape check (
    card is null or (
      jsonb_typeof(card) = 'object'
      and card ->> 'type' in (
        'work_created', 'material', 'approval', 'question', 'options', 'team', 'budget', 'responsibility_proposal'
      )
      and jsonb_typeof(coalesce(card -> 'actions', '[]'::jsonb)) = 'array'
    )
  ),
  drop constraint messages_card_linked,
  add constraint messages_card_linked check (
    card is null
    or case card ->> 'type'
      when 'material' then delivery_version_id is not null and work_item_id is not null
      when 'approval' then approval_id is not null
      when 'question' then approval_id is not null
      when 'options' then approval_id is not null and jsonb_typeof(card -> 'options') = 'array'
      when 'responsibility_proposal' then approval_id is not null and work_item_id is not null
      else work_item_id is not null
    end
  );

-- ---------------------------------------------------------------------------------------------------
-- RLS e permissões: membro lê; ninguém escreve direto (só as funções app.* e o scheduler privilegiado)
-- ---------------------------------------------------------------------------------------------------

alter table public.responsibilities enable row level security;
alter table public.responsibilities force row level security;
alter table public.responsibility_proposals enable row level security;
alter table public.responsibility_proposals force row level security;
alter table public.responsibility_runs enable row level security;
alter table public.responsibility_runs force row level security;
alter table public.responsibility_events enable row level security;
alter table public.responsibility_events force row level security;

revoke all on table public.responsibilities, public.responsibility_proposals, public.responsibility_runs,
  public.responsibility_events from public, anon, authenticated, service_role;
grant select on table public.responsibilities, public.responsibility_proposals, public.responsibility_runs,
  public.responsibility_events to authenticated;

create policy responsibilities_select_member on public.responsibilities for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));
create policy responsibility_proposals_select_member on public.responsibility_proposals for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));
create policy responsibility_runs_select_member on public.responsibility_runs for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));
create policy responsibility_events_select_member on public.responsibility_events for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

revoke all on function
  app.responsibility_runs_guard(),
  app.responsibility_events_guard(),
  app.responsibility_next_run(public.responsibility_cadence, smallint[], smallint, time, text, timestamptz),
  app.responsibility_next_run_for(uuid, timestamptz),
  app.responsibility_connection_state(uuid, text),
  app.block_responsibilities_for_connection(uuid, text, text),
  app.unblock_responsibilities_for_connection(uuid, text, timestamptz),
  app.set_responsibility_state(uuid, text),
  app.set_autonomy(uuid, boolean),
  app.propose_responsibility(uuid, uuid, uuid, jsonb, text, jsonb),
  app.responsibility_proposal_decided(),
  app.responsibility_run_memory(uuid),
  app.responsibility_run_follow_work(),
  app.responsibility_run_follow_approval(),
  app.responsibilities_broadcast(),
  app.responsibility_runs_broadcast()
from public, anon, authenticated, service_role;

grant execute on function
  app.set_responsibility_state(uuid, text),
  app.set_autonomy(uuid, boolean),
  app.propose_responsibility(uuid, uuid, uuid, jsonb, text, jsonb),
  app.responsibility_next_run(public.responsibility_cadence, smallint[], smallint, time, text, timestamptz)
to authenticated;
