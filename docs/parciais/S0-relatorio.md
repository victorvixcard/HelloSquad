# S0 — Relatório de fechamento (Stark)

**Fatia:** S0, identidade, isolamento por tenant e API base. **Data:** 16/10/2026. **Estado:** entregue. Pendências externas: ativação do CI (escopo `workflow` do token, herdada da J0) e as perguntas de produto da §6.

Chaves locais foram mascaradas nas saídas abaixo, mesmo sendo as padrão do Supabase CLI.

## 1. O que foi entregue

| # | Item | Onde | Estado |
|---|---|---|---|
| 1 | Migrations: privilégios padrão (`auto_expose_new_tables = false` como código), identidade (`workspaces`, `memberships`, `invitations`, `audit_events`, enums, `updated_at` com trigger, schema `app` com `current_user_workspace_ids`, `has_role`, `create_workspace`, regra do último owner, RLS habilitada e forçada, políticas e GRANTs mínimos) e papel `hellosquad_api` | `supabase/migrations/20261016032548_default_privileges.sql`, `20261016032550_identity.sql`, `20261016032552_api_role.sql`, `supabase/config.toml` | ✅ |
| 2 | Seed idempotente dos 3 workspaces e 5 usuários de `DADOS_FICTICIOS.md`, direto em `auth.users`/`auth.identities` com `crypt`; roda no `supabase db reset` e no `make seed` | `supabase/seed.sql`, `apps/backend/src/hellosquad/local_db.py` (`hellosquad-local-db`), `Makefile` | ✅ |
| 3 | Testes pgTAP: varredura do schema (a), isolamento Marina/Pedro (b, c), papéis Carla/Rafael (d, e), auditoria imutável (f), convites e `create_workspace` | `supabase/tests/database/01` a `06_*.test.sql` | ✅ 98 testes |
| 4 | FastAPI: validação do JWT (JWKS ES256/RS256, fallback HS256 por configuração), pool do `hellosquad_api` com transação como `authenticated`, `GET /me`, `GET /workspaces`, `POST /workspaces`, `GET /workspaces/{id}`, erros padronizados em português, CORS do web local; testes unitários e de integração | `apps/backend/src/hellosquad/{auth,db,config}.py`, `api/{main,deps,errors}.py`, `identity/{routes,schemas}.py`, `apps/backend/tests/` | ✅ 45 testes (23 unitários, 22 de integração) |
| 5 | `make openapi` → contrato OpenAPI 3.1.0 commitado; teste falha se ficar defasado | `packages/contracts/openapi.json`, `apps/backend/src/hellosquad/api/openapi.py`, `tests/test_openapi.py` | ✅ |
| 6 | Guia local (seed, papel da API, variáveis novas, JWT de teste), este relatório e o progresso | `docs/SETUP_LOCAL.md`, `.env.example`, `docs/parciais/S0-relatorio.md`, `docs/parciais/S0-progresso.md` | ✅ |

Commits, todos no `origin/main`: `413a355`, `ec27152`, `4a6a7af`, `f6912a9`, `c484db8`, `24d2e7c`, `847f90d`, `dfb1e8a`, `8fa096c` e o commit deste relatório. Ajuste fora do meu diretório: `infra/github/workflows/ci.yml` passou a rodar `pytest -m "not integration"` (o runner não tem Supabase).

## 2. Como foi verificado

### 2.1 Do zero: `supabase db reset`, depois `make up && make migrate && make seed && make test` (16/10, 00:59), exit 0

O reset recriou o banco e aplicou as 4 migrations e o seed (`Seeding data from supabase/seed.sql...`). Saída completa da sequência pedida; só a linha do JSON de status do `supabase start` foi cortada e mascarada:

```text
pnpm install --frozen-lockfile
Scope: all 2 workspace projects
✓ Lockfile passes supply-chain policies (verified 59m ago)
Lockfile is up to date, resolution step is skipped
Done in 21ms using pnpm v12.11.2
cd apps/backend && uv sync --locked
Resolved 41 packages in 0.71ms
Checked 39 packages in 0.22ms
pnpm exec supabase start
Stopped services: [supabase_imgproxy_hellosquad supabase_edge_runtime_hellosquad supabase_pooler_hellosquad]
{"DB_URL":"postgresql://postgres:postgres@127.0.0.1:56322/postgres","API_URL":"http://127.0.0.1:56321","REST_URL":"http: … "PUBLISHABLE_KEY":"[mascarado]","SECRET_KEY":"[mascarado]", … (JSON do status cortado)}
make --no-print-directory migrate
pnpm exec supabase migration up --local
Connecting to local database...
{"applied":[],"message":"Migrations applied"}
cd apps/backend && uv run hellosquad-local-db roles
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
Supabase local no ar. Chaves locais: pnpm exec supabase status -o env (PUBLISHABLE_KEY e SECRET_KEY vão para o .env).
pnpm exec supabase migration up --local
Connecting to local database...
{"applied":[],"message":"Migrations applied"}
cd apps/backend && uv run hellosquad-local-db roles
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
cd apps/backend && uv run hellosquad-local-db seed ../../supabase/seed.sql
  miolo    owner           marina@miolo.example
  trilha   owner           juliana@trilha.example
  vitta    editor          carla@vitta.example
  vitta    owner           rafael@vitta.example
  -        sem membership  pedro@semconta.example
seed aplicado: ../../supabase/seed.sql
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
cd apps/backend && uv run ruff check . && uv run ruff format --check . && uv run pytest
All checks passed!
23 files already formatted
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.1.1, pluggy-1.7.0
rootdir: /home/vitao/projetos/hellosquad/apps/backend
configfile: pyproject.toml
testpaths: tests
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collected 45 items

tests/test_auth.py ....................                                  [ 44%]
tests/test_health.py ..                                                  [ 48%]
tests/test_identity_api.py ......................                        [ 97%]
tests/test_openapi.py .                                                  [100%]

============================== 45 passed in 0.88s ==============================
pnpm --filter web lint
$ eslint
pnpm --filter web typecheck
$ tsc --noEmit
pnpm exec supabase test db
Connecting to local database...
/home/vitao/projetos/hellosquad/supabase/tests/database/00_extensions.test.sql ............. ok
/home/vitao/projetos/hellosquad/supabase/tests/database/01_rls_coverage.test.sql ........... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/02_workspace_isolation.test.sql .... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/03_membership_management.test.sql .. ok
/home/vitao/projetos/hellosquad/supabase/tests/database/04_invitations.test.sql ............ ok
/home/vitao/projetos/hellosquad/supabase/tests/database/05_audit_events.test.sql ........... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/06_create_workspace.test.sql ....... ok
All tests successful.
Files=7, Tests=98,  0 wallclock secs ( 0.03 usr  0.01 sys +  0.03 cusr  0.02 csys =  0.09 CPU)
Result: PASS
FINAL exit=0
```

### 2.2 Clone limpo do GitHub, exit 0

`git clone` em `/tmp` no commit `dfb1e8a`, `.env` copiado, a mesma sequência `make up && make migrate && make seed && make test`: ruff `All checks passed!`, pytest `44 passed`, pgTAP `Files=7, Tests=98`, `Result: PASS`. Nada depende de arquivo local fora do `.env`. O clone foi apagado em seguida (tinha cópia do `.env`). O único commit de código depois dele (`8fa096c`) só acrescenta um teste, que está na rodada da §2.1.

### 2.3 API real (`make dev-api`, porta 8100) com JWT da Auth local

JWT obtido com o trecho de `docs/SETUP_LOCAL.md` ("JWT de teste e chamadas à API"), o que também confere a documentação. Rodado depois da §2.1:

```text
$ curl -s http://127.0.0.1:8100/health
{"status":"ok","version":"0.1.0","environment":"local"}  [HTTP 200]

$ curl -s http://127.0.0.1:8100/me -H "Authorization: Bearer $JWT_MARINA"
{"user":{"id":"64f7a1f3-ceec-49b6-8595-e406252e01c2","email":"marina@miolo.example","full_name":"Marina Costa"},"memberships":[{"workspace":{"id":"c0be810a-49e3-44ce-a2ac-ae5942dedf4c","slug":"miolo","name":"Miolo"},"role":"owner"}]}  [HTTP 200]

$ curl -s http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT_MARINA"
{"items":[{"id":"c0be810a-49e3-44ce-a2ac-ae5942dedf4c","slug":"miolo","name":"Miolo","role":"owner","created_at":"2026-10-16T03:59:21.050845Z"}]}  [HTTP 200]

$ curl -s http://127.0.0.1:8100/me -H "Authorization: Bearer $JWT_PEDRO"
{"user":{"id":"7fcc028e-1227-4e37-910d-42347744a760","email":"pedro@semconta.example","full_name":"Pedro Teste"},"memberships":[]}  [HTTP 200]

$ curl -s http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT_PEDRO"
{"items":[]}  [HTTP 200]

$ curl -s http://127.0.0.1:8100/workspaces/<id da Vitta> -H "Authorization: Bearer $JWT_MARINA"
{"error":{"code":"workspace_not_found","message":"Workspace não encontrado.","details":[]}}  [HTTP 404]

$ curl -s http://127.0.0.1:8100/workspaces -H "Authorization: Bearer token-invalido"
{"error":{"code":"invalid_token","message":"Token de acesso inválido ou expirado. Faça login de novo.","details":[]}}  [HTTP 401]
```

Os ids mudam a cada `db reset` (o seed resolve tudo por e-mail e slug). Sem token, `GET /me` responde 401 `not_authenticated` com `WWW-Authenticate: Bearer`.

### 2.4 Os testes pegam regressão (mutação)

Cada mutação foi aplicada numa cópia do arquivo de teste, dentro da transação dele (desfeita no fim), rodada no psql do container:

| Mutação | Resultado |
|---|---|
| Política de leitura de `workspaces` com `using (true)` | 7 falhas no 02 (Marina vê Vitta e Trilha, Pedro vê tudo) |
| `NO FORCE ROW LEVEL SECURITY` em `invitations` | 1 falha no 01 (varredura) |
| View `public.vaza` sem `security_invoker`, com GRANT para `authenticated` | 1 falha no 01 |
| Política de INSERT em `memberships` aceitando viewer | 7 falhas no 03 |
| `GRANT UPDATE, DELETE` em `audit_events` para `authenticated` | 5 falhas no 05 |
| Leitura de convites liberada a qualquer membro | 1 falha no 04 (o caso foi acrescentado no 04 depois que esta mutação só era pega no 02) |
| `create_workspace` como `SECURITY INVOKER` | arquivo 06 aborta: 2 de 14 testes, plano quebrado |

Na integração, um teste pegou bug real: slug com maiúscula recebia 422 porque o `to_lower` do `StringConstraints` do Pydantic roda depois do `pattern`. Corrigido com `BeforeValidator`.

### 2.5 Segredo e senha

- Log do Postgres (`log_statement = ddl`), depois da rodada final: as 3 execuções de `ALTER ROLE "hellosquad_api"` registradas mostram só `password 'SCRAM-SHA-256$4096…'`. Busca pela senha em claro no log do container: 0 ocorrências.
- Varredura dos arquivos versionados (`git grep`) pela senha do papel, pela secret key e pela publishable key do `.env`, por JWT (`eyJ…`), por `sb_secret_`/`sb_publishable_` com valor, pelo JWT secret padrão do CLI e por `sk-ant-`: 0 ocorrências em todos. `git check-ignore -v .env` → `.gitignore:2:.env`.
- O `seed.sql` recusa banco com usuário de e-mail fora de `.example` (testado: `ERROR: Seed fictício recusado...`), e o `hellosquad-local-db` recusa `APP_ENV` fora de local/test e `DATABASE_URL` fora desta máquina.

### 2.6 Estado do banco e dos containers depois dos testes

- Banco no estado do seed: 3 workspaces, 4 memberships, 0 convites, 0 eventos de auditoria, Pedro com 0 memberships. Os testes de integração apagam o que criam.
- `docker ps`: 46 containers, 11 `*_hellosquad` e 35 de outros projetos, a mesma contagem do início. Reiniciei só o Supabase do HelloSquad (`supabase stop`/`start` no projeto, duas vezes, para aplicar mudanças do `config.toml`) e rodei `supabase db reset` quatro vezes no banco local dele.

## 3. Como o isolamento funciona

- **Banco.** Toda tabela de `public` tem RLS habilitada e forçada. `authenticated` tem só: SELECT em `workspaces`; SELECT/DELETE, INSERT (`workspace_id`, `user_id`, `role`) e UPDATE (`role`) em `memberships`; SELECT/DELETE e INSERT (`workspace_id`, `email`, `role`, `token_hash`, `expires_at`) em `invitations`; nada em `audit_events`. `anon` e `service_role` não têm nada. Workspace só nasce por `app.create_workspace`.
- **Políticas.** Membro lê o workspace e os memberships dele (`app.current_user_workspace_ids()`); convites só owner/admin leem. INSERT/UPDATE/DELETE em memberships e convites exigem admin, e o que envolve o papel owner exige owner. Workspace com `deleted_at` some para os membros e deixa de ser administrável.
- **API.** Conecta como `hellosquad_api` (sem INHERIT, sem BYPASSRLS, membro de `authenticated` só com SET). Cada rota abre uma transação, faz `set_config('role', 'authenticated', true)` e grava os claims do JWT validado em `request.jwt.claims` e `request.jwt.claim.sub`; tudo some no fim da transação. Teste de integração confirma que, dentro da API, `current_user = authenticated`, `session_user = hellosquad_api` e Marina enxerga só a Miolo sem nenhum filtro na consulta. Outro confirma que a conexão devolvida ao pool volta sem claims.
- **Data API (PostgREST).** As mesmas regras valem lá: Carla recebe 403 (`42501`) ao inserir membership pela `/rest/v1`, e Rafael recebe 201.

## 4. Decisões tomadas e onde divergi do briefing

1. **Caminho do JWT usado hoje no local: JWKS, ES256.** A Auth local publica uma chave EC P-256 em `/auth/v1/.well-known/jwks.json` e assina os tokens de usuário com ela (`alg: ES256`, `kid` do JWKS, `iss: http://127.0.0.1:56321/auth/v1`, `aud: authenticated`). O fallback HS256 existe atrás de `AUTH_JWT_ALGORITHMS=HS256` + `SUPABASE_JWT_SECRET` e é testado com token forjado. O caminho JWKS também tem teste unitário com token forjado (chave EC gerada no teste e JWKS falso). A origem da chave depende da família do algoritmo, então um token HS256 nunca é conferido contra chave do JWKS. Se o JWKS não responder, a API devolve 503, não 401.
2. **Senha do `hellosquad_api`.** A migration cria o papel sem senha. `make migrate` (também chamado por `make up`) e `make seed` leem a senha de `API_DATABASE_URL` no `.env` e gravam com hash SCRAM calculado no cliente, porque `log_statement = ddl` poria a senha em claro no log. Não usei `current_setting` na migration: o CLI não tem como injetar o valor. A ferramenta recusa URL de outro papel, para nunca trocar a senha do `postgres` por engano. Depois de `supabase db reset` o papel volta sem senha: `make seed` resolve.
3. **`SET LOCAL` na API por `set_config(..., true)`.** É a forma parametrizável do `SET LOCAL` (a mesma que o PostgREST usa) e vai numa ida ao banco só. Nos testes pgTAP usei o `set local role authenticated` literal.
4. **`auto_expose_new_tables = false` no `config.toml` e também em migration.** O CLI só aplica a opção ao criar o banco, e a nuvem não lê o `config.toml`. A migration remove os GRANTs automáticos de `anon`, `authenticated` e `service_role` em objetos novos de `public`. O EXECUTE de PUBLIC em funções não sai por schema no Postgres; cada função revoga PUBLIC, e a varredura (01) falha se `anon` puder executar função de `public` ou `app`.
5. **Admin não promove a owner, não cria owner, não mexe em owner.** O briefing diz "owner/admin gerenciam memberships". Sem essa restrição, um admin se promovia e tirava o owner. Também vale para convites de owner.
6. **Regra do último owner (fora do briefing; peço confirmação).** Trigger impede rebaixar ou remover o único owner (`O workspace precisa de pelo menos um owner.`, SQLSTATE 23514, que a API traduz para 422). Exclusão em cascata do workspace ou da conta do usuário passa. Sem ela, um clique deixava o workspace sem ninguém que o administre.
7. **`app.current_user_workspace_ids(p_min_role default 'viewer')`.** A chamada sem argumento do briefing continua valendo. O parâmetro opcional deixa a política de leitura de convites calcular o conjunto uma vez por consulta, em vez de chamar `has_role` por linha.
8. **`audit_events`.** Sem GRANT nem política para ninguém além do dono (postgres) e superusuário, inclusive leitura, que nenhuma rota da S0 precisa. Grava-se só por função SECURITY DEFINER (`create_workspace`). FK para `workspaces` com `on delete restrict`: apagar workspace com trilha exige decisão explícita do papel privilegiado. `actor_id` é `text` (UUID do usuário, id do agente de `squad/` ou nome do processo).
9. **`invitations`.** Sem GRANT de UPDATE: o aceite chega como função SECURITY DEFINER na fatia que fizer o fluxo. `invited_by` vem do JWT e não pode ser informado. `token_hash` precisa ser SHA-256 em hex: token em claro é recusado pelo banco.
10. **Seed em SQL**, não pela API admin da Auth. Roda sozinho no `supabase db reset` e o `make seed` reaplica o mesmo arquivo. Garante o estado documentado: memberships exatos nos três workspaces, e workspace criado só pelo Pedro em teste manual é removido. A `SUPABASE_SECRET_KEY` fica na configuração do backend, mas nenhum código da S0 a usa ainda.
11. **Chaves legadas.** Nada da J0 dependia de `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` em código (só documentação, `.env.example` e uma mensagem do `make up`), então não mantive compatibilidade: os nomes novos substituem os antigos.
12. **Erros.** Envelope `{"error": {"code", "message", "details"}}`: `code` em inglês (identificador estável), `message` em português. Violação de RLS vira 403, workspace alheio vira 404 igual ao inexistente, slug repetido vira 409 `slug_taken`, validação vira 422 com o campo e a mensagem em português.
13. **Além do pedido, para não travar a A0:** CORS só para `http://127.0.0.1:3100` e `http://localhost:3100` (`API_CORS_ORIGINS`), sem credenciais. Limite local de login da Auth de 30 para 300 por 5 min, porque cada `make test` loga os usuários do seed. A API se recusa a subir se `API_DATABASE_URL` usar papel com SUPERUSER ou BYPASSRLS (teste: com `postgres` a abertura do pool é recusada; com `hellosquad_api`, abre).
14. **Slug:** único em todo o banco, inclusive em workspace excluído (nunca é reaproveitado); 3 a 48 caracteres `[a-z0-9-]`; a API e a função normalizam para minúsculas. Tolerância de 5 s de relógio no `exp`/`iat` do JWT (`AUTH_JWT_LEEWAY_SECONDS`).
15. **Skills.** Usei `supabase-postgres-best-practices` e `fastapi-expert` (limite de duas) e `verification-before-completion`. Não abri `security-review` nem `code-review` por causa do limite. Fiz a revisão de segurança à mão (IDOR, escalada de papel, confusão de algoritmo, vazamento de identidade no pool, senha em log, seed em banco real), e o resultado está nas decisões 1, 2, 5, 8, 9, 13 e na §2.5. A revisão adversária fica com a H0.

## 5. Pendências

1. **CI (Vic), herdada da J0:** mover `infra/github/workflows/ci.yml` para `.github/workflows/` com token de escopo `workflow`. Ele já roda só os testes unitários do backend. Recomendo um job com `supabase start` + `make seed` + `make test` para levar a integração e o pgTAP ao CI (sem nuvem e sem segredo; as chaves locais vêm do `supabase status -o env` no runner).
2. **Fora do escopo da S0, já previsto no modelo:** aceite de convite (função SECURITY DEFINER), editar e excluir workspace, leitura da trilha de auditoria pelo owner e cota de workspaces por usuário (regra comercial, vai para tabela configurável).
3. **Revogação de sessão:** a API valida o JWT offline. Depois de logout o token segue válido até o `exp` (1 h), que é o comportamento padrão do Supabase. Conferir `session_id` contra `auth.sessions` custa uma consulta por requisição; fica para decisão.
4. **Fase 5:** nunca rodar `supabase db push --include-seed` contra a nuvem (o seed já se recusa se houver usuário real). Na nuvem, `API_DATABASE_URL` aponta para o pooler com o usuário `hellosquad_api.<ref>`. As funções SECURITY DEFINER pressupõem dono com BYPASSRLS (o `postgres` do Supabase tem).

## 6. Perguntas para o dono (não decidi)

1. Slug de workspace excluído pode ser reaproveitado por outro cliente? Hoje não.
2. Admin pode remover ou rebaixar outro admin? Hoje pode.
3. Membro pode sair do workspace por conta própria? Hoje não (só owner/admin removem).
4. Owner/admin pode incluir membro direto, sem convite? Hoje pode, como pede o teste (e). Se o produto quiser só convite, removo o INSERT direto.
5. Login anônimo está desligado no `config.toml`. Se ligar um dia, usuário anônimo deve usar a API? Hoje passaria, porque o token dele também tem `role: authenticated`.
6. Conta excluída (LGPD) de quem é o único owner: o workspace fica sem owner (a cascata passa). Qual o destino: transferir, arquivar ou excluir?
7. `POST /workspaces` com slug existente responde 409 e revela que o endereço está em uso (como Slack e GitHub). Aceitável?

## 7. Para a A0 (Aranha)

- Login e cadastro pela Auth local com `SUPABASE_PUBLISHABLE_KEY`. No cadastro, gravar o nome em `options.data.full_name`: é dali que o `/me` lê `full_name`.
- Chamar a API em `http://127.0.0.1:8100` com `Authorization: Bearer <session.access_token>`. CORS já aceita `127.0.0.1:3100` e `localhost:3100`.
- Fluxo do Pedro: `GET /me` com `memberships: []` → tela de criar workspace → `POST /workspaces {name, slug}` → 201 com `role: owner` e `Location`. Slug: 3 a 48 caracteres, minúsculas, números e hífen; 409 `slug_taken` se já existir.
- Contrato em `packages/contracts/openapi.json` (OpenAPI 3.1.0). Erros sempre em `error.code`/`error.message`.

## 8. Para a H0 (Hulk)

Alvos sugeridos: JWT de um tenant lendo outro pela API (`/workspaces/{id}`) e pela Data API (`/rest/v1/workspaces`, `/rest/v1/memberships`, `/rest/v1/invitations`); admin tentando virar owner; INSERT direto em `audit_events` e `workspaces`; token HS256 assinado com o `JWT_SECRET` local contra a API (deve dar 401); claims forjados. Testes existentes: `supabase/tests/database/` (pgTAP) e `apps/backend/tests/test_identity_api.py`.

## 9. Estado em que deixei a máquina

- Supabase do HelloSquad no ar (11 containers, portas 5632x), banco no estado do seed, `hellosquad_api` com a senha do `.env`.
- `.env` local reescrito no formato do `.env.example` novo, com `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `API_DATABASE_URL` (senha aleatória local) preenchidos sem imprimir. Ignorado pelo git.
- API e web parados (porta 8100 livre). Arquivos temporários com cópia de chave em `/tmp` (`.env` antigo, clone) apagados.
