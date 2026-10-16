# S2d — Relatório (Colaboração entre agentes + projeto coordenado)

Stark, 16/10/2026, 16:47–17:30 (Opus 5.5), em paralelo com a A2b do Aranha. Área: `apps/backend`, `supabase/`,
`squad/`, `packages/contracts` (gerado), `docs/SETUP_LOCAL.md`, `.env.example` e os documentos da fatia. Nada em
`apps/web` nem em `packages/ui`; nenhum build do web; nenhum e2e.

**Critério da fase:** um projeto coordenado (Bia → Kaia → Otto) fecha com um responsável por etapa, no modo
simulado. **Atendido:** pytest `test_coordinated_project` 4/4, pgTAP `24_coordinated_work` 48/48 e o roteiro curl
contra a API no ar (§2).

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | **Trabalho com etapas por agente** | Trabalho coordenado = trabalho do Nexo com `delivery_type = "01.02"` ("Coordenar projeto com múltiplos agentes", catálogo). O run do Nexo qualifica o pedido (sem tema ou objetivo → pergunta, sem montar nada) e grava o plano: `work_item_steps` ganha `delivery_type`, `depends_on` (só etapas anteriores), `input` (instrução, responsabilidade e o recorte do briefing), `output` (a versão que a etapa entregou ou que a fechou), `status_reason` + `status_params` (código do motivo; o texto sai do catálogo). Estados novos da etapa: `needs_you`, `waiting_engine`, `blocked`. O plano é conferido no backend contra o `agent.yaml` e as skills de `squad/` (agente, delivery existente, dependência só para trás, até 6 etapas). Equipe montada: cartão `team` do Nexo na conversa (`agent_ids`, como o contrato da S1f já previa, mais `members` com a responsabilidade e `project_id`), `collaborator_agent_ids` do trabalho e histórico "Nexo montou a equipe: Bia, Kaia e Otto". Responsável por etapa no histórico ("Bia começou a etapa 1 · Estratégia", "Etapa 1 · Estratégia concluída", "Etapa 2 · Peças: aguardando o motor de imagem") e na frase viva ("Bia na etapa 1 de 3 · Estratégia", depois a do agente), mais `step_label` ("etapa 1 de 3") no trabalho | migrations `20261016200000`, `…200100`, `…200300`, `…200400`; `squad/coordination.py`, `squad/flow.py` (`run_coordination`), `squad/store.py` (`coordinate`); `squad/nexo/skills/01.02.md`; fixture `llm/fixtures/01.02/nexo.plan.json`; `work/routes.py`, `work/live.py`, `work/schemas.py`; `i18n/{pt-BR,en,es}.json` |
| 2 | **Handoff entre etapas com contexto** | Cada etapa é um run próprio (`runs.step_id`), **sem nova triagem**: o Nexo delega (`squad.delegar` com a etapa) e o especialista recebe a instrução da etapa, o recorte do briefing e **a saída das etapas de que depende** (`<documento_aprovado>` com a versão que fechou a etapa; da estratégia 02.04, também `<sua_frente>` com a frente dele). O que veio de outra etapa fica em `run_context_items` com **`kind = step`** (valor novo do enum), `step_id`, `delivery_version_id` e motivo `handoff`. A reserva e a captura usam **o preço da delivery da etapa** (`run_credit_estimate` com `step_id`); a coordenação e a etapa sem motor não capturam (a reserva é liberada). A entrega e a pendência levam `step_id`; ajuste ou nova proposta roda a mesma etapa com o mesmo agente; a reflexão (S2c) ensina o agente da etapa, com as versões, as correções e o briefing só da etapa. **Falha numa etapa marca só ela** (e o trabalho) como `failed`; as anteriores e as versões aprovadas ficam; cancelar o trabalho pula as etapas abertas (`skipped`, motivo `work_cancelled`) e mantém as concluídas | `…200100` (`decide_work_step`, `queue_work_step`, `work_step_next`, `run_credit_estimate`), `…200200` (`enqueue_reflection`); `squad/flow.py` (`run_step`, `produce`, `gather_context`), `squad/store.py` (`step_outputs`, `record_handoff`, `deliver`, `ask`, `load`) |
| 3 | **Projeto coordenado** | A coordenação cria o projeto (nome e objetivo do plano; `owner_agent_id = nexo`), os participantes com a responsabilidade de cada especialista e **um marco por etapa** (`project_milestones.step_id`, "decisão sua" e "previsto"); o marco ganha a pendência quando a etapa entrega e fecha quando a etapa é aprovada. **O dono** aparece no projeto (`GET /projects/{id}` → `owner`: o owner da conta, "decide cada entrega"). **"Precisa de você" só quando a etapa espera a decisão do dono**: a coordenação e a etapa sem motor não criam pendência. **Um especialista por vez**: só a próxima etapa vai para a fila, e só quando nenhuma está em andamento ou esperando a pessoa (avanço idempotente). Quando a última etapa fecha, o trabalho vai a `approved` → `done` e o projeto a `done` | `…200100` (`advance_work_steps`, `close_coordinated_project`); `work/projects.py` (`owner`, marcos na ordem das etapas) |
| 4 | **Adaptador `ImageEngine`** | Interface (`ImageRequest`: workspace, delivery, idioma, briefing, identidade da marca, formato, documentos → `ImageOutcome`: estado, arquivos com caminho no bucket `deliveries`, metadados, versão do motor, custo) e **stub honesto `PendingImageEngine`**: devolve `waiting_engine` com o motivo `image_engine_pending`. A etapa da Kaia **não falha, não cobra** (reserva liberada) e a Kaia avisa na conversa ("A etapa Peças fica aguardando o motor de imagem, que ainda não está ligado. Nada é gerado nem cobrado até ele chegar; as etapas que não dependem da peça seguem."). **A etapa seguinte que não depende da imagem segue**; a que depende fica `blocked` com o motivo ("Depende da etapa 2 · Peças, que aguarda o motor de imagem"), e sem mais nada para rodar o trabalho fica `blocked`. `IMAGE_ENGINE_PROVIDER=pending` é o único valor aceito (como os embeddings da S2c). `squad/kaia/skills/03.01.md` só com a interface e o contrato esperado do motor, **sem fornecedor** | `creative/image_engine.py`; `squad/flow.py` (`run_image_step`), `squad/store.py` (`wait_engine`); `config.py`, `worker/main.py`; `squad/kaia/skills/03.01.md` |
| 5 | **Teste do critério da fase** | `test_coordinated_project.py` (4): (a) Marina pede a campanha na Sala do Squad → o Nexo monta Bia (02.04) → Kaia (03.01) → Otto (04.03) e só a Bia roda; cartão `team`; pendência só da Bia; ela aprova; a Kaia fica `waiting_engine` sem cobrar e o Otto roda com a estratégia aprovada no contexto (`run_context_items` `kind = step`, caso `com_estrategia` da fixture, `content.estrategia` apontando a versão da Bia); ela aprova os textos; o trabalho e o projeto fecham com Bia `done`, Kaia `waiting_engine`, Otto `done`; marcos, participantes, dono e créditos por etapa; histórico na ordem; Rafael (Vitta) recebe 404 no trabalho e no projeto. (b) Etapa que depende da peça fica `blocked` com o motivo e o trabalho `blocked`. (c) Falha do Otto não apaga a Bia (versão segue aprovada). (d) Campanha vaga: o Nexo pergunta antes de montar a equipe | `apps/backend/tests/test_coordinated_project.py` |
| 6 | **pgTAP, pytest, contrato, docs** | pgTAP `24_coordinated_work` (48); fixtures de reflexão sem aprendizado inventado para a 02.04 e a 04.03 (antes, aprovar uma estratégia ou textos no modo simulado deixava a reflexão sem resposta); `make openapi` + `pnpm --filter contracts generate` (53 → 53 operações, nada removido, 2 schemas novos, todos os campos novos opcionais); `SETUP_LOCAL.md` §"Projeto coordenado e etapas por agente (S2d)"; `.env.example` (`IMAGE_ENGINE_PROVIDER`); roteiro `docs/parciais/s2d/curl_projeto_coordenado.sh` com a saída `.txt`; seed apaga o handoff antes dos trabalhos | `supabase/tests/database/`; `packages/contracts/`; `docs/` |

**Migrations novas:** `20261016200000_work_step_states.sql` (enums), `20261016200100_coordinated_work.sql` (núcleo),
`20261016200200_reflection_step_briefing.sql` (corrige a minha 200100, ver §3), `20261016200300_step_history_done.sql`
e `20261016200400_step_history_order.sql` (histórico da etapa concluída, na ordem certa).

## 2. Como foi verificado (evidência)

**Backend completo** (ruff + formato + pytest, com a trava do banco), 17:23:

```
$ cd apps/backend && uv run ruff check . && uv run ruff format --check . && uv run pytest -q
All checks passed!
.....................................................                    [100%]
197 passed in 44.31s
```

**Critério da fase, teste a teste:**

```
tests/test_coordinated_project.py::test_coordinated_campaign_closes_with_one_owner_per_step PASSED
tests/test_coordinated_project.py::test_step_that_depends_on_the_image_is_blocked_with_the_reason PASSED
tests/test_coordinated_project.py::test_failed_step_keeps_the_earlier_ones PASSED
tests/test_coordinated_project.py::test_vague_campaign_gets_a_question_before_the_team PASSED
============================== 4 passed in 2.99s ===============================
```

**Banco** (`make test-db`, todos os arquivos; antes da fatia eram 24 arquivos e 593 testes):

```
Files=25, Tests=641,  1 wallclock secs
Result: PASS
$ supabase test db supabase/tests/database/24_coordinated_work.test.sql
Files=1, Tests=48
Result: PASS
```

**Contrato** (comparação do `openapi.json` novo com o anterior):

```
operações 53 -> 53 removidas set()
schemas novos ['ProjectOwner'] (e depois 'CardMember') removidos []
Delivery +['step_id'] · ProjectDetail +['owner'] · ProjectMilestone +['step_id'] · WorkItem/WorkItemDetail +['step_label']
WorkItemStep +['delivery_type','delivery_version_id','depends_on','instruction','responsibility','status_reason','status_reason_label','version_no']
MessageCard +['members','project_id'] · novos obrigatórios: nenhum
$ cd packages/contracts && pnpm typecheck && pnpm test     → ok
$ cd apps/web && pnpm typecheck                               → 0 erros (tsc --noEmit, sem build)
```

**Ponta a ponta contra a API no ar (8100)** com o worker simulado (`docs/parciais/s2d/curl_projeto_coordenado.txt`, trechos):

```
1. Marina pede a campanha na Sala do Squad (trabalho 01.02 do Nexo)
  run: equipe com 3 etapas; primeira: queued; …
  run: entrega v1; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; …
  trabalho: needs_you | etapa 1 de 3 | v1 aguarda sua aprovação
  etapa 1 · Estratégia · bia (02.04) · needs_you
  etapa 2 · Peças · kaia (03.01) · pending
  etapa 3 · Textos · otto (04.03) · pending
  cartão do Nexo na conversa:
    Combinado. Montei o squad da campanha e eu acompanho: a Bia começa pela estratégia. Te chamo quando houver decisão.
    - bia · estratégia e conceito
    - kaia · peças da campanha
    - otto · legendas e roteiros
  runs até aqui (um especialista por vez):
    - nexo succeeded
    1 bia succeeded
2. Marina aprova a estratégia da Bia
  run: etapa aguarda o motor de imagem; seguinte: queued; 0 tokens de entrada, …
  run: entrega v1; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; …
  etapa 1 · Estratégia · bia (02.04) · done
  etapa 2 · Peças · kaia (03.01) · waiting_engine · Aguardando o motor de imagem
  etapa 3 · Textos · otto (04.03) · needs_you
  handoff no contexto de cada etapa seguinte (run_context_items kind = step):
    run da kaia recebeu step · handoff · etapa 1 (bia) · versão 1
    run da otto recebeu step · handoff · etapa 1 (bia) · versão 1
3. Marina aprova os textos do Otto
  trabalho: done | None | Entregue e aprovado por você
  projeto: Campanha de Natal | done | dono: decide cada entrega
    marco: Estratégia · bia · concluído
    marco: Peças · kaia · aberto
    marco: Textos · otto · concluído
  créditos por etapa (reserva da delivery de cada uma):
    nexo 01.02 released 0
    bia 02.04 captured 10.00
    kaia 03.01 released 0
    otto 04.03 captured 10.00
4. Isolamento: o Rafael (Vitta) pede o trabalho e o projeto da Miolo
  trabalho: 404
  projeto: 404
```

O que não dá para verificar mecanicamente: a qualidade do plano do Nexo e dos textos no modo real (sem a chave da
Anthropic, tudo roda nas fixtures).

## 3. Decisões tomadas (não mudam nada do combinado)

| Decisão | Por quê |
|---|---|
| O trabalho coordenado é **um trabalho do Nexo com a delivery 01.02**, com as etapas dentro dele (cada uma com sua entrega e sua pendência), e não um trabalho por etapa | É o que a V4.6 mostra: a campanha é um trabalho "Projeto · projeto coordenado" com etapas ("Estratégia" da Bia, "Peças" da Kaia, "Textos" do Otto), "etapa 1 de 5", e as abas "Entregas", "Decisões", "Squad" (FLUXOS §2.1–2.2). O catálogo chama isso de 01.02 |
| Etapas **em sequência, uma por vez**; uma etapa só começa com as dependências concluídas | "Nexo delega por etapa (um especialista por vez)" do briefing e a regra da conversa em grupo da S1f |
| A etapa da Kaia **é um run** que chama o adaptador e fica `waiting_engine` (com reserva liberada), em vez de ser pulada sem run | O run deixa rastro auditável (`imagem.gerar` com o motor `pending`) e, quando o motor chegar, rodar a etapa é o mesmo caminho |
| Trabalho e projeto **fecham quando a última etapa fecha**, mesmo com a etapa da Kaia aguardando o motor (ela fica marcada, com o marco aberto) | Literal do briefing ("fecha com a Kaia marcada como aguardando motor"). Se o que sobra para rodar depende só do motor, o trabalho fica `blocked` (transição `in_progress → blocked` que já existia: "falta acesso, dado ou conexão") |
| Motivos e textos novos vêm do **catálogo do backend** (pt-BR, en, es), com código no banco | Diretriz de idiomas (nenhum texto fixo em código) |
| Na interface, "**aguardando o motor de imagem**" (sem "do dono") | Quem lê é a Marina, dona da Miolo: "motor do dono" confundiria o dono da conta com o dono da plataforma. O código e a skill dizem que o motor é do dono da plataforma |
| O dono no projeto é **derivado** (o owner da conta, `owner` em `GET /projects/{id}`), sem linha nova em `project_participants` | A tabela da S1g é de especialistas (`agent_id` obrigatório) e a lista `participants` do contrato é de agentes; mudar isso quebraria o contrato. Campo novo opcional não quebra nada |
| Corrigi a minha própria regressão: a 200100 redefiniu `enqueue_reflection` a partir da versão antiga da S2c e perdeu o briefing do `squad.delegar` (a suíte pegou: `test_learnings`); a 200200 junta as duas | Migrations já aplicadas não são editadas; a correção vai numa migration nova |
| Fixtures de reflexão da 02.04 e da 04.03 dizem "nada a aprender" quando não houve correção | Sem elas, aprovar uma estratégia ou textos no modo simulado deixava a reflexão sem resposta; "nada a aprender" é o honesto sem correção da pessoa |

## 4. Onde discordei do briefing ou interpretei

| Briefing | O que fiz | Por quê |
|---|---|---|
| `started_at`/`done_at` na etapa | Mantive `started_at`/`finished_at` (colunas e contrato da S1a) e o estado diz se fechou como `done` | `done_at` duplicaria `finished_at`; renomear mudaria o contrato combinado |
| `run_context_items` com `source = step` | O campo que já existe é `kind`; usei `kind = step` (valor novo do enum), com `step_id`, `delivery_version_id` e motivo `handoff` | Uma coluna `source` repetiria `kind`; o resto da tabela (S1d, S2c) já usa `kind` |
| "o Nexo monta as etapas a partir da estratégia (02.04) e do pedido" | O plano nasce do pedido (a estratégia é a etapa 1) e, quando já existe uma 02.04 aprovada no projeto, ela vai para o planejamento; a estratégia aprovada passa a cada etapa seguinte com a frente dela (`<sua_frente>`) | Na V4.6 o Nexo monta a equipe antes da Bia trabalhar (cartão da equipe logo depois da resposta da pessoa, FLUXOS §3.2) |
| "participantes = agentes responsáveis + o dono" | Agentes em `project_participants`; o dono como `owner` derivado no projeto | Ver §3 (contrato de `participants`) |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais conservadora)

1. **Fechar com a peça pendente.** O projeto fecha quando a última etapa fecha, com a Kaia aguardando o motor (literal do briefing). Quando o motor chegar, a etapa da Kaia reabre o trabalho (nova execução da etapa) ou vira um trabalho novo do projeto? Hoje nada a reabre sozinho.
2. **Ordem das etapas.** As etapas rodam uma por vez. A V4.6 mostra o Kiwi trabalhando "em paralelo à Bia" (separando públicos, L6842). Paralelo entre especialistas que não dependem um do outro fica para depois, ou vale já?
3. **Pergunta antes da equipe.** A V4.6 pergunta "site, loja ou os dois?" antes de montar a equipe. Hoje o essencial da 01.02 é tema e objetivo; o canal fica no briefing quando a pessoa diz. O canal deve ser obrigatório para campanha?

## 6. O que ficou de fora

- **Motor de imagem real e as deliveries visuais da Kaia** (03.01–03.03): decisão do dono; só a interface e o stub.
- **Retomar a etapa da Kaia quando o motor chegar** (pergunta 1) e etapas em paralelo (pergunta 2).
- **Kiwi na campanha**: a fixture do plano monta Bia, Kaia e Otto (o critério da fase). O Kiwi entra quando o plano pedir (05.01/05.02 já são deliveries disponíveis para a etapa).
- **Histórico por versão com a etapa**: "v1 entregue" e "Você aprovou a v1" continuam sem dizer de qual etapa (os gatilhos da S1g); a entrada traz o `agent_id`, e as linhas de etapa ("Etapa 1 · Estratégia concluída") dizem quem.
- **`step_id` na pendência da API** (`Approval`): o web chega à etapa pela versão (`delivery_version_id` → `Delivery.step_id`).

## 7. O que o web precisa para a A2c ou A2d

- **Detalhe do trabalho coordenado** (`GET /work-items/{id}`): `steps[]` com `seq`, `title`, `agent_id` (responsável), `delivery_type`, `status` (`pending`, `in_progress`, `needs_you`, `waiting_engine`, `blocked`, `done`, `failed`, `skipped`), `status_reason_label` ("Aguardando o motor de imagem"), `responsibility`, `depends_on` e `delivery_version_id`; `step_label` ("etapa 1 de 3") para o detalhe do status (`and · Em andamento · etapa 1 de 5` da V4.6); `deliveries[].step_id` para a aba "Entregas" por etapa.
- **Cartão `team`** na conversa: `agent_ids`, `members[]` (`agent_id`, `responsibility`) e `project_id` ("o cartão abre o projeto").
- **Projeto**: `owner` (o dono, "decide cada entrega") e `milestones[].step_id`, na ordem das etapas.
- **Kaia "aguardando motor" honesto** (A2b): a etapa `waiting_engine` e a mensagem da Kaia na conversa; nenhum botão de gerar peça.
- **Histórico**: `kind` ganha `team` e `step` (texto pronto em `text`).
- Enums que ganharam valores: `WorkItemStepStatus` (+3), `WorkItemHistoryEntry.kind` (+2). O `tsc --noEmit` do web passou com o contrato novo.

## 8. Estado da máquina

- Web (3100): às ~17:12 estava fora do ar e sem processo; **não fui eu** (não rodei nada em `apps/web`) e não reiniciei para não colidir com a A2b. Às 17:24 já respondia 200.
- API (8100) no ar, recarregou sozinha com o código novo. Seed reaplicado no fim do roteiro e de cada pytest.
- Dois commits `wip:` do autosave (17:15 e 17:20) levaram arquivos desta fatia antes dos meus commits; nada se perdeu.
