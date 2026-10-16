# A0 — Progresso (Aranha)

**Fatia:** A0, Design System e casca do app. **Início:** 16/10/2026 01:18.

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | PASSO 0: diretrizes, plano, S0 §4.12 e §7, SETUP_LOCAL, arquitetura §7 e §12, handoff (A, B, C), DS, squad | ✅ lido | este |
| 1 | `packages/ui`: tokens gerados de `tokens.json`, fontes locais, primitivos (Button, CommandField, StatePill, Agent, Icon, AgentDot) | ✅ 01:36 — Vitest 43/43, `tsc` ok, `next build` ok com as fontes locais (0 referência a Google Fonts no `.next`); mutação no CSS e nos ícones gerados derruba o teste de defasagem | `d7b278c` |
| 2 | `packages/contracts`: tipos do OpenAPI e cliente `fetch` tipado | ✅ 01:39 — `pnpm --filter contracts generate` ok; Vitest 9/9 (tipos em dia, Bearer, 409 `slug_taken`, 422 com detalhes, 401, 502 fora do envelope, API fora do ar); mutação no `schema.ts` derruba o teste | `0037201` |
| 3 | Auth no web (`@supabase/ssr`): `/entrar`, `/criar-conta`, `/sair`, middleware de `/app/*` | ✅ 01:47 — `tsc` e ESLint ok; sonda Playwright no `next dev`: `/app/miolo` sem sessão → 307 `/entrar?next=%2Fapp%2Fmiolo`; Marina entra e volta para `/app/miolo`; senha errada → "E-mail ou senha não conferem." (e-mail mantido); campos vazios → erro por campo com `aria-invalid` | `b2d05dc` |
| 4 | Casca do app: `/app/[workspace]` com barra lateral V4.6, `/app/novo-workspace` | ✅ 01:53 (`ffeb741`) — sonda Playwright: Marina → `/app/miolo` com "Miolo" no cabeçalho e os 12 itens nos 3 grupos; barra recolhe (72 px) e vira gaveta no celular (Esc fecha e devolve o foco, navegar fecha); Pedro → `/app/novo-workspace`, "miolo" → 409 "Esse endereço já está em uso. Escolha outro.", "ab" → erro de tamanho, `pedro-teste-<ts>` → 201 e cai em `/app/pedro-teste-<ts>`; `make seed` limpou o workspace do Pedro | `ffeb741` |
| 5 | Página pública `/` com SEO (Metadata, JSON-LD, sitemap, robots, llms.txt) | ✅ 02:00 — `next build` verde (`/` estático); HTML com `lang="pt-BR"`, title, description, canonical, `hreflang` pt-BR, `og:type/locale/site_name/url/title/description`, JSON-LD `Organization` + `SoftwareApplication`; `/robots.txt` libera GPTBot, ClaudeBot, PerplexityBot e Google-Extended e bloqueia `/app`; `/sitemap.xml` com `/` e `/criar-conta`; `/llms.txt` 200; `/app/*` com `X-Robots-Tag: noindex, nofollow`; 1440 e 390 px sem rolagem horizontal | `bd5e3fc` |
| 6 | Testes: Vitest + Testing Library, Playwright, alvos no Makefile | ✅ 02:02 — Playwright 5/5 em 4,1 s (Chromium baixado sem problema de rede; teardown reaplica o seed); `make test` verde: ruff ok, pytest 45, Vitest 9 (contracts) + 44 (ui), pgTAP `Result: PASS`; alvos `make e2e` e `test-web` (lint + tsc de todos os pacotes + Vitest); CI em `infra/` roda tipos e Vitest dos pacotes | este |
| 7 | `SETUP_LOCAL.md` e `A0-relatorio.md` com capturas | ⚪ | — |

## Notas

- Os arquivos `docs/ESTADO_E_CONTINUIDADE.md` e `docs/PLANO_DE_ACAO_FASE0.md` estavam modificados quando a A0 começou; o Thor os commitou em `3a7f976`. A A0 não mexe neles.
- pnpm 12 recusa versão publicada há menos de 1 dia (`minimumReleaseAge`). Em vez de aceitar as exceções que o `pnpm add` escreveu sozinho no `pnpm-workspace.yaml`, fixei versões anteriores: vitest 5.0.4 e jsdom 30.1.2.
- `make test-web` agora roda ESLint do web, `tsc` de todos os pacotes e os testes Vitest dos pacotes.
- `confirmação de e-mail`: já desligada no `supabase/config.toml` (`[auth.email] enable_confirmations = false`, linha 234). Nada alterado em `supabase/`.
- O `@next/env` guarda o env em cache por processo: o `next.config.ts` carrega o `.env` da raiz com `forceReload`.
- `NextResponse.redirect` troca `127.0.0.1` por `localhost` (regex do `NextURL`), o que perderia os cookies da sessão. O middleware monta o `Location` pelo `Host` e o `next.config.ts` liga `skipMiddlewareUrlNormalize`.
- Rota `/app/novo-workspace` sombreia um workspace de slug `novo-workspace`: o web recusa esse slug (reservado). Pergunta para a API registrada no relatório.
- `Button` anexava `onClick` sempre (guarda de ocupado) e quebrava o prerender de `/sair` (Server Component). Agora só anexa quando há handler ou estado ocupado; teste novo cobre isso (Vitest 44/44).
- O `favicon.ico` padrão do create-next-app (logo de terceiro) saiu. Não há favicon oficial no handoff; pendência registrada.
