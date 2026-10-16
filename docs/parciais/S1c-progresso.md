# S1c — Progresso (Stark)

**Fatia:** S1c, runtime do squad v0 (worker, adaptador de LLM, montagem de prompt, fluxo Nexo → Otto 04.01).
**Início:** 16/10/2026 08:27.

| Hora | Item | Estado |
|---|---|---|
| 08:27 | PASSO 0 lido (diretrizes com a regra do dono de 16/10, plano, S1a, S1b, Arquitetura §4.2 e §5.4, `squad/`, catálogo 04.01 e §8 do Documento Mestre) | ✅ |
| 08:35 | 1. Adaptador de LLM (interface, Anthropic, simulado, custo) | 🟡 em execução |
| — | 2. Montagem de prompt e `agent_prompt_versions` | ⚪ |
| — | 3. Worker (`hellosquad-worker`) | ⚪ |
| — | 4. Fluxo v0 Nexo → Otto (04.01) | ⚪ |
| — | 5. Testes (unitários e integração) | ⚪ |
| — | 6. `make worker`, `.env.example`, `SETUP_LOCAL.md`, relatório | ⚪ |

## Notas do levantamento

- Run criado por `app.create_work_item_from_message` já nasce com `agent_id` = dono da delivery (Otto para 04.01)
  e a mensagem da fila leva `run_id`, `workspace_id`, `kind`, `agent_id`, `work_item_id`, `conversation_id`.
- `workspaces.locale` ainda não existe (ADR-0010): migration pequena com default `pt-BR`.
- Papel privilegiado hoje é o `postgres` (pendência 2 da S1a); o worker usa `DATABASE_URL`.
