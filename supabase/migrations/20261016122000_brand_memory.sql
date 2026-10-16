-- S1d — Memória da Marca, camadas 1 e 2 (FLUXOS_DA_V46.md §6 e §8; Arquitetura §5; ADR-0009).
-- brand_facts: o que o squad sabe, por área e assunto, com o estado da V4.6 (KST5), fonte, quem usa, quem
--   percebeu e validade. Correção nunca edita: nasce uma versão nova (supersedes_id) e a anterior ganha
--   superseded_at; um trigger recusa UPDATE de conteúdo. Busca textual por tsvector gerado na
--   configuração do idioma do workspace (portuguese, english, spanish), com GIN.
-- fact_sources: de onde vem (V4.6 SRCST5), com as permissões em texto, como no protótipo.
-- memory_suggestions: "<Agente> percebeu". Não é fato: só vira brand_fact com Confirmar ou Corrigir do
--   owner. Descartada fica registrada e não volta (app.suggest_memory não repete).
-- memory_conflicts: duas versões em uso que dizem coisas diferentes; o squad não usa nenhuma até o owner
--   decidir.
-- run_context_items: o que entrou no contexto de cada run, com motivo e tokens estimados.
-- Mesmo padrão da S1a: workspace_id em tudo, FK composta (workspace_id, id), RLS forçada, authenticated só
-- lê; decisões só por funções app.* SECURITY DEFINER do owner; agente escreve pelo papel privilegiado.

-- ---------------------------------------------------------------------------------------------------
-- Tipos (rótulos exatos da V4.6 no catálogo do backend, i18n/pt-BR.json)
-- ---------------------------------------------------------------------------------------------------

-- AREA5: "Meu negócio", "Minha marca", "Meu público", "Conhecimento e aprendizados".
create type public.memory_area as enum ('business', 'brand', 'audience', 'knowledge');
-- KST5: "Confirmado", "Decisão sua", "Da fonte", "Observado", "Sugerido", "Desatualizado", "Descartado",
-- "Em conflito", "Não usado".
create type public.brand_fact_state as enum (
  'confirmed', 'decision', 'from_source', 'observed', 'suggested', 'outdated', 'discarded', 'conflicting', 'unused'
);
create type public.fact_source_kind as enum (
  'onboarding', 'conversation', 'correction', 'approval', 'file', 'connection', 'agent_observation'
);
-- SRCST5: "Declarado por você", "Conectada", "Desatualizada", "Precisa reconectar", "Não conectada",
-- "Indisponível".
create type public.fact_source_state as enum (
  'declared', 'connected', 'outdated', 'needs_reconnect', 'not_connected', 'unavailable'
);
-- "<Agente> percebeu": aberto → visto → feito.
create type public.memory_suggestion_state as enum ('open', 'seen', 'done');
create type public.memory_suggestion_decision as enum ('confirm', 'correct', 'discard');
create type public.memory_conflict_state as enum ('open', 'resolved');
create type public.memory_conflict_resolution as enum ('keep_a', 'keep_b', 'corrected');
create type public.run_context_kind as enum ('fact', 'suggestion');

-- ---------------------------------------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------------------------------------

create function app.memory_search_config(p_locale text)
returns regconfig
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_locale
    when 'en' then 'pg_catalog.english'::regconfig
    when 'es' then 'pg_catalog.spanish'::regconfig
    else 'pg_catalog.portuguese'::regconfig
  end
$$;

-- Comparação de textos da memória (sugestão repetida, conhecimento já sabido): sem caixa e sem espaço extra.
create function app.memory_norm(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(btrim(p_text), '\s+', ' ', 'g'))
$$;

create function app.memory_clean_content(p_content text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_content text := btrim(coalesce(p_content, ''));
begin
  if v_content = '' then
    raise exception using errcode = 'invalid_parameter_value', message = 'O conhecimento não pode ficar vazio.';
  end if;
  if char_length(v_content) > 4000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'O conhecimento passou de 4.000 caracteres.';
  end if;
  return v_content;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Fontes
-- ---------------------------------------------------------------------------------------------------

create table public.fact_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.fact_source_kind not null,
  name text not null,
  state public.fact_source_state not null,
  permissions text[] not null default '{}',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fact_sources_workspace_id_id_key unique (workspace_id, id),
  constraint fact_sources_name_key unique (workspace_id, kind, name),
  constraint fact_sources_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint fact_sources_permissions_count check (cardinality(permissions) <= 20)
);
comment on table public.fact_sources is 'De onde vem o que o squad sabe (V4.6 SRCST5). Conectar não autoriza agir.';
comment on column public.fact_sources.permissions is 'Em texto, como no protótipo: "Ler posts e métricas", "Publicar só com sua autorização".';
create trigger fact_sources_set_updated_at
  before update on public.fact_sources
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Conhecimentos
-- ---------------------------------------------------------------------------------------------------

create table public.brand_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  area public.memory_area not null,
  topic text not null,
  key text not null,
  content text not null,
  content_json jsonb,
  state public.brand_fact_state not null,
  source_type public.fact_source_kind not null,
  source_id uuid,
  origin text,
  used_by_agents text[] not null default array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris'],
  perceived_by_agent_id public.agent_id,
  confidence numeric(3, 2),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  version integer not null default 1,
  supersedes_id uuid,
  superseded_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  search_config regconfig not null default 'pg_catalog.portuguese',
  search_vector tsvector generated always as (
    setweight(to_tsvector(search_config, key), 'A')
    || setweight(to_tsvector(search_config, content), 'B')
    || setweight(to_tsvector(search_config, topic), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_facts_workspace_id_id_key unique (workspace_id, id),
  constraint brand_facts_source_fk foreign key (workspace_id, source_id)
    references public.fact_sources (workspace_id, id) on delete set null (source_id),
  constraint brand_facts_supersedes_fk foreign key (workspace_id, supersedes_id)
    references public.brand_facts (workspace_id, id),
  constraint brand_facts_topic_length check (char_length(btrim(topic)) between 1 and 80),
  constraint brand_facts_key_length check (char_length(btrim(key)) between 1 and 120),
  constraint brand_facts_content_length check (char_length(btrim(content)) between 1 and 4000),
  constraint brand_facts_origin_length check (char_length(origin) <= 300),
  constraint brand_facts_content_json_shape check (
    content_json is null or jsonb_typeof(content_json) in ('object', 'array')
  ),
  constraint brand_facts_used_by_agents_valid check (
    used_by_agents <@ array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']
  ),
  constraint brand_facts_confidence_range check (confidence between 0 and 1),
  constraint brand_facts_validity check (valid_until is null or valid_until > valid_from),
  constraint brand_facts_version_chain check (version >= 1 and (supersedes_id is null) = (version = 1)),
  constraint brand_facts_confirmed_has_date check (state not in ('confirmed', 'decision') or confirmed_at is not null)
);
comment on table public.brand_facts is 'Memória da Marca (camada 1). Somente versões: corrigir cria linha nova e marca a anterior em superseded_at.';
comment on column public.brand_facts.topic is 'Assunto dentro da área (V4.6 TOPIC5, ex.: "Tom de voz"), no idioma do workspace.';
comment on column public.brand_facts.origin is 'Origem em texto, como na V4.6 ("Ajuste pedido à Kaia · peça de encomendas do panetone").';
comment on column public.brand_facts.superseded_at is 'Nulo = versão atual. Preenchido quando uma versão nova a substitui.';
comment on column public.brand_facts.search_config is 'Configuração da busca textual, do idioma do workspace na criação (ADR-0009).';
create index brand_facts_current_idx on public.brand_facts (workspace_id, state, area) where superseded_at is null;
create index brand_facts_search_idx on public.brand_facts using gin (search_vector);
create unique index brand_facts_supersedes_key on public.brand_facts (supersedes_id) where supersedes_id is not null;
create index brand_facts_source_idx on public.brand_facts (source_id) where source_id is not null;
create index brand_facts_confirmed_by_idx on public.brand_facts (confirmed_by) where confirmed_by is not null;
create index brand_facts_created_by_idx on public.brand_facts (created_by) where created_by is not null;
create trigger brand_facts_set_updated_at
  before update on public.brand_facts
  for each row execute function app.set_updated_at();

-- Na criação, a busca usa o idioma do workspace. Depois, só estado, validade, confirmação e a marca de
-- versão substituída mudam; versão substituída não muda mais.
create function app.brand_facts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.search_config := app.memory_search_config(
      (select w.locale from public.workspaces w where w.id = new.workspace_id)
    );
    return new;
  end if;

  if old.superseded_at is not null then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Esta versão do conhecimento já foi substituída.';
  end if;
  if (new.workspace_id, new.area, new.topic, new.key, new.content, new.content_json, new.source_type,
      new.version, new.supersedes_id, new.search_config, new.created_at)
     is distinct from
     (old.workspace_id, old.area, old.topic, old.key, old.content, old.content_json, old.source_type,
      old.version, old.supersedes_id, old.search_config, old.created_at) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Conhecimento não se edita: a correção cria uma versão nova.';
  end if;
  return new;
end;
$$;

create trigger brand_facts_guard
  before insert or update on public.brand_facts
  for each row execute function app.brand_facts_guard();

-- ---------------------------------------------------------------------------------------------------
-- "<Agente> percebeu"
-- ---------------------------------------------------------------------------------------------------

create table public.memory_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  agent_id public.agent_id not null,
  title text not null,
  explanation text,
  question text,
  origin text,
  area public.memory_area not null,
  topic text not null,
  key text not null,
  content text not null,
  used_by_agents text[] not null default array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris'],
  source_id uuid,
  run_id uuid,
  state public.memory_suggestion_state not null default 'open',
  decision public.memory_suggestion_decision,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  resulting_fact_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_suggestions_workspace_id_id_key unique (workspace_id, id),
  constraint memory_suggestions_source_fk foreign key (workspace_id, source_id)
    references public.fact_sources (workspace_id, id) on delete set null (source_id),
  constraint memory_suggestions_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id),
  constraint memory_suggestions_resulting_fact_fk foreign key (workspace_id, resulting_fact_id)
    references public.brand_facts (workspace_id, id),
  constraint memory_suggestions_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint memory_suggestions_explanation_length check (char_length(explanation) <= 2000),
  constraint memory_suggestions_question_length check (char_length(question) <= 300),
  constraint memory_suggestions_origin_length check (char_length(origin) <= 300),
  constraint memory_suggestions_topic_length check (char_length(btrim(topic)) between 1 and 80),
  constraint memory_suggestions_key_length check (char_length(btrim(key)) between 1 and 120),
  constraint memory_suggestions_content_length check (char_length(btrim(content)) between 1 and 4000),
  constraint memory_suggestions_used_by_agents_valid check (
    used_by_agents <@ array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']
  ),
  constraint memory_suggestions_decided check (
    (decision is null) = (decided_at is null) and (decision is null or state = 'done')
  ),
  constraint memory_suggestions_result check (
    (resulting_fact_id is not null) = (decision is not null and decision <> 'discard')
  )
);
comment on table public.memory_suggestions is '"<Agente> percebeu". Só vira conhecimento com Confirmar ou Corrigir do owner; descartada não volta.';
comment on column public.memory_suggestions.title is 'Leitura curta do agente (ex.: "Posts com bastidores do forno têm mais salvamentos").';
comment on column public.memory_suggestions.question is 'Pergunta ao dono (ex.: "Você prefere preços mais visíveis nas peças promocionais?").';
create index memory_suggestions_workspace_state_idx on public.memory_suggestions (workspace_id, state, created_at desc);
create index memory_suggestions_content_idx on public.memory_suggestions (workspace_id, md5(app.memory_norm(content)));
create index memory_suggestions_run_idx on public.memory_suggestions (run_id) where run_id is not null;
create index memory_suggestions_source_idx on public.memory_suggestions (source_id) where source_id is not null;
create index memory_suggestions_resulting_fact_idx on public.memory_suggestions (resulting_fact_id) where resulting_fact_id is not null;
create index memory_suggestions_decided_by_idx on public.memory_suggestions (decided_by) where decided_by is not null;
create trigger memory_suggestions_set_updated_at
  before update on public.memory_suggestions
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Conflitos
-- ---------------------------------------------------------------------------------------------------

create table public.memory_conflicts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  fact_a_id uuid not null,
  fact_b_id uuid not null,
  state public.memory_conflict_state not null default 'open',
  resolution public.memory_conflict_resolution,
  resulting_fact_id uuid,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_conflicts_workspace_id_id_key unique (workspace_id, id),
  constraint memory_conflicts_fact_a_fk foreign key (workspace_id, fact_a_id)
    references public.brand_facts (workspace_id, id),
  constraint memory_conflicts_fact_b_fk foreign key (workspace_id, fact_b_id)
    references public.brand_facts (workspace_id, id),
  constraint memory_conflicts_resulting_fact_fk foreign key (workspace_id, resulting_fact_id)
    references public.brand_facts (workspace_id, id),
  constraint memory_conflicts_distinct_facts check (fact_a_id <> fact_b_id),
  constraint memory_conflicts_resolved check (
    (state = 'resolved') = (resolution is not null)
    and (resolution is null) = (resolved_at is null)
    and (resolution is null) = (resulting_fact_id is null)
  )
);
comment on table public.memory_conflicts is 'Duas versões em uso que dizem coisas diferentes. Nenhuma é usada até o owner decidir.';
create unique index memory_conflicts_open_pair_key
  on public.memory_conflicts (workspace_id, least(fact_a_id, fact_b_id), greatest(fact_a_id, fact_b_id))
  where state = 'open';
create index memory_conflicts_workspace_state_idx on public.memory_conflicts (workspace_id, state, created_at desc);
create index memory_conflicts_fact_a_idx on public.memory_conflicts (fact_a_id);
create index memory_conflicts_fact_b_idx on public.memory_conflicts (fact_b_id);
create index memory_conflicts_resulting_fact_idx on public.memory_conflicts (resulting_fact_id) where resulting_fact_id is not null;
create index memory_conflicts_resolved_by_idx on public.memory_conflicts (resolved_by) where resolved_by is not null;
create trigger memory_conflicts_set_updated_at
  before update on public.memory_conflicts
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Contexto de cada run (somente inserção)
-- ---------------------------------------------------------------------------------------------------

create table public.run_context_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null,
  kind public.run_context_kind not null,
  fact_id uuid,
  suggestion_id uuid,
  reason text not null,
  rank real,
  tokens integer not null,
  created_at timestamptz not null default now(),
  constraint run_context_items_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete cascade,
  constraint run_context_items_fact_fk foreign key (workspace_id, fact_id)
    references public.brand_facts (workspace_id, id),
  constraint run_context_items_suggestion_fk foreign key (workspace_id, suggestion_id)
    references public.memory_suggestions (workspace_id, id),
  constraint run_context_items_target check (
    (kind = 'fact' and fact_id is not null and suggestion_id is null)
    or (kind = 'suggestion' and suggestion_id is not null and fact_id is null)
  ),
  constraint run_context_items_reason_values check (reason in ('essential', 'search')),
  constraint run_context_items_tokens_non_negative check (tokens >= 0)
);
comment on table public.run_context_items is 'O que entrou no contexto de cada run: essencial (sempre) ou achado pela busca, com tokens estimados.';
create unique index run_context_items_fact_key on public.run_context_items (run_id, fact_id) where fact_id is not null;
create unique index run_context_items_suggestion_key on public.run_context_items (run_id, suggestion_id) where suggestion_id is not null;
create index run_context_items_fact_idx on public.run_context_items (fact_id) where fact_id is not null;
create index run_context_items_suggestion_idx on public.run_context_items (suggestion_id) where suggestion_id is not null;

-- ---------------------------------------------------------------------------------------------------
-- RLS, GRANTs e políticas: authenticated lê o que é dos seus workspaces; nada de escrita direta
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'fact_sources', 'brand_facts', 'memory_suggestions', 'memory_conflicts', 'run_context_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (workspace_id in (select app.current_user_workspace_ids()))',
      v_table || '_select_member', v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Escrita interna (chamada pelas funções do owner e pelo papel privilegiado)
-- ---------------------------------------------------------------------------------------------------

-- Versão nova de um conhecimento, já confirmada por quem corrigiu. A anterior fica no histórico.
create function app.memory_new_version(
  p_fact public.brand_facts,
  p_content text,
  p_user_id uuid,
  p_source_type public.fact_source_kind default 'correction',
  p_perceived_by public.agent_id default null,
  p_origin text default null,
  p_source_id uuid default null
)
returns public.brand_facts
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_new public.brand_facts;
begin
  update public.brand_facts set superseded_at = now() where id = p_fact.id and superseded_at is null;
  if not found then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Este conhecimento já tem uma versão mais nova. Atualize e tente de novo.';
  end if;

  insert into public.brand_facts (
    workspace_id, area, topic, key, content, state, source_type, source_id, origin, used_by_agents,
    perceived_by_agent_id, version, supersedes_id, confirmed_by, confirmed_at, created_by
  ) values (
    p_fact.workspace_id, p_fact.area, p_fact.topic, p_fact.key, p_content, 'confirmed', p_source_type,
    coalesce(p_source_id, case when p_source_type = 'correction' then null else p_fact.source_id end),
    coalesce(p_origin, case when p_source_type = 'correction' then null else p_fact.origin end),
    p_fact.used_by_agents, coalesce(p_perceived_by, p_fact.perceived_by_agent_id), p_fact.version + 1,
    p_fact.id, p_user_id, now(), p_user_id
  )
  returning * into v_new;
  return v_new;
end;
$$;

-- Conhecimento que nasce de uma sugestão (Confirmar ou Corrigir). Se o mesmo assunto e chave já está em
-- uso, vira a versão nova dele, para o squad não seguir duas orientações sobre a mesma coisa.
create function app.memory_fact_from_suggestion(
  p_suggestion public.memory_suggestions,
  p_content text,
  p_source_type public.fact_source_kind,
  p_user_id uuid
)
returns public.brand_facts
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_current public.brand_facts;
  v_new public.brand_facts;
begin
  select f.* into v_current
  from public.brand_facts f
  where f.workspace_id = p_suggestion.workspace_id
    and f.superseded_at is null
    and f.area = p_suggestion.area
    and app.memory_norm(f.topic) = app.memory_norm(p_suggestion.topic)
    and app.memory_norm(f.key) = app.memory_norm(p_suggestion.key)
    and f.state in ('confirmed', 'decision', 'from_source', 'observed', 'outdated')
  order by f.created_at desc, f.id desc
  limit 1
  for update;

  if found then
    return app.memory_new_version(
      v_current, p_content, p_user_id, p_source_type, p_suggestion.agent_id, p_suggestion.origin,
      p_suggestion.source_id
    );
  end if;

  insert into public.brand_facts (
    workspace_id, area, topic, key, content, state, source_type, source_id, origin, used_by_agents,
    perceived_by_agent_id, confirmed_by, confirmed_at, created_by
  ) values (
    p_suggestion.workspace_id, p_suggestion.area, p_suggestion.topic, p_suggestion.key, p_content, 'confirmed',
    p_source_type, p_suggestion.source_id, p_suggestion.origin, p_suggestion.used_by_agents,
    p_suggestion.agent_id, p_user_id, now(), p_user_id
  )
  returning * into v_new;
  return v_new;
end;
$$;

-- Trava a sugestão para a decisão do owner. Fora do acesso ou inexistente: mesma resposta (P0002).
create function app.memory_lock_suggestion(p_suggestion_id uuid)
returns public.memory_suggestions
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_suggestion public.memory_suggestions;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select s.* into v_suggestion
  from public.memory_suggestions s
  where s.id = p_suggestion_id and s.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Sugestão não encontrada.';
  end if;
  if not app.has_role(v_suggestion.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  return v_suggestion;
end;
$$;

create function app.memory_lock_fact(p_fact_id uuid)
returns public.brand_facts
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_fact public.brand_facts;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select f.* into v_fact
  from public.brand_facts f
  where f.id = p_fact_id and f.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conhecimento não encontrado.';
  end if;
  if not app.has_role(v_fact.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  return v_fact;
end;
$$;

create function app.memory_audit(
  p_workspace_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb,
  p_agent_id public.agent_id default null
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id,
    case when p_agent_id is null then 'user' else 'agent' end::public.audit_actor_type,
    coalesce(p_agent_id::text, auth.uid()::text),
    p_action, p_entity_type, p_entity_id::text, jsonb_strip_nulls(p_payload)
  )
$$;

-- ---------------------------------------------------------------------------------------------------
-- Decisões do owner (diretriz de 16/10 08:55: só o owner decide). Repetir a decisão devolve o estado
-- atual, sem erro e sem efeito novo, como app.decide_approval.
-- ---------------------------------------------------------------------------------------------------

create function app.confirm_suggestion(p_suggestion_id uuid)
returns public.memory_suggestions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_suggestion public.memory_suggestions := app.memory_lock_suggestion(p_suggestion_id);
  v_fact public.brand_facts;
begin
  if v_suggestion.decision is not null then
    return v_suggestion;
  end if;

  v_fact := app.memory_fact_from_suggestion(v_suggestion, v_suggestion.content, 'agent_observation', auth.uid());
  update public.memory_suggestions
  set state = 'done', decision = 'confirm', decided_by = auth.uid(), decided_at = now(), resulting_fact_id = v_fact.id
  where id = v_suggestion.id
  returning * into v_suggestion;

  perform app.memory_audit(
    v_suggestion.workspace_id, 'memory.suggestion_decided', 'memory_suggestion', v_suggestion.id,
    jsonb_build_object('decision', 'confirm', 'fact_id', v_fact.id, 'agent_id', v_suggestion.agent_id)
  );
  return v_suggestion;
end;
$$;

create function app.correct_suggestion(p_suggestion_id uuid, p_content text)
returns public.memory_suggestions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_content text := app.memory_clean_content(p_content);
  v_suggestion public.memory_suggestions := app.memory_lock_suggestion(p_suggestion_id);
  v_fact public.brand_facts;
begin
  if v_suggestion.decision is not null then
    return v_suggestion;
  end if;

  v_fact := app.memory_fact_from_suggestion(v_suggestion, v_content, 'correction', auth.uid());
  update public.memory_suggestions
  set state = 'done', decision = 'correct', decided_by = auth.uid(), decided_at = now(), resulting_fact_id = v_fact.id
  where id = v_suggestion.id
  returning * into v_suggestion;

  perform app.memory_audit(
    v_suggestion.workspace_id, 'memory.suggestion_decided', 'memory_suggestion', v_suggestion.id,
    jsonb_build_object('decision', 'correct', 'fact_id', v_fact.id, 'agent_id', v_suggestion.agent_id)
  );
  return v_suggestion;
end;
$$;

create function app.discard_suggestion(p_suggestion_id uuid)
returns public.memory_suggestions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_suggestion public.memory_suggestions := app.memory_lock_suggestion(p_suggestion_id);
begin
  if v_suggestion.decision is not null then
    return v_suggestion;
  end if;

  update public.memory_suggestions
  set state = 'done', decision = 'discard', decided_by = auth.uid(), decided_at = now()
  where id = v_suggestion.id
  returning * into v_suggestion;

  perform app.memory_audit(
    v_suggestion.workspace_id, 'memory.suggestion_decided', 'memory_suggestion', v_suggestion.id,
    jsonb_build_object('decision', 'discard', 'agent_id', v_suggestion.agent_id)
  );
  return v_suggestion;
end;
$$;

-- "Corrigir" (V4.6: todos os estados menos descartado; em conflito, a correção é pelo conflito). O valor
-- novo vira "Confirmado" e a versão anterior fica no histórico. Repetir com o mesmo texto sobre a versão
-- já substituída devolve a versão nova.
create function app.correct_fact(p_fact_id uuid, p_content text)
returns public.brand_facts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_content text := app.memory_clean_content(p_content);
  v_fact public.brand_facts := app.memory_lock_fact(p_fact_id);
  v_next public.brand_facts;
  v_new public.brand_facts;
begin
  if v_fact.superseded_at is not null then
    select f.* into v_next from public.brand_facts f where f.supersedes_id = v_fact.id;
    if found and app.memory_norm(v_next.content) = app.memory_norm(v_content) then
      return v_next;
    end if;
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Este conhecimento já tem uma versão mais nova. Atualize e tente de novo.';
  end if;
  if v_fact.state = 'discarded' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Conhecimento descartado não se corrige.';
  end if;
  if v_fact.state = 'conflicting' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Este conhecimento está em conflito: escolha a versão que vale ou corrija pelo conflito.';
  end if;

  v_new := app.memory_new_version(v_fact, v_content, auth.uid());
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_corrected', 'brand_fact', v_new.id,
    jsonb_build_object('supersedes_id', v_fact.id, 'version', v_new.version)
  );
  return v_new;
end;
$$;

-- "Vale este" (p_keep_fact_id) ou "Nenhum dos dois: corrigir" (p_content). A outra versão sai da memória
-- como "Descartado"; o registro fica.
create function app.resolve_conflict(p_conflict_id uuid, p_keep_fact_id uuid default null, p_content text default null)
returns public.memory_conflicts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conflict public.memory_conflicts;
  v_a public.brand_facts;
  v_result public.brand_facts;
  v_resolution public.memory_conflict_resolution;
  v_other uuid;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select c.* into v_conflict
  from public.memory_conflicts c
  where c.id = p_conflict_id and c.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conflito não encontrado.';
  end if;
  if not app.has_role(v_conflict.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if v_conflict.state = 'resolved' then
    return v_conflict;
  end if;
  if (p_keep_fact_id is null) = (p_content is null) then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Escolha a versão que vale ou escreva a correção, uma das duas.';
  end if;

  if p_keep_fact_id is not null then
    if p_keep_fact_id not in (v_conflict.fact_a_id, v_conflict.fact_b_id) then
      raise exception using errcode = 'invalid_parameter_value', message = 'A versão escolhida não é deste conflito.';
    end if;
    v_resolution := case when p_keep_fact_id = v_conflict.fact_a_id then 'keep_a' else 'keep_b' end;
    v_other := case when p_keep_fact_id = v_conflict.fact_a_id then v_conflict.fact_b_id else v_conflict.fact_a_id end;
    update public.brand_facts
    set state = 'confirmed', confirmed_by = v_user_id, confirmed_at = now()
    where id = p_keep_fact_id
    returning * into v_result;
  else
    select f.* into v_a from public.brand_facts f where f.id = v_conflict.fact_a_id for update;
    v_result := app.memory_new_version(v_a, app.memory_clean_content(p_content), v_user_id);
    v_resolution := 'corrected';
    v_other := v_conflict.fact_b_id;
  end if;

  update public.brand_facts set state = 'discarded' where id = v_other and superseded_at is null;

  update public.memory_conflicts
  set state = 'resolved', resolution = v_resolution, resulting_fact_id = v_result.id, resolved_by = v_user_id,
      resolved_at = now()
  where id = v_conflict.id
  returning * into v_conflict;

  perform app.memory_audit(
    v_conflict.workspace_id, 'memory.conflict_resolved', 'memory_conflict', v_conflict.id,
    jsonb_build_object('resolution', v_resolution, 'fact_id', v_result.id)
  );
  return v_conflict;
end;
$$;

create function app.mark_fact_outdated(p_fact_id uuid)
returns public.brand_facts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fact public.brand_facts := app.memory_lock_fact(p_fact_id);
begin
  if v_fact.superseded_at is not null then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Este conhecimento já tem uma versão mais nova. Atualize e tente de novo.';
  end if;
  if v_fact.state = 'outdated' then
    return v_fact;
  end if;
  if v_fact.state not in ('confirmed', 'decision', 'from_source', 'observed') then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um conhecimento em uso pode ficar desatualizado.';
  end if;

  update public.brand_facts set state = 'outdated' where id = v_fact.id returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_outdated', 'brand_fact', v_fact.id, jsonb_build_object('key', v_fact.key)
  );
  return v_fact;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Escrita dos agentes (só o papel privilegiado: o worker passa o workspace_id da fila)
-- ---------------------------------------------------------------------------------------------------

-- p_state 'suggested' grava a sugestão "<Agente> percebeu" (nunca um conhecimento). 'observed' e
-- 'from_source' gravam o conhecimento direto ("Observado" só como contexto; "Da fonte" em uso, sem
-- confirmação). Resultado:
--   created           sugestão ou conhecimento novo
--   existing          já existe sugestão aberta com o mesmo texto
--   known             o squad já sabe isso (conhecimento atual ou sugestão aceita com o mesmo texto)
--   discarded_before  o dono já descartou isso: não volta
--   conflict          "Da fonte" diz outra coisa sobre a mesma chave em uso: as duas ficam "Em conflito"
create function app.suggest_memory(
  p_workspace_id uuid,
  p_agent_id public.agent_id,
  p_area public.memory_area,
  p_topic text,
  p_key text,
  p_content text,
  p_title text default null,
  p_explanation text default null,
  p_question text default null,
  p_origin text default null,
  p_run_id uuid default null,
  p_source_id uuid default null,
  p_state public.brand_fact_state default 'suggested',
  p_used_by_agents text[] default null
)
returns table (outcome text, suggestion_id uuid, fact_id uuid, conflict_id uuid)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_content text := app.memory_clean_content(p_content);
  v_norm text := app.memory_norm(v_content);
  v_agents text[] := coalesce(p_used_by_agents, array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']);
  v_existing public.memory_suggestions;
  v_fact public.brand_facts;
  v_current public.brand_facts;
  v_source_type public.fact_source_kind := 'agent_observation';
  v_conflict_id uuid;
begin
  if p_state not in ('suggested', 'observed', 'from_source') then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Agente grava só sugestão, conhecimento observado ou lido da fonte.';
  end if;
  if not exists (select 1 from public.workspaces w where w.id = p_workspace_id and w.deleted_at is null) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('memory:' || p_workspace_id::text || ':' || v_norm, 0));

  select f.* into v_fact
  from public.brand_facts f
  where f.workspace_id = p_workspace_id and f.superseded_at is null and app.memory_norm(f.content) = v_norm
  order by f.created_at desc
  limit 1;
  if found then
    return query select 'known'::text, null::uuid, v_fact.id, null::uuid;
    return;
  end if;

  select s.* into v_existing
  from public.memory_suggestions s
  where s.workspace_id = p_workspace_id and md5(app.memory_norm(s.content)) = md5(v_norm)
    and app.memory_norm(s.content) = v_norm
  order by s.created_at desc
  limit 1;
  if found then
    return query select
      case
        when v_existing.decision = 'discard' then 'discarded_before'
        when v_existing.decision is null then 'existing'
        else 'known'
      end,
      v_existing.id, v_existing.resulting_fact_id, null::uuid;
    return;
  end if;

  if p_state = 'suggested' then
    insert into public.memory_suggestions (
      workspace_id, agent_id, title, explanation, question, origin, area, topic, key, content, used_by_agents,
      source_id, run_id
    ) values (
      p_workspace_id, p_agent_id, coalesce(nullif(btrim(p_title), ''), v_content), nullif(btrim(p_explanation), ''),
      nullif(btrim(p_question), ''), nullif(btrim(p_origin), ''), p_area, btrim(p_topic), btrim(p_key), v_content,
      v_agents, p_source_id, p_run_id
    )
    returning * into v_existing;
    perform app.memory_audit(
      p_workspace_id, 'memory.suggested', 'memory_suggestion', v_existing.id,
      jsonb_build_object('run_id', p_run_id, 'key', v_existing.key), p_agent_id
    );
    return query select 'created'::text, v_existing.id, null::uuid, null::uuid;
    return;
  end if;

  if p_state = 'from_source' then
    select coalesce(s.kind, 'connection') into v_source_type
    from (select 1) one
    left join public.fact_sources s on s.id = p_source_id and s.workspace_id = p_workspace_id;

    select f.* into v_current
    from public.brand_facts f
    where f.workspace_id = p_workspace_id
      and f.superseded_at is null
      and f.area = p_area
      and app.memory_norm(f.topic) = app.memory_norm(p_topic)
      and app.memory_norm(f.key) = app.memory_norm(p_key)
      and f.state in ('confirmed', 'decision', 'from_source')
    order by f.created_at desc, f.id desc
    limit 1
    for update;
  end if;

  insert into public.brand_facts (
    workspace_id, area, topic, key, content, state, source_type, source_id, origin, used_by_agents,
    perceived_by_agent_id
  ) values (
    p_workspace_id, p_area, btrim(p_topic), btrim(p_key), v_content,
    case when v_current.id is not null then 'conflicting' else p_state end,
    v_source_type, p_source_id, nullif(btrim(p_origin), ''), v_agents, p_agent_id
  )
  returning * into v_fact;

  if v_current.id is not null then
    update public.brand_facts set state = 'conflicting' where id = v_current.id;
    insert into public.memory_conflicts (workspace_id, fact_a_id, fact_b_id)
    values (p_workspace_id, v_current.id, v_fact.id)
    returning id into v_conflict_id;
  end if;

  perform app.memory_audit(
    p_workspace_id, case when v_conflict_id is null then 'memory.recorded' else 'memory.conflict_opened' end,
    'brand_fact', v_fact.id, jsonb_build_object('state', v_fact.state, 'run_id', p_run_id, 'conflict_id', v_conflict_id),
    p_agent_id
  );
  return query select case when v_conflict_id is null then 'created' else 'conflict' end, null::uuid, v_fact.id, v_conflict_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Realtime: "<Agente> percebeu" criada e decidida no canal workspace:<id> (como approvals na S1a)
-- ---------------------------------------------------------------------------------------------------

create function app.memory_suggestions_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.state is not distinct from old.state and new.decision is not distinct from old.decision then
    return null;
  end if;

  perform app.broadcast_to_workspace(
    new.workspace_id,
    case
      when tg_op = 'INSERT' then 'memory_suggestion.created'
      when new.decision is not null and old.decision is null then 'memory_suggestion.decided'
      else 'memory_suggestion.' || new.state::text
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'id', new.id, 'agent_id', new.agent_id, 'state', new.state, 'decision', new.decision,
      'resulting_fact_id', new.resulting_fact_id, 'run_id', new.run_id, 'decided_at', new.decided_at
    ))
  );
  return null;
end;
$$;

create trigger memory_suggestions_broadcast
  after insert or update of state, decision on public.memory_suggestions
  for each row execute function app.memory_suggestions_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------------------------------------

revoke all on function
  app.memory_search_config(text),
  app.memory_norm(text),
  app.memory_clean_content(text),
  app.brand_facts_guard(),
  app.memory_new_version(public.brand_facts, text, uuid, public.fact_source_kind, public.agent_id, text, uuid),
  app.memory_fact_from_suggestion(public.memory_suggestions, text, public.fact_source_kind, uuid),
  app.memory_lock_suggestion(uuid),
  app.memory_lock_fact(uuid),
  app.memory_audit(uuid, text, text, uuid, jsonb, public.agent_id),
  app.confirm_suggestion(uuid),
  app.correct_suggestion(uuid, text),
  app.discard_suggestion(uuid),
  app.correct_fact(uuid, text),
  app.resolve_conflict(uuid, uuid, text),
  app.mark_fact_outdated(uuid),
  app.suggest_memory(
    uuid, public.agent_id, public.memory_area, text, text, text, text, text, text, text, uuid, uuid,
    public.brand_fact_state, text[]
  ),
  app.memory_suggestions_broadcast()
  from public, anon, authenticated, service_role;

grant execute on function
  app.memory_search_config(text),
  app.confirm_suggestion(uuid),
  app.correct_suggestion(uuid, text),
  app.discard_suggestion(uuid),
  app.correct_fact(uuid, text),
  app.resolve_conflict(uuid, uuid, text),
  app.mark_fact_outdated(uuid)
  to authenticated;
