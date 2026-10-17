-- SA1: Super Admin. RLS forçada nas tabelas novas; Data API (anon, authenticated, service_role) sem acesso a
-- nada do painel, nem com o JWT do próprio Super Admin; papel hellosquad_admin sem BYPASSRLS, só assumido
-- pela API (SET, sem herdar) e sem ler nada sem o JWT de quem está em platform_admins; seeds do catálogo,
-- regras, preços, regras por tarefa e provedores; nada à venda, tudo provisório; versões imutáveis;
-- escrita do painel só por app.admin_audit.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(44);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from auth.users where email = 'vic@hellosquad.example') as vic,
  (select id from public.workspaces where slug = 'miolo') as miolo;
grant select on fx to public;

create temporary table sa_objects (name text primary key);
insert into sa_objects values
  ('platform_admins'), ('support_access_log'), ('topups'), ('topup_versions'), ('delivery_catalog'),
  ('business_rule_docs'), ('business_rule_doc_versions'), ('reference_items'), ('model_pricing'),
  ('task_model_rules'), ('provider_health'), ('v_consumo_por_cliente'), ('v_qualidade_entregas'), ('v_fila'),
  ('v_fila_filas');
grant select on sa_objects to public;

-- O teste assume o papel do painel como a API faz (SET, sem herdar) e dá a ele o schema do pgTAP; os dois
-- GRANTs somem no rollback.
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
     and c.relname in (select name from sa_objects)),
  10::bigint,
  'RLS habilitada e forçada nas dez tabelas do Super Admin'
);

select is(
  (select count(*) from sa_objects o, (values ('anon'), ('authenticated'), ('service_role')) as r (role)
   where has_table_privilege(r.role, 'public.' || o.name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0::bigint,
  'Data API: anon, authenticated e service_role sem privilégio em nenhuma tabela ou view do painel'
);

select ok(
  (select not rolcanlogin and not rolinherit and not rolbypassrls and not rolsuper and not rolcreaterole
          and not rolcreatedb and not rolreplication
   from pg_roles where rolname = 'hellosquad_admin'),
  'hellosquad_admin: NOLOGIN, NOINHERIT, sem BYPASSRLS e sem atributo de administração'
);

select ok(
  pg_has_role('hellosquad_api', 'hellosquad_admin', 'SET')
  and not pg_has_role('hellosquad_api', 'hellosquad_admin', 'USAGE')
  and not pg_has_role('authenticated', 'hellosquad_admin', 'MEMBER')
  and not pg_has_role('anon', 'hellosquad_admin', 'MEMBER')
  and not pg_has_role('service_role', 'hellosquad_admin', 'MEMBER'),
  'Só a API assume hellosquad_admin, com SET LOCAL ROLE e sem herdar'
);

select is(
  (select count(*) from sa_objects o
   where has_table_privilege('hellosquad_admin', 'public.' || o.name, 'INSERT,UPDATE,DELETE,TRUNCATE')),
  0::bigint,
  'hellosquad_admin não escreve em nada do painel nesta fatia (só leitura)'
);

select is(
  (select count(*) from information_schema.table_privileges
   where grantee = 'hellosquad_admin' and table_schema = 'public' and privilege_type <> 'SELECT'),
  0::bigint,
  'hellosquad_admin só tem SELECT nas tabelas do produto'
);

select ok(
  has_function_privilege('hellosquad_admin', 'app.admin_audit(text, uuid, text, text, jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.admin_audit(text, uuid, text, text, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'app.admin_audit(text, uuid, text, text, jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.admin_workspace_members(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.admin_user_labels(uuid[])', 'EXECUTE'),
  'Funções do painel (auditoria, membros, nomes) só para hellosquad_admin'
);

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name in (select name from sa_objects)
     and (column_name ~ '(secret|password|api_key|access_key|private_key)' or column_name ~ '(^|_)token$')),
  0::bigint,
  'Nenhuma coluna de segredo nas tabelas do painel (provedor é "configurada"/"ausente" pela API)'
);

-- ---------------------------------------------------------------------------------------------------
-- Seeds: catálogo, venda, regras, preços, regras por tarefa, provedores
-- ---------------------------------------------------------------------------------------------------

select is((select count(*) from public.delivery_catalog), 46::bigint, 'Catálogo com as 46 deliveries');

select is(
  (select string_agg(agent_id || ':' || n, ',' order by min_sort)
   from (select agent_id::text, count(*) as n, min(sort_order) as min_sort from public.delivery_catalog group by agent_id) a),
  'nexo:4,bia:7,kaia:7,otto:7,kiwi:9,max:6,iris:6',
  'Deliveries por agente como no catálogo do handoff'
);

select is(
  (select count(*) from public.delivery_catalog where for_sale or depth_source <> 'inferred'),
  0::bigint,
  'Nenhuma delivery à venda; profundidade toda marcada como inferida (pergunta 6 ao dono)'
);

select is(
  (select count(*) from public.delivery_catalog c
   where not exists (select 1 from public.delivery_prices p where p.delivery_type = c.delivery_type)),
  0::bigint,
  'Toda delivery do catálogo tem preço versionado em delivery_prices (S1e)'
);

select is(
  (select count(*) from public.delivery_catalog where agent_id = 'kaia' and homologation_status <> 'awaiting_engine'),
  0::bigint,
  'Kaia aguarda o motor de imagem do dono em todas as deliveries'
);

select is(
  (select count(*) from public.delivery_catalog where homologation_status = 'homologated'),
  0::bigint,
  'Nada homologado: só o dono homologa'
);

select is(
  (select count(*) from public.plans where for_sale) + (select count(*) from public.topups where for_sale),
  0::bigint,
  'Planos e recargas fora de venda'
);

select is(
  (select count(*) from public.topup_versions),
  (select count(*) from public.topup_packs),
  'topup_versions lê as versões de topup_packs (uma fonte de preço só)'
);

select is(
  (select jsonb_array_length(v.paragraphs) || ':' || v.version || ':' || d.in_prompt
   from public.business_rule_docs d join public.business_rule_doc_versions v on v.doc_id = d.id
   where d.slug = 'diretrizes-do-dono'),
  '26:1:false',
  'Diretrizes do dono como documento: versão 1 com 26 parágrafos, referência interna'
);

select is(
  (select count(*) from public.business_rule_doc_versions v, jsonb_array_elements(v.paragraphs) p
   where p ->> 'mark' <> 'decided'),
  0::bigint,
  'Todos os parágrafos das diretrizes marcados [DECIDIDO]'
);

select is(
  (select count(*) || ':' || count(*) filter (where provisional and checked_at = date '2026-10-16')
   from public.model_pricing),
  '5:5',
  'Cinco preços de modelo, provisórios e conferidos em 16/10/2026'
);

select is(
  (select model || ':' || thinking || ':' || thinking_budget from public.task_model_rules
   where agent_id = 'nexo' and task = 'triage'),
  'claude-haiku-4-5:budget:1024',
  'Triagem do Nexo com Haiku 4.5 e orçamento de thinking de flow.py'
);

select is(
  (select count(*) from public.task_model_rules where task = 'default' and model = 'claude-opus-5-5'),
  7::bigint,
  'Os sete agentes com Opus 5.5 como padrão (agent.yaml)'
);

select is(
  (select string_agg(provider, ',' order by sort_order) from public.provider_health),
  'anthropic,image_engine,asaas,mercadopago,email',
  'Saúde dos cinco provedores do plano'
);

-- ---------------------------------------------------------------------------------------------------
-- Imutabilidade das versões
-- ---------------------------------------------------------------------------------------------------

select throws_ok(
  $$update public.business_rule_doc_versions set author = 'outro'$$,
  null, null,
  'Versão de regra de negócio não se edita: versão nova'
);

select throws_ok(
  $$update public.model_pricing set input_usd_per_mtok = 1$$,
  null, null,
  'Preço de modelo não se edita: versão nova'
);

select throws_ok(
  $$update public.task_model_rules set model = 'claude-opus-5'$$,
  null, null,
  'Regra por tarefa não se edita: versão nova'
);

-- ---------------------------------------------------------------------------------------------------
-- Data API: owner comum, sem membership, anon e o próprio Super Admin pelo papel authenticated
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select ok(not app.is_platform_admin(), 'Marina (owner) não é Super Admin');
select throws_ok(
  $$select count(*) from app.admin_audit_events()$$, '42501', null,
  'Marina não lê a auditoria do painel'
);
select throws_ok($$select count(*) from public.platform_admins$$, '42501', null, 'Marina não lê platform_admins');
select throws_ok($$select count(*) from public.delivery_catalog$$, '42501', null, 'Marina não lê o catálogo do painel');
select throws_ok($$select count(*) from public.v_consumo_por_cliente$$, '42501', null, 'Marina não lê o consumo por cliente');
select throws_ok(
  $$select app.admin_audit('admin.read', null, null, null, '{}')$$, '42501', null,
  'Marina não grava auditoria do painel'
);
reset role;

select pg_temp.act_as((select vic from fx));
select ok(app.is_platform_admin(), 'Vic fictício é Super Admin');
select throws_ok(
  $$select count(*) from public.provider_health$$, '42501', null,
  'Nem o Super Admin lê o painel pelo papel authenticated (Data API)'
);
reset role;

select pg_temp.claims(null);
set local role anon;
select throws_ok($$select count(*) from public.task_model_rules$$, '42501', null, 'anon não lê nada do painel');
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Papel do painel: sem o JWT de um Super Admin não lê nada; com ele, lê tudo e audita
-- ---------------------------------------------------------------------------------------------------

select pg_temp.admin_as((select marina from fx));
select is(
  (select count(*) from public.delivery_catalog) + (select count(*) from public.workspaces)
  + (select count(*) from public.platform_admins) + (select count(*) from public.v_fila),
  0::bigint,
  'hellosquad_admin com o JWT da Marina não lê nada'
);
reset role;

select pg_temp.admin_as((select pedro from fx));
select is(
  (select count(*) from public.delivery_catalog) + (select count(*) from public.memberships),
  0::bigint,
  'hellosquad_admin com o JWT do Pedro não lê nada'
);
reset role;

select pg_temp.admin_as((select vic from fx));
select is(
  (select count(*) from public.delivery_catalog)::text || ':' || (select count(*) from public.platform_admins)
  || ':' || (select count(*) from public.v_fila_filas),
  '46:1:5',
  'Vic pelo papel do painel lê catálogo, Super Admins e as cinco filas'
);
select ok(
  (select count(*) from public.workspaces where id = (select miolo from fx)) = 1
  and (select count(*) from public.runs where workspace_id = (select miolo from fx)) >= 1,
  'Vic lê conta e runs da Miolo, com workspace_id explícito'
);
select is(
  (select email || ':' || role from app.admin_workspace_members((select miolo from fx))),
  'marina@miolo.example:owner',
  'Vic lê os membros da Miolo (só pelo papel do painel)'
);
select ok(
  (select count(*) from app.admin_audit_events(p_workspace_id => (select miolo from fx))) >= 1,
  'Vic lê a auditoria pelo app.admin_audit_events'
);
select throws_ok(
  $$select count(*) from public.audit_events$$, '42501', null,
  'Nem o papel do painel lê audit_events direto: a tabela segue sem política (S0)'
);
select throws_ok(
  $$insert into public.provider_health (provider, display_name, purpose, status, sort_order)
    values ('email', 'x', 'x', 'working', 9)$$,
  '42501', null,
  'Nem o Vic escreve direto: escrita do painel só por função auditada'
);
select ok(
  (select app.admin_audit('admin.account.viewed', (select miolo from fx), 'workspace', (select miolo::text from fx),
                          '{"reason": "teste"}') is not null),
  'app.admin_audit grava pelo Super Admin'
);
reset role;

select is(
  (select actor_type || ':' || actor_id || ':' || (payload ->> 'platform_admin') from public.audit_events
   where action = 'admin.account.viewed' and workspace_id = (select miolo from fx)
   order by created_at desc limit 1),
  'user:' || (select vic from fx)::text || ':true',
  'Evento do painel com o Super Admin como autor e marca platform_admin'
);

select * from finish();
rollback;
