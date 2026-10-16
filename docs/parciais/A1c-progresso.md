# A1c — Progresso (Aranha)

Fatia A1c, "Correções da H1 (web, fidelidade ao protótipo)" (Fase 1). Início: 16/10/2026 14:15. Alvo: 30 minutos.
Escopo: `apps/web`, `packages/ui` e docs da fatia. O Stark está em paralelo na S1h (`supabase/`, `apps/backend`,
`infra/`, `Makefile`).

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 14:15–14:18 | PASSO 0: diretrizes do dono (10:20 "segue o protótipo sempre"); H1 §(b) H1-03, H1-04, H1-05, H1-10, H1-11 e as provas (`h1/prototipo/achados.md` §1–5, `h1/estatico/achados.md` H1E-03, 04, 06); FLUXOS §1 e §4; protótipo na 8010 (trechos por script: `_openCtx('env')` L10572, `_cx` L9775, `hasSug` L10912) | feito | — |
| 14:18 | H1-04 depende da API: o contrato (`ContextType`) e `app.create_conversation` aceitam 12 tipos de objeto e nenhum é o ambiente; ver o relatório | registrado | — |
