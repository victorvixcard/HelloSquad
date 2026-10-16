# A0 — Progresso (Aranha)

**Fatia:** A0, Design System e casca do app. **Início:** 16/10/2026 01:18.

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | PASSO 0: diretrizes, plano, S0 §4.12 e §7, SETUP_LOCAL, arquitetura §7 e §12, handoff (A, B, C), DS, squad | ✅ lido | este |
| 1 | `packages/ui`: tokens gerados de `tokens.json`, fontes locais, primitivos (Button, CommandField, StatePill, Agent, Icon, AgentDot) | ✅ 01:36 — Vitest 43/43, `tsc` ok, `next build` ok com as fontes locais (0 referência a Google Fonts no `.next`); mutação no CSS e nos ícones gerados derruba o teste de defasagem | este |
| 2 | `packages/contracts`: tipos do OpenAPI e cliente `fetch` tipado | ⚪ | — |
| 3 | Auth no web (`@supabase/ssr`): `/entrar`, `/criar-conta`, `/sair`, middleware de `/app/*` | ⚪ | — |
| 4 | Casca do app: `/app/[workspace]` com barra lateral V4.6, `/app/novo-workspace` | ⚪ | — |
| 5 | Página pública `/` com SEO (Metadata, JSON-LD, sitemap, robots, llms.txt) | ⚪ | — |
| 6 | Testes: Vitest + Testing Library, Playwright, alvos no Makefile | ⚪ | — |
| 7 | `SETUP_LOCAL.md` e `A0-relatorio.md` com capturas | ⚪ | — |

## Notas

- Os arquivos `docs/ESTADO_E_CONTINUIDADE.md` e `docs/PLANO_DE_ACAO_FASE0.md` estavam modificados quando a A0 começou; o Thor os commitou em `3a7f976`. A A0 não mexe neles.
- pnpm 12 recusa versão publicada há menos de 1 dia (`minimumReleaseAge`). Em vez de aceitar as exceções que o `pnpm add` escreveu sozinho no `pnpm-workspace.yaml`, fixei versões anteriores: vitest 5.0.4 e jsdom 30.1.2.
- `make test-web` agora roda ESLint do web, `tsc` de todos os pacotes e os testes Vitest dos pacotes.
