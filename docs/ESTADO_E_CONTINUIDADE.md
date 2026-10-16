# Estado e continuidade — HelloSquad

Handoff versionado. Quem retoma (Thor ou humano) lê este arquivo primeiro, depois `git log --oneline -20`, depois `docs/parciais/`.

## Onde estamos (15/10/2026, noite)

- Infra aprovada pelo Vic: Vercel + Railway + Supabase (`docs/ARQUITETURA_PROPOSTA.md`).
- Regra nova do Vic: **local primeiro, dados fictícios, publicação só após validação** (`docs/DIRETRIZES_DO_DONO.md`).
- Plano v0.2 em `docs/PLANO_DE_DESENVOLVIMENTO.md`; fila da fase em `docs/PLANO_DE_ACAO_FASE0.md`.
- Sete agentes definidos em `squad/` (aguardando revisão de texto do Vic; não bloqueia).
- **Fase 0 em execução.** J0 (Jarvis) fechada em 16/10 00:09: ambiente local completo, `make up && make test` verde (conferido por Thor). Relatório em `docs/parciais/J0-relatorio.md`. S0 (Stark) disparada em 16/10 ~00:25.
- Decisões de acesso ao banco tomadas para a S0 (chaves novas, JWKS, `auto_expose_new_tables = false`, RLS forçada, API sem BYPASSRLS): `docs/ARQUITETURA_PROPOSTA.md` §3.1.

## O que já existe

Monorepo com pnpm e uv; Supabase local `hellosquad` (portas 5632x, Postgres 17.11, extensões vector/pgmq/pg_cron/pg_net); FastAPI com `/health` na 8100; Next.js 15 mínimo na 3100; `make up/down/migrate/seed/test/dev`; `docs/SETUP_LOCAL.md`. CI escrito em `infra/github/workflows/ci.yml`, aguardando o Vic dar escopo `workflow` ao token.

## O que ainda não existe

Tabelas de domínio, RLS, seed fictício, autenticação na API, Design System e UI real (S0 e A0).

## Como retomar

1. `cat docs/PLANO_DE_ACAO_FASE0.md` para ver a fila e o estado de cada fatia.
2. `git log --oneline -20` e `git status` para ver o que está no disco.
3. `ls docs/parciais/` e ler o `*-progresso.md` da fatia em execução.
4. Se a fatia morreu sem relatório: retomar do disco em modo "continue, não refaça".

## Repositório

`github.com/victorvixcard/HelloSquad` (público). Local: `~/projetos/hellosquad`.
