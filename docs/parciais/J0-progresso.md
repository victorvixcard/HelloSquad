# J0 — progresso (Jarvis)

Fundação do ambiente local. Atualizado a cada item verde.

| # | Item | Estado |
|---|---|---|
| 1 | Raiz do monorepo (`package.json`, `pnpm-workspace.yaml`, `.node-version`, `.editorconfig`, `Makefile`, `.gitignore`) | 🟡 arquivos prontos; `make help`, `make migrate` e `make test-db` verdes; `make up`/`make test` completos dependem dos itens 3 e 4 |
| 2 | `supabase/` (projeto `hellosquad`, portas 56320–56329, migration de extensões) | ✅ `supabase start` ok (11 containers `*_hellosquad`, 35 de outros projetos intactos); `vector` 0.8.2, `pgmq` 1.5.1, `pg_cron` 1.6.4, `pg_net` 0.20.4; teste pgTAP 4/4 |
| 3 | `apps/backend` (uv, FastAPI, `/health`, entrypoints, pytest, ruff) | ✅ `ruff check` e `ruff format --check` ok; `pytest` 1 passed; `hellosquad-api` respondeu `GET /health` na 8100; worker e scheduler logam, dormem e encerram com SIGTERM |
| 4 | `apps/web` (Next.js 15, porta 3100, lint + build) | ✅ Next.js 15.5.28 via `create-next-app`; `lint`, `typecheck` e `build` verdes (build em ~13 s); `make dev` serviu `GET /` 200 na 3100 e `/health` na 8100 |
| 5 | `.env.example` | ✅ chaves vazias com instrução de cópia (`supabase status -o env`); `.env` local preenchido sem imprimir chave; anon key respondeu 200 em `/rest/v1/` e `/auth/v1/health`; `.env` ignorado pelo git |
| 6 | `.github/workflows/ci.yml` | ⚪ |
| 7 | `docs/SETUP_LOCAL.md` | ⚪ |
| 8 | `docs/parciais/J0-relatorio.md` | ⚪ |

## Notas

- pnpm 12.11.2 ativado via corepack (`packageManager` no `package.json`).
- Supabase CLI 2.121.0 como devDependency da raiz (`pnpm exec supabase`); binário vem do pacote `@supabase/cli-linux-x64`, sem script de pós-instalação.
- `edge_runtime` desligado no `config.toml`: a arquitetura não usa Edge Functions.
- pnpm 12 recusa instalar com script de build não aprovado. `unrs-resolver` ficou negado em `allowBuilds` (o binário já vem pré-compilado).
- `build` do web usa o webpack estável (`next build`), não o Turbopack beta do template; `dev` segue com Turbopack.
- Fonte Geist (`next/font/google`) removida do esqueleto: o build não depende de download externo; tipografia é decisão da A0.
- Postgres local 17.11 (padrão do CLI para projeto novo; a arquitetura cita 16, que o Supabase não oferece).
- Observação fora do escopo: `supabase_vector_Ri-ica` e `supabase_vector_vixcard-global` já estavam em loop de reinício antes da J0 (160 reinícios; erro `Network unreachable` ao listar containers). Não toquei.

## Próximo passo

CI (`.github/workflows/ci.yml`) e confirmação da execução verde no GitHub.
