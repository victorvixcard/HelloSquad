# S1a — Relatório (Stark)

**Fatia:** S1a, schema do núcleo da Fase 1 (só banco). **Data:** 16/10/2026, 03:26 → 03:50.
Commits em `main`, todos com push: `cc83bcb`, `ca2a51e`, `6d20cac`, `9e4729b`, `ca8b825`, `8a6d9b8`, `fb9d222`,
`0d15b7e` e o deste relatório. Não criei endpoint e não toquei em `apps/web/`.

## 1. O que mudou

| Migration | Conteúdo |
|---|---|
| `20261016063500_core_schema.sql` | Domínio `agent_id` (os 7 ids de `squad/`), 14 enums e 13 tabelas: `conversations`, `conversation_participants`, `messages`, `projects`, `work_items`, `work_item_steps`, `deliveries`, `delivery_versions`, `delivery_files`, `approvals`, `runs`, `run_steps`, `run_events`. RLS habilitada e forçada em todas, `authenticated` só com SELECT dos seus workspaces, nada para `anon`/`service_role`. `app.post_message`. |
| `20261016063600_work_item_state_machine.sql` | `app.work_item_transitions` (matriz, §2), trigger que recusa mudança de status fora da matriz, `app.transition_work_item`, `app.decide_approval`. |
| `20261016063700_run_queues.sql` | Filas pgmq `runs_interactive`, `runs_scheduled`, `external_actions`, `memory_reflect`; schema `pgmq` fechado; `app.enqueue_run`; `app.create_work_item_from_message`. |
| `20261016063800_realtime_broadcast.sql` | Triggers em `run_events` (insert) e `approvals` (insert e mudança de status) chamando `realtime.send(…, 'workspace:<id>', true)`; política de SELECT em `realtime.messages`. |

Também: pgTAP `08` a `13` (96 asserções), seed do núcleo da Miolo em `supabase/seed.sql`, duas linhas em
`docs/SETUP_LOCAL.md` (mensagem nova do web, texto da A0b §3 item 6; como inspecionar as filas) e
`docs/parciais/s1a/realtime_e2e.mjs` (prova do canal privado com cliente Realtime de verdade).

**Funções para a S1b/S1c**

| Função | Quem executa | O que faz |
|---|---|---|
| `app.post_message(conversation_id, body) → messages` | `authenticated` (editor+) | Valida membership e papel, grava a mensagem do usuário, atualiza `last_message_at`, inclui quem postou nos participantes. |
| `app.create_work_item_from_message(message_id, delivery_type, title, briefing, idempotency_key default null) → work_items` | `authenticated` (editor+) | Trabalho `draft` + run `queued` + mensagem em `runs_interactive` na mesma transação. Repetir devolve o mesmo trabalho. |
| `app.decide_approval(approval_id, decision, note default null) → approvals` | `authenticated` (editor+; `authorize` exige admin) | `UPDATE … WHERE status = 'pending'`. Repetir devolve o estado atual, sem erro. |
| `app.transition_work_item(work_item_id, to_status, actor_type, actor_id, note default null, expected_from default null) → work_items` | papel privilegiado (worker) | Valida na matriz, `UPDATE … WHERE status = <lido>`, grava `work_item.status_changed` em `audit_events`. |
| `app.enqueue_run(run_id) → bigint` | papel privilegiado | Põe um run `queued` na fila do seu tipo (devolve o `msg_id` do pgmq). |

**Erros (para a API traduzir):** `P0002` não encontrado ou de outro workspace (a mesma resposta, → 404);
`42501` sem autenticação ou papel insuficiente (→ 403); `22023` entrada inválida (→ 422); `55000` estado não
permite (conversa arquivada, run fora de `queued`) (→ 409); `WI001` transição não permitida (→ 409);
`WI002` o trabalho mudou de estado no meio do caminho (→ 409); `22P02` valor fora do enum (→ 422).

## 2. Matriz de transições dos trabalhos

| De | Para |
|---|---|
| `draft` | `in_progress`, `needs_you` (briefing incompleto: o agente pergunta antes), `cancelled` |
| `in_progress` | `needs_you`, `paused`, `blocked`, `failed`, `cancelled` |
| `needs_you` | `in_progress` (ajuste pedido, resposta dada), `approved`, `cancelled` |
| `approved` | `done`, `scheduled` |
| `scheduled` | `done` (execução confirmada pela API do canal), `failed`, `cancelled` |
| `paused` | `in_progress`, `cancelled` |
| `blocked` | `in_progress`, `failed`, `cancelled` |
| `failed` | `in_progress` (nova tentativa), `cancelled` |
| `done`, `cancelled` | nenhuma (finais) |

`done` só vem de `approved` ou de `scheduled`; nunca de `in_progress`, nem por UPDATE direto do papel
privilegiado (o trigger `work_items_check_transition` vale para qualquer escrita). Um teste lê a matriz e
falha se outra origem de `done` aparecer.

**Efeito das decisões** (`app.decide_approval`, só na chamada que decide e só quando o trabalho está em
`needs_you` sem outra pendência dele): revisão/aprovação `approved` → versão `approved`, aprovada anterior
`superseded`, versão vira a atual da entrega, trabalho `approved`; `changes_requested` → trabalho
`in_progress`; `respond` + `answered` → trabalho `in_progress`; `rejected` e as decisões de
`authorize`/`confirm`/`reconnect` só registram (ver pergunta 4 da §6).

## 3. Como foi verificado

**Do zero:** `pnpm exec supabase db reset` (exit 0, 9 migrations, seed aplicado) e depois
`make up && make migrate && make seed && make test` (16/10, 03:44), exit 0. Log em `/tmp/s1a_final.log`
(106 linhas); trechos:

```
{"applied":[],"message":"Migrations applied"}
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
seed aplicado: ../../supabase/seed.sql
All checks passed!                                                      (ruff)
============================== 51 passed in 1.03s ==============================   (pytest)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  44 passed (44)
00_extensions ............. ok        07_reserved_slugs ......... ok
01_rls_coverage ........... ok        08_core_isolation ......... ok
02_workspace_isolation .... ok        09_messages ............... ok
03_membership_management .. ok        10_work_item_transitions .. ok
04_invitations ............ ok        11_approvals .............. ok
05_audit_events ........... ok        12_run_queues ............. ok
06_create_workspace ....... ok        13_realtime_broadcast ..... ok
Files=14, Tests=216 ...                                                 (pgTAP; era 120)
Result: PASS
```

**O que cada arquivo novo prova**

| Arquivo | Asserções | Cobre |
|---|---|---|
| `08_core_isolation` | 12 | Uma linha da Miolo e uma da Vitta em cada uma das 13 tabelas: Marina vê só a Miolo, Rafael só a Vitta, Pedro nada; nenhuma linha de outro workspace visível (inclui o seed); INSERT/UPDATE/DELETE direto dá 42501 nas 13; FK composta recusa mensagem da Vitta em conversa da Miolo; caminho de Storage com prefixo de outro workspace é recusado. |
| `09_messages` | 16 | `post_message` (autor = `auth.uid()`, `last_message_at`, participante); UPDATE, DELETE e INSERT direto recusados; corpo vazio/longo, conversa arquivada; Vitta, inexistente e Pedro com o mesmo `P0002`; viewer lê e não posta; anon não executa. |
| `10_work_item_transitions` | 17 | Caminho `draft → in_progress → needs_you → approved → done` com 4 eventos em `audit_events` (origem, destino, nota, ator); `in_progress → done`, `draft → done` e `in_progress → approved` dão `WI001`; estado esperado divergente dá `WI002`; UPDATE direto fora da matriz dá `WI001`; ator agente fora de `squad/` é recusado; Marina não executa a função. |
| `11_approvals` | 20 | Três chamadas de `decide_approval` (a 2ª igual, a 3ª com outra decisão): uma mudança, um evento `approval.decided`, uma transição; versão aprovada vira a atual; ajuste pedido só move o trabalho quando não sobra pendência; decisão incompatível com o tipo dá `22023`; Rafael e Pedro `P0002`; viewer e editor (em `authorize`) `42501`; owner autoriza sem mover o trabalho. |
| `12_run_queues` | 18 | `create_work_item_from_message` deixa trabalho `draft` do Otto, run `queued` e **uma** mensagem em `runs_interactive` (lida pelo papel privilegiado, com `workspace_id`), também na segunda chamada; tipo fora do catálogo e título vazio recusados; Marina não envia nem lê a fila nem executa `enqueue_run`; nenhum papel da Data API com USAGE, EXECUTE ou privilégio de tabela no `pgmq`. |
| `13_realtime_broadcast` | 13 | `run_event` e approval (criada e decidida) gravam em `realtime.messages` no tópico privado `workspace:<miolo>`; Marina lê os três; Rafael, Pedro, authenticated sem `sub` e anon não; nem Rafael nem Marina publicam direto no canal (42501); tópico malformado não derruba a política. |

**Os testes pegam regressão (mutação numa transação desfeita, arquivo de teste rodado dentro dela):**

```
A. matriz ganha in_progress → done           → 10: not ok 1 (done só vem de approved…), not ok 6 (done direto de in_progress…)
B. GRANT UPDATE em messages para authenticated → 09: failed 1 of 16; 08: failed 1 of 12
C. política do Realtime sem filtro de workspace → 13: not ok 6, 7, 8, 13 (Rafael, Pedro e sem sub passam a ler)
D. USAGE e SELECT no pgmq para authenticated   → 12: failed 3 of 18
E. decide_approval sem "WHERE status = pending" → 11: failed 3 of 20
```

**Canal privado com o servidor do Realtime de verdade** (`node --env-file=.env docs/parciais/s1a/realtime_e2e.mjs`,
login pela Auth local, canal `private: true`, run_event gravado pelo banco):

```
marina@miolo.example: entrada no canal = SUBSCRIBED; run_event recebido = ["run.progress"]
rafael@vitta.example: entrada no canal = CHANNEL_ERROR: Unauthorized: You do not have permissions to read from this Channel topic: workspace:6bcdc5bd-…; run_event recebido = []
```

**Seed:** `make seed` duas vezes seguidas, mesmo estado: md5 de todas as linhas do núcleo, de
`audit_events` e do tamanho das filas igual nas duas (`67794ffd…`), fora `deliveries.updated_at`
(`06:48:58.04` → `06:48:58.60`, o trigger do UPDATE de `current_version_id`). Contagem depois do
`make test`: 3 workspaces, 4 memberships, 0 convites, 3 eventos de auditoria (histórico do trabalho do
seed), Miolo com 2 conversas, 10 participantes, 3 mensagens, 1 trabalho `needs_you` 04.01, 1 run
`waiting_approval`, 1 versão, approval `review` `pending`; Vitta e Trilha com zero em tudo; filas vazias.

**Realtime no ar:** `supabase status` lista como paradas só `imgproxy`, `edge_runtime` e `pooler`;
`supabase_realtime_hellosquad` está `healthy`. `realtime.send(jsonb, text, text, boolean)` existe na
imagem local (o teste 13 confere), então o trigger publica de fato; a guarda `to_regprocedure` só evita
erro numa imagem sem ele.

## 4. Decisões tomadas e onde divergi do briefing

1. **Agente como domínio** `public.agent_id` (texto com os 7 ids de `squad/`), usado em todas as colunas de
   agente, inclusive `collaborator_agent_ids agent_id[]`. Agente novo exige migration.
2. **FK composta `(workspace_id, id)`** em toda referência entre tabelas do núcleo: o banco recusa filho de
   um workspace apontando para pai de outro, mesmo vindo do worker. `deliveries.current_version_id` só aceita
   versão da mesma entrega.
3. **Matriz em `app.work_item_transitions`** (não em `public`): é regra global, sem `workspace_id`, fora da
   Data API, sem GRANT. Tem coluna `description`.
4. **Divergência: dois parâmetros opcionais a mais.** `transition_work_item(…, p_expected_from)` deixa o
   chamador afirmar o estado que leu (falha `WI002` se mudou). `create_work_item_from_message(…,
   p_idempotency_key)` aceita a chave do cabeçalho `Idempotency-Key` da S1b; sem ela, a chave é
   `message:<id>:<delivery_type>`. As chamadas com a assinatura do briefing funcionam iguais.
5. **`transition_work_item` não é executável por `authenticated`.** A decisão do usuário passa por
   `decide_approval`, que move o trabalho por dentro. Pausar/cancelar pelo usuário ainda não tem caminho
   (não está na S1b).
6. **`decide_approval` faz mais que o UPDATE** (efeitos da §2) na mesma transação, para a S1b não precisar
   orquestrar e o clique repetido não duplicar nada.
7. **Trabalho nasce `draft`** ("trabalho criado não significa execução iniciada", Documento Mestre §8). O
   runtime o leva a `in_progress` quando o run começa. Responsável: dono do prefixo da delivery no catálogo
   (`01` Nexo, `02` Bia, `03` Kaia, `04` Otto, `05` Kiwi, `06` Max, `07` Iris, conforme os `agent.yaml`); sem
   tipo, o agente da conversa direta; senão o Nexo. Tipo fora de `01`–`07` é recusado.
8. **Papel mínimo para agir: editor.** Viewer lê tudo, mas não posta, não cria trabalho nem decide.
   `authorize` (ação externa) exige admin. Pergunta 2 e 3 da §6.
9. **Uma Sala do Squad ativa por workspace e uma conversa ativa por objeto** (índices únicos parciais):
   "abrir conversa do objeto" vira buscar ou criar, sem duplicata em corrida.
10. **Coluna a mais: `approvals.run_id`**, o run que espera a decisão (a S1c retoma o run por ela).
11. **`run_events` sem `updated_at`** (lista de colunas do briefing; é só inserção). Nas outras 12 tabelas
    há `created_at`/`updated_at` com `app.set_updated_at()`.
12. **Tokens em `run_steps`**: as mesmas quatro colunas de `runs` e `cost_usd`, para o custo por etapa somar
    o do run.
13. **`delivery_files.storage_path`**: CHECK com o prefixo `<workspace_id>/deliveries/` e trigger que confere
    `<delivery_id>/<version_no>/` da versão. É o prefixo que a política do bucket vai usar.
14. **Broadcast com ids e estados**, não com o conteúdo (texto da legenda, observação): o cliente busca pela
    API. Sem política de INSERT em `realtime.messages`: só o banco publica no canal do workspace. A política
    compara texto com texto (`'workspace:' || id`), então tópico malformado não quebra a consulta.
15. **pgmq fechado também em função e tabela**, além do schema, com default privilege para funções
    recriadas numa atualização da extensão.
16. **Seed recomeça o núcleo dos três workspaces do seed** (apaga conversas, trabalhos, runs e projetos
    deles, esvazia as quatro filas) e grava linhas com ids e horários fixos. Inclui 3 eventos em
    `audit_events` para o histórico do trabalho do seed (criado, `draft → in_progress`,
    `in_progress → needs_you`). Único valor que muda a cada execução: `deliveries.updated_at`.
17. **Estados de projeto**: `draft`, `active` (padrão), `paused`, `done`, `cancelled`. Sem máquina de estados.
18. **Skills:** `supabase-postgres-best-practices` e `verification-before-completion`. A revisão de segurança
    foi manual (IDOR e vazamento de existência, papel por ação, escrita direta, cruzamento de tenant por FK,
    canal do Realtime, fila); não abri `security-review` (ela revisa diff pendente, e cada item já ia com
    commit).

## 5. Pendências

1. **S1b:** não há caminho de escrita do usuário em `conversations` (nem GRANT, nem função): "criar conversa
   a partir de um objeto" precisa de uma função `app.*` na S1b (os índices únicos parciais já servem ao
   buscar-ou-criar). Limitar o tamanho do `briefing` na API (o banco só exige objeto JSON).
2. **S1c:** o worker reivindica o run com `UPDATE runs SET status = 'running' WHERE id = $1 AND status =
   'queued'` (mensagem repetida vira no-op) e arquiva a mensagem do pgmq depois. `runs.error` e
   `run_steps.payload` ficam visíveis aos membros: gravar já redigido. Mensagem de agente não publica sozinha
   no Realtime; o worker grava um `run_event` (ex.: `message.created`) junto. Hoje o papel privilegiado é o
   `postgres`; um papel próprio do worker fica para a S1c.
3. **Storage:** bucket e políticas de `delivery_files` não existem ainda (nenhum arquivo é gravado na S1a).
4. `runs_scheduled`, `external_actions` e `memory_reflect` existem sem produtor nem consumidor.

## 6. Perguntas para o dono (não decidi; segui a leitura mais conservadora)

1. Conversa direta com um agente é visível para todos os membros do workspace (hoje é) ou só para quem a abriu?
2. Viewer só lê (hoje não envia mensagem, não cria trabalho e não decide)?
3. Autorizar ação externa (`authorize`) exige admin ou owner (hoje sim)?
4. "Rejeitar" uma revisão cancela o trabalho ou pede outra proposta? Hoje a decisão fica registrada e o
   trabalho continua em `needs_you`, à espera de cancelar ou pedir ajuste. Não escolhi o cancelamento porque
   ele é final.
5. `scheduled → done` (execução confirmada pela API do canal) conta como a "verificação explícita" que libera
   o Concluído?
6. Estados de projeto (`draft`, `active`, `paused`, `done`, `cancelled`) servem?

## 7. Estado em que deixei a máquina

- Banco no estado do seed (`make seed` depois do teste ponta a ponta), última migration `20261016063800`,
  `hellosquad_api` com a senha do `.env`.
- Porta 8100 livre. `docker ps`: 11 containers `*_hellosquad`, os mesmos do início.
- `docs/PLANO_DE_ACAO_FASE0.md` modificado no disco não é meu e ficou fora dos meus commits.
