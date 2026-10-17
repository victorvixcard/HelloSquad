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
| 0 | Abertura do progresso | feito | este |
| 1 | Consumo por cliente (período, por conta, alertas econômicos com faixas "Proposta", margem "Provisória", contadores na barra via `/admin/alerts`) | em andamento | — |
| 2 | Qualidade das entregas (por tipo, por mês, por versão de prompt, comparar dois períodos, "como ler" do catálogo) | pendente | — |
| 3 | Saúde das APIs (estado por provedor, gasto, chamadas e falhas, chave configurada/ausente, informar saldo, alerta abaixo do limiar) | pendente | — |
| 4 | Vitest, e2e (worktree `/tmp`), lado a lado, relatório | pendente | — |
