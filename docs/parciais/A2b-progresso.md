# A2b — Progresso (Aranha)

**Fatia:** A2b, telas das deliveries novas (Fase 2). **Início:** 16/10/2026 16:42. **Alvo:** 75 min.
**Escopo:** `apps/web`, `packages/ui` e docs da fatia. O Stark está na S2c (`apps/backend`, `supabase/`, `squad/`): nada
lá é tocado; o que faltar na API vai para o relatório.

## PASSO 0 (16:42–16:46)

Lidos: `DIRETRIZES_DO_DONO.md` (inteiro), `PLANO_DE_ACAO_FASE2.md` (restrições e linha A2b), `FLUXOS_DA_V46.md` §1, §2,
§4 e §6, `S2a-relatorio.md` §1, `S2b-relatorio.md` §1, `S1f-relatorio.md` §1, `S1g-relatorio.md` §1, `A1b-relatorio.md`
§1 e §4, `A1c-relatorio.md` (H1-04), `A2a-relatorio.md` §1.

Regras que guiam a fatia:

- Segue o protótipo sempre; nada do combinado muda. Dúvida que a V4.6 não responde → registro e sigo.
- Todo texto novo nos três catálogos (pt-BR, en, es); paridade testada (`catalog-parity.test.ts`).
- Kaia: vazio honesto "aguardando o motor de imagem", sem fornecedor e sem data.
- Nada de preço na tela. Nenhum dado inventado: o que a API não devolve fica vazio honesto.
- Aprovar é só do owner (decisão de 16/10 08:55).

## Como a fatia está dividida (16:55)

Estrutura comum commitada por mim antes de abrir as frentes (`feb026c` e o autosave `a1dcc13`): mapa das entregas
(`lib/delivery-types.ts`), catálogo de pedidos (`lib/capabilities.ts`, textos em `caps.json`), documento revisável na
leitura editorial da V4.4 (`components/env/docs/DocumentDetail.tsx` + `DocumentBody` por família), áreas novas do
catálogo nos três idiomas e o alvo da conversa com o objeto da API (`shell-context.tsx`). Quatro sub-agentes meus, cada
um só nos próprios arquivos: Bia, Otto, Kiwi + Max, Íris. Eu fico com H1-04, catálogo, conversa do pedido, cartões de
contexto, Kaia, e2e final e relatório.

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | H1-04: "Conversar com <Nome>" abre a conversa do ambiente (primeira fala e sugestões da API) | feito, Vitest verde | `f5a8cb5`, `c476936`, `250920b` |
| 1 | Bia: 02.01, 02.02, 02.03, 02.04, 02.07 como documentos revisáveis | feito pela frente da Bia (Vitest 9/9) | `7ab6e20`, `e4e294a`, `c34b60b`, `13e37f4` |
| 2 | Otto: calendário 04.02 e posts multicanal 04.03 | em andamento (frente do Otto) | — |
| 3 | Kiwi 05.01/05.02 e Max (CSV, segmentos, campanha, sequências) | em andamento (frente Kiwi + Max) | — |
| 4 | Íris 07.02/07.03/07.04 e cartão `metric` | em andamento (frente da Íris) | — |
| 5 | Kaia "aguardando o motor" e cartões de contexto novos (pedido, publicação, indicador, oportunidade, segmento, documento) | feito | `c470380`, `f5a8cb5`, `c34b60b` |
| 6 | Vitest, e2e por ambiente, build, relatório | Vitest por item; e2e escritos; `make e2e` no fim | — |

Lado a lado das partes comuns em `docs/parciais/a2b/` (catálogo, conversa do ambiente, Kaia): `4fcd617`.
