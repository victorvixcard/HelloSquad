-- S1f: ações da Memória que faltavam na S1d (não usar mais, voltar a usar, confirmar da fonte ou
-- observado, continua valendo, adicionar, marcar como vista), brand_profiles e busca sem acento.
-- Só o owner decide; outra empresa não vê; repetir devolve o mesmo estado.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(29);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000000801'::uuid as declared_source,
  '5eed0000-0000-4000-8000-000000000813'::uuid as tone_fact,
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

insert into ids select 'observed', fact_id from app.suggest_memory(
  (select miolo from fx), 'iris', 'knowledge', 'Descobertas', 'Dia com mais encomendas', 'Sábado', p_state => 'observed'
);
insert into ids select 'from_source', fact_id from app.suggest_memory(
  (select miolo from fx), 'iris', 'business', 'Produtos', 'Mais vendidos', 'Levain e focaccia', p_state => 'from_source'
);
update public.brand_facts set state = 'outdated' where id = (select id from ids where name = 'from_source');

select ok(
  has_function_privilege('authenticated', 'app.stop_using_fact(uuid)', 'execute')
  and has_function_privilege('authenticated', 'app.add_fact(uuid, public.memory_area, text, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'app.set_brand_summary(uuid, text, public.agent_id)', 'execute'),
  'o dono age pelas funções; a síntese do squad só o agente escreve'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.brand_profiles'::regclass),
  'brand_profiles com RLS forçada'
);

-- ---------------------------------------------------------------------------------------------------
-- Não usar mais e voltar a usar
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(state::text, unused_from::text)::text from app.stop_using_fact((select tone_fact from fx))),
  row('unused', 'confirmed')::text,
  '"Não usar mais" guarda o estado de antes'
);
select is(
  (select row(state::text, unused_from::text)::text from app.stop_using_fact((select tone_fact from fx))),
  row('unused', 'confirmed')::text,
  'repetir devolve o mesmo estado'
);
select is(
  (select row(state::text, unused_from::text, version)::text from app.resume_using_fact((select tone_fact from fx))),
  row('confirmed', null, 1)::text,
  '"Voltar a usar" volta ao estado de antes, sem versão nova'
);
select is(
  (select state::text from app.stop_using_fact((select forbidden_fact from fx))),
  'unused',
  'decisão também sai de uso'
);
select is(
  (select state::text from app.resume_using_fact((select forbidden_fact from fx))),
  'decision',
  'e volta como decisão'
);
select is(
  (select state::text from app.resume_using_fact((select tone_fact from fx))),
  'confirmed',
  'voltar a usar o que já está em uso devolve o mesmo estado'
);

-- ---------------------------------------------------------------------------------------------------
-- Confirmar e continua valendo
-- ---------------------------------------------------------------------------------------------------

select is(
  (select state::text from app.confirm_fact((select id from ids where name = 'observed'))),
  'confirmed',
  '"Confirmar" do observado vira Confirmado'
);
select ok(
  (select confirmed_at is not null and confirmed_by = (select marina from fx) from public.brand_facts where id = (select id from ids where name = 'observed')),
  'com data e quem confirmou'
);
select throws_ok(
  format('select app.confirm_fact(%L)', (select forbidden_fact from fx)),
  '55000', 'Só um conhecimento da fonte ou observado se confirma aqui.', 'decisão não se confirma aqui'
);
select is(
  (select state::text from app.keep_fact((select id from ids where name = 'from_source'))),
  'from_source',
  '"Continua valendo" devolve o desatualizado a Da fonte'
);
select is(
  (select state::text from app.keep_fact((select id from ids where name = 'from_source'))),
  'from_source',
  'repetir devolve o mesmo estado'
);
select throws_ok(
  format('select app.keep_fact(%L)', (select tone_fact from fx)),
  '55000', 'Só um conhecimento desatualizado continua valendo.', 'confirmado não "continua valendo"'
);

-- ---------------------------------------------------------------------------------------------------
-- Adicionar conhecimento e marcar como vista
-- ---------------------------------------------------------------------------------------------------

insert into ids select 'added', id from app.add_fact(
  (select miolo from fx), 'business', 'História', 'Contado por você', ' Aos domingos a loja fecha às 13h '
);
select is(
  (select row(state::text, source_type::text, source_id = (select declared_source from fx), content, confirmed_by = (select marina from fx))::text
   from public.brand_facts where id = (select id from ids where name = 'added')),
  row('confirmed', 'correction', true, 'Aos domingos a loja fecha às 13h', true)::text,
  '"Adicionar conhecimento" entra declarado pelo dono, já confirmado'
);
select throws_ok(
  format('select app.add_fact(%L, %L, %L, %L, %L)', (select miolo from fx), 'brand', 'Tom de voz', 'X', '   '),
  '22023', 'O conhecimento não pode ficar vazio.', 'conhecimento vazio é recusado'
);
select is(
  (select state::text from app.mark_suggestion_seen((select seed_suggestion from fx))),
  'seen',
  'sugestão aberta fica vista'
);
select is(
  (select state::text from app.mark_suggestion_seen((select seed_suggestion from fx))),
  'seen',
  'repetir devolve o mesmo estado'
);
select is(
  (select row(state::text, decision::text)::text from app.confirm_suggestion((select seed_suggestion from fx))),
  row('done', 'confirm')::text,
  'vista ainda se decide'
);

-- ---------------------------------------------------------------------------------------------------
-- Descrição do negócio
-- ---------------------------------------------------------------------------------------------------

select is(
  (select description from app.set_brand_description((select miolo from fx), ' Padaria de fermentação natural, aberta em 2019. ')),
  'Padaria de fermentação natural, aberta em 2019.',
  'o dono escreve a descrição do negócio'
);
reset role;
select is(
  (select row(description, summary_agent_id::text)::text from app.set_brand_summary((select miolo from fx), 'Síntese do squad.', 'nexo')),
  row('Padaria de fermentação natural, aberta em 2019.', 'nexo')::text,
  'o agente escreve a síntese sem apagar a descrição'
);

-- ---------------------------------------------------------------------------------------------------
-- Só o owner e só a própria empresa
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select rafael from fx));
insert into ids select 'vitta_fact', id from app.add_fact((select vitta from fx), 'business', 'História', 'Contado por você', 'Estúdio de pilates');
select is((select count(*)::int from public.brand_profiles), 0, 'Rafael não vê o perfil da Miolo');
select pg_temp.act_as((select carla from fx));
select throws_ok(
  format('select app.stop_using_fact(%L)', (select id from ids where name = 'vitta_fact')),
  '42501', 'Só o dono da conta toma esta decisão.', 'Carla (editor) não tira de uso'
);
select throws_ok(
  format('select app.add_fact(%L, %L, %L, %L, %L)', (select vitta from fx), 'brand', 'Tom de voz', 'X', 'Leve'),
  '42501', 'Só o dono da conta toma esta decisão.', 'Carla não adiciona conhecimento'
);
select throws_ok(
  format('select app.set_brand_description(%L, %L)', (select vitta from fx), 'X'),
  '42501', 'Só o dono da conta toma esta decisão.', 'Carla não escreve a descrição'
);
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format('select app.stop_using_fact(%L)', (select id from ids where name = 'vitta_fact')),
  'P0002', 'Conhecimento não encontrado.', 'Marina não alcança conhecimento da Vitta'
);
select throws_ok(
  format('select app.add_fact(%L, %L, %L, %L, %L)', (select vitta from fx), 'brand', 'Tom de voz', 'X', 'Leve'),
  'P0002', 'Workspace não encontrado.', 'Marina não adiciona na Vitta'
);

-- ---------------------------------------------------------------------------------------------------
-- Busca sem acento
-- ---------------------------------------------------------------------------------------------------

reset role;
select is(
  (select count(*)::int from public.brand_facts
   where id = (select forbidden_fact from fx)
     and search_vector @@ websearch_to_tsquery(app.memory_search_config('pt-BR'), 'nao usar')),
  1,
  '"nao usar" acha "Não usar"'
);
select is(
  (select count(*)::int from public.brand_facts
   where id = (select id from ids where name = 'added')
     and search_vector @@ websearch_to_tsquery(app.memory_search_config('pt-BR'), 'domingo às')),
  1,
  'com ou sem acento, o conhecimento novo entra na busca'
);

select * from finish();
rollback;
