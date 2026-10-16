-- S2d — Colaboração entre agentes e projeto coordenado (01.02 do Nexo).
--
-- Um trabalho coordenado tem etapas por agente: work_item_steps ganha delivery_type, dependências, entrada,
-- saída e motivo do estado. Cada etapa é um run próprio (runs.step_id), com reserva e captura de créditos da
-- delivery da etapa; a entrega, a pendência e o marco do projeto da etapa levam step_id. Aprovar a entrega de
-- uma etapa fecha a etapa e passa à seguinte (um especialista por vez); quando a última fecha, o trabalho e o
-- projeto fecham. A etapa de imagem aguarda o motor do dono (waiting_engine) sem falhar nem cobrar; a etapa que
-- depende dela fica blocked com o motivo. Falha numa etapa não apaga as anteriores.
--
-- Etapas sem delivery_type continuam sendo as fases internas de um run (triagem, produção), como desde a S1c.

-- ---------------------------------------------------------------------------------------------------
-- Etapas por agente
-- ---------------------------------------------------------------------------------------------------

alter table public.work_item_steps
  add column delivery_type text,
  add column depends_on integer[] not null default '{}',
  add column input jsonb not null default '{}'::jsonb,
  add column output jsonb not null default '{}'::jsonb,
  add column status_reason text,
  add column status_params jsonb not null default '{}'::jsonb,
  add constraint work_item_steps_workspace_id_id_key unique (workspace_id, id),
  add constraint work_item_steps_work_item_id_key unique (workspace_id, work_item_id, id),
  add constraint work_item_steps_delivery_type_format check (delivery_type ~ '^[0-9]{2}\.[0-9]{2}$'),
  add constraint work_item_steps_planned_agent check (delivery_type is null or agent_id is not null),
  add constraint work_item_steps_depends_before check (seq > all (depends_on) and 0 < all (depends_on)),
  add constraint work_item_steps_input_object check (jsonb_typeof(input) = 'object'),
  add constraint work_item_steps_output_object check (jsonb_typeof(output) = 'object'),
  add constraint work_item_steps_status_params_object check (jsonb_typeof(status_params) = 'object'),
  add constraint work_item_steps_status_reason_format check (status_reason ~ '^[a-z][a-z_]{0,59}$');
comment on column public.work_item_steps.delivery_type is 'Etapa planejada pelo Nexo (01.02): a delivery que o agente da etapa entrega. Nulo = fase interna do run.';
comment on column public.work_item_steps.depends_on is 'Etapas (seq) cuja saída esta etapa precisa antes de começar.';
comment on column public.work_item_steps.input is 'Entrada da etapa: o recorte do pedido para este especialista (instrução, briefing, responsabilidade).';
comment on column public.work_item_steps.output is 'Saída da etapa: a versão entregue ou aprovada (delivery_version_id, version_no) que passa à seguinte.';
comment on column public.work_item_steps.status_reason is 'Código do motivo do estado (image_engine_pending, depends_on_step, work_cancelled); o texto sai do catálogo pela API.';
create index work_item_steps_work_item_status_idx on public.work_item_steps (work_item_id, status);

alter table public.runs
  add column step_id uuid,
  add constraint runs_step_fk foreign key (workspace_id, work_item_id, step_id)
    references public.work_item_steps (workspace_id, work_item_id, id) on delete set null (step_id);
comment on column public.runs.step_id is 'Etapa do trabalho coordenado que este run executa (um run por etapa e por nova proposta).';
create index runs_step_idx on public.runs (step_id) where step_id is not null;

alter table public.deliveries
  add column step_id uuid,
  add constraint deliveries_step_fk foreign key (workspace_id, work_item_id, step_id)
    references public.work_item_steps (workspace_id, work_item_id, id) on delete set null (step_id);
create index deliveries_step_idx on public.deliveries (step_id) where step_id is not null;

alter table public.approvals
  add column step_id uuid,
  add constraint approvals_step_fk foreign key (workspace_id, work_item_id, step_id)
    references public.work_item_steps (workspace_id, work_item_id, id) on delete set null (step_id);
create index approvals_step_idx on public.approvals (step_id) where step_id is not null;

alter table public.project_milestones
  add column step_id uuid,
  add constraint project_milestones_step_fk foreign key (workspace_id, step_id)
    references public.work_item_steps (workspace_id, id) on delete set null (step_id);
create unique index project_milestones_step_key on public.project_milestones (step_id) where step_id is not null;

-- O contexto do run registra a saída de outra etapa (handoff): a versão que entrou e de qual etapa veio.
alter table public.run_context_items
  add column step_id uuid,
  add column delivery_version_id uuid,
  add constraint run_context_items_step_fk foreign key (workspace_id, step_id)
    references public.work_item_steps (workspace_id, id) on delete set null (step_id),
  add constraint run_context_items_delivery_version_fk foreign key (workspace_id, delivery_version_id)
    references public.delivery_versions (workspace_id, id),
  drop constraint run_context_items_target,
  add constraint run_context_items_target check (
    (kind = 'fact' and fact_id is not null and suggestion_id is null and learning_id is null and delivery_version_id is null)
    or (kind = 'suggestion' and suggestion_id is not null and fact_id is null and learning_id is null and delivery_version_id is null)
    or (kind = 'learning' and learning_id is not null and fact_id is null and suggestion_id is null and delivery_version_id is null)
    or (kind = 'step' and delivery_version_id is not null and fact_id is null and suggestion_id is null and learning_id is null)
  ),
  drop constraint run_context_items_reason_values,
  add constraint run_context_items_reason_values check (reason in ('essential', 'search', 'delivery', 'handoff'));
comment on column public.run_context_items.step_id is 'Etapa de onde veio a saída que entrou no contexto (kind step, motivo handoff).';
create unique index run_context_items_version_key on public.run_context_items (run_id, delivery_version_id)
  where delivery_version_id is not null;
create index run_context_items_step_idx on public.run_context_items (step_id) where step_id is not null;
create index run_context_items_delivery_version_idx on public.run_context_items (delivery_version_id)
  where delivery_version_id is not null;

-- Histórico: a equipe montada pelo Nexo e cada mudança de etapa, com o responsável.
alter table public.work_item_history
  drop constraint work_item_history_kind,
  add constraint work_item_history_kind check (kind in ('requested', 'delivered', 'decided', 'team', 'step'));

create function app.work_item_steps_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.delivery_type is null or new.status not in ('in_progress', 'waiting_engine', 'blocked', 'done', 'failed') then
    return null;
  end if;
  if tg_op = 'UPDATE' and (new.status is not distinct from old.status or old.status = 'needs_you') then
    -- Nova proposta pedida pela pessoa: o pedido já está no histórico ("Você pediu…").
    return null;
  end if;
  insert into public.work_item_history (
    workspace_id, work_item_id, actor_type, actor_agent_id, kind, params, mark
  )
  values (
    new.workspace_id, new.work_item_id, 'agent', new.agent_id, 'step',
    jsonb_strip_nulls(jsonb_build_object(
      'step_id', new.id, 'seq', new.seq, 'title', new.title, 'delivery_type', new.delivery_type,
      'status', new.status, 'reason', new.status_reason, 'reason_params', nullif(new.status_params, '{}'::jsonb)
    )),
    'automatic'
  );
  return null;
end;
$$;

create trigger work_item_steps_history
  after insert or update of status on public.work_item_steps
  for each row execute function app.work_item_steps_history();

-- Trabalho cancelado: as etapas que não fecharam ficam puladas; as concluídas continuam como estão.
create function app.work_items_skip_open_steps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.work_item_steps
  set status = 'skipped', finished_at = greatest(now(), started_at), status_reason = 'work_cancelled',
      status_params = '{}'::jsonb
  where work_item_id = new.id and workspace_id = new.workspace_id and delivery_type is not null
    and status in ('pending', 'in_progress', 'needs_you', 'waiting_engine', 'blocked');
  return null;
end;
$$;

create trigger work_items_skip_open_steps
  after update of status on public.work_items
  for each row
  when (new.status = 'cancelled' and old.status is distinct from new.status)
  execute function app.work_items_skip_open_steps();

-- ---------------------------------------------------------------------------------------------------
-- Avanço etapa a etapa (um especialista por vez)
-- ---------------------------------------------------------------------------------------------------

-- Próxima etapa que pode começar: pendente, com as dependências concluídas, e nenhuma outra em andamento ou
-- esperando a pessoa. A pendente que depende de uma etapa que aguarda o motor, está bloqueada, falhou ou foi
-- pulada fica blocked com o motivo (código + etapa), e a busca segue para a próxima.
create function app.work_step_next(p_work_item_id uuid)
returns public.work_item_steps
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_step public.work_item_steps;
  v_dep public.work_item_steps;
begin
  if exists (
    select 1 from public.work_item_steps s
    where s.work_item_id = p_work_item_id and s.delivery_type is not null
      and s.status in ('in_progress', 'needs_you')
  ) then
    return null;
  end if;

  for v_step in
    select s.* from public.work_item_steps s
    where s.work_item_id = p_work_item_id and s.delivery_type is not null and s.status = 'pending'
    order by s.seq
    for update
  loop
    select d.* into v_dep
    from public.work_item_steps d
    where d.work_item_id = p_work_item_id and d.seq = any (v_step.depends_on) and d.status <> 'done'
    order by d.seq
    limit 1;
    if not found then
      return v_step;
    end if;
    if v_dep.status in ('waiting_engine', 'blocked', 'failed', 'skipped') then
      update public.work_item_steps
      set status = 'blocked', status_reason = 'depends_on_step',
          status_params = jsonb_build_object(
            'seq', v_dep.seq, 'agent_id', v_dep.agent_id, 'title', v_dep.title, 'status', v_dep.status
          )
      where id = v_step.id;
    else
      return null;
    end if;
  end loop;
  return null;
end;
$$;

-- Run da etapa na fila (agente da etapa, mesma conversa do trabalho). Chave repetida devolve o mesmo run.
create function app.queue_work_step(p_step_id uuid, p_idempotency_key text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_step public.work_item_steps;
  v_conversation_id uuid;
  v_run_id uuid;
begin
  select s.* into v_step from public.work_item_steps s where s.id = p_step_id;
  if not found or v_step.delivery_type is null then
    raise exception using errcode = 'no_data_found', message = 'Etapa planejada não encontrada.';
  end if;
  select w.conversation_id into v_conversation_id from public.work_items w where w.id = v_step.work_item_id;

  insert into public.runs (
    workspace_id, work_item_id, conversation_id, agent_id, kind, status, idempotency_key, step_id
  )
  values (
    v_step.workspace_id, v_step.work_item_id, v_conversation_id, v_step.agent_id, 'interactive', 'queued',
    p_idempotency_key, v_step.id
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning id into v_run_id;

  if v_run_id is not null then
    perform app.enqueue_run(v_run_id);
  end if;
  return v_run_id;
end;
$$;

-- O projeto do trabalho coordenado fecha quando o trabalho fecha e nada mais do projeto está aberto.
create function app.close_coordinated_project(p_work_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.projects p
  set status = 'done'
  from public.work_items w
  where w.id = p_work_item_id and p.id = w.project_id and p.workspace_id = w.workspace_id
    and p.status = 'active'
    and not exists (
      select 1 from public.work_items o
      where o.project_id = p.id and o.id <> w.id
        and o.status not in ('done', 'cancelled', 'failed')
    );
end;
$$;

-- Caminho do worker (fim de uma etapa sem decisão da pessoa, como a da Kaia aguardando o motor): põe a próxima
-- etapa na fila; sem próxima e sem nada esperando a pessoa, o trabalho fica bloqueado (o que sobrou aguarda o
-- motor ou depende dele). Devolve queued, busy ou waiting.
create function app.advance_work_steps(p_work_item_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.work_items;
  v_next public.work_item_steps;
begin
  select w.* into v_item from public.work_items w where w.id = p_work_item_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Trabalho não encontrado.';
  end if;
  v_next := app.work_step_next(p_work_item_id);
  if v_next.id is not null then
    perform app.queue_work_step(v_next.id, 'step:' || v_next.id);
    return 'queued';
  end if;
  if exists (
    select 1 from public.work_item_steps s
    where s.work_item_id = p_work_item_id and s.delivery_type is not null
      and s.status in ('pending', 'in_progress', 'needs_you')
  ) then
    return 'busy';
  end if;
  if v_item.status = 'in_progress' then
    perform app.transition_work_item(p_work_item_id, 'blocked', 'agent', 'nexo', null, 'in_progress');
  end if;
  return 'waiting';
end;
$$;

-- Decisão do dono sobre a entrega (ou a pergunta) de uma etapa. Aprovar fecha a etapa e o marco e passa à
-- seguinte; sem seguinte, o trabalho é aprovado e concluído e o projeto fecha. Ajuste, nova proposta ou
-- resposta: novo run da mesma etapa, com o mesmo agente. Cancelar: o trabalho inteiro é cancelado (as etapas
-- concluídas ficam).
create function app.decide_work_step(p_approval public.approvals, p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.work_items;
  v_step public.work_item_steps;
  v_next public.work_item_steps;
  v_version_no integer;
begin
  select w.* into v_item from public.work_items w where w.id = p_approval.work_item_id for update;
  select s.* into v_step from public.work_item_steps s where s.id = p_approval.step_id for update;
  if v_item.status <> 'needs_you' or exists (
    select 1 from public.approvals a where a.work_item_id = v_item.id and a.status = 'pending'
  ) then
    return;
  end if;

  if p_approval.kind in ('review', 'approve') and p_approval.decision = 'approved' then
    select v.version_no into v_version_no
    from public.delivery_versions v where v.id = p_approval.delivery_version_id;
    update public.work_item_steps
    set status = 'done', finished_at = greatest(now(), started_at), status_reason = null,
        status_params = '{}'::jsonb,
        output = jsonb_strip_nulls(jsonb_build_object(
          'delivery_version_id', p_approval.delivery_version_id, 'version_no', v_version_no,
          'approval_id', p_approval.id
        ))
    where id = v_step.id;
    update public.project_milestones
    set done_at = now(), approval_id = coalesce(approval_id, p_approval.id)
    where step_id = v_step.id and done_at is null;

    v_next := app.work_step_next(v_item.id);
    if v_next.id is not null then
      perform app.transition_work_item(v_item.id, 'in_progress', 'user', p_user_id::text, p_approval.note, 'needs_you');
      perform app.queue_work_step(v_next.id, 'step:' || v_next.id);
    else
      perform app.transition_work_item(v_item.id, 'approved', 'user', p_user_id::text, p_approval.note, 'needs_you');
      perform app.transition_work_item(v_item.id, 'done', 'system', null, null, 'approved');
      perform app.close_coordinated_project(v_item.id);
    end if;
  elsif p_approval.follow_up = 'cancel' then
    perform app.transition_work_item(v_item.id, 'cancelled', 'user', p_user_id::text, p_approval.note, 'needs_you');
  else
    perform app.transition_work_item(v_item.id, 'in_progress', 'user', p_user_id::text, p_approval.note, 'needs_you');
    update public.work_item_steps set status = 'in_progress' where id = v_step.id;
    perform app.queue_work_step(v_step.id, 'approval:' || p_approval.id);
  end if;
end;
$$;

revoke all on function app.work_step_next(uuid) from public, anon, authenticated, service_role;
revoke all on function app.queue_work_step(uuid, text) from public, anon, authenticated, service_role;
revoke all on function app.close_coordinated_project(uuid) from public, anon, authenticated, service_role;
revoke all on function app.advance_work_steps(uuid) from public, anon, authenticated, service_role;
revoke all on function app.decide_work_step(public.approvals, uuid) from public, anon, authenticated, service_role;
revoke all on function app.work_item_steps_history() from public, anon, authenticated, service_role;
revoke all on function app.work_items_skip_open_steps() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- decide_approval: a decisão sobre uma etapa segue o trabalho coordenado
-- ---------------------------------------------------------------------------------------------------

create or replace function app.decide_approval(
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
      'work_item_id', v_approval.work_item_id, 'delivery_version_id', v_approval.delivery_version_id,
      'step_id', v_approval.step_id
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

  if v_approval.step_id is not null then
    perform app.decide_work_step(v_approval, v_user_id);
    return v_approval;
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

-- ---------------------------------------------------------------------------------------------------
-- Créditos: cada etapa reserva e captura pelo preço da delivery dela
-- ---------------------------------------------------------------------------------------------------

create or replace function app.run_credit_estimate(p_run_id uuid)
returns table (
  price_id uuid,
  delivery_type text,
  depth public.delivery_depth,
  credits numeric,
  revision boolean,
  provisional boolean
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_run public.runs;
  v_delivery_type text;
  v_revision boolean;
  v_price public.delivery_prices;
begin
  select r.* into v_run from public.runs r where r.id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  select coalesce(s.delivery_type, w.delivery_type) into v_delivery_type
  from public.work_items w
  left join public.work_item_steps s on s.id = v_run.step_id and s.workspace_id = v_run.workspace_id
  where w.id = v_run.work_item_id and w.workspace_id = v_run.workspace_id;
  if v_delivery_type is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'O trabalho deste run não tem tipo de delivery.';
  end if;
  v_price := app.current_delivery_price(v_delivery_type);
  if v_price.id is null then
    raise exception using
      errcode = 'no_data_found',
      message = format('A delivery %s ainda não tem preço em créditos.', v_delivery_type);
  end if;
  v_revision := exists (
    select 1
    from public.delivery_versions v
    join public.deliveries d on d.id = v.delivery_id and d.workspace_id = v.workspace_id
    where d.workspace_id = v_run.workspace_id
      and d.work_item_id = v_run.work_item_id
      and d.step_id is not distinct from v_run.step_id
      and v.run_id is distinct from v_run.id
  );
  return query select v_price.id, v_price.delivery_type, v_price.depth,
    case when v_revision then coalesce(v_price.revision_credits, v_price.credits) else v_price.credits end,
    v_revision, v_price.provisional;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Reflexão: a decisão sobre uma etapa ensina o agente da etapa, com as versões e correções dela
-- ---------------------------------------------------------------------------------------------------

create or replace function app.enqueue_reflection(
  p_work_item_id uuid,
  p_outcome public.reflection_outcome,
  p_approval_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.work_items;
  v_step public.work_item_steps;
  v_delivery_type text;
  v_agent public.agent_id;
  v_refs jsonb;
  v_id uuid;
begin
  select w.* into v_item from public.work_items w where w.id = p_work_item_id;
  if not found then
    return null;
  end if;
  if p_approval_id is not null then
    select s.* into v_step
    from public.approvals a
    join public.work_item_steps s on s.id = a.step_id
    where a.id = p_approval_id;
  end if;
  if v_step.id is not null then
    v_delivery_type := v_step.delivery_type;
    v_agent := v_step.agent_id;
  elsif exists (
    select 1 from public.work_item_steps s where s.work_item_id = v_item.id and s.delivery_type is not null
  ) then
    -- A coordenação do Nexo não tem versão própria: quem aprende é o agente de cada etapa.
    return null;
  else
    v_delivery_type := v_item.delivery_type;
    v_agent := app.delivery_type_agent(v_delivery_type);
  end if;
  if v_delivery_type is null then
    return null;
  end if;

  v_refs := jsonb_build_object(
    'work_item', jsonb_build_object(
      'id', v_item.id, 'title', v_item.title, 'delivery_type', v_delivery_type,
      'briefing', case when v_step.id is null then v_item.briefing else v_step.input end
    ),
    'versions', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', v.id, 'version_no', v.version_no, 'status', v.status)
               order by v.version_no
             )
      from public.delivery_versions v
      join public.deliveries d on d.id = v.delivery_id
      where d.work_item_id = v_item.id and d.step_id is not distinct from v_step.id
    ), '[]'::jsonb),
    'corrections', coalesce((
      select jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object(
                 'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
                 'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
               ))
               order by a.decided_at, a.id
             )
      from public.approvals a
      where a.work_item_id = v_item.id
        and a.step_id is not distinct from v_step.id
        and a.kind in ('review', 'approve')
        and a.status = 'decided'
        and a.decision in ('changes_requested', 'rejected')
    ), '[]'::jsonb),
    'decision', (
      select jsonb_strip_nulls(jsonb_build_object(
               'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
               'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
             ))
      from public.approvals a
      where a.id = p_approval_id
    )
  );

  insert into public.memory_reflections (
    workspace_id, work_item_id, agent_id, delivery_type, outcome, approval_id, idempotency_key, refs
  )
  values (
    v_item.workspace_id, v_item.id, v_agent, v_delivery_type, p_outcome, p_approval_id,
    coalesce('approval:' || p_approval_id, 'cancel:' || v_item.id), jsonb_strip_nulls(v_refs)
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    perform pgmq.send(
      'memory_reflect',
      jsonb_build_object(
        'reflection_id', v_id, 'workspace_id', v_item.workspace_id, 'work_item_id', v_item.id,
        'agent_id', v_agent, 'delivery_type', v_delivery_type, 'outcome', p_outcome,
        'refs', jsonb_strip_nulls(v_refs)
      )
    );
  end if;
  return v_id;
end;
$$;
