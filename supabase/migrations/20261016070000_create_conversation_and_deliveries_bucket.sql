-- S1b — caminho de escrita do usuário em conversations e bucket privado das entregas no Storage.
-- app.create_conversation é buscar ou criar: a Sala do Squad (uma ativa por workspace) e a conversa de um
-- objeto (uma ativa por objeto) são reutilizadas; a conversa direta com um agente sempre nasce nova.
-- O objeto de contexto precisa existir no mesmo workspace (tipos conhecidos: project, work_item,
-- delivery); tipo novo de objeto exige migration.

create function app.create_conversation(
  p_workspace_id uuid,
  p_kind public.conversation_kind,
  p_primary_agent_id public.agent_id default null,
  p_context_type text default null,
  p_context_id uuid default null,
  p_title text default null
)
returns public.conversations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := nullif(btrim(p_title), '');
  v_agent public.agent_id := p_primary_agent_id;
  v_context_agent public.agent_id;
  v_conversation public.conversations;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite abrir conversas.';
  end if;
  if p_kind is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Informe o tipo da conversa.';
  end if;
  if char_length(v_title) > 200 then
    raise exception using errcode = 'invalid_parameter_value', message = 'O título passou de 200 caracteres.';
  end if;

  if p_kind = 'object' then
    if p_context_type is null or p_context_id is null then
      raise exception using
        errcode = 'invalid_parameter_value',
        message = 'Conversa de objeto precisa do tipo e do id do objeto.';
    end if;

    case p_context_type
      when 'project' then
        select p.owner_agent_id into v_context_agent
        from public.projects p where p.id = p_context_id and p.workspace_id = p_workspace_id;
      when 'work_item' then
        select w.primary_agent_id into v_context_agent
        from public.work_items w where w.id = p_context_id and w.workspace_id = p_workspace_id;
      when 'delivery' then
        select w.primary_agent_id into v_context_agent
        from public.deliveries d
        join public.work_items w on w.id = d.work_item_id and w.workspace_id = d.workspace_id
        where d.id = p_context_id and d.workspace_id = p_workspace_id;
      else
        raise exception using
          errcode = 'invalid_parameter_value',
          message = 'Tipo de objeto não aceito (project, work_item ou delivery).';
    end case;
    if not found then
      raise exception using errcode = 'no_data_found', message = 'Objeto da conversa não encontrado.';
    end if;
    v_agent := coalesce(v_agent, v_context_agent);
  elsif p_context_type is not null or p_context_id is not null then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Só conversa do tipo object tem objeto de contexto.';
  elsif p_kind = 'agent_direct' and v_agent is null then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Conversa direta precisa do agente.';
  elsif p_kind = 'squad_room' then
    v_agent := coalesce(v_agent, 'nexo');
    v_title := coalesce(v_title, 'Sala do Squad');
  end if;

  if p_kind = 'squad_room' then
    insert into public.conversations (workspace_id, kind, primary_agent_id, title, created_by)
    values (p_workspace_id, p_kind, v_agent, v_title, v_user_id)
    on conflict (workspace_id) where kind = 'squad_room' and archived_at is null do nothing
    returning * into v_conversation;
    if not found then
      select c.* into v_conversation
      from public.conversations c
      where c.workspace_id = p_workspace_id and c.kind = 'squad_room' and c.archived_at is null;
      return v_conversation;
    end if;
  elsif p_kind = 'object' then
    insert into public.conversations (workspace_id, kind, primary_agent_id, context_type, context_id, title, created_by)
    values (p_workspace_id, p_kind, v_agent, p_context_type, p_context_id, v_title, v_user_id)
    on conflict (workspace_id, context_type, context_id) where kind = 'object' and archived_at is null do nothing
    returning * into v_conversation;
    if not found then
      select c.* into v_conversation
      from public.conversations c
      where c.workspace_id = p_workspace_id and c.kind = 'object' and c.archived_at is null
        and c.context_type = p_context_type and c.context_id = p_context_id;
      return v_conversation;
    end if;
  else
    insert into public.conversations (workspace_id, kind, primary_agent_id, title, created_by)
    values (p_workspace_id, p_kind, v_agent, v_title, v_user_id)
    returning * into v_conversation;
  end if;

  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, user_id)
  values (p_workspace_id, v_conversation.id, 'user', v_user_id);

  -- Sala do Squad: os sete agentes participam. Nas outras, o agente principal (se houver).
  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, agent_id)
  select p_workspace_id, v_conversation.id, 'agent', a.agent_id
  from unnest(
    case when p_kind = 'squad_room'
      then array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']::public.agent_id[]
      else array_remove(array[v_agent], null)
    end
  ) as a (agent_id);

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, 'conversation.created', 'conversation', v_conversation.id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', v_conversation.kind, 'primary_agent_id', v_conversation.primary_agent_id,
      'context_type', v_conversation.context_type, 'context_id', v_conversation.context_id
    ))
  );

  return v_conversation;
end;
$$;

revoke all on function
  app.create_conversation(uuid, public.conversation_kind, public.agent_id, text, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function
  app.create_conversation(uuid, public.conversation_kind, public.agent_id, text, uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Storage: bucket privado das entregas
-- ---------------------------------------------------------------------------------------------------

-- Caminho: <workspace_id>/deliveries/<delivery_id>/<version_no>/<arquivo> (o mesmo de delivery_files).
-- Membro do workspace lê pelo prefixo; ninguém escreve pela API do Storage com token de usuário (sem
-- política de INSERT/UPDATE/DELETE): o papel privilegiado (worker) grava os arquivos.
insert into storage.buckets (id, name, public)
values ('deliveries', 'deliveries', false)
on conflict (id) do update set public = false;

-- Compara texto com texto: nome fora do padrão não quebra a consulta, só não casa.
create policy deliveries_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deliveries'
    and (storage.foldername(name))[1] in (select w::text from app.current_user_workspace_ids() as w)
  );
