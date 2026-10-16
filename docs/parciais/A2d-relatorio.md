# A2d — Relatório (Aranha)

**Fatia:** correções da H2 no web. **Data:** 16/10/2026, 19:45 → (em fechamento). Área: `apps/web`, `packages/ui` e os
documentos da fatia; o Stark esteve em paralelo na S2g (`apps/backend`, `supabase/`, `squad/`). Três sub-agentes do
Aranha com arquivos exclusivos: (a) H2-04/06/08/22/24/26; (b1) P-01/03/04/05/07/08; (b2) P-09 a P-13. O H2-01 foi meu.
Lado a lado em `docs/parciais/a2d/`.

## 1. Achado → o que mudou → prova

### H2-01 — projeto coordenado no web (🔴 → corrigido)

| Achado | O que mudou | Onde |
|---|---|---|
| A Sala do Squad não respondia ao pedido de campanha | Na Sala do Squad e na conversa com o Nexo, "campanha" (pt-BR, en, es) vira o trabalho 01.02 da S2d (`POST /messages/{id}/work-items`); nas outras conversas segue só mensagem | `lib/live/request.ts`, `components/product/use-squad-effect.ts`, `ConversationPanel.tsx` (flag `coordinator`) |
| "Coordenar uma campanha" abria a Bia (02.04) | A capacidade é do Nexo (`ag: 'coord'`, V4.6 L11353) e cria o 01.02; o Nexo pergunta se faltar tema e monta a equipe com a resposta | `lib/capabilities.ts`, `lib/delivery-types.ts` (`COORDINATED_DELIVERY`, `requestOwner`), `CapCatalog.tsx` |
| Sem cartão `team` | Cartão da V4.6 (L5541): "Squad da campanha · o Nexo coordena", um especialista por linha com a responsabilidade, "Abrir o projeto" | `components/product/TeamCard.tsx` |
| Projeto aparecia como "Entrega pontual · Nexo · legenda · Aprovar v1" | Tela da campanha da V4.6 (L5031–5066, L9197–9241): "projeto coordenado", origem, objetivo, equipe "Nexo e N", "Conversar na Sala do Squad"; uma faixa por etapa com o responsável e o estado (só a etapa em curso tem barra, indeterminada, L13957); abas Entregas/Decisões/Squad/Histórico (histórico escrito pela API); "Próxima decisão" e "Combinado". Decisão só na etapa que espera a pessoa; Kaia "Aguardando o motor de imagem" sem botão e sem travar o Otto | `components/env/projects/CoordinatedWork.tsx`, `trabalho/[id]/page.tsx` |
| Cartão do material dizia o título do pedido | No projeto coordenado, "Etapa N · título" | `MaterialCard.tsx`, `actions.ts` (`step`) |
| Quadro/Lista tratavam o 01.02 como entrega | "Projeto", com o nome do projeto e "etapa N de M" | `projects/board.ts`, `ProjectsPage.tsx`, `AllWorks.tsx` |

**Prova (e2e novo pelo browser, worktree `/tmp/hs-a2d`, build exit 0, web 3199, trava do banco):**

```text
$ flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3199 \
    pnpm --filter web exec playwright test e2e/a2d-projeto.spec.ts --reporter=line
[1/2] … › Marina pede a campanha na Sala, aprova a Bia, a Kaia aguarda o motor, o Otto entrega com a estratégia e o projeto fecha
[2/2] … › Coordenar uma campanha (catálogo do Nexo) abre o Nexo, ele pergunta antes de montar a equipe e a resposta monta o projeto
  2 passed (15.9s)
```

O que o e2e 1 afirma, na ordem: a mensagem da Marina na Sala; o cartão da equipe com Bia "estratégia e conceito",
Kaia "peças da campanha", Otto "legendas e roteiros"; o material "Etapa 1 · Estratégia"; "Abrir o projeto" leva a
`/squad/nexo/trabalho/<id>` com h1 "Campanha de Natal", "projeto coordenado" e o objetivo; etapa 1 "v1 aguarda você" e
**um único** "Aprovar v1" (o da Bia); aprovado, a etapa 2 fica "Aguardando o motor de imagem" sem botão e a etapa 3
chega a "v1 aguarda você"; o run do Otto tem o handoff da etapa 1 no contexto (`run_context_items.kind = step`,
consulta no banco local); aprovado o Otto, nenhum "Aprovar", "Nenhuma decisão pendente", duas decisões aprovadas,
Squad com um responsável por etapa, `work_items.status = done` e `projects.status = done`; em Projetos, o cartão é
"Projeto · Campanha de Natal" nos concluídos. Capturas: `a2d/a2d-sala-campanha.png`, `a2d-projeto-estrategia.png`,
`a2d-projeto-textos.png`, `a2d-projeto-fechado.png`, `a2d-projetos-quadro.png`, `a2d-nexo-catalogo-equipe.png`.

Lado a lado: `a2d/proto-sala-campanha.png` × `a2d/a2d-sala-campanha.png`; `a2d/proto-projeto-estrategia.png` ×
`a2d/a2d-projeto-estrategia.png`. Testes de componente: `test/A2dProject.test.tsx` (8 passed).

<!-- itens dos sub-agentes entram aqui -->
