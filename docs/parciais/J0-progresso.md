# J0 — progresso (Jarvis)

Fundação do ambiente local. **Fechada em 16/10/2026.** Relatório: `docs/parciais/J0-relatorio.md`.

| # | Item | Estado |
|---|---|---|
| 1 | Raiz do monorepo (`package.json`, `pnpm-workspace.yaml`, `.node-version`, `.editorconfig`, `Makefile`, `.gitignore`) | ✅ `make up && make test` exit 0 (repositório e clone limpo com banco novo) |
| 2 | `supabase/` (projeto `hellosquad`, portas 56320–56329, migration de extensões) | ✅ 11 containers `*_hellosquad`, 35 de outros projetos intactos; `vector` 0.8.2, `pgmq` 1.5.1, `pg_cron` 1.6.4, `pg_net` 0.20.4; pgTAP 4/4 |
| 3 | `apps/backend` (uv, FastAPI, `/health`, entrypoints, pytest, ruff) | ✅ ruff ok; pytest 1 passed; `/health` na 8100; worker e scheduler encerram com SIGTERM |
| 4 | `apps/web` (Next.js 15, porta 3100, lint + build) | ✅ Next.js 15.5.28; lint, typecheck e build verdes; `GET /` 200 na 3100 |
| 5 | `.env.example` | ✅ anon key local respondeu 200 em REST e Auth; `.env` ignorado pelo git |
| 6 | `.github/workflows/ci.yml` | 🔴 push recusado: token sem escopo `workflow`. Workflow em `infra/github/workflows/ci.yml`; passos verdes em clone limpo. Pendência do Vic |
| 7 | `docs/SETUP_LOCAL.md` | ✅ |
| 8 | `docs/parciais/J0-relatorio.md` | ✅ |

## Próximo passo

Vic: dar o escopo `workflow` ao token e mover o workflow para `.github/workflows/` (instruções no relatório, §3). Depois disso, S0 (Stark) pode começar.
