-- S2d: trabalho coordenado (01.02 do Nexo). Etapas por agente com dependências; avanço um especialista por
-- vez e idempotente; decisão do dono sobre a entrega de uma etapa fecha a etapa e o marco e põe a seguinte na
-- fila; a etapa de imagem aguardando o motor não segura quem não depende dela, e quem depende fica blocked com
-- o motivo; a última etapa fecha o trabalho e o projeto; crédito pela delivery da etapa; reflexão pelo agente
-- da etapa; cancelamento pula o que não fechou; handoff no contexto do run; RLS e funções internas.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(48);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from public.workspaces where slug = 'miolo') as miolo;
grant select on fx to public;

create temporary table ids (name text primary key, id uuid);
grant select, insert on ids to public;

create function pg_temp.id(p_name text) returns uuid language sql stable as $$
  select id from ids where name = p_name
$$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

-- Entrega da etapa pronta para o dono: versão, pendência ligada à etapa, etapa e trabalho esperando a pessoa.
create function pg_temp.deliver(p_step text, p_agent public.agent_id, p_kind text) returns uuid
language plpgsql as $$
declare
  v_delivery uuid;
  v_version uuid;
  v_approval uuid;
begin
  insert into public.deliveries (workspace_id, work_item_id, kind, step_id)
  values ((select miolo from fx), pg_temp.id('work'), p_kind, pg_temp.id(p_step))
  returning id into v_delivery;
  insert into public.delivery_versions (workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id, status)
  values ((select miolo from fx), v_delivery, 1, jsonb_build_object('titulo', p_step), 'agent', p_agent, 'draft')
  returning id into v_version;
  insert into public.approvals (workspace_id, work_item_id, delivery_version_id, kind, requested_by_agent_id, step_id)
  values ((select miolo from fx), pg_temp.id('work'), v_version, 'review', p_agent, pg_temp.id(p_step))
  returning id into v_approval;
  update public.work_item_steps set status = 'needs_you', started_at = now() where id = pg_temp.id(p_step);
  perform app.transition_work_item(pg_temp.id('work'), 'needs_you', 'agent', p_agent::text, null, 'in_progress');
  insert into ids values (p_step || ':version', v_version), (p_step || ':approval', v_approval);
  return v_approval;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Montagem: projeto, trabalho coordenado e quatro etapas (a quarta depende da peça da Kaia)
-- ---------------------------------------------------------------------------------------------------
with p as (
  insert into public.projects (workspace_id, name, objective, owner_agent_id, created_by)
  values ((select miolo from fx), 'Campanha de Natal (pgTAP)', 'Vender mais panetones.', 'nexo', (select marina from fx))
  returning id
)
insert into ids select 'project', id from p;

with w as (
  insert into public.work_items (
    workspace_id, project_id, title, delivery_type, status, primary_agent_id, collaborator_agent_ids, created_by
  ) values (
    (select miolo from fx), pg_temp.id('project'), 'Campanha de Natal (pgTAP)', '01.02', 'in_progress', 'nexo',
    '{bia,kaia,otto,kiwi}', (select marina from fx)
  ) returning id
)
insert into ids select 'work', id from w;

with s as (
  insert into public.work_item_steps (workspace_id, work_item_id, seq, title, agent_id, delivery_type, depends_on, input)
  values
    ((select miolo from fx), pg_temp.id('work'), 1, 'Estratégia', 'bia', '02.04', '{}', '{"responsabilidade": "estratégia e conceito"}'),
    ((select miolo from fx), pg_temp.id('work'), 2, 'Peças', 'kaia', '03.01', '{1}', '{"responsabilidade": "peças da campanha"}'),
    ((select miolo from fx), pg_temp.id('work'), 3, 'Textos', 'otto', '04.03', '{1}', '{"responsabilidade": "legendas e roteiros"}'),
    ((select miolo from fx), pg_temp.id('work'), 4, 'Anúncios com a peça', 'kiwi', '05.02', '{2}', '{"responsabilidade": "anúncios"}')
  returning seq, id
)
insert into ids select 'step' || seq, id from s;

insert into public.project_milestones (workspace_id, project_id, title, agent_id, needs_you, planned, work_item_id, step_id)
select (select miolo from fx), pg_temp.id('project'), s.title, s.agent_id, true, true, s.work_item_id, s.id
from public.work_item_steps s where s.work_item_id = pg_temp.id('work');

-- ---------------------------------------------------------------------------------------------------
-- Estrutura: estados, regras da etapa e funções internas fora do alcance
-- ---------------------------------------------------------------------------------------------------
select is(
  (select enum_range(null::public.work_item_step_status)::text[]),
  array['pending', 'in_progress', 'needs_you', 'waiting_engine', 'blocked', 'done', 'failed', 'skipped'],
  'estados da etapa: needs_you, waiting_engine e blocked entram'
);
select throws_ok(
  $$insert into public.work_item_steps (workspace_id, work_item_id, seq, title, agent_id, delivery_type, depends_on)
    values ((select miolo from fx), pg_temp.id('work'), 5, 'Depois', 'otto', '04.03', '{5}')$$,
  '23514', null, 'etapa só depende de etapa anterior'
);
select throws_ok(
  $$insert into public.work_item_steps (workspace_id, work_item_id, seq, title, delivery_type)
    values ((select miolo from fx), pg_temp.id('work'), 5, 'Sem dono', '04.03')$$,
  '23514', null, 'etapa planejada tem agente responsável'
);
select ok(not has_table_privilege('authenticated', 'public.work_item_steps', 'insert, update, delete'), 'authenticated não escreve etapas');
select ok(not has_function_privilege('authenticated', 'app.advance_work_steps(uuid)', 'execute'), 'authenticated não avança etapas');
select ok(not has_function_privilege('authenticated', 'app.queue_work_step(uuid, text)', 'execute'), 'authenticated não põe etapa na fila');
select ok(not has_function_privilege('authenticated', 'app.work_step_next(uuid)', 'execute'), 'authenticated não escolhe a próxima etapa');
select ok(not has_function_privilege('authenticated', 'app.decide_work_step(public.approvals, uuid)', 'execute'), 'decisão da etapa só por decide_approval');
select ok(not has_function_privilege('authenticated', 'app.close_coordinated_project(uuid)', 'execute'), 'authenticated não fecha projeto por fora');

-- ---------------------------------------------------------------------------------------------------
-- Um especialista por vez, idempotente
-- ---------------------------------------------------------------------------------------------------
select is(app.advance_work_steps(pg_temp.id('work')), 'queued', 'primeira etapa vai para a fila');
select is(app.advance_work_steps(pg_temp.id('work')), 'queued', 'repetir não cria outro run');
select is((select count(*)::int from public.runs where work_item_id = pg_temp.id('work')), 1, 'um run só, da etapa 1');
select is(
  (select agent_id::text || ':' || idempotency_key from public.runs where work_item_id = pg_temp.id('work')),
  'bia:step:' || pg_temp.id('step1'), 'run da Bia com a chave da etapa'
);
select is(
  (select delivery_type from app.run_credit_estimate((select id from public.runs where step_id = pg_temp.id('step1')))),
  '02.04', 'a etapa reserva pelo preço da delivery dela, não pela 01.02'
);
select is(
  (select count(*)::int from pgmq.q_runs_interactive where message->>'run_id' = (select id::text from public.runs where step_id = pg_temp.id('step1'))),
  1, 'run da etapa na fila runs_interactive'
);
update public.work_item_steps set status = 'in_progress', started_at = now() where id = pg_temp.id('step1');
select is(app.advance_work_steps(pg_temp.id('work')), 'busy', 'com uma etapa em andamento, ninguém mais começa');

-- ---------------------------------------------------------------------------------------------------
-- O dono aprova a estratégia: a etapa e o marco fecham e a Kaia entra
-- ---------------------------------------------------------------------------------------------------
select pg_temp.deliver('step1', 'bia', 'campaign_strategy');
select pg_temp.act_as((select marina from fx));
select is((select decision::text from app.decide_approval(pg_temp.id('step1:approval'), 'approved')), 'approved', 'Marina aprova a estratégia');
reset role;
select is((select status::text from public.work_item_steps where id = pg_temp.id('step1')), 'done', 'etapa 1 concluída');
select is(
  (select output->>'delivery_version_id' from public.work_item_steps where id = pg_temp.id('step1')),
  pg_temp.id('step1:version')::text, 'a saída da etapa é a versão aprovada'
);
select is((select status::text from public.delivery_versions where id = pg_temp.id('step1:version')), 'approved', 'versão aprovada');
select ok((select done_at is not null from public.project_milestones where step_id = pg_temp.id('step1')), 'marco da estratégia concluído');
select is((select status::text from public.work_items where id = pg_temp.id('work')), 'in_progress', 'o trabalho volta a andar');
select is(
  (select agent_id::text from public.runs where step_id = pg_temp.id('step2')),
  'kaia', 'a etapa 2 (Kaia) vai para a fila'
);
select is((select count(*)::int from public.runs where step_id in (pg_temp.id('step3'), pg_temp.id('step4'))), 0, 'Otto e Kiwi ainda não');
select is(
  (select agent_id::text || ' ' || delivery_type from public.memory_reflections where approval_id = pg_temp.id('step1:approval')),
  'bia 02.04', 'a reflexão ensina a Bia (02.04), não o Nexo'
);
select is(
  (select jsonb_array_length(refs->'versions') from public.memory_reflections where approval_id = pg_temp.id('step1:approval')),
  1, 'reflexão com as versões só da etapa'
);

-- ---------------------------------------------------------------------------------------------------
-- A Kaia aguarda o motor: o Otto segue (não depende da peça)
-- ---------------------------------------------------------------------------------------------------
update public.work_item_steps set status = 'waiting_engine', started_at = now(), status_reason = 'image_engine_pending'
where id = pg_temp.id('step2');
select is(app.advance_work_steps(pg_temp.id('work')), 'queued', 'com a Kaia aguardando, a próxima etapa segue');
select is((select agent_id::text from public.runs where step_id = pg_temp.id('step3')), 'otto', 'a etapa 3 (Otto) vai para a fila');
select is((select status::text from public.work_item_steps where id = pg_temp.id('step4')), 'pending', 'a etapa 4 ainda não foi olhada');
select is(
  (select count(*)::int from public.work_item_history where work_item_id = pg_temp.id('work') and kind = 'step' and params->>'status' = 'waiting_engine'),
  1, 'histórico: etapa aguardando o motor'
);

-- ---------------------------------------------------------------------------------------------------
-- O Otto entrega e o dono aprova: a última etapa fecha o trabalho e o projeto; quem depende da peça fica
-- bloqueado com o motivo
-- ---------------------------------------------------------------------------------------------------
update public.work_item_steps set status = 'in_progress', started_at = now() where id = pg_temp.id('step3');
select pg_temp.deliver('step3', 'otto', 'multichannel_posts');
select pg_temp.act_as((select marina from fx));
select is((select decision::text from app.decide_approval(pg_temp.id('step3:approval'), 'approved')), 'approved', 'Marina aprova os textos');
reset role;
select is((select status::text from public.work_item_steps where id = pg_temp.id('step3')), 'done', 'etapa 3 concluída');
select is((select status::text from public.work_item_steps where id = pg_temp.id('step4')), 'blocked', 'etapa que depende da peça fica bloqueada');
select is(
  (select status_reason || ':' || (status_params->>'seq') || ':' || (status_params->>'status') from public.work_item_steps where id = pg_temp.id('step4')),
  'depends_on_step:2:waiting_engine', 'motivo: depende da etapa 2, que aguarda o motor'
);
select is((select status::text from public.work_item_steps where id = pg_temp.id('step2')), 'waiting_engine', 'a Kaia continua aguardando o motor');
select is((select status::text from public.work_items where id = pg_temp.id('work')), 'done', 'o trabalho fecha quando a última etapa fecha');
select is((select status::text from public.projects where id = pg_temp.id('project')), 'done', 'o projeto fecha junto');
select is(
  (select count(*)::int from public.project_milestones where project_id = pg_temp.id('project') and done_at is not null),
  2, 'marcos concluídos: estratégia e textos; peça e anúncios ficam abertos'
);
select is((select count(*)::int from public.runs where step_id = pg_temp.id('step4')), 0, 'etapa bloqueada não roda');

-- ---------------------------------------------------------------------------------------------------
-- Handoff no contexto do run
-- ---------------------------------------------------------------------------------------------------
insert into public.run_context_items (workspace_id, run_id, kind, step_id, delivery_version_id, reason, tokens)
values ((select miolo from fx), (select id from public.runs where step_id = pg_temp.id('step3')), 'step', pg_temp.id('step1'), pg_temp.id('step1:version'), 'handoff', 120);
select is(
  (select count(*)::int from public.run_context_items where kind = 'step' and step_id = pg_temp.id('step1')),
  1, 'a saída da etapa 1 entrou no contexto do Otto'
);
select throws_ok(
  $$insert into public.run_context_items (workspace_id, run_id, kind, step_id, reason, tokens)
    values ((select miolo from fx), (select id from public.runs where step_id = pg_temp.id('step3')), 'step', pg_temp.id('step1'), 'handoff', 1)$$,
  '23514', null, 'contexto de etapa sem a versão é recusado'
);

-- ---------------------------------------------------------------------------------------------------
-- Cancelar pula o que não fechou e mantém o que fechou
-- ---------------------------------------------------------------------------------------------------
with w as (
  insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id, created_by)
  values ((select miolo from fx), 'Outra campanha (pgTAP)', '01.02', 'in_progress', 'nexo', (select marina from fx))
  returning id
)
insert into ids select 'work2', id from w;
insert into public.work_item_steps (workspace_id, work_item_id, seq, title, agent_id, delivery_type, status, started_at, finished_at)
values
  ((select miolo from fx), pg_temp.id('work2'), 1, 'Estratégia', 'bia', '02.04', 'done', now(), now()),
  ((select miolo from fx), pg_temp.id('work2'), 2, 'Textos', 'otto', '04.03', 'pending', null, null);
select app.transition_work_item(pg_temp.id('work2'), 'cancelled', 'user', (select marina from fx)::text, null, 'in_progress');
select is(
  (select array_agg(status::text order by seq) from public.work_item_steps where work_item_id = pg_temp.id('work2')),
  array['done', 'skipped'], 'cancelado: a etapa concluída fica, a pendente é pulada'
);
select is(
  (select status_reason from public.work_item_steps where work_item_id = pg_temp.id('work2') and seq = 2),
  'work_cancelled', 'motivo: trabalho cancelado'
);

-- ---------------------------------------------------------------------------------------------------
-- Isolamento: só o negócio vê as etapas, as entregas e os marcos
-- ---------------------------------------------------------------------------------------------------
select pg_temp.act_as((select marina from fx));
select is((select count(*)::int from public.work_item_steps where work_item_id = pg_temp.id('work')), 4, 'Marina vê as quatro etapas');
reset role;
select pg_temp.act_as((select rafael from fx));
select is((select count(*)::int from public.work_item_steps where work_item_id = pg_temp.id('work')), 0, 'Rafael (Vitta) não vê as etapas da Miolo');
select is((select count(*)::int from public.project_milestones where project_id = pg_temp.id('project')), 0, 'nem os marcos');
select is((select count(*)::int from public.deliveries where work_item_id = pg_temp.id('work')), 0, 'nem as entregas das etapas');
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, pg_temp.id('step1:approval')),
  'P0002', null, 'nem decide a pendência de outra empresa'
);
reset role;

select * from finish();
rollback;
