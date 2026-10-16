-- S1a — Realtime Broadcast a partir do banco, canal privado `workspace:<workspace_id>`.
-- run_events (progresso do run) e approvals (criada, decidida, expirada) publicam via realtime.send.
-- O payload leva ids e estados; o conteúdo (texto da entrega, observação) o cliente busca pela API.
-- O cliente entra no canal com `private: true`; a política em realtime.messages só deixa
-- `authenticated` receber tópicos dos workspaces de que é membro. Sem política de INSERT: cliente não
-- publica no canal do workspace, só o banco.
-- realtime.send engole a própria falha (WARNING), então broadcast nunca desfaz a escrita de origem.
-- Imagem sem realtime.send: os triggers seguem gravando e apenas não publicam.

create function app.broadcast_to_workspace(p_workspace_id uuid, p_event text, p_payload jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if to_regprocedure('realtime.send(jsonb, text, text, boolean)') is not null then
    perform realtime.send(p_payload, p_event, 'workspace:' || p_workspace_id::text, true);
  end if;
end;
$$;

create function app.run_events_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.broadcast_to_workspace(
    new.workspace_id,
    'run_event',
    jsonb_build_object(
      'id', new.id, 'run_id', new.run_id, 'seq', new.seq, 'type', new.type, 'payload', new.payload,
      'created_at', new.created_at
    )
  );
  return null;
end;
$$;

create trigger run_events_broadcast
  after insert on public.run_events
  for each row execute function app.run_events_broadcast();

create function app.approvals_broadcast()
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
    case when tg_op = 'INSERT' then 'approval.created' else 'approval.' || new.status::text end,
    jsonb_strip_nulls(jsonb_build_object(
      'id', new.id, 'work_item_id', new.work_item_id, 'delivery_version_id', new.delivery_version_id,
      'kind', new.kind, 'status', new.status, 'decision', new.decision,
      'requested_by_agent_id', new.requested_by_agent_id, 'decided_at', new.decided_at, 'due_at', new.due_at
    ))
  );
  return null;
end;
$$;

create trigger approvals_broadcast
  after insert or update of status on public.approvals
  for each row execute function app.approvals_broadcast();

revoke all on function
  app.broadcast_to_workspace(uuid, text, jsonb),
  app.run_events_broadcast(),
  app.approvals_broadcast()
  from public, anon, authenticated, service_role;

-- O servidor do Realtime autoriza a entrada no canal privado lendo realtime.messages com o papel e o
-- JWT do usuário; a mesma regra vale para leitura direta. Compara texto com texto: tópico malformado
-- não quebra a consulta.
create policy workspace_members_receive_broadcast on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and topic in (select 'workspace:' || ws::text from app.current_user_workspace_ids() as ws)
  );
