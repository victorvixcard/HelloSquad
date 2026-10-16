# A2d — Relatório (Aranha)

**Fatia:** correções da H2 no web. **Data:** 16/10/2026, 19:45 → 20:52 (fechado). Área: `apps/web`, `packages/ui` e os
documentos da fatia; o Stark esteve em paralelo na S2g (`apps/backend`, `supabase/`, `squad/`). Até 20:15, três
sub-agentes do Aranha com arquivos exclusivos: (a) H2-04/06/08/22/24/26; (b1) P-01/03/04/05/07/08; (b2) P-09 a P-13. O
H2-01 foi meu. Às 20:27 o gateway abortou a sessão (ela ficou parada esperando os sub-agentes). Retomei às 20:30 a
partir do disco, sem sub-agentes: lista de conferência, provas no build final, uma regressão achada e corrigida
(§2) e este relatório. Lado a lado em `docs/parciais/a2d/`; o passo a passo com hora e hash está em `A2d-progresso.md`.

## 1. Achado → o que mudou → prova

### H2-01 — projeto coordenado no web (🔴 → corrigido)

| Achado | O que mudou | Onde |
|---|---|---|
| A Sala do Squad não respondia ao pedido de campanha | Na Sala do Squad e na conversa com o Nexo, "campanha" (pt-BR, en, es) vira o trabalho 01.02 da S2d (`POST /messages/{id}/work-items`); nas outras conversas, continua só mensagem | `lib/live/request.ts`, `components/product/use-squad-effect.ts`, `ConversationPanel.tsx` (flag `coordinator`) |
| "Coordenar uma campanha" abria a Bia (02.04) | A capacidade é do Nexo (`ag: 'coord'`, V4.6 L11353) e cria o 01.02; se faltar o tema, o Nexo pergunta e monta a equipe com a resposta | `lib/capabilities.ts`, `lib/delivery-types.ts` (`COORDINATED_DELIVERY`, `requestOwner`), `CapCatalog.tsx` |
| Sem cartão `team` | Cartão da V4.6 (L5541): "Squad da campanha · o Nexo coordena", um especialista por linha com a responsabilidade e "Abrir o projeto" | `components/product/TeamCard.tsx` |
| O projeto aparecia como "Entrega pontual · Nexo · legenda · Aprovar v1" | Tela da campanha da V4.6 (L5031–5066, L9197–9241): "projeto coordenado", origem, objetivo, equipe "Nexo e N", "Conversar na Sala do Squad"; uma faixa por etapa com o responsável e o estado (só a etapa em curso tem barra, indeterminada, L13957); abas Entregas/Decisões/Squad/Histórico (o histórico vem escrito pela API); "Próxima decisão" e "Combinado". A decisão aparece só na etapa que espera a pessoa, com nova proposta e cancelar o trabalho (`2540657`); a Kaia fica "Aguardando o motor de imagem", sem botão e sem travar o Otto | `components/env/projects/CoordinatedWork.tsx`, `trabalho/[id]/page.tsx` |
| O cartão do material dizia o título do pedido | No projeto coordenado, "Etapa N · título" | `MaterialCard.tsx`, `actions.ts` (`step`) |
| Quadro e Lista tratavam o 01.02 como entrega | "Projeto", com o nome do projeto e "etapa N de M" | `projects/board.ts`, `ProjectsPage.tsx`, `AllWorks.tsx` |

Commits: `5492078`, `d8df994`, `4e529e0`, `13af0e2`, `fc07e25`, `2540657`.

**Prova (e2e pelo browser no build final `56777d7`, worktree `/tmp/hs-a2d`, build exit 0, web 3199, trava do banco):**

```text
$ cd /tmp/hs-a2d && E2E_SCREENSHOTS=/tmp/a2d-r-shots WEB_PORT=3199 make e2e
✓   6 [chromium] › e2e/a2d-projeto.spec.ts:32:7 › Projeto coordenado (A2d, H2-01), com o worker do squad em modo simulado › Marina pede a campanha na Sala, aprova a Bia, a Kaia aguarda o motor, o Otto entrega com a estratégia e o projeto fecha (7.1s)
✓   7 [chromium] › e2e/a2d-projeto.spec.ts:124:7 › Projeto coordenado (A2d, H2-01), com o worker do squad em modo simulado › Coordenar uma campanha (catálogo do Nexo) abre o Nexo, ele pergunta antes de montar a equipe e a resposta monta o projeto (4.8s)
28 passed (58.5s)
```

O que o e2e 1 afirma, na ordem: a mensagem da Marina na Sala; o cartão da equipe com Bia "estratégia e conceito",
Kaia "peças da campanha" e Otto "legendas e roteiros"; o material "Etapa 1 · Estratégia"; "Abrir o projeto" leva a
`/squad/nexo/trabalho/<id>` com o h1 "Campanha de Natal", "projeto coordenado" e o objetivo; a etapa 1 em "v1 aguarda
você" e **um único** "Aprovar v1" (o da Bia); depois da aprovação, a etapa 2 fica "Aguardando o motor de imagem" sem
botão e a etapa 3 chega a "v1 aguarda você"; o run do Otto tem o handoff da etapa 1 no contexto
(`run_context_items.kind = step`, consulta ao banco local); aprovado o Otto, nenhum "Aprovar", "Nenhuma decisão
pendente", duas decisões aprovadas, um responsável por etapa na aba Squad, `work_items.status = done` e
`projects.status = done`; em Projetos, o cartão "Projeto · Campanha de Natal" aparece entre os concluídos. O e2e 2 termina
cancelando o trabalho pela etapa. Capturas regeradas nesta rodada (`/tmp/a2d-r-shots`) e as do repositório:
`a2d/a2d-sala-campanha.png`, `a2d-projeto-estrategia.png`, `a2d-projeto-textos.png`, `a2d-projeto-fechado.png`,
`a2d-projetos-quadro.png`, `a2d-nexo-catalogo-equipe.png`. Lado a lado: `a2d/proto-sala-campanha.png` ×
`a2d/a2d-sala-campanha.png`; `a2d/proto-projeto-estrategia.png` × `a2d/a2d-projeto-estrategia.png`. Testes de
componente: `test/A2dProject.test.tsx`, 10 passed.

### H2-04 — idioma do negócio na web (🟡 → corrigido)

- **Mudou:** o middleware resolve pessoa → negócio → pt-BR (`resolveRequestLocale`, `i18n/resolve.ts`): primeiro o
  `user_metadata.locale` da pessoa; sem ele, o negócio da rota `/app/<slug>`, lido do cookie `hs_ws_locale`
  (`slug:idioma`, httpOnly, `path=/app`, 5 min) ou, sem cookie, de `GET /me` (`memberships[].workspace.locale`), com
  `fetch` puro (o middleware roda no Edge) e 2 s de limite; por fim, pt-BR. Commits `13f51b5` e `cded43d`. O e2e
  `e2e/a2d-idioma.spec.ts` era o arquivo solto da sessão abortada (o autosave o commitou em `a45538b`); avaliei e ficou:
  é o e2e que a H2 pede.
- **Prova:** `test/A2dLocale.test.ts` 7 passed (a pessoa vence o negócio e nem consulta a API; pessoa sem idioma
  num negócio en vê en e guarda o cookie; o cookie vale só para o mesmo slug; sem nada, pt-BR; idioma desconhecido é
  ignorado). E2e no build final:

```text
✓   4 [chromium] › e2e/a2d-idioma.spec.ts:34:7 › Idioma da área logada (A2d, H2-04) › sem idioma próprio, o Rafael vê a Vitta no idioma do negócio (en) (388ms)
✓   5 [chromium] › e2e/a2d-idioma.spec.ts:41:7 › Idioma da área logada (A2d, H2-04) › com idioma próprio (es), a Carla vê a Vitta no dela, não no do negócio (420ms)
✓  16 [chromium] › e2e/onboarding.spec.ts:132:7 › Idioma por pessoa (A2a, ADR-0010) › Marina troca para en, vê a casca traduzida (também depois de recarregar) e volta para pt-BR (2.0s)
$ … playwright test e2e/onboarding.spec.ts:132 e2e/a2d-idioma.spec.ts --repeat-each=4
  12 passed (14.3s)
```

### H2-06 — web grava e compara texto em pt-BR (🟡 → corrigido no web)

- **Mudou:** a Memória compara o assunto por um id estável (`topicIdOf`) e mostra o rótulo pelo catálogo; a ordem
  da V4.5 e os "Principais conhecimentos" saem pelo id, em qualquer idioma (`854a94d`); o objetivo do primeiro
  acesso é gravado com o assunto e a chave do catálogo no idioma do negócio e reconhecido nos três idiomas
  (`5f775dc`; catálogo `memory.json` no autosave `7f3e2ef`).
- **Prova:** `test/A2dMemoryTopics.test.ts` 7 passed (pt-BR, en e es levam ao mesmo id; os nomes que o backend
  grava resolvem no id certo; a ordem da V4.5 num negócio en; o dossiê acha a proposta de valor e o tom de voz pelo
  id; o objetivo vem do catálogo no idioma do negócio).
- **Limite:** o banco continua com texto (é o que o backend grava); o id estável está no web. Ver §3.

### H2-08 — catálogo inteiro no HTML público (🟡 → corrigido)

- **Mudou:** cada parte do site entrega ao browser só as áreas do catálogo que usa (`i18n/client-messages.ts`): a
  raiz leva `system` (páginas de erro); entrar e criar conta, `auth` + `system`; a área logada, tudo menos `site`
  (`c617590`). Às 20:43 reverti essa mudança por engano (`10a82c7`), achando que ela causava a regressão do §2; o
  bisect mostrou outra causa e ela voltou em `f0850c1`.
- **Prova** (build de produção, `next start` na 3199; "antes" é o build de `7b83679`):

| Página | HTML antes | HTML depois | Nomes de plataforma* antes → depois |
|---|---|---|---|
| `/sobre` | 190.529 | 32.892 | 36 → 0 |
| `/` | 277.732 | 78.059 | 36 → 0 |
| `/en/about` | 189.749 | 32.457 | 36 → 0 |
| `/en/faq` | 248.724 | 55.454 | 36 → 0 |
| `/entrar` | — | 19.770 | — → 0 |

\* `grep -o -i -E 'instagram|google ads|whatsapp|facebook|tiktok|mailchimp|rd station|hubspot' | wc -l`. Texto da
área logada em `/sobre` ("aguarda você"): 7 → 0.

### H2-09 a H2-12 — fidelidade à V4.6 (🟡 → corrigido no web; P-02 fica com o backend)

| Item | O que mudou | Commit | Prova |
|---|---|---|---|
| H2-09 (P-01) | Em Conteúdo, "Desempenho orgânico" e "Otto percebeu" leem as séries da Íris (visitas ao site e alcance da semana, com a variação); o vazio da V4.6 aparece só quando não há número | `75fa1db` | `A2dFidelity` (3 testes do H2-09); `a2d/proto-otto-desempenho.png` × `nosso-otto-desempenho.png`, `proto-otto-cards.png` × `nosso-otto-cards.png` |
| H2-09 (P-02) | **Não mudou:** a primeira fala da Íris no ambiente vem do backend (`conversations/opening.py:139-140`, `environment.first.iris.no_data`) | — | §3 |
| H2-10 (P-03, P-04, P-05) | "Desempenho por canal" em três colunas (`.rs-cr`: nome, variação, valor), sem sobreposição e sem corte; as faixas do gráfico de 12 semanas têm o nome do período; botão redondo de conversa no cabeçalho de "Análises recentes" e de "Desempenho por canal" | `aaa87b3` (parte no autosave `84efdf1`), `e60c9f6` | `A2dFidelity` (3 testes do H2-10), `A2bResults` 11; `a2d/proto-iris-canais.png` × `nosso-iris-canais.png`, `-grafico`, `-grafico-semana`, `-analises`, `-cards` |
| H2-11 (P-09, P-10) | As conversas de indicador, publicação e oportunidade abrem com "Hoje" e as três sugestões da V4.6; a do indicador traz o cartão com número, variação e curva da série no histórico e na coluna "Contexto da conversa" | `ad9f939`, `c666862` | `A2dObjectConversation` 3; `a2d/proto-indicador-painel.png` × `nosso-indicador-painel.png`, `proto-indicador-contexto.png` × `nosso-indicador-contexto.png` |
| H2-12 (P-11, P-13) | O cartão da decisão traz a regra da V4.4 ("Aprovar o diagnóstico não cria trabalhos…", "Aprovar o plano define a direção…") no lugar do texto da legenda; em "Versões", cada versão ocupa uma linha da largura do card, com número e data nas pontas, e a versão aberta leva `.is-cur` | `164be1f` | `A2dDocs` 6; `a2d/proto-doc-decisao.png` × `nosso-doc-decisao.png` (captura do e2e `a2b-bia` no build final) |

### Notas ℹ️ corrigidas

| Item | O que mudou | Commit | Prova |
|---|---|---|---|
| H2-22 | `app/error.tsx`, `app/global-error.tsx` e `app/app/[workspace]/error.tsx` no idioma da tela (catálogo `system`, três idiomas). O `app/app/loading.tsx` saiu de novo (§2) | `992509c`, `56777d7` | build exit 0; não forcei um erro de execução para ver a página (só leitura do código e build) |
| H2-24 | `app/icon.svg` (placeholder da marca) e `/favicon.ico` → 308 para o ícone | `418093c` | build final: `/icon.svg` 200 `image/svg+xml`; `/favicon.ico` 308 |
| H2-26 | Cada `@id` citado no JSON-LD resolve na própria página (as internas levam a Organization mínima); o 404 tem uma meta robots só | `87a822c`, `7b8970f` (`site-seo.ts` no autosave `84efdf1`) | `A2dSeo` 39 passed; build final: `/squad/bia` 1 bloco, 0 `@id` sem definição; `/squad/inexistente` 404 com **1** `<meta name="robots" content="noindex"/>` |
| H2-30 (P-07) | A frase "Nada é enviado sem consentimento…" com o respiro do cartão do CRM; o seletor vence o reset do CSS portado | `66a70ad`, `8d243bb` | `a2d/proto-max-consentimento.png` × `nosso-max-consentimento.png` |
| H2-31 (P-08) | O objeto da conversa do ambiente da Kiwi se chama "Growth" (nome curto da barra); o título da tela continua "Growth Marketing" | `86f0ae5` | `A2dFidelity` (H2-31); `a2d/proto-kiwi-objeto.png` × `nosso-kiwi-objeto.png` |
| H2-32 (P-12) | Migalha igual ao h1 (o título do documento); "Conversar sobre o diagnóstico" e "Conversar sobre as prioridades" | `164be1f` | `A2dDocs` (2 testes do P-12); `a2d/nosso-doc-decisao.png` |

### Verificação geral (build final)

```text
$ make test-web        # árvore principal, depois da última mudança de código (56777d7)
TESTWEB_EXIT=0
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  35 passed (35)
apps/web test:       Tests  406 passed (406)
$ cd /tmp/hs-a2d && pnpm --filter web build        # exit 0
$ cd /tmp/hs-a2d && E2E_SCREENSHOTS=/tmp/a2d-r-shots WEB_PORT=3199 make e2e
E2E_EXIT=0
  28 passed (58.5s)
```

ESLint e `tsc` dos três pacotes entram no `make test-web`. Testes da A2d por arquivo (`--reporter=verbose`): 8 arquivos,
90 passed.

## 2. Regressão achada na retomada e corrigida

O primeiro `make e2e` da retomada deu **1 failed, 21 passed**: em `onboarding.spec.ts:132` (A2a), a Marina escolhe
English e a casca continua em pt-BR. Era a mesma falha que a sessão anterior viu e não fechou: repetida 8 vezes, falhou
6 no código da A2d e passou 8 de 8 na base `7b83679`. Uma sonda pelo browser mostrou que a ação grava o idioma
(recarregar dá en) e que o servidor já devolve o RSC em en, mas o `router.refresh()` não aplica a resposta. Bisect no
worktree, com o teste repetido 4 vezes: sem o middleware novo (H2-04), falha; sem o provider por área (H2-08), falha
(3 de 4); **sem o `app/app/loading.tsx` (H2-22), 4 de 4**. Tirei o `loading.tsx` e a chave `system.loading` (`56777d7`).
Com o build final: 28 passed, e o teste da troca de idioma com o e2e do H2-04, repetidos 4 vezes: 12 passed.
Consequência: a área logada fica sem a tela "Carregando…" (como antes da A2d). As páginas de erro do H2-22 ficam.

## 3. O que precisaria da API e não existe

- **P-02 (parte do H2-09):** a primeira fala da conversa do ambiente da Íris é escrita pelo backend
  (`conversations/opening.py:139-140`) e sempre diz "Ainda não tenho números…", mesmo com `metrics_daily` no banco.
  Para ler a última semana, é preciso mudar o backend (área do Stark). No web, nada a fazer.
- **H2-06:** id estável no banco para o assunto e a chave da Memória. Hoje o backend grava texto (no idioma do
  negócio) e o web traduz os três idiomas para o mesmo id. Um campo de id no contrato da Memória tiraria essa
  tradução.

## 4. O que ficou de fora

- O resto do P-12 (ℹ️): o documento tem um cartão com o rosto "Bia" que a V4.6 não tem. O H2-32 não o inclui, então
  não mexi (pergunta 2).
- O "Carregando…" da área logada (§2).

## 5. Perguntas

1. **Ao Thor:** a área logada fica sem `loading.tsx`, porque ele impede a troca de idioma da A2a de aplicar no
   `router.refresh()`. Vale uma investigação à parte (um nível mais baixo, ou a troca recarregar a página), ou fica
   assim?
2. **Ao dono:** o cartão com o rosto da Bia no documento (abaixo de "Conversar sobre o diagnóstico") não existe na
   V4.6. Tirar, para ficar igual ao protótipo, ou manter?

## 6. Onde discordei do briefing

Em nada do combinado. A retirada do `loading.tsx` desfaz uma parte do H2-22 que esta mesma fatia tinha criado: entre a
página de carregamento e a troca de idioma da A2a (combinado e testado), mantive a A2a.
