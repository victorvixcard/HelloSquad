-- S1g — trabalho rico (FLUXOS_DA_V46.md §2.1, §2.3, §3.1, §5, §10.2 e §10.3).
-- 1. Trabalho: prazo (`due_at`), próximo passo (`next_step`), frase viva (`status_label`) e origem tipada
--    (`origin_type` + `origin_ref`: mensagem, "<Agente> percebeu", execução de rotina, projeto). A frase e o
--    próximo passo são do agente que está trabalhando; quando o trabalho muda de estado sem o agente reescrever,
--    eles voltam a nulo e a API mostra a frase do estado (catálogo do backend, no idioma do workspace).
-- 2. Histórico legível (`work_item_history`): quem (pessoa, agente ou sistema), o quê (`kind` + `params`, texto
--    montado pela API pelo catálogo), quando e a marca do protótipo ("automático" ou "aprovado por você").
--    Alimentado por triggers no pedido, na entrega e na decisão: vale para a API, o worker e o seed.
-- 3. Pendências: `decide` ("Para você decidir") só aceita `answered` e devolve o trabalho ao agente, como
--    responder; "Agora não" (`app.defer_approval`) adia a autorização sem decidir nem rejeitar
--    (`deferred_at`/`deferred_until`); "Decidir agora" (`app.resume_approval`) volta a pedir. Nada disso mexe em
--    run ou em crédito.
-- 4. Projeto: datas (`starts_at`, `ends_at`), marcos (`project_milestones`, com "decisão sua" e "previsto") e
--    participantes (`project_participants`, os especialistas com a responsabilidade de cada um). Escrita por
--    funções app.* para editor ou acima (papéis da S0); leitura para todo membro.
-- 5. Pedido feito na conversa de um projeto entra no projeto (marco "novo trabalho" e o especialista na equipe,
--    L12076); feito na conversa de um "<Agente> percebeu", nasce com a origem nele.

-- ---------------------------------------------------------------------------------------------------
-- 1. Trabalho
-- ---------------------------------------------------------------------------------------------------

create type public.work_item_origin_type as enum ('message', 'insight', 'routine_run', 'project');

alter table public.work_items
  add column due_at timestamptz,
  add column next_step text,
  add column status_label text,
  add column origin_type public.work_item_origin_type,
  add column origin_ref text,
  add constraint work_items_next_step_length check (char_length(btrim(next_step)) between 1 and 300),
  add constraint work_items_status_label_length check (char_length(btrim(status_label)) between 1 and 300),
  add constraint work_items_origin_pair check ((origin_type is null) = (origin_ref is null)),
  add constraint work_items_origin_ref_format check (
    origin_type is null
    or (origin_type in ('message', 'insight', 'project')
        and origin_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or (origin_type = 'routine_run' and origin_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$')
  );
comment on column public.work_items.due_at is 'Prazo do trabalho ("Aprovar a v2 até sex, 16/10"). A pessoa não muda prazo (FLUXOS §11 item 3).';
comment on column public.work_items.next_step is 'Próximo passo escrito pelo agente ("Kaia entrega a v2"). Nulo: a API mostra o do estado.';
comment on column public.work_items.status_label is 'Frase viva do agente ("Otto incluindo um bastidor no plano"). Volta a nulo quando o estado muda sem o agente reescrever.';
comment on column public.work_items.origin_type is 'De onde o trabalho nasceu: message (pedido na conversa), insight ("<Agente> percebeu"), routine_run (execução do Modo Autônomo), project.';
comment on column public.work_items.origin_ref is 'Id da mensagem, da sugestão (memory_suggestions) ou do projeto; código da execução da rotina (ex.: PL-43).';

create function app.work_items_default_origin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin_type is null and new.origin_message_id is not null then
    new.origin_type := 'message';
    new.origin_ref := new.origin_message_id::text;
  elsif new.origin_type is null and new.project_id is not null then
    new.origin_type := 'project';
    new.origin_ref := new.project_id::text;
  end if;
  return new;
end;
$$;

create trigger work_items_default_origin
  before insert on public.work_items
  for each row execute function app.work_items_default_origin();

-- A frase e o próximo passo pertencem ao estado em que o agente os escreveu.
create function app.work_items_reset_live_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status_label is not distinct from old.status_label then
      new.status_label := null;
    end if;
    if new.next_step is not distinct from old.next_step then
      new.next_step := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger work_items_reset_live_fields
  before update of status on public.work_items
  for each row execute function app.work_items_reset_live_fields();

update public.work_items
set origin_type = 'message', origin_ref = origin_message_id::text
where origin_type is null and origin_message_id is not null;

update public.work_items
set origin_type = 'project', origin_ref = project_id::text
where origin_type is null and project_id is not null;

-- ---------------------------------------------------------------------------------------------------
-- 2. Histórico legível
-- ---------------------------------------------------------------------------------------------------

create table public.work_item_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid not null,
  actor_type public.message_author_type not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_agent_id public.agent_id,
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  mark text,
  approval_id uuid,
  delivery_version_id uuid,
  created_at timestamptz not null default now(),
  constraint work_item_history_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint work_item_history_approval_fk foreign key (workspace_id, approval_id)
    references public.approvals (workspace_id, id) on delete set null (approval_id),
  constraint work_item_history_delivery_version_fk foreign key (workspace_id, delivery_version_id)
    references public.delivery_versions (workspace_id, id) on delete set null (delivery_version_id),
  constraint work_item_history_actor check (
    (actor_type = 'user' and actor_agent_id is null)
    or (actor_type = 'agent' and actor_agent_id is not null and actor_user_id is null)
    or (actor_type = 'system' and actor_agent_id is null and actor_user_id is null)
  ),
  constraint work_item_history_kind check (kind in ('requested', 'delivered', 'decided')),
  constraint work_item_history_params_object check (jsonb_typeof(params) = 'object'),
  constraint work_item_history_mark check (mark in ('automatic', 'approved_by_you'))
);
comment on table public.work_item_history is 'Histórico do trabalho (agente ou você, texto, quando, marca "automático" ou "aprovado por você"). Só triggers e o papel privilegiado escrevem; o texto sai do catálogo pela API.';
create index work_item_history_work_item_idx on public.work_item_history (work_item_id, created_at, id);
create index work_item_history_approval_idx on public.work_item_history (approval_id) where approval_id is not null;
create index work_item_history_delivery_version_idx on public.work_item_history (delivery_version_id)
  where delivery_version_id is not null;
create index work_item_history_actor_user_idx on public.work_item_history (actor_user_id) where actor_user_id is not null;

create function app.work_items_history_requested()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.work_item_history (workspace_id, work_item_id, actor_type, actor_user_id, kind, created_at)
  values (
    new.workspace_id, new.id,
    (case when new.created_by is null then 'system' else 'user' end)::public.message_author_type,
    new.created_by, 'requested', new.created_at
  );
  return null;
end;
$$;

create trigger work_items_history_requested
  after insert on public.work_items
  for each row execute function app.work_items_history_requested();

create function app.delivery_versions_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.work_item_history (
    workspace_id, work_item_id, actor_type, actor_user_id, actor_agent_id, kind, params, mark,
    delivery_version_id, created_at
  )
  select new.workspace_id, d.work_item_id, new.created_by_type::text::public.message_author_type,
         case when new.created_by_type = 'user' then new.created_by_user_id end,
         case when new.created_by_type = 'agent' then new.created_by_agent_id end,
         'delivered', jsonb_build_object('version_no', new.version_no),
         case when new.created_by_type = 'agent' then 'automatic' end,
         new.id, new.created_at
  from public.deliveries d
  where d.id = new.delivery_id and d.workspace_id = new.workspace_id;
  return null;
end;
$$;

create trigger delivery_versions_history
  after insert on public.delivery_versions
  for each row execute function app.delivery_versions_history();

create function app.approvals_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'decided' and old.status is distinct from 'decided' then
    insert into public.work_item_history (
      workspace_id, work_item_id, actor_type, actor_user_id, kind, params, mark, approval_id,
      delivery_version_id, created_at
    )
    select new.workspace_id, new.work_item_id,
           (case when new.decided_by is null then 'system' else 'user' end)::public.message_author_type,
           new.decided_by, 'decided',
           jsonb_strip_nulls(jsonb_build_object(
             'approval_kind', new.kind, 'decision', new.decision, 'follow_up', new.follow_up,
             'note', new.note, 'version_no', v.version_no, 'due_at', new.due_at
           )),
           case when new.decision = 'approved' and new.decided_by is not null then 'approved_by_you' end,
           new.id, new.delivery_version_id, coalesce(new.decided_at, now())
    from (select 1) one
    left join public.delivery_versions v
      on v.id = new.delivery_version_id and v.workspace_id = new.workspace_id;
  end if;
  return null;
end;
$$;

create trigger approvals_history
  after update of status on public.approvals
  for each row execute function app.approvals_history();

-- ---------------------------------------------------------------------------------------------------
-- 3. Pendências: "Para você decidir" e "Agora não"
-- ---------------------------------------------------------------------------------------------------

alter table public.approvals
  add column deferred_at timestamptz,
  add column deferred_until timestamptz,
  add column deferred_by uuid references auth.users (id) on delete set null,
  add constraint approvals_deferred_kind check (deferred_at is null or kind = 'authorize'),
  add constraint approvals_deferred_until_pair check (deferred_until is null or deferred_at is not null),
  drop constraint approvals_decision_matches_kind,
  add constraint approvals_decision_matches_kind check (
    decision is null
    or (kind in ('review', 'approve') and decision in ('approved', 'changes_requested', 'rejected'))
    or (kind in ('authorize', 'confirm', 'reconnect') and decision in ('approved', 'rejected'))
    or (kind in ('respond', 'decide') and decision = 'answered')
  );
comment on column public.approvals.deferred_at is '"Agora não": a autorização foi adiada sem decidir nem rejeitar. Sai de "Precisa de você" até a pessoa voltar a decidir.';
comment on column public.approvals.deferred_until is 'Até quando fica adiada; nulo = até a pessoa escolher "Decidir agora".';
create index approvals_deferred_by_idx on public.approvals (deferred_by) where deferred_by is not null;

-- Adiada agora: pendente, com "Agora não" e sem data vencida.
create function app.approval_is_deferred(p_approval public.approvals)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_approval.status = 'pending' and p_approval.deferred_at is not null
     and (p_approval.deferred_until is null or p_approval.deferred_until > now())
$$;

drop function app.decide_approval(uuid, public.approval_decision, text, text);

-- Igual à S1c, mais `decide` (answered devolve ao agente, como responder). Decidir uma autorização adiada
-- vale: a decisão encerra o adiamento.
create function app.decide_approval(
  p_approval_id uuid,
  p_decision public.approval_decision,
  p_note text default null,
  p_follow_up text default null
)
returns public.approvals
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_approval public.approvals;
  v_delivery_id uuid;
  v_item public.work_items;
  v_to public.work_item_status;
  v_run public.runs;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select a.* into v_approval
  from public.approvals a
  where a.id = p_approval_id
    and a.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Aprovação não encontrada.';
  end if;

  if not app.has_role(v_approval.workspace_id, app.approval_min_role(v_approval.kind)) then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;

  if not (
    (v_approval.kind in ('review', 'approve') and p_decision in ('approved', 'changes_requested', 'rejected'))
    or (v_approval.kind in ('authorize', 'confirm', 'reconnect') and p_decision in ('approved', 'rejected'))
    or (v_approval.kind in ('respond', 'decide') and p_decision = 'answered')
  ) then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = format('A decisão %s não vale para uma aprovação do tipo %s.', p_decision, v_approval.kind);
  end if;
  if char_length(p_note) > 2000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A observação passou de 2.000 caracteres.';
  end if;
  if p_follow_up is not null and p_follow_up not in ('cancel', 'revise') then
    raise exception using errcode = 'invalid_parameter_value', message = 'A saída da rejeição é cancelar ou pedir nova proposta.';
  end if;
  if p_decision = 'rejected' and v_approval.kind in ('review', 'approve') and p_follow_up is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Ao rejeitar, escolha cancelar o trabalho ou pedir nova proposta.';
  end if;
  if p_follow_up is not null and not (p_decision = 'rejected' and v_approval.kind in ('review', 'approve')) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Cancelar ou pedir nova proposta só vale ao rejeitar uma entrega.';
  end if;

  update public.approvals
  set status = 'decided', decision = p_decision, decided_by = v_user_id, decided_at = now(),
      note = nullif(btrim(p_note), ''), follow_up = p_follow_up
  where id = v_approval.id and status = 'pending'
  returning * into v_approval;

  if not found then
    select a.* into v_approval from public.approvals a where a.id = p_approval_id;
    return v_approval;
  end if;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_approval.workspace_id, 'user', v_user_id::text, 'approval.decided', 'approval', v_approval.id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', v_approval.kind, 'decision', v_approval.decision, 'follow_up', v_approval.follow_up,
      'work_item_id', v_approval.work_item_id, 'delivery_version_id', v_approval.delivery_version_id
    ))
  );

  if v_approval.decision = 'approved' and v_approval.kind in ('review', 'approve')
     and v_approval.delivery_version_id is not null then
    select v.delivery_id into v_delivery_id
    from public.delivery_versions v
    where v.id = v_approval.delivery_version_id
    for update;

    update public.delivery_versions
    set status = 'superseded'
    where delivery_id = v_delivery_id and status = 'approved' and id <> v_approval.delivery_version_id;

    update public.delivery_versions set status = 'approved' where id = v_approval.delivery_version_id;
    update public.deliveries set current_version_id = v_approval.delivery_version_id where id = v_delivery_id;
  end if;

  v_to := case
    when v_approval.kind in ('review', 'approve') and v_approval.decision = 'approved' then 'approved'
    when v_approval.kind in ('review', 'approve') and v_approval.decision = 'changes_requested' then 'in_progress'
    when v_approval.kind in ('review', 'approve') and v_approval.follow_up = 'revise' then 'in_progress'
    when v_approval.kind in ('review', 'approve') and v_approval.follow_up = 'cancel' then 'cancelled'
    when v_approval.kind in ('respond', 'decide') and v_approval.decision = 'answered' then 'in_progress'
  end::public.work_item_status;

  select w.* into v_item from public.work_items w where w.id = v_approval.work_item_id for update;

  if v_to is not null
     and v_item.status = 'needs_you'
     and not exists (
       select 1 from public.approvals a
       where a.work_item_id = v_approval.work_item_id and a.status = 'pending'
     ) then
    perform app.transition_work_item(
      v_approval.work_item_id, v_to, 'user', v_user_id::text, v_approval.note, 'needs_you'
    );

    if v_to = 'in_progress' then
      insert into public.runs (workspace_id, work_item_id, conversation_id, agent_id, kind, status, idempotency_key)
      values (
        v_item.workspace_id, v_item.id, v_item.conversation_id, v_item.primary_agent_id, 'interactive', 'queued',
        'approval:' || v_approval.id
      )
      on conflict (workspace_id, idempotency_key) do nothing
      returning * into v_run;

      if v_run.id is not null then
        perform app.enqueue_run(v_run.id);
      end if;
    end if;
  end if;

  return v_approval;
end;
$$;

-- "Agora não": só o owner (é uma decisão sobre autorizar), só autorização pendente. Repetir devolve o mesmo
-- estado. A pendência continua pendente (sem decisão, sem rejeição), o trabalho não muda de estado, nenhum
-- run nasce e nada é cobrado nem liberado.
create function app.defer_approval(p_approval_id uuid, p_until timestamptz default null)
returns public.approvals
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_approval public.approvals;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select a.* into v_approval
  from public.approvals a
  where a.id = p_approval_id
    and a.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Aprovação não encontrada.';
  end if;

  if not app.has_role(v_approval.workspace_id, app.approval_min_role(v_approval.kind)) then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if v_approval.kind <> 'authorize' then
    raise exception using errcode = 'invalid_parameter_value', message = '“Agora não” vale só para autorizações.';
  end if;
  if p_until is not null and p_until <= now() then
    raise exception using errcode = 'invalid_parameter_value', message = 'A data para decidir de novo precisa estar no futuro.';
  end if;
  if v_approval.status <> 'pending' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta decisão já foi tomada.';
  end if;
  if app.approval_is_deferred(v_approval) and v_approval.deferred_until is not distinct from p_until then
    return v_approval;
  end if;

  update public.approvals
  set deferred_at = now(), deferred_until = p_until, deferred_by = v_user_id
  where id = v_approval.id and status = 'pending'
  returning * into v_approval;

  if not found then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta decisão já foi tomada.';
  end if;

  update public.work_items
  set status_label = null, next_step = null
  where id = v_approval.work_item_id and workspace_id = v_approval.workspace_id;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_approval.workspace_id, 'user', v_user_id::text, 'approval.deferred', 'approval', v_approval.id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', v_approval.kind, 'work_item_id', v_approval.work_item_id, 'deferred_until', v_approval.deferred_until
    ))
  );

  return v_approval;
end;
$$;

-- "Decidir agora": a autorização volta a pedir a decisão. Repetir (ou chamar sem adiamento) devolve o estado.
create function app.resume_approval(p_approval_id uuid)
returns public.approvals
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_approval public.approvals;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select a.* into v_approval
  from public.approvals a
  where a.id = p_approval_id
    and a.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Aprovação não encontrada.';
  end if;

  if not app.has_role(v_approval.workspace_id, app.approval_min_role(v_approval.kind)) then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if v_approval.status <> 'pending' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta decisão já foi tomada.';
  end if;
  if v_approval.deferred_at is null then
    return v_approval;
  end if;

  update public.approvals
  set deferred_at = null, deferred_until = null, deferred_by = null
  where id = v_approval.id and status = 'pending'
  returning * into v_approval;

  if not found then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta decisão já foi tomada.';
  end if;

  update public.work_items
  set status_label = null, next_step = null
  where id = v_approval.work_item_id and workspace_id = v_approval.workspace_id;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_approval.workspace_id, 'user', v_user_id::text, 'approval.resumed', 'approval', v_approval.id::text,
    jsonb_build_object('kind', v_approval.kind, 'work_item_id', v_approval.work_item_id)
  );

  return v_approval;
end;
$$;

-- Realtime: adiar e voltar a pedir também avisam o canal do workspace. `approval.deferred` leva
-- `status: deferred` (a faixa do web tira tudo o que não é `pending`); `approval.resumed` leva `pending`.
create or replace function app.approvals_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
  v_status text;
begin
  if tg_op = 'INSERT' then
    v_event := 'approval.created';
    v_status := new.status::text;
  elsif new.status is distinct from old.status then
    v_event := 'approval.' || new.status::text;
    v_status := new.status::text;
  elsif new.status = 'pending' and new.deferred_at is distinct from old.deferred_at then
    v_event := case when new.deferred_at is null then 'approval.resumed' else 'approval.deferred' end;
    v_status := case when new.deferred_at is null then 'pending' else 'deferred' end;
  else
    return null;
  end if;

  perform app.broadcast_to_workspace(
    new.workspace_id,
    v_event,
    jsonb_strip_nulls(jsonb_build_object(
      'id', new.id, 'work_item_id', new.work_item_id, 'delivery_version_id', new.delivery_version_id,
      'kind', new.kind, 'status', v_status, 'decision', new.decision,
      'requested_by_agent_id', new.requested_by_agent_id, 'decided_at', new.decided_at, 'due_at', new.due_at,
      'deferred_until', new.deferred_until
    ))
  );
  return null;
end;
$$;

drop trigger approvals_broadcast on public.approvals;
create trigger approvals_broadcast
  after insert or update of status, deferred_at on public.approvals
  for each row execute function app.approvals_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- 4. Projeto: datas, marcos e participantes
-- ---------------------------------------------------------------------------------------------------

alter table public.projects
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add constraint projects_dates_order check (starts_at is null or ends_at is null or ends_at >= starts_at);
comment on column public.projects.ends_at is 'Prazo do projeto ("20/12"); nulo = sem prazo.';

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null,
  title text not null,
  summary text,
  agent_id public.agent_id,
  kind text not null default 'milestone',
  due_at timestamptz,
  needs_you boolean not null default false,
  planned boolean not null default false,
  done_at timestamptz,
  work_item_id uuid,
  approval_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_milestones_workspace_id_id_key unique (workspace_id, id),
  constraint project_milestones_project_fk foreign key (workspace_id, project_id)
    references public.projects (workspace_id, id) on delete cascade,
  constraint project_milestones_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete set null (work_item_id),
  constraint project_milestones_approval_fk foreign key (workspace_id, approval_id)
    references public.approvals (workspace_id, id) on delete set null (approval_id),
  constraint project_milestones_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint project_milestones_summary_length check (char_length(summary) <= 300),
  constraint project_milestones_kind check (kind in ('milestone', 'goal'))
);
comment on table public.project_milestones is 'Marcos do roadmap: "decisão sua" (needs_you), "previsto" (planned), meta (kind goal), concluído (done_at). "Em seguida" = marco seu que ainda não tem pendência.';
create index project_milestones_project_due_idx on public.project_milestones (project_id, due_at);
create index project_milestones_upcoming_idx on public.project_milestones (workspace_id, due_at) where done_at is null;
create index project_milestones_work_item_idx on public.project_milestones (work_item_id) where work_item_id is not null;
create index project_milestones_approval_idx on public.project_milestones (approval_id) where approval_id is not null;
create index project_milestones_created_by_idx on public.project_milestones (created_by) where created_by is not null;
create trigger project_milestones_set_updated_at
  before update on public.project_milestones
  for each row execute function app.set_updated_at();

create table public.project_participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null,
  agent_id public.agent_id not null,
  responsibility text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_participants_project_fk foreign key (workspace_id, project_id)
    references public.projects (workspace_id, id) on delete cascade,
  constraint project_participants_agent_key unique (project_id, agent_id),
  constraint project_participants_responsibility_length check (char_length(btrim(responsibility)) between 1 and 120)
);
comment on table public.project_participants is 'Quem participa do projeto: os especialistas, com a responsabilidade de cada um ("estratégia e conceito").';
create trigger project_participants_set_updated_at
  before update on public.project_participants
  for each row execute function app.set_updated_at();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['work_item_history', 'project_milestones', 'project_participants']
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

-- Lista de participantes: [{"agent_id": "bia", "responsibility": "estratégia e conceito"}, …].
create function app.project_participants_from_json(p_participants jsonb)
returns table (agent_id public.agent_id, responsibility text)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_participants is null then
    return;
  end if;
  if jsonb_typeof(p_participants) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Os participantes precisam ser uma lista.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_participants) e
    where jsonb_typeof(e) <> 'object' or (e - array['agent_id', 'responsibility']) <> '{}'::jsonb
  ) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Cada participante tem agent_id e, se quiser, responsibility.';
  end if;
  return query
    select (e ->> 'agent_id')::public.agent_id, nullif(btrim(e ->> 'responsibility'), '')
    from jsonb_array_elements(p_participants) e;
end;
$$;

create function app.create_project(
  p_workspace_id uuid,
  p_name text,
  p_objective text default null,
  p_owner_agent_id public.agent_id default 'nexo',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_participants jsonb default null
)
returns public.projects
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite criar projetos.';
  end if;

  insert into public.projects (workspace_id, name, objective, owner_agent_id, starts_at, ends_at, created_by)
  values (
    p_workspace_id, btrim(coalesce(p_name, '')), nullif(btrim(p_objective), ''), coalesce(p_owner_agent_id, 'nexo'),
    p_starts_at, p_ends_at, v_user_id
  )
  returning * into v_project;

  insert into public.project_participants (workspace_id, project_id, agent_id, responsibility)
  select v_project.workspace_id, v_project.id, p.agent_id, p.responsibility
  from app.project_participants_from_json(p_participants) p;

  insert into public.project_participants (workspace_id, project_id, agent_id)
  values (v_project.workspace_id, v_project.id, v_project.owner_agent_id)
  on conflict (project_id, agent_id) do nothing;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_project.workspace_id, 'user', v_user_id::text, 'project.created', 'project', v_project.id::text,
    jsonb_build_object('owner_agent_id', v_project.owner_agent_id)
  );

  return v_project;
end;
$$;

-- Patch: só as chaves presentes mudam (name, objective, status, owner_agent_id, starts_at, ends_at);
-- `null` em objective, starts_at e ends_at apaga o valor.
create function app.update_project(p_project_id uuid, p_patch jsonb)
returns public.projects
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select p.* into v_project
  from public.projects p
  where p.id = p_project_id and p.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Projeto não encontrado.';
  end if;
  if not app.has_role(v_project.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite alterar projetos.';
  end if;
  if jsonb_typeof(p_patch) is distinct from 'object'
     or (p_patch - array['name', 'objective', 'status', 'owner_agent_id', 'starts_at', 'ends_at']) <> '{}'::jsonb then
    raise exception using errcode = 'invalid_parameter_value', message = 'Campos que podem mudar: name, objective, status, owner_agent_id, starts_at e ends_at.';
  end if;

  update public.projects p
  set name = case when p_patch ? 'name' then btrim(coalesce(p_patch ->> 'name', '')) else p.name end,
      objective = case when p_patch ? 'objective' then nullif(btrim(p_patch ->> 'objective'), '') else p.objective end,
      status = case when p_patch ? 'status' then (p_patch ->> 'status')::public.project_status else p.status end,
      owner_agent_id = case when p_patch ? 'owner_agent_id' then (p_patch ->> 'owner_agent_id')::public.agent_id else p.owner_agent_id end,
      starts_at = case when p_patch ? 'starts_at' then (p_patch ->> 'starts_at')::timestamptz else p.starts_at end,
      ends_at = case when p_patch ? 'ends_at' then (p_patch ->> 'ends_at')::timestamptz else p.ends_at end
  where p.id = v_project.id
  returning * into v_project;

  insert into public.project_participants (workspace_id, project_id, agent_id)
  values (v_project.workspace_id, v_project.id, v_project.owner_agent_id)
  on conflict (project_id, agent_id) do nothing;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_project.workspace_id, 'user', v_user_id::text, 'project.updated', 'project', v_project.id::text,
    jsonb_build_object('fields', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p_patch) k))
  );

  return v_project;
end;
$$;

-- Troca a equipe inteira; quem conduz (owner_agent_id) continua nela.
create function app.set_project_participants(p_project_id uuid, p_participants jsonb)
returns setof public.project_participants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects;
  v_agents text[];
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select p.* into v_project
  from public.projects p
  where p.id = p_project_id and p.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Projeto não encontrado.';
  end if;
  if not app.has_role(v_project.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite alterar projetos.';
  end if;
  if p_participants is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Os participantes precisam ser uma lista.';
  end if;

  select coalesce(array_agg(p.agent_id::text order by p.agent_id), '{}') into v_agents
  from app.project_participants_from_json(p_participants) p;
  if cardinality(v_agents) <> (select count(distinct a) from unnest(v_agents) a) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Cada especialista aparece uma vez na equipe.';
  end if;

  delete from public.project_participants pp
  where pp.project_id = v_project.id
    and pp.agent_id <> v_project.owner_agent_id
    and not (pp.agent_id::text = any (v_agents));

  insert into public.project_participants (workspace_id, project_id, agent_id, responsibility)
  select v_project.workspace_id, v_project.id, p.agent_id, p.responsibility
  from app.project_participants_from_json(p_participants) p
  on conflict (project_id, agent_id) do update set responsibility = excluded.responsibility;

  insert into public.project_participants (workspace_id, project_id, agent_id)
  values (v_project.workspace_id, v_project.id, v_project.owner_agent_id)
  on conflict (project_id, agent_id) do nothing;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_project.workspace_id, 'user', v_user_id::text, 'project.participants_set', 'project', v_project.id::text,
    jsonb_build_object('agent_ids', to_jsonb(v_agents))
  );

  return query
    select pp.* from public.project_participants pp where pp.project_id = v_project.id order by pp.created_at, pp.agent_id;
end;
$$;

create function app.add_project_milestone(
  p_project_id uuid,
  p_title text,
  p_summary text default null,
  p_agent_id public.agent_id default null,
  p_due_at timestamptz default null,
  p_kind text default 'milestone',
  p_needs_you boolean default false,
  p_planned boolean default false
)
returns public.project_milestones
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects;
  v_milestone public.project_milestones;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select p.* into v_project
  from public.projects p
  where p.id = p_project_id and p.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Projeto não encontrado.';
  end if;
  if not app.has_role(v_project.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite alterar projetos.';
  end if;

  insert into public.project_milestones (
    workspace_id, project_id, title, summary, agent_id, kind, due_at, needs_you, planned, created_by
  ) values (
    v_project.workspace_id, v_project.id, btrim(coalesce(p_title, '')), nullif(btrim(p_summary), ''), p_agent_id,
    coalesce(p_kind, 'milestone'), p_due_at, coalesce(p_needs_you, false), coalesce(p_planned, false), v_user_id
  )
  returning * into v_milestone;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_milestone.workspace_id, 'user', v_user_id::text, 'project_milestone.created', 'project_milestone',
    v_milestone.id::text, jsonb_build_object('project_id', v_milestone.project_id)
  );

  return v_milestone;
end;
$$;

-- Patch do marco: title, summary, agent_id, due_at, kind, needs_you, planned e done (true marca agora como
-- concluído; false reabre).
create function app.update_project_milestone(p_milestone_id uuid, p_patch jsonb)
returns public.project_milestones
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_milestone public.project_milestones;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select m.* into v_milestone
  from public.project_milestones m
  where m.id = p_milestone_id and m.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Marco não encontrado.';
  end if;
  if not app.has_role(v_milestone.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite alterar projetos.';
  end if;
  if jsonb_typeof(p_patch) is distinct from 'object'
     or (p_patch - array['title', 'summary', 'agent_id', 'due_at', 'kind', 'needs_you', 'planned', 'done']) <> '{}'::jsonb then
    raise exception using errcode = 'invalid_parameter_value', message = 'Campos que podem mudar: title, summary, agent_id, due_at, kind, needs_you, planned e done.';
  end if;
  if p_patch ? 'done' and jsonb_typeof(p_patch -> 'done') <> 'boolean' then
    raise exception using errcode = 'invalid_parameter_value', message = 'done é verdadeiro ou falso.';
  end if;

  update public.project_milestones m
  set title = case when p_patch ? 'title' then btrim(coalesce(p_patch ->> 'title', '')) else m.title end,
      summary = case when p_patch ? 'summary' then nullif(btrim(p_patch ->> 'summary'), '') else m.summary end,
      agent_id = case when p_patch ? 'agent_id' then (p_patch ->> 'agent_id')::public.agent_id else m.agent_id end,
      due_at = case when p_patch ? 'due_at' then (p_patch ->> 'due_at')::timestamptz else m.due_at end,
      kind = case when p_patch ? 'kind' then coalesce(p_patch ->> 'kind', '') else m.kind end,
      needs_you = case when p_patch ? 'needs_you' then coalesce((p_patch ->> 'needs_you')::boolean, false) else m.needs_you end,
      planned = case when p_patch ? 'planned' then coalesce((p_patch ->> 'planned')::boolean, false) else m.planned end,
      done_at = case
        when not (p_patch ? 'done') then m.done_at
        when (p_patch ->> 'done')::boolean then coalesce(m.done_at, now())
        else null
      end
  where m.id = v_milestone.id
  returning * into v_milestone;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_milestone.workspace_id, 'user', v_user_id::text, 'project_milestone.updated', 'project_milestone',
    v_milestone.id::text,
    jsonb_build_object('fields', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p_patch) k))
  );

  return v_milestone;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 5. Pedido → trabalho com a origem e o projeto da conversa
-- ---------------------------------------------------------------------------------------------------

-- Igual à S1a, mais: a origem sai da conversa (conversa de "<Agente> percebeu" → insight; conversa do projeto
-- → projeto, e o trabalho entra nele, com o especialista na equipe e o marco do trabalho novo).
create or replace function app.create_work_item_from_message(
  p_message_id uuid,
  p_delivery_type text,
  p_title text,
  p_briefing jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.work_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_message public.messages;
  v_conversation public.conversations;
  v_key text;
  v_agent public.agent_id;
  v_item public.work_items;
  v_run public.runs;
  v_origin public.work_item_origin_type;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  select m.* into v_message
  from public.messages m
  where m.id = p_message_id
    and m.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Mensagem não encontrada.';
  end if;

  if not app.has_role(v_message.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite criar trabalhos.';
  end if;
  if p_delivery_type is not null and app.delivery_type_agent(p_delivery_type) is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Tipo de delivery fora do catálogo.';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = 'invalid_parameter_value', message = 'O título precisa ter de 1 a 200 caracteres.';
  end if;
  if p_briefing is not null and jsonb_typeof(p_briefing) <> 'object' then
    raise exception using errcode = 'invalid_parameter_value', message = 'O briefing precisa ser um objeto JSON.';
  end if;
  if char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A chave de idempotência precisa ter de 1 a 200 caracteres.';
  end if;

  select c.* into v_conversation from public.conversations c where c.id = v_message.conversation_id;

  v_key := coalesce(p_idempotency_key, 'message:' || v_message.id || ':' || coalesce(p_delivery_type, '-'));
  v_agent := coalesce(
    app.delivery_type_agent(p_delivery_type),
    case when v_conversation.kind = 'agent_direct' then v_conversation.primary_agent_id end,
    'nexo'
  );
  v_origin := (case v_conversation.context_type
    when 'insight' then 'insight' when 'project' then 'project' else 'message'
  end)::public.work_item_origin_type;
  v_project_id := case when v_conversation.context_type = 'project' then v_conversation.context_id end;

  insert into public.work_items (
    workspace_id, project_id, conversation_id, origin_message_id, title, briefing, delivery_type, status,
    primary_agent_id, idempotency_key, created_by, origin_type, origin_ref
  ) values (
    v_message.workspace_id, v_project_id, v_message.conversation_id, v_message.id, btrim(p_title),
    coalesce(p_briefing, '{}'::jsonb), p_delivery_type, 'draft', v_agent, v_key, v_user_id,
    v_origin, case when v_origin = 'message' then v_message.id else v_conversation.context_id end::text
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning * into v_item;

  if not found then
    select w.* into v_item
    from public.work_items w
    where w.workspace_id = v_message.workspace_id and w.idempotency_key = v_key;
    return v_item;
  end if;

  if v_project_id is not null then
    insert into public.project_participants (workspace_id, project_id, agent_id)
    values (v_item.workspace_id, v_project_id, v_agent)
    on conflict (project_id, agent_id) do nothing;

    insert into public.project_milestones (workspace_id, project_id, title, agent_id, work_item_id, created_by)
    values (v_item.workspace_id, v_project_id, v_item.title, v_agent, v_item.id, v_user_id);
  end if;

  insert into public.runs (workspace_id, work_item_id, conversation_id, agent_id, kind, status, idempotency_key)
  values (
    v_item.workspace_id, v_item.id, v_item.conversation_id, v_agent, 'interactive', 'queued',
    'work_item:' || v_item.id || ':start'
  )
  returning * into v_run;

  perform app.enqueue_run(v_run.id);

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_item.workspace_id, 'user', v_user_id::text, 'work_item.created', 'work_item', v_item.id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'delivery_type', v_item.delivery_type, 'origin_message_id', v_item.origin_message_id,
      'run_id', v_run.id, 'primary_agent_id', v_item.primary_agent_id, 'origin_type', v_item.origin_type,
      'project_id', v_item.project_id
    ))
  );

  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------

revoke all on function
  app.work_items_default_origin(),
  app.work_items_reset_live_fields(),
  app.work_items_history_requested(),
  app.delivery_versions_history(),
  app.approvals_history(),
  app.approval_is_deferred(public.approvals),
  app.decide_approval(uuid, public.approval_decision, text, text),
  app.defer_approval(uuid, timestamptz),
  app.resume_approval(uuid),
  app.approvals_broadcast(),
  app.project_participants_from_json(jsonb),
  app.create_project(uuid, text, text, public.agent_id, timestamptz, timestamptz, jsonb),
  app.update_project(uuid, jsonb),
  app.set_project_participants(uuid, jsonb),
  app.add_project_milestone(uuid, text, text, public.agent_id, timestamptz, text, boolean, boolean),
  app.update_project_milestone(uuid, jsonb),
  app.create_work_item_from_message(uuid, text, text, jsonb, text)
  from public, anon, authenticated, service_role;

grant execute on function
  app.approval_is_deferred(public.approvals),
  app.decide_approval(uuid, public.approval_decision, text, text),
  app.defer_approval(uuid, timestamptz),
  app.resume_approval(uuid),
  app.create_project(uuid, text, text, public.agent_id, timestamptz, timestamptz, jsonb),
  app.update_project(uuid, jsonb),
  app.set_project_participants(uuid, jsonb),
  app.add_project_milestone(uuid, text, text, public.agent_id, timestamptz, text, boolean, boolean),
  app.update_project_milestone(uuid, jsonb),
  app.create_work_item_from_message(uuid, text, text, jsonb, text)
  to authenticated;
