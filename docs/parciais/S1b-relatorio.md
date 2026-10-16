# S1b — Relatório (Stark)

**Fatia:** S1b, API do núcleo da Fase 1. **Data:** 16/10/2026, 03:51 → 04:09.
Commits em `main`, todos com push: `c00a4b5`, `c99e6b8`, `d4688aa`, `2323f42`, `70c6b00` e o deste relatório.
Não toquei em `apps/web/`, no worker nem em `squad/`; não implementei worker nem LLM (S1c).

## 1. O que mudou

| Onde | Conteúdo |
|---|---|
| `supabase/migrations/20261016070000_create_conversation_and_deliveries_bucket.sql` | `app.create_conversation(workspace_id, kind, primary_agent_id, context_type, context_id, title)` para `authenticated` editor+; bucket privado `deliveries` e a política `deliveries_select_member` em `storage.objects`. |
| `supabase/tests/database/14_create_conversation.test.sql` | pgTAP da função e do bucket (25 asserções). |
| `apps/backend/src/hellosquad/` | Módulos da Arquitetura §4.1: `conversations/`, `work/` (projetos, trabalhos, entregas), `approvals/`, `autonomy/` (runs); `domain.py` (enums espelho do banco); `api/pagination.py` (cursor); `api/errors.py` (tabela SQLSTATE → HTTP); `api/deps.py` (`ensure_workspace`). |
| `apps/backend/tests/test_core_api.py` | 13 testes de integração contra o Supabase local. |
| `packages/contracts/openapi.json`, `src/schema.ts` | Contrato regenerado (16 caminhos). |
| `docs/SETUP_LOCAL.md` | Seção "Pedido → trabalho → aprovação (S1b)" em `curl`. |

**Rotas** (todas com `Authorization: Bearer`, como o usuário do JWT, RLS valendo)

| Método e caminho | Função do banco | Sucesso |
|---|---|---|
| `GET /workspaces/{id}/conversations?cursor=&limit=` | — | 200, ativas, atividade mais recente antes |
| `POST /workspaces/{id}/conversations` | `app.create_conversation` | 201 criada; 200 Sala do Squad ou conversa de objeto já existente |
| `GET /conversations/{id}` | — | 200, com `participants` e `context` (título e estado do objeto) |
| `GET /conversations/{id}/messages?cursor=&limit=` | — | 200, ordem cronológica, cursor `(created_at, id)`, `next_cursor` |
| `POST /conversations/{id}/messages` | `app.post_message` | 201 |
| `POST /messages/{id}/work-items` | `app.create_work_item_from_message` | 201 com o trabalho e `run_id`; 200 ao repetir (mesmo trabalho e run) |
| `GET /workspaces/{id}/work-items?status=&project_id=&cursor=` | — | 200, mais novo primeiro; `status` aceita repetição |
| `GET /work-items/{id}` | — | 200 com `briefing`, `steps`, `deliveries[].versions[].files`, `approvals`, `runs` (resumo) |
| `GET /workspaces/{id}/approvals?status=pending` | — | 200, "Precisa de você", mais antiga primeiro, com o resumo do trabalho |
| `POST /approvals/{id}/decision` | `app.decide_approval` | 200; repetir devolve o mesmo estado |
| `GET /workspaces/{id}/projects`, `GET /projects/{id}` | — | 200 (só leitura) |
| `GET /runs/{id}`, `GET /runs/{id}/events?after=` | — | 200 (só leitura; `next_after`) |

**Erros** (handler central, `api/errors.py`; formato `{"error": {"code", "message", "details"}}`)

| SQLSTATE | HTTP | `code` |
|---|---|---|
| `P0002` | 404 | `not_found` |
| `42501` | 403 | `forbidden` |
| `22023` | 422 | `invalid_parameter` |
| `22P02` | 422 | `invalid_value` |
| `55000` | 409 | `invalid_state` |
| `WI001` / `WI002` | 409 | `transition_not_allowed` / `status_changed` |

A `message` é a do `RAISE` da função `app.*` (português, escrita para o usuário) quando o erro vem de um
`RAISE`; fora disso (RLS, cast do Postgres), uma mensagem padrão em português por código, sem texto interno
do banco. Coleção de workspace alheio, item de outro workspace e id inexistente respondem o mesmo 404.
Também novos: 422 `invalid_cursor` e 409 `idempotency_key_reused`.

## 2. Como foi verificado

**Do zero:** `make up && make migrate && make seed && make test` (16/10, 04:08), exit 0. Log em
`/tmp/s1b_final.log` (103 linhas); trechos:

```
{"applied":[],"message":"Migrations applied"}
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
seed aplicado: ../../supabase/seed.sql
All checks passed!                                                      (ruff)
============================== 64 passed in 4.33s ==============================   (pytest; era 51)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  44 passed (44)
01_rls_coverage ........... ok        14_create_conversation .... ok
Files=15, Tests=241 ...                                                 (pgTAP; era 216)
Result: PASS
```

**O que os 13 testes de `test_core_api.py` provam** (cada um termina reaplicando o seed)

| Teste | Cobre |
|---|---|
| `test_api_enums_match_the_database` | Os 12 enums e o domínio `agent_id` da API iguais aos do banco (`enum_range`). |
| `test_request_becomes_work_item_with_queued_run` | Marina abre conversa com o Otto (201, participantes), posta (201, texto aparado), cria o 04.01 (201, `draft`, Otto, `run_id`); run `queued`; **uma** mensagem em `runs_interactive` lida pelo papel `postgres` com `workspace_id`, `agent_id` e `work_item_id`; repetir a chave → 200, mesmo trabalho e run, nenhuma mensagem nova; detalhe e `GET /runs/{id}`; a mensagem da fila é apagada no fim. |
| `test_needs_you_shows_seed_approval_and_decision_is_idempotent` | "Precisa de você" lista a aprovação do seed (revisão, versão 1, trabalho `needs_you`); `approved` → trabalho `approved`, versão `approved` e atual da entrega; repetir `approved` e tentar `changes_requested` → 200 com o corpo idêntico; um único `approval.decided` em `audit_events`; lista pendente vazia depois. |
| `test_editor_decides_review_but_not_authorize` | Carla (editor da Vitta) pede ajuste numa revisão (200, nota gravada) e recebe 403 `forbidden` "Seu papel não permite tomar esta decisão." no `authorize`, que segue `pending`. |
| `test_pedro_without_workspace_sees_nothing` | 9 leituras e 4 escritas da Miolo → 404 `not_found`; `GET /workspaces` vazio. |
| `test_marina_cannot_read_vitta_conversation` | Conversa da Vitta: Marina recebe o mesmo corpo de um id inexistente (leitura, mensagens e post); Rafael lê. |
| `test_viewer_reads_but_cannot_act` | Pedro como viewer temporário da Miolo lê as mensagens e recebe 403 ao postar, abrir conversa, criar trabalho e decidir; o membership sai no `finally`. |
| `test_messages_paginate_by_cursor_in_chronological_order` | 3 mensagens, `limit=2`: `primeira, segunda` + cursor → `terceira`, `next_cursor` nulo; cursor quebrado → 422 `invalid_cursor`. |
| `test_idempotency_key_is_bound_to_one_request` | Chave repetida → 200 mesmo trabalho; a mesma chave em outra mensagem → 409; sem chave, mesma mensagem e tipo → 201 depois 200 (agente da conversa direta). |
| `test_database_errors_follow_the_s1a_table` | `22023` (fora do catálogo, decisão incompatível, contexto fora de `object`) → 422 com a mensagem da função; `P0002` (objeto inexistente) → 404; `55000` (conversa arquivada) → 409 `invalid_state`. |
| `test_squad_room_and_object_conversation_are_reused` | Sala do Squad do seed volta com 200 e os 7 agentes; conversa do trabalho do seed 201 e depois 200, mesmo id, cartão com título e estado; lista por atividade. |
| `test_work_items_filter_and_projects` | Filtros `status` (repetido), `project_id`, estado inválido → 422; lista e detalhe de projeto; Rafael → 404. |
| `test_run_events_after_cursor` | `after=1&limit=1` → `seq` 2 com `next_after=2`; `after=2` → `seq` 3, `next_after` nulo. |

**pgTAP `14_create_conversation` (25):** conversa direta sempre nova com quem abriu e o agente, título aparado,
`conversation.created` em `audit_events`; Sala do Squad do seed reutilizada (sem segunda); conversa do objeto
com o agente do objeto e reutilizada; `22023` para contexto fora de `object`, objeto ausente, tipo
desconhecido, direta sem agente e título longo; `23514` para agente fora de `squad/`; objeto da Vitta → `P0002`;
Rafael e Pedro → `P0002`; viewer → `42501`; anon não executa; Trilha ganha a Sala do Squad (Nexo, 7 agentes) e a
reutiliza; bucket privado; Marina lê só o prefixo da Miolo e não grava.

**`curl` real contra `make dev-api`** (o bloco do `SETUP_LOCAL.md`, executado como está; `docs/parciais/s1b/curl_dev_api.txt`):

```
201 trabalho b8d0689e-… draft, run c519ae5b-…
200 trabalho b8d0689e-… draft, run c519ae5b-…
200 aprovação decided approved em 2026-10-16T07:06:09.143218Z, trabalho approved
200 aprovação decided approved em 2026-10-16T07:06:09.143218Z, trabalho approved
approved                                                                (versão da entrega)
fila runs_interactive (papel postgres): msg 17 → run c519ae5b-… (otto), run queued
POST /workspaces/<id>/conversations 201 · POST /conversations/<id>/messages 201 · POST /messages/<id>/work-items 201, 200
GET …/work-items 200 · GET …/messages 200 · GET …/approvals 200 · POST /approvals/<id>/decision 200, 200 · GET /work-items/<id> 200
```

**Bucket pela API do Storage de verdade** (`docs/parciais/s1b/storage_api.sh` e `storage_api.txt`): upload com a
chave secreta 200; Marina lê 200 (`prova da S1b`); Rafael recebe `Object not found`; Marina gravando no próprio
prefixo recebe `new row violates row-level security`; sem token 400; objeto removido, bucket vazio.

**Estado ao fim:** `make seed` depois do `curl`; depois do `make test`: 1 trabalho, 2 conversas, 3 mensagens,
1 aprovação pendente, 1 run, fila vazia, 4 memberships, 3 eventos de auditoria, 0 projetos, 0 `run_events`,
bucket `deliveries` privado e vazio. Porta 8100 livre; 11 containers `supabase_*_hellosquad`.

## 3. Decisões tomadas e onde divergi do briefing

1. **`create_conversation` é buscar ou criar** para a Sala do Squad e para a conversa de objeto (os índices
   únicos parciais da S1a); a conversa direta nasce nova a cada chamada. 201 ou 200 sai de `created_at = now()`
   (a linha nasceu nesta transação), sem mudar a assinatura pedida.
2. **Objeto de contexto validado:** só `project`, `work_item` e `delivery`, e o objeto precisa existir no mesmo
   workspace (senão `P0002`, igual a inexistente). Tipo novo de objeto exige migration. Sem agente informado, a
   conversa do objeto fica com o responsável dele; a Sala do Squad, com o Nexo, título "Sala do Squad" e os sete
   agentes como participantes (como no seed).
3. **`conversation.created` em `audit_events`**, no padrão de `work_item.created` (o seed já limpa esse tipo).
4. **Códigos de erro por categoria** (`not_found`, `forbidden`…), com a mensagem específica do recurso. As
   rotas novas usam `not_found` também para workspace alheio; o `GET /workspaces/{id}` da S0 mantém
   `workspace_not_found` (não mexi no contrato que o web já usa).
5. **`55000` é `OperationalError` no psycopg**: o handler de indisponibilidade (503) agora repassa para a tabela
   quando o SQLSTATE é dela. O teste de arquivada pegou isso (antes dava 503).
6. **`idempotency_key` no corpo**, como no briefing (a S1a falava em cabeçalho `Idempotency-Key`; o CORS da API
   nem libera esse cabeçalho). **Divergência pequena:** a mesma chave numa mensagem diferente responde 409
   `idempotency_key_reused` em vez de devolver em silêncio um trabalho de outro pedido.
7. **Paginação:** mensagens em ordem cronológica com cursor para frente (leitura literal do briefing);
   conversas por atividade; trabalhos e projetos do mais novo; aprovações da mais antiga; eventos por `seq` com
   `after`. `limit` padrão 50 (máx. 100; eventos 100/500).
8. **`briefing` limitado a 20.000 caracteres** serializado (pendência da S1a), com a mensagem no `details`.
9. **Detalhe do trabalho inclui os arquivos de cada versão** (`delivery_files`, caminho no bucket); o run não
   expõe tokens nem custo em USD (crédito é a S1e).
10. **Limpeza dos testes = reaplicar o seed** depois de cada teste (fixture `autouse`): o trabalho do seed não
    pode voltar de `approved` para `needs_you` por UPDATE (a matriz recusa), e o seed recomeça o núcleo e esvazia
    as filas. A mensagem da fila e o viewer temporário também são apagados explicitamente.
11. **Skills:** `fastapi-expert` (os padrões do repo — psycopg cru, `transaction_as` — valeram mais que os
    exemplos da skill) e `verification-before-completion`.

## 4. Pendências

1. **S1c:** mensagem sem trabalho ainda não aciona agente (o Nexo classificar fica com a S1c); o worker consome
   `runs_interactive` e grava em `deliveries/` com o papel privilegiado; criação de projeto pelo Nexo.
2. **A1a:** `POST …/conversations` pode responder 200 (reutilizada) além de 201; participantes trazem só
   `user_id` (não há tabela de perfis; o nome do usuário logado vem de `/me`).
3. Sem rota para pausar/cancelar trabalho pelo usuário (pendência 5 da S1a) e sem URL assinada para baixar
   arquivo de entrega (o bucket já aceita a leitura do membro com o JWT dele).
4. `realtime.messages` recebe uma linha a cada aprovação criada ou decidida (o próprio `make seed` grava uma);
   fica fora do "estado do seed" e o Realtime descarta as partições antigas.

## 5. Perguntas (segui a leitura conservadora ou literal)

1. O painel da conversa abre pelas mensagens **mais recentes**? Hoje a primeira página é a das mais antigas
   (cronológica, cursor para frente). Se o Aranha precisar, um `before=` resolve sem quebrar o contrato.
2. Conversa direta: uma nova a cada clique (hoje) ou uma por agente e por pessoa, reutilizada?
3. Os três tipos de objeto de conversa (`project`, `work_item`, `delivery`) bastam para a Fase 1?
4. As perguntas 1 a 6 da S1a continuam abertas; a API segue a leitura de lá (viewer só lê; `authorize` exige
   admin; rejeitar não cancela).

## 6. Estado em que deixei a máquina

- Banco no estado do seed; última migration `20261016070000`; `hellosquad_api` com a senha do `.env`.
- Porta 8100 livre (a API do `make dev-api` foi encerrada). `docker ps`: os 11 containers `*_hellosquad` do início.
