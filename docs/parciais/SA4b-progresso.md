# SA4b — UI de Consumo por cliente, Qualidade das entregas e Saúde das APIs · progresso

Aranha (Frontend & Design), 16/10/2026, início 23:04. Área: `apps/web` (rotas `/admin/consumo`, `/admin/qualidade`, `/admin/saude`, contadores da barra lateral), `packages/ui` (se preciso) e os documentos da fatia. Em paralelo com a SA6a do Stark (`apps/backend`, `supabase/`). Sem sub-agentes.

## PASSO 0 (lido)

- `docs/DIRETRIZES_DO_DONO.md`: preço por último (valores provisórios e faixas de alerta sempre marcados); segredos nunca no painel (só "configurada/ausente"); i18n nos 3 catálogos; nada do combinado muda.
- `docs/PLANO_DE_ACAO_SA.md` (linha SA4) e `docs/SUPER_ADMIN.md` §2 (Consumo por cliente, Saúde das APIs, Qualidade das entregas).
- `docs/parciais/SA0-relatorio.md` §4 item 9 (faixas dos alertas são proposta do protótipo, marcadas; nada muda automaticamente); protótipo `design/super-admin-proto/` (`consumo`, `saude-apis`, `qualidade`).
- `docs/parciais/SA4a-relatorio.md` §1 e §6 (mapa protótipo → API: `/admin/consumption` `items[]`, `/admin/alerts`, `/admin/quality` e `/admin/quality/compare`, `/admin/providers` e `PATCH …/balance`).
- `docs/parciais/SA2-relatorio.md` §1 e §5 (casca, contadores da barra que ficaram de fora) e `SA3b-relatorio.md` §1 (diálogos, versões).

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | Abertura do progresso | feito | `0a1034d` |
| 1 | Consumo por cliente (período, por conta, alertas econômicos com faixas "Proposta", margem "Provisória", série por dia/semana/mês) e contadores na barra via `/admin/alerts` | feito | `9e00bc9`, `30a93f0` |
| 2 | Qualidade das entregas (por tipo, por mês, por versão de prompt, comparar dois meses, "como ler" da API no idioma da tela) | feito | `2e52612`, `30a93f0` |
| 3 | Saúde das APIs (estado por provedor, chave configurada/ausente, gasto, chamadas e falhas, informar saldo em diálogo, alerta abaixo do limiar) | feito | `1801e65`, `4f1ca19` |
| 4 | Vitest (15), e2e (2, worktree `/tmp/sa4b-wt`, web na 3200), lado a lado, relatório | feito | `0270c72`, `c38c9b2`, `b042ebb`, `8f4db90`, `ae66125`, relatório |

## Fechamento (23:45)

Vitest da fatia 15/15; `make test-web` verde (web 455, ui 50, contracts 9); e2e 7/7 no worktree `/tmp/sa4b-wt` (os 2 da SA4b, os 2 da SA3b e os 3 da SA2, web de produção na 3200); banco do dono de volta ao seed (saldo nulo, 0 relatórios e 0 eventos de saldo, versões do squad todas ativas); lado a lado em `docs/parciais/sa4b/`. Relatório: `docs/parciais/SA4b-relatorio.md`.
