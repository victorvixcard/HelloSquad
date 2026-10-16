# S1c — Progresso (Stark)

**Fatia:** S1c, runtime do squad v0 (worker, adaptador de LLM, montagem de prompt, fluxo Nexo → Otto 04.01).
**Início:** 16/10/2026 08:27. **Fechamento:** 09:10 (relatório em `S1c-relatorio.md`).

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 08:27 | PASSO 0 lido (diretrizes com a regra do dono de 16/10, plano, S1a, S1b, Arquitetura §4.2 e §5.4, `squad/`, catálogo 04.01 e §8 do Documento Mestre) | ✅ | `299c5bf` |
| 08:40 | 1. Adaptador de LLM (interface, Anthropic, simulado, custo) — pytest `test_llm` 10 | ✅ | `3f752d7` |
| 08:44 | 2. Montagem de prompt, skills 04.01 e 01.01, `agent_prompt_versions`, migration do runtime — pytest `test_squad_prompt` 5 | ✅ | `71b5983` |
| 08:50 | 3 e 4. Worker e fluxo Nexo → Otto — pytest `test_worker` 7 | ✅ | `abf64cc` |
| 08:51 | 5. pgTAP `15_squad_runtime` (16) | ✅ | `0503c5e` |
| 08:55 | 6. `make worker` contra a fila local, `.env.example`, `SETUP_LOCAL.md` | ✅ | `da0f8eb` |
| 08:58 | Limite de tentativas em crash, ficha de tentativa, custo da recusa — pytest 88 | ✅ | `9f84b92` |
| 09:04 | 7. Diretriz do dono 08:55: owner decide; rejeição com `cancel`/`revise`; run novo no ajuste, na nova proposta e na resposta — pytest 90, pgTAP 270 | ✅ | `194f820` |
| 09:10 | Relatório; `make up && make migrate && make seed && make test` verde | ✅ | este |

## Notas do levantamento

- Run criado por `app.create_work_item_from_message` já nasce com `agent_id` = dono da delivery (Otto para 04.01)
  e a mensagem da fila leva `run_id`, `workspace_id`, `kind`, `agent_id`, `work_item_id`, `conversation_id`.
- `workspaces.locale` não existia (ADR-0010): migration pequena com padrão `pt-BR`.
- Papel privilegiado hoje é o `postgres` (pendência 2 da S1a); o worker usa `DATABASE_URL` em local.
