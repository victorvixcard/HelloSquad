# A0b — Progresso (Aranha)

Mini-fatia de hardening do web apontado pela H0: H0-02 (cabeçalhos de segurança), H0-05 (validação do
env no boot) e H0-03 (cookie httpOnly, só decisão documentada). Não toca `apps/backend`, `supabase/` nem
a seção de subida do `docs/SETUP_LOCAL.md` (S0b em paralelo). Verificação na porta 3101; sem `make test`
nem `make e2e` (o Thor roda depois).

| Hora | Item | Estado |
|---|---|---|
| 02:59 | PASSO 0 lido (diretrizes, H0 §H0-02/03/05 e §(f), A0 §3 itens 8–11 e §5) | feito |
| 03:03 | H0-02 — cabeçalhos de segurança: CSP com nonce no middleware, demais em `next.config.ts`; `curl -I` e `csp-check.mjs` em `a0b/` (476373b) | feito |
| 03:04 | H0-05 — validação no boot (`webEnvProblems` em `lib/env.ts`): build e start abortam; CI com valores fictícios | feito |
| 03:05 | `next dev` na 3101: `csp-check` com 0 violação; build de produção refeito; evidência final de `curl -I` e `csp-check` | feito |
| 03:07 | H0-03 — decisão proposta no relatório §4 (sem implementar) | feito |
| 03:08 | Relatório; `make test-web` e `pnpm --filter web build` verdes; porta 3101 livre | feito |
