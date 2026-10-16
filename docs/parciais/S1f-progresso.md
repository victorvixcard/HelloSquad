# S1f — Progresso (Stark)

**Fatia:** S1f, conversa completa (Fase 1): conversa em grupo com um especialista por vez, contexto de objeto
para todos os tipos do protótipo, tópico da Sala, não lidas por pessoa, cartão estruturado na mensagem do
agente, texto de status por etapa, ações da Memória que faltaram na S1d.
**Início:** 16/10/2026 11:47. **Especificação:** briefing do Thor (`briefings/FASE1_PROXIMAS_FATIAS.md`),
`FLUXOS_DA_V46.md` §4, §5, §10.1, §10.3 e §11, `x1/cartoes_da_conversa.txt`, `x1/notas_conversa_pendencias.md`
§A7–§A9, S1b §1, S1c §1–§2, S1d §1 e §7, S1e §1, A1a.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 11:51 | PASSO 0 lido (diretrizes, FLUXOS §4/§5/§10.1/§10.3/§11, 24 cartões, plano e respostas do Vic, S1b §1, S1c §1–§2, S1d §1/§7, S1e §1, A1a inteiro); protótipo conferido por linha: `GKEYS` (L5876–5884), `_groupThread` e `_groupSpeaker` (L7128–7145) | ✅ | `53b7e52` |
| 11:59 | Migrations `20261016150000_conversation_group_kind.sql` (valor `group`) e `…150100_complete_conversation.sql`: grupo de 2 a 6 (um por conjunto, à frente o Nexo ou o primeiro), contexto para os 12 tipos (5 lidos do banco, 7 por chave com título/estado no cartão; capacidade = uma por pedido), `context_meta` (período, origem), `topic` da Sala (só o agente escreve), `conversation_reads` + `app.mark_conversation_read`, `app.conversation_speaker` (GKEYS da L5876, `@Nome`, Nexo/primeiro) e `app.request_reply` (run de resposta sem trabalho, `runs.message_id`). `make migrate` aplicou; fumaça no psql: grupo `bia,kaia,otto` à frente Bia e reaberto; "legenda… instagram" → otto, "mercado e concorrência" → bia, "oi" → bia, "@Kaia" → kaia, "@Íris" fora do grupo → otto | ✅ | `0c34d43` |
| 12:02 | API dos itens 1–2: `POST …/conversations` aceita `kind=group` + `agent_ids` (2 a 6) e `context` com `id` ou `key` + `title`/`status`/`summary`/`period`/`origin`; `Conversation` ganha `context_key`, `topic`, `agent_ids`, `last_read_at`, `unread_count` (todos opcionais no contrato: o web compila sem mudar); cartão de contexto devolve tipo, título, estado, resumo, período e origem; `GET /workspaces/{id}/conversations/unread` (total, Sala, por especialista à frente); `POST /conversations/{id}/read`; `POST /messages/{id}/reply` (201/200, 409 se virou trabalho). curl contra a 8100: grupo à frente Bia, resposta pedida a Bia ("mercado"), 200 ao repetir, métrica com período e origem, grupo de 1 → 422. `make openapi` + `pnpm --filter contracts generate`; `pnpm --filter web typecheck` verde; pgTAP 14/01/15 PASS; pytest core+openapi 15 passed | ✅ | `b7efcae` |
| 12:12 | Worker e cartões (itens 1, 3 e 4): run de resposta sem trabalho (`run_reply`, `squad/conversa.md` no lugar da skill, fixture `conversa/reply.json`, sem reserva de crédito; na mesma conversa espera a vez enquanto outro run fala); migration `20261016150200_message_cards.sql` (`messages.card` tipado com 7 tipos, `work_item_id`/`delivery_version_id`/`approval_id` com FK composta e checagem por tipo; `approvals` ganha `unique (workspace_id, id)`); o worker grava o cartão `material` na entrega e `question` na pergunta do Nexo; `GET …/messages` devolve o cartão com o estado vivo (pendência, decisão, versão, trabalho); `status_mode`/`status_short`/`status_label` ("Otto · criando a primeira versão", "Bia · escrevendo") no `agent.thinking`, no `approval.requested` e no novo `conversation.typing`. pytest `test_conversation_complete` 7 passed; suíte inteira 123 passed (era 116; `test_worker` ajustado para os 3 eventos `conversation.typing`); contrato regenerado; `pnpm --filter web typecheck` verde | ✅ | `9943184` (autosave 12:10) + este |

## Notas do levantamento

- Grupo no protótipo (L7130): uma conversa por conjunto de especialistas (`g-<ids na ORDER>`), reaberta se o
  mesmo conjunto for escolhido de novo; quem está à frente é o Nexo se participa, senão o primeiro na ordem.
- Quem responde (L7141): conta as ocorrências das palavras de cada especialista (`GKEYS`) no texto; vence a
  maior contagem (empate: o primeiro na ordem); nenhuma: o Nexo se participa, senão o primeiro. O protótipo não
  interpreta `@Nome` ("Chamar" só escreve no campo); o briefing pede que direcione (pergunta 8 da §11).
- O web (A1a) só cria trabalho para pedido de legenda/texto (`deliveryForRequest`) e decide `answered` na
  pergunta pendente; mensagem comum não gera run. Não quebrar: cartão "Material · vN" relê `GET /runs/{id}` +
  `GET /work-items/{id}`; ordem dos eventos `delivery.created` → `message.created` → `approval.requested`.
- Créditos (S1e): reserva no `begin()`, captura no `deliver()` antes do `succeeded`, liberação pela trigger.
