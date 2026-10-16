-- S1g: trabalho rico (origem tipada, frase viva, histórico), "Para você decidir", "Agora não" (adia sem
-- decidir nem rejeitar, sem run e sem crédito), projeto com datas, marcos e participantes (editor ou acima),
-- pedido na conversa do projeto ou do "<Agente> percebeu", isolamento das tabelas novas.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(48);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000000301'::uuid as seed_work,
  '5eed0000-0000-4000-8000-000000000202'::uuid as seed_message,
  '5eed0000-0000-4000-8000-000000000502'::uuid as seed_version,
  '5eed0000-0000-4000-8000-000000000601'::uuid as seed_review,
  '5eed0000-0000-4000-8000-000000000821'::uuid as seed_suggestion;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

create temporary table ids (name text primary key, id uuid);
grant select, insert on ids to public;

-- Pedro vira viewer da Vitta só neste teste.
insert into public.memberships (workspace_id, user_id, role) select vitta, pedro, 'viewer' from fx;

-- Trabalhos de apoio (papel privilegiado): um aprovado com a autorização de publicação pendente, um com a
-- pergunta "Para você decidir" e uma autorização na Vitta.
insert into ids values
  ('approved_work', gen_random_uuid()), ('decide_work', gen_random_uuid()), ('vitta_work', gen_random_uuid()),
  ('authorize', gen_random_uuid()), ('decide', gen_random_uuid()), ('vitta_authorize', gen_random_uuid()),
  ('delivery', gen_random_uuid()), ('version', gen_random_uuid());
insert into public.work_items (id, workspace_id, title, delivery_type, status, primary_agent_id, created_by)
select (select id from ids where name = 'approved_work'), miolo, 'Post do Dia Mundial do Pão', '04.01', 'approved'::public.work_item_status, 'otto'::public.agent_id, marina from fx
union all
select (select id from ids where name = 'decide_work'), miolo, 'Verba dos anúncios de Natal', '05.01', 'needs_you', 'kiwi', marina from fx
union all
select (select id from ids where name = 'vitta_work'), vitta, 'Post da semana', '04.01', 'approved', 'otto', rafael from fx;
insert into public.deliveries (id, workspace_id, work_item_id, kind)
select (select id from ids where name = 'delivery'), miolo, (select id from ids where name = 'approved_work'), 'caption' from fx;
insert into public.delivery_versions (id, workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id, status)
select (select id from ids where name = 'version'), miolo, (select id from ids where name = 'delivery'), 2, '{}'::jsonb, 'agent', 'otto', 'approved' from fx;
insert into public.approvals (id, workspace_id, work_item_id, kind, requested_by_agent_id, delivery_version_id)
select (select id from ids where name = 'authorize'), miolo, (select id from ids where name = 'approved_work'), 'authorize'::public.approval_kind, 'otto'::public.agent_id, (select id from ids where name = 'version') from fx
union all
select (select id from ids where name = 'decide'), miolo, (select id from ids where name = 'decide_work'), 'decide', 'kiwi', null from fx
union all
select (select id from ids where name = 'vitta_authorize'), vitta, (select id from ids where name = 'vitta_work'), 'authorize', 'otto', null from fx;

create temporary table baseline as
select
  (select count(*) from public.runs) as runs,
  (select count(*) from public.credit_ledger) as ledger,
  (select count(*) from public.credit_holds) as holds;
grant select on baseline to public;

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select ok(
  (select count(*) = 3 from pg_class
   where oid in ('public.work_item_history'::regclass, 'public.project_milestones'::regclass, 'public.project_participants'::regclass)
     and relrowsecurity and relforcerowsecurity),
  'histórico, marcos e participantes com RLS forçada'
);
select ok(
  not has_table_privilege('authenticated', 'public.work_item_history', 'insert')
  and not has_table_privilege('authenticated', 'public.work_item_history', 'update')
  and not has_table_privilege('authenticated', 'public.project_milestones', 'insert')
  and not has_table_privilege('authenticated', 'public.project_participants', 'delete')
  and has_table_privilege('authenticated', 'public.work_item_history', 'select'),
  'authenticated só lê as tabelas novas; escreve pelas funções'
);
select ok(
  has_function_privilege('authenticated', 'app.defer_approval(uuid, timestamptz)', 'execute')
  and has_function_privilege('authenticated', 'app.resume_approval(uuid)', 'execute')
  and has_function_privilege('authenticated', 'app.create_project(uuid, text, text, public.agent_id, timestamptz, timestamptz, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'app.approvals_history()', 'execute'),
  'as ações da pessoa são funções; os triggers do histórico não'
);

-- ---------------------------------------------------------------------------------------------------
-- Origem tipada, frase viva e histórico
-- ---------------------------------------------------------------------------------------------------

select is(
  (select row(origin_type::text, origin_ref)::text from public.work_items where id = (select seed_work from fx)),
  row('message', (select seed_message from fx)::text)::text,
  'o trabalho do seed nasce da mensagem do pedido'
);
select is(
  (select array_agg(kind || ':' || coalesce(mark, '-') order by created_at) from public.work_item_history where work_item_id = (select seed_work from fx)),
  array['requested:-', 'delivered:automatic'],
  'histórico do seed: o pedido e a v1 entregue (automático)'
);
select throws_ok(
  $$insert into public.work_items (workspace_id, title, origin_type, origin_ref)
    select miolo, 'Origem quebrada', 'insight', 'nao-e-um-id' from fx$$,
  '23514', null, 'origem de insight exige o id da sugestão'
);
select lives_ok(
  $$insert into public.work_items (workspace_id, title, origin_type, origin_ref)
    select miolo, 'Plano da semana 43', 'routine_run', 'PL-43' from fx$$,
  'origem de rotina guarda o código da execução'
);

update public.work_items set status_label = 'Otto incluindo um bastidor no plano', next_step = 'Otto entrega a v2'
where id = (select seed_work from fx);
select app.transition_work_item((select seed_work from fx), 'in_progress', 'agent', 'otto', null, 'needs_you');
select is(
  (select row(status_label, next_step)::text from public.work_items where id = (select seed_work from fx)),
  row(null::text, null::text)::text,
  'mudou de estado sem o agente reescrever: frase e próximo passo voltam a nulo'
);
update public.work_items set status = 'needs_you', status_label = 'v2 aguarda sua aprovação'
where id = (select seed_work from fx);
select is(
  (select status_label from public.work_items where id = (select seed_work from fx)),
  'v2 aguarda sua aprovação',
  'frase escrita junto com a mudança de estado fica'
);

-- ---------------------------------------------------------------------------------------------------
-- "Para você decidir"
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.decide_approval(%L, %L)', (select id from ids where name = 'decide'), 'approved'),
  '22023', 'A decisão approved não vale para uma aprovação do tipo decide.', 'decidir é escolher: só answered'
);
select is(
  (select row(status::text, decision::text)::text from app.decide_approval((select id from ids where name = 'decide'), 'answered', 'Até R$ 40 por dia')),
  row('decided', 'answered')::text,
  'Marina decide com a escolha na observação'
);
reset role;
select is(
  (select status::text from public.work_items where id = (select id from ids where name = 'decide_work')),
  'in_progress',
  'decidido, o trabalho volta ao agente'
);
select is(
  (select count(*)::int from public.runs where idempotency_key = 'approval:' || (select id from ids where name = 'decide')),
  1,
  'e o agente ganha um run novo'
);
select is(
  (select params ->> 'note' from public.work_item_history where approval_id = (select id from ids where name = 'decide')),
  'Até R$ 40 por dia',
  'a decisão entra no histórico com a escolha'
);

-- ---------------------------------------------------------------------------------------------------
-- "Agora não" e "Decidir agora"
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select carla from fx));
select throws_ok(
  format('select app.defer_approval(%L)', (select id from ids where name = 'vitta_authorize')),
  '42501', 'Só o dono da conta toma esta decisão.', 'editor não adia autorização'
);
select throws_ok(
  format('select app.defer_approval(%L)', (select id from ids where name = 'authorize')),
  'P0002', 'Aprovação não encontrada.', 'outra empresa nem vê a autorização da Miolo'
);

select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.defer_approval(%L)', (select seed_review from fx)),
  '22023', '“Agora não” vale só para autorizações.', 'revisão não se adia'
);
select throws_ok(
  format('select app.defer_approval(%L, %L)', (select id from ids where name = 'authorize'), now() - interval '1 hour'),
  '22023', 'A data para decidir de novo precisa estar no futuro.', 'data no passado é recusada'
);
select is(
  (select row(status::text, decision::text, deferred_at is not null, deferred_until is null)::text
   from app.defer_approval((select id from ids where name = 'authorize'))),
  row('pending', null::text, true, true)::text,
  '"Agora não": continua pendente, sem decisão e sem data'
);
select ok(
  (select app.approval_is_deferred(a) from public.approvals a where a.id = (select id from ids where name = 'authorize')),
  'fica adiada'
);
select is(
  (select deferred_at from app.defer_approval((select id from ids where name = 'authorize'))),
  (select deferred_at from public.approvals where id = (select id from ids where name = 'authorize')),
  'repetir devolve o mesmo adiamento'
);
reset role;
select is(
  (select row(
     (select count(*) from public.runs) - b.runs,
     (select count(*) from public.credit_ledger) - b.ledger,
     (select count(*) from public.credit_holds) - b.holds)::text
   from baseline b),
  row(1, 0, 0)::text,
  'adiar não cria run nem mexe em crédito (o único run novo é o do decidir)'
);
select is(
  (select status::text from public.work_items where id = (select id from ids where name = 'approved_work')),
  'approved',
  'o trabalho continua aprovado'
);
select is(
  (select count(*)::int from public.audit_events where action = 'approval.deferred' and entity_id = (select id from ids where name = 'authorize')::text),
  1,
  'um adiamento na auditoria'
);
select ok(
  (select pg_get_triggerdef(oid) like '%UPDATE OF status, deferred_at%' from pg_trigger where tgname = 'approvals_broadcast'),
  'adiar e voltar a pedir avisam o canal do workspace'
);

select pg_temp.act_as((select marina from fx));
select is(
  (select row(status::text, deferred_at is null)::text from app.resume_approval((select id from ids where name = 'authorize'))),
  row('pending', true)::text,
  '"Decidir agora" volta a pedir a autorização'
);
select is(
  (select deferred_at from app.resume_approval((select id from ids where name = 'authorize'))),
  null::timestamptz,
  'repetir não muda nada'
);
select app.defer_approval((select id from ids where name = 'authorize'), now() + interval '1 day');
select is(
  (select row(status::text, decision::text)::text from app.decide_approval((select id from ids where name = 'authorize'), 'approved')),
  row('decided', 'approved')::text,
  'adiada, a autorização ainda pode ser decidida'
);
select throws_ok(
  format('select app.defer_approval(%L)', (select id from ids where name = 'authorize')),
  '55000', 'Esta decisão já foi tomada.', 'decidida não se adia'
);
reset role;
select is(
  (select row(mark, params ->> 'approval_kind', params ->> 'version_no')::text from public.work_item_history where approval_id = (select id from ids where name = 'authorize')),
  row('approved_by_you', 'authorize', '2')::text,
  'a autorização entra no histórico como aprovada por você'
);

-- ---------------------------------------------------------------------------------------------------
-- Projeto: datas, equipe e marcos
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids select 'project', id from app.create_project(
  (select miolo from fx), 'Campanha de Natal', 'Vender mais panetones.', 'nexo',
  '2026-10-05 09:00-03', '2026-12-20 18:00-03',
  '[{"agent_id": "bia", "responsibility": "estratégia e conceito"}, {"agent_id": "kaia", "responsibility": "peças da campanha"}]'
);
select is(
  (select array_agg(agent_id::text || ':' || coalesce(responsibility, '-') order by agent_id) from public.project_participants where project_id = (select id from ids where name = 'project')),
  array['bia:estratégia e conceito', 'kaia:peças da campanha', 'nexo:-'],
  'equipe do projeto com quem conduz'
);
select throws_ok(
  format('select app.update_project(%L, %L)', (select id from ids where name = 'project'), '{"prazo": "20/12"}'),
  '22023', null, 'campo desconhecido no patch é recusado'
);
select throws_ok(
  format('select app.update_project(%L, %L)', (select id from ids where name = 'project'), '{"ends_at": "2026-10-01T00:00:00-03:00"}'),
  '23514', null, 'o prazo não vem antes do início'
);
select is(
  (select row(name, objective, ends_at)::text from app.update_project((select id from ids where name = 'project'), '{"objective": null, "ends_at": "2026-12-24T18:00:00-03:00"}')),
  row('Campanha de Natal', null::text, '2026-12-24 18:00-03'::timestamptz)::text,
  'patch muda só o que veio; null apaga o objetivo'
);
select is(
  (select array_agg(agent_id::text order by agent_id) from app.set_project_participants((select id from ids where name = 'project'), '[{"agent_id": "otto"}, {"agent_id": "kiwi", "responsibility": "anúncios, se você liberar verba"}]')),
  array['kiwi', 'nexo', 'otto'],
  'trocar a equipe mantém quem conduz'
);
select throws_ok(
  format('select app.set_project_participants(%L, %L)', (select id from ids where name = 'project'), '[{"agent_id": "otto"}, {"agent_id": "otto"}]'),
  '22023', 'Cada especialista aparece uma vez na equipe.', 'especialista repetido é recusado'
);
insert into ids select 'milestone', id from app.add_project_milestone(
  (select id from ids where name = 'project'), 'Revisão das peças', 'você aprova cada uma', 'kaia',
  now() + interval '3 days', 'milestone', true, false
);
select is(
  (select done_at is not null from app.update_project_milestone((select id from ids where name = 'milestone'), '{"done": true}')),
  true,
  'marco concluído'
);
select is(
  (select done_at from app.update_project_milestone((select id from ids where name = 'milestone'), '{"done": false}')),
  null::timestamptz,
  'e reaberto'
);

select pg_temp.act_as((select carla from fx));
select lives_ok(
  format('select app.create_project(%L, %L)', (select vitta from fx), 'Lançamento do plano anual'),
  'editor cria projeto no próprio negócio'
);
select throws_ok(
  format('select app.create_project(%L, %L)', (select miolo from fx), 'Projeto alheio'),
  'P0002', 'Workspace não encontrado.', 'outra empresa não cria projeto na Miolo'
);
select throws_ok(
  format('select app.add_project_milestone(%L, %L)', (select id from ids where name = 'project'), 'Marco alheio'),
  'P0002', 'Projeto não encontrado.', 'nem marco no projeto da Miolo'
);
select is(
  (select count(*)::int from public.project_milestones) + (select count(*)::int from public.project_participants where workspace_id = (select miolo from fx)),
  0,
  'Carla não vê marcos nem equipe da Miolo'
);
select is(
  (select count(*)::int from public.work_item_history where workspace_id = (select miolo from fx)),
  0,
  'nem o histórico dos trabalhos da Miolo'
);

select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format('select app.create_project(%L, %L)', (select vitta from fx), 'Projeto do leitor'),
  '42501', 'Seu papel não permite criar projetos.', 'viewer só lê'
);

-- ---------------------------------------------------------------------------------------------------
-- Pedido na conversa do projeto e na do "<Agente> percebeu"
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids select 'project_chat', id from app.create_conversation(
  (select miolo from fx), 'object', 'nexo', 'project', (select id from ids where name = 'project')
);
insert into ids select 'project_msg', id from app.post_message(
  (select id from ids where name = 'project_chat'), 'Otto, escreve a legenda do post de abertura da campanha.'
);
insert into ids select 'project_work', id from app.create_work_item_from_message(
  (select id from ids where name = 'project_msg'), '04.01', 'Legenda de abertura da campanha'
);
select is(
  (select row(project_id, origin_type::text, origin_ref)::text from public.work_items where id = (select id from ids where name = 'project_work')),
  row((select id from ids where name = 'project'), 'project', (select id from ids where name = 'project')::text)::text,
  'pedido na conversa do projeto entra no projeto, com a origem nele'
);
select ok(
  exists (select 1 from public.project_participants where project_id = (select id from ids where name = 'project') and agent_id = 'otto')
  and exists (select 1 from public.project_milestones where work_item_id = (select id from ids where name = 'project_work') and agent_id = 'otto'),
  'o especialista entra na equipe e o trabalho vira marco do projeto'
);

insert into ids select 'insight_chat', id from app.create_conversation(
  (select miolo from fx), 'object', 'otto', 'insight', (select seed_suggestion from fx)
);
insert into ids select 'insight_msg', id from app.post_message(
  (select id from ids where name = 'insight_chat'), 'Pode transformar em post de bastidores.'
);
select is(
  (select row(origin_type::text, origin_ref, project_id)::text
   from app.create_work_item_from_message((select id from ids where name = 'insight_msg'), '04.01', 'Post de bastidores do forno')),
  row('insight', (select seed_suggestion from fx)::text, null::uuid)::text,
  'pedido na conversa do "<Agente> percebeu" nasce do insight'
);
select is(
  (select count(*)::int from public.work_item_history
   where work_item_id = (select id from ids where name = 'project_work') and kind = 'requested' and actor_user_id = (select marina from fx)),
  1,
  'o pedido entra no histórico como seu'
);

select * from finish();
rollback;
