-- SA4a: faixas dos alertas econômicos (proposta, versionadas, imutáveis), saldo informado por provedor
-- (só inserção, gravado por função auditada), views de consumo com turnos e de qualidade por item com erros
-- do agente e versão do prompt. Data API sem acesso a nada; o papel do painel só lê, e só com o JWT de um
-- Super Admin; escrita só por app.admin_provider_balance_report.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(27);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'vic@hellosquad.example') as vic,
  (select id from public.workspaces where slug = 'miolo') as miolo;
grant select on fx to public;

create temporary table sa4_objects (name text primary key);
insert into sa4_objects values
  ('economic_alert_rules'), ('provider_balance_reports'), ('v_qualidade_itens'), ('v_consumo_por_cliente'),
  ('v_qualidade_entregas');
grant select on sa4_objects to public;

grant hellosquad_admin to postgres with inherit false, set true;
grant usage on schema extensions to hellosquad_admin;

create function pg_temp.claims(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
end;
$$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role authenticated;
end;
$$;

create function pg_temp.admin_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role hellosquad_admin;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select is(
  (select count(*) from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relrowsecurity and c.relforcerowsecurity
     and c.relname in ('economic_alert_rules', 'provider_balance_reports')),
  2::bigint,
  'RLS habilitada e forçada nas duas tabelas novas'
);

select is(
  (select count(*) from sa4_objects o, (values ('anon'), ('authenticated'), ('service_role')) as r (role)
   where has_table_privilege(r.role, 'public.' || o.name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0::bigint,
  'Data API: anon, authenticated e service_role sem privilégio nas tabelas e views da SA4'
);

select ok(
  (select bool_and(has_table_privilege('hellosquad_admin', 'public.' || o.name, 'SELECT')) from sa4_objects o)
  and not exists (
    select 1 from sa4_objects o
    where has_table_privilege('hellosquad_admin', 'public.' || o.name, 'INSERT,UPDATE,DELETE,TRUNCATE')
  ),
  'O papel do painel só lê as tabelas e views da SA4'
);

select is(
  (select count(*)
   from (values ('app.admin_provider_balance_report(text, numeric, text, timestamptz, numeric, text)'),
                ('app.admin_email_activity()')) as f (sig),
        (values ('anon'), ('authenticated'), ('service_role'), ('public')) as r (role)
   where r.role <> 'public' and has_function_privilege(r.role, f.sig, 'EXECUTE')),
  0::bigint,
  'Funções da SA4 fora do alcance da Data API'
);

select ok(
  has_function_privilege('hellosquad_admin', 'app.admin_provider_balance_report(text, numeric, text, timestamptz, numeric, text)', 'EXECUTE')
  and has_function_privilege('hellosquad_admin', 'app.admin_email_activity()', 'EXECUTE'),
  'O papel do painel executa as duas funções da SA4'
);

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'v_consumo_por_cliente'
     and column_name in ('turns', 'conversation_turns', 'turn_cost_usd')),
  3::bigint,
  'Consumo por dia ganha turnos, turnos de conversa e o custo dos turnos'
);

select is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema = 'public' and table_name = 'v_qualidade_entregas'),
  array['workspace_id', 'month', 'delivery_type', 'deliveries', 'approved_first_time', 'approved', 'adjustments',
        'not_approved', 'ai_cost_usd', 'ai_cost_approved_usd', 'failed_runs', 'failed_steps', 'agent_errors'],
  'Qualidade mensal mantém as colunas da SA1 na ordem e acrescenta erros do agente no fim'
);

-- ---------------------------------------------------------------------------------------------------
-- Faixas: proposta, como no protótipo, imutáveis
-- ---------------------------------------------------------------------------------------------------

select is(
  (select array_agg(format('%s %s %s %s %s', r.metric, r.comparison, r.threshold, coalesce(r.credit_reference_brl::text, '-'),
                           coalesce(r.window_days::text, '-')) order by r.metric)
   from public.economic_alert_rules r),
  array['ai_cost_per_credit_brl max 0.1500 - -', 'cost_per_turn_trend max 0.1000 - 7', 'gross_margin min 0.6500 0.5000 -'],
  'Três faixas do protótipo: IA por crédito até R$ 0,15; tendência até +10% em 7 dias; margem a partir de 65% com o crédito a R$ 0,50'
);

select ok(
  (select bool_and(r.proposal) from public.economic_alert_rules r),
  'Todas as faixas marcadas como proposta'
);

select throws_ok(
  $$ update public.economic_alert_rules set threshold = 0.5 where metric = 'gross_margin' $$,
  '42501',
  null,
  'Faixa publicada não se altera: mudança é versão nova'
);

select throws_ok(
  $$ insert into public.economic_alert_rules (metric, comparison, threshold, source) values ('gross_margin', 'min', 0.5, 'x') $$,
  '23514',
  null,
  'Margem sem valor de referência do crédito é recusada'
);

-- ---------------------------------------------------------------------------------------------------
-- Quem lê e quem grava
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select throws_ok(
  $$ select count(*) from public.economic_alert_rules $$,
  '42501',
  null,
  'Marina (owner) não lê as faixas pela Data API'
);
reset role;

select pg_temp.act_as((select vic from fx));
select throws_ok(
  $$ select count(*) from public.v_qualidade_itens $$,
  '42501',
  null,
  'Nem o Super Admin lê a qualidade por item pela Data API'
);
reset role;

select pg_temp.admin_as((select marina from fx));
select is(
  (select count(*) from public.economic_alert_rules) + (select count(*) from public.provider_balance_reports),
  0::bigint,
  'Papel do painel com o JWT da Marina lê 0 faixas e 0 saldos'
);
select throws_ok(
  $$ select app.admin_provider_balance_report('anthropic', 10, 'USD', now(), null, 'Tentativa da Marina') $$,
  '42501',
  null,
  'Marina não informa saldo nem pelo papel do painel'
);
reset role;

select pg_temp.admin_as((select vic from fx));
select is((select count(*) from public.economic_alert_rules), 3::bigint, 'Vic lê as três faixas pelo papel do painel');
select throws_ok(
  $$ insert into public.provider_balance_reports (provider, amount, currency, read_at, reason, reported_by)
     values ('anthropic', 1, 'USD', now(), 'Escrita direta recusada', (select vic from fx)) $$,
  '42501',
  null,
  'Vic não grava saldo direto na tabela: só pela função'
);
select throws_ok(
  $$ select app.admin_provider_balance_report('anthropic', 10, 'USD', now() + interval '1 day', null, 'Leitura no futuro') $$,
  '22023',
  null,
  'Leitura do saldo no futuro é recusada'
);
select throws_ok(
  $$ select app.admin_provider_balance_report('meta', 10, 'USD', now(), null, 'Provedor que não existe') $$,
  'P0002',
  null,
  'Provedor desconhecido é recusado'
);
select throws_ok(
  $$ select app.admin_provider_balance_report('anthropic', 10, 'USD', now(), null, 'curto') $$,
  '23514',
  null,
  'Motivo com menos de 10 caracteres é recusado'
);
select isnt(
  app.admin_provider_balance_report('anthropic', 38, 'USD', now() - interval '1 hour', 50, 'Saldo lido no console (pgTAP)'),
  null,
  'Vic informa o saldo da Anthropic com limiar de alerta'
);
reset role;

select is(
  (select format('%s %s %s', h.reported_balance, h.reported_balance_currency, h.alert_below)
   from public.provider_health h where h.provider = 'anthropic'),
  '38.00 USD 50.00',
  'provider_health guarda o último saldo informado e o limiar'
);

select is(
  (select format('%s|%s|%s|%s', (a.actor_id = (select vic from fx)::text)::text, a.entity_id, a.payload ->> 'reason',
                 a.payload ->> 'platform_admin')
   from public.audit_events a where a.action = 'admin.provider_balance_reported'
   order by a.created_at desc limit 1),
  'true|anthropic|Saldo lido no console (pgTAP)|true',
  'Saldo informado fica em audit_events com o Vic como autor, o motivo e a marca platform_admin'
);

select throws_ok(
  $$ update public.provider_balance_reports set amount = 1 $$,
  '42501',
  null,
  'Histórico de saldo é só inserção'
);

-- ---------------------------------------------------------------------------------------------------
-- Views: turno e autoverificação contam; erro do agente sai da autoverificação reprovada
-- ---------------------------------------------------------------------------------------------------

create temporary table probe as
with ws as (
  insert into public.workspaces (name, slug) values ('Ateliê Sonda (pgTAP)', 'atelie-sonda-pgtap')
  returning id
),
w as (
  insert into public.work_items (workspace_id, title, delivery_type)
  select ws.id, 'Sonda SA4 (pgTAP)', '04.01' from ws
  returning id, workspace_id
),
r as (
  insert into public.runs (workspace_id, work_item_id, agent_id, status, idempotency_key)
  select w.workspace_id, w.id, 'otto', 'succeeded', 'pgtap-sa4-' || gen_random_uuid() from w
  returning id, workspace_id, work_item_id
)
select r.id as run_id, r.workspace_id, r.work_item_id from r;
grant select on probe to public;

insert into public.run_steps (workspace_id, run_id, seq, kind, model, cost_usd, status, payload)
select workspace_id, run_id, 1, 'llm_call'::public.run_step_kind, 'claude-opus-5-5', 0.25,
       'succeeded'::public.run_step_status, '{}'::jsonb from probe
union all
select workspace_id, run_id, 2, 'check', 'claude-opus-5-5', 0.05, 'succeeded', '{"approved": false}' from probe;
insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id, status, decision, decided_at)
select workspace_id, work_item_id, 'review', 'otto', 'decided', 'approved', now() from probe;

select pg_temp.admin_as((select vic from fx));
select is(
  (select format('%s %s %s', v.llm_calls, v.turns, v.turn_cost_usd)
   from public.v_consumo_por_cliente v
   where v.workspace_id = (select workspace_id from probe) and v.day = (now() at time zone 'America/Sao_Paulo')::date),
  '2 1 0.300000',
  'Consumo do dia: chamada e autoverificação contam como chamadas; um turno de US$ 0,30'
);
select is(
  (select format('%s %s %s', q.approved_first::text, q.agent_errors, q.ai_cost_usd)
   from public.v_qualidade_itens q where q.work_item_id = (select work_item_id from probe)),
  'true 1 0.300000',
  'Qualidade do item: aprovada de primeira, um erro do agente (autoverificação reprovada), custo de run_steps'
);
reset role;

select pg_temp.admin_as((select marina from fx));
select is(
  (select count(*) from public.v_qualidade_itens) + (select count(*) from public.v_consumo_por_cliente),
  0::bigint,
  'Papel do painel com o JWT da Marina não vê consumo nem qualidade de ninguém'
);
reset role;

select * from finish();
rollback;
