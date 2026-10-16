# A2d — Progresso (Aranha)

**Fatia:** correções da H2 no web (projeto coordenado e fidelidade à V4.6). **Início:** 16/10/2026 19:45.
**Alvo:** 60 min. **Escopo:** `apps/web`, `packages/ui` e docs da fatia. Stark em paralelo na S2g (`apps/backend`,
`supabase/`, `squad/`): não toco. Lado a lado em `docs/parciais/a2d/`.

Horas = hora do commit.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 19:52 | Abertura do progresso; PASSO 0 em leitura (diretrizes, H2 §b, `h2/prototipo/achados.md`) | 6582aec | feito |
| 19:53 | Três sub-agentes do Aranha em paralelo, cada um com arquivos exclusivos: (a) H2-04/06/08/22/24/26; (b1) P-01/03/04/05/07/08; (b2) P-09 a P-13. O Aranha fica com o H2-01 | — | feito |
| 19:58 | H2-01 (1/3): campanha na Sala do Squad e com o Nexo vira o 01.02; "Coordenar uma campanha" abre o Nexo com 01.02 (não a Bia 02.04); cartão `team` na conversa ("Squad da campanha · o Nexo coordena", "Abrir o projeto"); tela do projeto coordenado (etapas com responsável e estado, Entregas/Decisões/Squad/Histórico, próxima decisão, combinado); cartão do material com "Etapa N · título" | 5492078 | feito |
| 20:03 | H2-01 (2/3): Quadro e Lista mostram o 01.02 como "Projeto" com o nome do projeto e "etapa N de M"; e2e novo `e2e/a2d-projeto.spec.ts` (Sala → equipe → Bia aprovada → Kaia aguardando motor → Otto com a estratégia no contexto → projeto fechado) **1 passed (13,5 s)** no worktree `/tmp/hs-a2d` (build exit 0) | d8df994 | feito |
| 20:08 | H2-01 (3/3): testes de componente `test/A2dProject.test.tsx` (8); lado a lado `a2d/proto-sala-campanha.png` × `a2d/a2d-sala-campanha.png` e `a2d/proto-projeto-estrategia.png` × `a2d/a2d-projeto-estrategia.png` | este | feito |
| 20:27 | Sessão abortada pelo gateway (espera de sub-agentes). Retomada às 20:30 pelo disco, sem sub-agentes | — | — |
| 20:30 | Retomada, PASSO 0: árvore limpa. O arquivo solto da sessão anterior (`e2e/a2d-idioma.spec.ts`, e2e do H2-04) entrou pelo autosave `a45538b`; avaliado: fica (é o e2e que a H2 pede, "pessoa sem idioma num negócio en"; passou no e2e das 20:19, 28 passed) | este | feito |

### Lista de conferência (20:30, `git log` + `grep` no código)

| Item | Estado | Onde |
|---|---|---|
| H2-04 | feito em 13f51b5, cded43d; e2e em a45538b | `i18n/resolve.ts` (`resolveRequestLocale`), `lib/supabase/middleware.ts` (pessoa → negócio da rota/cookie/`GET /me` → pt-BR); `test/A2dLocale.test.ts`; `e2e/a2d-idioma.spec.ts` |
| H2-06 | feito em 854a94d, 5f775dc (catálogo `memory.json` no autosave 7f3e2ef) | `lib/onboarding.ts`, `components/memory/memory-model.ts`; `test/A2dMemoryTopics.test.ts` |
| H2-08 | feito em c617590; falta a prova no build final (tamanho e grep) | `i18n/client-messages.ts`, `app/layout.tsx`, `app/(auth)/layout.tsx`, `app/app/layout.tsx` |
| H2-09 | web feito em 75fa1db (P-01); P-02 é do backend (`conversations/opening.py:139-140`), fora da área do web | `ContentEnvironment.tsx`, `results/series-loader.ts` |
| H2-10 | feito em aaa87b3 (resto no autosave 84efdf1; teste e60c9f6) | `ResultsEnvironment.tsx`, `results.css` |
| H2-11 | feito em ad9f939, c666862 | `ConversationPanel.tsx`, `results/metrics.ts`, `shell-context.tsx` |
| H2-12 | feito em 164be1f; falta o lado a lado do documento (só há `proto-doc-decisao.png`) | `docs/DocumentDetail.tsx`; `test/A2dDocs.test.tsx` |
| H2-22 | feito em 992509c | `app/error.tsx`, `app/global-error.tsx`, `app/app/loading.tsx`, `app/app/[workspace]/error.tsx` |
| H2-24 | feito em 418093c | `app/icon.svg`, `app/favicon.ico/route.ts` |
| H2-26 | feito em 87a822c, 7b8970f (`site-seo.ts` no autosave 84efdf1) | `lib/site-seo.ts`, `app/not-found.tsx`; `test/A2dSeo.test.ts` |
| H2-30 | feito em 66a70ad, 8d243bb | `crm/crm.css` |
| H2-31 | feito em 86f0ae5 | `EnvIdentity.tsx` |
| H2-32 | feito em 164be1f; falta o lado a lado (com o H2-12) | `docs/DocumentDetail.tsx` |

Falta, na ordem: prova do H2-04 e do H2-08 no build final; lado a lado do documento (H2-12/32); `make test-web`, build e
`make e2e` no worktree `/tmp/hs-a2d`; relatório completo e "→ corrigido em A2d" na tabela (a) da H2.
| 20:32 | H2-08 provado no build de produção de `0856d41` (worktree `/tmp/hs-a2d`, build exit 0, `next start` na 3199, já parado): `/sobre` 190.529 → 32.892 bytes; `/` 277.732 → 78.059; `/en/about` 189.749 → 32.457; `/en/faq` 248.724 → 55.454; nomes de plataforma no HTML (Instagram, Google Ads, WhatsApp, Facebook, TikTok, Mailchimp, RD Station, HubSpot) 36 → 0 em cada uma; texto da área logada ("aguarda você") em `/sobre` 7 → 0. "Antes" = build de `7b83679` (`/tmp/hs-a2d-base`) | este | feito |
| 20:34 | `make test-web` na árvore principal: exit 0 (ESLint, `tsc` dos três pacotes; Vitest contracts 9, ui 49, web 35 arquivos / 406 testes). Testes da A2d um a um (`--reporter=verbose`): `A2dLocale` 7 (H2-04), `A2dMemoryTopics` 7 (H2-06), `A2dSeo` 39 (H2-26), `A2dDocs` 6 (H2-12/32), `A2dFidelity` 7 (H2-09/10/31), `A2dObjectConversation` 3 (H2-11), `A2dProject` 10 (H2-01), `A2bResults` 11 (H2-10/11); 8 arquivos, 90 passed | este | feito |
