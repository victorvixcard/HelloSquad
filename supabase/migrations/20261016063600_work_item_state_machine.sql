-- S1a — máquina de estados dos trabalhos e decisão de aprovação.
-- A matriz mora em app.work_item_transitions (fora da Data API). app.transition_work_item é o caminho
-- normal: valida na matriz, faz UPDATE … WHERE status = <estado lido> e grava em audit_events. O trigger
-- work_items_check_transition recusa qualquer mudança de status fora da matriz, venha de onde vier.
-- Regra do Documento Mestre §8: done só a partir de approved (conteúdo aprovado, nada a executar) ou de
-- scheduled (execução confirmada); nunca direto de in_progress.
-- SQLSTATE próprios: WI001 = transição não permitida; WI002 = o trabalho mudou de estado no meio do caminho.

create table app.work_item_transitions (
  from_status public.work_item_status not null,
  to_status public.work_item_status not null,
  description text not null,
  primary key (from_status, to_status),
  constraint work_item_transitions_not_self check (from_status <> to_status)
);
comment on table app.work_item_transitions is 'Transições permitidas entre estados de work_items. Mudança aqui é decisão de produto: migration nova.';

insert into app.work_item_transitions (from_status, to_status, description) values
  ('draft', 'in_progress', 'escopo confirmado; execução começa'),
  ('draft', 'needs_you', 'briefing incompleto; o agente pergunta antes de começar'),
  ('draft', 'cancelled', 'pedido descartado antes de começar'),
  ('in_progress', 'needs_you', 'entrega pronta para revisão ou pergunta ao usuário'),
  ('in_progress', 'blocked', 'falta acesso, dado ou conexão'),
  ('in_progress', 'failed', 'execução falhou'),
  ('in_progress', 'paused', 'pausado pelo usuário ou por limite'),
  ('in_progress', 'cancelled', 'cancelado durante a execução'),
  ('needs_you', 'in_progress', 'ajuste pedido ou resposta dada'),
  ('needs_you', 'approved', 'usuário aprovou'),
  ('needs_you', 'cancelled', 'usuário desistiu'),
  ('approved', 'done', 'aprovado e sem execução externa pendente'),
  ('approved', 'scheduled', 'execução externa agendada com autorização própria'),
  ('scheduled', 'done', 'execução confirmada pela API do canal'),
  ('scheduled', 'failed', 'execução agendada falhou'),
  ('scheduled', 'cancelled', 'agendamento cancelado'),
  ('paused', 'in_progress', 'retomado'),
  ('paused', 'cancelled', 'cancelado enquanto pausado'),
  ('blocked', 'in_progress', 'bloqueio resolvido'),
  ('blocked', 'failed', 'bloqueio sem solução'),
  ('blocked', 'cancelled', 'cancelado enquanto bloqueado'),
  ('failed', 'in_progress', 'nova tentativa'),
  ('failed', 'cancelled', 'falha encerrada sem nova tentativa');

revoke all on table app.work_item_transitions from public, anon, authenticated, service_role;

create function app.work_items_check_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not exists (
       select 1 from app.work_item_transitions t where t.from_status = old.status and t.to_status = new.status
     ) then
    raise exception using
      errcode = 'WI001',
      message = format('Transição de trabalho não permitida: %s → %s.', old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger work_items_check_transition
  before update of status on public.work_items
  for each row execute function app.work_items_check_transition();

create function app.transition_work_item(
  p_work_item_id uuid,
  p_to_status public.work_item_status,
  p_actor_type public.audit_actor_type,
  p_actor_id text,
  p_note text default null,
  p_expected_from public.work_item_status default null
)
returns public.work_items
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_from public.work_item_status;
  v_item public.work_items;
begin
  if p_actor_type = 'agent' then
    perform p_actor_id::public.agent_id;
  elsif p_actor_type = 'user' then
    perform p_actor_id::uuid;
  end if;

  select w.status into v_from from public.work_items w where w.id = p_work_item_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Trabalho não encontrado.';
  end if;

  if p_expected_from is not null and v_from <> p_expected_from then
    raise exception using
      errcode = 'WI002',
      message = format('O trabalho está em %s, não em %s.', v_from, p_expected_from);
  end if;

  if not exists (
    select 1 from app.work_item_transitions t where t.from_status = v_from and t.to_status = p_to_status
  ) then
    raise exception using
      errcode = 'WI001',
      message = format('Transição de trabalho não permitida: %s → %s.', v_from, p_to_status);
  end if;

  update public.work_items
  set status = p_to_status
  where id = p_work_item_id and status = v_from
  returning * into v_item;

  if not found then
    raise exception using
      errcode = 'WI002',
      message = 'O trabalho mudou de estado ao mesmo tempo. Recarregue e tente de novo.';
  end if;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_item.workspace_id, p_actor_type, p_actor_id, 'work_item.status_changed', 'work_item', v_item.id::text,
    jsonb_strip_nulls(jsonb_build_object('from', v_from, 'to', p_to_status, 'note', nullif(btrim(p_note), '')))
  );

  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Decisão de aprovação (idempotente)
-- ---------------------------------------------------------------------------------------------------

-- Autorizar ação externa (publicar, enviar, investir) exige admin; as demais decisões, editor.
create function app.approval_min_role(p_kind public.approval_kind)
returns public.workspace_role
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_kind when 'authorize' then 'admin'::public.workspace_role else 'editor'::public.workspace_role end
$$;

-- UPDATE … WHERE status = 'pending': a segunda chamada (clique repetido, retry) não muda nada e devolve o
-- estado atual, sem erro. Efeitos só na chamada que decidiu: versão aprovada vira a atual, o trabalho sai
-- de needs_you quando não sobra outra pendência dele, e a decisão vai para audit_events.
create function app.decide_approval(p_approval_id uuid, p_decision public.approval_decision, p_note text default null)
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
  v_work_status public.work_item_status;
  v_to public.work_item_status;
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
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite tomar esta decisão.';
  end if;

  if not (
    (v_approval.kind in ('review', 'approve') and p_decision in ('approved', 'changes_requested', 'rejected'))
    or (v_approval.kind in ('authorize', 'confirm', 'reconnect') and p_decision in ('approved', 'rejected'))
    or (v_approval.kind = 'respond' and p_decision = 'answered')
  ) then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = format('A decisão %s não vale para uma aprovação do tipo %s.', p_decision, v_approval.kind);
  end if;
  if char_length(p_note) > 2000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A observação passou de 2.000 caracteres.';
  end if;

  update public.approvals
  set status = 'decided', decision = p_decision, decided_by = v_user_id, decided_at = now(),
      note = nullif(btrim(p_note), '')
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
      'kind', v_approval.kind, 'decision', v_approval.decision, 'work_item_id', v_approval.work_item_id,
      'delivery_version_id', v_approval.delivery_version_id
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
    when v_approval.kind = 'respond' and v_approval.decision = 'answered' then 'in_progress'
  end::public.work_item_status;

  select w.status into v_work_status from public.work_items w where w.id = v_approval.work_item_id for update;

  if v_to is not null
     and v_work_status = 'needs_you'
     and not exists (
       select 1 from public.approvals a
       where a.work_item_id = v_approval.work_item_id and a.status = 'pending'
     ) then
    perform app.transition_work_item(
      v_approval.work_item_id, v_to, 'user', v_user_id::text, v_approval.note, 'needs_you'
    );
  end if;

  return v_approval;
end;
$$;

revoke all on function
  app.work_items_check_transition(),
  app.transition_work_item(uuid, public.work_item_status, public.audit_actor_type, text, text, public.work_item_status),
  app.approval_min_role(public.approval_kind),
  app.decide_approval(uuid, public.approval_decision, text)
  from public, anon, authenticated, service_role;

grant execute on function app.decide_approval(uuid, public.approval_decision, text) to authenticated;
