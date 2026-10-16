-- S2c — Memória camada 3: reflexão depois de cada trabalho fechado e aprendizados por cliente
-- (Arquitetura §5.3, ADR-0006).
--
-- Quando um trabalho fecha (aprovado, aprovado depois de ajuste, recusado com nova proposta ou com
-- cancelamento, cancelado), app.enqueue_reflection grava o job em memory_reflections e manda a mensagem
-- para a fila memory_reflect (pgmq; o nome memory.reflect da arquitetura sem o ponto, que o pgmq recusa),
-- com o trabalho, o desfecho e as referências: briefing, versões, correções da pessoa e decisão.
-- A reflexão não é um run do agente: não aparece no status do squad nem na lista de runs do trabalho,
-- não conta no teto por workspace e não cobra crédito; o custo do modelo fica na própria reflexão.
--
-- O worker lê o fechamento e grava aprendizados por app.record_learning (só o papel privilegiado).
-- agent_learnings é somente inserção com substituição: o texto e a evidência nunca mudam; evidência nova
-- sobre o mesmo assunto cria uma versão nova e a anterior fica no histórico. Promoção:
--   correção explícita da pessoa, com confiança mínima → promovido (regra explicit_correction);
--   a mesma lição em N trabalhos diferentes → promovido (regra repeated, Arquitetura §5.3);
--   senão → candidato, fora do contexto até o owner promover.
-- O owner promove, descarta ou diz que continua valendo. Aprendizado nunca vira regra da Memória da
-- Marca (camada 1): isso continua exigindo a confirmação da pessoa.

create type public.reflection_outcome as enum (
  'approved', 'approved_with_edits', 'rejected_revise', 'rejected_cancel', 'cancelled'
);
create type public.reflection_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.agent_learning_status as enum ('candidate', 'promoted', 'discarded');

-- ---------------------------------------------------------------------------------------------------
-- Reflexão: o job da fila memory_reflect
-- ---------------------------------------------------------------------------------------------------

create table public.memory_reflections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  work_item_id uuid not null,
  agent_id public.agent_id not null,
  delivery_type text not null,
  outcome public.reflection_outcome not null,
  approval_id uuid,
  idempotency_key text not null,
  refs jsonb not null,
  status public.reflection_status not null default 'queued',
  attempts integer not null default 0,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(14, 6) not null default 0,
  diff jsonb,
  summary text,
  learnings_count integer not null default 0,
  error jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint memory_reflections_workspace_id_id_key unique (workspace_id, id),
  constraint memory_reflections_idempotency_key unique (workspace_id, idempotency_key),
  constraint memory_reflections_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  constraint memory_reflections_approval_fk foreign key (workspace_id, approval_id)
    references public.approvals (workspace_id, id) on delete set null (approval_id),
  constraint memory_reflections_delivery_type_format check (delivery_type ~ '^[0-9]{2}\.[0-9]{2}$'),
  constraint memory_reflections_refs_object check (jsonb_typeof(refs) = 'object'),
  constraint memory_reflections_diff_array check (diff is null or jsonb_typeof(diff) = 'array'),
  constraint memory_reflections_error_object check (error is null or jsonb_typeof(error) = 'object'),
  constraint memory_reflections_summary_length check (char_length(summary) <= 2000),
  constraint memory_reflections_attempts_non_negative check (attempts >= 0),
  constraint memory_reflections_learnings_non_negative check (learnings_count >= 0),
  constraint memory_reflections_tokens_non_negative check (input_tokens >= 0 and output_tokens >= 0),
  constraint memory_reflections_cost_non_negative check (cost_usd >= 0)
);
comment on table public.memory_reflections is 'Reflexão de um trabalho fechado (fila memory_reflect): desfecho, referências, custo do modelo e quantos aprendizados gerou.';
create index memory_reflections_work_item_idx on public.memory_reflections (work_item_id);
create index memory_reflections_approval_idx on public.memory_reflections (approval_id) where approval_id is not null;
create trigger memory_reflections_set_updated_at
  before update on public.memory_reflections
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Aprendizados por cliente (workspace × agente × delivery)
-- ---------------------------------------------------------------------------------------------------

create table public.agent_learnings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  agent_id public.agent_id not null,
  delivery_type text not null,
  topic text not null,
  learning text not null,
  evidence_refs jsonb not null,
  confidence numeric(3, 2) not null,
  status public.agent_learning_status not null default 'candidate',
  promotion_rule text,
  reflection_id uuid,
  work_item_id uuid,
  version integer not null default 1,
  supersedes_id uuid,
  superseded_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  search_config regconfig not null default 'pg_catalog.portuguese',
  search_vector tsvector generated always as (
    setweight(to_tsvector(search_config, topic), 'A')
    || setweight(to_tsvector(search_config, learning), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_learnings_workspace_id_id_key unique (workspace_id, id),
  constraint agent_learnings_reflection_fk foreign key (workspace_id, reflection_id)
    references public.memory_reflections (workspace_id, id) on delete set null (reflection_id),
  constraint agent_learnings_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete set null (work_item_id),
  constraint agent_learnings_supersedes_fk foreign key (workspace_id, supersedes_id)
    references public.agent_learnings (workspace_id, id),
  constraint agent_learnings_delivery_type_format check (delivery_type ~ '^[0-9]{2}\.[0-9]{2}$'),
  constraint agent_learnings_topic_length check (char_length(btrim(topic)) between 1 and 80),
  constraint agent_learnings_learning_length check (char_length(btrim(learning)) between 1 and 500),
  constraint agent_learnings_evidence_array check (
    jsonb_typeof(evidence_refs) = 'array' and jsonb_array_length(evidence_refs) >= 1
  ),
  constraint agent_learnings_confidence_range check (confidence between 0 and 1),
  constraint agent_learnings_promotion_rule_values check (
    promotion_rule in ('explicit_correction', 'repeated', 'owner')
  ),
  constraint agent_learnings_promoted_has_rule check (status <> 'promoted' or promotion_rule is not null),
  constraint agent_learnings_version_positive check (version > 0),
  constraint agent_learnings_supersedes_version check ((version = 1) = (supersedes_id is null))
);
comment on table public.agent_learnings is 'Camada 3: o que o agente aprendeu com este cliente numa delivery. Somente inserção com substituição; promovido entra no contexto do agente.';
comment on column public.agent_learnings.evidence_refs is 'Evidências: correção da pessoa (approval), versão entregue, decisão; cada uma com o trabalho de origem.';
comment on column public.agent_learnings.reviewed_at is '"Continua valendo": última vez que o owner reafirmou o aprendizado.';
create unique index agent_learnings_current_topic_key on public.agent_learnings
  (workspace_id, agent_id, delivery_type, app.memory_norm(topic)) where superseded_at is null;
create index agent_learnings_context_idx on public.agent_learnings (workspace_id, agent_id, delivery_type)
  where superseded_at is null and status = 'promoted';
create index agent_learnings_search_idx on public.agent_learnings using gin (search_vector);
create index agent_learnings_reflection_idx on public.agent_learnings (reflection_id) where reflection_id is not null;
create index agent_learnings_work_item_idx on public.agent_learnings (work_item_id) where work_item_id is not null;
create index agent_learnings_supersedes_idx on public.agent_learnings (supersedes_id) where supersedes_id is not null;
create index agent_learnings_decided_by_idx on public.agent_learnings (decided_by) where decided_by is not null;
create index agent_learnings_reviewed_by_idx on public.agent_learnings (reviewed_by) where reviewed_by is not null;
create trigger agent_learnings_set_updated_at
  before update on public.agent_learnings
  for each row execute function app.set_updated_at();

-- Texto, evidência e versão nunca mudam; uma versão substituída não muda mais de estado. As referências à
-- reflexão e ao trabalho só podem ir a nulo (quando a origem é apagada).
create function app.agent_learnings_guard()
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

  if (new.workspace_id, new.agent_id, new.delivery_type, new.topic, new.learning, new.evidence_refs,
      new.confidence, new.version, new.supersedes_id, new.search_config, new.created_at)
     is distinct from
     (old.workspace_id, old.agent_id, old.delivery_type, old.topic, old.learning, old.evidence_refs,
      old.confidence, old.version, old.supersedes_id, old.search_config, old.created_at)
     or (new.reflection_id is distinct from old.reflection_id and new.reflection_id is not null)
     or (new.work_item_id is distinct from old.work_item_id and new.work_item_id is not null) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Aprendizado não se edita: evidência nova cria uma versão nova.';
  end if;
  if old.superseded_at is not null
     and (new.status, new.promotion_rule, new.superseded_at, new.decided_by, new.decided_at,
          new.reviewed_by, new.reviewed_at)
         is distinct from
         (old.status, old.promotion_rule, old.superseded_at, old.decided_by, old.decided_at,
          old.reviewed_by, old.reviewed_at) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Esta versão do aprendizado já foi substituída.';
  end if;
  return new;
end;
$$;

create trigger agent_learnings_guard
  before insert or update on public.agent_learnings
  for each row execute function app.agent_learnings_guard();

-- ---------------------------------------------------------------------------------------------------
-- RLS: o membro lê o que é dos seus workspaces; nada de escrita direta
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array['memory_reflections', 'agent_learnings']
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
-- O contexto do run registra aprendizados
-- ---------------------------------------------------------------------------------------------------

alter table public.run_context_items
  add column learning_id uuid,
  add constraint run_context_items_learning_fk foreign key (workspace_id, learning_id)
    references public.agent_learnings (workspace_id, id),
  drop constraint run_context_items_target,
  add constraint run_context_items_target check (
    (kind = 'fact' and fact_id is not null and suggestion_id is null and learning_id is null)
    or (kind = 'suggestion' and suggestion_id is not null and fact_id is null and learning_id is null)
    or (kind = 'learning' and learning_id is not null and fact_id is null and suggestion_id is null)
  ),
  drop constraint run_context_items_reason_values,
  add constraint run_context_items_reason_values check (reason in ('essential', 'search', 'delivery'));
comment on column public.run_context_items.learning_id is 'Aprendizado por cliente que entrou no contexto (camada 3): pela delivery ou pela busca.';
create unique index run_context_items_learning_key on public.run_context_items (run_id, learning_id) where learning_id is not null;
create index run_context_items_learning_idx on public.run_context_items (learning_id) where learning_id is not null;

-- ---------------------------------------------------------------------------------------------------
-- Fechamento do trabalho → fila memory_reflect
-- ---------------------------------------------------------------------------------------------------

create function app.enqueue_reflection(
  p_work_item_id uuid,
  p_outcome public.reflection_outcome,
  p_approval_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.work_items;
  v_agent public.agent_id;
  v_refs jsonb;
  v_id uuid;
begin
  select w.* into v_item from public.work_items w where w.id = p_work_item_id;
  if not found or v_item.delivery_type is null then
    return null;
  end if;
  v_agent := app.delivery_type_agent(v_item.delivery_type);

  v_refs := jsonb_build_object(
    'work_item', jsonb_build_object(
      'id', v_item.id, 'title', v_item.title, 'delivery_type', v_item.delivery_type,
      'briefing', v_item.briefing
    ),
    'versions', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', v.id, 'version_no', v.version_no, 'status', v.status)
               order by v.version_no
             )
      from public.delivery_versions v
      join public.deliveries d on d.id = v.delivery_id
      where d.work_item_id = v_item.id
    ), '[]'::jsonb),
    'corrections', coalesce((
      select jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object(
                 'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
                 'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
               ))
               order by a.decided_at, a.id
             )
      from public.approvals a
      where a.work_item_id = v_item.id
        and a.kind in ('review', 'approve')
        and a.status = 'decided'
        and a.decision in ('changes_requested', 'rejected')
    ), '[]'::jsonb),
    'decision', (
      select jsonb_strip_nulls(jsonb_build_object(
               'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
               'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
             ))
      from public.approvals a
      where a.id = p_approval_id
    )
  );

  insert into public.memory_reflections (
    workspace_id, work_item_id, agent_id, delivery_type, outcome, approval_id, idempotency_key, refs
  )
  values (
    v_item.workspace_id, v_item.id, v_agent, v_item.delivery_type, p_outcome, p_approval_id,
    coalesce('approval:' || p_approval_id, 'cancel:' || v_item.id), jsonb_strip_nulls(v_refs)
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    perform pgmq.send(
      'memory_reflect',
      jsonb_build_object(
        'reflection_id', v_id, 'workspace_id', v_item.workspace_id, 'work_item_id', v_item.id,
        'agent_id', v_agent, 'delivery_type', v_item.delivery_type, 'outcome', p_outcome,
        'refs', jsonb_strip_nulls(v_refs)
      )
    );
  end if;
  return v_id;
end;
$$;

-- Decisão sobre uma entrega (review/approve): aprovar fecha; recusar fecha esta proposta (nova proposta
-- ou cancelamento). "Aprovado depois de ajuste" = houve pedido de ajuste ou nova proposta antes.
create function app.approvals_enqueue_reflection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outcome public.reflection_outcome;
begin
  if new.kind not in ('review', 'approve') or new.work_item_id is null then
    return null;
  end if;
  v_outcome := case
    when new.decision = 'approved' and exists (
      select 1 from public.approvals a
      where a.work_item_id = new.work_item_id
        and a.id <> new.id
        and a.kind in ('review', 'approve')
        and a.status = 'decided'
        and (a.decision = 'changes_requested' or (a.decision = 'rejected' and a.follow_up = 'revise'))
    ) then 'approved_with_edits'
    when new.decision = 'approved' then 'approved'
    when new.decision = 'rejected' and new.follow_up = 'revise' then 'rejected_revise'
    when new.decision = 'rejected' and new.follow_up = 'cancel' then 'rejected_cancel'
  end;
  if v_outcome is not null then
    perform app.enqueue_reflection(new.work_item_id, v_outcome, new.id);
  end if;
  return null;
end;
$$;

create trigger approvals_enqueue_reflection
  after update of status on public.approvals
  for each row
  when (old.status = 'pending' and new.status = 'decided')
  execute function app.approvals_enqueue_reflection();

-- Trabalho cancelado por outro caminho que não a recusa com cancelamento (essa já entrou acima).
create function app.work_items_enqueue_reflection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.approvals a
    where a.work_item_id = new.id and a.status = 'decided' and a.decision = 'rejected' and a.follow_up = 'cancel'
  ) then
    perform app.enqueue_reflection(new.id, 'cancelled', null);
  end if;
  return null;
end;
$$;

create trigger work_items_enqueue_reflection
  after update of status on public.work_items
  for each row
  when (old.status is distinct from new.status and new.status = 'cancelled')
  execute function app.work_items_enqueue_reflection();

-- ---------------------------------------------------------------------------------------------------
-- Gravação pelo worker (papel privilegiado)
-- ---------------------------------------------------------------------------------------------------

-- Grava um aprendizado da reflexão. Mesmo assunto e mesmo texto: acumula a evidência numa versão nova
-- (repetir a mesma evidência não muda nada; descartado não volta). Mesmo assunto e outro texto: a versão
-- nova substitui a anterior, salvo quando a anterior está promovida e a nova seria só candidata (a
-- correção da pessoa vale mais que um palpite do agente).
create function app.record_learning(
  p_reflection_id uuid,
  p_topic text,
  p_learning text,
  p_evidence_refs jsonb,
  p_confidence numeric,
  p_explicit boolean,
  p_min_confidence numeric,
  p_repeats integer
)
returns public.agent_learnings
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_reflection public.memory_reflections;
  v_current public.agent_learnings;
  v_new public.agent_learnings;
  v_topic text := btrim(coalesce(p_topic, ''));
  v_learning text := btrim(coalesce(p_learning, ''));
  v_same boolean := false;
  v_evidence jsonb := p_evidence_refs;
  v_confidence numeric := p_confidence;
  v_status public.agent_learning_status := 'candidate';
  v_rule text;
  v_work_items integer;
begin
  select r.* into v_reflection from public.memory_reflections r where r.id = p_reflection_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Reflexão não encontrada.';
  end if;
  if v_topic = '' or v_learning = '' then
    raise exception using errcode = 'invalid_parameter_value', message = 'O aprendizado precisa de assunto e texto.';
  end if;
  if jsonb_typeof(p_evidence_refs) <> 'array' or jsonb_array_length(p_evidence_refs) = 0 then
    raise exception using errcode = 'invalid_parameter_value', message = 'Aprendizado sem evidência não é gravado.';
  end if;

  select l.* into v_current
  from public.agent_learnings l
  where l.workspace_id = v_reflection.workspace_id
    and l.agent_id = v_reflection.agent_id
    and l.delivery_type = v_reflection.delivery_type
    and app.memory_norm(l.topic) = app.memory_norm(v_topic)
    and l.superseded_at is null
  for update;

  if v_current.id is not null then
    v_same := app.memory_norm(v_current.learning) = app.memory_norm(v_learning);
    if v_same then
      if v_current.status = 'discarded' then
        return v_current;
      end if;
      select jsonb_agg(e order by e->>'type', e::text) into v_evidence
      from (
        select distinct e
        from jsonb_array_elements(v_current.evidence_refs || p_evidence_refs) as e
      ) as merged(e);
      if v_evidence @> v_current.evidence_refs and v_current.evidence_refs @> v_evidence then
        return v_current;
      end if;
      v_confidence := greatest(v_current.confidence, p_confidence);
    end if;
  end if;

  select count(distinct e->>'work_item_id') into v_work_items
  from jsonb_array_elements(v_evidence) as e
  where e ? 'work_item_id';

  if p_explicit and p_confidence >= p_min_confidence then
    v_status := 'promoted';
    v_rule := 'explicit_correction';
  elsif v_same and v_current.status = 'promoted' then
    v_status := 'promoted';
    v_rule := v_current.promotion_rule;
  elsif v_work_items >= p_repeats then
    v_status := 'promoted';
    v_rule := 'repeated';
  end if;

  if v_current.id is not null and not v_same and v_current.status = 'promoted' and v_status <> 'promoted' then
    return v_current;
  end if;

  if v_current.id is not null then
    update public.agent_learnings set superseded_at = now() where id = v_current.id;
  end if;

  insert into public.agent_learnings (
    workspace_id, agent_id, delivery_type, topic, learning, evidence_refs, confidence, status,
    promotion_rule, reflection_id, work_item_id, version, supersedes_id, decided_by, decided_at,
    reviewed_by, reviewed_at
  )
  values (
    v_reflection.workspace_id, v_reflection.agent_id, v_reflection.delivery_type, v_topic, v_learning,
    v_evidence, v_confidence, v_status, v_rule, v_reflection.id, v_reflection.work_item_id,
    coalesce(v_current.version, 0) + 1, v_current.id,
    case when v_same and v_rule = 'owner' then v_current.decided_by end,
    case when v_same and v_rule = 'owner' then v_current.decided_at end,
    case when v_same then v_current.reviewed_by end,
    case when v_same then v_current.reviewed_at end
  )
  returning * into v_new;

  perform app.memory_audit(
    v_new.workspace_id, 'memory.learning_recorded', 'agent_learning', v_new.id,
    jsonb_build_object(
      'status', v_new.status, 'rule', v_new.promotion_rule, 'version', v_new.version,
      'delivery_type', v_new.delivery_type, 'reflection_id', v_reflection.id,
      'supersedes_id', v_new.supersedes_id
    ),
    v_reflection.agent_id
  );
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Decisões do owner (diretriz de 16/10 08:55). Repetir devolve o estado atual, sem efeito novo.
-- ---------------------------------------------------------------------------------------------------

create function app.learning_lock(p_learning_id uuid)
returns public.agent_learnings
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_learning public.agent_learnings;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select l.* into v_learning
  from public.agent_learnings l
  where l.id = p_learning_id and l.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Aprendizado não encontrado.';
  end if;
  if not app.has_role(v_learning.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if v_learning.superseded_at is not null then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Esta versão do aprendizado já foi substituída.';
  end if;
  return v_learning;
end;
$$;

create function app.promote_learning(p_learning_id uuid)
returns public.agent_learnings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_learning public.agent_learnings := app.learning_lock(p_learning_id);
begin
  if v_learning.status = 'promoted' then
    return v_learning;
  end if;
  update public.agent_learnings
  set status = 'promoted', promotion_rule = 'owner', decided_by = auth.uid(), decided_at = now()
  where id = v_learning.id
  returning * into v_learning;
  perform app.memory_audit(
    v_learning.workspace_id, 'memory.learning_promoted', 'agent_learning', v_learning.id,
    jsonb_build_object('agent_id', v_learning.agent_id, 'delivery_type', v_learning.delivery_type)
  );
  return v_learning;
end;
$$;

create function app.discard_learning(p_learning_id uuid)
returns public.agent_learnings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_learning public.agent_learnings := app.learning_lock(p_learning_id);
begin
  if v_learning.status = 'discarded' then
    return v_learning;
  end if;
  update public.agent_learnings
  set status = 'discarded', decided_by = auth.uid(), decided_at = now()
  where id = v_learning.id
  returning * into v_learning;
  perform app.memory_audit(
    v_learning.workspace_id, 'memory.learning_discarded', 'agent_learning', v_learning.id,
    jsonb_build_object('agent_id', v_learning.agent_id, 'delivery_type', v_learning.delivery_type)
  );
  return v_learning;
end;
$$;

create function app.keep_learning(p_learning_id uuid)
returns public.agent_learnings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_learning public.agent_learnings := app.learning_lock(p_learning_id);
begin
  if v_learning.status <> 'promoted' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Só um aprendizado em uso pode continuar valendo.';
  end if;
  update public.agent_learnings
  set reviewed_by = auth.uid(), reviewed_at = now()
  where id = v_learning.id
  returning * into v_learning;
  perform app.memory_audit(
    v_learning.workspace_id, 'memory.learning_kept', 'agent_learning', v_learning.id,
    jsonb_build_object('agent_id', v_learning.agent_id, 'delivery_type', v_learning.delivery_type)
  );
  return v_learning;
end;
$$;

revoke all on function
  app.agent_learnings_guard(),
  app.enqueue_reflection(uuid, public.reflection_outcome, uuid),
  app.approvals_enqueue_reflection(),
  app.work_items_enqueue_reflection(),
  app.record_learning(uuid, text, text, jsonb, numeric, boolean, numeric, integer),
  app.learning_lock(uuid),
  app.promote_learning(uuid),
  app.discard_learning(uuid),
  app.keep_learning(uuid)
  from public, anon, authenticated, service_role;

grant execute on function
  app.promote_learning(uuid),
  app.discard_learning(uuid),
  app.keep_learning(uuid)
  to authenticated;
