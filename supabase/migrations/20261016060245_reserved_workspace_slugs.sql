-- S0b (H0-04) — endereços (slugs) reservados: rotas fixas do web (/app/novo-workspace,
-- /app/<slug>/sala-do-squad…, /entrar, /criar-conta, /sair) e nomes que não podem virar endereço de
-- cliente. Lista única do backend. A recusa mora na tabela, como a regra de formato: vale para
-- app.create_workspace e para qualquer outra escrita, dentro ou fora da API. A API traduz a
-- constraint para 422 slug_reserved.
-- Para mudar a lista: na mesma migration, recrie a função e a constraint (o ADD revalida as linhas).

create function app.reserved_workspace_slugs()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'novo-workspace', 'sala-do-squad', 'squad', 'modo-autonomo', 'memoria-da-marca', 'equipe',
    'entrar', 'criar-conta', 'sair', 'api', 'app', 'admin', 'www', 'hellosquad'
  ]::text[]
$$;

-- A CHECK roda a função com o papel de quem escreve. Hoje só o dono das tabelas escreve em workspaces
-- (app.create_workspace é SECURITY DEFINER); papel que ganhar INSERT/UPDATE nela precisa de EXECUTE.
revoke all on function app.reserved_workspace_slugs() from public, anon, authenticated, service_role;

alter table public.workspaces
  add constraint workspaces_slug_not_reserved check (slug <> all (app.reserved_workspace_slugs()));
