# J0 — Relatório de fechamento (Jarvis)

**Fatia:** J0, fundação do ambiente local. **Data:** 16/10/2026. **Estado:** entregue, com uma pendência do dono: ativar o CI (o token de push não tem o escopo `workflow`).

Chaves e segredos foram mascarados em todas as saídas abaixo, mesmo sendo os valores padrão de um Supabase local.

## 1. O que foi entregue

| # | Item | Onde | Estado |
|---|---|---|---|
| 1 | Raiz do monorepo: workspaces pnpm, scripts, Node 24, editorconfig, Makefile (`up`, `down`, `status`, `migrate`, `seed`, `test`, `build`, `dev`, `dev-api`, `dev-web`, `worker`, `scheduler`) | `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.editorconfig`, `Makefile` | ✅ |
| 2 | Supabase local `project_id = "hellosquad"` na faixa 56320–56329, migration de extensões, teste pgTAP | `supabase/config.toml`, `supabase/migrations/00000000000000_extensions.sql`, `supabase/tests/database/00_extensions.test.sql` | ✅ |
| 3 | Backend uv (Python 3.12): FastAPI, `GET /health`, entrypoints `hellosquad-api`, `hellosquad-worker` e `hellosquad-scheduler`, pytest, ruff | `apps/backend/` | ✅ |
| 4 | Web Next.js 15.5.28 (App Router, TypeScript, Tailwind, ESLint) na porta 3100, página mínima em português | `apps/web/` | ✅ |
| 5 | `.env.example` com chaves vazias e instrução de onde copiar | `.env.example` | ✅ |
| 6 | Workflow de CI (ruff + pytest; lint + typecheck + build) | `infra/github/workflows/ci.yml` | 🔴 escrito e validado, mas fora de `.github/workflows/`: o push foi recusado (ver §3) |
| 7 | Guia de subida do zero | `docs/SETUP_LOCAL.md` (e ponteiro no `README.md`) | ✅ |
| 8 | Este relatório e o progresso | `docs/parciais/J0-relatorio.md`, `docs/parciais/J0-progresso.md` | ✅ |

Commits, todos já no `origin/main`: `6213ef7`, `f1bf4ca`, `99b6545`, `0b37eb7`, `caa3f85`, `69f9e5a`, `e9aebbb` e o commit deste relatório.

## 2. Como foi verificado

### 2.1 `make up && make test` no repositório (16/10, 00:06), exit 0

```text
pnpm install --frozen-lockfile
Scope: all 2 workspace projects
Lockfile is up to date, resolution step is skipped
Done in 42ms using pnpm v12.11.2
cd apps/backend && uv sync --locked
Resolved 33 packages in 1ms
pnpm exec supabase start
Starting database from backup...
{"DB_URL":"postgresql://postgres:postgres@127.0.0.1:56322/postgres","API_URL":"http://127.0.0.1:56321", ... "ANON_KEY":"[mascarado]","SERVICE_ROLE_KEY":"[mascarado]", ...}
pnpm exec supabase migration up --local
{"applied":[],"message":"Migrations applied"}
cd apps/backend && uv run ruff check . && uv run ruff format --check . && uv run pytest
All checks passed!
11 files already formatted
collected 1 item
tests/test_health.py .                                                   [100%]
============================== 1 passed in 0.28s ===============================
pnpm --filter web lint
$ eslint
pnpm --filter web typecheck
$ tsc --noEmit
pnpm exec supabase test db
/home/vitao/projetos/hellosquad/supabase/tests/database/00_extensions.test.sql .. ok
All tests successful.
Files=1, Tests=4,  0 wallclock secs ( 0.01 usr +  0.01 sys =  0.02 CPU)
Result: PASS
```

### 2.2 Do zero: clone limpo + banco novo, exit 0

1. `pnpm exec supabase stop --no-backup` no projeto `hellosquad`. Apagou só os volumes `supabase_db_hellosquad` e `supabase_storage_hellosquad`, que tinham apenas as extensões. Containers de outros projetos: 35 antes e 35 depois.
2. `git clone` do GitHub em `/tmp` (commit `e9aebbb`), seguindo o `docs/SETUP_LOCAL.md` ao pé da letra: `make up`, depois `cp .env.example .env` com as chaves de `supabase status -o env` (copiadas sem imprimir), depois `make test`.
3. Resultado: `Applying migration 00000000000000_extensions.sql...`, ruff `All checks passed!`, pytest `1 passed`, `eslint` e `tsc` sem erro, pgTAP `Result: PASS`. Exit 0.
4. Depois, `make down` no clone e `make up` de novo no repositório, para o Studio montar `supabase/snippets` do repositório e não do clone.

### 2.3 `supabase status` (tabela, segredos mascarados)

```text
supabase local development setup is running.
Stopped services: [supabase_imgproxy_hellosquad supabase_edge_runtime_hellosquad supabase_pooler_hellosquad]

│ 🔧 Development Tools  │ Studio  http://127.0.0.1:56323 │ Mailpit  http://127.0.0.1:56324 │ MCP  http://127.0.0.1:56321/mcp │
│ 🌐 APIs               │ Project URL  http://127.0.0.1:56321 │ REST  http://127.0.0.1:56321/rest/v1 │ GraphQL  http://127.0.0.1:56321/graphql/v1 │
│ ⛁ Database            │ URL  postgresql://postgres:postgres@127.0.0.1:56322/postgres │
│ 🔑 Authentication Keys │ Publishable  sb_publishable_[mascarado] │ Secret  sb_secret_[mascarado] │
│ 📦 Storage (S3)        │ URL  http://127.0.0.1:56321/storage/v1/s3 │ Access Key  [mascarado] │ Secret Key  [mascarado] │ Region  local │
```

Os três serviços parados são intencionais: o imgproxy é recurso do plano Pro, o edge runtime foi desligado (§4) e o pooler vem desligado por padrão.

### 2.4 Extensões no banco (psql na porta 56322)

```text
 extname | extversion |   schema
---------+------------+------------
 pg_cron | 1.6.4      | pg_catalog
 pg_net  | 0.20.4     | extensions
 pgmq    | 1.5.1      | pgmq
 vector  | 0.8.2      | extensions
(4 rows)

 PostgreSQL 17.11 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
```

As quatro extensões pedidas existem na imagem local e estão habilitadas. Nenhuma ficou de fora.

### 2.5 Containers

```text
supabase_analytics_hellosquad|Up (healthy)|56327->4000/tcp
supabase_auth_hellosquad|Up (healthy)|9999/tcp
supabase_db_hellosquad|Up (healthy)|56322->5432/tcp
supabase_inbucket_hellosquad|Up (healthy)|56324->8025/tcp
supabase_kong_hellosquad|Up (healthy)|56321->8000/tcp
supabase_pg_meta_hellosquad|Up (healthy)|8080/tcp
supabase_realtime_hellosquad|Up (healthy)|4000/tcp
supabase_rest_hellosquad|Up|3000/tcp
supabase_storage_hellosquad|Up (healthy)|5000/tcp
supabase_studio_hellosquad|Up (healthy)|56323->3000/tcp
supabase_vector_hellosquad|Up (healthy)|
```

São 11 containers `*_hellosquad`. Os outros projetos seguem com 35 containers em `docker ps`, a mesma contagem de antes da J0. Nenhum container de outro projeto foi parado, alterado ou removido.

### 2.6 API e web rodando (`make dev`)

```text
API: {"status":"ok","version":"0.1.0","environment":"local"}      ← curl http://127.0.0.1:8100/health
WEB: HTTP 200                                                     ← curl http://127.0.0.1:3100
make status → {"status":"ok",...} / "Web no ar em http://127.0.0.1:3100"
```

A página servida tem `<title>HelloSquad</title>` e `lang="pt-BR"`. Simulei o Ctrl+C com SIGINT no grupo de processos do `make dev`:

```text
antes do SIGINT: api 200 web 200
depois do SIGINT: make exit -2 | processos restantes na sessão: 0 | api None web None
```

As portas 8100 e 3100 ficaram livres.

Worker e scheduler (`WORKER_IDLE_SECONDS=0.5`, SIGTERM após 2 s):

```text
INFO hellosquad.worker: worker ocioso: nenhuma fila conectada ainda
INFO hellosquad.worker: worker encerrado
INFO hellosquad.scheduler: scheduler ocioso: nenhuma rotina cadastrada ainda
INFO hellosquad.scheduler: scheduler encerrado
```

### 2.7 `.env` local

Criei o `.env` a partir do `.env.example`, com as chaves preenchidas sem imprimir. Com a anon key, `GET /rest/v1/` respondeu 200 e `GET /auth/v1/health` respondeu 200. `git check-ignore -v .env` → `.gitignore:2:.env`. As configurações do backend leem o `.env` da raiz: `local 8100`.

### 2.8 CI

**Link da execução: não existe ainda.** O push do workflow foi recusado pelo GitHub:

```text
! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/ci.yml` without `workflow` scope)
```

Não contornei a restrição. Desfiz o commit local, que não tinha subido, e versionei o mesmo arquivo em `infra/github/workflows/ci.yml`, com instruções de ativação. Os passos do workflow rodaram num clone limpo do GitHub (`69f9e5a`), com os mesmos comandos do YAML:

- backend: `uv sync --locked` → `ruff check` (`All checks passed!`) → `ruff format --check` (`11 files already formatted`) → `pytest` (`1 passed`). Exit 0.
- web: `pnpm install --frozen-lockfile` → `eslint` → `tsc --noEmit` → `next build` (`Compiled successfully`, `Generating static pages (5/5)`). Exit 0.

O YAML foi validado com parser (`jobs: ['backend', 'web']`). As versões das actions são as últimas publicadas, conferidas na API do GitHub em 16/10: `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6` (a 6.1.0 suporta pnpm 12) e `astral-sh/setup-uv@v10`.

## 3. Pendências

1. **Ativar o CI (Vic).** Dar ao token o escopo `workflow`. No token clássico é o checkbox `workflow`; no fine-grained, a permissão "Workflows: Read and write". Depois:
   `git mv infra/github/workflows/ci.yml .github/workflows/ci.yml && git commit -m "Ativa CI" && git push`.
   Também dá para criar o arquivo pela interface do GitHub. O critério "CI verde no push" e o link da execução ficam abertos até isso.
2. **`make seed`** é placeholder; o Stark preenche na S0 a partir de `docs/DADOS_FICTICIOS.md`.
3. **`ANTHROPIC_API_KEY`** está vazia de propósito; o dono fornece na Fase 1.

## 4. Decisões tomadas e onde divergi do briefing

- **CI em `infra/` e não em `.github/workflows/`.** Foi forçado pelo escopo do token (§3). O conteúdo é o pedido.
- **`make test` não roda `next build`.** O `next build` e o `next dev` dividem a pasta `.next`, e rodar o build com o `make dev` no ar quebra o servidor de desenvolvimento. O build fica em `make build` e no CI. Em troca, o `make test` ganhou `tsc --noEmit` no web.
- **Verificações além do pedido:** `ruff format --check` no backend e testes pgTAP do banco (`make test-db`, via `supabase test db`). O pgTAP já deixa pronta a estrutura `supabase/tests/database/` para os testes de RLS da S0. Consequência: o `make test` exige o Supabase no ar, o que bate com o critério `make up && make test`.
- **Edge runtime desligado** no `config.toml`. A arquitetura não usa Edge Functions (tudo é FastAPI), e isso economiza uma imagem de 1,1 GB e um container. Religar só com ADR.
- **pnpm 12.11.2**, a última estável, ativado via corepack. Ele recusa instalar quando há script de build não aprovado. O `unrs-resolver` (dependência do `eslint-config-next`) ficou **negado** em `allowBuilds`, porque o binário dele já vem pré-compilado. Política: decidir pacote a pacote, nunca liberar tudo.
- **Supabase CLI 2.121.0** fixado como devDependency. O binário vem em `@supabase/cli-linux-x64`, sem script de pós-instalação.
- **Build do web com webpack** (`next build`) e não com o Turbopack beta que o template de 15.5 traz. O `dev` segue com Turbopack.
- **Fonte Geist removida** do esqueleto (`next/font/google` baixa a fonte do Google no build). O build ficou sem dependência externa. Tipografia é decisão da A0 (Aranha).
- **`@types/node` em `^24`**, alinhado ao Node 24 do `.node-version` (o template trazia `^20`).
- **Auth local:** `site_url = http://127.0.0.1:3100` e redirects para `127.0.0.1:3100/**` e `localhost:3100/**`, já prontos para o login da A0.
- **Portas:** usei exatamente a faixa sugerida (56320–56329), sem conflito. Também levei para essa faixa o shadow DB (56320) e o inspector do edge runtime (56328), que o briefing não citava.
- **`authors` removido do `pyproject.toml`.** O `uv init` gravou ali o e-mail do git, e o repositório é público.

## 5. Perguntas e recomendações

1. **Chaves novas ou legadas do Supabase? (Stark/Aranha, S0/A0)** O CLI 2.121 emite os dois formatos. A tabela do `supabase status` mostra só as novas (`sb_publishable_…` / `sb_secret_…`); as legadas (JWT `anon` / `service_role`) só aparecem com `-o env`. O `.env.example` segue os nomes do briefing (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) com as legadas, que funcionam em todos os clientes hoje. O Supabase está migrando para as novas, então convém decidir antes da S0 validar JWT.
2. **`auto_expose_new_tables` (Stark/Hulk).** O `config.toml` novo explica que, sem configuração, tabelas criadas em `public` ficam expostas à Data API (`anon`, `authenticated`) sem GRANT explícito, igual à nuvem. A barreira passa a ser só a RLS. Recomendo que a S0 decida entre manter o padrão (e o H0 testar que toda tabela tem RLS) ou desligar e exigir GRANT explícito.
3. **Postgres 17, não 16 (Thor).** `docs/ARQUITETURA_PROPOSTA.md` §2 diz "Postgres 16", mas o Supabase só oferece 15 e 17, e 17 é o padrão de projeto novo. O local está em 17.11; o projeto em nuvem da Fase 5 precisa nascer em 17 (`major_version` do `config.toml`). Não editei o documento de arquitetura.
4. **CI do banco (S0).** Quando houver testes de RLS, vale um job de CI com `supabase start` + `supabase test db`. Roda em Docker no runner, sem nuvem e sem segredo; custa uns 2 a 3 minutos de imagens.
5. **Fora do meu escopo, só registro.** `supabase_vector_Ri-ica` e `supabase_vector_vixcard-global` já estavam em loop de reinício antes da J0: 160 reinícios, erro `Network unreachable` ao listar containers, imagem `vector:0.53.0`. O contador subia sozinho a cada minuto, então não foi efeito da J0. Não toquei.

## 6. Estado em que deixei a máquina

- Supabase do HelloSquad no ar (11 containers, portas 5632x), banco com as 4 extensões.
- `.env` local criado na raiz, ignorado pelo git, com as chaves locais.
- API e web parados; sobem com `make dev`.
- Varredura de segredos nos arquivos versionados (`git grep --cached` por JWT, chaves `sb_…` com valor, chave da Anthropic e o JWT secret padrão do CLI): nenhuma ocorrência (exit 1).
