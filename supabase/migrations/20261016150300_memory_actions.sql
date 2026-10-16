-- S1f — ações da Memória da Marca que o protótipo tem e a S1d deixou de fora (S1d-relatorio §7;
-- FLUXOS_DA_V46.md §6; x1/notas_memoria_autonomo_conexoes.md §A5, §A7, §A11). Todas do owner,
-- idempotentes como as da S1d (repetir devolve o estado atual), com auditoria memory.*.
-- "Não usar mais" (_m5Off, L12983): guarda o estado de antes e vira "Não usado"; "Voltar a usar" devolve.
-- "Confirmar" de "Da fonte" ou "Observado" (_m5Confirm, L12951): vira "Confirmado".
-- "Continua valendo" do desatualizado (L5228): volta a "Da fonte", mantido pelo dono.
-- "Adicionar conhecimento" (_m5AddSave, L13009): entra como declarado pelo dono, já confirmado.
-- Marcar a sugestão como vista: "<Agente> percebeu" aberto → visto.
-- brand_profiles: descrição do negócio (do dono) e síntese do squad (escrita pelo agente) do dossiê.
-- Busca sem acento: configurações de busca com unaccent ("decisao" acha "decisão").

-- ---------------------------------------------------------------------------------------------------
-- Estados
-- ---------------------------------------------------------------------------------------------------

alter table public.brand_facts
  add column unused_from public.brand_fact_state,
  add constraint brand_facts_unused_from check (
    unused_from is null
    or (state = 'unused' and unused_from in ('confirmed', 'decision', 'from_source', 'observed', 'outdated'))
  );
comment on column public.brand_facts.unused_from is 'Estado antes de "Não usar mais"; "Voltar a usar" volta para ele.';

create function app.stop_using_fact(p_fact_id uuid)
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
  if v_fact.state = 'unused' then
    return v_fact;
  end if;
  if v_fact.state not in ('confirmed', 'decision', 'from_source', 'observed', 'outdated') then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um conhecimento em uso pode sair de uso.';
  end if;

  update public.brand_facts set unused_from = state, state = 'unused' where id = v_fact.id returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_unused', 'brand_fact', v_fact.id,
    jsonb_build_object('key', v_fact.key, 'from', v_fact.unused_from)
  );
  return v_fact;
end;
$$;

create function app.resume_using_fact(p_fact_id uuid)
returns public.brand_facts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fact public.brand_facts := app.memory_lock_fact(p_fact_id);
  v_state public.brand_fact_state;
begin
  if v_fact.superseded_at is not null then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Este conhecimento já tem uma versão mais nova. Atualize e tente de novo.';
  end if;
  if v_fact.state in ('confirmed', 'decision', 'from_source', 'observed', 'outdated') then
    return v_fact;
  end if;
  if v_fact.state <> 'unused' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um conhecimento fora de uso volta a ser usado.';
  end if;

  v_state := coalesce(v_fact.unused_from, 'confirmed');
  update public.brand_facts
  set state = v_state, unused_from = null,
      confirmed_by = case when v_state in ('confirmed', 'decision') then coalesce(confirmed_by, auth.uid()) else confirmed_by end,
      confirmed_at = case when v_state in ('confirmed', 'decision') then coalesce(confirmed_at, now()) else confirmed_at end
  where id = v_fact.id
  returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_resumed', 'brand_fact', v_fact.id,
    jsonb_build_object('key', v_fact.key, 'state', v_fact.state)
  );
  return v_fact;
end;
$$;

-- "Confirmar" vale para "Da fonte" e "Observado" (o "Sugerido" se confirma pela sugestão).
create function app.confirm_fact(p_fact_id uuid)
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
  if v_fact.state = 'confirmed' then
    return v_fact;
  end if;
  if v_fact.state not in ('from_source', 'observed') then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um conhecimento da fonte ou observado se confirma aqui.';
  end if;

  update public.brand_facts
  set state = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = v_fact.id
  returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_confirmed', 'brand_fact', v_fact.id, jsonb_build_object('key', v_fact.key)
  );
  return v_fact;
end;
$$;

-- "Continua valendo": o desatualizado volta a "Da fonte", mantido pelo dono.
create function app.keep_fact(p_fact_id uuid)
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
  if v_fact.state = 'from_source' then
    return v_fact;
  end if;
  if v_fact.state <> 'outdated' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um conhecimento desatualizado continua valendo.';
  end if;

  update public.brand_facts set state = 'from_source' where id = v_fact.id returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_kept', 'brand_fact', v_fact.id, jsonb_build_object('key', v_fact.key)
  );
  return v_fact;
end;
$$;

-- "Adicionar conhecimento": declarado pelo dono, já confirmado, para todo o squad. Assunto e chave vêm
-- no idioma do workspace (a API preenche com o catálogo quando a tela não manda).
create function app.add_fact(
  p_workspace_id uuid,
  p_area public.memory_area,
  p_topic text,
  p_key text,
  p_content text
)
returns public.brand_facts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_content text := app.memory_clean_content(p_content);
  v_fact public.brand_facts;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if p_area is null or char_length(btrim(coalesce(p_topic, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_key, ''))) not between 1 and 120 then
    raise exception using errcode = 'invalid_parameter_value', message = 'Informe a área, o assunto e a chave do conhecimento.';
  end if;

  insert into public.brand_facts (
    workspace_id, area, topic, key, content, state, source_type, source_id, confirmed_by, confirmed_at,
    created_by
  ) values (
    p_workspace_id, p_area, btrim(p_topic), btrim(p_key), v_content, 'confirmed', 'correction',
    app.memory_declared_source(p_workspace_id), v_user_id, now(), v_user_id
  )
  returning * into v_fact;
  perform app.memory_audit(
    v_fact.workspace_id, 'memory.fact_added', 'brand_fact', v_fact.id,
    jsonb_build_object('area', v_fact.area, 'topic', v_fact.topic)
  );
  return v_fact;
end;
$$;

create function app.mark_suggestion_seen(p_suggestion_id uuid)
returns public.memory_suggestions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_suggestion public.memory_suggestions := app.memory_lock_suggestion(p_suggestion_id);
begin
  if v_suggestion.state <> 'open' then
    return v_suggestion;
  end if;
  update public.memory_suggestions set state = 'seen' where id = v_suggestion.id returning * into v_suggestion;
  return v_suggestion;
end;
$$;

revoke all on function
  app.stop_using_fact(uuid),
  app.resume_using_fact(uuid),
  app.confirm_fact(uuid),
  app.keep_fact(uuid),
  app.add_fact(uuid, public.memory_area, text, text, text),
  app.mark_suggestion_seen(uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  app.stop_using_fact(uuid),
  app.resume_using_fact(uuid),
  app.confirm_fact(uuid),
  app.keep_fact(uuid),
  app.add_fact(uuid, public.memory_area, text, text, text),
  app.mark_suggestion_seen(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Dossiê: descrição do negócio e síntese do squad
-- ---------------------------------------------------------------------------------------------------

create table public.brand_profiles (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  description text,
  squad_summary text,
  summary_agent_id public.agent_id,
  summary_updated_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_profiles_description_length check (char_length(btrim(description)) between 1 and 600),
  constraint brand_profiles_summary_length check (char_length(btrim(squad_summary)) between 1 and 2000),
  constraint brand_profiles_summary_written check (
    (squad_summary is null) = (summary_updated_at is null) and (squad_summary is null) = (summary_agent_id is null)
  )
);
comment on table public.brand_profiles is 'Dossiê da Memória da Marca: descrição do negócio (do dono) e síntese do squad (do agente).';
create index brand_profiles_updated_by_idx on public.brand_profiles (updated_by) where updated_by is not null;
create trigger brand_profiles_set_updated_at
  before update on public.brand_profiles
  for each row execute function app.set_updated_at();

alter table public.brand_profiles enable row level security;
alter table public.brand_profiles force row level security;
revoke all on table public.brand_profiles from public, anon, authenticated, service_role;
grant select on table public.brand_profiles to authenticated;
create policy brand_profiles_select_member on public.brand_profiles
  for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

create function app.set_brand_description(p_workspace_id uuid, p_description text)
returns public.brand_profiles
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_description text := nullif(btrim(p_description), '');
  v_profile public.brand_profiles;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if char_length(v_description) > 600 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A descrição passou de 600 caracteres.';
  end if;

  insert into public.brand_profiles (workspace_id, description, updated_by)
  values (p_workspace_id, v_description, v_user_id)
  on conflict (workspace_id) do update set description = excluded.description, updated_by = excluded.updated_by
  returning * into v_profile;
  perform app.memory_audit(p_workspace_id, 'memory.profile_described', 'brand_profile', p_workspace_id, '{}'::jsonb);
  return v_profile;
end;
$$;

-- Síntese do squad: quem escreve é o agente (papel privilegiado, com o workspace da fila).
create function app.set_brand_summary(p_workspace_id uuid, p_summary text, p_agent_id public.agent_id)
returns public.brand_profiles
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_summary text := nullif(btrim(p_summary), '');
  v_profile public.brand_profiles;
begin
  insert into public.brand_profiles (workspace_id, squad_summary, summary_agent_id, summary_updated_at)
  values (p_workspace_id, v_summary, case when v_summary is not null then p_agent_id end,
          case when v_summary is not null then now() end)
  on conflict (workspace_id) do update
    set squad_summary = excluded.squad_summary, summary_agent_id = excluded.summary_agent_id,
        summary_updated_at = excluded.summary_updated_at
  returning * into v_profile;
  perform app.memory_audit(
    p_workspace_id, 'memory.summary_written', 'brand_profile', p_workspace_id, '{}'::jsonb, p_agent_id
  );
  return v_profile;
end;
$$;

revoke all on function
  app.set_brand_description(uuid, text),
  app.set_brand_summary(uuid, text, public.agent_id)
  from public, anon, authenticated, service_role;
grant execute on function app.set_brand_description(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Busca sem acento (S1d §7): mesma língua, com unaccent antes do radical
-- ---------------------------------------------------------------------------------------------------

create extension if not exists unaccent with schema extensions;

create text search configuration app.portuguese_unaccent (copy = pg_catalog.portuguese);
alter text search configuration app.portuguese_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;
create text search configuration app.english_unaccent (copy = pg_catalog.english);
alter text search configuration app.english_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, english_stem;
create text search configuration app.spanish_unaccent (copy = pg_catalog.spanish);
alter text search configuration app.spanish_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, spanish_stem;

create or replace function app.memory_search_config(p_locale text)
returns regconfig
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_locale
    when 'en' then 'app.english_unaccent'::regconfig
    when 'es' then 'app.spanish_unaccent'::regconfig
    else 'app.portuguese_unaccent'::regconfig
  end
$$;

-- Os conhecimentos já gravados passam para a configuração nova (o índice gerado é recalculado). A trava de
-- edição fica desligada só para esta troca, que não muda conteúdo, estado nem datas.
alter table public.brand_facts disable trigger brand_facts_guard;
alter table public.brand_facts disable trigger brand_facts_set_updated_at;
update public.brand_facts f
set search_config = app.memory_search_config(w.locale)
from public.workspaces w
where w.id = f.workspace_id;
alter table public.brand_facts enable trigger brand_facts_set_updated_at;
alter table public.brand_facts enable trigger brand_facts_guard;
