-- S1a: máquina de estados dos trabalhos. Transição válida grava audit_events; inválida, done direto de
-- in_progress e estado esperado divergente falham com SQLSTATE próprio; UPDATE direto fora da matriz
-- também falha; authenticated não executa a função.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(17);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from public.workspaces where slug = 'miolo') as miolo;
grant select on fx to public;

create temporary table wi (tag text, id uuid);
grant select on wi to public;
insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id, idempotency_key)
select miolo, 'Legenda ' || tag, '04.01', 'otto', 'teste-transicao-' || tag
from fx, unnest(array['a', 'b', 'c']) as tag;
insert into wi select substr(idempotency_key, 17), id from public.work_items where idempotency_key like 'teste-transicao-%';

-- Matriz
select results_eq(
  $$select from_status::text from app.work_item_transitions where to_status = 'done' order by 1$$,
  $$values ('approved'), ('scheduled')$$,
  'done só vem de approved ou de scheduled (execução confirmada)'
);
select is_empty(
  $$select 1 from app.work_item_transitions where from_status in ('done', 'cancelled')$$,
  'done e cancelled são finais'
);

-- Caminho válido: draft → in_progress → needs_you → approved → done
select is(
  (app.transition_work_item((select id from wi where tag = 'a'), 'in_progress', 'agent', 'nexo', 'escopo ok')).status,
  'in_progress'::public.work_item_status,
  'draft → in_progress'
);
select is(
  (select payload from public.audit_events
   where entity_type = 'work_item' and entity_id = (select id from wi where tag = 'a')::text
     and action = 'work_item.status_changed'),
  '{"from": "draft", "to": "in_progress", "note": "escopo ok"}'::jsonb,
  'transição registrada em audit_events com origem, destino e nota'
);
select is(
  (select row(actor_type, actor_id)::text from public.audit_events
   where entity_id = (select id from wi where tag = 'a')::text and action = 'work_item.status_changed'),
  row('agent', 'nexo')::text,
  'audit_events guarda quem fez a transição'
);

select throws_ok(
  format($$select app.transition_work_item(%L, 'done', 'agent', 'otto')$$, (select id from wi where tag = 'a')),
  'WI001', 'Transição de trabalho não permitida: in_progress → done.',
  'done direto de in_progress é recusado'
);
select throws_ok(
  format($$select app.transition_work_item(%L, 'done', 'agent', 'otto')$$, (select id from wi where tag = 'b')),
  'WI001', 'Transição de trabalho não permitida: draft → done.',
  'draft → done é recusado'
);
select throws_ok(
  format($$select app.transition_work_item(%L, 'approved', 'agent', 'otto')$$, (select id from wi where tag = 'a')),
  'WI001', null,
  'in_progress → approved (sem passar pela revisão) é recusado'
);

select lives_ok(
  format($$select app.transition_work_item(%L, 'needs_you', 'agent', 'otto')$$, (select id from wi where tag = 'a')),
  'in_progress → needs_you'
);
select lives_ok(
  format($$select app.transition_work_item(%L, 'approved', 'user', %L)$$, (select id from wi where tag = 'a'), (select marina from fx)),
  'needs_you → approved'
);
select is(
  (app.transition_work_item((select id from wi where tag = 'a'), 'done', 'system', 'worker')).status,
  'done'::public.work_item_status,
  'approved → done'
);
select is(
  (select count(*) from public.audit_events
   where entity_id = (select id from wi where tag = 'a')::text and action = 'work_item.status_changed'),
  4::bigint,
  'quatro transições, quatro eventos'
);

-- Concorrência: o estado esperado não é mais o atual
select throws_ok(
  format($$select app.transition_work_item(%L, 'in_progress', 'agent', 'nexo', null, 'needs_you')$$, (select id from wi where tag = 'b')),
  'WI002', 'O trabalho está em draft, não em needs_you.',
  'estado esperado divergente falha com WI002'
);

-- UPDATE direto do papel privilegiado também respeita a matriz
select throws_ok(
  format($$update public.work_items set status = 'done' where id = %L$$, (select id from wi where tag = 'c')),
  'WI001', 'Transição de trabalho não permitida: draft → done.',
  'UPDATE direto fora da matriz é recusado pelo trigger'
);

select throws_ok(
  format($$select app.transition_work_item(%L, 'in_progress', 'agent', 'fulano')$$, (select id from wi where tag = 'c')),
  '23514', null,
  'agente fora de squad/ é recusado como ator'
);
select throws_ok(
  format($$select app.transition_work_item(%L, 'in_progress', 'agent', 'nexo')$$, gen_random_uuid()),
  'P0002', 'Trabalho não encontrado.',
  'trabalho inexistente'
);

-- authenticated não move trabalho por esta função (decisão do usuário passa por app.decide_approval)
select set_config('request.jwt.claims', json_build_object('sub', (select marina from fx), 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  format($$select app.transition_work_item(%L, 'in_progress', 'user', %L)$$, (select id from wi where tag = 'c'), (select marina from fx)),
  '42501', null,
  'Marina não executa app.transition_work_item'
);

reset role;
select * from finish();
rollback;
