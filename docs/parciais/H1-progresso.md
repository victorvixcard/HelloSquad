# H1 — Progresso da QA adversária da Fase 1 (Hulk)

**Início:** 16/10/2026 13:25. **Método:** tentar refutar cada entrega (S1a–S1g, A1f, A1a, A1b) lendo o
código real e atacando o ambiente local; não altero código de produto. Scripts e provas em
`docs/parciais/h1/`; saídas longas em `/tmp/h1_*` (lidas só por `tail`/`grep`). Toda operação que
mexe no banco roda sob a trava `flock /tmp/hellosquad-db.lock`, como o `Makefile`.

## Blocos

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | PASSO 0: diretrizes, plano da Fase 1, FLUXOS §3/§5, relatórios das fatias, SETUP_LOCAL, Makefile | em andamento |
| 1 | Aceite §16 pelo browser (Playwright) e idempotência (decidir 2x, run 2x, retry, reenfileirar) | pendente |
| 2 | Isolamento das tabelas novas (API e Data API) e Realtime entre tenants | pendente |
| 3 | Owner-only (aprovações e memória), editor e viewer; memória respeita confirmação | pendente |
| 4 | Créditos (saldo, ledger imutável, falha libera, respond, estimativa, "Agora não") e worker | pendente |
| 5 | Web (CSP, cookie, `?next=`, noindex) e comparação com o protótipo | pendente |
| 6 | Diretrizes (nuvem, segredos, dados fictícios, pt-BR sem emoji) e clone limpo | pendente |

## Estado inicial do ambiente (13:26)

- 11 containers `supabase_*_hellosquad` no ar; API em :8100 (`uv run hellosquad-api`, com reload),
  web em :3100 (`next dev --turbopack`), protótipo em :8010, Super Admin em :8020. Nenhum worker no ar.
- `ANTHROPIC_API_KEY` vazia no `.env`: runtime em modo simulado.
