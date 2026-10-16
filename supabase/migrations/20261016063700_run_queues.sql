-- S1a — filas de execução (pgmq) e criação de trabalho a partir de mensagem.
-- Quatro filas (pgmq aceita só letras, números e sublinhado): runs_interactive (prioridade),
-- runs_scheduled, external_actions e memory_reflect. A mensagem entra na fila na mesma transação que
-- cria o run: se a transação desfaz, a fila também desfaz. O worker reivindica o run com
-- UPDATE … WHERE status = 'queued' (mensagem repetida vira no-op).
-- authenticated, anon e service_role não tocam no schema pgmq: só o papel privilegiado lê a fila.

select pgmq.create('runs_interactive');
select pgmq.create('runs_scheduled');
select pgmq.create('external_actions');
select pgmq.create('memory_reflect');

revoke all on schema pgmq from public, anon, authenticated, service_role;
revoke all on all tables in schema pgmq from public, anon, authenticated, service_role;
revoke all on all sequences in schema pgmq from public, anon, authenticated, service_role;
revoke all on all functions in schema pgmq from public, anon, authenticated, service_role;
-- Funções que uma atualização da extensão recriar também nascem sem EXECUTE para PUBLIC.
alter default privileges for role postgres in schema pgmq revoke execute on functions from public;

create function app.run_queue_name(p_kind public.run_kind)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_kind
    when 'interactive' then 'runs_interactive'
    when 'scheduled' then 'runs_scheduled'
    when 'reflection' then 'memory_reflect'
  end
$$;

-- Enfileira um run em estado queued e devolve o msg_id do pgmq. Uso do papel privilegiado e das funções
-- abaixo; authenticated não executa.
create function app.enqueue_run(p_run_id uuid)
returns bigint
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_run public.runs;
  v_msg_id bigint;
begin
  select r.* into v_run from public.runs r where r.id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  if v_run.status <> 'queued' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = format('Só run em queued entra na fila; este está em %s.', v_run.status);
  end if;

  select pgmq.send(
    app.run_queue_name(v_run.kind),
    jsonb_strip_nulls(jsonb_build_object(
      'run_id', v_run.id,
      'workspace_id', v_run.workspace_id,
      'kind', v_run.kind,
      'agent_id', v_run.agent_id,
      'work_item_id', v_run.work_item_id,
      'conversation_id', v_run.conversation_id
    ))
  ) into v_msg_id;

  return v_msg_id;
end;
$$;

-- Dono de cada delivery do catálogo, pelo prefixo (squad/<agente>/agent.yaml → deliveries).
create function app.delivery_type_agent(p_delivery_type text)
returns public.agent_id
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (case left(p_delivery_type, 3)
    when '01.' then 'nexo'
    when '02.' then 'bia'
    when '03.' then 'kaia'
    when '04.' then 'otto'
    when '05.' then 'kiwi'
    when '06.' then 'max'
    when '07.' then 'iris'
  end)::public.agent_id
$$;

-- Pedido → trabalho: cria o work_item (draft: trabalho criado não é execução iniciada), o run queued e a
-- mensagem na fila runs_interactive, tudo ou nada. Idempotente: a mesma mensagem com o mesmo tipo de
-- delivery (ou a mesma chave explícita) devolve o trabalho já criado, sem segundo run nem segunda
-- mensagem na fila.
create function app.create_work_item_from_message(
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

  insert into public.work_items (
    workspace_id, conversation_id, origin_message_id, title, briefing, delivery_type, status,
    primary_agent_id, idempotency_key, created_by
  ) values (
    v_message.workspace_id, v_message.conversation_id, v_message.id, btrim(p_title),
    coalesce(p_briefing, '{}'::jsonb), p_delivery_type, 'draft', v_agent, v_key, v_user_id
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning * into v_item;

  if not found then
    select w.* into v_item
    from public.work_items w
    where w.workspace_id = v_message.workspace_id and w.idempotency_key = v_key;
    return v_item;
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
      'run_id', v_run.id, 'primary_agent_id', v_item.primary_agent_id
    ))
  );

  return v_item;
end;
$$;

revoke all on function
  app.run_queue_name(public.run_kind),
  app.enqueue_run(uuid),
  app.delivery_type_agent(text),
  app.create_work_item_from_message(uuid, text, text, jsonb, text)
  from public, anon, authenticated, service_role;

grant execute on function app.create_work_item_from_message(uuid, text, text, jsonb, text) to authenticated;
