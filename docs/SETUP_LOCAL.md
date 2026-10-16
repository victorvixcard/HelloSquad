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
pnpm exec supabase status -o env     # copie ANON_KEY e SERVICE_ROLE_KEY para o .env (ver abaixo)
make test                            # backend (ruff + pytest), web (lint + tipos) e banco (pgTAP)
make dev                             # API em http://127.0.0.1:8100 e web em http://127.0.0.1:3100
```

O primeiro `make up` baixa as imagens Docker do Supabase (alguns GB) e leva alguns minutos. Os seguintes sobem em segundos.

Conferir: `make status` mostra o Supabase, a API (`/health`) e a web. `curl http://127.0.0.1:8100/health` responde `{"status":"ok","version":"0.1.0","environment":"local"}`.

## Chaves locais

`pnpm exec supabase status -o env` imprime as chaves do Supabase **local**. Elas só valem nesta máquina.

| No `supabase status -o env` | No `.env` | Quem usa |
|---|---|---|
| `ANON_KEY` | `SUPABASE_ANON_KEY` | Browser e app. Passa pela RLS. |
| `SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | Só `api`, `worker` e `scheduler`. Ignora a RLS: nunca no browser, nunca em log. |
| `DB_URL` | `DATABASE_URL` | Backend e scripts. Já vem preenchido no `.env.example`. |

A tabela de `make status` mostra apenas as chaves no formato novo (`Publishable` e `Secret`); as duas acima só aparecem com `-o env`. A chave da Anthropic (`ANTHROPIC_API_KEY`) fica vazia até a Fase 1; o dono fornece.

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
| `make migrate` | Aplica migrations pendentes de `supabase/migrations/`. |
| `make seed` | Placeholder; o seed com os dados de `docs/DADOS_FICTICIOS.md` chega na S0. |
| `make test` | `test-backend` + `test-web` + `test-db`. |
| `make build` | Build de produção do web (o mesmo do CI). |
| `make dev` | API e web juntas; Ctrl+C encerra as duas. Separadas: `make dev-api`, `make dev-web`. |
| `make worker` / `make scheduler` | Processos de fundo (placeholders até a Fase 1). |

Banco:

- Nova migration: `pnpm exec supabase migration new <nome>`, editar o SQL, `make migrate`.
- Testes do banco: arquivos pgTAP em `supabase/tests/database/*.test.sql`, rodados por `make test-db`.
- Recriar o banco local do zero (apaga os dados locais e reaplica migrations e seed): `pnpm exec supabase db reset`.

## Como parar

- Servidores de desenvolvimento: Ctrl+C no terminal do `make dev`.
- Supabase: `make down`. Para apagar também os dados locais: `pnpm exec supabase stop --no-backup`.
- **Nunca use `supabase stop --all`**: ele derruba os Supabase de todos os projetos da máquina, não só o do HelloSquad.

## CI

O workflow está pronto em `infra/github/workflows/ci.yml`: em push na `main` e em PR, roda `ruff` + `pytest` no backend e `lint` + `typecheck` + `build` no web. Sem deploy, sem segredo, sem passo de nuvem.

Ele ainda não está em `.github/workflows/` porque o token de push desta máquina não tem o escopo `workflow` (o GitHub recusa o arquivo sem ele). Para ativar, alguém com esse escopo roda `git mv infra/github/workflows/ci.yml .github/workflows/ci.yml`, commita e faz push, ou cria o arquivo pela interface do GitHub.

O mesmo conjunto de verificações roda local com `make test` e `make build`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `make up` falha com porta em uso | Outro serviço pegou uma porta da tabela | `ss -ltnp \| grep <porta>`; troque a porta em `supabase/config.toml` e nesta página. |
| `ERR_PNPM_IGNORED_BUILDS` no `pnpm install` | Dependência nova com script de instalação | Decida pacote a pacote em `allowBuilds` no `pnpm-workspace.yaml` (`true` roda, `false` nega). Não libere tudo. |
| `make up` para em "Applying migration" | Erro no SQL de uma migration | Leia o erro, corrija a migration e rode `pnpm exec supabase db reset`. |
| `make test-db` falha com conexão recusada | Supabase local parado | `make up`. |
| Página em branco ou erro estranho no `make dev` depois de `make build` | `next build` e `next dev` dividem a pasta `.next` | Pare o `make dev`, rode o build, suba de novo. |
