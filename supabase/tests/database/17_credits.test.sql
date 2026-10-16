-- S1e: créditos. RLS forçada e isolamento por workspace, authenticated só lê, extrato somente inserção
-- (UPDATE, DELETE e TRUNCATE recusados), idempotency_key única, preço versionado e provisório, conta com o
-- Free em todo workspace novo, reserva única por run, captura uma vez só, liberação em falha.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(48);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
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

-- Runs da Vitta (Free, 20 créditos) para reservar, capturar e liberar.
create function pg_temp.new_run(p_name text) returns uuid
language plpgsql as $$
declare
  v_item uuid;
  v_run uuid;
begin
  insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id)
  values ((select vitta from fx), 'Legenda de teste ' || p_name, '04.01', 'otto')
  returning id into v_item;
  insert into public.runs (workspace_id, work_item_id, agent_id, status, idempotency_key)
  values ((select vitta from fx), v_item, 'otto', 'queued', 'pgtap:' || p_name)
  returning id into v_run;
  insert into ids values (p_name, v_run);
  return v_run;
end;
$$;

create function pg_temp.available(p_workspace uuid) returns numeric
language sql as $$
  select coalesce(sum(remaining - reserved), 0) from public.credit_grants where workspace_id = p_workspace
$$;

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relrowsecurity and c.relforcerowsecurity
     and c.relname in ('credit_accounts', 'credit_grants', 'credit_holds', 'credit_ledger',
                       'plans', 'plan_versions', 'delivery_prices')),
  7::bigint,
  'as sete tabelas de créditos e preços têm RLS habilitada e forçada'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'authenticated' and privilege_type <> 'SELECT'
     and table_name in ('credit_accounts', 'credit_grants', 'credit_holds', 'credit_ledger',
                        'plans', 'plan_versions', 'delivery_prices')),
  0::bigint,
  'authenticated só tem SELECT nas tabelas de créditos'
);

select ok(
  not has_function_privilege('authenticated', 'app.reserve_credits(uuid, numeric, text, text, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'app.capture_credits(uuid, numeric)', 'execute')
  and not has_function_privilege('authenticated', 'app.release_credits(uuid)', 'execute')
  and not has_function_privilege(
    'authenticated',
    'app.grant_credits(uuid, numeric, public.credit_grant_origin, text, timestamptz, uuid, text, timestamptz)',
    'execute'
  ),
  'authenticated não reserva, não captura, não libera e não concede créditos'
);

select ok(
  has_function_privilege('authenticated', 'app.credit_balance(uuid, timestamptz)', 'execute')
  and has_function_privilege('authenticated', 'app.credit_breakdown(uuid, timestamptz)', 'execute'),
  'authenticated lê saldo e vencimentos'
);

select is(
  (select count(*) from public.delivery_prices where provisional and not approved_commercially),
  (select count(*) from public.delivery_prices),
  'todo preço de delivery é provisório e sem aprovação comercial'
);

select is(
  (select count(distinct delivery_type) from public.delivery_prices),
  46::bigint,
  'as 46 deliveries do catálogo têm preço'
);

select ok(
  (select provisional and not approved_commercially and credits = 20 from app.current_plan_version('free')),
  'o plano Free vigente concede 20 créditos, provisório'
);

select throws_ok(
  $$update public.delivery_prices set credits = 1 where delivery_type = '04.01'$$,
  '42501',
  null,
  'preço é versionado: UPDATE recusado'
);

-- ---------------------------------------------------------------------------------------------------
-- Saldo do seed
-- ---------------------------------------------------------------------------------------------------

select is(app.credit_balance((select miolo from fx)), 36.00::numeric, 'Miolo: 100 do ciclo, 64 usados, saldo 36');
select is(app.credit_balance((select vitta from fx)), 20.00::numeric, 'Vitta: Free com 20, nada usado');
select is(app.credit_balance((select trilha from fx)), 19.20::numeric, 'Trilha: Free com 20, 0,8 usado');

select is(
  (select count(*) from public.workspaces w
   where not exists (select 1 from public.credit_accounts a where a.workspace_id = w.id)),
  0::bigint,
  'todo workspace tem conta de créditos'
);

-- ---------------------------------------------------------------------------------------------------
-- Isolamento
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));

select is(
  (select array_agg(distinct workspace_id) from public.credit_ledger),
  array[(select miolo from fx)],
  'Marina vê só o extrato da Miolo'
);

select is(
  (select count(*) from public.credit_accounts where workspace_id <> (select miolo from fx)),
  0::bigint,
  'Marina não vê a conta de créditos de outro workspace'
);

select is(app.credit_balance((select vitta from fx)), 0.00::numeric, 'saldo da Vitta lido pela Marina: zero (RLS)');
select is(app.credit_balance((select miolo from fx)), 36.00::numeric, 'Marina lê o saldo da Miolo');

select throws_ok(
  $$insert into public.credit_ledger (workspace_id, account_id, entry_type, grant_id, amount, idempotency_key)
    select workspace_id, account_id, 'grant', id, 1000, 'pgtap:auto-credito'
    from public.credit_grants limit 1$$,
  '42501',
  null,
  'authenticated não escreve no extrato'
);

select throws_ok(
  $$select app.reserve_credits(gen_random_uuid(), 1, 'pgtap:sem-permissao')$$,
  '42501',
  null,
  'authenticated não executa a reserva'
);

reset role;
select pg_temp.act_as((select rafael from fx));

select is(
  (select array_agg(distinct workspace_id) from public.credit_grants),
  array[(select vitta from fx)],
  'Rafael vê só os grants da Vitta'
);

reset role;
select pg_temp.act_as((select pedro from fx));

select is((select count(*) from public.credit_ledger), 0::bigint, 'quem não é membro não vê extrato nenhum');

-- Workspace novo nasce com a conta e o grant do Free vigente.
select lives_ok(
  $$insert into ids select 'novo', id from app.create_workspace('Créditos de teste', 'creditos-de-teste')$$,
  'Pedro cria um workspace'
);
select is(app.credit_balance((select id from ids where name = 'novo')), 20.00::numeric, 'workspace novo nasce com os 20 créditos do Free');

reset role;

select is(
  (select origin::text || ':' || plan_version_id::text from public.credit_grants
   where workspace_id = (select id from ids where name = 'novo')),
  'plan_cycle:' || (app.current_plan_version('free')).id::text,
  'o grant inicial é do ciclo do Free'
);

-- ---------------------------------------------------------------------------------------------------
-- Extrato somente inserção e idempotência
-- ---------------------------------------------------------------------------------------------------

select throws_ok(
  $$update public.credit_ledger set note = 'alterado' where workspace_id = (select vitta from fx)$$,
  '42501',
  null,
  'UPDATE no extrato é recusado (até para o papel privilegiado)'
);

select throws_ok(
  $$delete from public.credit_ledger where workspace_id = (select vitta from fx)$$,
  '42501',
  null,
  'DELETE no extrato é recusado com a conta existindo'
);

select throws_ok(
  $$truncate public.credit_ledger$$,
  '42501',
  null,
  'TRUNCATE no extrato é recusado'
);

select throws_ok(
  $$insert into public.credit_ledger (workspace_id, account_id, entry_type, grant_id, amount, idempotency_key)
    select workspace_id, account_id, 'grant', id, 5, 'seed:vitta:free'
    from public.credit_grants where workspace_id = (select vitta from fx)$$,
  '23505',
  null,
  'idempotency_key é única por workspace'
);

insert into ids select 'bonus', (app.grant_credits((select vitta from fx), 5, 'bonus', 'pgtap:bonus')).id;
select is(
  (app.grant_credits((select vitta from fx), 5, 'bonus', 'pgtap:bonus')).id,
  (select id from ids where name = 'bonus'),
  'conceder de novo com a mesma chave devolve o mesmo grant'
);
select is(app.credit_balance((select vitta from fx)), 25.00::numeric, 'o bônus entrou uma vez só');

-- ---------------------------------------------------------------------------------------------------
-- Reserva, captura e liberação
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_run('r1');
  perform pg_temp.new_run('r2');
  perform pg_temp.new_run('r3');
  perform pg_temp.new_run('r4');
end;
$$;

select is(
  (select credits || ':' || revision || ':' || provisional from app.run_credit_estimate((select id from ids where name = 'r1'))),
  '10.00:false:true',
  'estimativa do run: preço vigente da 04.01, primeira versão, provisório'
);

select is(
  (select (app.reserve_credits(r.id, 10, 'run:' || r.id, '04.01')).state::text from ids r where r.name = 'r1'),
  'held',
  'reserva ao iniciar o run'
);
select is(
  (select (app.reserve_credits(r.id, 10, 'run:' || r.id, '04.01')).id from ids r where r.name = 'r1'),
  (select h.id from public.credit_holds h join ids r on r.id = h.run_id where r.name = 'r1'),
  'retentativa devolve a mesma reserva'
);
select is(
  (select count(*) from public.credit_ledger l join ids r on r.id = l.run_id where r.name = 'r1'),
  1::bigint,
  'a retentativa não lança de novo no extrato'
);
select throws_ok(
  $$select app.reserve_credits((select id from ids where name = 'r1'), 10, 'outra-chave')$$,
  '23505',
  null,
  'o run tem uma reserva só: outra chave é recusada'
);
select is(app.credit_balance((select vitta from fx)), 25.00::numeric, 'reservar não muda o saldo');
select is(pg_temp.available((select vitta from fx)), 15.00::numeric, 'reservar tira do disponível');

select lives_ok(
  $$select app.reserve_credits(r.id, 10, 'run:' || r.id, '04.01') from ids r where r.name = 'r2'$$,
  'segunda reserva cabe no disponível'
);
select throws_ok(
  $$select app.reserve_credits(r.id, 10, 'run:' || r.id, '04.01') from ids r where r.name = 'r3'$$,
  'HS001',
  'Créditos insuficientes: esta entrega precisa de 10 e o saldo disponível é 5.',
  'sem saldo disponível a reserva é recusada (HS001)'
);

-- Entregou: captura uma vez só, mesmo chamando de novo.
select is(
  (select (app.capture_credits(r.id, 10)).state::text from ids r where r.name = 'r1'),
  'captured',
  'captura ao concluir com entrega'
);
select lives_ok(
  $$select app.capture_credits(r.id, 10) from ids r where r.name = 'r1'$$,
  'capturar de novo não falha'
);
select is(
  (select sum(l.amount) from public.credit_ledger l join ids r on r.id = l.run_id where r.name = 'r1'),
  -10.00::numeric,
  'o run concluído debita uma vez só'
);
update public.runs set status = 'succeeded' where id = (select id from ids where name = 'r1');
select is(
  (select credits_charged from public.runs where id = (select id from ids where name = 'r1')),
  10.00::numeric,
  'runs.credits_charged guarda o que foi cobrado'
);

-- Falha definitiva: a reserva volta inteira; nada é cobrado depois.
update public.runs set status = 'failed' where id = (select id from ids where name = 'r2');
select is(
  (select state::text from public.credit_holds where run_id = (select id from ids where name = 'r2')),
  'released',
  'run que falhou libera a reserva'
);
select throws_ok(
  $$select app.capture_credits((select id from ids where name = 'r2'), 10)$$,
  '55000',
  null,
  'reserva liberada não é cobrada'
);

-- Concluiu sem entrega (pergunta do Nexo): nada cobrado.
select lives_ok(
  $$select app.reserve_credits(r.id, 10, 'run:' || r.id, '04.01') from ids r where r.name = 'r4'$$,
  'reserva do run que vai só perguntar'
);
update public.runs set status = 'succeeded' where id = (select id from ids where name = 'r4');
select is(
  (select state::text || ':' || coalesce(captured::text, '-') from public.credit_holds where run_id = (select id from ids where name = 'r4')),
  'released:-',
  'run concluído sem captura (pergunta) libera e não cobra'
);

select is(
  app.credit_balance((select vitta from fx)) || ':' || pg_temp.available((select vitta from fx)),
  '15.00:15.00',
  'saldo final da Vitta: 25 − 10 cobrados, nada reservado'
);

-- A única saída do extrato: junto com a conta inteira (exclusão do workspace, recomeço do seed).
delete from public.credit_accounts where workspace_id = (select vitta from fx);
select is(
  (select count(*) from public.credit_ledger where workspace_id = (select vitta from fx)),
  0::bigint,
  'apagar a conta leva o extrato junto'
);

select * from finish();
rollback;
