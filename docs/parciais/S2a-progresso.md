# S2a — Progresso (Stark)

**Fatia:** S2a, Bia e Otto completos (Fase 2). Início: 16/10/2026 14:46. Alvo: 75 min.
Área: `apps/backend`, `supabase/`, `squad/`, `packages/contracts` (gerado) e docs da fatia.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 14:50 | PASSO 0 lido (diretrizes, plano da Fase 2, catálogo, Documento Mestre §5, §8 e Anexo A das 7 deliveries, squad, S1c/S1e/S1f/S1g/A1c, FLUXOS §4 e §10.3, `_cx`/`_cxEnvFirst` da V4.6) | feito | este |
| 14:57 | 0. H1-04 (API): `environment` em `app.create_conversation` e no `ContextType`; uma por ambiente e workspace; `opening` (primeira fala + sugestões do ambiente) no detalhe da conversa; `calendar_posts` (tabela do item 4, já usada pela fala do Otto) e `calendar_post` pelo id. pgTAP `21` 30/30, pytest `test_environment_conversation` 3/3, contrato regenerado | feito | `55e0d5c` (autosave) + este |
| 15:04 | 1. Bia 02.01 e 02.02: skills, formato da entrega (`squad/deliveries.py`), fluxo roteado por `delivery_type`, fixtures da Miolo, documentos aprovados anteriores no contexto | feito | `33a0b3b`, `ca96004` |
| 15:04 | 2. Bia 02.03 e 02.04: a 02.04 aprovada vira o documento de referência do projeto (`approved_documents`), lido pelo Otto (04.02, 04.03) | feito | `33a0b3b`, `ca96004` |
| 15:04 | 3. Bia 02.07: `research/websearch.py` (desligado por padrão, mock determinístico, Brave atrás de env); fontes saem da busca, achado sem fonte coletada vira sugestão | feito | `33a0b3b`, `ca96004` |
| 15:07 | 4. Otto 04.02 (`calendar_posts`: rascunho → pauta na aprovação; `GET /workspaces/{id}/calendar`; post como objeto pelo id) e 04.03 (versões por canal, roteiro, estratégia aprovada) | feito | `55e0d5c`, `33a0b3b`, `cb17d52` |
| 15:07 | 5. Preços provisórios (10, `provisional`, já no seed da S1e), cartão `material`, `status_label` por etapa ("Bia · pesquisando na web"), reserva/captura: conferidos no pytest de cada delivery | feito | `cb17d52` |
| | 6. Testes, contrato, `SETUP_LOCAL.md`, relatório | pendente | |
