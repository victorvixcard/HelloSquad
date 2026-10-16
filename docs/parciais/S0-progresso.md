# S0 — progresso (Stark)

Identidade, isolamento por tenant e API base. **Iniciada em 16/10/2026 00:14.** Relatório ao fechar: `docs/parciais/S0-relatorio.md`.

| # | Item | Estado |
|---|---|---|
| 1 | Migrations: `workspaces`, `memberships`, `invitations`, `audit_events`, schema `app` com funções auxiliares, RLS habilitada e forçada, papel `hellosquad_api`, `auto_expose_new_tables = false` | ✅ `supabase db reset` aplica as 4 migrations (exit 0); 4 tabelas com `relrowsecurity` e `relforcerowsecurity` = t; `hellosquad_api` sem INHERIT/BYPASSRLS, membro de `authenticated` só com SET |
| 2 | Seed idempotente (`make seed`): 3 workspaces e 5 usuários de `docs/DADOS_FICTICIOS.md` | ⏳ em andamento |
| 3 | Testes pgTAP de RLS e isolamento (varredura de RLS, Marina, Pedro, Carla, Rafael, `audit_events` imutável) | ⚪ |
| 4 | FastAPI: JWT (JWKS + fallback HS256), transação com `SET LOCAL ROLE authenticated`, `/me`, `/workspaces`, testes de integração | ⚪ |
| 5 | `make openapi` → `packages/contracts/openapi.json` | ⚪ |
| 6 | `docs/SETUP_LOCAL.md` e `docs/parciais/S0-relatorio.md` | ⚪ |

## Observações iniciais

- Supabase local no ar (11 containers `*_hellosquad`); a Auth local expõe JWKS com uma chave **ES256** (`/auth/v1/.well-known/jwks.json`), então o caminho principal de validação do JWT é o assimétrico.

- `auto_expose_new_tables = false` no `config.toml` só vale para banco recém-criado; o `supabase start` com backup não reaplica. Por isso a migration `20261016032548_default_privileges.sql` remove os GRANTs automáticos explicitamente (vale igual na nuvem).
- `ALTER DEFAULT PRIVILEGES ... IN SCHEMA x REVOKE EXECUTE ... FROM PUBLIC` não tem efeito (o EXECUTE de PUBLIC é padrão global). Cada função revoga PUBLIC explicitamente; o teste de varredura (item 3) falha se `anon` puder executar função de `public`/`app`.
- `log_statement = ddl` no Postgres local: senha em `ALTER ROLE` apareceria no log. A senha do `hellosquad_api` vai com hash SCRAM calculado no cliente.
- Teste rápido em transação desfeita: usuário sem membership vê 0 workspaces e 0 memberships; `anon` recebe `permission denied`; INSERT em `audit_events` como `authenticated` recebe `permission denied`; rebaixar o único owner falha com "O workspace precisa de pelo menos um owner.".

## Próximo passo

Seed idempotente (item 2).
