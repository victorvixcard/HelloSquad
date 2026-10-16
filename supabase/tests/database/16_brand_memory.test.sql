-- S1d: Memória da Marca. Isolamento por workspace, só leitura para authenticated, agente grava só pelo
-- papel privilegiado, sugestão não é conhecimento, decisão só do owner e idempotente, descartada não
-- volta, correção cria versão e preserva o histórico, conflito suspende as duas versões, Realtime.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(39);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  'workspace:' || (select id from public.workspaces where slug = 'miolo') as miolo_topic,
  '5eed0000-0000-4000-8000-000000000811'::uuid as business_fact,
  '5eed0000-0000-4000-8000-000000000813'::uuid as tone_fact,
  '5eed0000-0000-4000-8000-000000000815'::uuid as anchor_fact,
  '5eed0000-0000-4000-8000-000000000816'::uuid as forbidden_fact,
  '5eed0000-0000-4000-8000-000000000821'::uuid as seed_suggestion;
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

-- ---------------------------------------------------------------------------------------------------
-- Estrutura e permissões
-- ---------------------------------------------------------------------------------------------------

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relrowsecurity and c.relforcerowsecurity
     and c.relname in ('brand_facts', 'fact_sources', 'memory_suggestions', 'memory_conflicts', 'run_context_items')),
  5::bigint,
  'as cinco tabelas da memória têm RLS habilitada e forçada'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'authenticated' and privilege_type <> 'SELECT'
     and table_name in ('brand_facts', 'fact_sources', 'memory_suggestions', 'memory_conflicts', 'run_context_items')),
  0::bigint,
  'authenticated só tem SELECT nas tabelas da memória'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'app.suggest_memory(uuid, public.agent_id, public.memory_area, text, text, text, text, text, text, text, uuid, uuid, public.brand_fact_state, text[])',
    'execute'
  ),
  'authenticated não executa app.suggest_memory (só o papel privilegiado)'
);

select ok(
  has_function_privilege('authenticated', 'app.confirm_suggestion(uuid)', 'execute')
  and has_function_privilege('authenticated', 'app.correct_fact(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'app.resolve_conflict(uuid, uuid, text)', 'execute'),
  'authenticated executa as decisões (a função confere o owner)'
);

-- ---------------------------------------------------------------------------------------------------
-- Agente sugere (papel privilegiado): sugestão não é conhecimento
-- ---------------------------------------------------------------------------------------------------

insert into ids
select 'kaia_suggestion', s.suggestion_id
from fx, app.suggest_memory(
  fx.miolo, 'kaia', 'brand', 'Preferências criativas', 'Peças de oferta',
  'Data sempre visível no topo das peças de oferta',
  p_question => 'Você prefere a data sempre visível, no topo das peças de oferta?'
) s;

select ok((select id from ids where name = 'kaia_suggestion') is not null, 'Kaia percebeu: sugestão criada');

select is(
  (select count(*) from public.brand_facts where content = 'Data sempre visível no topo das peças de oferta'),
  0::bigint,
  'a sugestão não vira conhecimento antes da decisão'
);

select is(
  (select outcome from fx, app.suggest_memory(
     fx.miolo, 'kaia', 'brand', 'Preferências criativas', 'Peças de oferta',
     '  DATA sempre visível no  topo das peças de oferta ')),
  'existing',
  'a mesma sugestão (sem caixa e espaço extra) não duplica'
);

-- ---------------------------------------------------------------------------------------------------
-- Isolamento e leitura
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(
     (select count(*) from public.brand_facts),
     (select count(*) from public.memory_suggestions),
     (select count(*) from public.fact_sources))::text),
  '(6,2,2)',
  'Marina lê a memória da Miolo: 6 conhecimentos, 2 sugestões, 2 fontes'
);

select throws_ok(
  $$insert into public.brand_facts (workspace_id, area, topic, key, content, state, source_type)
    select miolo, 'brand', 'Tom de voz', 'Tom', 'x', 'confirmed', 'correction' from fx$$,
  '42501', null,
  'authenticated não grava conhecimento direto'
);

select throws_ok(
  format($$update public.brand_facts set state = 'unused' where id = %L$$, (select tone_fact from fx)),
  '42501', null,
  'authenticated não altera conhecimento direto'
);

select pg_temp.act_as((select rafael from fx));
select is(
  (select count(*) from public.brand_facts) + (select count(*) from public.memory_suggestions)
    + (select count(*) from public.fact_sources) + (select count(*) from public.memory_conflicts)
    + (select count(*) from public.run_context_items),
  0::bigint,
  'Rafael (Vitta) não vê nada da memória da Miolo'
);

select throws_ok(
  format('select app.confirm_suggestion(%L)', (select seed_suggestion from fx)),
  'P0002', 'Sugestão não encontrada.',
  'Rafael não decide sugestão da Miolo: mesma resposta de inexistente'
);

select pg_temp.act_as((select pedro from fx));
select is(
  (select count(*) from public.brand_facts) + (select count(*) from public.memory_suggestions),
  0::bigint,
  'Pedro, sem workspace, não vê memória'
);
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Só o owner decide
-- ---------------------------------------------------------------------------------------------------

insert into ids
select 'vitta_suggestion', s.suggestion_id
from fx, app.suggest_memory(fx.vitta, 'iris', 'audience', 'Comportamentos conhecidos', 'Horário preferido',
  'Clientes marcam mais à noite') s;
with f as (
  insert into public.brand_facts (workspace_id, area, topic, key, content, state, source_type, confirmed_at)
  select vitta, 'brand', 'Tom de voz', 'Tom de voz', 'Calmo e acolhedor', 'confirmed', 'onboarding', now() from fx
  returning id
)
insert into ids select 'vitta_fact', id from f;
with r as (
  insert into public.runs (workspace_id, agent_id, idempotency_key)
  select vitta, 'otto', 'teste-memoria' from fx
  returning id
)
insert into ids select 'vitta_run', id from r;

select pg_temp.act_as((select carla from fx));
select throws_ok(
  format('select app.confirm_suggestion(%L)', (select id from ids where name = 'vitta_suggestion')),
  '42501', 'Só o dono da conta toma esta decisão.',
  'Carla (editor) não confirma sugestão'
);
select throws_ok(
  format('select app.discard_suggestion(%L)', (select id from ids where name = 'vitta_suggestion')),
  '42501', 'Só o dono da conta toma esta decisão.',
  'Carla (editor) não descarta sugestão'
);
select throws_ok(
  format($$select app.correct_fact(%L, 'Animado')$$, (select id from ids where name = 'vitta_fact')),
  '42501', 'Só o dono da conta toma esta decisão.',
  'Carla (editor) não corrige conhecimento'
);
select throws_ok(
  format('select app.mark_fact_outdated(%L)', (select id from ids where name = 'vitta_fact')),
  '42501', 'Só o dono da conta toma esta decisão.',
  'Carla (editor) não marca como desatualizado'
);

select pg_temp.act_as((select rafael from fx));
select is(
  (select decision::text from app.confirm_suggestion((select id from ids where name = 'vitta_suggestion'))),
  'confirm',
  'Rafael (owner da Vitta) confirma'
);
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Confirmar: idempotente, um conhecimento só
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(decision, state, resulting_fact_id is not null)::text
   from app.confirm_suggestion((select id from ids where name = 'kaia_suggestion'))),
  '(confirm,done,t)',
  'Marina confirma a sugestão da Kaia'
);
select is(
  (select row(decision, resulting_fact_id is not null)::text
   from app.discard_suggestion((select id from ids where name = 'kaia_suggestion'))),
  '(confirm,t)',
  'decidir de novo (mesmo outra decisão) devolve o estado atual, sem efeito'
);
reset role;

select is(
  (select row(count(*), min(state::text), min(perceived_by_agent_id::text), min(source_type::text))::text
   from public.brand_facts where content = 'Data sempre visível no topo das peças de oferta'),
  '(1,confirmed,kaia,agent_observation)',
  'um conhecimento Confirmado, percebido pela Kaia'
);

-- ---------------------------------------------------------------------------------------------------
-- Descartar: não vira conhecimento e não volta
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(decision, resulting_fact_id)::text from app.discard_suggestion((select seed_suggestion from fx))),
  '(discard,)',
  'Marina descarta a sugestão do Otto'
);
reset role;

select is(
  (select count(*) from public.brand_facts where content ilike 'posts com bastidores do forno%'),
  0::bigint,
  'sugestão descartada não vira conhecimento'
);

select is(
  (select row(outcome, suggestion_id = fx.seed_suggestion)::text
   from fx, app.suggest_memory(fx.miolo, 'otto', 'knowledge', 'Descobertas', 'Bastidores',
     'Posts com bastidores do forno têm mais salvamentos')),
  '(discarded_before,t)',
  'o Otto percebe de novo e a sugestão descartada não volta'
);

select is(
  (select count(*) from public.memory_suggestions where content ilike 'posts com bastidores do forno%'),
  1::bigint,
  'continua uma sugestão só, descartada'
);

-- ---------------------------------------------------------------------------------------------------
-- Corrigir: versão nova, histórico preservado, conteúdo nunca editado
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids
select 'tone_v2', id from app.correct_fact((select tone_fact from fx), 'Acolhedor e direto, com humor leve');
reset role;

select is(
  (select row(version, supersedes_id = fx.tone_fact, state, source_type, superseded_at is null)::text
   from public.brand_facts, fx where id = (select id from ids where name = 'tone_v2')),
  '(2,t,confirmed,correction,t)',
  'correção cria a versão 2, Confirmado, que substitui a 1'
);

select is(
  (select row(content, superseded_at is not null)::text from public.brand_facts, fx where id = fx.tone_fact),
  '("Acolhedor, direto, sem gíria",t)',
  'a versão 1 fica no histórico, com o texto original'
);

select throws_ok(
  format($$update public.brand_facts set content = 'editado' where id = %L$$, (select id from ids where name = 'tone_v2')),
  '55000', 'Conhecimento não se edita: a correção cria uma versão nova.',
  'nem o papel privilegiado edita o conteúdo'
);

select throws_ok(
  format($$update public.brand_facts set state = 'unused' where id = %L$$, (select tone_fact from fx)),
  '55000', 'Esta versão do conhecimento já foi substituída.',
  'versão substituída não muda mais'
);

select pg_temp.act_as((select marina from fx));
select is(
  (select id from app.correct_fact((select tone_fact from fx), 'Acolhedor e direto, com humor leve')),
  (select id from ids where name = 'tone_v2'),
  'repetir a mesma correção devolve a versão nova'
);
select throws_ok(
  format($$select app.correct_fact(%L, 'Outro tom')$$, (select tone_fact from fx)),
  '55000', 'Este conhecimento já tem uma versão mais nova. Atualize e tente de novo.',
  'corrigir uma versão antiga com outro texto é recusado'
);

-- ---------------------------------------------------------------------------------------------------
-- Desatualizado
-- ---------------------------------------------------------------------------------------------------

select is(
  (select state::text from app.mark_fact_outdated((select business_fact from fx))),
  'outdated',
  'o owner marca um conhecimento como Desatualizado'
);
select is(
  (select state::text from app.mark_fact_outdated((select business_fact from fx))),
  'outdated',
  'marcar de novo não muda nada'
);
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Conflito: "Da fonte" contra o que está em uso
-- ---------------------------------------------------------------------------------------------------

insert into ids
select 'conflict', s.conflict_id
from fx, app.suggest_memory(fx.miolo, 'iris', 'business', 'Produtos', 'Produto âncora',
  'Pão de fermentação longa e focaccia', p_state => 'from_source') s;

select is(
  (select row(c.state, a.state, b.state)::text
   from public.memory_conflicts c
   join public.brand_facts a on a.id = c.fact_a_id
   join public.brand_facts b on b.id = c.fact_b_id
   where c.id = (select id from ids where name = 'conflict')),
  '(open,conflicting,conflicting)',
  'as duas versões ficam Em conflito até o owner decidir'
);

select pg_temp.act_as((select marina from fx));
select is(
  (select row(state, resolution, resulting_fact_id = fx.anchor_fact)::text
   from fx, app.resolve_conflict((select id from ids where name = 'conflict'), fx.anchor_fact)),
  '(resolved,keep_a,t)',
  '"Vale este": a versão escolhida fica'
);
reset role;

select is(
  (select row(a.state, b.state)::text
   from public.memory_conflicts c
   join public.brand_facts a on a.id = c.fact_a_id
   join public.brand_facts b on b.id = c.fact_b_id
   where c.id = (select id from ids where name = 'conflict')),
  '(confirmed,discarded)',
  'a outra sai da memória como Descartado (o registro fica)'
);

-- ---------------------------------------------------------------------------------------------------
-- Busca textual, contexto do run e Realtime
-- ---------------------------------------------------------------------------------------------------

select is(
  (select array_agg(f.id order by f.id)
   from public.brand_facts f, fx
   where f.workspace_id = fx.miolo and f.superseded_at is null
     and f.search_vector @@ websearch_to_tsquery(app.memory_search_config('pt-BR'), 'palavras proibidas')),
  array[(select forbidden_fact from fx)],
  'a busca em português acha a palavra proibida (radical e chave)'
);

select throws_ok(
  $$insert into public.run_context_items (workspace_id, run_id, kind, fact_id, reason, tokens)
    select fx.miolo, ids.id, 'fact', fx.tone_fact, 'essential', 10 from fx, ids where ids.name = 'vitta_run'$$,
  '23503', null,
  'contexto do run não aponta para run de outro workspace'
);

select results_eq(
  format(
    $$select event from realtime.messages
      where topic = %L and payload ->> 'id' = %L order by inserted_at, event$$,
    (select miolo_topic from fx), (select id from ids where name = 'kaia_suggestion')
  ),
  $$values ('memory_suggestion.created'), ('memory_suggestion.decided')$$,
  'sugestão publica no canal do workspace ao ser criada e ao ser decidida'
);

select * from finish();
rollback;
