# S0b — progresso (Stark)

Correções de backend apontadas pela QA H0 (H0-04, H0-06, H0-01). Início: 16/10/2026, 02:55.

| Item | Estado |
|---|---|
| H0-04 — slugs reservados na API e em `app.create_workspace` | feito: migration `20261016060245`, 422 `slug_reserved`; pytest 46, pgTAP 119 |
| H0-06 — `make up` antes do `.env` | feito: clone limpo do GitHub seguindo a doc nova, `make up/seed/test` exit 0 (`docs/parciais/s0b/clone_limpo.sh`) |
| H0-01 — varredura de privilégios de `anon`/`service_role` no pgTAP | feito: `01_rls_coverage` com 8 asserções; mutação com 3 GRANTs indevidos → 3 `not ok` |
| Relatório `S0b-relatorio.md` | em andamento |

## Notas

- PASSO 0 lido (diretrizes, H0 §H0-01/04/06 e §(f), S0 §4 itens 2 e 14, SETUP_LOCAL).
- Não toco em `apps/web/` (A0b do Aranha em paralelo).
- H0-04: a lista mora só no banco (`app.reserved_workspace_slugs()` + CHECK `workspaces_slug_not_reserved`); a API traduz a constraint. Contrato regerado (`openapi.json` e `schema.ts`, só a descrição do slug).
- H0-06: `make up` chama `hellosquad-local-db roles --optional` (sem `.env` ou com URL vazia: aviso de uma linha, exit 0). `make migrate`/`make seed` exigem `DATABASE_URL` e `API_DATABASE_URL` antes de conectar (antes, `API_DATABASE_URL` vazio só avisava).
- H0-01: tabelas/views (inclui MAINTAIN), sequências e funções de `public` e `app`, para `anon` e `service_role`. Configuração da Auth e do PostgREST intocada.
