# Estado e continuidade — HelloSquad

Handoff versionado. Quem retoma (Thor ou humano) lê este arquivo primeiro, depois `git log --oneline -20`, depois `docs/parciais/`.

## Onde estamos (15/10/2026, noite)

- Infra aprovada pelo Vic: Vercel + Railway + Supabase (`docs/ARQUITETURA_PROPOSTA.md`).
- Regra nova do Vic: **local primeiro, dados fictícios, publicação só após validação** (`docs/DIRETRIZES_DO_DONO.md`).
- Plano v0.2 em `docs/PLANO_DE_DESENVOLVIMENTO.md`; fila da fase em `docs/PLANO_DE_ACAO_FASE0.md`.
- Sete agentes definidos em `squad/` (aguardando revisão de texto do Vic; não bloqueia).
- **Fase 0 aberta.** Primeira fatia (J0, Jarvis) disparada em 15/10 à noite.

## O que ainda não existe

Código de aplicação. `apps/`, `packages/` e `supabase/` têm só `.gitkeep` até o J0 fechar.

## Como retomar

1. `cat docs/PLANO_DE_ACAO_FASE0.md` para ver a fila e o estado de cada fatia.
2. `git log --oneline -20` e `git status` para ver o que está no disco.
3. `ls docs/parciais/` e ler o `*-progresso.md` da fatia em execução.
4. Se a fatia morreu sem relatório: retomar do disco em modo "continue, não refaça".

## Repositório

`github.com/victorvixcard/HelloSquad` (público). Local: `~/projetos/hellosquad`.
