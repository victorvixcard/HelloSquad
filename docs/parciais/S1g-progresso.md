# S1g — Progresso (Stark)

**Fatia:** S1g, trabalho rico (Fase 1): prazo, próximo passo, frase de status, origem tipada e histórico legível
do trabalho; projeto com datas, marcos e participantes; pendências `decide` e `next`; "Agora não" adia a
autorização sem rejeitar; status vivo do squad derivado.
**Início:** 16/10/2026 12:35. **Especificação:** briefing do Thor (`briefings/FASE1_PROXIMAS_FATIAS.md`, S1g),
`FLUXOS_DA_V46.md` §2, §3, §5, §10.2 e §10.3, S1f (inteiro), S1b §1, S1e §1, A1b §1 e §4.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 12:44 | PASSO 0 lido (diretrizes, FLUXOS §2/§3/§5/§10.2/§10.3/§11, S1f inteiro, S1b §1, S1e §1, A1b §1 e §4, plano linha S1g); levantamento de `work_items`, `approvals`, `projects`, `decide_approval`, `transition_work_item`, worker (`store.py`, `flow.py`) e seed | ✅ | este |
| 13:24 | Migrations `20261016160000_approval_kind_decide.sql` (valor `decide`) e `…160100_rich_work.sql`: `work_items` com `due_at`, `next_step`, `status_label` (voltam a nulo quando o estado muda sem o agente reescrever) e `origin_type`/`origin_ref` tipados (preenchidos pela mensagem, pelo projeto ou pela conversa de origem; legado migrado); `work_item_history` (pedido, entrega, decisão; triggers, marca `automatic`/`approved_by_you`); `approvals.deferred_at`/`deferred_until`/`deferred_by` com `app.defer_approval` ("Agora não", só autorização, só owner) e `app.resume_approval` ("Decidir agora"); `decide` aceita `answered` e devolve ao agente; broadcast `approval.deferred`/`approval.resumed`; `projects.starts_at`/`ends_at`, `project_milestones`, `project_participants` com `app.create_project`, `update_project`, `set_project_participants`, `add_project_milestone`, `update_project_milestone` (editor ou acima); pedido na conversa do projeto entra no projeto (marco e equipe). `make migrate` aplicou; `make seed`: o trabalho do seed tem origem `message` e histórico `requested` + `delivered` (v1, automático) | ✅ | este |
