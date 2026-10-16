-- S2d — o histórico registra a etapa concluída. A versão da 20261016200100 pulava toda saída de needs_you para
-- não repetir "começou" na nova proposta; só needs_you → in_progress deve ser pulada (o pedido da pessoa já está
-- no histórico). needs_you → done ("Etapa 1 · Estratégia concluída") entra, com o responsável da etapa.

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
