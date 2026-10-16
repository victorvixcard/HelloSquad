# S0 — progresso (Stark)

Identidade, isolamento por tenant e API base. **Iniciada em 16/10/2026 00:14, fechada às 01:05.** Relatório: `docs/parciais/S0-relatorio.md`.

| # | Item | Estado |
|---|---|---|
| 1 | Migrations: `workspaces`, `memberships`, `invitations`, `audit_events`, schema `app` com funções auxiliares, RLS habilitada e forçada, papel `hellosquad_api`, `auto_expose_new_tables = false` | ✅ `supabase db reset` aplica as 4 migrations (exit 0); 4 tabelas com `relrowsecurity` e `relforcerowsecurity` = t; `hellosquad_api` sem INHERIT/BYPASSRLS, membro de `authenticated` só com SET |
| 2 | Seed idempotente (`make seed`): 3 workspaces e 5 usuários de `docs/DADOS_FICTICIOS.md` | ✅ `supabase/seed.sql` roda no `supabase db reset` ("Seeding data from supabase/seed.sql") e no `make seed`; duas execuções seguidas dão o mesmo estado (memberships sem `updated_at` alterado); login da Marina na Auth local → HTTP 200 |
| 3 | Testes pgTAP de RLS e isolamento (varredura de RLS, Marina, Pedro, Carla, Rafael, `audit_events` imutável) | ✅ `make test-db`: 7 arquivos, 98 testes, `Result: PASS`. Testes de mutação (quebrar a RLS numa cópia transacional) derrubam a suíte em todos os 7 casos |
| 4 | FastAPI: JWT (JWKS + fallback HS256), transação com `SET LOCAL ROLE authenticated`, `/me`, `/workspaces`, testes de integração | ✅ `make test-backend`: ruff ok, pytest 45 passed (23 unitários + 22 de integração com login real na Auth local); `curl` na API real: Marina vê só a Miolo, Pedro recebe `{"items":[]}`, token inválido → 401 |
| 5 | `make openapi` → `packages/contracts/openapi.json` | ✅ OpenAPI 3.1.0 com 5 rotas; rotas protegidas com `HTTPBearer`; erros 401/403/404/409/422/503 no envelope `ErrorResponse`; `tests/test_openapi.py` falha se o arquivo commitado ficar defasado |
| 6 | `docs/SETUP_LOCAL.md` e `docs/parciais/S0-relatorio.md` | ✅ do zero (`supabase db reset`) `make up && make migrate && make seed && make test` exit 0: pytest 45 passed, pgTAP 98 `PASS`; clone limpo do GitHub também exit 0 |

## Observações iniciais

- Supabase local no ar (11 containers `*_hellosquad`); a Auth local expõe JWKS com uma chave **ES256** (`/auth/v1/.well-known/jwks.json`), então o caminho principal de validação do JWT é o assimétrico.

- `auto_expose_new_tables = false` no `config.toml` só vale para banco recém-criado; o `supabase start` com backup não reaplica. Por isso a migration `20261016032548_default_privileges.sql` remove os GRANTs automáticos explicitamente (vale igual na nuvem).
- `ALTER DEFAULT PRIVILEGES ... IN SCHEMA x REVOKE EXECUTE ... FROM PUBLIC` não tem efeito (o EXECUTE de PUBLIC é padrão global). Cada função revoga PUBLIC explicitamente; o teste de varredura (item 3) falha se `anon` puder executar função de `public`/`app`.
- `log_statement = ddl` no Postgres local: senha em `ALTER ROLE` apareceria no log. A senha do `hellosquad_api` vai com hash SCRAM calculado no cliente.
- Teste rápido em transação desfeita: usuário sem membership vê 0 workspaces e 0 memberships; `anon` recebe `permission denied`; INSERT em `audit_events` como `authenticated` recebe `permission denied`; rebaixar o único owner falha com "O workspace precisa de pelo menos um owner.".

- Seed em SQL (inserção em `auth.users`/`auth.identities` com `crypt`), num único bloco `DO`: aplica tudo ou nada. O `make seed` reaplica o mesmo arquivo via `hellosquad-local-db` (Python), que também grava a senha do `hellosquad_api`. A ferramenta recusa `APP_ENV` fora de local/test e `DATABASE_URL` fora desta máquina.
- O token do usuário vem da Auth local em ES256 com `kid` do JWKS: `iss=http://127.0.0.1:56321/auth/v1`, `aud=authenticated`, `role=authenticated`, nome em `user_metadata.full_name`.
- Senha do `hellosquad_api`: o log do Postgres registra só `password 'SCRAM-SHA-256$…'`; busca pela senha em claro no log do container: 0 ocorrências.
- Depois de `supabase db reset` o papel volta sem senha: rodar `make seed` (ou `make migrate`).

- Mutações usadas para provar que os testes pegam regressão: política de leitura de workspaces `using (true)` (7 falhas); `NO FORCE ROW LEVEL SECURITY` em invitations (1); view sem `security_invoker` com GRANT (1); política de INSERT em memberships aceitando viewer (7); GRANT de UPDATE/DELETE em audit_events (5); leitura de convites liberada a qualquer membro (1, depois de acrescentar o caso no 04); `create_workspace` como SECURITY INVOKER (aborta o arquivo: 2 de 14).

- Pydantic: `to_lower` do `StringConstraints` roda depois do `pattern`; slug com maiúscula dava 422. Normalização movida para um `BeforeValidator` (teste de integração pegou).
- Limite local de login da Auth subiu de 30 para 300 por 5 min (`config.toml`): cada `make test` loga 5 usuários do seed.
- CORS só para `http://127.0.0.1:3100` e `http://localhost:3100` (configurável em `API_CORS_ORIGINS`), sem credenciais: a A0 chama a API do navegador com o token no cabeçalho.
- CI estacionado (`infra/github/workflows/ci.yml`) roda `pytest -m "not integration"`: o runner não tem Supabase.

## Próximo passo

Fatia fechada. Perguntas de produto no relatório (§6); A0 (Aranha) pode começar (notas na §7 do relatório).
