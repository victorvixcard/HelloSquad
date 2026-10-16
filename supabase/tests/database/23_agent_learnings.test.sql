-- S2c: Memória camada 3. Fila memory_reflect alimentada ao fechar o trabalho, memory_reflections e
-- agent_learnings com RLS forçada e só leitura para o membro, isolamento entre workspaces, gravação com
-- substituição (texto imutável, versão nova, descartado não volta, promovido não cai por palpite), regras
-- de promoção, decisões só do owner, run_context_items com aprendizado e a fala de boas-vindas do Nexo só
-- na criação do negócio.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(39);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000000301'::uuid as work_item,
  '5eed0000-0000-4000-8000-000000000601'::uuid as approval,
  '5eed0000-0000-4000-8000-000000000401'::uuid as run;
grant select on fx to public;

create temporary table ids (name text primary key, id uuid);
grant select, insert on ids to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

create function pg_temp.learn(
  p_topic text, p_learning text, p_work_item text, p_confidence numeric, p_explicit boolean
) returns public.agent_learnings
language sql as $$
  select * from app.record_learning(
    (select id from public.memory_reflections where work_item_id = (select work_item from fx)),
    p_topic, p_learning,
    jsonb_build_array(jsonb_build_object('type', 'correction', 'work_item_id', p_work_item)),
    p_confidence, p_explicit, 0.7, 2
  )
$$;

-- ---------------------------------------------------------------------------------------------------
-- Tabelas: RLS forçada, só leitura para o membro, funções internas fora do alcance
-- ---------------------------------------------------------------------------------------------------
select ok((select relforcerowsecurity from pg_class where oid = 'public.memory_reflections'::regclass), 'memory_reflections: RLS forçada');
select ok((select relforcerowsecurity from pg_class where oid = 'public.agent_learnings'::regclass), 'agent_learnings: RLS forçada');
select ok(not has_table_privilege('authenticated', 'public.agent_learnings', 'insert, update, delete'), 'authenticated não escreve em agent_learnings');
select ok(not has_table_privilege('authenticated', 'public.memory_reflections', 'insert, update, delete'), 'authenticated não escreve em memory_reflections');
select ok(not has_function_privilege('authenticated', 'app.record_learning(uuid, text, text, jsonb, numeric, boolean, numeric, integer)', 'execute'), 'authenticated não grava aprendizado');
select ok(not has_function_privilege('authenticated', 'app.enqueue_reflection(uuid, public.reflection_outcome, uuid)', 'execute'), 'authenticated não enfileira reflexão');

-- ---------------------------------------------------------------------------------------------------
-- Fechar o trabalho alimenta a fila
-- ---------------------------------------------------------------------------------------------------
select pg_temp.act_as((select marina from fx));
select is((select decision::text from app.decide_approval((select approval from fx), 'approved')), 'approved', 'Marina aprova a v1 do seed');
select is((select decision::text from app.decide_approval((select approval from fx), 'approved')), 'approved', 'repetir a decisão devolve o mesmo');
reset role;

select is((select count(*)::int from public.memory_reflections where work_item_id = (select work_item from fx)), 1, 'uma reflexão para o trabalho fechado, mesmo com a decisão repetida');
select is((select outcome::text from public.memory_reflections where work_item_id = (select work_item from fx)), 'approved', 'desfecho: aprovado sem ajuste');
select is(
  (select jsonb_array_length(refs->'versions') from public.memory_reflections where work_item_id = (select work_item from fx)),
  1, 'referências trazem as versões'
);
select is(
  (select refs->'decision'->>'approval_id' from public.memory_reflections where work_item_id = (select work_item from fx)),
  (select approval::text from fx), 'referências trazem a decisão'
);
select is(
  (select count(*)::int from pgmq.q_memory_reflect where message->>'work_item_id' = (select work_item::text from fx) and message->>'outcome' = 'approved'),
  1, 'mensagem na fila memory_reflect com o trabalho e o desfecho'
);

-- ---------------------------------------------------------------------------------------------------
-- Gravação com substituição e regras de promoção
-- ---------------------------------------------------------------------------------------------------
insert into ids select 'vocab1', (pg_temp.learn('Vocabulário', 'Nunca usar “promoção imperdível”.', 'w1', 0.95, true)).id;
select is((select status::text || '/' || promotion_rule from public.agent_learnings where id = (select id from ids where name = 'vocab1')), 'promoted/explicit_correction', 'correção explícita com confiança vira promovido');
select is((pg_temp.learn('Vocabulário', 'Nunca usar “promoção imperdível”.', 'w1', 0.95, true)).id, (select id from ids where name = 'vocab1'), 'mesma evidência de novo não cria versão');
insert into ids select 'open1', (pg_temp.learn('Abertura', 'Abrir pelo produto.', 'w1', 0.4, false)).id;
select is((select status::text from public.agent_learnings where id = (select id from ids where name = 'open1')), 'candidate', 'confiança baixa fica candidato');
insert into ids select 'open2', (pg_temp.learn('abertura ', 'Abrir pelo produto.', 'w2', 0.5, false)).id;
select is(
  (select status::text || '/' || promotion_rule || '/v' || version from public.agent_learnings where id = (select id from ids where name = 'open2')),
  'promoted/repeated/v2', 'a mesma lição em dois trabalhos vira promovida por repetição (versão 2)'
);
select isnt((select superseded_at from public.agent_learnings where id = (select id from ids where name = 'open1')), null, 'a versão anterior fica no histórico, substituída');
select is((pg_temp.learn('Vocabulário', 'Pode usar “promoção”.', 'w3', 0.6, false)).id, (select id from ids where name = 'vocab1'), 'palpite do agente não derruba o que a pessoa corrigiu');
insert into ids select 'vocab2', (pg_temp.learn('Vocabulário', 'Nunca usar “promoção imperdível” nem “imperdível”.', 'w3', 0.9, true)).id;
select is((select supersedes_id from public.agent_learnings where id = (select id from ids where name = 'vocab2')), (select id from ids where name = 'vocab1'), 'correção nova substitui a anterior');
select throws_ok(
  $$ update public.agent_learnings set learning = 'outro texto' where id = (select id from ids where name = 'vocab2') $$,
  '55000', 'Aprendizado não se edita: evidência nova cria uma versão nova.', 'texto não se edita, nem pelo papel privilegiado'
);
select throws_ok(
  $$ update public.agent_learnings set status = 'discarded' where id = (select id from ids where name = 'vocab1') $$,
  '55000', 'Esta versão do aprendizado já foi substituída.', 'versão substituída não muda de estado'
);
insert into ids select 'tone', (pg_temp.learn('Tratamento', 'Chamar de você.', 'w1', 0.3, false)).id;

-- ---------------------------------------------------------------------------------------------------
-- Isolamento e decisões do owner
-- ---------------------------------------------------------------------------------------------------
select pg_temp.act_as((select marina from fx));
select ok((select count(*) from public.agent_learnings) >= 3, 'Marina lê os aprendizados da Miolo');
reset role;
select pg_temp.act_as((select rafael from fx));
select is((select count(*)::int from public.agent_learnings), 0, 'Rafael não vê os aprendizados da Miolo');
select is((select count(*)::int from public.memory_reflections), 0, 'Rafael não vê as reflexões da Miolo');
select throws_ok(
  format('select app.promote_learning(%L)', (select id from ids where name = 'tone')),
  'P0002', 'Aprendizado não encontrado.', 'Rafael não promove aprendizado da Miolo'
);
reset role;
select pg_temp.act_as((select pedro from fx));
select is((select count(*)::int from public.agent_learnings), 0, 'Pedro, sem workspace, não vê nada');
reset role;

insert into public.memberships (workspace_id, user_id, role) select miolo, carla, 'editor' from fx;
select pg_temp.act_as((select carla from fx));
select throws_ok(
  format('select app.discard_learning(%L)', (select id from ids where name = 'tone')),
  '42501', 'Só o dono da conta toma esta decisão.', 'editor não decide sobre aprendizado'
);
reset role;

select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.keep_learning(%L)', (select id from ids where name = 'tone')),
  '55000', 'Só um aprendizado em uso pode continuar valendo.', '"continua valendo" só para promovido'
);
select is((select status::text || '/' || promotion_rule from app.promote_learning((select id from ids where name = 'tone'))), 'promoted/owner', 'owner promove');
select is((select decided_at from app.promote_learning((select id from ids where name = 'tone'))), (select decided_at from public.agent_learnings where id = (select id from ids where name = 'tone')), 'promover de novo devolve o mesmo');
select isnt((select reviewed_at from app.keep_learning((select id from ids where name = 'tone'))), null, '"continua valendo" renova a revisão');
select is((select status::text from app.discard_learning((select id from ids where name = 'tone'))), 'discarded', 'owner descarta');
reset role;
select is((pg_temp.learn('Tratamento', 'Chamar de você.', 'w9', 0.99, true)).id, (select id from ids where name = 'tone'), 'descartado não volta com a mesma lição');

-- ---------------------------------------------------------------------------------------------------
-- Contexto do run e boas-vindas
-- ---------------------------------------------------------------------------------------------------
select lives_ok(
  format(
    'insert into public.run_context_items (workspace_id, run_id, kind, learning_id, reason, tokens) values (%L, %L, ''learning'', %L, ''delivery'', 12)',
    (select miolo from fx), (select run from fx), (select id from ids where name = 'vocab2')
  ),
  'run_context_items registra aprendizado pela delivery'
);
select throws_ok(
  format(
    'insert into public.run_context_items (workspace_id, run_id, kind, fact_id, reason, tokens) values (%L, %L, ''learning'', null, ''search'', 5)',
    (select miolo from fx), (select run from fx)
  ),
  '23514', null, 'item de aprendizado sem aprendizado é recusado'
);

select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.start_welcome(%L, %L, %L)', (select miolo from fx), 'Boas-vindas', 'Sou o Nexo.'),
  '55000', 'As boas-vindas do Nexo nascem junto com o negócio.', 'ninguém fala como o Nexo depois que o negócio existe'
);
select throws_ok(
  format('select app.note_objective(%L, %L)', (select id from public.brand_facts where workspace_id = (select miolo from fx) limit 1), 'Anotei.'),
  '55000', 'O Nexo só anota o objetivo que acabou de ser contado.', 'o Nexo só anota o objetivo recém-contado'
);
reset role;
select pg_temp.act_as((select carla from fx));
select throws_ok(
  format('select app.start_welcome(%L, %L, %L)', (select vitta from fx), 'Boas-vindas', 'Sou o Nexo.'),
  '42501', 'Só o dono da conta abre as boas-vindas.', 'editor não abre boas-vindas'
);
reset role;

select * from finish();
rollback;
