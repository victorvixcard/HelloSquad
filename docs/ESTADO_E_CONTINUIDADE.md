# Estado e continuidade — HelloSquad

Handoff versionado. Quem retoma (Thor ou humano) lê este arquivo primeiro, depois `git log --oneline -20`, depois `docs/parciais/`.

## Onde estamos (15/10/2026, noite)

- Infra aprovada pelo Vic: Vercel + Railway + Supabase (`docs/ARQUITETURA_PROPOSTA.md`).
- Regra nova do Vic: **local primeiro, dados fictícios, publicação só após validação** (`docs/DIRETRIZES_DO_DONO.md`).
- Plano v0.2 em `docs/PLANO_DE_DESENVOLVIMENTO.md`; fila da fase em `docs/PLANO_DE_ACAO_FASE0.md`.
- Sete agentes definidos em `squad/` (aguardando revisão de texto do Vic; não bloqueia).
- **Fase 0 em execução.** J0 (Jarvis) fechada em 16/10 00:09. S0 (Stark) fechada em 16/10 01:01: identidade multi-tenant com RLS forçada, seed fictício, API `/me` e `/workspaces` com JWT por JWKS, OpenAPI em `packages/contracts/openapi.json`; `make test` verde (pytest 45, pgTAP 98) conferido por Thor. A0 (Aranha) fechada em 16/10 02:05: Design System `@hellosquad/ui` (tokens gerados, fontes locais, 7 agentes e ícones extraídos do bundle, primitivos), cliente tipado em `@hellosquad/contracts`, auth web com `@supabase/ssr`, casca `/app/[workspace]` com barra lateral V4.6, `/app/novo-workspace`, página pública com SEO/GEO; 53 testes Vitest e 5 Playwright. Relatórios em `docs/parciais/`. H0 (Hulk) fechada em 16/10 02:45: 0 bloqueante, 5 atenção, 1 nota; isolamento e autorização resistiram. Mini-fatias S0b (Stark) e A0b (Aranha) fechadas às 03:40 e 03:08. **Fase 0 fechada em 16/10 03:50** (verificação de Thor: pytest 51, Vitest 53, pgTAP 120, e2e 5/5, cabeçalhos de segurança no ar).
- **Fase 1 aberta.** S1a (Stark, schema do núcleo: conversas, mensagens, projetos, trabalhos com máquina de estados, entregas e versões, aprovações idempotentes, runs, filas pgmq, Realtime Broadcast) disparada em 16/10 03:55. Fila completa em `docs/PLANO_DE_ACAO_FASE1.md`. Runtime de LLM nascerá com modo simulado: a chave da Anthropic ainda não foi fornecida.
- Decisões de acesso ao banco tomadas para a S0 (chaves novas, JWKS, `auto_expose_new_tables = false`, RLS forçada, API sem BYPASSRLS): `docs/ARQUITETURA_PROPOSTA.md` §3.1.

## O que já existe

Monorepo com pnpm e uv; Supabase local `hellosquad` (portas 5632x, Postgres 17.11, extensões vector/pgmq/pg_cron/pg_net); FastAPI com `/health` na 8100; Next.js 15 mínimo na 3100; `make up/down/migrate/seed/test/dev`; `docs/SETUP_LOCAL.md`. CI escrito em `infra/github/workflows/ci.yml`, aguardando o Vic dar escopo `workflow` ao token.

Desde a S0: tabelas `workspaces`, `memberships`, `invitations`, `audit_events` com RLS habilitada e forçada; schema `app` (`current_user_workspace_ids`, `has_role`, `create_workspace`); papel `hellosquad_api` sem BYPASSRLS; seed idempotente dos 5 usuários fictícios; FastAPI com JWT (JWKS ES256, fallback HS256), `/me`, `/workspaces`; contrato OpenAPI; 98 testes pgTAP e 45 pytest. Como obter JWT de teste e chamar a API: `docs/SETUP_LOCAL.md`.

Desde a A0: `packages/ui` e `packages/contracts`; web com `/entrar`, `/criar-conta`, `/sair`, `/app/[workspace]` (Início, Sala do Squad, 7 ambientes, Modo Autônomo, Memória da Marca, Equipe), `/app/novo-workspace`, `/` pública com Metadata, JSON-LD, `sitemap`, `robots`, `llms.txt`; `make test-web` e `make e2e`.

## O que ainda não existe

QA adversária da Fase 0 (H0, em execução); tudo da Fase 1 em diante (conversas, trabalhos, runtime do squad, memória, créditos).

## Como retomar

1. `cat docs/PLANO_DE_ACAO_FASE0.md` para ver a fila e o estado de cada fatia.
2. `git log --oneline -20` e `git status` para ver o que está no disco.
3. `ls docs/parciais/` e ler o `*-progresso.md` da fatia em execução.
4. Se a fatia morreu sem relatório: retomar do disco em modo "continue, não refaça".

## Repositório

`github.com/victorvixcard/HelloSquad` (público). Local: `~/projetos/hellosquad`.
