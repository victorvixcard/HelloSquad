# A0b — Progresso (Aranha)

Mini-fatia de hardening do web apontado pela H0: H0-02 (cabeçalhos de segurança), H0-05 (validação do
env no boot) e H0-03 (cookie httpOnly, só decisão documentada). Não toca `apps/backend`, `supabase/` nem
a seção de subida do `docs/SETUP_LOCAL.md` (S0b em paralelo). Verificação na porta 3101; sem `make test`
nem `make e2e` (o Thor roda depois).

| Hora | Item | Estado |
|---|---|---|
| 02:59 | PASSO 0 lido (diretrizes, H0 §H0-02/03/05 e §(f), A0 §3 itens 8–11 e §5) | feito |
| 03:03 | H0-02 — cabeçalhos de segurança: CSP com nonce no middleware, demais em `next.config.ts`; `curl -I` e `csp-check.mjs` em `a0b/` (476373b) | feito |
| 03:08 | H0-05 — validação no boot (`webEnvProblems` em `lib/env.ts`): build e start abortam; CI com valores fictícios | feito |
| — | H0-03 — decisão documentada | a fazer |
| — | Relatório, `make test-web`, `pnpm --filter web build`, porta 3101 livre | a fazer |
