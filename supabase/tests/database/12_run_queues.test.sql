-- S1a: filas pgmq. create_work_item_from_message deixa trabalho (draft) + run queued + mensagem na fila
-- runs_interactive na mesma transação, e é idempotente. authenticated, anon e service_role não tocam
-- no schema pgmq; a fila é lida aqui pelo papel privilegiado.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(18);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo;
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

select ok(
  (select array_agg(queue_name::text order by queue_name) from pgmq.list_queues())
    @> array['external_actions', 'memory_reflect', 'runs_interactive', 'runs_scheduled'],
  'as quatro filas existem'
);
with c as (
  insert into public.conversations (workspace_id, kind, primary_agent_id)
  select miolo, 'agent_direct', 'otto' from fx
  returning id
)
insert into ids select 'conversation', id from c;

-- Marina pede, e o pedido vira trabalho
select pg_temp.act_as((select marina from fx));
insert into ids
select 'message', id from app.post_message((select id from ids where name = 'conversation'), 'Legenda para o pão de sábado, tom acolhedor.');
insert into ids
select 'work_item', id
from app.create_work_item_from_message(
  (select id from ids where name = 'message'), '04.01', 'Legenda do pão de sábado', '{"canal": "instagram"}'
);

select is(
  (select row(status, primary_agent_id, created_by, origin_message_id, delivery_type, briefing)::text
   from public.work_items where id = (select id from ids where name = 'work_item')),
  row('draft', 'otto', (select marina from fx), (select id from ids where name = 'message'), '04.01', '{"canal": "instagram"}')::text,
  'trabalho criado em draft, do Otto (dono do 04.01), com a mensagem de origem'
);
select is(
  (select row(kind, status, agent_id, conversation_id)::text from public.runs where work_item_id = (select id from ids where name = 'work_item')),
  row('interactive', 'queued', 'otto', (select id from ids where name = 'conversation'))::text,
  'run interativo em queued'
);

-- Segunda chamada (clique repetido): mesmo trabalho, nenhum run ou mensagem de fila a mais
select is(
  (app.create_work_item_from_message((select id from ids where name = 'message'), '04.01', 'Outro título', '{}')).id,
  (select id from ids where name = 'work_item'),
  'segunda chamada devolve o mesmo trabalho'
);

select throws_ok(
  format($$select app.create_work_item_from_message(%L, '99.01', 'x', '{}')$$, (select id from ids where name = 'message')),
  '22023', 'Tipo de delivery fora do catálogo.', 'tipo de delivery fora do catálogo é recusado'
);
select throws_ok(
  format($$select app.create_work_item_from_message(%L, '04.01', '  ', '{}')$$, (select id from ids where name = 'message')),
  '22023', 'O título precisa ter de 1 a 200 caracteres.', 'título em branco é recusado'
);

-- Fila fechada para authenticated
select throws_ok(
  $$select pgmq.send('runs_interactive', '{"run_id": "falso"}')$$,
  '42501', null, 'Marina não envia para a fila'
);
select throws_ok(
  'select * from pgmq.q_runs_interactive',
  '42501', null, 'Marina não lê a tabela da fila'
);
select throws_ok(
  format('select app.enqueue_run(%L)', gen_random_uuid()),
  '42501', null, 'Marina não executa app.enqueue_run'
);

-- Pedro não cria trabalho a partir da mensagem da Miolo
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format($$select app.create_work_item_from_message(%L, '04.01', 'x', '{}')$$, (select id from ids where name = 'message')),
  'P0002', 'Mensagem não encontrada.', 'Pedro não cria trabalho com mensagem da Miolo'
);

-- Papel privilegiado lê a fila
reset role;
select is(
  (select count(*) from public.runs where work_item_id = (select id from ids where name = 'work_item')),
  1::bigint,
  'um run para o trabalho, mesmo com duas chamadas'
);
select is(
  (select count(*) from pgmq.q_runs_interactive
   where message ->> 'run_id' = (select id::text from public.runs where work_item_id = (select id from ids where name = 'work_item'))),
  1::bigint,
  'uma mensagem na fila runs_interactive para o run'
);
select is(
  (select message - 'run_id' - 'work_item_id' from pgmq.q_runs_interactive
   where message ->> 'run_id' = (select id::text from public.runs where work_item_id = (select id from ids where name = 'work_item'))),
  jsonb_build_object(
    'workspace_id', (select miolo from fx), 'kind', 'interactive', 'agent_id', 'otto',
    'conversation_id', (select id from ids where name = 'conversation')
  ),
  'a mensagem da fila leva workspace_id explícito, tipo, agente e conversa'
);
select is(
  (select count(*) from public.audit_events where action = 'work_item.created' and entity_id = (select id from ids where name = 'work_item')::text),
  1::bigint,
  'criação registrada uma vez em audit_events'
);

update public.runs set status = 'running' where work_item_id = (select id from ids where name = 'work_item');
select throws_ok(
  format('select app.enqueue_run(%L)', (select id from public.runs where work_item_id = (select id from ids where name = 'work_item'))),
  '55000', 'Só run em queued entra na fila; este está em running.', 'run que não está em queued não volta para a fila'
);

select is(
  (select array_agg(r order by r) from (
    select r from unnest(array['authenticated', 'anon', 'service_role']) as r
    where has_schema_privilege(r, 'pgmq', 'usage')
  ) x),
  null,
  'nenhum papel da Data API tem USAGE no schema pgmq'
);
select is_empty(
  $$select r, p.oid::regprocedure from pg_proc p
    cross join unnest(array['authenticated', 'anon', 'service_role']) as r
    where p.pronamespace = 'pgmq'::regnamespace and has_function_privilege(r, p.oid, 'execute')$$,
  'nenhum papel da Data API executa função do pgmq'
);
select is_empty(
  $$select r, c.oid::regclass from pg_class c
    cross join unnest(array['authenticated', 'anon', 'service_role']) as r
    where c.relnamespace = 'pgmq'::regnamespace and c.relkind in ('r', 'p', 'S', 'v')
      and (has_table_privilege(r, c.oid, 'select') or has_table_privilege(r, c.oid, 'insert')
           or has_table_privilege(r, c.oid, 'update') or has_table_privilege(r, c.oid, 'delete'))$$,
  'nenhum papel da Data API tem privilégio em tabela do pgmq'
);

select * from finish();
rollback;
