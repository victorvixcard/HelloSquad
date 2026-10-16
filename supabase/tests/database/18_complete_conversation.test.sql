-- S1f: conversa em grupo (2 a 6, uma por conjunto), quem responde (um especialista por vez: "@Nome",
-- palavras do protótipo, Nexo ou o primeiro), contexto dos tipos do protótipo, leitura por pessoa,
-- tópico da Sala só pelo agente, pedido de resposta e cartão sempre ligado ao objeto.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(55);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000000813'::uuid as tone_fact,
  '5eed0000-0000-4000-8000-000000000821'::uuid as seed_suggestion,
  '5eed0000-0000-4000-8000-000000000301'::uuid as seed_work_item,
  '5eed0000-0000-4000-8000-000000000101'::uuid as seed_room;
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

-- ---------------------------------------------------------------------------------------------------
-- Grupo
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids select 'group', id
from app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['otto', 'bia', 'kaia']::public.agent_id[]);

select is(
  (select row(kind::text, group_key, primary_agent_id::text)::text from public.conversations where id = (select id from ids where name = 'group')),
  row('group', 'bia,kaia,otto', 'bia')::text,
  'grupo guarda o conjunto na ordem do squad; à frente, o primeiro (sem o Nexo)'
);
select is(
  (select array_agg(agent_id::text order by agent_id) from public.conversation_participants
   where conversation_id = (select id from ids where name = 'group') and participant_type = 'agent'),
  array['bia', 'kaia', 'otto'],
  'os escolhidos participam, e só eles'
);
select is(
  (select id from app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['kaia', 'bia', 'otto']::public.agent_id[])),
  (select id from ids where name = 'group'),
  'o mesmo conjunto em outra ordem reabre a mesma conversa'
);
insert into ids select 'group_nexo', id
from app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['iris', 'nexo']::public.agent_id[]);
select is(
  (select primary_agent_id::text from public.conversations where id = (select id from ids where name = 'group_nexo')),
  'nexo',
  'com o Nexo no grupo, ele está à frente'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['otto']::public.agent_id[])$$,
  '22023', 'Conversa em grupo precisa de 2 a 6 especialistas diferentes.', 'grupo de um só é recusado'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']::public.agent_id[])$$,
  '22023', 'Conversa em grupo precisa de 2 a 6 especialistas diferentes.', 'os sete são a Sala do Squad, não um grupo'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'group', p_agent_ids => array['otto', 'otto']::public.agent_id[])$$,
  '22023', 'Conversa em grupo precisa de 2 a 6 especialistas diferentes.', 'especialista repetido não conta duas vezes'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'group', 'otto', p_agent_ids => array['bia', 'kaia']::public.agent_id[])$$,
  '22023', 'Quem está à frente precisa estar no grupo.', 'quem está à frente precisa ser do grupo'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'otto', p_agent_ids => array['bia', 'kaia']::public.agent_id[])$$,
  '22023', 'Só a conversa em grupo recebe a lista de especialistas.', 'lista de especialistas fora do grupo é recusada'
);

-- ---------------------------------------------------------------------------------------------------
-- Quem responde (um especialista por vez)
-- ---------------------------------------------------------------------------------------------------

reset role;
select is(app.conversation_speaker((select id from ids where name = 'group'), 'Preciso de uma legenda para o Instagram'), 'otto', 'legenda e Instagram: o Otto');
select is(app.conversation_speaker((select id from ids where name = 'group'), 'Quero entender o mercado e a concorrência'), 'bia', 'mercado e concorrência: a Bia');
select is(app.conversation_speaker((select id from ids where name = 'group'), 'Uma legenda pro post'), 'kaia', 'empate fica com o primeiro na ordem do squad');
select is(app.conversation_speaker((select id from ids where name = 'group'), 'Bom dia'), 'bia', 'sem palavra de ninguém e sem o Nexo: o primeiro do grupo');
select is(app.conversation_speaker((select id from ids where name = 'group_nexo'), 'Bom dia'), 'nexo', 'sem palavra de ninguém, com o Nexo: o Nexo');
select is(app.conversation_speaker((select id from ids where name = 'group'), 'Legenda nova, @Kaia?'), 'kaia', '"@Nome" de quem participa direciona');
select is(app.conversation_speaker((select id from ids where name = 'group'), '@Íris, e a legenda?'), 'otto', '"@Nome" de quem não participa não direciona');
select is(app.conversation_speaker((select seed_room from fx), 'Uma legenda para o Instagram'), 'nexo', 'na Sala do Squad, o Nexo distribui');
select is(app.conversation_speaker((select seed_room from fx), '@Otto, uma legenda'), 'otto', 'na Sala do Squad, "@Nome" direciona');
select ok(
  not has_function_privilege('authenticated', 'app.conversation_speaker(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'app.set_conversation_topic(uuid, uuid, text)', 'execute'),
  'quem responde e o tópico da Sala ficam com o banco e o agente'
);

-- ---------------------------------------------------------------------------------------------------
-- Contexto de objeto
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids select 'metric', id from app.create_conversation(
  (select miolo from fx), 'object', 'iris', 'metric', null, null, null, 'alcance:semana',
  '{"title": "Alcance da semana", "period": "Semana 42", "origin": "Resultados · semana", "status": null}'
);
select is(
  (select context_meta from public.conversations where id = (select id from ids where name = 'metric')),
  '{"title": "Alcance da semana", "period": "Semana 42", "origin": "Resultados · semana"}'::jsonb,
  'objeto sem tabela guarda título, período e origem (nulo fica de fora)'
);
select is(
  (select id from app.create_conversation((select miolo from fx), 'object', null, 'metric', null, null, null, 'alcance:semana', '{"title": "Outro"}')),
  (select id from ids where name = 'metric'),
  'mesma chave reabre a mesma conversa'
);
select isnt(
  (select id from app.create_conversation((select miolo from fx), 'object', null, 'capability', null, null, null, '04.01', '{"title": "Textos"}')),
  (select id from app.create_conversation((select miolo from fx), 'object', null, 'capability', null, null, null, '04.01', '{"title": "Textos"}')),
  'pedido do catálogo abre uma conversa por pedido'
);
select is(
  (select primary_agent_id::text from app.create_conversation((select miolo from fx), 'object', null, 'capability', null, null, null, '04.01', '{"title": "Textos"}')),
  'otto',
  'pedido do catálogo fica com o dono da capacidade'
);
insert into ids select 'fact', id from app.create_conversation(
  (select miolo from fx), 'object', null, 'memory_fact', (select tone_fact from fx), null, null, null,
  '{"title": "ignorado", "period": "Outubro"}'
);
select is(
  (select context_meta from public.conversations where id = (select id from ids where name = 'fact')),
  '{"period": "Outubro"}'::jsonb,
  'objeto do banco: título e estado vêm de lá, só período e origem ficam'
);
select is(
  (select primary_agent_id::text from app.create_conversation((select miolo from fx), 'object', null, 'insight', (select seed_suggestion from fx))),
  'otto',
  '"<Agente> percebeu" fica com quem percebeu'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'calendar_post', null, null, null, 'post-1')$$,
  '22023', 'Informe o título do objeto da conversa.', 'objeto sem tabela precisa do título'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'metric', (select tone_fact from fx), null, null, null, '{"title": "X"}')$$,
  '22023', 'Este tipo de objeto chega pela chave (context_key), não pelo id.', 'objeto sem tabela não vem pelo id'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'work_item', (select seed_work_item from fx), null, null, 'chave')$$,
  '22023', 'Conversa de objeto precisa do tipo e do id do objeto.', 'objeto do banco não vem pela chave'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'capability', null, null, null, '99.01', '{"title": "X"}')$$,
  '22023', 'Capacidade fora do catálogo.', 'capacidade fora do catálogo é recusada'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'metric', null, null, null, 'k', '{"title": "X", "cor": "azul"}')$$,
  '22023', 'Campo de contexto desconhecido: cor.', 'campo de contexto desconhecido é recusado'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'metric', null, null, null, 'k', jsonb_build_object('title', 'X', 'period', repeat('a', 81)))$$,
  '22023', 'O campo period do contexto passou de 80 caracteres.', 'período longo é recusado'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'squad_room', p_context_meta => '{"period": "Semana 42"}')$$,
  '22023', 'Só conversa do tipo object tem objeto de contexto.', 'contexto fora de kind = object é recusado'
);

-- ---------------------------------------------------------------------------------------------------
-- Pedido de resposta
-- ---------------------------------------------------------------------------------------------------

insert into ids select 'asked', id from app.post_message((select id from ids where name = 'group'), 'Quero entender o mercado do bairro');
insert into ids select 'reply_run', id from app.request_reply((select id from ids where name = 'asked'));
select is(
  (select row(agent_id::text, status::text, work_item_id is null, message_id = (select id from ids where name = 'asked'))::text
   from public.runs where id = (select id from ids where name = 'reply_run')),
  row('bia', 'queued', true, true)::text,
  'pedido de resposta: run na fila, sem trabalho, para quem responde'
);
select is(
  (select id from app.request_reply((select id from ids where name = 'asked'))),
  (select id from ids where name = 'reply_run'),
  'pedir de novo devolve o mesmo run'
);
reset role;
select is(
  (select count(*)::int from pgmq.q_runs_interactive where message->>'run_id' = (select id::text from ids where name = 'reply_run')),
  1,
  'uma mensagem na fila runs_interactive'
);
insert into ids select 'otto_answer', id from app.post_agent_message(
  (select miolo from fx), (select id from ids where name = 'group'), 'otto', null, 'Aqui é o Otto.'
);
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.request_reply(%L)', (select id from ids where name = 'otto_answer')),
  '22023', 'Só mensagem de pessoa pede resposta do squad.', 'mensagem de agente não pede resposta'
);
insert into ids select 'work_message', id from app.post_message((select id from ids where name = 'group'), 'Legenda do sábado');
select lives_ok(
  format('select app.create_work_item_from_message(%L, %L, %L)', (select id from ids where name = 'work_message'), '04.01', 'Legenda do sábado'),
  'a mensagem vira trabalho'
);
select throws_ok(
  format('select app.request_reply(%L)', (select id from ids where name = 'work_message')),
  '55000', 'Esta mensagem já virou trabalho: quem responde é o especialista do trabalho.', 'mensagem que virou trabalho não pede outra resposta'
);

-- ---------------------------------------------------------------------------------------------------
-- Leitura por pessoa e isolamento
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select rafael from fx));
insert into ids select 'vitta_group', id from app.create_conversation((select vitta from fx), 'group', p_agent_ids => array['max', 'iris']::public.agent_id[]);
insert into ids select 'vitta_message', id from app.post_message((select id from ids where name = 'vitta_group'), 'Quero ver os resultados');
select is(
  (select last_read_at from app.mark_conversation_read((select id from ids where name = 'vitta_group'), '2026-10-16 10:00:00-03')),
  '2026-10-16 10:00:00-03'::timestamptz,
  'Rafael marca até onde leu'
);
select is(
  (select last_read_at from app.mark_conversation_read((select id from ids where name = 'vitta_group'), '2026-10-01 10:00:00-03')),
  '2026-10-16 10:00:00-03'::timestamptz,
  'ler para trás não desfaz a leitura'
);
select ok(
  (select last_read_at from app.mark_conversation_read((select id from ids where name = 'vitta_group'), '2999-01-01')) <= now(),
  'leitura no futuro fica em agora'
);
select is((select count(*)::int from public.conversation_reads), 1, 'Rafael vê a própria leitura');
select pg_temp.act_as((select carla from fx));
select is((select count(*)::int from public.conversation_reads), 0, 'Carla não vê a leitura do Rafael');
select lives_ok(
  format('select app.mark_conversation_read(%L)', (select id from ids where name = 'vitta_group')),
  'Carla marca a própria leitura'
);
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.mark_conversation_read(%L)', (select id from ids where name = 'vitta_group')),
  'P0002', 'Conversa não encontrada.', 'Marina não marca conversa da Vitta'
);
select throws_ok(
  format('select app.request_reply(%L)', (select id from ids where name = 'vitta_message')),
  'P0002', 'Mensagem não encontrada.', 'Marina não pede resposta na Vitta'
);
select is(
  (select count(*)::int from public.conversation_reads where conversation_id = (select id from ids where name = 'vitta_group')),
  0,
  'Marina não vê leitura da Vitta'
);

-- ---------------------------------------------------------------------------------------------------
-- Tópico da Sala e cartões
-- ---------------------------------------------------------------------------------------------------

reset role;
select is(
  (select topic from app.set_conversation_topic((select miolo from fx), (select seed_room from fx), ' Campanha de Natal ')),
  'Campanha de Natal',
  'o agente escreve o tópico da Sala'
);
select throws_ok(
  format('select app.set_conversation_topic(%L, %L, %L)', (select vitta from fx), (select seed_room from fx), 'Outro'),
  'P0002', 'Sala do Squad não encontrada.', 'tópico só na Sala do próprio workspace'
);
select throws_ok(
  format('update public.conversations set topic = %L where id = %L', 'Natal', (select id from ids where name = 'group')),
  '23514', null, 'tópico só existe na Sala do Squad'
);

with w as (
  insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id)
  values ((select vitta from fx), 'Trabalho da Vitta', '04.01', 'otto')
  returning id
)
insert into ids select 'vitta_work_item', id from w;
select throws_ok(
  format(
    $$update public.messages set card = '{"type": "material", "actions": []}', work_item_id = %L where id = %L$$,
    (select seed_work_item from fx), (select id from ids where name = 'otto_answer')
  ),
  '23514', null, 'cartão material sem a versão da entrega é recusado'
);
select throws_ok(
  format(
    $$update public.messages set card = '{"type": "work_created"}', work_item_id = %L where id = %L$$,
    (select seed_work_item from fx), (select id from ids where name = 'asked')
  ),
  '23514', null, 'mensagem de pessoa não tem cartão'
);
select throws_ok(
  format(
    $$update public.messages set work_item_id = %L where id = %L$$,
    (select seed_work_item from fx), (select id from ids where name = 'otto_answer')
  ),
  '23514', null, 'ligação ao objeto sem cartão é recusada'
);
select throws_ok(
  format(
    $$update public.messages set card = '{"type": "work_created"}', work_item_id = %L where id = %L$$,
    (select id from ids where name = 'vitta_work_item'), (select id from ids where name = 'otto_answer')
  ),
  '23503', null, 'cartão não liga a objeto de outro workspace'
);
select lives_ok(
  format(
    $$update public.messages set card = '{"type": "work_created", "actions": [{"id": "open"}]}', work_item_id = %L where id = %L$$,
    (select seed_work_item from fx), (select id from ids where name = 'otto_answer')
  ),
  'cartão de trabalho criado ligado ao trabalho do mesmo workspace'
);

select * from finish();
rollback;
