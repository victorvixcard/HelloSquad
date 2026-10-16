# S1d — Progresso (Stark)

**Fatia:** S1d, Memória da Marca camadas 1 e 2 (Fase 1): fatos com versão, fontes, "<Agente> percebeu",
conflitos, contexto de cada run, API, runtime usando a memória, seed da Miolo.
**Início:** 16/10/2026 09:16. **Especificação:** `docs/FLUXOS_DA_V46.md` §6 (rótulos `KST5`, `SRCST5`), §2.5, §9, §10.3.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 09:16 | PASSO 0 lido (diretrizes, FLUXOS §2, §4.7, §6, §8, §9, §10.3, §11, Arquitetura §5, ADR-0009, dados fictícios, plano, S1c §1 e `prompt.py`) | ✅ | este |
| — | 1. Migrations: `brand_facts`, `fact_sources`, `memory_suggestions`, `memory_conflicts`, `run_context_items`, funções `app.*`, Realtime | ⏳ | — |
| — | 2. API da memória + contrato | ⚪ | — |
| — | 3. Runtime usa a memória (orçamento, `run_context_items`, `observacoes` → sugestão) | ⚪ | — |
| — | 4. Seed da Miolo | ⚪ | — |
| — | 5. pgTAP e pytest de integração | ⚪ | — |
| — | 6. `SETUP_LOCAL.md`, relatório | ⚪ | — |

## Notas do levantamento

- `FLUXOS_DA_V46.md` §10.3: nenhuma tabela de memória existe; "<Agente> percebeu" e fontes também faltam.
- O runtime da S1c monta o bloco do workspace em `squad/prompt.py` (`RunContext.brand_facts`), cacheado.
- Arquivos de outra sessão no disco (`conversations/`, `test_core_api.py`, `openapi.json`, `schema.ts`,
  `design/super-admin-proto/`) ficam fora dos meus commits.
