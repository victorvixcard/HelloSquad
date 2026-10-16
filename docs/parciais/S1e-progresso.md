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
| 11:25 | Retomada (sessão 2): PASSO 0 relido; `make migrate` sem pendência (`applied: []`); pgTAP `17_credits` (48): RLS forçada, isolamento, extrato recusa UPDATE/DELETE/TRUNCATE, `idempotency_key` única, preço versionado, Free no workspace novo, reserva única, captura uma vez, liberação em falha e na pergunta | ✅ 48/48 | este |

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
