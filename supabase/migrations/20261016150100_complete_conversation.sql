-- S1f — conversa completa (FLUXOS_DA_V46.md §4 e §10.1).
-- Grupo: 2 a 6 especialistas, uma conversa por conjunto (reaberta quando o mesmo conjunto é escolhido de
--   novo, como _groupThread na L7130); à frente, o Nexo se participa, senão o primeiro na ordem do squad.
-- Quem responde (app.conversation_speaker), um especialista por vez: "@Nome" de quem participa direciona;
--   no grupo, sem menção, o mais ligado ao pedido pelas palavras do protótipo (GKEYS, L5876–5884; empate
--   fica com o primeiro na ordem) e, sem nenhuma, o Nexo se participa, senão o primeiro (L7141); na Sala
--   do Squad o Nexo distribui; nas outras, quem está à frente. app.request_reply põe na fila o run de
--   resposta (sem trabalho) desse especialista: um por mensagem.
-- Contexto de objeto para os tipos do protótipo. O que já mora no banco é lido de lá (project, work_item,
--   delivery, memory_fact, insight = "<Agente> percebeu"); o que ainda não tem tabela (calendar_post,
--   metric, opportunity, responsibility, segment, document, capability) chega por uma chave, com título e
--   estado no cartão. Período e origem (de onde a pessoa abriu) ficam em context_meta para todos.
--   Capacidade ("Pedido do catálogo") abre uma conversa por pedido: "Mais um, separado do anterior."
-- Tópico da Sala do Squad (escrito pelo agente, como _patchTh na L6827) e leitura por pessoa
--   (conversation_reads → não lidas).

-- ---------------------------------------------------------------------------------------------------
-- Conversas
-- ---------------------------------------------------------------------------------------------------

alter table public.conversations
  add column topic text,
  add column context_key text,
  add column context_meta jsonb not null default '{}'::jsonb,
  add column group_key text,
  drop constraint conversations_context_pair,
  add constraint conversations_context_ref check (
    (context_type is null and context_id is null and context_key is null)
    or (context_type is not null and num_nonnulls(context_id, context_key) = 1)
  ),
  add constraint conversations_context_key_format check (context_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'),
  add constraint conversations_context_meta_object check (jsonb_typeof(context_meta) = 'object'),
  add constraint conversations_topic_room check (topic is null or kind = 'squad_room'),
  add constraint conversations_topic_length check (char_length(btrim(topic)) between 1 and 120),
  add constraint conversations_group_key check ((kind = 'group') = (group_key is not null));

comment on column public.conversations.topic is 'Tópico da Sala do Squad ("Campanha de Natal"); nulo = "Pedidos grandes". Escrito pelo agente.';
comment on column public.conversations.context_key is 'Chave do objeto que ainda não mora no banco (calendar_post, metric, capability…). Exclusivo com context_id.';
comment on column public.conversations.context_meta is 'Cartão de contexto: period e origin (de onde a pessoa abriu) e, para objeto sem tabela, title, status e summary.';
comment on column public.conversations.group_key is 'Conjunto do grupo na ordem do squad (ex.: "bia,kaia,otto"). Só em kind = group.';

create unique index conversations_one_per_object_key_idx on public.conversations (workspace_id, context_type, context_key)
  where kind = 'object' and archived_at is null and context_key is not null and context_type <> 'capability';
create unique index conversations_one_per_group_idx on public.conversations (workspace_id, group_key)
  where kind = 'group' and archived_at is null;

-- Dados do cartão de contexto que vêm de quem abre a conversa. Objeto que mora no banco: título e estado
-- são lidos de lá, então só período, origem e resumo ficam.
create function app.conversation_context_meta(p_meta jsonb, p_backed boolean)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_limits constant jsonb := '{"title": 200, "summary": 500, "status": 60, "period": 80, "origin": 120}';
  v_key text;
  v_value jsonb;
  v_text text;
  v_result jsonb := '{}'::jsonb;
begin
  if p_meta is null then
    return v_result;
  end if;
  if jsonb_typeof(p_meta) <> 'object' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Os dados do contexto precisam ser um objeto JSON.';
  end if;
  for v_key, v_value in select e.key, e.value from jsonb_each(p_meta) as e loop
    if not v_limits ? v_key then
      raise exception using errcode = 'invalid_parameter_value', message = format('Campo de contexto desconhecido: %s.', v_key);
    end if;
    continue when jsonb_typeof(v_value) = 'null';
    if jsonb_typeof(v_value) <> 'string' then
      raise exception using errcode = 'invalid_parameter_value', message = 'Os campos do contexto são texto.';
    end if;
    v_text := btrim(v_value #>> '{}');
    continue when v_text = '';
    if char_length(v_text) > (v_limits ->> v_key)::integer then
      raise exception using
        errcode = 'invalid_parameter_value',
        message = format('O campo %s do contexto passou de %s caracteres.', v_key, v_limits ->> v_key);
    end if;
    continue when p_backed and v_key in ('title', 'status');
    v_result := v_result || jsonb_build_object(v_key, v_text);
  end loop;
  return v_result;
end;
$$;

drop function app.create_conversation(uuid, public.conversation_kind, public.agent_id, text, uuid, text);

create function app.create_conversation(
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
    if p_context_type in ('project', 'work_item', 'delivery', 'memory_fact', 'insight') then
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
        else
          select s.agent_id into v_context_agent
          from public.memory_suggestions s where s.id = p_context_id and s.workspace_id = p_workspace_id;
      end case;
      if not found then
        raise exception using errcode = 'no_data_found', message = 'Objeto da conversa não encontrado.';
      end if;
      v_meta := app.conversation_context_meta(p_context_meta, true);
    elsif p_context_type in (
      'calendar_post', 'metric', 'opportunity', 'responsibility', 'segment', 'document', 'capability'
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

revoke all on function
  app.conversation_context_meta(jsonb, boolean),
  app.create_conversation(uuid, public.conversation_kind, public.agent_id, text, uuid, text, public.agent_id[], text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function
  app.create_conversation(uuid, public.conversation_kind, public.agent_id, text, uuid, text, public.agent_id[], text, jsonb)
  to authenticated;

-- Tópico da Sala do Squad: quem escreve é o agente (papel privilegiado, com o workspace da fila).
create function app.set_conversation_topic(p_workspace_id uuid, p_conversation_id uuid, p_topic text)
returns public.conversations
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  update public.conversations c
  set topic = nullif(btrim(p_topic), '')
  where c.id = p_conversation_id and c.workspace_id = p_workspace_id and c.kind = 'squad_room'
  returning * into v_conversation;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Sala do Squad não encontrada.';
  end if;
  return v_conversation;
end;
$$;

revoke all on function app.set_conversation_topic(uuid, uuid, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Leitura por pessoa: não lidas = mensagens de outros depois de last_read_at
-- ---------------------------------------------------------------------------------------------------

create table public.conversation_reads (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_reads_pkey primary key (conversation_id, user_id),
  constraint conversation_reads_conversation_fk foreign key (workspace_id, conversation_id)
    references public.conversations (workspace_id, id) on delete cascade
);
comment on table public.conversation_reads is 'Até onde cada pessoa leu cada conversa. Cada um vê só a própria leitura.';
create index conversation_reads_user_idx on public.conversation_reads (user_id);
create trigger conversation_reads_set_updated_at
  before update on public.conversation_reads
  for each row execute function app.set_updated_at();

alter table public.conversation_reads enable row level security;
alter table public.conversation_reads force row level security;
revoke all on table public.conversation_reads from public, anon, authenticated, service_role;
grant select on table public.conversation_reads to authenticated;
create policy conversation_reads_select_own on public.conversation_reads
  for select to authenticated
  using (user_id = (select auth.uid()) and workspace_id in (select app.current_user_workspace_ids()));

-- Marcar como lida até p_read_at (a hora da última mensagem que a pessoa viu; padrão: agora). Nunca volta
-- para trás. Vale para qualquer membro, até o viewer: ler não escreve na conversa.
create function app.mark_conversation_read(p_conversation_id uuid, p_read_at timestamptz default null)
returns public.conversation_reads
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_read public.conversation_reads;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id and c.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conversa não encontrada.';
  end if;

  insert into public.conversation_reads (workspace_id, conversation_id, user_id, last_read_at)
  values (v_conversation.workspace_id, v_conversation.id, v_user_id, least(coalesce(p_read_at, now()), now()))
  on conflict (conversation_id, user_id) do update
    set last_read_at = greatest(public.conversation_reads.last_read_at, excluded.last_read_at)
  returning * into v_read;
  return v_read;
end;
$$;

revoke all on function app.mark_conversation_read(uuid, timestamptz) from public, anon, authenticated, service_role;
grant execute on function app.mark_conversation_read(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Quem responde e o run de resposta
-- ---------------------------------------------------------------------------------------------------

-- A mensagem a que o run responde (run de resposta, sem trabalho).
alter table public.runs
  add column message_id uuid,
  add constraint runs_message_fk foreign key (workspace_id, message_id)
    references public.messages (workspace_id, id) on delete set null (message_id);
create index runs_message_idx on public.runs (message_id) where message_id is not null;
comment on column public.runs.message_id is 'Mensagem da pessoa a que o run responde (run de resposta na conversa, sem trabalho).';

create function app.conversation_speaker(p_conversation_id uuid, p_text text)
returns public.agent_id
language plpgsql
stable
set search_path = ''
as $$
declare
  -- GKEYS da V4.6 (L5876–5884), por agente, sobre o texto em minúsculas.
  v_keys constant jsonb := jsonb_build_object(
    'nexo', 'organiz|lan[cç]amento|projeto|prioridad|resumo|pendente|o que precisa',
    'bia', 'estrat|oportunidad|mercado|concorr|posicion|p[uú]blico|entender|pesquis|crescer|promo|oferta',
    'kaia', 'identidade|visual|logo|marca|criativ|pe[cç]a|arte|design|cartaz|capa|post',
    'otto', 'conte[uú]do|legenda|texto|calend[aá]rio|roteiro|reels|instagram|plano|semana',
    'kiwi', 'an[uú]ncio|m[ií]dia|verba|impulsion|tr[aá]fego|s[aá]bado|teste',
    'max', 'client|relacionamento|fideli|e-?mail|whatsapp|reativ|sumiram',
    'iris', 'resultado|m[eé]trica|dados|relat[oó]rio|analis|an[aá]lise|n[uú]mero|encomend|desempenho'
  );
  v_conversation public.conversations;
  v_agents text[];
  v_text text := lower(coalesce(p_text, ''));
  v_mention text;
  v_agent text;
  v_best text;
  v_best_score integer := 0;
  v_score integer;
begin
  select c.* into v_conversation from public.conversations c where c.id = p_conversation_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conversa não encontrada.';
  end if;
  if v_conversation.kind = 'agent_direct' then
    return v_conversation.primary_agent_id;
  end if;

  select array_agg(a.agent_id order by a.n) into v_agents
  from unnest(array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']) with ordinality as a (agent_id, n)
  where exists (
    select 1 from public.conversation_participants p
    where p.conversation_id = v_conversation.id and p.agent_id = a.agent_id
  );
  if v_agents is null then
    return v_conversation.primary_agent_id;
  end if;

  -- "@Nome" de quem participa direciona; a primeira menção vale.
  for v_mention in select translate(m[1], 'í', 'i') from regexp_matches(v_text, '@([[:alpha:]]+)', 'g') as m loop
    if v_mention = any (v_agents) then
      return v_mention::public.agent_id;
    end if;
  end loop;

  if v_conversation.kind = 'group' then
    foreach v_agent in array v_agents loop
      v_score := regexp_count(v_text, v_keys ->> v_agent);
      if v_score > v_best_score then
        v_best := v_agent;
        v_best_score := v_score;
      end if;
    end loop;
    return coalesce(v_best, case when 'nexo' = any (v_agents) then 'nexo' else v_agents[1] end)::public.agent_id;
  end if;

  -- Sala do Squad: o Nexo distribui. Conversa de objeto: quem está à frente.
  return coalesce(v_conversation.primary_agent_id, 'nexo');
end;
$$;

-- Pede a resposta do squad a uma mensagem da pessoa: um run de resposta (sem trabalho) para quem responde,
-- na fila runs_interactive. Idempotente por mensagem. Mensagem que virou trabalho já tem quem responda.
create function app.request_reply(p_message_id uuid)
returns public.runs
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
  v_run public.runs;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select m.* into v_message
  from public.messages m
  where m.id = p_message_id and m.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Mensagem não encontrada.';
  end if;
  if not app.has_role(v_message.workspace_id, 'editor') then
    raise exception using errcode = 'insufficient_privilege', message = 'Seu papel não permite chamar o squad.';
  end if;
  if v_message.author_type <> 'user' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Só mensagem de pessoa pede resposta do squad.';
  end if;

  v_key := 'message:' || v_message.id || ':reply';
  select r.* into v_run from public.runs r where r.workspace_id = v_message.workspace_id and r.idempotency_key = v_key;
  if found then
    return v_run;
  end if;

  select c.* into v_conversation from public.conversations c where c.id = v_message.conversation_id;
  if v_conversation.archived_at is not null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta conversa está arquivada.';
  end if;
  if exists (
    select 1 from public.work_items w
    where w.workspace_id = v_message.workspace_id and w.origin_message_id = v_message.id
  ) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Esta mensagem já virou trabalho: quem responde é o especialista do trabalho.';
  end if;

  insert into public.runs (workspace_id, conversation_id, message_id, agent_id, kind, status, idempotency_key)
  values (
    v_message.workspace_id, v_message.conversation_id, v_message.id,
    app.conversation_speaker(v_message.conversation_id, v_message.body), 'interactive', 'queued', v_key
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning * into v_run;
  if not found then
    select r.* into v_run from public.runs r where r.workspace_id = v_message.workspace_id and r.idempotency_key = v_key;
    return v_run;
  end if;

  perform app.enqueue_run(v_run.id);

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_message.workspace_id, 'user', v_user_id::text, 'conversation.reply_requested', 'run', v_run.id::text,
    jsonb_build_object(
      'conversation_id', v_message.conversation_id, 'message_id', v_message.id, 'agent_id', v_run.agent_id
    )
  );
  return v_run;
end;
$$;

revoke all on function
  app.conversation_speaker(uuid, text),
  app.request_reply(uuid)
  from public, anon, authenticated, service_role;
grant execute on function app.request_reply(uuid) to authenticated;
