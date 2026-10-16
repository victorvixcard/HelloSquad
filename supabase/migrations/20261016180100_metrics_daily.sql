-- S2b item 3 — métricas fictícias da Íris (07.02, 07.03 e 07.04: "métricas consolidadas em Supabase",
-- "séries históricas"). Uma linha por workspace, canal, métrica e dia, com unidade e origem declaradas; dia sem
-- linha é dado ausente (nunca zero). Nesta fase a origem é `fonte_de_teste` (seed de DADOS_FICTICIOS.md); as
-- conexões reais (GA4, Instagram, pedidos) gravam aqui na Fase 3.
-- Leitura para todo membro do workspace (RLS forçada); escrita só pelo papel privilegiado (seed, worker,
-- conectores).
-- `metric` como objeto da conversa passa a apontar para a série quando a chave é `<canal>.<métrica>` de uma
-- série que existe no workspace (ex.: `site.sessions`): a Íris fica à frente e o cartão ganha o período e a
-- origem lidos da tabela (o que a pessoa mandar continua valendo). Chave que não é série continua como antes.

create table public.metrics_daily (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel text not null,
  metric text not null,
  day date not null,
  value numeric(14, 2) not null,
  unit text not null,
  source text not null,
  collected_at timestamptz not null default now(),
  constraint metrics_daily_pkey primary key (workspace_id, channel, metric, day),
  constraint metrics_daily_channel_format check (channel ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint metrics_daily_metric_format check (metric ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint metrics_daily_value_positive check (value >= 0),
  constraint metrics_daily_unit_length check (char_length(btrim(unit)) between 1 and 40),
  constraint metrics_daily_source_length check (char_length(btrim(source)) between 1 and 120)
);
comment on table public.metrics_daily is 'Métricas diárias por canal (série histórica da Íris). Dia sem linha é dado ausente, nunca zero.';
comment on column public.metrics_daily.channel is 'Canal (id: site, instagram, store…); o web traduz.';
comment on column public.metrics_daily.metric is 'Métrica (id: sessions, followers, reach, orders…); o web traduz.';
comment on column public.metrics_daily.unit is 'Unidade declarada (sessões, seguidores, pessoas alcançadas, pedidos).';
comment on column public.metrics_daily.source is 'Origem do número (fonte_de_teste nesta fase; GA4, Instagram… na Fase 3).';

create index metrics_daily_workspace_day_idx on public.metrics_daily (workspace_id, day);

alter table public.metrics_daily enable row level security;
alter table public.metrics_daily force row level security;
revoke all on table public.metrics_daily from public, anon, authenticated, service_role;
grant select on table public.metrics_daily to authenticated;
create policy metrics_daily_select_member on public.metrics_daily for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

create or replace function app.create_conversation(
  p_workspace_id uuid,
  p_kind public.conversation_kind,
  p_primary_agent_id public.agent_id default null,
  p_context_type text default null,
  p_context_id uuid default null,
  p_title text default null,
  p_agent_ids public.agent_id[] default null,
  p_context_key text default null,
  p_context_meta jsonb default null
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
  v_key text := nullif(btrim(p_context_key), '');
  v_meta jsonb := '{}'::jsonb;
  v_agents public.agent_id[];
  v_group_key text;
  v_conversation public.conversations;
  v_first_day date;
  v_last_day date;
  v_origin text;
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
  if p_agent_ids is not null and p_kind <> 'group' then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Só a conversa em grupo recebe a lista de especialistas.';
  end if;

  if p_kind = 'object' then
    if p_context_type in ('project', 'work_item', 'delivery', 'memory_fact', 'insight')
       or (p_context_type = 'calendar_post' and p_context_id is not null) then
      if p_context_id is null or v_key is not null then
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
        when 'memory_fact' then
          select coalesce(f.perceived_by_agent_id, 'nexo') into v_context_agent
          from public.brand_facts f where f.id = p_context_id and f.workspace_id = p_workspace_id;
        when 'calendar_post' then
          select p.owner_agent_id into v_context_agent
          from public.calendar_posts p where p.id = p_context_id and p.workspace_id = p_workspace_id;
        else
          select s.agent_id into v_context_agent
          from public.memory_suggestions s where s.id = p_context_id and s.workspace_id = p_workspace_id;
      end case;
      if not found then
        raise exception using errcode = 'no_data_found', message = 'Objeto da conversa não encontrado.';
      end if;
      v_meta := app.conversation_context_meta(p_context_meta, true);
    elsif p_context_type in (
      'calendar_post', 'metric', 'opportunity', 'responsibility', 'segment', 'document', 'capability',
      'environment'
    ) then
      if v_key is null or p_context_id is not null then
        raise exception using
          errcode = 'invalid_parameter_value',
          message = 'Este tipo de objeto chega pela chave (context_key), não pelo id.';
      end if;
      if v_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$' then
        raise exception using errcode = 'invalid_parameter_value', message = 'Chave do objeto inválida.';
      end if;
      v_meta := app.conversation_context_meta(p_context_meta, false);
      if not v_meta ? 'title' then
        raise exception using errcode = 'invalid_parameter_value', message = 'Informe o título do objeto da conversa.';
      end if;
      if p_context_type = 'capability' then
        v_context_agent := app.delivery_type_agent(v_key);
        if v_context_agent is null then
          raise exception using errcode = 'invalid_parameter_value', message = 'Capacidade fora do catálogo.';
        end if;
      elsif p_context_type = 'environment' then
        if v_key not in ('nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris') then
          raise exception using errcode = 'invalid_parameter_value', message = 'Ambiente fora do squad.';
        end if;
        v_context_agent := v_key::public.agent_id;
        if v_agent is not null and v_agent <> v_context_agent then
          raise exception using
            errcode = 'invalid_parameter_value',
            message = 'Na conversa do ambiente, quem responde é o agente do ambiente.';
        end if;
        v_title := coalesce(v_title, v_meta ->> 'title');
      elsif p_context_type = 'metric' and v_key ~ '^[a-z][a-z0-9_]{0,39}\.[a-z][a-z0-9_]{0,39}$' then
        select min(m.day), max(m.day), min(m.source)
          into v_first_day, v_last_day, v_origin
        from public.metrics_daily m
        where m.workspace_id = p_workspace_id
          and m.channel = split_part(v_key, '.', 1) and m.metric = split_part(v_key, '.', 2);
        if v_last_day is not null then
          v_context_agent := 'iris';
          v_meta := jsonb_build_object('period', v_first_day::text || '/' || v_last_day::text, 'origin', v_origin)
            || v_meta;
        end if;
      end if;
    elsif p_context_type is null then
      raise exception using
        errcode = 'invalid_parameter_value',
        message = 'Conversa de objeto precisa do tipo e do id do objeto.';
    else
      raise exception using errcode = 'invalid_parameter_value', message = 'Tipo de objeto não aceito.';
    end if;
    v_agent := coalesce(v_agent, v_context_agent, 'nexo');
  elsif p_context_type is not null or p_context_id is not null or v_key is not null or p_context_meta is not null then
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
  elsif p_kind = 'group' then
    select array_agg(a.agent_id order by a.n) into v_agents
    from unnest(array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']::public.agent_id[])
      with ordinality as a (agent_id, n)
    where a.agent_id = any (p_agent_ids);
    if coalesce(cardinality(v_agents), 0) not between 2 and 6
       or cardinality(v_agents) <> cardinality(p_agent_ids) then
      raise exception using
        errcode = 'invalid_parameter_value',
        message = 'Conversa em grupo precisa de 2 a 6 especialistas diferentes.';
    end if;
    if v_agent is not null and not v_agent = any (v_agents) then
      raise exception using
        errcode = 'invalid_parameter_value',
        message = 'Quem está à frente precisa estar no grupo.';
    end if;
    v_agent := coalesce(v_agent, case when 'nexo' = any (v_agents) then 'nexo' else v_agents[1] end);
    v_group_key := array_to_string(v_agents, ',');
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
  elsif p_kind = 'object' and p_context_id is not null then
    insert into public.conversations (
      workspace_id, kind, primary_agent_id, context_type, context_id, context_meta, title, created_by
    ) values (p_workspace_id, p_kind, v_agent, p_context_type, p_context_id, v_meta, v_title, v_user_id)
    on conflict (workspace_id, context_type, context_id) where kind = 'object' and archived_at is null do nothing
    returning * into v_conversation;
    if not found then
      select c.* into v_conversation
      from public.conversations c
      where c.workspace_id = p_workspace_id and c.kind = 'object' and c.archived_at is null
        and c.context_type = p_context_type and c.context_id = p_context_id;
      return v_conversation;
    end if;
  elsif p_kind = 'object' and p_context_type <> 'capability' then
    insert into public.conversations (
      workspace_id, kind, primary_agent_id, context_type, context_key, context_meta, title, created_by
    ) values (p_workspace_id, p_kind, v_agent, p_context_type, v_key, v_meta, v_title, v_user_id)
    on conflict (workspace_id, context_type, context_key)
      where kind = 'object' and archived_at is null and context_key is not null and context_type <> 'capability'
      do nothing
    returning * into v_conversation;
    if not found then
      select c.* into v_conversation
      from public.conversations c
      where c.workspace_id = p_workspace_id and c.kind = 'object' and c.archived_at is null
        and c.context_type = p_context_type and c.context_key = v_key;
      return v_conversation;
    end if;
  elsif p_kind = 'group' then
    insert into public.conversations (workspace_id, kind, primary_agent_id, group_key, title, created_by)
    values (p_workspace_id, p_kind, v_agent, v_group_key, v_title, v_user_id)
    on conflict (workspace_id, group_key) where kind = 'group' and archived_at is null do nothing
    returning * into v_conversation;
    if not found then
      select c.* into v_conversation
      from public.conversations c
      where c.workspace_id = p_workspace_id and c.kind = 'group' and c.archived_at is null
        and c.group_key = v_group_key;
      return v_conversation;
    end if;
  else
    -- Conversa direta e pedido do catálogo: sempre uma nova.
    insert into public.conversations (
      workspace_id, kind, primary_agent_id, context_type, context_key, context_meta, title, created_by
    ) values (
      p_workspace_id, p_kind, v_agent, case when p_kind = 'object' then p_context_type end,
      case when p_kind = 'object' then v_key end, v_meta, v_title, v_user_id
    )
    returning * into v_conversation;
  end if;

  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, user_id)
  values (p_workspace_id, v_conversation.id, 'user', v_user_id);

  -- Sala do Squad: os sete. Grupo: os escolhidos. Nas outras, o agente à frente.
  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, agent_id)
  select p_workspace_id, v_conversation.id, 'agent', a.agent_id
  from unnest(
    case
      when p_kind = 'squad_room' then array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']::public.agent_id[]
      when p_kind = 'group' then v_agents
      else array_remove(array[v_agent], null)
    end
  ) as a (agent_id);

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, 'conversation.created', 'conversation', v_conversation.id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', v_conversation.kind, 'primary_agent_id', v_conversation.primary_agent_id,
      'context_type', v_conversation.context_type, 'context_id', v_conversation.context_id,
      'context_key', v_conversation.context_key, 'agent_ids', to_jsonb(v_agents)
    ))
  );

  return v_conversation;
end;
$$;
