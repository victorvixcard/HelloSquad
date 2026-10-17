-- SA6a: escrita do Super Admin e sessão de suporte. Só hellosquad_admin executa as funções de escrita e só
-- com o JWT de um Super Admin; motivo obrigatório; toda escrita em audit_events; support_access_log e
-- audit_events só crescem para os papéis da API e da Data API; suspensão pausa renovação e rotinas; versões
-- passadas imutáveis; conciliação uma vez; leitura do suporte só numa transação READ ONLY marcada, que o
-- Postgres impede de gravar (a parte só leitura fica no fim: a transação não volta a gravar).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(42);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'vic@hellosquad.example') as vic,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  (select id from public.conversations c
   where c.workspace_id = (select id from public.workspaces where slug = 'miolo') limit 1) as conversation;
grant select on fx to public;

grant hellosquad_admin to postgres with inherit false, set true;
grant usage on schema extensions to hellosquad_admin;

create function pg_temp.claims(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
end;
$$;

create function pg_temp.admin_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role hellosquad_admin;
end;
$$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role authenticated;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select has_table('public', 'payment_reconciliations', 'payment_reconciliations existe');
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.payment_reconciliations'::regclass),
  'payment_reconciliations com RLS habilitada e forçada'
);
select ok(
  not exists (
    select 1 from (values ('anon'), ('authenticated'), ('service_role')) r (role)
    cross join (values ('select'), ('insert'), ('update'), ('delete')) p (priv)
    where has_table_privilege(r.role, 'public.payment_reconciliations', p.priv)
  ),
  'Data API (anon, authenticated, service_role) sem privilégio em payment_reconciliations'
);
select ok(
  has_table_privilege('hellosquad_admin', 'public.payment_reconciliations', 'select')
  and not has_table_privilege('hellosquad_admin', 'public.payment_reconciliations', 'insert')
  and not has_table_privilege('hellosquad_admin', 'public.payment_reconciliations', 'update')
  and not has_table_privilege('hellosquad_admin', 'public.payment_reconciliations', 'delete'),
  'o papel do painel só lê payment_reconciliations (grava pela função)'
);
select ok(
  not exists (
    select 1
    from (values ('anon'), ('authenticated'), ('service_role'), ('hellosquad_api'), ('hellosquad_admin'),
                 ('hellosquad_billing')) r (role)
    cross join (values ('public.support_access_log'), ('public.audit_events')) t (tbl)
    cross join (values ('update'), ('delete'), ('truncate')) p (priv)
    where has_table_privilege(r.role, t.tbl, p.priv)
  ),
  'support_access_log e audit_events: nenhum papel da API ou da Data API altera ou apaga'
);

create temporary table write_functions as
select p.oid, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app' and p.proname in (
  'admin_set_workspace_suspended', 'admin_support_session_start', 'admin_support_session_end',
  'admin_adjust_credits', 'admin_catalog_price', 'admin_catalog_homologation', 'admin_catalog_for_sale',
  'admin_plan_version', 'admin_topup_version', 'admin_run_requeue', 'admin_run_cancel',
  'admin_payment_reconcile', 'admin_payment_reprocess_audit'
);
grant select on write_functions to public;

select is((select count(*)::integer from write_functions), 13, 'as 13 funções de escrita do painel existem');
select ok(
  (select bool_and(has_function_privilege('hellosquad_admin', oid, 'execute')) from write_functions)
  and not exists (
    select 1 from write_functions f
    cross join (values ('anon'), ('authenticated'), ('service_role'), ('hellosquad_api')) r (role)
    where has_function_privilege(r.role, f.oid, 'execute')
  ),
  'só hellosquad_admin executa as funções de escrita (nem a Data API nem a API sem o papel)'
);
select ok(
  (select bool_and(prosecdef) from pg_proc where oid in (select oid from write_functions)),
  'as funções de escrita são SECURITY DEFINER (o papel do painel não grava direto em tabela)'
);
select ok(
  has_function_privilege('authenticated', 'app.support_session_enter()', 'execute')
  and not has_function_privilege('anon', 'app.support_session_enter()', 'execute'),
  'app.support_session_enter: authenticated executa, anon não'
);

-- ---------------------------------------------------------------------------------------------------
-- Só o Super Admin, sempre com motivo
-- ---------------------------------------------------------------------------------------------------

select pg_temp.admin_as((select marina from fx));
select throws_ok(
  format($$select app.admin_support_session_start(%L, 'Conferir o extrato a pedido', 30)$$, (select miolo from fx)),
  '42501', null, 'a Marina no papel do painel não abre sessão de suporte'
);
select throws_ok(
  format($$select app.admin_adjust_credits(%L, 10, 'Ajuste de teste da Marina', 'chave-marina-1')$$, (select miolo from fx)),
  '42501', null, 'a Marina no papel do painel não ajusta crédito'
);
reset role;

select pg_temp.admin_as((select vic from fx));
select throws_ok(
  format($$select app.admin_support_session_start(%L, 'curto', 30)$$, (select miolo from fx)),
  '22023', 'O motivo precisa ter de 10 a 500 caracteres.', 'sessão de suporte sem motivo de 10+ caracteres é recusada'
);
select throws_ok(
  format($$select app.admin_support_session_start(%L, 'Conferir o extrato a pedido', 45)$$, (select miolo from fx)),
  '22023', 'A sessão de suporte dura 15, 30 ou 60 minutos.', 'duração fora de 15/30/60 é recusada'
);
select lives_ok(
  format($$select app.admin_support_session_start(%L, 'Conferir o extrato a pedido', 30)$$, (select miolo from fx)),
  'o Vic abre a sessão de suporte de 30 minutos'
);
select throws_ok(
  format($$select app.admin_support_session_start(%L, 'Conferir o extrato a pedido', 15)$$, (select miolo from fx)),
  '55000', 'Já há uma sessão de suporte aberta nesta conta.', 'segunda sessão aberta na mesma conta é recusada'
);
reset role;

select is(
  (select (expires_at - started_at) from public.support_access_log
   where admin_id = (select vic from fx) and workspace_id = (select miolo from fx) and ended_at is null
   order by started_at desc limit 1),
  interval '30 minutes',
  'support_access_log grava o prazo de 30 minutos'
);
select ok(
  exists (
    select 1 from public.audit_events a
    where a.action = 'support.session_started' and a.workspace_id = (select miolo from fx)
      and a.actor_id = (select vic from fx)::text and a.payload ->> 'reason' = 'Conferir o extrato a pedido'
      and (a.payload ->> 'platform_admin')::boolean
  ),
  'audit_events: support.session_started com o Vic, a conta e o motivo'
);
select ok(
  exists (
    select 1 from public.email_messages e
    where e.template = 'support_session_started' and e.workspace_id = (select miolo from fx)
      and e.recipient_email = 'marina@miolo.example' and (e.variables ->> 'minutes')::integer = 30
  ),
  'o e-mail ao titular (Marina) entra na fila com a duração'
);
select throws_ok(
  $$update public.support_access_log set reason = 'Motivo trocado depois' where ended_at is null$$,
  '42501', null, 'support_access_log: o motivo não muda nem para o dono das tabelas'
);

select pg_temp.admin_as((select vic from fx));
select lives_ok(
  format($$select app.admin_support_session_end(%L)$$, (select miolo from fx)),
  'o Vic encerra a sessão'
);
select throws_ok(
  format($$select app.admin_support_session_end(%L)$$, (select miolo from fx)),
  'P0002', 'Não há sessão de suporte aberta nesta conta.', 'encerrar de novo: não há sessão aberta'
);
reset role;
select throws_ok(
  $$update public.support_access_log set ended_at = now() + interval '1 hour' where ended_at is not null$$,
  '42501', null, 'support_access_log: o fim é gravado uma vez só'
);

-- ---------------------------------------------------------------------------------------------------
-- Crédito, suspensão, catálogo, fila, conciliação
-- ---------------------------------------------------------------------------------------------------

create temporary table before_balance as select app.credit_balance((select miolo from fx)) as value;
grant select on before_balance to public;

select pg_temp.admin_as((select vic from fx));
select is(
  (select balance_after - balance_before from app.admin_adjust_credits((select miolo from fx), 5, 'Bônus de teste pela SA6a', 'chave-sa6a-pgtap-1')),
  5.00::numeric,
  'ajuste positivo concede 5 créditos'
);
select throws_ok(
  format($$select app.admin_adjust_credits(%L, -100000, 'Débito maior que o saldo', 'chave-sa6a-pgtap-2')$$, (select miolo from fx)),
  '55000', null, 'débito acima do disponível é recusado (saldo nunca negativo)'
);
select lives_ok(
  format($$select app.admin_set_workspace_suspended(%L, true, 'Suspensa a pedido da titular')$$, (select miolo from fx)),
  'o Vic suspende a Miolo'
);
reset role;
select ok(
  (select suspended_at is not null from public.workspaces where id = (select miolo from fx))
  and (select reason = 'Suspensa a pedido da titular' from public.workspace_suspension_reasons where workspace_id = (select miolo from fx))
  and not exists (
    select 1 from app.billing_due_subscriptions(now() + interval '400 days', interval '0 seconds', 1000) s
    where s.workspace_id = (select miolo from fx)
  )
  and (select status from public.subscriptions where workspace_id = (select miolo from fx)) = 'active',
  'suspensa: motivo gravado, renovação pula a conta e a assinatura segue ativa (não cancela)'
);
insert into public.runs (id, workspace_id, agent_id, kind, status, idempotency_key)
values ('5a6a0000-0000-4000-8000-000000000001', (select miolo from fx), 'otto', 'scheduled', 'queued', 'sa6a-pgtap-rotina');
select throws_ok(
  $$select app.enqueue_run('5a6a0000-0000-4000-8000-000000000001')$$,
  'HS423', 'Esta conta está suspensa: as rotinas estão pausadas.', 'rotina (run agendado) de conta suspensa não entra na fila'
);
select ok(
  exists (
    select 1 from public.audit_events a
    where a.action = 'workspace.suspended' and a.workspace_id = (select miolo from fx)
      and a.payload ->> 'reason' = 'Suspensa a pedido da titular'
  ) and exists (
    select 1 from public.audit_events a
    where a.action = 'credits.adjusted' and a.workspace_id = (select miolo from fx)
      and (a.payload ->> 'amount')::numeric = 5
  ),
  'audit_events: suspensão e ajuste com motivo'
);

select pg_temp.admin_as((select vic from fx));
select throws_ok(
  $$select app.admin_catalog_for_sale('04.01', true, 'Abrir a venda do texto')$$,
  '55000', 'Só vai à venda com a homologação concluída.', '"à venda" exige homologação concluída'
);
select lives_ok(
  $$select app.admin_catalog_price('04.01', 15, null, true, false, 'Preço novo provisório')$$,
  'preço novo do catálogo vira versão nova'
);
select throws_ok(
  $$select app.admin_run_cancel('5a6a0000-0000-4000-8000-000000000001', 'curto')$$,
  '22023', null, 'cancelar run exige motivo'
);
reset role;
select is(
  (select array_agg(credits order by valid_from) from public.delivery_prices where delivery_type = '04.01'),
  array[10.00, 15.00]::numeric[],
  'a versão passada do preço continua lá, igual'
);
select throws_ok(
  $$update public.delivery_prices set credits = 1 where delivery_type = '04.01' and credits = 10$$,
  null, null, 'versão passada do preço não muda'
);

insert into public.payment_events (id, provider, event_id, event_type, workspace_id)
values ('5a6a0000-0000-4000-8000-000000000002', 'mock', 'evt-sa6a-pgtap', 'payment.confirmed', (select miolo from fx));
select pg_temp.admin_as((select vic from fx));
select lives_ok(
  $$select app.admin_payment_reconcile('5a6a0000-0000-4000-8000-000000000002', 'Conferido no extrato do provedor')$$,
  'o Vic marca a conciliação com motivo'
);
select throws_ok(
  $$select app.admin_payment_reconcile('5a6a0000-0000-4000-8000-000000000002', 'Conferido no extrato do provedor')$$,
  '55000', 'Este webhook já foi marcado como conciliado.', 'conciliação marcada uma vez só'
);
reset role;
select throws_ok(
  $$update public.payment_reconciliations set reason = 'Trocado depois da marcação'$$,
  '42501', null, 'payment_reconciliations é somente inserção'
);

-- ---------------------------------------------------------------------------------------------------
-- Leitura do suporte (por último: a transação vira READ ONLY e não volta)
-- ---------------------------------------------------------------------------------------------------

select pg_temp.admin_as((select vic from fx));
-- SA7a (H-SA-09): conta suspensa não recebe sessão de suporte; a Miolo, suspensa acima, volta antes.
select count(*) from app.admin_set_workspace_suspended((select miolo from fx), false, 'Reativada para a leitura do suporte');
select count(*) from app.admin_support_session_start((select miolo from fx), 'Conferir a conversa com a titular', 15);
reset role;

select pg_temp.act_as((select vic from fx));
select is(
  (select count(*)::integer from public.conversations where workspace_id = (select miolo from fx)),
  0,
  'sem entrar na leitura do suporte o Vic não lê nada da Miolo (não é membro)'
);
select ok(app.support_session_enter(), 'com sessão aberta a transação vira a leitura do suporte');
select ok(
  (select count(*) from public.conversations where workspace_id = (select miolo from fx)) > 0
  and (select array_agg(id) from public.workspaces) = array[(select miolo from fx)],
  'na leitura do suporte o Vic lê a Miolo, e só ela'
);
select throws_ok(
  format($$select app.post_message(%L, 'Mensagem do suporte')$$, (select conversation from fx)),
  '42501', 'Seu papel não permite enviar mensagens.',
  'na leitura do suporte a escrita do produto é recusada pelo papel (has_role não muda)'
);
select throws_ok(
  $$insert into public.memberships (workspace_id, user_id, role) select miolo, vic, 'viewer' from fx$$,
  '25006', null, 'na leitura do suporte nenhuma escrita passa (transação READ ONLY)'
);
reset role;
select throws_ok(
  $$insert into public.audit_events (actor_type, action) values ('system', 'test.support_read_only')$$,
  '25006', null, 'nem o dono das tabelas grava nessa transação (vale para toda função SECURITY DEFINER)'
);

select * from finish();
rollback;
