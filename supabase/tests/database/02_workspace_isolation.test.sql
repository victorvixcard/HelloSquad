-- S0 (b, c): isolamento entre tenants com os usuários do seed (make seed).
-- Marina vê a Miolo e não vê Vitta nem Trilha; Pedro, autenticado e sem membership, não vê nada.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(22);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
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

select ok(
  (select num_nonnulls(marina, rafael, carla, pedro, miolo, vitta, trilha) = 7 from fx),
  'seed presente (make seed)'
);
select is(
  (select count(*) from public.memberships where user_id = (select pedro from fx)),
  0::bigint,
  'pré-condição: Pedro sem membership (make seed devolve esse estado)'
);

insert into public.invitations (workspace_id, email, role, token_hash, expires_at)
select vitta, 'convidada@vitta.example', 'viewer', encode(sha256('convite-de-teste'::bytea), 'hex'), now() + interval '7 days'
from fx;

-- Marina (owner da Miolo)
select pg_temp.act_as((select marina from fx));

select results_eq(
  'select slug from public.workspaces order by slug',
  $$values ('miolo')$$,
  'Marina vê só a Miolo'
);
select is_empty(
  'select 1 from public.workspaces where id = (select vitta from fx)',
  'Marina não vê a Vitta nem pelo id'
);
select is_empty(
  'select 1 from public.workspaces where id = (select trilha from fx)',
  'Marina não vê a Trilha nem pelo id'
);
select results_eq(
  'select workspace_id, user_id from public.memberships',
  'select miolo, marina from fx',
  'Marina vê só o membership da Miolo'
);
select is_empty('select 1 from public.invitations', 'Marina não vê convites de outro workspace');
select is(app.has_role((select vitta from fx), 'viewer'), false, 'Marina não tem papel na Vitta');

-- Pedro (sem membership)
select pg_temp.act_as((select pedro from fx));

select is_empty('select 1 from public.workspaces', 'Pedro não vê nenhum workspace');
select is_empty('select 1 from public.memberships', 'Pedro não vê nenhum membership');
select is_empty('select 1 from public.invitations', 'Pedro não vê nenhum convite');
select is_empty('select app.current_user_workspace_ids()', 'Pedro não tem workspace');

-- Carla (editor da Vitta) e Rafael (owner da Vitta)
select pg_temp.act_as((select carla from fx));

select results_eq(
  'select slug from public.workspaces order by slug',
  $$values ('vitta')$$,
  'Carla vê só a Vitta'
);
select results_eq(
  'select user_id from public.memberships order by user_id',
  'select unnest(array[rafael, carla]) as user_id from fx order by 1',
  'Carla vê os dois memberships da Vitta'
);
select is_empty('select 1 from public.invitations', 'Carla (editor) não vê os convites da Vitta');

select pg_temp.act_as((select rafael from fx));

select results_eq(
  'select email from public.invitations',
  $$values ('convidada@vitta.example')$$,
  'Rafael (owner) vê o convite da Vitta'
);

-- Workspace excluído (deleted_at preenchido) some para os membros
reset role;
update public.workspaces set deleted_at = now() where id = (select vitta from fx);
select pg_temp.act_as((select rafael from fx));

select is_empty('select 1 from public.workspaces', 'Vitta excluída some para o Rafael');
select is_empty('select 1 from public.memberships', 'memberships da Vitta excluída somem');
select is(app.has_role((select vitta from fx), 'owner'), false, 'owner não administra workspace excluído');

-- Sem claims e anon
select pg_temp.act_as(null);

select is_empty('select 1 from public.workspaces', 'authenticated sem sub não vê nada');

reset role;
set local role anon;

select throws_ok(
  'select 1 from public.workspaces',
  '42501',
  'permission denied for table workspaces',
  'anon não lê workspaces'
);
select throws_ok(
  'select 1 from public.memberships',
  '42501',
  'permission denied for table memberships',
  'anon não lê memberships'
);

reset role;
select * from finish();
rollback;
