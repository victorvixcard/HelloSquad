# A1c — Progresso (Aranha)

Fatia A1c, "Correções da H1 (web, fidelidade ao protótipo)" (Fase 1). Início: 16/10/2026 14:15. Alvo: 30 minutos.
Escopo: `apps/web`, `packages/ui` e docs da fatia. O Stark está em paralelo na S1h (`supabase/`, `apps/backend`,
`infra/`, `Makefile`).

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 14:15–14:18 | PASSO 0: diretrizes do dono (10:20 "segue o protótipo sempre"); H1 §(b) H1-03, H1-04, H1-05, H1-10, H1-11 e as provas (`h1/prototipo/achados.md` §1–5, `h1/estatico/achados.md` H1E-03, 04, 06); FLUXOS §1 e §4; protótipo na 8010 (trechos por script: `_openCtx('env')` L10572, `_cx` L9775, `hasSug` L10912) | feito | `67cc6ec` |
| 14:18 | H1-04 depende da API: o contrato (`ContextType`) e `app.create_conversation` aceitam 12 tipos de objeto e nenhum é o ambiente; ver o relatório | parado (regra do dono) | — |
| 14:19 | H1-03: sugestões somem na primeira mensagem da pessoa (`!userAfter && !typing`); 2 testes novos falham no código antigo | feito | `141819e` |
| 14:21 | H1-05: papel no cabeçalho pela regra exata da V4.6 (L13880), ". Ver detalhes"/". Recolher detalhes", "só a Íris", "Nexo, Bia e Kaia" | feito | `501fedc` |
| 14:21 | H1-11: `voce@seunegocio.example` e `seunegocio.example`; teste do catálogo contra e-mail fora de `.example` | feito | `63a603b` |
| 14:27 | H1-10: `Secure` fora do local, 7 dias sem uso (o `@supabase/ssr` força 400 dias, aplicado nos `setAll`), caminho da Server Action carimbado pelo middleware | feito | `95c5e3d` |
| 14:28 | `make test-web` verde (130 no web); lado a lado protótipo × nosso (H1-03, H1-05, estado da H1-04) | feito | `5b1675b` |
| 14:29–14:32 | `next dev` da 3100 parado; `make e2e` 10 de 10; prova da H1-10 no build de produção: `/` e `/sair` ainda devolviam o token (encaminhamento do Next) → a ação recusa `x-action-forwarded`; `make e2e` 10 de 10 de novo; prova: só `/app/miolo` devolve | feito | `33eb522` |
| 14:33 | `next dev` subido de novo com `setsid make dev-web` (`/entrar` 200) | feito | — |
| 14:34–14:36 | Teste do papel sem aviso de `act`; `make test-web` final (131 no web); relatório; "→ corrigido em A1c" nas linhas H1-03, 05, 10 e 11 da H1 | feito | `3ca82a7`, `a86a88d` (autosave) |
