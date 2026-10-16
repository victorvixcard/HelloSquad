# S1a — progresso (Stark)

Schema do núcleo da Fase 1 (conversa → trabalho → entrega → aprovação → histórico). Só banco: migrations,
funções, RLS, filas, Realtime e pgTAP. Início: 16/10/2026, 03:26.

| Item | Estado |
|---|---|
| 1. Enums e tabelas (conversas, mensagens, projetos, trabalhos, entregas, aprovações, runs) | feito: migration `20261016063500`, 13 tabelas com RLS forçada e só SELECT para `authenticated`, `app.post_message`; pgTAP 08 (12) e 09 (16) verdes, 01 continua verde |
| 2. Máquina de estados dos trabalhos (`work_item_transitions`, `app.transition_work_item`) | feito: migration `20261016063600` (matriz de 23 transições em `app.work_item_transitions`, trigger que recusa UPDATE fora da matriz, `app.decide_approval` idempotente); pgTAP 10 (17) e 11 (20) verdes |
| 3. Filas pgmq, `app.enqueue_run`, `app.create_work_item_from_message` | feito: migration `20261016063700` (4 filas, schema `pgmq` fechado para `authenticated`/`anon`/`service_role`, trabalho + run + fila na mesma transação, idempotente); pgTAP 12 (18) verde |
| 4. Realtime Broadcast a partir do banco (`run_events`, `approvals`) | feito: migration `20261016063800` (triggers com `realtime.send` no tópico privado `workspace:<id>`, política de SELECT em `realtime.messages`, sem política de INSERT); pgTAP 13 (13) verde: membro lê, Vitta/Pedro/anon não |
| 5. pgTAP das novas tabelas e funções | feito: arquivos 08 a 13 (96 asserções novas); `make test-db` 14 arquivos, 216 testes, PASS |
| 6. Seed da Miolo (conversas, mensagens, trabalho 04.01 em `needs_you`) | feito: bloco `$seed_nucleo$` com ids e horários fixos; `make seed` duas vezes seguidas, mesmo estado (Miolo 2 conversas, 3 mensagens, 1 trabalho, 1 review pendente; Vitta e Trilha vazias; filas vazias) |
| 7. `docs/SETUP_LOCAL.md` (linha do web e filas pgmq) | feito: linha do web trocada pelo texto da A0b §3 item 6; linha nova sobre inspecionar as filas (comando conferido) |
| 8. Relatório `S1a-relatorio.md` | pendente |

## Notas

- PASSO 0 lido: diretrizes, plano da Fase 1 (fila inteira), arquitetura §3, §4.2, §5.2, §11, Documento
  Mestre §5, §7, §8, §11, S0 §3 e §4, S0b, migrations e `01_rls_coverage`.
- Ambiente local: Postgres 17.11, pgmq 1.5.1 no schema `pgmq` (sem USAGE para `authenticated`),
  `realtime.send(jsonb, text, text, boolean)` presente; `realtime.messages` particionada por dia, dono
  `supabase_realtime_admin`, e o `postgres` consegue criar política nela (supautils).
- Não toco em `apps/web/` nem crio endpoint. `docs/PLANO_DE_ACAO_FASE0.md` modificado no disco não é meu
  e fica fora dos meus commits.
