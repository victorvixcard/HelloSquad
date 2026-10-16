-- S1a: app.decide_approval idempotente (duas chamadas, uma mudança), efeitos da decisão (versão aprovada,
-- trabalho sai de needs_you) e quem pode decidir.
-- S1c (decisão do dono, 16/10 08:55): só o owner decide; rejeitar leva follow_up cancel (trabalho
-- cancelado) ou revise (nova proposta); ajuste, nova proposta e resposta põem um run novo na fila.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(33);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta;
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

-- Trabalho da Miolo em needs_you com a versão 1 da legenda e uma revisão pendente
with
  w as (insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id)
        select miolo, 'Legenda do pão de sábado', '04.01', 'needs_you', 'otto' from fx returning id, workspace_id),
  d as (insert into public.deliveries (workspace_id, work_item_id, kind) select workspace_id, id, 'caption' from w returning id, workspace_id),
  v as (insert into public.delivery_versions (workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id)
        select workspace_id, id, 1, '{"texto": "Sábado tem pão de fermentação longa."}', 'agent', 'otto' from d returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, delivery_version_id, kind, requested_by_agent_id)
        select v.workspace_id, w.id, v.id, 'review', 'otto' from v, w returning id)
insert into ids
select 'work_item', id from w union all select 'delivery', id from d union all
select 'version', id from v union all select 'approval', id from a;

-- Segundo trabalho (ajuste pedido), uma pergunta (respond) e uma autorização na Vitta
with
  w as (insert into public.work_items (workspace_id, title, status, primary_agent_id)
        select miolo, 'Post de domingo', 'needs_you', 'otto' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'review', 'otto' from w returning id),
  r as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'respond', 'otto' from w returning id)
insert into ids
select 'work_item_2', id from w union all select 'approval_2', id from a union all select 'respond_2', id from r;

with
  w as (insert into public.work_items (workspace_id, title, status, primary_agent_id)
        select vitta, 'Campanha de inverno', 'approved', 'kiwi' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'authorize', 'kiwi' from w returning id)
insert into ids select 'authorize_vitta', id from a;

with
  w as (insert into public.work_items (workspace_id, title, status, primary_agent_id)
        select vitta, 'Post de inverno', 'needs_you', 'otto' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'review', 'otto' from w returning id)
insert into ids select 'review_vitta', id from a;

-- Duas entregas da Miolo para as saídas da rejeição (cancelar e pedir nova proposta)
with
  w as (insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id)
        select miolo, 'Legenda de terça', '04.01', 'needs_you', 'otto' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'review', 'otto' from w returning id)
insert into ids select 'work_item_3', (select id from w) union all select 'reject_cancel', (select id from a);
with
  w as (insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id)
        select miolo, 'Legenda de quarta', '04.01', 'needs_you', 'otto' from fx returning id, workspace_id),
  a as (insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
        select workspace_id, id, 'review', 'otto' from w returning id)
insert into ids select 'work_item_4', (select id from w) union all select 'reject_revise', (select id from a);

-- Primeira decisão da Marina
select pg_temp.act_as((select marina from fx));

create temporary table first_call as
select * from app.decide_approval((select id from ids where name = 'approval'), 'approved', 'Pode seguir.');
grant select on first_call to public;

select is(
  (select row(status, decision, decided_by, note)::text from first_call),
  row('decided', 'approved', (select marina from fx), 'Pode seguir.')::text,
  'primeira chamada decide: status, decisão, quem decidiu e observação'
);
select is(
  (select status from public.work_items where id = (select id from ids where name = 'work_item')),
  'approved'::public.work_item_status,
  'revisão aprovada leva o trabalho de needs_you para approved'
);
select is(
  (select status from public.delivery_versions where id = (select id from ids where name = 'version')),
  'approved'::public.delivery_version_status,
  'a versão revisada fica aprovada'
);
select is(
  (select current_version_id from public.deliveries where id = (select id from ids where name = 'delivery')),
  (select id from ids where name = 'version'),
  'a versão aprovada vira a atual da entrega'
);

-- Segunda chamada (clique repetido) e terceira com outra decisão: no-op, estado atual, sem erro
create temporary table second_call as
select * from app.decide_approval((select id from ids where name = 'approval'), 'approved', 'Clique repetido.');
grant select on second_call to public;
create temporary table third_call as
select * from app.decide_approval((select id from ids where name = 'approval'), 'changes_requested', 'Mudei de ideia.');
grant select on third_call to public;

select is(
  (select row(status, decision, decided_at, note)::text from second_call),
  (select row(status, decision, decided_at, note)::text from first_call),
  'segunda chamada devolve o estado atual sem mudar nada'
);
select is(
  (select row(decision, decided_at, note)::text from third_call),
  (select row(decision, decided_at, note)::text from first_call),
  'chamada com outra decisão depois de decidida também é no-op'
);

reset role;
select is(
  (select count(*) from public.audit_events where entity_type = 'approval' and entity_id = (select id from ids where name = 'approval')::text),
  1::bigint,
  'três chamadas, um evento approval.decided'
);
select is(
  (select count(*) from public.audit_events
   where action = 'work_item.status_changed' and entity_id = (select id from ids where name = 'work_item')::text),
  1::bigint,
  'três chamadas, uma transição do trabalho'
);

-- Ajuste pedido: o trabalho só volta para in_progress quando não sobra pendência dele
select pg_temp.act_as((select marina from fx));
select is(
  (app.decide_approval((select id from ids where name = 'approval_2'), 'changes_requested', 'Mais curto.')).decision,
  'changes_requested'::public.approval_decision,
  'ajuste pedido registrado'
);
select is(
  (select status from public.work_items where id = (select id from ids where name = 'work_item_2')),
  'needs_you'::public.work_item_status,
  'com a pergunta ainda pendente, o trabalho continua em needs_you'
);
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'respond_2')),
  '22023', 'A decisão approved não vale para uma aprovação do tipo respond.',
  'decisão incompatível com o tipo é recusada'
);
select is(
  (app.decide_approval((select id from ids where name = 'respond_2'), 'answered', 'Use a foto do forno.')).status,
  'decided'::public.approval_status,
  'pergunta respondida'
);
select is(
  (select status from public.work_items where id = (select id from ids where name = 'work_item_2')),
  'in_progress'::public.work_item_status,
  'sem pendências, o trabalho volta para in_progress'
);
reset role;
select results_eq(
  format($$select agent_id::text, status::text, idempotency_key from public.runs where work_item_id = %L$$,
         (select id from ids where name = 'work_item_2')),
  format($$values ('otto', 'queued', %L)$$, 'approval:' || (select id from ids where name = 'respond_2')),
  'resposta dada: um run novo do responsável, na fila (o ajuste com pergunta pendente não criou outro)'
);
select is(
  (select count(*) from pgmq.q_runs_interactive
   where message->>'run_id' = (select id::text from public.runs where work_item_id = (select id from ids where name = 'work_item_2'))),
  1::bigint,
  'o run novo entra em runs_interactive na mesma transação da decisão'
);

-- Rejeitar exige a saída; saída só vale ao rejeitar
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'rejected')$$, (select id from ids where name = 'reject_cancel')),
  '22023', 'Ao rejeitar, escolha cancelar o trabalho ou pedir nova proposta.',
  'rejeitar sem dizer a saída é recusado'
);
select throws_ok(
  format($$select app.decide_approval(%L, 'approved', null, 'cancel')$$, (select id from ids where name = 'reject_cancel')),
  '22023', 'Cancelar ou pedir nova proposta só vale ao rejeitar uma entrega.',
  'saída da rejeição com outra decisão é recusada'
);
select is(
  (app.decide_approval((select id from ids where name = 'reject_cancel'), 'rejected', 'Não vamos mais postar.', 'cancel')).follow_up,
  'cancel',
  'rejeitar e cancelar: decisão e saída registradas'
);
select is(
  (select status from public.work_items where id = (select id from ids where name = 'work_item_3')),
  'cancelled'::public.work_item_status,
  'rejeitar e cancelar: trabalho cancelado'
);
select is(
  (select count(*) from public.runs where work_item_id = (select id from ids where name = 'work_item_3')),
  0::bigint,
  'cancelar não cria run'
);
select is(
  (app.decide_approval((select id from ids where name = 'reject_revise'), 'rejected', 'Quero outra abordagem.', 'revise')).decision,
  'rejected'::public.approval_decision,
  'rejeitar e pedir nova proposta: decisão registrada'
);
select is(
  (select status from public.work_items where id = (select id from ids where name = 'work_item_4')),
  'in_progress'::public.work_item_status,
  'rejeitar e pedir nova proposta: trabalho volta para in_progress'
);
select is(
  (app.decide_approval((select id from ids where name = 'reject_revise'), 'rejected', 'Clique repetido.', 'revise')).follow_up,
  'revise',
  'a saída fica registrada e a segunda chamada devolve o mesmo estado'
);
reset role;
select results_eq(
  format($$select agent_id::text, status::text, (select count(*) from pgmq.q_runs_interactive q where q.message->>'run_id' = r.id::text)
           from public.runs r where work_item_id = %L$$, (select id from ids where name = 'work_item_4')),
  $$values ('otto', 'queued', 1::bigint)$$,
  'nova proposta: um run do Otto na fila, mesmo com a chamada repetida'
);

-- Quem não é da Miolo não decide e não descobre que a aprovação existe
select pg_temp.act_as((select rafael from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'approval')),
  'P0002', 'Aprovação não encontrada.', 'Rafael não decide aprovação da Miolo'
);
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'approval')),
  'P0002', 'Aprovação não encontrada.', 'Pedro (sem membership) não decide'
);

-- Viewer não decide
reset role;
insert into public.memberships (workspace_id, user_id, role) select miolo, pedro, 'viewer' from fx;
insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
select miolo, (select id from ids where name = 'work_item_2'), 'confirm', 'nexo' from fx;
insert into ids select 'confirm_2', id from public.approvals where kind = 'confirm' and work_item_id = (select id from ids where name = 'work_item_2');
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'confirm_2')),
  '42501', 'Só o dono da conta toma esta decisão.', 'viewer não decide'
);
reset role;
update public.memberships set role = 'admin'
where workspace_id = (select miolo from fx) and user_id = (select pedro from fx);
select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'confirm_2')),
  '42501', 'Só o dono da conta toma esta decisão.', 'admin também não decide (só o owner)'
);

-- Só o owner decide: Carla (editor) não revisa nem autoriza; Rafael (owner) autoriza
select pg_temp.act_as((select carla from fx));
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'review_vitta')),
  '42501', 'Só o dono da conta toma esta decisão.', 'editor não decide revisão'
);
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'authorize_vitta')),
  '42501', 'Só o dono da conta toma esta decisão.', 'editor não autoriza ação externa'
);
select pg_temp.act_as((select rafael from fx));
select is(
  (app.decide_approval((select id from ids where name = 'authorize_vitta'), 'approved')).decision,
  'approved'::public.approval_decision,
  'owner autoriza'
);
select is(
  (select status from public.work_items where id = (select approvals.work_item_id from public.approvals where id = (select id from ids where name = 'authorize_vitta'))),
  'approved'::public.work_item_status,
  'autorizar não move o trabalho (aprovar conteúdo ≠ executar)'
);

reset role;
set local role anon;
select throws_ok(
  format($$select app.decide_approval(%L, 'approved')$$, (select id from ids where name = 'approval')),
  '42501', null, 'anon não executa decide_approval'
);

reset role;
select * from finish();
rollback;
