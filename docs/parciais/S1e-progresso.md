# S1e — Progresso (Stark)

**Fatia:** S1e, créditos (Fase 1): contas, grants, reservas, extrato append-only, preços versionados
provisórios, reserva/captura/liberação no worker, saldo e estimativa na API, barra "Plano Squad · créditos do mês".
**Início:** 16/10/2026 10:27. **Especificação:** briefing do Thor, `ARQUITETURA_PROPOSTA.md` §6, ADR-0007,
`FLUXOS_DA_V46.md` §1.1 e §10.3, `SUPER_ADMIN.md` §2–§3, `DIRETRIZES_DO_DONO.md` ("preço e créditos por último").

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 10:37 | PASSO 0 lido (diretrizes, Arquitetura §6, ADR-0007/0008, FLUXOS §1.1/§9/§10.3/§11, plano, Super Admin §2–§3, S1c §1–§2, S1d §1, Makefile com trava, Documento Mestre §13 e Anexo A, catálogo CSV) | ✅ | este |
| 10:42 | Migration `20261016133000_credits.sql` (contas, grants, reservas, extrato somente inserção, plano Free provisório, reserva/captura/liberação, conta no `create_workspace`) | ✅ | `5b740c8` |
| 10:45 | Seed dos créditos (46 preços provisórios, plano Squad fictício, contas e grants com ids fixos) salvo pelo autosave quando a sessão caiu por cota | ✅ (conferido na retomada) | `42a056b` (wip) |
| 11:19 | Retomada (sessão 2, 11:14): PASSO 0 relido; `make migrate` sem pendência (`applied: []`); pgTAP `17_credits` (48): RLS forçada, isolamento, extrato recusa UPDATE/DELETE/TRUNCATE, `idempotency_key` única, preço versionado, Free no workspace novo, reserva única, captura uma vez, liberação em falha e na pergunta | ✅ 48/48 | `59eafcb` |
| 11:21 | Worker: reserva no `begin()` (estimativa de `app.run_credit_estimate`, chave `run:<id>`, mesma reserva na retentativa), captura na entrega antes do `succeeded`, liberação pela trigger em falha e na pergunta do Nexo; reserva recusada (sem saldo, sem preço) encerra o run como falha definitiva `insufficient_credits`/`credit_price_missing`, sem cobrar. `pytest tests/test_credits.py tests/test_worker.py`: 15 passed | ✅ | `01a353a` |
| 11:24 | API: `GET /me` traz `credits` em cada membership (plano, provisório, saldo, reservado, disponível, ciclo do plano: créditos, usado e fim) para a barra "Plano Squad · créditos do mês"; `POST /credits/estimate` (workspace, delivery, trabalho opcional para o preço de revisão), erros no envelope; migration `20261016143000_credits_plan_read.sql` (authenticated lê planos, como já lê preços); `make openapi` (+1 rota, +3 schemas, nada removido) e `pnpm --filter contracts generate`. `pytest tests/test_credits.py tests/test_core_api.py`: 25 passed | ✅ | `ae1b1e4` |
| 11:25 | Seed: o bloco de créditos salvo pelo autosave (`42a056b`) conferido e mantido; `make seed` duas vezes, estado dos créditos idêntico (Miolo 36 de 100, Vitta 20, Trilha 19,2 de 20) | ✅ | sem mudança |
| 11:26 | `docs/SETUP_LOCAL.md` §"Créditos (S1e)" e `docs/parciais/s1e/curl_creditos.txt` (curls contra a API no ar) | ✅ | `739e6c4` |
| 11:28 | `make test`: ruff limpo, pytest 116 passed, lint e typecheck do web ok; Vitest do web vermelho só em `ConversationPanel.test.tsx` (A1a em andamento, arquivos do Aranha não commitados); `make test-db` à parte: 18 arquivos, 357 testes, PASS. Relatório `S1e-relatorio.md` | ✅ | este |

## Notas do levantamento

- O run sempre começa com `work_items.delivery_type` definido (o fluxo recusa sem skill): a estimativa da
  reserva sai de `delivery_prices` já no início, antes do Nexo.
- Desfechos do fluxo: `asked` (Nexo pergunta, approval `respond`, sem entrega) e `delivered` (versão nova +
  `review`). Falha definitiva passa por `RunStore.fail`; passageira volta o run a `queued` (mesma reserva).
- O seed apaga runs e trabalhos a cada aplicação; o extrato não aceita DELETE: a conta de crédito dos
  workspaces do seed sai antes (em cascata) e volta com ids fixos.
- Profundidade por delivery não está no Documento Mestre nem no CSV; a única fonte é a inferência do SA0
  (`design/super-admin-proto/app/data.js`, pergunta 6 do SA0, aberta).
- Arquivos de outras sessões no disco (`Makefile`, `docs/PLANO_DE_ACAO_FASE1.md`, `apps/web/…`) ficam fora dos meus commits.
