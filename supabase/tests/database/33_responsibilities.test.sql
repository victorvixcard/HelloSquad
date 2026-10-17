-- S3b: Modo Autônomo no banco. RLS forçada nas quatro tabelas (membro lê o seu negócio, ninguém escreve direto),
-- isolamento entre negócios, execução encerrada imutável e registro somente inserção, ações só do owner (pausar,
-- retomar, encerrar, interruptor), falha e bloqueio não pausam, a confirmação do dono ativa o combinado, ritmo no
-- fuso do negócio e os ganchos de conexão da S3a.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(47);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000000a01'::uuid as plan,
  '5eed0000-0000-4000-8000-000000000a03'::uuid as seo,
  '5eed0000-0000-4000-8000-000000000a05'::uuid as crm,
  '5eed0000-0000-4000-8000-000000000a13'::uuid as pl42;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

-- Estrutura e permissões
select ok(
  (select bool_and(c.relrowsecurity and c.relforcerowsecurity) from pg_class c
   where c.oid in ('public.responsibilities'::regclass, 'public.responsibility_runs'::regclass,
                   'public.responsibility_events'::regclass, 'public.responsibility_proposals'::regclass)),
  'RLS ligada e forçada nas quatro tabelas do Modo Autônomo'
);
select ok(
  not has_table_privilege('authenticated', 'public.responsibilities', 'insert')
  and not has_table_privilege('authenticated', 'public.responsibilities', 'update')
  and not has_table_privilege('authenticated', 'public.responsibility_runs', 'insert')
  and not has_table_privilege('authenticated', 'public.responsibility_runs', 'update')
  and not has_table_privilege('authenticated', 'public.responsibility_events', 'insert'),
  'authenticated não escreve direto nas responsabilidades, execuções nem no registro'
);
select ok(not has_table_privilege('anon', 'public.responsibilities', 'select'), 'anon não lê responsabilidades');
select ok(
  not has_function_privilege('authenticated', 'app.block_responsibilities_for_connection(uuid, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'app.unblock_responsibilities_for_connection(uuid, text, timestamptz)', 'execute'),
  'os ganchos de conexão da S3a não são executáveis por authenticated'
);
select ok(
  has_function_privilege('authenticated', 'app.set_responsibility_state(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'app.propose_responsibility(uuid, uuid, uuid, jsonb, text, jsonb)', 'execute'),
  'authenticated executa as ações (a função confere papel e negócio)'
);
select has_column('public', 'workspaces', 'timezone', 'workspaces.timezone (fuso do negócio)');

-- Ritmo no fuso do negócio
select is(
  app.responsibility_next_run('weekly', '{4}', null::smallint, '09:00', 'America/Sao_Paulo', '2026-10-17 12:00+00'),
  '2026-10-22 12:00+00'::timestamptz,
  'toda quinta às 9h de Brasília: sábado 17/10 → qui 22/10 12:00 UTC'
);
select is(
  app.responsibility_next_run('weekly', '{4}', null::smallint, '09:00', 'America/Sao_Paulo', '2026-10-22 12:00+00'),
  '2026-10-29 12:00+00'::timestamptz,
  'depois da execução de quinta, a próxima quinta (estritamente depois)'
);
select is(
  app.responsibility_next_run('monthly', '{}', 1::smallint, '09:00', 'America/Sao_Paulo', '2026-10-12 15:00+00'),
  '2026-11-01 12:00+00'::timestamptz,
  '"Todo mês" → 01/11, 9h'
);
select is(
  app.responsibility_next_run('biweekly', '{}', null::smallint, '09:00', 'America/Sao_Paulo', '2026-10-12 15:00+00'),
  '2026-10-26 12:00+00'::timestamptz,
  '"A cada 15 dias" → 26/10 (como o protótipo)'
);
select is(
  app.responsibility_next_run('daily', '{}', null::smallint, '09:00', 'America/Sao_Paulo', '2026-10-17 11:00+00'),
  '2026-10-17 12:00+00'::timestamptz,
  '"Todo dia": hoje às 9h se ainda não passou'
);
select is(
  app.responsibility_next_run('continuous', '{}', null::smallint, '09:00', 'America/Sao_Paulo', now()),
  null::timestamptz,
  '"Sempre que surgir" não tem próxima execução programada'
);

-- Leitura e isolamento
select pg_temp.act_as((select marina from fx));
select is((select count(*)::int from public.responsibilities), 5, 'Marina vê as cinco responsabilidades da Miolo');
select is((select count(*)::int from public.responsibility_runs), 5, 'Marina vê as cinco execuções da Miolo');
select is(
  (select status::text from public.responsibility_runs where code = 'BL-42'), 'failed',
  'BL-42 falhou'
);
select pg_temp.act_as((select rafael from fx));
select is((select count(*)::int from public.responsibilities), 0, 'Rafael não vê nada da Miolo');
select is((select count(*)::int from public.responsibility_runs), 0, 'Rafael não vê execuções da Miolo');
select is((select count(*)::int from public.responsibility_events), 0, 'Rafael não vê o registro da Miolo');
select throws_ok(
  $$select app.set_responsibility_state((select plan from fx), 'pause')$$,
  'P0002', 'Responsabilidade não encontrada.', 'Rafael não pausa a responsabilidade da Miolo'
);
select throws_ok(
  $$select app.set_autonomy((select miolo from fx), false)$$,
  'P0002', 'Workspace não encontrado.', 'Rafael não mexe no interruptor da Miolo'
);
select throws_ok(
  $$insert into public.responsibilities (workspace_id, template, title, lead_agent_id, cadence, agreement)
    values ((select vitta from fx), 'plan', 'x', 'otto', 'continuous', 'x')$$,
  '42501', null, 'escrita direta recusada'
);

-- Ações do owner
select pg_temp.act_as((select marina from fx));
select throws_ok(
  $$select app.set_responsibility_state((select seo from fx), 'pause')$$,
  '55000', null, 'com falha na execução não pausa até ser resolvida'
);
select throws_ok(
  $$select app.set_responsibility_state((select crm from fx), 'end')$$,
  '55000', null, 'bloqueada por integração não encerra até ser resolvida'
);
select is(
  (select status::text from app.set_responsibility_state((select plan from fx), 'pause')), 'paused',
  'Marina pausa o plano'
);
select is(
  (select next_run_at from public.responsibilities where id = (select plan from fx)), null::timestamptz,
  'pausada não tem próxima execução'
);
select is(
  (select status::text from app.set_responsibility_state((select plan from fx), 'pause')), 'paused',
  'pausar de novo devolve o mesmo'
);
select is(
  (select status::text from app.set_responsibility_state((select plan from fx), 'resume')), 'active',
  'Marina retoma o plano'
);
select ok(
  (select next_run_at > now() from public.responsibilities where id = (select plan from fx)),
  'retomada volta com a próxima execução no ritmo'
);
select is(
  (select array_agg(action order by created_at desc, action) from (
     select action, created_at from public.responsibility_events
     where responsibility_id = (select plan from fx) order by created_at desc limit 2) e),
  array['paused', 'resumed'],
  'o registro guarda "Você pausou" e "Você retomou"'
);
select is(app.set_autonomy((select miolo from fx), false), 2, 'interruptor pausa as duas ativas (plano e resultados)');
select is(
  (select count(*)::int from public.responsibilities where status in ('failed', 'blocked')), 2,
  'o interruptor não alcança falha nem bloqueio'
);
select is(app.set_autonomy((select miolo from fx), true), 3, 'interruptor retoma as três pausadas');

-- Realtime: responsibility.<estado> e responsibility_run.<estado> no tópico privado do workspace
reset role;
select ok(
  exists (
    select 1 from realtime.messages
    where topic = 'workspace:' || (select miolo from fx)::text and event = 'responsibility.paused'
      and payload ->> 'id' = (select plan from fx)::text
  ),
  'pausar publica responsibility.paused no tópico do workspace'
);
insert into public.responsibility_runs (workspace_id, responsibility_id, code, period_no, title_key, scheduled_for)
select miolo, plan, 'PL-50', 50, 'plan', '2026-12-10 12:00+00' from fx;
select ok(
  exists (
    select 1 from realtime.messages
    where topic = 'workspace:' || (select miolo from fx)::text and event = 'responsibility_run.created'
      and payload ->> 'code' = 'PL-50'
  ),
  'execução nova publica responsibility_run.created'
);

-- Imutabilidade
select throws_ok(
  $$update public.responsibility_runs set message_key = 'delivered' where id = (select pl42 from fx)$$,
  '42501', 'Execução encerrada não muda: o registro fica como aconteceu.', 'execução encerrada não muda'
);
select throws_ok(
  $$delete from public.responsibility_runs where id = (select pl42 from fx)$$,
  '42501', 'Execução do Modo Autônomo não se apaga: o histórico fica guardado.', 'execução não se apaga'
);
select throws_ok(
  $$update public.responsibility_events set action = 'paused' where responsibility_id = (select plan from fx)$$,
  '42501', 'O registro de alterações da responsabilidade é somente inserção.', 'registro é somente inserção'
);
select lives_ok(
  $$update public.responsibility_runs set work_item_id = null where id = (select pl42 from fx)$$,
  'a FK pode soltar o trabalho apagado da execução encerrada'
);

-- Delegação: só o ok do dono ativa
select pg_temp.act_as((select carla from fx));
create temporary table proposal as
select * from app.propose_responsibility(
  (select vitta from fx), null, null,
  jsonb_build_object(
    'template', 'res', 'title', 'Acompanhar meus resultados', 'lead_agent_id', 'iris',
    'collaborator_agent_ids', '[]'::jsonb, 'cadence', 'weekly', 'weekdays', '[1]'::jsonb, 'run_time', '09:00',
    'options', '{"freq": "weekly_mon", "src": "ig_site_google"}'::jsonb, 'actions', '[]'::jsonb,
    'approval_required', false, 'required_connections', '[]'::jsonb
  ),
  'Toda segunda, às 9h, a Íris te manda uma leitura de Instagram, site e Google, com a fonte de cada número.',
  '{"work_title": "Nova responsabilidade: Acompanhar meus resultados", "message": "Antes de ativar, confira o combinado:"}'
);
select is((select status::text from proposal), 'pending', 'a editora apresenta o combinado (proposta pendente)');
select is(
  (select count(*)::int from public.responsibilities where workspace_id = (select vitta from fx)), 0,
  'nada ativa antes do ok do dono'
);
select throws_ok(
  $$select app.decide_approval((select approval_id from proposal), 'approved')$$,
  '42501', 'Só o dono da conta toma esta decisão.', 'a editora não confirma'
);
select pg_temp.act_as((select rafael from fx));
select lives_ok(
  $$select app.decide_approval((select approval_id from proposal), 'approved')$$, 'o dono confirma'
);
select is(
  (select status::text from public.responsibilities where workspace_id = (select vitta from fx)), 'active',
  'confirmado, nasce Ativa'
);
select is(
  (select status::text from public.work_items where id = (select work_item_id from proposal)), 'done',
  'o trabalho 01.04 da delegação fecha'
);

select throws_ok(
  $$select app.propose_responsibility(
      (select vitta from fx), null, null,
      jsonb_build_object('template', 'seo', 'title', 'x', 'lead_agent_id', 'kiwi', 'cadence', 'weekly',
        'weekdays', '[1]'::jsonb, 'actions',
        '[{"action": "execute_investments", "level": "execute", "requirement": "specific_authorization", "granted": true}]'::jsonb),
      'x', '{"work_title": "x", "message": "x"}')$$,
  '23514', null, 'nenhuma proposta nasce com investimento autorizado'
);

-- Ganchos da S3a
reset role;
select is(
  app.block_responsibilities_for_connection((select miolo from fx), 'email_marketing', 'connection_missing'), 0,
  'bloquear de novo pela mesma conexão não repete'
);
select is(
  app.unblock_responsibilities_for_connection((select miolo from fx), 'email_marketing'), 1,
  'conectar o e-mail destrava o relacionamento'
);

select * from finish();
rollback;
