-- S1d — correção feita pelo dono conta na fonte "Declarado por você" (V4.6 SRCST5: "Cadastro de 14/09 e
-- correções nas conversas"). Antes a versão corrigida ficava sem fonte e saía da contagem de "De onde vem".

create function app.memory_declared_source(p_workspace_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select s.id
  from public.fact_sources s
  where s.workspace_id = p_workspace_id and s.state = 'declared'
  order by s.created_at, s.id
  limit 1
$$;

create or replace function app.memory_new_version(
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
    case
      when p_source_type = 'correction' then app.memory_declared_source(p_fact.workspace_id)
      else coalesce(p_source_id, p_fact.source_id)
    end,
    coalesce(p_origin, case when p_source_type = 'correction' then null else p_fact.origin end),
    p_fact.used_by_agents, coalesce(p_perceived_by, p_fact.perceived_by_agent_id), p_fact.version + 1,
    p_fact.id, p_user_id, now(), p_user_id
  )
  returning * into v_new;
  return v_new;
end;
$$;

create or replace function app.memory_fact_from_suggestion(
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
    p_source_type,
    case
      when p_source_type = 'correction' then app.memory_declared_source(p_suggestion.workspace_id)
      else p_suggestion.source_id
    end,
    p_suggestion.origin, p_suggestion.used_by_agents, p_suggestion.agent_id, p_user_id, now(), p_user_id
  )
  returning * into v_new;
  return v_new;
end;
$$;

revoke all on function app.memory_declared_source(uuid) from public, anon, authenticated, service_role;
