-- S0 (d, e): só owner/admin gerenciam memberships; o que envolve owner exige owner; o workspace
-- nunca fica sem owner. Usuários do seed (make seed).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(21);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'juliana@trilha.example') as juliana,
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

-- Linhas afetadas por um UPDATE/DELETE: a RLS filtra em silêncio o que o papel não pode tocar.
create function pg_temp.affected(p_sql text) returns bigint
language plpgsql as $$
declare
  v_rows bigint;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

select ok(
  (select num_nonnulls(marina, rafael, carla, juliana, pedro, miolo, vitta) = 7 from fx),
  'seed presente (make seed)'
);

-- (d) Carla é editor da Vitta: não administra
select pg_temp.act_as((select carla from fx));

select throws_ok(
  $$insert into public.memberships (workspace_id, user_id, role)
    values ((select vitta from fx), (select pedro from fx), 'viewer')$$,
  '42501',
  'new row violates row-level security policy for table "memberships"',
  'Carla (editor) não insere membership na Vitta'
);
select is(
  pg_temp.affected($$update public.memberships set role = 'admin' where user_id = (select carla from fx)$$),
  0::bigint,
  'Carla (editor) não se promove'
);
select is(
  pg_temp.affected($$delete from public.memberships where workspace_id = (select vitta from fx)$$),
  0::bigint,
  'Carla (editor) não remove memberships'
);

-- (e) Rafael é owner da Vitta: administra
select pg_temp.act_as((select rafael from fx));

select lives_ok(
  $$insert into public.memberships (workspace_id, user_id, role)
    values ((select vitta from fx), (select pedro from fx), 'viewer')$$,
  'Rafael (owner) insere membership na Vitta'
);
select is(
  (select role from public.memberships where workspace_id = (select vitta from fx) and user_id = (select pedro from fx)),
  'viewer'::public.workspace_role,
  'o membership novo aparece para o Rafael'
);
select throws_ok(
  $$update public.memberships set user_id = (select juliana from fx) where user_id = (select pedro from fx)$$,
  '42501',
  'permission denied for table memberships',
  'UPDATE só muda o papel (user_id e workspace_id não têm GRANT)'
);
select is(
  pg_temp.affected($$update public.memberships set role = 'admin' where user_id = (select carla from fx)$$),
  1::bigint,
  'Rafael (owner) promove a Carla a admin'
);

-- Marina (owner da Miolo) não administra a Vitta
select pg_temp.act_as((select marina from fx));

select throws_ok(
  $$insert into public.memberships (workspace_id, user_id, role)
    values ((select vitta from fx), (select juliana from fx), 'viewer')$$,
  '42501',
  'new row violates row-level security policy for table "memberships"',
  'Marina (owner de outro workspace) não insere membership na Vitta'
);
select is(
  pg_temp.affected($$delete from public.memberships where workspace_id = (select vitta from fx)$$),
  0::bigint,
  'Marina não remove memberships da Vitta'
);

-- Carla agora é admin: gerencia quem não é owner, mas não cria nem toca owner
select pg_temp.act_as((select carla from fx));

select lives_ok(
  $$insert into public.memberships (workspace_id, user_id, role)
    values ((select vitta from fx), (select juliana from fx), 'editor')$$,
  'Carla (admin) insere editor na Vitta'
);
select throws_ok(
  $$insert into public.memberships (workspace_id, user_id, role)
    values ((select vitta from fx), (select marina from fx), 'owner')$$,
  '42501',
  'new row violates row-level security policy for table "memberships"',
  'Carla (admin) não cria owner'
);
select throws_ok(
  $$update public.memberships set role = 'owner' where user_id = (select pedro from fx)$$,
  '42501',
  'new row violates row-level security policy for table "memberships"',
  'Carla (admin) não promove ninguém a owner'
);
select is(
  pg_temp.affected($$update public.memberships set role = 'viewer' where user_id = (select rafael from fx)$$),
  0::bigint,
  'Carla (admin) não rebaixa o owner'
);
select is(
  pg_temp.affected($$delete from public.memberships where user_id = (select rafael from fx)$$),
  0::bigint,
  'Carla (admin) não remove o owner'
);
select is(
  pg_temp.affected($$delete from public.memberships where user_id = (select juliana from fx)$$),
  1::bigint,
  'Carla (admin) remove um editor'
);

-- O workspace nunca fica sem owner
select pg_temp.act_as((select rafael from fx));

select throws_ok(
  $$update public.memberships set role = 'admin' where user_id = (select rafael from fx)$$,
  '23514',
  'O workspace precisa de pelo menos um owner.',
  'o único owner não se rebaixa'
);
select throws_ok(
  $$delete from public.memberships where user_id = (select rafael from fx)$$,
  '23514',
  'O workspace precisa de pelo menos um owner.',
  'o único owner não se remove'
);
select is(
  pg_temp.affected($$update public.memberships set role = 'owner' where user_id = (select pedro from fx)$$),
  1::bigint,
  'Rafael (owner) promove o Pedro a owner'
);
select is(
  pg_temp.affected($$update public.memberships set role = 'admin' where user_id = (select rafael from fx)$$),
  1::bigint,
  'com outro owner, Rafael pode se rebaixar'
);

-- Remoção em cascata do workspace não é barrada pela regra do owner
reset role;
insert into public.workspaces (slug, name) values ('cascata-de-teste', 'Cascata de teste');
insert into public.memberships (workspace_id, user_id, role)
select id, (select pedro from fx), 'owner' from public.workspaces where slug = 'cascata-de-teste';
select lives_ok(
  $$delete from public.workspaces where slug = 'cascata-de-teste'$$,
  'apagar o workspace leva os memberships em cascata, inclusive o do único owner'
);

select * from finish();
rollback;
