-- S1b: app.create_conversation (buscar ou criar a Sala do Squad e a conversa de um objeto; conversa direta
-- sempre nova; contexto só em kind = object e no mesmo workspace) e o bucket privado deliveries.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(25);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'juliana@trilha.example') as juliana,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  (select id from public.workspaces where slug = 'trilha') as trilha;
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

-- Um trabalho na Vitta (o seed não tem) para provar que contexto de outro workspace não passa.
insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id)
select vitta, 'Trabalho da Vitta', '04.01', 'otto' from fx;
insert into ids select 'vitta_work_item', id from public.work_items where title = 'Trabalho da Vitta';
insert into storage.objects (bucket_id, name)
select 'deliveries', miolo || '/deliveries/5eed0000-0000-4000-8000-000000000501/1/legenda.txt' from fx
union all
select 'deliveries', vitta || '/deliveries/' || gen_random_uuid() || '/1/legenda.txt' from fx;

-- Conversa direta: sempre nova, com quem abriu e o agente
select pg_temp.act_as((select marina from fx));
insert into ids select 'direct', id from app.create_conversation((select miolo from fx), 'agent_direct', 'otto');
insert into ids select 'direct_2', id from app.create_conversation((select miolo from fx), 'agent_direct', 'otto', null, null, '  Outra conversa  ');

select is(
  (select row(kind, primary_agent_id, created_by, title, context_type)::text from public.conversations where id = (select id from ids where name = 'direct')),
  row('agent_direct', 'otto', (select marina from fx), null, null)::text,
  'conversa direta com o Otto criada pela Marina'
);
select is(
  (select array_agg(coalesce(agent_id::text, user_id::text) order by participant_type, agent_id)
   from public.conversation_participants where conversation_id = (select id from ids where name = 'direct')),
  array[(select marina::text from fx), 'otto'],
  'participantes: Marina e o Otto'
);
select isnt((select id from ids where name = 'direct_2'), (select id from ids where name = 'direct'), 'segunda conversa direta é outra');
select is((select title from public.conversations where id = (select id from ids where name = 'direct_2')), 'Outra conversa', 'título sem espaços nas pontas');
reset role;
select is(
  (select count(*)::int from public.audit_events where action = 'conversation.created' and entity_id = (select id::text from ids where name = 'direct')),
  1,
  'criação registrada em audit_events'
);
select pg_temp.act_as((select marina from fx));

-- Sala do Squad: a do seed é reutilizada
select is(
  (select id from app.create_conversation((select miolo from fx), 'squad_room')),
  '5eed0000-0000-4000-8000-000000000101'::uuid,
  'Sala do Squad da Miolo (seed) é reutilizada'
);
select is(
  (select count(*)::int from public.conversations where workspace_id = (select miolo from fx) and kind = 'squad_room'),
  1,
  'nenhuma segunda Sala do Squad na Miolo'
);

-- Conversa de objeto: buscar ou criar; agente vem do objeto
insert into ids
select 'object', id
from app.create_conversation((select miolo from fx), 'object', null, 'work_item', '5eed0000-0000-4000-8000-000000000301');
select is(
  (select row(kind, primary_agent_id, context_type, context_id)::text from public.conversations where id = (select id from ids where name = 'object')),
  row('object', 'otto', 'work_item', '5eed0000-0000-4000-8000-000000000301')::text,
  'conversa do trabalho do seed, com o Otto (responsável do trabalho)'
);
select is(
  (select id from app.create_conversation((select miolo from fx), 'object', 'nexo', 'work_item', '5eed0000-0000-4000-8000-000000000301')),
  (select id from ids where name = 'object'),
  'abrir de novo a conversa do mesmo objeto devolve a mesma'
);

-- Entradas inválidas
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'otto', 'work_item', '5eed0000-0000-4000-8000-000000000301')$$,
  '22023', 'Só conversa do tipo object tem objeto de contexto.', 'contexto fora de kind = object é recusado'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', 'otto')$$,
  '22023', 'Conversa de objeto precisa do tipo e do id do objeto.', 'conversa de objeto sem objeto é recusada'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'campaign', gen_random_uuid())$$,
  '22023', 'Tipo de objeto não aceito.', 'tipo de objeto desconhecido é recusado'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'object', null, 'work_item', (select id from ids where name = 'vitta_work_item'))$$,
  'P0002', 'Objeto da conversa não encontrado.', 'objeto de outro workspace responde como inexistente'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct')$$,
  '22023', 'Conversa direta precisa do agente.', 'conversa direta sem agente é recusada'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'thor')$$,
  '23514', null, 'agente fora de squad/ é recusado pelo domínio'
);
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'otto', null, null, repeat('a', 201))$$,
  '22023', 'O título passou de 200 caracteres.', 'título longo é recusado'
);

-- Quem não é membro (ou não pode agir) não cria
select pg_temp.act_as((select rafael from fx));
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'otto')$$,
  'P0002', 'Workspace não encontrado.', 'Rafael não cria conversa na Miolo'
);
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'squad_room')$$,
  'P0002', 'Workspace não encontrado.', 'Pedro (sem workspace) não cria conversa'
);
reset role;
insert into public.memberships (workspace_id, user_id, role) select miolo, pedro, 'viewer' from fx;
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  $$select app.create_conversation((select miolo from fx), 'agent_direct', 'otto')$$,
  '42501', 'Seu papel não permite abrir conversas.', 'viewer não abre conversa'
);
reset role;
set local role anon;
select throws_ok(
  $$select app.create_conversation('00000000-0000-0000-0000-000000000000', 'squad_room')$$,
  '42501', null, 'anon não executa create_conversation'
);
reset role;

-- Trilha não tem Sala do Squad: nasce na primeira chamada, com os sete agentes, e é reutilizada depois
select pg_temp.act_as((select juliana from fx));
insert into ids select 'trilha_room', id from app.create_conversation((select trilha from fx), 'squad_room');
select is(
  (select row(title, primary_agent_id, (select count(*) from public.conversation_participants p where p.conversation_id = c.id and p.participant_type = 'agent'))::text
   from public.conversations c where c.id = (select id from ids where name = 'trilha_room')),
  row('Sala do Squad', 'nexo', 7)::text,
  'Sala do Squad da Trilha criada com o Nexo à frente e os sete agentes'
);
select is(
  (select id from app.create_conversation((select trilha from fx), 'squad_room')),
  (select id from ids where name = 'trilha_room'),
  'segunda chamada devolve a mesma Sala do Squad'
);

-- Storage: bucket privado, leitura pelo prefixo do workspace, nenhuma escrita com token de usuário
reset role;
select is((select public from storage.buckets where id = 'deliveries'), false, 'bucket deliveries existe e é privado');
select pg_temp.act_as((select marina from fx));
select is(
  (select array_agg(split_part(name, '/', 1)) from storage.objects where bucket_id = 'deliveries'),
  array[(select miolo::text from fx)],
  'Marina lê só o arquivo com o prefixo da Miolo'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('deliveries', '%s/deliveries/x/1/a.txt')$$, (select miolo from fx)),
  '42501', null, 'Marina não grava no bucket nem no próprio prefixo'
);

select * from finish();
rollback;
