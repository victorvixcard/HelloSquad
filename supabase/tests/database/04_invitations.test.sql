-- S0: convites. Só owner/admin leem e criam; convite de owner exige owner; o token é guardado só
-- como hash; quem convida é sempre o usuário do JWT.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(14);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
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

create function pg_temp.invite_sql(p_email text, p_role text) returns text
language sql as $$
  select format(
    $f$insert into public.invitations (workspace_id, email, role, token_hash, expires_at)
       values ((select vitta from fx), %L, %L, encode(sha256(%L::bytea), 'hex'), now() + interval '7 days')$f$,
    p_email, p_role, 'token-' || p_email
  )
$$;

select ok((select num_nonnulls(marina, rafael, carla, vitta) = 4 from fx), 'seed presente (make seed)');

select pg_temp.act_as((select carla from fx));

select throws_ok(
  pg_temp.invite_sql('novo@vitta.example', 'viewer'),
  '42501',
  'new row violates row-level security policy for table "invitations"',
  'Carla (editor) não convida'
);

select pg_temp.act_as((select rafael from fx));

select lives_ok(pg_temp.invite_sql('novo@vitta.example', 'editor'), 'Rafael (owner) convida um editor');
select is(
  (select invited_by from public.invitations where email = 'novo@vitta.example'),
  (select rafael from fx),
  'invited_by vem do JWT de quem convida'
);
select throws_ok(
  $$insert into public.invitations (workspace_id, email, role, token_hash, expires_at, invited_by)
    values ((select vitta from fx), 'outro@vitta.example', 'viewer', repeat('a', 64), now() + interval '1 day',
            (select carla from fx))$$,
  '42501',
  'permission denied for table invitations',
  'ninguém grava invited_by de outro usuário'
);
select throws_ok(
  $$update public.invitations set accepted_at = now() where email = 'novo@vitta.example'$$,
  '42501',
  'permission denied for table invitations',
  'aceite não é feito por UPDATE direto'
);
select throws_ok(
  $$insert into public.invitations (workspace_id, email, role, token_hash, expires_at)
    values ((select vitta from fx), 'cru@vitta.example', 'viewer', 'token-em-claro', now() + interval '1 day')$$,
  '23514',
  null,
  'token em claro é rejeitado (só hash SHA-256 em hex)'
);
select lives_ok(pg_temp.invite_sql('socia@vitta.example', 'owner'), 'Rafael (owner) convida um owner');

select pg_temp.act_as((select carla from fx));

select is_empty('select 1 from public.invitations', 'Carla (editor) não vê os convites da Vitta');

select pg_temp.act_as((select marina from fx));

select is_empty('select 1 from public.invitations', 'Marina não vê os convites da Vitta');

-- Carla promovida a admin: gerencia convites que não são de owner
reset role;
update public.memberships set role = 'admin'
where workspace_id = (select vitta from fx) and user_id = (select carla from fx);
select pg_temp.act_as((select carla from fx));

select is(
  (select count(*) from public.invitations),
  2::bigint,
  'Carla (admin) vê os convites da Vitta'
);
select throws_ok(
  pg_temp.invite_sql('outra-socia@vitta.example', 'owner'),
  '42501',
  'new row violates row-level security policy for table "invitations"',
  'Carla (admin) não convida owner'
);
select is(
  pg_temp.affected($$delete from public.invitations where email = 'socia@vitta.example'$$),
  0::bigint,
  'Carla (admin) não revoga convite de owner'
);
select is(
  pg_temp.affected($$delete from public.invitations where email = 'novo@vitta.example'$$),
  1::bigint,
  'Carla (admin) revoga convite de editor'
);

reset role;
select * from finish();
rollback;
