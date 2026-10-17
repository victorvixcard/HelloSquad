# S3b — progresso (Responsabilidades, scheduler e execuções do Modo Autônomo)

Fatia da Fase 3, Stark. Início 17/10/2026 07:45. Áreas: `apps/backend`, `supabase/`, `squad/`, `packages/contracts` (gerado), docs da fatia.

## PASSO 0 (lido)

- `docs/DIRETRIZES_DO_DONO.md`: só o owner aprova e autoriza; autorização antecipada de publicação agendada é desta fase; Kaia atrás do adaptador.
- `docs/PLANO_DE_ACAO_FASE3.md`: linha S3b, restrições, perguntas ao Vic com leitura conservadora (autorização antecipada só para itens aprovados no plano; fuso do negócio; Meta Ads só leitura).
- `docs/FLUXOS_DA_V46.md` §7 inteiro, §3.3, §8 (gancho `blocked_by_connection` para a S3a).
- `docs/parciais/x1/notas_memoria_autonomo_conexoes.md` §B.

## Itens

| # | Item | Estado |
|---|---|---|
| 1 | Schema `responsibilities`, `responsibility_proposals`, `responsibility_runs`, `responsibility_events` + RLS + seed da Miolo | feito (`f427478`, `63b0348`, `ed4e27a`) |
| 2 | Delegação pela conversa (01.04) + rotas | feito (`4102348`, `90ca7aa`) |
| 3 | Scheduler (tick por minuto, trava consultiva, tentativas, reagendamento) | feito (`f36c295`, `bcaf1b3`) |
| 4 | Rotinas iniciais `plan`, `res` (07.05 + 07.06), `seo`, `reat` com fixtures | feito (`f36c295`, `1db6178`) |
| 5 | pytest + pgTAP + OpenAPI + contracts + Realtime + SETUP_LOCAL + relatório | feito (`2edfb44`, `6ab2916`, `33ae1b5`, `c25d8a0`, `7a6b843`) |

## Registro

- 07:50 — PASSO 0 lido; progresso aberto.
- 07:58 — migration do schema aplicada; seed da Miolo conferido (estados, próximas, imutabilidade, seed idempotente).
- 08:02 — catálogo dos modelos e 288 textos `autonomy.*` em pt-BR, en e es (teste do catálogo verde).
- 08:06 — scheduler, worker lendo `runs_scheduled`, Íris 07.05; API com 12 rotas.
- 08:10 — pytest `test_autonomy` 8/8; pgTAP `33_responsibilities` verde.
- 08:14 — contrato 107 → 119 operações; suítes completas verdes (pytest 339, pgTAP 923).
- 08:16 — roteiro ponta a ponta com scheduler, worker e API reais; `SETUP_LOCAL.md`.
- 08:18 — checagem no banco contra ação autorizada fora do "Publicar sozinho"; suítes finais: pytest 339, pgTAP 926, typecheck do web ok.
- 08:20 — relatório `S3b-relatorio.md`. Fatia fechada.
