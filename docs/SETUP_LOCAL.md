# Setup local — HelloSquad

Como subir o HelloSquad do zero numa máquina limpa. Tudo roda local: Supabase CLI em Docker (Auth, Postgres com RLS, Storage, Realtime), API FastAPI e web Next.js. Nada aqui cria projeto em nuvem, publica ou faz deploy (regra do dono, `docs/DIRETRIZES_DO_DONO.md`).

## Pré-requisitos

| Ferramenta | Versão testada | Observação |
|---|---|---|
| Linux ou WSL2 | WSL2 Ubuntu 24.04 | macOS deve funcionar; não testado. |
| Docker + Compose | Docker 29.7, Compose v5 | O Supabase CLI sobe os serviços em containers. O daemon precisa estar rodando. |
| Node.js | 24 (`.node-version`) | O corepack vem junto com o Node. |
| pnpm | 12.11.2, via corepack | `corepack enable pnpm`. A versão exata vem do campo `packageManager` do `package.json`. |
| uv | 0.11 | Gerencia o Python 3.12 do backend (baixa o interpretador se faltar). |
| git, make, curl | — | `psql` é opcional (útil para inspecionar o banco). |

O Supabase CLI **não** é instalado globalmente: é devDependency da raiz e roda com `pnpm exec supabase`.

## Subir do zero

```bash
git clone https://github.com/victorvixcard/HelloSquad.git
cd HelloSquad
corepack enable pnpm

make up                              # instala dependências (pnpm + uv), sobe o Supabase local e aplica as migrations
cp .env.example .env                 # o .env nunca é commitado
pnpm exec supabase status -o env     # copie PUBLISHABLE_KEY e SECRET_KEY para o .env (ver "Chaves locais")
openssl rand -hex 24                 # senha local do papel da API: monte API_DATABASE_URL no .env (ver abaixo)
make migrate                         # grava a senha do hellosquad_api no banco
make seed                            # tenants e usuários fictícios de docs/DADOS_FICTICIOS.md
make test                            # backend (ruff + pytest), web (lint + tipos) e banco (pgTAP)
make dev                             # API em http://127.0.0.1:8100 e web em http://127.0.0.1:3100
```

O primeiro `make up` baixa as imagens Docker do Supabase (alguns GB) e leva alguns minutos. Os seguintes sobem em segundos.

Conferir: `make status` mostra o Supabase, a API (`/health`) e a web. `curl http://127.0.0.1:8100/health` responde `{"status":"ok","version":"0.1.0","environment":"local"}`.

## Chaves locais

`pnpm exec supabase status -o env` imprime as chaves do Supabase **local**. Elas só valem nesta máquina.

| No `supabase status -o env` | No `.env` | Quem usa |
|---|---|---|
| `PUBLISHABLE_KEY` (`sb_publishable_…`) | `SUPABASE_PUBLISHABLE_KEY` | Web, app e testes. Pública; tudo passa pela RLS. |
| `SECRET_KEY` (`sb_secret_…`) | `SUPABASE_SECRET_KEY` | Só backend, para administração da Auth. Nunca no browser, nunca em log. |
| `DB_URL` | `DATABASE_URL` | Usuário `postgres` (ignora a RLS): só ferramentas locais (seed, testes). A API não usa. Já vem preenchido. |
| — | `API_DATABASE_URL` | A API. Papel `hellosquad_api`, sem `BYPASSRLS`. A senha você gera (abaixo). |

As chaves legadas `ANON_KEY` e `SERVICE_ROLE_KEY` (JWT) não são usadas pelo código. A chave da Anthropic (`ANTHROPIC_API_KEY`) fica vazia até a Fase 1; o dono fornece.

**Papel da API (`hellosquad_api`).** A migration cria o papel sem senha. Gere uma senha local (`openssl rand -hex 24`) e preencha:

```bash
API_DATABASE_URL=postgresql://hellosquad_api:<senha-gerada>@127.0.0.1:56322/postgres
```

`make migrate` (e também `make up` e `make seed`) grava essa senha no banco com hash SCRAM calculado no cliente; o log do Postgres nunca vê a senha em claro. Ao subir, a API confere que o papel não é superusuário nem ignora a RLS e se recusa a rodar se for.

**Validação do JWT na API.** Padrão: chave pública do JWKS da Auth (`/auth/v1/.well-known/jwks.json`). A Auth local assina os tokens de usuário em **ES256**, então o padrão `AUTH_JWT_ALGORITHMS=ES256` é o caminho usado hoje. Fallback, só se a Auth assinar com segredo compartilhado: `AUTH_JWT_ALGORITHMS=HS256` e `SUPABASE_JWT_SECRET` com o `JWT_SECRET` do `status -o env`.

## Portas

Esta máquina já roda outros Supabase locais (faixas 5432x, 5442x e 5532x) e outros serviços em 3000 e 8000. O HelloSquad usa faixas próprias para conviver com eles.

| Serviço | Porta | Endereço |
|---|---|---|
| Supabase API (Kong: REST, Auth, Storage, Realtime) | 56321 | http://127.0.0.1:56321 |
| Postgres | 56322 | `postgresql://postgres:postgres@127.0.0.1:56322/postgres` |
| Supabase Studio | 56323 | http://127.0.0.1:56323 |
| Mailpit (e-mails de Auth capturados) | 56324 | http://127.0.0.1:56324 |
| SMTP / POP3 do Mailpit | 56325 / 56326 | Reservadas (não expostas). |
| Analytics (logs do Studio) | 56327 | Uso interno do Studio. |
| Inspector do edge runtime | 56328 | Reservada (edge runtime desligado). |
| Pooler | 56329 | Reservada (pooler desligado). |
| Shadow DB | 56320 | Só existe durante `supabase db diff`. |
| API FastAPI | 8100 | http://127.0.0.1:8100/health |
| Web Next.js | 3100 | http://127.0.0.1:3100 |

As portas do Supabase ficam em `supabase/config.toml`; os alvos `make dev-api` e `make dev-web` leem `API_PORT` e `WEB_PORT` do `.env` (padrão 8100 e 3100). Para mudar uma porta, altere o arquivo, atualize esta tabela e confira com `ss -ltn | grep <porta>` que ela está livre.

## Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `make up` | Instala dependências pelos lockfiles, sobe o Supabase local e aplica migrations pendentes. |
| `make down` | Para os containers do HelloSquad. Os dados ficam no volume Docker. |
| `make status` | Estado do Supabase, da API e da web. |
| `make migrate` | Aplica migrations pendentes de `supabase/migrations/` e grava a senha do `hellosquad_api` (de `API_DATABASE_URL`). |
| `make seed` | Tenants e usuários fictícios de `docs/DADOS_FICTICIOS.md` (idempotente). |
| `make test` | `test-backend` + `test-web` + `test-db`. O backend inclui testes de integração (marcados `integration`) que exigem Supabase no ar e seed aplicado. Só os unitários: `cd apps/backend && uv run pytest -m "not integration"`. |
| `make openapi` | Exporta o contrato da API para `packages/contracts/openapi.json`. |
| `make build` | Build de produção do web (o mesmo do CI). |
| `make dev` | API e web juntas; Ctrl+C encerra as duas. Separadas: `make dev-api`, `make dev-web`. |
| `make worker` / `make scheduler` | Processos de fundo (placeholders até a Fase 1). |

Banco:

- Nova migration: `pnpm exec supabase migration new <nome>`, editar o SQL, `make migrate`. Toda tabela nova em `public` precisa de `ENABLE` e `FORCE ROW LEVEL SECURITY`, políticas e `GRANT` explícito para `authenticated`; nada para `anon`. O teste `01_rls_coverage` falha se alguma escapar.
- Testes do banco: arquivos pgTAP em `supabase/tests/database/*.test.sql`, rodados por `make test-db`. Usam os usuários do seed: rode `make seed` antes.
- Recriar o banco local do zero (apaga os dados locais e reaplica migrations e seed): `pnpm exec supabase db reset`, depois `make seed` (o reset recria o `hellosquad_api` sem senha).
- Contrato da API: `make openapi` regrava `packages/contracts/openapi.json`. O teste `test_openapi.py` falha se o arquivo commitado ficar defasado.

## Seed e usuários de teste

`make seed` aplica `supabase/seed.sql` (o mesmo que o `supabase db reset` aplica). É idempotente: rodar de novo devolve o mesmo estado. Recusa banco que tenha usuário com e-mail fora de `.example`, e a ferramenta recusa `DATABASE_URL` fora desta máquina.

| Usuário | Senha (só local) | Workspace e papel |
|---|---|---|
| `marina@miolo.example` | `Senha!Teste123` | Miolo, owner |
| `rafael@vitta.example` | `Senha!Teste123` | Vitta Estética, owner |
| `carla@vitta.example` | `Senha!Teste123` | Vitta Estética, editor |
| `juliana@trilha.example` | `Senha!Teste123` | Trilha Urbana, owner |
| `pedro@semconta.example` | `Senha!Teste123` | nenhum (testes negativos) |

Fonte: `docs/DADOS_FICTICIOS.md`. Workspace criado por teste manual só com o Pedro como membro é removido pelo próximo `make seed`, para ele voltar a "sem membership".

## JWT de teste e chamadas à API

Login pela Auth local com a chave publicável, depois chamada à API com o `access_token` (vale 1 hora):

```bash
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
JWT=$(curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' \
  -d '{"email":"marina@miolo.example","password":"Senha!Teste123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

curl -s http://127.0.0.1:8100/me -H "Authorization: Bearer $JWT"
curl -s http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT"
curl -s -X POST http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"name":"Teste","slug":"teste-local"}'
```

Rotas da S0: `GET /health`, `GET /me`, `GET /workspaces`, `POST /workspaces`, `GET /workspaces/{id}`. Documentação interativa em http://127.0.0.1:8100/docs com a API no ar. Erros vêm sempre como `{"error": {"code", "message", "details"}}`, com a mensagem em português.

## Como parar

- Servidores de desenvolvimento: Ctrl+C no terminal do `make dev`.
- Supabase: `make down`. Para apagar também os dados locais: `pnpm exec supabase stop --no-backup`.
- **Nunca use `supabase stop --all`**: ele derruba os Supabase de todos os projetos da máquina, não só o do HelloSquad.

## CI

O workflow está pronto em `infra/github/workflows/ci.yml`: em push na `main` e em PR, roda `ruff` + `pytest -m "not integration"` no backend (o runner não tem Supabase; integração e pgTAP rodam no `make test`) e `lint` + `typecheck` + `build` no web. Sem deploy, sem segredo, sem passo de nuvem.

Ele ainda não está em `.github/workflows/` porque o token de push desta máquina não tem o escopo `workflow` (o GitHub recusa o arquivo sem ele). Para ativar, alguém com esse escopo roda `git mv infra/github/workflows/ci.yml .github/workflows/ci.yml`, commita e faz push, ou cria o arquivo pela interface do GitHub.

O mesmo conjunto de verificações roda local com `make test` e `make build`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `make up` falha com porta em uso | Outro serviço pegou uma porta da tabela | `ss -ltnp \| grep <porta>`; troque a porta em `supabase/config.toml` e nesta página. |
| `ERR_PNPM_IGNORED_BUILDS` no `pnpm install` | Dependência nova com script de instalação | Decida pacote a pacote em `allowBuilds` no `pnpm-workspace.yaml` (`true` roda, `false` nega). Não libere tudo. |
| `make up` para em "Applying migration" | Erro no SQL de uma migration | Leia o erro, corrija a migration e rode `pnpm exec supabase db reset`. |
| `make test-db` falha com conexão recusada | Supabase local parado | `make up`. |
| Teste pgTAP falha em "seed presente" ou "Pedro sem membership" | Seed não aplicado ou alterado por teste manual | `make seed`. |
| API não sobe: `API_DATABASE_URL vazio` | Falta a URL do papel da API no `.env` | Gere a senha e preencha (seção "Chaves locais"), depois `make migrate`. |
| `password authentication failed for user "hellosquad_api"` | Senha do `.env` ainda não gravada no banco (ou `db reset` recente) | `make migrate`. |
| Login de teste responde 429 | Limite de login da Auth local (300 a cada 5 min por IP) | Esperar alguns minutos. |
| `Seed fictício recusado` | Há usuário com e-mail fora de `.example` no banco local | Remover esse usuário (dados de teste são só fictícios) ou `pnpm exec supabase db reset`. |
| Página em branco ou erro estranho no `make dev` depois de `make build` | `next build` e `next dev` dividem a pasta `.next` | Pare o `make dev`, rode o build, suba de novo. |
