-- SA3a: squad versionado no banco (docs/SUPER_ADMIN.md §2 "Squad IA" e §3).
--
-- squad_versions: uma linha por versão de cada unidade do squad. Unidade = (kind, agent_id, key):
--   soul   → SOUL.md do agente (o texto mora nas seções, em agent_prompt_sections)
--   skill  → skills/<delivery>.md do agente (texto bruto, com o front matter)
--   config → agent.yaml do agente (texto bruto, com os comentários)
--   shared → README.md (regras compartilhadas), conversa.md e reflexao.md (agent_id nulo)
-- Ciclo: draft (editável, no máximo um por unidade) → active (no máximo uma por unidade; o runtime lê)
-- → superseded. Rascunho também pode ir para discarded. Versão publicada não muda nem se apaga: voltar
-- versão cria uma versão nova com o conteúdo antigo. squad/ vira seed e exportação (hellosquad-squad).
-- agent_prompt_sections: as seções da SOUL de cada versão (identidade, o que faz, como fala, limites,
-- memória, o que nunca faz), com título, texto e "entra no prompt".
-- Escrita só pelas funções app.admin_squad_* (Super Admin, com audit_events) e pelo seed local.
-- Leitura: o worker (papel privilegiado) e o painel (hellosquad_admin com o JWT de um Super Admin).

create table public.squad_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  agent_id public.agent_id,
  key text not null,
  version integer not null,
  status text not null default 'draft',
  body text,
  author text not null,
  author_id uuid references auth.users (id) on delete set null,
  note text,
  restored_from_id uuid references public.squad_versions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  constraint squad_versions_kind check (kind in ('soul', 'skill', 'config', 'shared')),
  constraint squad_versions_agent_scope check ((kind = 'shared') = (agent_id is null)),
  constraint squad_versions_key_format check (
    (kind = 'soul' and key = 'SOUL.md')
    or (kind = 'config' and key = 'agent.yaml')
    or (kind = 'skill' and key ~ '^[0-9]{2}\.[0-9]{2}$')
    or (kind = 'shared' and key in ('README.md', 'conversa.md', 'reflexao.md'))
  ),
  constraint squad_versions_body_by_kind check ((kind = 'soul') = (body is null)),
  constraint squad_versions_status check (status in ('draft', 'active', 'superseded', 'discarded')),
  constraint squad_versions_published check ((status in ('active', 'superseded')) = (published_at is not null)),
  constraint squad_versions_version_positive check (version > 0),
  constraint squad_versions_note_length check (note is null or char_length(note) <= 500),
  constraint squad_versions_unit_version_key unique nulls not distinct (kind, agent_id, key, version),
  constraint squad_versions_id_kind_agent_key unique (id, kind, agent_id)
);
comment on table public.squad_versions is 'Versões do squad (SOUL, skills, agent.yaml, regras compartilhadas). Uma ativa por unidade; publicada é imutável.';
comment on column public.squad_versions.body is 'Texto bruto do arquivo (skill, agent.yaml, README.md, conversa.md, reflexao.md). Nulo na SOUL: o texto mora em agent_prompt_sections.';
comment on column public.squad_versions.restored_from_id is 'Voltar versão: a versão cujo conteúdo esta repete.';

create unique index squad_versions_one_active on public.squad_versions (kind, agent_id, key) nulls not distinct
  where status = 'active';
create unique index squad_versions_one_draft on public.squad_versions (kind, agent_id, key) nulls not distinct
  where status = 'draft';
create index squad_versions_author_id_idx on public.squad_versions (author_id);
create index squad_versions_published_by_idx on public.squad_versions (published_by);
create index squad_versions_restored_from_idx on public.squad_versions (restored_from_id);

create table public.agent_prompt_sections (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null,
  kind text not null default 'soul',
  agent_id public.agent_id not null,
  section text not null,
  position smallint not null,
  heading text not null,
  body text not null,
  in_prompt boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint agent_prompt_sections_version_fk foreign key (version_id, kind, agent_id)
    references public.squad_versions (id, kind, agent_id),
  constraint agent_prompt_sections_kind check (kind = 'soul'),
  constraint agent_prompt_sections_section check (
    section in ('identidade', 'o_que_faz', 'como_fala', 'limites', 'memoria', 'nunca_faz')
  ),
  constraint agent_prompt_sections_position check (position between 1 and 6),
  constraint agent_prompt_sections_heading check (char_length(btrim(heading)) between 1 and 120),
  constraint agent_prompt_sections_body check (char_length(body) <= 20000),
  constraint agent_prompt_sections_version_section_key unique (version_id, section),
  constraint agent_prompt_sections_version_position_key unique (version_id, position)
);
comment on table public.agent_prompt_sections is 'Seções da SOUL por versão (squad_versions kind soul): título, texto e se entra no prompt.';
comment on column public.agent_prompt_sections.heading is 'Título da seção como está no SOUL.md (na identidade, o título do agente, nível 1).';
comment on column public.agent_prompt_sections.in_prompt is 'false = a seção fica no SOUL.md marcada e fora do system prompt.';

-- Rascunho é editável; publicada (active, superseded) e descartada não mudam. Transições:
-- draft → active | discarded; active → superseded. Nada se apaga.
create function app.squad_version_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Versão do squad não se apaga: descarte o rascunho ou publique outra versão.';
  end if;
  if old.status = 'draft' then
    if new.status not in ('draft', 'active', 'discarded')
       or (new.kind, new.agent_id, new.key, new.version, new.author_id, new.restored_from_id, new.created_at)
          is distinct from (old.kind, old.agent_id, old.key, old.version, old.author_id, old.restored_from_id, old.created_at) then
      raise exception using
        errcode = 'insufficient_privilege',
        message = 'Rascunho do squad: só o conteúdo muda, e ele só vai para publicado ou descartado.';
    end if;
    return new;
  end if;
  if old.status = 'active' and new.status = 'superseded'
     and (to_jsonb(new) - array['status', 'updated_at']) = (to_jsonb(old) - array['status', 'updated_at']) then
    return new;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'Versão publicada do squad é imutável: crie uma versão nova.';
end;
$$;

create trigger squad_versions_guard
  before update or delete on public.squad_versions
  for each row execute function app.squad_version_guard();

create function app.agent_prompt_section_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select v.status into v_status
  from public.squad_versions v
  where v.id = case when tg_op = 'INSERT' then new.version_id else old.version_id end;
  if tg_op = 'INSERT' and v_status = 'draft' then
    return new;
  end if;
  if tg_op = 'UPDATE' and v_status = 'draft'
     and (new.version_id, new.agent_id, new.section, new.position) = (old.version_id, old.agent_id, old.section, old.position) then
    return new;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'Seção de versão publicada da SOUL é imutável: crie uma versão nova.';
end;
$$;

create trigger agent_prompt_sections_guard
  before insert or update or delete on public.agent_prompt_sections
  for each row execute function app.agent_prompt_section_guard();

-- Cada run registra de quais versões do banco o prompt saiu (ou que veio dos arquivos de squad/).
alter table public.agent_prompt_versions
  add column origin text not null default 'files',
  add column sources jsonb not null default '[]'::jsonb,
  add constraint agent_prompt_versions_origin check (origin in ('files', 'database')),
  add constraint agent_prompt_versions_sources_array check (jsonb_typeof(sources) = 'array');
comment on column public.agent_prompt_versions.origin is 'database = montado das versões ativas do banco (SA3a); files = lido de squad/ (fallback com o banco vazio).';
comment on column public.agent_prompt_versions.sources is 'Versões usadas: [{"id", "kind", "key", "version"}] de squad_versions.';

-- ---------------------------------------------------------------------------------------------------
-- Segurança: RLS forçada; Data API sem acesso; o painel só lê com o JWT de um Super Admin.
-- ---------------------------------------------------------------------------------------------------

alter table public.squad_versions enable row level security;
alter table public.squad_versions force row level security;
alter table public.agent_prompt_sections enable row level security;
alter table public.agent_prompt_sections force row level security;
revoke all on table public.squad_versions from public, anon, authenticated, service_role;
revoke all on table public.agent_prompt_sections from public, anon, authenticated, service_role;

grant select on table public.squad_versions, public.agent_prompt_sections, public.agent_prompt_versions
  to hellosquad_admin;
create policy squad_versions_platform_admin_read on public.squad_versions
  for select to hellosquad_admin using ((select app.is_platform_admin()));
create policy agent_prompt_sections_platform_admin_read on public.agent_prompt_sections
  for select to hellosquad_admin using ((select app.is_platform_admin()));
create policy agent_prompt_versions_platform_admin_read on public.agent_prompt_versions
  for select to hellosquad_admin using ((select app.is_platform_admin()));

-- ---------------------------------------------------------------------------------------------------
-- Escrita do painel: rascunho, publicar, descartar, voltar versão. Toda chamada vira audit_events.
-- ---------------------------------------------------------------------------------------------------

create function app.admin_author_label()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), u.email::text, 'Super Admin')
  from auth.users u
  where u.id = (select auth.uid())
$$;
revoke all on function app.admin_author_label() from public, anon, authenticated, service_role;

create function app.squad_unit_lock(p_kind text, p_agent_id public.agent_id, p_key text)
returns void
language sql
volatile
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('squad:' || p_kind || ':' || coalesce(p_agent_id::text, '-') || ':' || p_key, 0))
$$;
revoke all on function app.squad_unit_lock(text, public.agent_id, text) from public, anon, authenticated, service_role;

-- Grava o rascunho da unidade (cria na primeira edição, atualiza nas seguintes). p_sections (só na
-- SOUL): as seis seções [{"section", "position", "heading", "body", "in_prompt"}].
create function app.admin_squad_save_draft(
  p_kind text,
  p_agent_id public.agent_id,
  p_key text,
  p_body text,
  p_sections jsonb,
  p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_draft public.squad_versions;
  v_created boolean := false;
  v_count integer;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin edita o squad.';
  end if;
  if p_kind = 'soul' then
    select count(distinct s.section) into v_count
    from jsonb_to_recordset(coalesce(p_sections, '[]'::jsonb)) as s (section text);
    if v_count <> 6 or jsonb_array_length(p_sections) <> 6 then
      raise exception using errcode = 'invalid_parameter_value', message = 'A SOUL tem seis seções, todas no rascunho.';
    end if;
  end if;
  perform app.squad_unit_lock(p_kind, p_agent_id, p_key);

  select * into v_draft
  from public.squad_versions v
  where v.kind = p_kind and v.agent_id is not distinct from p_agent_id and v.key = p_key and v.status = 'draft';

  if not found then
    insert into public.squad_versions (kind, agent_id, key, version, status, body, author, author_id, note)
    select p_kind, p_agent_id, p_key, coalesce(max(v.version), 0) + 1, 'draft',
           case when p_kind = 'soul' then null else p_body end,
           app.admin_author_label(), (select auth.uid()), p_note
    from public.squad_versions v
    where v.kind = p_kind and v.agent_id is not distinct from p_agent_id and v.key = p_key
    returning * into v_draft;
    v_created := true;
    if p_kind = 'soul' then
      insert into public.agent_prompt_sections (version_id, agent_id, section, position, heading, body, in_prompt)
      select v_draft.id, p_agent_id, s.section, s.position, s.heading, s.body, coalesce(s.in_prompt, true)
      from jsonb_to_recordset(p_sections) as s (section text, position smallint, heading text, body text, in_prompt boolean);
    end if;
  else
    update public.squad_versions v
    set body = case when p_kind = 'soul' then null else p_body end,
        note = coalesce(p_note, v.note),
        updated_at = now()
    where v.id = v_draft.id
    returning * into v_draft;
    if p_kind = 'soul' then
      update public.agent_prompt_sections a
      set heading = s.heading, body = s.body, in_prompt = coalesce(s.in_prompt, true), updated_at = now()
      from jsonb_to_recordset(p_sections) as s (section text, heading text, body text, in_prompt boolean)
      where a.version_id = v_draft.id and a.section = s.section;
    end if;
  end if;

  perform app.admin_audit(
    'squad.draft_saved', null, 'squad_version', v_draft.id::text,
    jsonb_build_object('kind', p_kind, 'agent_id', p_agent_id, 'key', p_key, 'version', v_draft.version,
                       'created', v_created, 'note', p_note)
  );
  return v_draft.id;
end;
$$;

-- Ativa a versão p_version_id da unidade: a ativa vira superseded. Usado por publicar e por voltar.
create function app.squad_activate(p_version_id uuid, p_published_by uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v public.squad_versions;
  v_previous integer;
begin
  select * into v from public.squad_versions where id = p_version_id;
  update public.squad_versions a
  set status = 'superseded', updated_at = now()
  where a.kind = v.kind and a.agent_id is not distinct from v.agent_id and a.key = v.key and a.status = 'active'
  returning a.version into v_previous;
  update public.squad_versions a
  set status = 'active', published_at = now(), published_by = p_published_by, updated_at = now()
  where a.id = p_version_id;
  return v_previous;
end;
$$;
revoke all on function app.squad_activate(uuid, uuid) from public, anon, authenticated, service_role;

create function app.admin_squad_publish(p_version_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.squad_versions;
  v_previous integer;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin publica versão do squad.';
  end if;
  select * into v from public.squad_versions where id = p_version_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Versão do squad não encontrada.';
  end if;
  perform app.squad_unit_lock(v.kind, v.agent_id, v.key);
  select * into v from public.squad_versions where id = p_version_id;
  if v.status <> 'draft' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só rascunho se publica.';
  end if;
  v_previous := app.squad_activate(v.id, (select auth.uid()));
  perform app.admin_audit(
    'squad.version_published', null, 'squad_version', v.id::text,
    jsonb_build_object('kind', v.kind, 'agent_id', v.agent_id, 'key', v.key, 'version', v.version,
                       'previous_version', v_previous)
  );
  return v.id;
end;
$$;

create function app.admin_squad_discard(p_version_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.squad_versions;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin descarta rascunho do squad.';
  end if;
  select * into v from public.squad_versions where id = p_version_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Versão do squad não encontrada.';
  end if;
  perform app.squad_unit_lock(v.kind, v.agent_id, v.key);
  select * into v from public.squad_versions where id = p_version_id;
  if v.status <> 'draft' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só rascunho se descarta.';
  end if;
  update public.squad_versions set status = 'discarded', updated_at = now() where id = v.id;
  perform app.admin_audit(
    'squad.draft_discarded', null, 'squad_version', v.id::text,
    jsonb_build_object('kind', v.kind, 'agent_id', v.agent_id, 'key', v.key, 'version', v.version)
  );
  return v.id;
end;
$$;

-- Voltar versão: versão nova, já ativa, com o conteúdo de uma versão publicada antes. Com rascunho
-- pendente na unidade, recusa (publicar ou descartar primeiro).
create function app.admin_squad_restore(p_version_id uuid, p_note text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source public.squad_versions;
  v_new public.squad_versions;
  v_previous integer;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin volta versão do squad.';
  end if;
  select * into v_source from public.squad_versions where id = p_version_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Versão do squad não encontrada.';
  end if;
  perform app.squad_unit_lock(v_source.kind, v_source.agent_id, v_source.key);
  select * into v_source from public.squad_versions where id = p_version_id;
  if v_source.status <> 'superseded' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só se volta para uma versão publicada antes (não a ativa, nem rascunho ou descartada).';
  end if;
  if exists (
    select 1 from public.squad_versions d
    where d.kind = v_source.kind and d.agent_id is not distinct from v_source.agent_id
      and d.key = v_source.key and d.status = 'draft'
  ) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Há um rascunho pendente nesta unidade: publique ou descarte antes de voltar versão.',
      detail = 'squad_draft_pending';
  end if;

  insert into public.squad_versions (kind, agent_id, key, version, status, body, author, author_id, note, restored_from_id)
  select v_source.kind, v_source.agent_id, v_source.key, max(v.version) + 1, 'draft', v_source.body,
         app.admin_author_label(), (select auth.uid()),
         coalesce(p_note, 'Volta ao conteúdo da versão ' || v_source.version || '.'), v_source.id
  from public.squad_versions v
  where v.kind = v_source.kind and v.agent_id is not distinct from v_source.agent_id and v.key = v_source.key
  returning * into v_new;
  if v_source.kind = 'soul' then
    insert into public.agent_prompt_sections (version_id, agent_id, section, position, heading, body, in_prompt)
    select v_new.id, s.agent_id, s.section, s.position, s.heading, s.body, s.in_prompt
    from public.agent_prompt_sections s
    where s.version_id = v_source.id;
  end if;
  v_previous := app.squad_activate(v_new.id, (select auth.uid()));
  perform app.admin_audit(
    'squad.version_restored', null, 'squad_version', v_new.id::text,
    jsonb_build_object('kind', v_new.kind, 'agent_id', v_new.agent_id, 'key', v_new.key, 'version', v_new.version,
                       'restored_from_version', v_source.version, 'previous_version', v_previous)
  );
  return v_new.id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Regras de negócio: versão nova a cada gravação (a mais recente vale), marcação por parágrafo.
-- ---------------------------------------------------------------------------------------------------

create function app.admin_rule_doc_save(
  p_doc_id uuid,
  p_paragraphs jsonb,
  p_in_prompt boolean,
  p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_doc public.business_rule_docs;
  v_version public.business_rule_doc_versions;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin edita regras de negócio.';
  end if;
  select * into v_doc from public.business_rule_docs where id = p_doc_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Documento de regras não encontrado.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_paragraphs) p
    where jsonb_typeof(p) <> 'object'
       or coalesce(p ->> 'mark', '') not in ('decided', 'current_base', 'pending', 'proposal')
       or char_length(btrim(coalesce(p ->> 'text', ''))) = 0
  ) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Parágrafo sem marcação válida ou sem texto.';
  end if;
  insert into public.business_rule_doc_versions (doc_id, version, paragraphs, author, change_note, created_by)
  select v_doc.id, coalesce(max(v.version), 0) + 1, p_paragraphs, app.admin_author_label(), p_note, (select auth.uid())
  from public.business_rule_doc_versions v
  where v.doc_id = v_doc.id
  returning * into v_version;
  if p_in_prompt is not null and p_in_prompt <> v_doc.in_prompt then
    update public.business_rule_docs set in_prompt = p_in_prompt where id = v_doc.id;
  end if;
  perform app.admin_audit(
    'rules.version_saved', null, 'business_rule_doc', v_doc.id::text,
    jsonb_build_object('slug', v_doc.slug, 'version', v_version.version, 'in_prompt', coalesce(p_in_prompt, v_doc.in_prompt),
                       'paragraphs', jsonb_array_length(p_paragraphs), 'note', p_note)
  );
  return v_version.id;
end;
$$;

revoke all on function app.admin_squad_save_draft(text, public.agent_id, text, text, jsonb, text) from public, anon, authenticated, service_role;
revoke all on function app.admin_squad_publish(uuid) from public, anon, authenticated, service_role;
revoke all on function app.admin_squad_discard(uuid) from public, anon, authenticated, service_role;
revoke all on function app.admin_squad_restore(uuid, text) from public, anon, authenticated, service_role;
revoke all on function app.admin_rule_doc_save(uuid, jsonb, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_squad_save_draft(text, public.agent_id, text, text, jsonb, text) to hellosquad_admin;
grant execute on function app.admin_squad_publish(uuid) to hellosquad_admin;
grant execute on function app.admin_squad_discard(uuid) to hellosquad_admin;
grant execute on function app.admin_squad_restore(uuid, text) to hellosquad_admin;
grant execute on function app.admin_rule_doc_save(uuid, jsonb, boolean, text) to hellosquad_admin;
