# S0 — progresso (Stark)

Identidade, isolamento por tenant e API base. **Iniciada em 16/10/2026 00:14.** Relatório ao fechar: `docs/parciais/S0-relatorio.md`.

| # | Item | Estado |
|---|---|---|
| 1 | Migrations: `workspaces`, `memberships`, `invitations`, `audit_events`, schema `app` com funções auxiliares, RLS habilitada e forçada, papel `hellosquad_api`, `auto_expose_new_tables = false` | ⏳ em andamento |
| 2 | Seed idempotente (`make seed`): 3 workspaces e 5 usuários de `docs/DADOS_FICTICIOS.md` | ⚪ |
| 3 | Testes pgTAP de RLS e isolamento (varredura de RLS, Marina, Pedro, Carla, Rafael, `audit_events` imutável) | ⚪ |
| 4 | FastAPI: JWT (JWKS + fallback HS256), transação com `SET LOCAL ROLE authenticated`, `/me`, `/workspaces`, testes de integração | ⚪ |
| 5 | `make openapi` → `packages/contracts/openapi.json` | ⚪ |
| 6 | `docs/SETUP_LOCAL.md` e `docs/parciais/S0-relatorio.md` | ⚪ |

## Observações iniciais

- Supabase local no ar (11 containers `*_hellosquad`); a Auth local expõe JWKS com uma chave **ES256** (`/auth/v1/.well-known/jwks.json`), então o caminho principal de validação do JWT é o assimétrico.

## Próximo passo

Escrever as migrations do item 1 e o teste de varredura de RLS.
