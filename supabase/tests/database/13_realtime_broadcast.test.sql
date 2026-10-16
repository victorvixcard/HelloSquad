-- S1a: Realtime Broadcast a partir do banco. Inserir run_event (e criar/decidir approval) grava em
-- realtime.messages no tópico privado workspace:<id>; membro lê, não membro não lê; ninguém publica no
-- canal do workspace pelo cliente.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(13);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  'workspace:' || (select id from public.workspaces where slug = 'miolo') as miolo_topic;
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
grant select on ids to public;

select ok(
  to_regprocedure('realtime.send(jsonb, text, text, boolean)') is not null,
  'a imagem local tem realtime.send'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'realtime' and tablename = 'messages' and policyname = 'workspace_members_receive_broadcast'
      and cmd = 'SELECT' and roles = '{authenticated}'
  ),
  'política de leitura do canal do workspace existe em realtime.messages'
);

with
  r as (insert into public.runs (workspace_id, agent_id, idempotency_key)
        select miolo, 'otto', 'teste-realtime' from fx returning id, workspace_id),
  e as (insert into public.run_events (workspace_id, run_id, seq, type, payload)
        select workspace_id, id, 1, 'run.progress', '{"etapa": "escrevendo"}' from r returning id)
insert into ids select 'run', id from r union all select 'event', id from e;

select is(
  (select row(event, private, extension, payload ->> 'run_id', payload ->> 'type', payload -> 'payload')::text
   from realtime.messages
   where topic = (select miolo_topic from fx) and payload ->> 'id' = (select id from ids where name = 'event')::text),
  row('run_event', true, 'broadcast', (select id from ids where name = 'run')::text, 'run.progress', '{"etapa": "escrevendo"}'::jsonb)::text,
  'run_event publica no tópico privado workspace:<miolo>'
);

-- Approval criada e decidida também publicam
with
  w as (insert into public.work_items (workspace_id, title, status, primary_agent_id)
        select miolo, 'Legenda', 'needs_you', 'otto' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'review', 'otto' from w returning id)
insert into ids select 'approval', id from a;

select pg_temp.act_as((select marina from fx));
select app.decide_approval((select id from ids where name = 'approval'), 'approved');
reset role;

select results_eq(
  format(
    $$select event, payload ->> 'status' from realtime.messages
      where topic = %L and payload ->> 'id' = %L order by inserted_at, event$$,
    (select miolo_topic from fx), (select id from ids where name = 'approval')
  ),
  $$values ('approval.created', 'pending'), ('approval.decided', 'decided')$$,
  'approval publica ao ser criada e ao ser decidida'
);

-- Membro lê; não membro não lê
select pg_temp.act_as((select marina from fx));
select is(
  (select count(*) from realtime.messages
   where payload ->> 'id' in (select id::text from ids where name in ('event', 'approval'))),
  3::bigint,
  'Marina (membro da Miolo) lê os três avisos do canal da Miolo'
);

select pg_temp.act_as((select rafael from fx));
select is_empty(
  format('select 1 from realtime.messages where topic = %L', (select miolo_topic from fx)),
  'Rafael (Vitta) não lê o canal da Miolo'
);
select pg_temp.act_as((select pedro from fx));
select is_empty(
  format('select 1 from realtime.messages where topic = %L', (select miolo_topic from fx)),
  'Pedro (sem membership) não lê o canal da Miolo'
);
select pg_temp.act_as(null);
select is_empty(
  format('select 1 from realtime.messages where topic = %L', (select miolo_topic from fx)),
  'authenticated sem sub não lê o canal da Miolo'
);

reset role;
set local role anon;
select is_empty(
  format('select 1 from realtime.messages where topic = %L', (select miolo_topic from fx)),
  'anon não lê o canal da Miolo'
);

-- Cliente não publica no canal do workspace, nem sendo membro
reset role;
select pg_temp.act_as((select rafael from fx));
select throws_ok(
  format(
    $$insert into realtime.messages (topic, extension, event, payload, private) values (%L, 'broadcast', 'run_event', '{}', true)$$,
    (select miolo_topic from fx)
  ),
  '42501', null, 'Rafael não publica no canal da Miolo'
);
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format(
    $$insert into realtime.messages (topic, extension, event, payload, private) values (%L, 'broadcast', 'run_event', '{}', true)$$,
    (select miolo_topic from fx)
  ),
  '42501', null, 'nem Marina publica direto no canal da Miolo: só o banco publica'
);

-- Tópico malformado não quebra a leitura de quem é membro
reset role;
insert into realtime.messages (topic, extension, event, payload, private)
values ('workspace:nao-e-uuid', 'broadcast', 'x', '{}', true);
select pg_temp.act_as((select marina from fx));
select lives_ok(
  'select count(*) from realtime.messages',
  'tópico malformado não derruba a política'
);
select is_empty(
  $$select 1 from realtime.messages where topic = 'workspace:nao-e-uuid'$$,
  'tópico malformado não é visível'
);

reset role;
select * from finish();
rollback;
