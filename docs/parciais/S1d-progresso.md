# S1d — Progresso (Stark)

**Fatia:** S1d, Memória da Marca camadas 1 e 2 (Fase 1): fatos com versão, fontes, "<Agente> percebeu",
conflitos, contexto de cada run, API, runtime usando a memória, seed da Miolo.
**Início:** 16/10/2026 09:16. **Especificação:** `docs/FLUXOS_DA_V46.md` §6 (rótulos `KST5`, `SRCST5`), §2.5, §9, §10.3.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 09:16 | PASSO 0 lido (diretrizes, FLUXOS §2, §4.7, §6, §8, §9, §10.3, §11, Arquitetura §5, ADR-0009, dados fictícios, plano, S1c §1 e `prompt.py`) | ✅ | este |
| 09:28 | 1. Migration `20261016122000_brand_memory.sql`: 5 tabelas, 9 enums, funções do owner e `app.suggest_memory`, Realtime de `memory_suggestions` — `make migrate` ok, pgTAP existente 270 verde, smoke SQL (sugerir, confirmar, idempotência, corrigir cria v2, Carla não vê) | ✅ | `fe11f71` |
| 09:34 | 2. API: dossiê, sugestões, decisão idempotente, correção com versão, histórico, busca, fontes, conflitos; enums no `domain.py`; rótulos da V4.6 no catálogo; `make openapi` (+9 rotas, +26 schemas, nada removido) e `pnpm --filter contracts generate`; seed com horários na ordem dos assuntos da V4.6 — `test_memory_api` 10, pytest 101, contracts 9 | ✅ | `041ea2a` |
| 09:38 | 3. Runtime: essenciais (decisões, Minha marca, Meu público) no bloco cacheado; busca OR pelo pedido, trabalho, briefing e skill até `MEMORY_CONTEXT_TOKENS` (1.500) no turno do usuário; estados conforme a coluna "O squad usa?" do KST5 (diretriz das 10:20: regras do protótipo); tudo em `run_context_items`; `observacoes` da produção → `app.suggest_memory` ("Otto percebeu") na transação da entrega — `test_memory_runtime` 4, pytest 105 | ✅ | `3b09ba3` |
| 09:29 | 4. Seed da Miolo: 2 fontes (Declarado por você; Instagram Não conectada), 5 confirmados, 1 decisão (artesanal), 1 sugestão aberta do Otto; Vitta e Trilha vazias — `make seed` duas vezes, contagens 6/1/2, 0/0/0, 0/0/0 | ✅ | `6c2b128` |
| 09:41 | 5. pgTAP `16_brand_memory` (39: RLS e grants, agente só pelo papel privilegiado, sugestão não é conhecimento, isolamento Marina/Rafael/Pedro, owner-only com Carla, confirmação idempotente, descartada não volta, versão e histórico, conteúdo imutável, desatualizado, conflito, busca, FK do contexto, Realtime) — pgTAP 309; pytest de integração já nos itens 2 e 3 | ✅ | `d3e3d0b` |
| 09:46 | 6a. `SETUP_LOCAL.md` (curls do dossiê, busca, decisão repetida, correção, histórico, fontes, conflitos; executados contra a API em :8100, saída em `/tmp/s1d_curl.log`) e ajuste pela regra do protótipo: correção conta na fonte "Declarado por você" (migration `20261016124500`) — pytest memória 14, pgTAP 309 | ✅ | este |
| — | 6b. Relatório e verificação final (`make up && make migrate && make seed && make test`) | ⏳ | — |

## Notas do levantamento

- `FLUXOS_DA_V46.md` §10.3: nenhuma tabela de memória existe; "<Agente> percebeu" e fontes também faltam.
- O runtime da S1c monta o bloco do workspace em `squad/prompt.py` (`RunContext.brand_facts`), cacheado.
- Arquivos de outra sessão no disco (`conversations/`, `test_core_api.py`, `openapi.json`, `schema.ts`,
  `design/super-admin-proto/`) ficam fora dos meus commits.
