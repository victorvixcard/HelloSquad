-- S0: app.create_workspace cria workspace + membership owner + evento de auditoria na mesma
-- transação; é o único caminho de criação para authenticated.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(14);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('role', 'authenticated', true);
end;
$$;

select ok((select num_nonnulls(marina, pedro) = 2 from fx), 'seed presente (make seed)');

select pg_temp.act_as((select pedro from fx));

select throws_ok(
  $$insert into public.workspaces (slug, name) values ('direto', 'Direto')$$,
  '42501', 'permission denied for table workspaces', 'authenticated não insere workspace direto'
);
select results_eq(
  $$select slug, name, created_by from app.create_workspace('  Padaria do Pedro  ', ' Padaria-do-Pedro ')$$,
  $$select 'padaria-do-pedro'::text, 'Padaria do Pedro'::text, pedro from fx$$,
  'Pedro cria um workspace (nome e slug normalizados)'
);
select results_eq(
  'select slug from public.workspaces',
  $$values ('padaria-do-pedro')$$,
  'Pedro passa a ver o workspace novo'
);
select results_eq(
  'select user_id, role from public.memberships',
  $$select pedro, 'owner'::public.workspace_role from fx$$,
  'Pedro vira owner do workspace novo'
);
select is(app.has_role((select id from public.workspaces where slug = 'padaria-do-pedro'), 'owner'), true, 'has_role reconhece o owner');
select throws_ok(
  $$select app.create_workspace('Outra Miolo', 'miolo')$$,
  '23505', null, 'slug já usado é recusado'
);
select throws_ok(
  $$select app.create_workspace('Slug ruim', 'slug com espaço')$$,
  '23514', null, 'slug fora do formato é recusado'
);
select throws_ok(
  $$select app.create_workspace('   ', 'nome-vazio')$$,
  '23514', null, 'nome vazio é recusado'
);

select pg_temp.act_as((select marina from fx));

select results_eq(
  'select slug from public.workspaces order by slug',
  $$values ('miolo')$$,
  'Marina continua vendo só a Miolo'
);

select pg_temp.act_as(null);

select throws_ok(
  $$select app.create_workspace('Sem dono', 'sem-dono')$$,
  '42501', 'Usuário não autenticado.', 'sem sub no JWT não cria workspace'
);

reset role;
set local role anon;

select throws_ok(
  $$select app.create_workspace('Anônimo', 'anonimo')$$,
  '42501', 'permission denied for schema app', 'anon não executa create_workspace (nem enxerga o schema app)'
);

reset role;

select results_eq(
  $$select a.actor_type::text, a.actor_id, a.action, a.entity_type, a.entity_id, a.payload ->> 'slug'
    from public.audit_events a
    join public.workspaces w on w.id = a.workspace_id
    where w.slug = 'padaria-do-pedro'$$,
  $$select 'user', pedro::text, 'workspace.created', 'workspace',
           (select id::text from public.workspaces where slug = 'padaria-do-pedro'), 'padaria-do-pedro'
    from fx$$,
  'a criação fica registrada em audit_events com o Pedro como ator'
);
select is(
  (select count(*) from public.workspaces where slug in ('sem-dono', 'anonimo', 'slug com espaço', 'nome-vazio', 'direto')),
  0::bigint,
  'tentativas recusadas não deixam workspace para trás'
);

select * from finish();
rollback;
