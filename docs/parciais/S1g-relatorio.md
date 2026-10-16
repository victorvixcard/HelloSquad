# S1g — Relatório (Stark)

**Fatia:** S1g, trabalho rico (Fase 1). **Data:** 16/10/2026, 12:35 → 13:18 (43 min, alvo 45).
Commits em `main`, todos com push: `f169f37`, `148a9be`, `721fc47` (autosave 13:00, levou o `domain.py`), `07c13a0`,
`dafbe1a`, `4e01705`, `529167b`, `833bb7e`, `ee1ef7f`, `a6f4813`, `fbd9a4a` e o deste relatório. Progresso item a item
em `S1g-progresso.md`. Fora do backend, só toquei em `apps/web/messages/pt-BR/common.json` e `pages.json` (duas chaves,
§4) e em `packages/contracts` pelo gerador.

**Especificação seguida:** `FLUXOS_DA_V46.md` §2.1, §2.3, §2.5, §3.1, §5, §10.2, §10.3 e §11; `x1/notas_objetos_seed.md`
§A1–§A6; `x1/notas_conversa_pendencias.md` §B; protótipo conferido por linha (`_works` L8006–8030, `_needs` L8033–8040,
`_modes` L8049–8062, `_shortNow` L8063, `_projs`/`_pjNext` L10105–10262, `NDK5` e `_nd5Items` L13765–13782).

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | **Trabalho rico** | `work_items` ganha `due_at`, `next_step`, `status_label`, `origin_type` (`message`, `insight`, `routine_run`, `project`) e `origin_ref` (id da mensagem, da sugestão "<Agente> percebeu" ou do projeto; código da execução, ex. `PL-43`), com checagem de formato por tipo; o legado foi migrado. A frase e o próximo passo são **do agente**: o worker escreve em cada etapa ("Nexo organizando seu pedido", "Otto criando a primeira versão" · "Otto entrega a v1"); quando o trabalho muda de estado sem o agente reescrever, um trigger devolve as colunas a nulo e a API mostra **a do estado**, pelo catálogo do backend no idioma do workspace, com os literais de `_works` ("v1 aguarda sua aprovação" · "Aprovar a v1 até sex, 16/10"; "Aprovado. Falta decidir a publicação." · "Autorizar ou não a publicação"; "v2 aprovada · publicação não autorizada" · "Publicação quando você quiser"; "Uma pergunta aguarda você" · "Responder ao Nexo"; "v2 aprovada"; "Entregue e aprovado por você"). **Histórico legível** em `work_item_history` (quem: pessoa, agente ou sistema; o quê: `kind` + `params`; quando; marca `automatic`/`approved_by_you`), escrito por triggers no pedido, na entrega de cada versão e em cada decisão: vale para as rotas, o worker e o seed. A API devolve o texto ("Você pediu na conversa com o Otto", "v1 entregue" · "automático", "Você pediu: “…”", "Você aprovou a v2" · "aprovado por você", "Publicação autorizada para sex, 16/10, 9h"). `GET /work-items` e `GET /work-items/{id}` trazem também `origin` resolvida (conversa, especialista, insight, projeto), `awaiting_you` e `pending_approval`; o detalhe traz `history[]` | migrations `20261016160000`, `…160100`; `work/live.py`, `work/routes.py`, `work/schemas.py`; `squad/flow.py`, `squad/store.py`; `i18n/pt-BR.json` |
| 2 | **Projeto com datas, marcos e participantes** | `projects.starts_at`/`ends_at`; `project_milestones` (título, linha de apoio, especialista, data ou sem data, "decisão sua" = `needs_you`, "previsto" = `planned`, meta = `kind goal`, concluído = `done_at`, ligados ao trabalho e à pendência); `project_participants` (os especialistas com a responsabilidade de cada um; quem conduz entra sozinho). Escrita por funções `app.*` de **editor ou acima** (papéis da S0), leitura para todo membro. **Pedido feito na conversa do projeto entra no projeto**: o especialista na equipe e o trabalho vira marco (L12076); feito na conversa de um "<Agente> percebeu", nasce com a origem no insight. Rotas: `POST /workspaces/{id}/projects`, `GET`/`PATCH /projects/{id}` (patch: só o que vem muda), `PUT /projects/{id}/participants`, `POST /projects/{id}/milestones`, `PATCH /milestones/{id}` (`done`), `GET /workspaces/{id}/milestones` ("Próximos marcos", janela de 10 dias como `_pjNext`) | `…160100`; `work/projects.py` |
| 3 | **`decide`, `next` e "Agora não"** | `approval_kind` ganha `decide` ("Para você decidir"): aceita só `answered` (a escolha na observação) e devolve o trabalho ao agente, como responder. **"Agora não"** (`POST /approvals/{id}/defer`, `app.defer_approval`): só `authorize`, só o owner; a pendência **continua pendente, sem decisão e sem rejeição** (`deferred_at`, `deferred_until` opcional, `deferred_by`), o trabalho não muda de estado, nenhum run nasce e nada é cobrado nem liberado; repetir devolve o mesmo. **"Decidir agora"** (`POST /approvals/{id}/resume`) volta a pedir; uma adiada também pode ser decidida direto. `GET /workspaces/{id}/needs`: `count` só do que depende da pessoa agora, `deferred_count` à parte e os itens `next` ("Em seguida": marco com decisão sua nos próximos 10 dias que ainda não virou pendência) depois, fora da contagem. `GET …/approvals?status=pending` deixa as adiadas de fora (`include_deferred=true` traz). Realtime: `approval.deferred` (`status: deferred`, a faixa atual do web já tira o item) e `approval.resumed` (`status: pending`, volta) | `…160000`, `…160100`; `approvals/`; `work/needs.py` |
| 4 | **Status vivo do squad** | `GET /workspaces/{id}/squad/status`: os sete na ordem do squad com `mode` (`idle`, `work`, `wait`, `live`, `sleep`; `monitor` está no contrato e chega com as rotinas), `status_short` (`_shortNow`: "escrevendo", "criando", "pesquisando", "trabalhando", "aguarda você", "coordenando", "pausado", "disponível") e `status_label` ("Otto · criando a primeira versão" do último `agent.thinking`; "Otto · aguarda sua aprovação", "… · aguarda sua resposta", "… · aguarda sua autorização" pela pendência), com `run_id`/`work_item_id`/`approval_id`. **Mesma regra do `agentModes` do web (A1a)**: etapa de run em execução → `work` (o Nexo na triagem não), pendência não adiada → `wait` (vence o `work`), Nexo `live` enquanto alguém trabalha ou espera; `sleep` vem de trabalho pausado (como o Max no protótipo) | `work/needs.py` |
| 5 | **Testes, contrato e docs** | pgTAP `20_rich_work` (48); pytest `test_rich_work` (5); `make openapi` + `pnpm --filter contracts generate` (36 → 46 rotas, 20 schemas novos, nada removido; campos novos opcionais); `SETUP_LOCAL.md` §"Trabalho rico (S1g)"; evidências em `docs/parciais/s1g/` | — |

## 2. Como foi verificado

**`make test`** (16/10 13:11, depois do último código de produto; exit 0; `docs/parciais/s1g/make_test.txt`):

```
All checks passed!                                   (ruff)
71 files already formatted
============================= 133 passed in 23.81s =============================   (pytest; era 128)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  16 passed (16)
apps/web test:       Tests  121 passed (121)
Files=21, Tests=489, …                                (pgTAP; era 441)
Result: PASS
```

Depois disso mudou só o metadado de erro da rota `/resume` (422 documentado, `fbd9a4a`); o `make test` foi rodado de novo
(resultado na §2.1 abaixo).

**`make e2e`** (13:12–13:13, build de produção, worker simulado; exit 0; `docs/parciais/s1g/make_e2e.txt`). Parei o `next
dev` da 3100 antes e subi de novo depois (`/entrar` 200 às 13:13); a API da 8100 ficou no ar:

```
  ✓   9 … Ao vivo (A1a) … Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova (3.1s)
  ✓  10 … Ao vivo (A1a) … Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo (3.6s)
  10 passed (16.1s)
```

**Roteiro contra a API no ar** (`docs/parciais/s1g/curl_trabalho_rico.txt`, 13:13, seguido de `make seed`):

```
$ GET /work-items/<seed> (Marina)
200 {"status": "needs_you", "status_label": "v1 aguarda sua aprovação", "next_step": "Aprovar a v1", "awaiting_you": true}
  history: [('Você pediu na conversa com o Otto', None), ('v1 entregue', 'automático')]
$ GET /work-items/<post> (autorização pendente)
200 {"status": "approved", "status_label": "Aprovado. Falta decidir a publicação.", "next_step": "Autorizar ou não a publicação", "awaiting_you": true}
$ POST /approvals/<autorização da Miolo>/defer (Carla, Vitta)
404 {"error": {"code": "not_found", "message": "Aprovação não encontrada.", "details": []}}
$ POST /approvals/<autorização>/defer ("Agora não", Marina)
200 {"status": "pending", "decision": null, "deferred": true, "deferred_until": null}
  extrato/reservas/runs antes 7/1/1 · depois 7/1/1
$ GET /work-items/<post> (adiada)
200 {"status": "approved", "status_label": "v2 aprovada · publicação não autorizada", "next_step": "Publicação quando você quiser", "awaiting_you": false}
$ GET /workspaces/<miolo>/needs
200 {"count": 1, "deferred_count": 1}
$ POST /approvals/<autorização>/resume ("Decidir agora")
200 {"status": "pending", "deferred": false}
$ POST /approvals/<autorização>/decision approved
  history: [('Pedido recebido', None), ('v2 entregue', 'automático'), ('Publicação autorizada para sex, 16/10, 9h', 'aprovado por você')]
$ POST /workspaces/<miolo>/projects
201 {"name": "Campanha de Natal", "ends_at": "2026-12-20T21:00:00Z", "participants": [{"agent_id": "nexo", …}, {"agent_id": "bia", "responsibility": "estratégia e conceito"}, {"agent_id": "kaia", "responsibility": "peças da campanha"}]}
$ GET /workspaces/<miolo>/needs (com o marco)
200 {"count": 1, "items": [["review", null, null], ["next", "Revisão das peças", "Campanha de Natal"]]}
$ GET /workspaces/<miolo>/squad/status
200 [["nexo", "live", "coordenando", "Nexo · coordenando"], ["bia", "idle", "disponível", null], …, ["otto", "wait", "aguarda você", "Otto · aguarda sua aprovação"], …]
```

**O que os testes novos provam**

| Teste | Cobre |
|---|---|
| `test_work_item_has_live_phrase_next_step_origin_and_history` | detalhe e lista do seed com frase, próximo passo, origem resolvida e histórico ("Você pediu na conversa com o Otto", "v1 entregue" · "automático"); pedido de ajuste → `in_progress`; **durante o run o Otto escreve no trabalho** "Otto ajustando a versão" · "Otto entrega a v2" (lido no instante da entrega); depois "v2 aguarda sua aprovação" · "Aprovar a v2", histórico com "Você pediu: “Deixa o horário mais visível.”" e "v2 entregue"; aprovar → "v2 aprovada" e "Você aprovou a v2" · "aprovado por você" |
| `test_agora_nao_defers_without_rejecting_or_charging` | autorização pendente conta (2) e mostra "Aprovado. Falta decidir a publicação."; Carla na Miolo 404, Carla editor na Vitta 403 "Só o dono da conta toma esta decisão.", revisão 422; "Agora não" 200 pendente sem decisão, repetir devolve o mesmo; **extrato, reservas e runs iguais antes e depois**; trabalho segue `approved` com "v2 aprovada · publicação não autorizada" · "Publicação quando você quiser"; `needs` 1 + 1 adiada; `approvals?status=pending` sem a adiada e com `include_deferred=true` com ela; "Decidir agora" volta (2); autorizar → "Publicação autorizada para sex, 16/10, 9h" · "aprovado por você"; adiar decidida 409 |
| `test_decide_takes_the_choice_and_returns_to_the_agent` | "Uma decisão aguarda você" · "Decidir"; `approved` 422; `answered` 200 → `in_progress`, "Você decidiu: “Até R$ 40 por dia”" e um run `approval:<id>` |
| `test_projects_with_dates_team_milestones_and_next` | criar com datas e equipe (quem conduz primeiro), patch com `null` apaga o prazo e `name: null` 422, trocar a equipe mantém o Nexo; marco seu em 3 dias aparece em "Em seguida" (fora do `count`) e em "Próximos marcos", concluído sai; pedido na conversa do projeto entra no projeto (origem, "Você pediu no projeto Campanha de Natal", `work_item_count` 1, Otto na equipe, marco ligado ao trabalho); Rafael 404 no projeto e no `needs` da Miolo, Carla 404 ao criar na Miolo e 201 na Vitta, viewer 403 "Seu papel não permite criar projetos." |
| `test_squad_status_is_derived_from_runs_and_pending` | seed: Otto `wait`, Nexo `live`, Kaia `idle`; com run em execução cuja última etapa é da Kaia → Kaia `work` "criando" "Kaia · criando a primeira versão" (a etapa anterior do Nexo não conta); trabalho pausado do Max → `sleep` "pausado"; a autorização adiada não vira `wait` (o do Otto é a revisão do seed); a Vitta vê os sete `idle`; Marina 404 na Vitta |
| pgTAP `20_rich_work` (48) | o mesmo no banco, mais: RLS forçada e só leitura para `authenticated` nas três tabelas; triggers do histórico fora do alcance de `authenticated`; origem de insight com id inválido recusada (23514) e de rotina com código aceita; frase escrita junto com a mudança de estado fica; `decide` só `answered`; data de adiamento no passado recusada; adiar não cria run nem lança no extrato; um adiamento na auditoria; trigger de broadcast em `status, deferred_at`; patch com campo desconhecido 22023 e prazo antes do início 23514; especialista repetido na equipe 22023; marco concluído e reaberto; Carla não vê marcos, equipe nem histórico da Miolo; pedido na conversa do "<Agente> percebeu" nasce do insight. A varredura `01_rls_coverage` segue verde com as três tabelas novas |

### 2.1 `make test` depois do ajuste do contrato

Segunda rodada (16/10 13:14–13:16, depois do `fbd9a4a`, o último código; exit 0; `docs/parciais/s1g/make_test_2.txt`):

```
All checks passed!
71 files already formatted
============================= 133 passed in 23.88s =============================
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  16 passed (16)
apps/web test:       Tests  121 passed (121)
Files=21, Tests=489, …
Result: PASS
```

## 3. Decisões técnicas (não mudam o combinado)

- **Histórico guarda o fato, a API escreve o texto.** `work_item_history` tem `kind` + `params` (versão, decisão, saída,
  observação, prazo) e os triggers o alimentam na mesma transação do pedido, da versão e da decisão: nenhum caminho fica
  sem histórico (rota, worker, seed). O texto sai do catálogo do backend no idioma do workspace (pt-BR agora; en e es
  sem migration). Os rótulos são os literais do protótipo onde existem (`hist` do `_works`, `LOG5`).
- **Frase viva = a do agente; sem ela, a do estado.** As colunas guardam só o que o agente escreve; um trigger as zera
  quando o estado muda sem reescrita, e a API monta a do estado. Assim uma decisão da pessoa nunca deixa a frase velha
  do agente na tela, e o banco não precisa de texto fixo.
- **"Agora não" não é decisão.** A pendência continua `pending`, sem `decision`; `deferred_at` marca o adiamento e
  `deferred_until` (opcional) diz até quando; sem data, fica para quando a pessoa quiser, como no protótipo. Só
  `authorize` (o protótipo só oferece "Agora não" em autorização) e só o owner (é decisão sobre autorizar, regra de
  08:55). Nada de run, crédito ou estado do trabalho muda.
- **O trabalho fica `approved` enquanto a publicação está por decidir ou adiada.** A máquina de estados não tem
  `approved → needs_you`, e mudar a matriz é decisão de produto. A API expõe `awaiting_you` + `pending_approval` para o
  web pôr o trabalho em "Precisa de você" como o protótipo (`you` · "Aguarda você"); adiada, `approved` cai em
  "Concluídos" com o check, a mesma família do "Concluído" do protótipo (ver pergunta 1).
- **`decide` aceita só `answered`**: decidir é escolher entre opções (a escolha vai na observação) e o agente segue com
  ela, como em responder. Aprovar e autorizar já têm tipo próprio.
- **"Em seguida" vem dos marcos**: marco com "decisão sua" (`needs_you`) nos próximos 10 dias (`_pjNext`), não
  concluído e sem pendência aberta. Não entra no `count`, como a regra "em seguida nunca abre a faixa sozinho".
- **`status=pending` sem as adiadas.** A lista de aprovações que o web usa para a faixa e para o número da barra passou a
  deixar as adiadas de fora (`include_deferred=true` traz): é o "contagens refletem só o que depende da pessoa" do
  briefing aplicado à rota que o web já consome, sem precisar mudar o web.
- **Realtime com `status: deferred`.** O payload de `approval.deferred` leva o status virtual `deferred` para o reducer
  atual do web (tudo que não é `pending` sai da faixa) funcionar sem mudança; `approval.resumed` leva `pending` e o item
  volta.
- **Status do squad no servidor com a regra do web.** A tela pode abrir já com o estado certo e o Realtime continua
  daí; `sleep` sai dos trabalhos pausados (o Max do protótipo); `monitor` fica para as rotinas.
- **Participantes são os especialistas** (o protótipo só mostra agentes em "Responsáveis" e no "Squad"); quem conduz
  (`owner_agent_id`) sempre fica na equipe.
- **Pedido na conversa do projeto entra no projeto** (L12076) e o trabalho vira marco ligado a ele; a linha "novo
  trabalho · <agente>" é do catálogo do web (o marco guarda o título do trabalho e o especialista).
- **Datas no fuso de São Paulo** ("sex, 16/10, 9h") até o workspace ter fuso próprio (pergunta 4).

## 4. Onde discordei do briefing

| Briefing | O que fiz | Por quê |
|---|---|---|
| "histórico legível em `work_item_history` (agente, texto, hora, marca)" | o texto é montado pela API a partir de `kind` + `params`; a tabela não guarda a frase | texto gravado no banco ficaria em um idioma só (o dono decidiu pt-BR, en e es) e exigiria texto fixo em SQL; a API devolve `text` e `mark_label` prontos |
| "`approvals.deferred_until`" | `deferred_until` (opcional) mais `deferred_at` e `deferred_by` | "Agora não" no protótipo não tem data: precisa de uma marca de adiamento que não dependa de data; `deferred_until` fica para "perguntar de novo em…" |
| "o trabalho mostra 'Publicação ainda não autorizada' e 'Decidir agora'" | a API entrega o estado (`pending_approval.deferred`, as frases do `_works` e `/resume`); os dois textos são do web | os rótulos de botão e de tela são do catálogo do web (A1a/A1b); não mexi nas telas |
| (não pedido) | acrescentei `approvalKinds.decide` "Para você decidir" e `cta.decide` "Decidir {object}" em `apps/web/messages/pt-BR/` | o tipo novo no contrato quebrava a checagem de tipos do web; "Para você decidir" é o literal do `NDK5`; "Decidir {object}" segue o padrão das outras ações (o protótipo usa "Decidir" e "Decidir publicação") |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais literal)

1. **Publicação adiada vira "Concluído"?** O protótipo põe o post com "Agora não" em "Concluído". Aqui ele fica
   "Aprovado" (mesmo desenho e mesma coluna "Concluídos"), porque ir para `done` exigiria uma volta `done → scheduled`
   para o "Decidir agora" autorizar depois, e isso muda a máquina de estados. Mantém assim ou abre a transição?
2. **Autorizar a publicação põe o trabalho em "Programado"?** Hoje a autorização fica registrada ("Publicação autorizada
   para sex, 16/10, 9h") e o trabalho continua aprovado: nada executa a publicação até a Fase 3, e "Programado" sem
   agendamento real seria inventar estado.
3. **"Agora não" com data?** A API aceita "decidir de novo em <data>" (opcional); o protótipo só tem "quando você
   quiser". Fica disponível ou tira?
4. **Fuso por negócio:** as datas das frases saem no horário de São Paulo. Com negócios em outros países (pt, en, es),
   o fuso entra no cadastro do negócio?
5. **Pessoas no projeto:** "participantes" hoje são os especialistas. Pessoas do negócio também participam de projeto
   (e o que isso muda para elas)?
6. **Textos sem literal no protótipo** (para o Diogo, como a A1b fez): "Você pediu no projeto <projeto>", "Pedido
   recebido" (trabalho que não nasceu de pedido seu), "Você pediu" (conversa em grupo ou de objeto), "Você não autorizou
   a publicação", "Você confirmou"/"Você não confirmou", "Você reconectou"/"Você não reconectou", "Uma decisão aguarda
   você", "Aprovado · publicação não autorizada" (sem versão), "aguarda sua autorização" e "aguarda sua confirmação" no
   status do squad, "Decidir {object}".

## 6. O que ficou de fora

- **No web (Aranha):** usar `status_label`, `next_step`, `due_at`, `origin` e `history` no Quadro, na Lista e no detalhe
  (A1b §4 itens 16–18); pôr o trabalho com `awaiting_you` na coluna "Precisa de você"; "Agora não" e "Decidir agora"
  por `/defer` e `/resume`, com "Publicação ainda não autorizada."; roadmap com datas, equipe e marcos; "Em seguida" na
  faixa de Projetos; `GET /squad/status` ao abrir a tela (o `approval.deferred`/`resumed` já funciona no reducer atual).
- **Passo 7 da jornada 1 no worker:** depois da aprovação, a Kaia pedir a autorização de publicação (nasce a pendência
  `authorize`). O fluxo v0 termina na revisão; as autorizações dos testes são criadas pelo papel privilegiado.
- **`due_at` gravado pelo agente:** a triagem não devolve data estruturada; o prazo existe, volta na API e entra no
  próximo passo ("até sex, 16/10") quando a pendência tem prazo. A pessoa não muda prazo (§11 item 3).
- Excluir projeto ou marco, arquivar projeto: não pedidos e sem desenho na V4.6.
- `monitor` no status do squad e as frases longas do `_longNow` ("Acompanha 3 trabalhos e te chama quando a decisão é
  sua."): rotinas são Fase 3; o web compõe a frase longa com os dados que já existem.
- Seed com projeto ou autorização: o e2e da A1b espera "Nenhum projeto ainda" e o `live.spec` conta "Precisa de você: 1"
  e "2"; o seed ficou como estava (o trabalho do seed ganhou origem e histórico pelos triggers).

## 7. Estado em que deixei a máquina

- Banco: migrations até `20261016160100` aplicadas por `make migrate` (sem `db reset`); seed reaplicado pelo `make seed`
  depois do roteiro (13:13) e pelo teardown do `make e2e`. Fila `runs_interactive` vazia.
- API da 8100: a do dono (`uv run hellosquad-api`, com reload), nunca parada; carregou as rotas novas sozinha
  (`/health` 200 às 13:13).
- Web da 3100: `next dev` parado para o `make e2e` e subido de novo desacoplado (`setsid nohup make dev-web`, log em
  `/tmp/hellosquad-dev-web.log`); `/entrar` 200 às 13:13.
- Nenhum worker rodando. Logs e o script do roteiro em `/tmp/s1g*` e `/tmp/s1g/` (sem chave).
