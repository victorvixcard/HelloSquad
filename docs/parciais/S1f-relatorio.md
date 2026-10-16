# S1f — Relatório (Stark)

**Fatia:** S1f, conversa completa (Fase 1). **Data:** 16/10/2026, 11:47 → 12:24 (37 min, alvo 60).
Commits em `main`, todos com push: `53b7e52`, `0c34d43`, `b7efcae`, `9943184` (autosave 12:10, levou o worker e os
cartões antes do meu commit), `5cdaf99`, `f754b27`, `6c71d09`, `6e31a17`, `c0b0444`, `8ba9f75`, `2a3e0b8` e o deste
relatório. Progresso item a item em `S1f-progresso.md`. Não toquei em `apps/web/` nem em `packages/ui/` (a A1b estava lá);
`packages/contracts` só pelo gerador.

**Especificação seguida:** `FLUXOS_DA_V46.md` §4 (conversa), §5, §6, §10.1, §10.3 e §11; `x1/cartoes_da_conversa.txt`;
`x1/notas_conversa_pendencias.md` §A7–§A9; `x1/notas_memoria_autonomo_conexoes.md` §A5–§A11; protótipo conferido por linha
(`GKEYS` L5876–5884, `_groupThread`/`_groupSpeaker` L7128–7145, `_shortNow` L8063, `_status` L6741–6893, `_m5Off` L12983).

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | **Conversa em grupo, um especialista por vez** | `conversation_kind` ganha `group`; `app.create_conversation(…, p_agent_ids)` aceita 2 a 6 especialistas diferentes, guarda o conjunto na ordem do squad (`group_key`) e **reabre a mesma conversa para o mesmo conjunto** (como `_groupThread`); à frente, o Nexo se participa, senão o primeiro. `app.conversation_speaker` escolhe quem responde: `@Nome` de quem participa direciona; no grupo, sem menção, as palavras do protótipo (`GKEYS`; empate fica com o primeiro na ordem); sem nenhuma, o Nexo ou o primeiro; na Sala, o Nexo; nas outras, quem está à frente. `POST /messages/{id}/reply` (`app.request_reply`) põe na fila um **run de resposta sem trabalho** (`runs.message_id`), um por mensagem (repetir devolve o mesmo; mensagem que virou trabalho → 409). O worker (`run_reply`) responde com as instruções de `squad/conversa.md` no lugar da skill, a memória do run e o histórico; **na mesma conversa, uma resposta espera enquanto outro run fala** (desfecho `waiting`, volta à fila em 5 s). Resposta não reserva crédito | migrations `20261016150000`, `…150100`; `conversations/`; `squad/flow.py` (`run_reply`), `store.py` (`_begin_reply`, `load_reply`, `reply`), `loader.py` (`reply_prompt`), `worker/main.py`; `squad/conversa.md`; fixture `llm/fixtures/conversa/reply.json` |
| 2 | **Contexto de objeto para os tipos do protótipo, tópico e não lidas** | `context_type` aceita 12 tipos: pelo `id`, lidos do banco, `project`, `work_item`, `delivery`, `memory_fact` (`brand_facts`) e `insight` (`memory_suggestions`, "<Agente> percebeu"); pela chave (`context_key`), com título obrigatório, `calendar_post`, `metric`, `opportunity`, `responsibility`, `segment`, `document` e `capability` (código da delivery; **uma conversa por pedido**, "Mais um, separado do anterior."). `context_meta` guarda período, origem e resumo (e título/estado de quem vem pela chave). O cartão de contexto devolve tipo, id ou chave, título, estado, resumo, período e origem. `conversations.topic` (só na Sala; só o agente escreve, `app.set_conversation_topic`). `conversation_reads` (`last_read_at` por pessoa, RLS só a própria) + `app.mark_conversation_read` (nunca volta para trás); `GET …/conversations` traz `unread_count`, `last_read_at` e `agent_ids`; `GET /workspaces/{id}/conversations/unread` dá o total, a Sala e **o badge por especialista à frente** (o ambiente dele); `POST /conversations/{id}/read` | `…150100`; `conversations/routes.py`, `schemas.py`; `domain.py` |
| 3 | **Cartão estruturado na mensagem do agente** | `messages.card` (`work_created`, `material`, `approval`, `question`, `options`, `team`, `budget`) com `work_item_id`, `delivery_version_id` e `approval_id` em FK composta (mesmo workspace) e checagem por tipo (material exige versão e trabalho; approval/question/options exigem a pendência; options exige a lista; os outros, o trabalho); só mensagem de agente; ligação sem cartão é recusada; `approvals` ganha `unique (workspace_id, id)`. O worker grava `material` na entrega (ações `approve`/`approved` e `request_changes`/`changes_requested`) e `question` na pergunta do Nexo (`answer`/`answered`). `GET …/messages` devolve o cartão com o **estado atual do objeto** (`approval_status`, `decision`, `answer`, `version_status`, `work_item_status`). A decisão continua em `POST /approvals/{id}/decision`. Nada muda no que a A1a lê (o anexo `delivery_version` continua; a ordem dos eventos também) | `…150200_message_cards.sql`; `store.py` (`_card`); `conversations/` |
| 4 | **Status por etapa e `conversation.typing`** | `agent.thinking`, o novo `conversation.typing` (`conversation_id`, `agent_id`) e `approval.requested` levam `status_mode` (modos da V4.6), `status_short` (`_shortNow`: "escrevendo", "criando", "pesquisando", "trabalhando", "aguarda você") e `status_label` (`_status`: "Nexo · organizando seu pedido", "Otto · criando a primeira versão", "Otto · ajustando a versão", "Otto · aguarda sua aprovação", "Nexo · aguarda sua resposta", "Bia · escrevendo"), no idioma do workspace pelo catálogo do backend | `squad/flow.py` (`status_fields`), `store.py` (`thinking`), `i18n/pt-BR.json` |
| 5 | **Memória: ações que faltaram na S1d** | Funções do owner, idempotentes, com auditoria: `stop_using_fact` ("Não usar mais", guarda `unused_from`) e `resume_using_fact` ("Voltar a usar", devolve o estado de antes); `confirm_fact` ("Confirmar" de Da fonte e Observado); `keep_fact` ("Continua valendo": Desatualizado → Da fonte); `add_fact` ("Adicionar conhecimento": Confirmado na fonte "Declarado por você"; sem assunto, o primeiro da área; sem chave, "Contado por você", pelo catálogo); `mark_suggestion_seen` (aberto → visto). `brand_profiles` (descrição do negócio, do owner, `app.set_brand_description`; síntese do squad, do agente, `app.set_brand_summary`), no dossiê como `profile`; seed com a descrição da Miolo de `DADOS_FICTICIOS.md`. **Busca sem acento**: configurações `app.{portuguese,english,spanish}_unaccent`, `memory_search_config` trocada e os conhecimentos gravados migrados. Rotas `POST /memory/facts/{id}/state`, `POST /workspaces/{id}/memory/facts`, `POST /memory/suggestions/{id}/seen`, `PUT /workspaces/{id}/memory/profile` | `…150300_memory_actions.sql`; `memory/`; `supabase/seed.sql` |
| 6 | **Testes, contrato e docs** | pgTAP `18_complete_conversation` (55) e `19_memory_actions` (29); pytest `test_conversation_complete` (7) e `test_memory_actions` (5); `test_worker`, `test_core_api` e `14_create_conversation` ajustados ao que mudou (3 eventos `conversation.typing`, cartão de contexto com mais campos, mensagem de tipo desconhecido); `make openapi` + `pnpm --filter contracts generate` (+7 rotas; campos novos opcionais, nada removido); `SETUP_LOCAL.md` §"Conversa completa (S1f)"; evidências em `docs/parciais/s1f/` | — |

## 2. Como foi verificado

**`make test`** (16/10 12:21, depois do último código; exit 0; resumo em `docs/parciais/s1f/make_test.txt`):

```
All checks passed!                                   (ruff)
67 files already formatted
============================= 128 passed in 21.68s =============================   (pytest; era 116)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  16 passed (16)
apps/web test:       Tests  121 passed (121)
Files=20, Tests=441, …                                (pgTAP; era 357)
Result: PASS
```

**`make e2e`** (12:21–12:22, build de produção, worker simulado; exit 0; `docs/parciais/s1f/make_e2e.txt`). Parei o `next dev`
da 3100 antes (o `next build` o quebra) e subi de novo depois (`/entrar` 200 às 12:23); a API da 8100 ficou no ar:

```
  ✓   9 … Ao vivo (A1a) … Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova (3.1s)
  ✓  10 … Ao vivo (A1a) … Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo (4.9s)
  10 passed (17.3s)
worker: entrega v1 … entrega v1 … entrega v2; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados
```

O cartão "Material · vN" e os dois fluxos ao vivo da A1a seguem verdes com os eventos novos e o cartão gravado.

**Roteiro contra a API no ar** (`docs/parciais/s1f/curl_conversa.txt`, executado às 12:20 e seguido de `make seed`):

```
$ POST /workspaces/{miolo}/conversations {"kind":"group","agent_ids":["otto","bia","kaia"]}
{"kind": "group", "primary_agent_id": "bia", "agent_ids": ["bia", "kaia", "otto"], "unread_count": 0}
$ POST /messages/{id}/reply (duas vezes) e "@Kaia, o que você acha?"
{"run_id":"…","agent_id":"bia","status":"queued"} -> 201
{"run_id":"…","agent_id":"bia","status":"queued"} -> 200
{"run_id":"…","agent_id":"kaia","status":"queued"} -> 201
$ make worker (--drain duas vezes)
run …: outro especialista está respondendo nesta conversa; volta em 5s
run … concluído: bia respondeu na conversa; …
fila esvaziada: 2 mensagem(ns) tratada(s) ['replied', 'waiting']
run … concluído: kaia respondeu na conversa; …
$ GET /workspaces/{miolo}/conversations/unread → POST /conversations/{grupo}/read → de novo
{"conversations":1,"messages":2,"squad_room":{"conversations":0,"messages":0},"by_agent":[{"conversations":1,"messages":2,"agent_id":"bia"}]}
{"unread_count": 0}
{"conversations":0,"messages":0,"squad_room":{"conversations":0,"messages":0},"by_agent":[]}
$ conversa sobre um indicador (pela chave)
{"type": "metric", "id": null, "key": "alcance:semana", "title": "Alcance da semana", "status": null, "summary": null, "period": "Semana 42", "origin": "Resultados · semana"}
$ Memória
{"key": "Tom de voz", "state": "unused", "unused_from": "confirmed"}
{"key": "Tom de voz", "state": "confirmed", "unused_from": null}
{"topic": "História", "key": "Contado por você", "state": "confirmed", "source_type": "correction"}
["Aos domingos a loja fecha às 13h"]          (busca "domingo as 13h", sem acento)
```

**O que os testes novos provam**

| Teste | Cobre |
|---|---|
| `test_group_is_one_per_set_with_two_to_six_specialists` | grupo 201 e o mesmo conjunto em outra ordem 200 com o mesmo id; à frente Bia (sem Nexo) e Nexo (com ele); 1, 7 e repetidos → 422; à frente fora do grupo → 422 |
| `test_one_specialist_answers_each_message_in_the_group` | "mercado e concorrência" → Bia, "@Kaia" → Kaia, "Bom dia" → Bia; repetir o pedido devolve o mesmo run; **três rodadas do worker: `[replied, waiting, waiting]`, `[replied, waiting]`, `[replied]`** (um por vez na mesma conversa); uma resposta por mensagem, de um especialista só; eventos `started, agent.thinking, conversation.typing, step.done, message.created, finished`; `status_label` "Bia · escrevendo"; nenhuma reserva de crédito; mensagem que virou trabalho → 409 |
| `test_a_second_reply_waits_while_someone_is_speaking` | com um run de resposta em execução, o segundo da mesma conversa sai `waiting` no `begin()` |
| `test_unread_is_per_person_and_isolated` | Vitta: a mensagem do Rafael não conta para ele (1 não lida: a da Íris) e conta para a Carla (2); Rafael lê → 0 e a Carla continua 2; ler para trás não desfaz; resumo da Carla por especialista à frente (Max); Marina → 404 em ler, pedir resposta e no resumo; só a leitura do Rafael gravada |
| `test_object_context_for_the_prototype_types` | indicador pela chave com período e origem e reaberto; conhecimento pelo id com título e estado do banco; "percebeu" fica com quem percebeu; capacidade abre uma conversa por pedido, com o Otto; capacidade fora do catálogo, chave sem título e id em tipo de chave → 422; objeto inexistente → 404 |
| `test_agent_cards_are_linked_to_their_objects` | cartão `material` ligado à versão, à pendência e ao trabalho certos, com as duas ações; `question` ligado à pendência `respond`, do Nexo; depois de aprovar, o cartão mostra `decided`/`approved`/versão `approved`; `status_label` das etapas: "Nexo · organizando seu pedido", "Otto · criando a primeira versão" (produção e checagem) e "Otto · aguarda sua aprovação" |
| `test_room_topic_is_written_by_the_agent` | o tópico escrito pelo papel do agente aparece em `GET /conversations/{id}` |
| `test_memory_actions` (5) | não usar mais e voltar a usar guardam e devolvem o estado (Confirmado e Decisão sua), sem versão nova; confirmar Observado; "continua valendo"; 409 fora do estado; adicionar entra declarado e confirmado, com assunto e chave padrão ou escolhidos, e aparece na busca ("domingos", "nao usar", "não usar", "fermentacao"); vista e depois decidida; descrição do dono e síntese do agente; Carla (editor) 403 "Só o dono da conta toma esta decisão."; Marina e Pedro 404 na Vitta |
| pgTAP `18` (55) e `19` (29) | o mesmo no banco, mais: `conversation_speaker` e `set_conversation_topic` fora do alcance de `authenticated`; empate de palavras; menção a quem não participa; Sala com e sem menção; campos de contexto desconhecidos e longos; uma mensagem na fila por pedido; leitura no futuro fica em agora; Carla não vê a leitura do Rafael; tópico só na Sala do próprio workspace; cartão sem a versão, em mensagem de pessoa, ligação sem cartão e **ligação a objeto de outro workspace (23503)** recusados; `brand_profiles` com RLS forçada e invisível para outra empresa; síntese só pelo agente; busca "nao usar" acha "Não usar". A varredura `01_rls_coverage` segue verde com as duas tabelas novas |

## 3. Decisões técnicas (não mudam o combinado)

- **Quem responde é decidido no banco, pela regra do protótipo** (`GKEYS` + desempate do Nexo, L7141). É a escolha do Nexo da V4.6; quando o Nexo real escolher por modelo, troca a função sem mudar o contrato. A API já diz quem vai responder (`agent_id` do pedido de resposta), o que deixa o web mostrar "<Nome> está escrevendo" na hora.
- **Resposta é pedida explicitamente** (`POST /messages/{id}/reply`), não disparada por toda mensagem: a mesma mensagem pode virar trabalho (o web decide), e duas respostas para ela seriam dois especialistas falando. Mensagem que virou trabalho recusa a resposta (409); o especialista do trabalho responde.
- **Um por vez vale por conversa, para a resposta**: o run de resposta espera enquanto qualquer run da mesma conversa está em execução. O run de entrega não espera respostas (o comportamento da S1c e o teto por workspace ficaram como estavam).
- **Resposta não reserva crédito** (crédito é por entrega, S1e; não há preço para "conversa"). Ver pergunta 2.
- **Cartão gravado depois da pendência**, numa atualização na mesma transação: assim a ordem dos eventos que a A1a usa (`delivery.created` → `message.created` → `approval.requested`) e o anexo `delivery_version` ficaram iguais. Cartão sai junto com o objeto (`on delete cascade`): não existe cartão solto.
- **Ações do cartão são ids** (`approve`, `request_changes`, `answer`, `choose`, `open`) com a decisão que mandam; o texto do botão é do catálogo do web.
- **Objeto sem tabela vem pela chave** com título obrigatório no cartão; quando a tabela existir (calendário, indicadores, oportunidades, responsabilidades, segmentos, documentos), o tipo passa para a lista dos lidos pelo `id`.
- **Não lidas**: sem leitura gravada, contam todas as mensagens de outros; as próprias nunca contam. `read_at` opcional (a hora da última mensagem vista) evita marcar como lida uma mensagem gravada durante a leitura.
- **"Adicionar conhecimento"** usa `source_type = correction` na fonte declarada: é o que a S1d já usa para o que o dono declara, e o web mostra "Declarado por você".
- **Busca sem acento**: a troca da configuração dos conhecimentos já gravados desliga a trava de edição só durante o `UPDATE` de `search_config` na migration (conteúdo, estado e datas não mudam).
- **Status**: rótulos do `_shortNow` e do `_status` da V4.6 no catálogo do backend; a checagem e a revisão interna seguem "criando a primeira versão", como a A1a já mostra (A1a §5 item 8).

## 4. Onde discordei do briefing

| Briefing | O que fiz | Por quê |
|---|---|---|
| "o Nexo escolhe quem responde" | regra determinística do protótipo no banco, não uma chamada de modelo do Nexo | é a escolha que a V4.6 desenha; sem a chave da Anthropic, o modo simulado é o único; troca depois sem mudar a API |
| "`@Nome` na mensagem direciona" | direciona só quem participa da conversa | o protótipo não interpreta a menção (§11 item 8); chamar quem não está no grupo seria aumentar o grupo, o que nem o protótipo nem o dono decidiram |
| "o worker da S1c passa a emitir os cartões" | emite `material` e `question` | são os momentos que o fluxo tem hoje. `work_created`, `approval`, `options`, `team` e `budget` estão prontos no banco e na API, mas o fluxo ainda não tem o momento (confirmação de escopo com texto do agente, projeto e equipe, proposta com verba, opções no briefing): S1g e Fase 3 |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais literal)

1. **Conversa em grupo, §11 item 8:** um especialista por vez está decidido (10:20). A menção "@Nome" chama só quem já está na conversa (como fiz) ou também chama alguém de fora para entrar?
2. **Resposta na conversa custa crédito?** Hoje não: crédito é por entrega. Se for cobrar, entra um preço para "conversa" em `delivery_prices` (provisório) e a reserva no run de resposta.
3. **Não lidas de quem nunca abriu a conversa:** o protótipo tem uma pessoa só. Com mais pessoas no negócio, tudo o que os outros escreveram conta como não lido (como fiz) ou só o que chegou depois de a pessoa entrar no negócio?
4. **Síntese do squad da Miolo no seed:** o texto `SUM5` do protótipo não está em `DADOS_FICTICIOS.md`; deixei a síntese vazia (o agente escreve) e a descrição do negócio com o que está lá. Quer o texto do protótipo no seed (precisa entrar no `DADOS_FICTICIOS.md`)?

## 6. O que ficou de fora

- **No web (Aranha):** chamar `POST /messages/{id}/reply` quando a mensagem não vira trabalho nem resposta; mostrar os cartões a partir de `card` (o "Material · vN" atual continua pelo anexo); badges de não lidas e `POST …/read` ao abrir; usar `conversation.typing` e `status_label`; a sistema "Conversa em grupo com <nomes>" e a nota do grupo saem do catálogo do web (não gravei mensagem de sistema com texto fixo); botões das ações novas da Memória.
- **Emissão dos outros cinco tipos de cartão** pelo worker (ver §4).
- **"Contexto atualizado: …" e "Atualizar para <período>"** (mudar o contexto de uma conversa reaberta): não pedido; o contexto fica o da abertura.
- **Quem escreve o tópico da Sala no fluxo:** a função existe, mas nenhum fluxo cria projeto na Sala ainda (S1g).
- **Da S1d §7 fora do briefing desta fatia:** "Alterações recentes" (os eventos `memory.*` estão em `audit_events`), "como cada agente usa" (`how`) e a escolha de quem usa (`_m5Scope`).
- Notificações guardadas (sino) e avisos fora do produto (§11 item 7).

## 7. Estado em que deixei a máquina

- Banco: migrations até `20261016150300` aplicadas por `make migrate` (sem `db reset`); seed reaplicado pelo teardown do `make e2e` (12:22). Fila `runs_interactive` vazia.
- API da 8100: a do dono (`uv run hellosquad-api`, com reload), nunca parada; carregou as rotas novas sozinha (`/health` 200).
- Web da 3100: `next dev` parado para o `make e2e` e subido de novo desacoplado (`setsid nohup make dev-web`, log em `/tmp/hellosquad-dev-web.log`); `/entrar` 200 às 12:23.
- Nenhum worker rodando (o do e2e encerrou: "worker encerrado"). Logs só em `/tmp/s1f_*` (sem chave).
