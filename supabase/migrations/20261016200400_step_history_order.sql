-- S2d — a entrada da etapa no histórico vem depois da decisão que a fechou: na mesma transação, now() empata e a
-- ordem cairia no id. clock_timestamp() põe "Etapa 1 · Estratégia concluída" depois de "Você aprovou a v1".

create or replace function app.work_item_steps_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.delivery_type is null or new.status not in ('in_progress', 'waiting_engine', 'blocked', 'done', 'failed') then
    return null;
  end if;
  if tg_op = 'UPDATE' and (
    new.status is not distinct from old.status
    or (old.status = 'needs_you' and new.status = 'in_progress')
  ) then
    return null;
  end if;
  insert into public.work_item_history (
    workspace_id, work_item_id, actor_type, actor_agent_id, kind, params, mark, created_at
  )
  values (
    new.workspace_id, new.work_item_id, 'agent', new.agent_id, 'step',
    jsonb_strip_nulls(jsonb_build_object(
      'step_id', new.id, 'seq', new.seq, 'title', new.title, 'delivery_type', new.delivery_type,
      'status', new.status, 'reason', new.status_reason, 'reason_params', nullif(new.status_params, '{}'::jsonb)
    )),
    'automatic', clock_timestamp()
  );
  return null;
end;
$$;
