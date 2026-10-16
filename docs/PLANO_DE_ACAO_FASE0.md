# Plano de ação — Fase 0 (Fundação local)

Atualizado por Thor a cada entrega. Ao retomar uma sessão: ler este arquivo → `git log` → `docs/parciais/` → estado dos sub-agentes → seguir do disco. Nunca re-disparar do zero.

**Decisões do dono em vigor:** `docs/DIRETRIZES_DO_DONO.md` (PASSO 0 de todo briefing).

## Fila

| # | Fatia | Agente | Estado | Depende de | Critério de pronto |
|---|---|---|---|---|---|
| J0 | Ambiente local: Supabase CLI (Docker, projeto `hellosquad`, portas próprias), pnpm via corepack, uv, estrutura `apps/backend` e `apps/web` mínima, `Makefile` (`up/down/migrate/seed/test/dev`), `.env.example`, GitHub Actions (lint + testes, sem deploy), `docs/SETUP_LOCAL.md` | Jarvis | 🟡 em execução (disparada 15/10 noite) | — | `supabase status` mostra o projeto nas portas próprias sem derrubar outros containers; `make up && make test` verde (teste placeholder); CI verde no push; relatório em `docs/parciais/J0-relatorio.md` |
| S0 | Identidade e isolamento: migrations `workspaces`, `memberships`, `invitations`, `audit_events`; RLS em tudo; seed dos tenants de `DADOS_FICTICIOS.md`; testes de isolamento (Marina vê Miolo, Pedro não vê nada, Carla editor não administra); FastAPI: `GET /health`, validação do JWT do Supabase, `GET /me`, `GET/POST /workspaces`; OpenAPI exportado para `packages/contracts` | Stark | ⚪ pendente | J0 | `make migrate && make seed && make test` verde com os testes de RLS; `curl /health` e `/me` com JWT do seed; relatório `S0-relatorio.md` |
| A0 | Design System e casca do app: `packages/ui` com `tokens.css` gerado de `tokens.json` e primitivos (Button, CommandField, Agent, StatePill); `apps/web` Next.js 15 com login e cadastro contra a Auth local, criação de workspace, shell com barra lateral da V4.6 (Principal / Seu squad / Gestão), `/app/*` noindex, página pública `/` mínima com Metadata API | Aranha | ⚪ pendente | S0 | Marina faz login local e vê o shell com o workspace Miolo; Pedro faz login e cai no fluxo de criar workspace; lint e build verdes; relatório `A0-relatorio.md` |
| H0 | QA da Fase 0: rodar o critério de cada fatia, tentar quebrar o isolamento (JWT de um tenant lendo outro), checar que nada aponta para nuvem, nenhum segredo no repo, dados só fictícios | Hulk | ⚪ pendente | A0 | `docs/parciais/H0-relatorio.md` com achado → severidade → cenário → correção |

## Decisões tomadas durante a fase

- 15/10: portas do Supabase local do HelloSquad serão próprias (não as padrão 54321–54323, que já estão ocupadas por outro projeto nesta máquina). Jarvis escolhe a faixa e documenta em `SETUP_LOCAL.md`.
- 15/10: API local na porta 8100 e web na 3100 (8000 e 3000 estão ocupadas por outros projetos).

## Pendências para o Vic

- Chave da API da Anthropic (Fase 1).
- Acesso do Diogo ao repositório.
