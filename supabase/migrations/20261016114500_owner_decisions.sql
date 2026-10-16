-- S1c — decisões do dono de 16/10/2026 08:55 (DIRETRIZES_DO_DONO.md):
-- 1. Só o owner decide qualquer pendência (review, approve, authorize, confirm, reconnect, respond).
--    Admin e editor não decidem. (O owner é o dono da conta; o vínculo com a assinatura entra com a S1e.)
-- 2. Rejeitar uma entrega tem duas saídas, guardadas em approvals.follow_up: `cancel` (trabalho →
--    cancelled) ou `revise` (trabalho → in_progress e novo run do agente responsável).
-- O agente volta a trabalhar também quando a pessoa pede ajuste (changes_requested: o protótipo V4.6
-- devolve o trabalho à produção com uma nova versão, FLUXOS_DA_V46.md §5) ou responde a pergunta do
-- agente (respond → answered). O run nasce na mesma transação da decisão, com idempotency_key
-- `approval:<id>`: clique repetido não cria segundo run.

alter table public.approvals
  add column follow_up text,
  add constraint approvals_follow_up_values check (follow_up in ('cancel', 'revise')),
  add constraint approvals_follow_up_only_rejected check (follow_up is null or decision = 'rejected');
comment on column public.approvals.follow_up is 'Saída da rejeição: cancel (cancela o trabalho) ou revise (nova proposta do agente).';

create or replace function app.approval_min_role(p_kind public.approval_kind)
returns public.workspace_role
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 'owner'::public.workspace_role
$$;

drop function app.decide_approval(uuid, public.approval_decision, text);

-- UPDATE … WHERE status = 'pending': a segunda chamada (clique repetido, retry) não muda nada e devolve o
-- estado atual, sem erro. Efeitos só na chamada que decidiu: versão aprovada vira a atual, o trabalho sai
-- de needs_you quando não sobra outra pendência dele, o agente ganha um run novo quando precisa voltar a
-- trabalhar, e a decisão vai para audit_events.
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
    or (v_approval.kind = 'respond' and p_decision = 'answered')
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
    when v_approval.kind = 'respond' and v_approval.decision = 'answered' then 'in_progress'
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

revoke all on function
  app.approval_min_role(public.approval_kind),
  app.decide_approval(uuid, public.approval_decision, text, text)
  from public, anon, authenticated, service_role;

grant execute on function app.decide_approval(uuid, public.approval_decision, text, text) to authenticated;
