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
| 20:43 | `make e2e` no worktree (`85cb256`, 3199): **1 failed, 21 passed**: `onboarding.spec.ts:132` (Marina troca para en; a casca fica em pt-BR). Mesma falha da sessão anterior (`rep`: 6 de 8; base `7b83679`: 8 de 8). Sonda pelo browser: a ação grava o idioma (recarregar dá en), o servidor já devolve o RSC em en, mas o `router.refresh()` não aplica. Primeira suspeita, o H2-08, revertido | 10a82c7 | errado |
| 20:46 | O revert do H2-08 não mudou nada (3 de 4 falhas); bisect: **sem `app/app/loading.tsx` (H2-22), 4 de 4** com H2-04 e H2-08 no lugar. H2-08 restaurado; `loading.tsx` e a chave `system.loading` saem | f0850c1, 56777d7 | feito |
| 20:47 | `make e2e` no worktree (`56777d7`, build exit 0, 3199): **28 passed (58,5 s)**; repetição `onboarding.spec.ts:132` + `a2d-idioma.spec.ts` ×4: **12 passed (14,3 s)** | este | feito |
| 20:49 | `make test-web` de novo depois da retirada do `loading.tsx`: exit 0 (contracts 9, ui 49, web 406). Lado a lado do documento (H2-12/H2-32): `a2d/nosso-doc-decisao.png` (captura do e2e `a2b-bia`, build final) × `a2d/proto-doc-decisao.png`. H2-24/H2-26 no build final: `/icon.svg` 200 `image/svg+xml`, `/favicon.ico` 308 para o ícone; 404 com **uma** meta robots (`noindex`); `/squad/bia` sem `@id` citado e não definido na página | este | feito |
| 20:51 | Relatório completo (`A2d-relatorio.md`) e "→ corrigido em A2d (<hash>)" nas linhas corrigidas da H2 (tabela (a) e notas H2-22/24/26/30/31/32) | 7226545, 3784f8c | feito |
| 20:52 | Fechamento: banco no seed (os três negócios em pt-BR, nenhuma pessoa com `locale`), nada meu na 3198/3199, nenhum worker; web 3100 e API 8100 do dono no ar (200); worktrees `/tmp/hs-a2d` e `/tmp/hs-a2d-base` removidos | este | feito |

### Lista de conferência (fechamento, 20:52)

Feitos: H2-01, H2-04, H2-06, H2-08, H2-10, H2-11, H2-12, H2-24, H2-26, H2-30, H2-31 e H2-32, com os hashes da lista
de 20:30 (H2-08 em `c617590`, revertido por engano em `10a82c7` e restaurado em `f0850c1`). H2-22: as páginas de erro
ficam (`992509c`) e o `loading.tsx` saiu (`56777d7`, regressão da troca de idioma). H2-09: o web está feito
(`75fa1db`); o P-02 depende do backend. **Progresso fechado.**
