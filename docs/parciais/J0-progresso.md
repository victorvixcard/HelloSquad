# J0 — progresso (Jarvis)

Fundação do ambiente local. Atualizado a cada item verde.

| # | Item | Estado |
|---|---|---|
| 1 | Raiz do monorepo (`package.json`, `pnpm-workspace.yaml`, `.node-version`, `.editorconfig`, `Makefile`, `.gitignore`) | 🟡 em andamento |
| 2 | `supabase/` (projeto `hellosquad`, portas 56320–56329, migration de extensões) | 🟡 `config.toml` com portas próprias; falta subir e migrar |
| 3 | `apps/backend` (uv, FastAPI, `/health`, entrypoints, pytest, ruff) | ⚪ |
| 4 | `apps/web` (Next.js 15, porta 3100, lint + build) | ⚪ |
| 5 | `.env.example` | ⚪ |
| 6 | `.github/workflows/ci.yml` | ⚪ |
| 7 | `docs/SETUP_LOCAL.md` | ⚪ |
| 8 | `docs/parciais/J0-relatorio.md` | ⚪ |

## Notas

- pnpm 12.11.2 ativado via corepack (`packageManager` no `package.json`).
- Supabase CLI 2.121.0 como devDependency da raiz (`pnpm exec supabase`); binário vem do pacote `@supabase/cli-linux-x64`, sem script de pós-instalação.
- `edge_runtime` desligado no `config.toml`: a arquitetura não usa Edge Functions.

## Próximo passo

Fechar o `Makefile`, subir o Supabase local e aplicar a migration de extensões.
