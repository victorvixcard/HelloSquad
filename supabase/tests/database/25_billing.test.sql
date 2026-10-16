-- S2e: cobrança. RLS forçada nas seis tabelas; assinatura e cobranças só para o owner; preço, cliente e
-- eventos fora do alcance do usuário; papel do webhook só executa app.billing_apply_event; nenhum dado de
-- cartão no esquema; preço versionado e provisório; evento único por (provider, event_id) e efeito uma vez
-- só; transição fora de ordem não muda nada; estorno retira pelo extrato; ciclo com validade do período;
-- vencido sem pagamento vira past_due.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(36);

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

create function pg_temp.apply(p_event jsonb) returns text
language sql as $$
  select case when e.duplicate then 'repetido:' else '' end || e.outcome
  from app.billing_apply_event('mock', p_event) e
$$;

-- Vitta com cobrança simulada (o seed só dá cobrança à Miolo), para provar o "só o owner".
insert into public.billing_customers (workspace_id, provider, provider_customer_id)
select vitta, 'mock', 'pgtap_cus_vitta' from fx;
insert into public.subscriptions (
  workspace_id, customer_id, provider, provider_subscription_id, plan_version_id, plan_price_id, method,
  status, current_period_start, current_period_end
)
select fx.vitta, c.id, 'mock', 'pgtap_sub_vitta', '5eed0000-0000-4000-8000-000000000902',
       '5eed0000-0000-4000-8000-0000000009a1', 'card', 'active', now() - interval '10 days',
       now() + interval '20 days'
from fx join public.billing_customers c on c.provider_customer_id = 'pgtap_cus_vitta';

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select is(
  (select count(*) from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relrowsecurity and c.relforcerowsecurity
     and c.relname in ('plan_prices', 'topup_packs', 'billing_customers', 'subscriptions', 'payments',
                       'payment_events')),
  6::bigint,
  'RLS habilitada e forçada nas seis tabelas de cobrança'
);

select is(
  (select array_agg(t order by t) from unnest(array['plan_prices', 'topup_packs', 'billing_customers',
     'subscriptions', 'payments', 'payment_events']) t
   where has_table_privilege('authenticated', 'public.' || t, 'SELECT')),
  array['payments', 'subscriptions'],
  'authenticated lê só assinaturas e cobranças (preço, cliente e eventos não)'
);

select ok(
  not exists (
    select 1 from unnest(array['plan_prices', 'topup_packs', 'billing_customers', 'subscriptions',
                                'payments', 'payment_events']) t,
                  unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
    where has_table_privilege('authenticated', 'public.' || t, p)
       or has_table_privilege('anon', 'public.' || t, p || ',SELECT')
  ),
  'authenticated não escreve e anon não toca em nada de cobrança'
);

select ok(
  not exists (
    select 1 from pg_proc f
    where f.pronamespace = 'app'::regnamespace and f.proname like 'billing\_%'
      and (has_function_privilege('authenticated', f.oid, 'EXECUTE')
           or has_function_privilege('anon', f.oid, 'EXECUTE'))
  ),
  'authenticated e anon não executam nenhuma função de cobrança'
);

select is(
  (select array_agg(f.proname::text order by f.proname) from pg_proc f
   where f.pronamespace = 'app'::regnamespace and f.proname like 'billing\_%'
     and has_function_privilege('hellosquad_billing', f.oid, 'EXECUTE')),
  array['billing_apply_event'],
  'hellosquad_billing executa só app.billing_apply_event'
);

select ok(
  not exists (
    select 1 from unnest(array['plan_prices', 'topup_packs', 'billing_customers', 'subscriptions',
                                'payments', 'payment_events', 'credit_ledger', 'credit_grants']) t
    where has_table_privilege('hellosquad_billing', 'public.' || t, 'SELECT,INSERT,UPDATE,DELETE')
  ),
  'hellosquad_billing não lê nem escreve tabela nenhuma direto'
);

select ok(
  pg_has_role('hellosquad_api', 'hellosquad_billing', 'SET')
  and not pg_has_role('hellosquad_api', 'hellosquad_billing', 'USAGE')
  and not (select rolcanlogin from pg_roles where rolname = 'hellosquad_billing'),
  'a API assume hellosquad_billing só com SET ROLE (sem herdar); o papel não faz login'
);

select is_empty(
  $$select c.table_name || '.' || c.column_name from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name in ('billing_customers', 'subscriptions', 'payments', 'payment_events')
      and c.column_name ~ '(card|cvv|ccv|cpf|cnpj|document|holder|pan|expiry)'$$,
  'nenhuma coluna de cartão ou documento nas tabelas de cobrança'
);

select ok(
  (select bool_and(provisional and not approved_commercially) from public.plan_prices)
  and (select bool_and(provisional and not approved_commercially) from public.topup_packs),
  'preço do plano e da recarga provisórios e sem aprovação comercial'
);

select throws_ok(
  $$update public.plan_prices set amount = 1$$,
  '42501', null, 'preço do plano é versionado: UPDATE recusado'
);

select throws_ok(
  $$update public.topup_packs set credits = 1$$,
  '42501', null, 'recarga é versionada: UPDATE recusado'
);

-- ---------------------------------------------------------------------------------------------------
-- Isolamento: só o owner do workspace lê assinatura e cobranças
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select array[(select count(*) from public.subscriptions), (select count(*) from public.payments)]),
  array[1, 2]::bigint[],
  'Marina (owner da Miolo) vê a assinatura e as duas cobranças da Miolo'
);
select is(
  (select count(*) from public.subscriptions where workspace_id = (select vitta from fx)),
  0::bigint,
  'Marina não vê a assinatura da Vitta'
);
select throws_ok(
  $$insert into public.payment_events (provider, event_id, event_type) values ('mock', 'x', 'y')$$,
  '42501', null, 'usuário não grava evento de pagamento'
);
reset role;

select pg_temp.act_as((select rafael from fx));
select is((select count(*) from public.subscriptions), 1::bigint, 'Rafael (owner da Vitta) vê a assinatura dela');
reset role;

select pg_temp.act_as((select carla from fx));
select is(
  (select count(*) from public.subscriptions) + (select count(*) from public.payments),
  0::bigint,
  'Carla (editor da Vitta) não vê assinatura nem cobrança: só o owner'
);
reset role;

select pg_temp.act_as((select pedro from fx));
select is((select count(*) from public.payments), 0::bigint, 'Pedro (sem workspace) não vê nada');
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Webhook: evento único, efeito uma vez só, fora de ordem não muda nada, estorno pelo extrato
-- ---------------------------------------------------------------------------------------------------

create temporary table before as
select app.credit_balance((select miolo from fx)) as balance,
       (select count(*) from public.credit_ledger) as entries;

select is(
  pg_temp.apply('{"event_id": "pgtap-1", "event_type": "payment.confirmed",
                  "payment": {"provider_payment_id": "mock_pay_miolo_recarga", "status": "confirmed"}}'),
  'applied',
  'Pix pendente confirmado: aplicado'
);
select is(
  app.credit_balance((select miolo from fx)) - (select balance from before),
  50::numeric,
  'a recarga confirmada soma 50 créditos ao saldo'
);
select is(
  (select array[g.origin::text, coalesce(g.expires_at::text, 'sem validade')]
   from public.payments p join public.credit_grants g on g.id = p.grant_id
   where p.provider_payment_id = 'mock_pay_miolo_recarga'),
  array['topup', 'sem validade'],
  'recarga vira grant topup sem validade curta'
);
select is(
  pg_temp.apply('{"event_id": "pgtap-1", "event_type": "payment.confirmed",
                  "payment": {"provider_payment_id": "mock_pay_miolo_recarga", "status": "confirmed"}}'),
  'repetido:applied',
  'o mesmo event_id de novo volta como repetido'
);
select is(
  (select count(*) from public.credit_ledger) - (select entries from before),
  1::bigint,
  'evento repetido não lança nada no extrato'
);
select throws_ok(
  $$insert into public.payment_events (provider, event_id, event_type) values ('mock', 'pgtap-1', 'outro')$$,
  '23505', null, '(provider, event_id) é único'
);
select is(
  pg_temp.apply('{"event_id": "pgtap-2", "event_type": "payment.created",
                  "payment": {"provider_payment_id": "mock_pay_miolo_recarga", "status": "pending"}}'),
  'no_change',
  'evento atrasado (pendente depois de confirmado) não muda nada'
);
select is(
  (select status::text from public.payments where provider_payment_id = 'mock_pay_miolo_recarga'),
  'confirmed',
  'a cobrança continua confirmada'
);
select is(
  pg_temp.apply('{"event_id": "pgtap-3", "event_type": "payment.confirmed",
                  "payment": {"provider_payment_id": "pagamento-alheio", "status": "confirmed"}}'),
  'ignored',
  'cobrança que não é desta plataforma: ignorada (e respondida com 200 pela API)'
);
select is(
  (select workspace_id from public.payment_events where event_id = 'pgtap-3'),
  null,
  'evento ignorado fica sem workspace'
);
select is(
  pg_temp.apply('{"event_id": "pgtap-4", "event_type": "payment.refunded",
                  "payment": {"provider_payment_id": "mock_pay_miolo_recarga", "status": "refunded"}}'),
  'applied',
  'estorno aplicado'
);
select is(
  (select array[l.entry_type::text, l.amount::text]
   from public.credit_ledger l where l.idempotency_key like 'billing:event:%:revoke'
     and l.workspace_id = (select miolo from fx)),
  array['adjustment', '-50.00'],
  'estorno retira os créditos da recarga pelo extrato (adjustment)'
);
select is(
  app.credit_balance((select miolo from fx)),
  (select balance from before),
  'saldo volta ao de antes da recarga'
);
select ok(
  not app.billing_payment_transition_allowed('refunded', 'confirmed')
  and app.billing_payment_transition_allowed('charged_back', 'confirmed'),
  'estorno é final; contestação revertida volta a confirmada'
);

-- ---------------------------------------------------------------------------------------------------
-- Ciclo da assinatura e renovação
-- ---------------------------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.subscriptions (workspace_id, customer_id, provider, provider_subscription_id,
      plan_version_id, plan_price_id, method)
    select workspace_id, customer_id, 'mock', 'segunda', plan_version_id, plan_price_id, 'pix'
    from public.subscriptions where provider_subscription_id = 'mock_sub_miolo'$$,
  '23505', null, 'uma assinatura aberta por workspace'
);

select is(
  pg_temp.apply(jsonb_build_object(
    'event_id', 'pgtap-5', 'event_type', 'payment.confirmed',
    'payment', jsonb_build_object(
      'provider_payment_id', 'pgtap_ciclo_2', 'provider_subscription_id', 'mock_sub_miolo',
      'status', 'confirmed',
      'due_date', ((select current_period_end from public.subscriptions where provider_subscription_id = 'mock_sub_miolo')
                   at time zone 'America/Sao_Paulo')::date
    )
  )),
  'applied',
  'ciclo novo gerado pelo provedor e confirmado: aplicado'
);
select ok(
  (select g.origin = 'plan_cycle' and g.amount = 100 and g.starts_at = p.period_start
          and g.expires_at = p.period_end and s.current_period_end = p.period_end and s.status = 'active'
   from public.payments p
   join public.credit_grants g on g.id = p.grant_id
   join public.subscriptions s on s.id = p.subscription_id
   where p.provider_payment_id = 'pgtap_ciclo_2'),
  'ciclo pago concede os créditos do plano com a validade do período e estende a assinatura'
);

select is(
  (select array_agg(s.provider_subscription_id order by s.provider_subscription_id)
   from app.billing_due_subscriptions(now() + interval '3 months', interval '1 hour', 100) s),
  array['mock_sub_miolo', 'pgtap_sub_vitta'],
  'vencidas daqui a três meses: a Miolo e a Vitta'
);
select is(
  (select array[s.status::text, (s.past_due_since = now() + interval '3 months')::text]
   from app.billing_settle_due_subscription(
     (select id from public.subscriptions where provider_subscription_id = 'mock_sub_miolo'),
     now() + interval '3 months') s),
  array['past_due', 'true'],
  'período pago acabou sem ciclo confirmado: past_due (nada é bloqueado)'
);

select * from finish();
rollback;
