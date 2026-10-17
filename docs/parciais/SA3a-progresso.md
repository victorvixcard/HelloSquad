# SA3a — progresso (Squad versionado no banco)

Disparada às 21:48 de 16/10/2026 pela main (Opus 5.5), em paralelo com a SA2 do Aranha (`apps/web`). Área desta
fatia: `apps/backend`, `supabase/`, `squad/`, `Makefile`, `packages/contracts` (gerado), `docs/SETUP_LOCAL.md` e os
documentos da fatia. Nada em `apps/web`; nenhum `next build` nem `make e2e`. Sem sub-agentes.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 21:49 | Abertura do progresso; PASSO 0 lido (diretrizes, plano SA linha SA3a, SUPER_ADMIN §2 Squad IA e §3, SA0 §1/§4/§5, S1c §1, S2c §1, SA1 §1/§3, `squad/README.md`) | este | em andamento |
| 21:52 | **Item 0, fuso das métricas.** `workspaces.timezone` não existe; referência única = **dia de Brasília** (`America/Sao_Paulo`, o `DISPLAY_TZ` que a API já usa no `<hoje>` e na base de contatos, e o dia das views da SA1). Seed: métricas e última compra dos contatos em `(now() at time zone 'America/Sao_Paulo')::date` (era `current_date`, UTC); API: período padrão do painel e importação de contatos no dia de Brasília (eram UTC e data local do processo); testes da S2b: `today()` de Brasília (era `date.today()` local). Prova às 21:49 BRT (00:49 UTC de 17/10, dentro da janela da falha): `make seed` + os 2 testes → `2 passed`; S2b + painel + contatos → `47 passed` | este | ✅ item 0 |
