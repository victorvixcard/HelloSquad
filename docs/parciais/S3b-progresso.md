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
| 1 | Schema `responsibilities`, `responsibility_runs`, `responsibility_events` + RLS + seed da Miolo | em andamento |
| 2 | Delegação pela conversa (01.04) + rotas | pendente |
| 3 | Scheduler (tick por minuto, advisory lock, tentativas, reagendamento) | pendente |
| 4 | Rotinas iniciais `plan`, `res`, `seo`, `reat` com fixtures | pendente |
| 5 | pytest + pgTAP + OpenAPI + contracts + Realtime + SETUP_LOCAL + relatório | pendente |

## Registro

- 07:5x — PASSO 0 lido; progresso aberto.
