-- S0b (H0-04): endereço reservado não vira workspace, nem por app.create_workspace nem por escrita
-- direta do dono das tabelas. A lista vem de app.reserved_workspace_slugs(); o teste confere cada item.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

create temporary table fx as
select
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  app.reserved_workspace_slugs() as reserved;
grant select on fx to public;

select plan(7 + (select cardinality(reserved) from fx));

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

select ok((select pedro is not null from fx), 'seed presente (make seed)');

select is(
  (select reserved from fx),
  array[
    'novo-workspace', 'sala-do-squad', 'squad', 'modo-autonomo', 'memoria-da-marca', 'equipe',
    'entrar', 'criar-conta', 'sair', 'api', 'app', 'admin', 'www', 'hellosquad'
  ],
  'a lista de reservados é a combinada na H0-04'
);

select pg_temp.act_as((select pedro from fx));

select throws_ok(
  format('select app.create_workspace(%L, %L)', 'Reservado', slug),
  '23514',
  'new row for relation "workspaces" violates check constraint "workspaces_slug_not_reserved"',
  format('create_workspace recusa o reservado %s', slug)
)
from unnest((select reserved from fx)) as slug;

select throws_ok(
  $$select app.create_workspace('Reservado', '  Novo-Workspace ')$$,
  '23514',
  'new row for relation "workspaces" violates check constraint "workspaces_slug_not_reserved"',
  'maiúscula e espaço não escapam: a função normaliza antes de gravar'
);
select lives_ok(
  $$select app.create_workspace('Equipe Azul', 'equipe-azul')$$,
  'só o endereço exato é reservado: equipe-azul passa'
);

reset role;

select throws_ok(
  $$insert into public.workspaces (slug, name) values ('admin', 'Admin')$$,
  '23514',
  'new row for relation "workspaces" violates check constraint "workspaces_slug_not_reserved"',
  'nem o dono das tabelas grava endereço reservado (a regra vale fora da API)'
);
select throws_ok(
  $$update public.workspaces set slug = 'entrar' where slug = 'miolo'$$,
  '23514',
  'new row for relation "workspaces" violates check constraint "workspaces_slug_not_reserved"',
  'nem renomeando um workspace existente'
);
select is(
  (select count(*) from public.workspaces where slug in (select unnest(reserved) from fx)),
  0::bigint,
  'nenhum endereço reservado ficou gravado'
);

select * from finish();
rollback;
