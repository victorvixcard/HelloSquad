# S3b — Relatório (Responsabilidades, scheduler e execuções do Modo Autônomo)

Fatia da Fase 3, Stark. 17/10/2026, das 07:45 às 08:20. Áreas: `apps/backend`, `supabase/`, `squad/` (skill 07.05), `packages/contracts` (gerado), `docs/SETUP_LOCAL.md`, a linha do `scheduler` no `Makefile` e `.env.example`. PASSO 0 lido (diretrizes do dono, plano da Fase 3, FLUXOS §7/§3.3/§8, notas x1 §B, Documento Mestre §10 e catálogo 01.04, 04.02, 07.05, 07.06, relatórios S1c, S1f, S1g, S2a–S2e, SA3a).

## 1. Entregue

| # | Item | O que existe agora | Commit |
|---|---|---|---|
| 1 | **Schema** | `responsibilities` (modelo `TPL` plan/posts/res/opp/reat/reviews/seo/crm, título, responsável, colaboradores, coordenação Nexo, ritmo `weekly`/`biweekly`/`monthly`/`daily`/`continuous` com dias ISO, dia do mês e hora, opções por chave, "o combinado" renderizado, nível por ação `[{action, level, requirement, granted}]`, limites, `auto_publish`, conexões exigidas, estado `RST5` `active`/`paused`/`blocked`/`failed`/`ended`/`proposed`, `since`, `next_run_at`, `paused_at`, `ended_at`, motivo e `blocked_by_connection`); `responsibility_proposals` (o combinado que o Nexo apresentou, ligado à pendência `confirm` e ao trabalho 01.04); `responsibility_runs` (código PL/RS/BL/RC-NN com semana ISO ou mês e sufixo `b` na segunda do período, estado `EXST5` `scheduled`/`running`/`awaiting_approval`/`approved`/`done`/`failed`/`skipped`, mensagem por chave do catálogo, trabalho e run do runtime, o que usou da memória, tentativas e horários, `scheduled_for`, `finished_at`, alertas da 07.06); `responsibility_events` (Você delegou/mudou/pausou/retomou/encerrou; bloqueio, falha e volta da conexão). `workspaces.timezone` (Brasília). RLS ligada e **forçada** nas quatro, membro só lê, ninguém escreve direto; execução encerrada **imutável** e não se apaga (só com a responsabilidade ou o workspace; a FK pode soltar trabalho apagado); registro somente inserção; banco recusa ação "autorizada" fora de "Publicar sozinho o que eu aprovar no plano". Seed da Miolo como a conta em uso (§2). | `f427478`, `63b0348`, `ed4e27a` + migrations `…050000`, `…050100`, `…050200`, `…050300` |
| 2 | **Delegação pela conversa (01.04)** | `POST /workspaces/{id}/autonomy/proposals`: o Nexo monta o combinado do modelo + opções ditas na conversa (o que faltar fica no padrão do `TPL`), grava a mensagem "Antes de ativar, confira o combinado:" com o cartão **`responsibility_proposal`** (kicker, frase com as palavras trocáveis, fatos Responsável/Colaboração/Coordenação/Frequência/Entrega/Aprovação/Primeira execução, "Faz sozinho", "Só com a sua autorização", "Nunca", botões "Confirmar a delegação"/"Ajustar") e a pendência **`confirm`** no trabalho 01.04 do Nexo. **Só ativa com o ok do owner** (`POST /approvals/{id}/decision`): nasce "Ativa desde hoje" com a primeira execução no ritmo, o trabalho 01.04 fecha e o Nexo responde "Delegado. Está no Modo Autônomo como responsabilidade ativa. Primeira execução: … Nada sai da … sem a sua aprovação.". "Ajustar" (`rejected`) descarta a proposta e a conversa segue; "Editar" é a mesma rota com `responsibility_id` ("Mudança no combinado", "Confirmar a mudança", "Atualizado. Vale a partir da próxima execução…"). Rotas: visão geral, modelos (perguntas `Q5` e opções), listar, detalhe, pausar, retomar, encerrar, interruptor, delegar de novo, próximas execuções, histórico. Textos por estado nos três idiomas pelo catálogo do backend (288 chaves `autonomy.*`). | `4102348`, `90ca7aa` |
| 3 | **Scheduler** | `hellosquad-scheduler` (o existente) roda, a cada tick de 60 s, o Modo Autônomo e depois a renovação. Responsabilidade **Ativa** vencida no fuso do negócio → execução "Programada" → trabalho do runtime com as etapas do modelo (`plan`: Otto 04.02 → Kaia 03.01; `res`: Íris 07.05; `reat`/`crm`: Max 06.01 → 06.02; `posts`: Kaia 03.01) com a primeira etapa na fila **`runs_scheduled`** ("Em andamento"); o worker passou a ler essa fila (depois da interativa). A execução segue o trabalho por gatilho: entrega para aprovar → "Aguarda sua aprovação"; o dono aprova → "Aprovada por você"; entrega que o modelo não pede para aprovar (leitura da Íris) → "Concluída"; falha → nova tentativa em 30 min e, na segunda, "Falhou" com a mensagem do §7. Pausada e encerrada não têm próxima execução; bloqueada por integração registra "Não executada" no ciclo; conexão expirada falha duas vezes e põe a responsabilidade em "Falha na execução". Reagenda `next_run_at` (pula ciclos perdidos). Trava consultiva `HS_AUTON` + chave única por ciclo: dois schedulers não duplicam. `--force-due <id>` (só local/test) para forçar uma execução. | `f36c295`, `bcaf1b3` |
| 4 | **Rotinas iniciais** | `plan` (Otto › Kaia, 04.02 recorrente; a Kaia fica `waiting_engine` sem cobrar), `res` (Íris, **07.05** nova: skill, formato do relatório, fixtures do modo simulado; **07.06** como monitor no ciclo: alerta só com série atualizada até ontem e variação ≥ 20%, série atrasada vira aviso de dado desatualizado), `seo` (Kiwi › Íris; sem conexão fica bloqueada, expirada falha duas vezes; com conexão, "Não executada: a leitura do Google Perfil chega com a conexão" até a S3a), `reat` (Max › Otto, segmento e mensagens; envio em "Nunca"/"Cada envio" só com autorização). Níveis: Analisar e Preparar acontecem sozinhos e o que sai pede aprovação; Executar só com autorização por ação: interface **`requires_authorization(actions, action, approved_in_plan=…)`** em `autonomy/authorization.py` para a S3a (`external_actions`). | `f36c295`, `2edfb44`, `1db6178` |
| 5 | **Testes, contrato, Realtime, docs** | pytest `test_autonomy.py` (8); pgTAP `33_responsibilities` (47); `test_reflection_fixtures` cobre a 07.05; pgTAP 29 conta 20 skills. `make openapi` + `pnpm --filter contracts generate`: 107 → 119 operações, 22 schemas novos, nada removido, nenhum campo novo obrigatório em schema existente (`MessageCard` ganha `responsibility_proposal` e campos opcionais). Realtime no canal `workspace:<id>`: `responsibility.created|<estado>|updated` e `responsibility_run.created|<estado>`. `SETUP_LOCAL.md` §"Modo Autônomo (S3b)"; roteiro ponta a ponta `docs/parciais/s3b/roteiro_modo_autonomo.sh` com a saída `.txt`. | `2edfb44`, `6ab2916`, `33ae1b5`, `c25d8a0`, `c02c638`, `7a6b843` |

## 2. Verificação (evidência)

**Suítes completas, depois do último commit de código:**

```
$ make test-backend
All checks passed!
======================== 339 passed in 92.78s (0:01:32) ========================
$ make test-db
Files=34, Tests=926,  3 wallclock secs
Result: PASS
$ pnpm -r --if-present typecheck          # contrato novo contra o web e os pacotes (sem next build)
apps/web typecheck: Done
```

**Critério da fase em pytest** (`apps/backend/tests/test_autonomy.py`, 8 passed): (1) a conta em uso bate com o protótipo (contagens, "Ligado", os textos de cada estado, PL-42 "Aprovado por você na sexta, 17:42", BL-42 "Falhou nas duas tentativas…", RC-10 "Não executada: o e-mail marketing não está conectado…", o combinado do plano palavra por palavra, níveis e "Nunca"); (2) **uma rotina real executa sem pedido manual**: o tick dispara o plano de quinta e a leitura de segunda, PL-44 nasce com trabalho `routine_run`/`PL-44`, etapas Otto 04.02 → Kaia 03.01, run `scheduled` na fila `runs_scheduled`, próxima execução +7 dias; o worker entrega, "Aguarda sua aprovação" com a memória usada; Marina aprova → "Aprovada por você"; a Kaia fica `waiting_engine`; RS-43 "Concluída"; (3) pausar/retomar/encerrar e o interruptor (pausada não executa, falha e bloqueio não pausam nem encerram, o registro guarda as ações); (4) delegação: a editora apresenta, nada ativa antes do ok, a editora não confirma (403), o dono confirma, o Nexo responde, duplicado 409, "Ajustar" não muda nada, "Editar" muda e libera "Autorizado: o que você aprovar no plano", `requires_authorization`; (5) conexão: ausente → "Não executada" e bloqueada; expirada → "A tentativa das 11h falhou; nova tentativa às 11h30." e depois "Falhou nas duas tentativas…", "Falha na execução" e o aviso "(11h e 11h30)"; execução encerrada não muda; (6) falha do runtime tem segunda tentativa e a responsabilidade continua ativa; (7) **dois schedulers**: com a trava em outro, o tick pula; dois ticks simultâneos criam uma execução por ciclo; (8) isolamento: o Rafael recebe 404 e lista vazia.

**Ponta a ponta com os processos reais** (`docs/parciais/s3b/roteiro_modo_autonomo.txt`, API 8100 + `hellosquad-scheduler --once` + `hellosquad-worker --drain`):

```
== 2. O scheduler dispara o plano sem pedido manual (forçado para agora; o ritmo é toda quinta, 9h)
  scheduler: modo autônomo: PL-43 (plan) programada para 2026-10-17 11:12:48.337702+00:00
  scheduler: modo autônomo: 1 em andamento, 0 não executadas, 0 para nova tentativa, 0 falharam
  trabalho: routine_run PL-43 · Plano da semana 43 · draft
  run na fila runs_scheduled: 1
  etapas: 1 otto 04.02 pending → 2 kaia 03.01 pending
  PL-43 · Plano da semana 43 · Aguarda sua aprovação · Entregue · aguarda a sua aprovação
== 3. Marina aprova o plano; a Kaia fica aguardando o motor de imagem
  PL-43 · Plano da semana 43 · Aprovada por você · Aprovado por você no sábado, 08:12
  etapas: 1 otto done → 2 kaia waiting_engine (image_engine_pending)
  memória usada: 4 orientações
== 4. Pausada não executa
  execuções do plano: antes 3, depois 3
== 5. Delegar é conversa: o Nexo apresenta o combinado e só o dono confirma (Vitta)
  Carla (editora) confirma: HTTP 403
  Rafael (dono) confirma: HTTP 200
  Nexo: Delegado. Está no Modo Autônomo como responsabilidade ativa. Primeira execução: sex, 23/10, 9h. Nada sai da Vitta Estética sem a sua aprovação.
== 6. Outro negócio não vê nada
  Rafael no Modo Autônomo da Miolo: HTTP 404
```

**pgTAP** `33_responsibilities` (47): RLS forçada nas quatro tabelas, authenticated não escreve direto, ganchos da S3a não executáveis por authenticated, ritmo no fuso (qui 22/10 12:00 UTC, 01/11, 26/10, diário, contínua), isolamento (Rafael vê 0 de responsabilidades, execuções e registro; não pausa nem mexe no interruptor da Miolo), falha/bloqueio não pausam nem encerram, pausar/retomar/idempotência e registro, interruptor (pausa 2, não alcança falha nem bloqueio, retoma 3), Realtime (`responsibility.paused`, `responsibility_run.created`), imutabilidade (update, delete, registro), proposta da editora sem efeito até o ok, editora não confirma, dono confirma, trabalho 01.04 fecha, proposta com investimento autorizado recusada (23514), ganchos de bloqueio e desbloqueio.

## 3. Decisões técnicas (não mudam o combinado)

1. **A delegação usa o que já existe**: a pendência `confirm` precisa de trabalho, então o combinado mora num trabalho 01.04 do Nexo ("Delegar responsabilidade recorrente", do catálogo). A mesma conversa reaproveita o trabalho aberto; "Ajustar" descarta só a proposta.
2. **Execução segue o trabalho por gatilho no banco** (`responsibility_run_follow_work` e `…_follow_approval`): nada de polling, e o worker não precisou saber de responsabilidade.
3. **A Kaia roda depois da aprovação do plano** (semântica da S2d: etapa seguinte só depois da decisão do dono). O briefing escreveu "Otto 04.02 → Kaia `waiting_engine` → Aguarda sua aprovação"; na prática a execução fica "Aguarda sua aprovação" com a entrega do Otto e a Kaia entra (e aguarda o motor) depois do ok. Mudar isso seria mexer no combinado da S2d.
4. **"Duas tentativas"**: a tentativa é do ciclo (9h e 9h30), não do worker (que mantém as dele para falha passageira do provedor). Falha do runtime não bloqueia a responsabilidade (o próximo ciclo roda); conexão expirada põe em "Falha na execução" até reconectar.
5. **Opções guardadas por chave** (`thu`, `posts3`, `weekly_mon`…) e todos os rótulos pelo catálogo; "o combinado" é guardado como o dono confirmou e a tela recebe no idioma de quem lê.
6. **Leitura e relatório da Íris (`res`) não pedem aprovação para "Concluída"** (RS-42 do protótipo é "Concluída · Entregue"); a pendência de revisão continua existindo para quem quiser aprovar.
7. **07.06** é um monitor determinístico no ciclo da `res` (sem LLM): alerta só com série atualizada até ontem; limiar de 20% **provisório**.
8. **Conexões**: enquanto `connections` não existe, o portão lê as fontes da Memória pelo nome; a S3a troca o corpo da função.
9. **Execuções rotinas consomem créditos** como qualquer entrega (10 por delivery no seed provisório); a Kaia sem motor não cobra.
10. **`workspaces.timezone`** novo, padrão `America/Sao_Paulo` (pergunta 2 da Fase 3, leitura conservadora).

## 4. Onde discordei do briefing

- Ordem "Otto → Kaia `waiting_engine` → Aguarda sua aprovação": segui a S2d (item 3 acima); se o Vic quiser a arte antes da aprovação do plano, é mudança no trabalho coordenado, não aqui.
- "Delegar é conversa": o backend entrega o combinado, a pendência e as falas do Nexo; as perguntas uma a uma (`Q5`) ficam com o web (A3b) a partir de `GET /autonomy/templates`. O roteador de texto livre do Nexo (`_d5Kind`) não entrou no runtime do LLM nesta fatia.

## 5. Perguntas ao dono (não bloqueiam; leitura conservadora em vigor)

1. **Interruptor "Pausado"** (FLUXOS §11 item 4): hoje pausa só as ativas (execuções novas); não toca trabalhos em andamento nem publicações já autorizadas, e **não reativa encerradas** (o protótipo reativava). Confirma?
2. **Códigos dos modelos sem exemplo no protótipo**: posts `PC`, reat `RT`, reviews `AV`, opp `OP` (provisórios). E a segunda execução do mesmo período leva `b` (como o BL-42b).
3. **"Duas vezes por semana"** (reviews): o protótipo só mostra "qua, 14/10"; ficou quarta e sábado. Quais dias?
4. **"A cada 15 dias"** cai 14 dias depois (o protótipo mostra 12/10 → 26/10). Fica assim?
5. **Execução cancelada pelo dono** (rejeitar com cancelar) aparece como "Não executada: você cancelou o trabalho desta execução." — o EXST5 não tem "Rejeitada". E pergunta do agente na execução usa "Aguarda sua aprovação" com a mensagem "Aguarda a sua resposta…". Ok?
6. **Limiar do alerta da 07.06** (20% contra os 7 dias anteriores) e **quem pode delegar** (editor apresenta, só o owner confirma; pausar/retomar/encerrar só o owner).
7. **Créditos das rotinas**: cada execução cobra a entrega como um pedido manual. Ok?

## 6. O que o web precisa para a A3b

- **Página**: `GET /workspaces/{id}/autonomy` traz tudo da V4.6 L5097–5186: `switch` (`visible`, `on`, `label` "Ligado"/"Pausado"), `counts` (para "Fazendo sozinho" e "N pausada · N com falha · N bloqueada"), `next` ("A seguir"), `last_7_days` (`runs`, `not_concluded`), `responsibilities` (título, `status_label`, `frequency_label`, agentes, `say`, `notice`, `idle`, `can_*`), `ended` ("Encerradas · N"), `offers` ("O que mais pode ficar com o squad": só plan/posts/opp/reviews que não existem), `upcoming` (até 5, `state` programada/bloqueada com `reason`), `history` (3) e `history_total` ("Ver todo o histórico (N)").
- **Detalhe**: `GET …/responsibilities/{id}`: `agreement`, `facts`, `levels` (analyze/prepare/execute com `state` ok/you/no e `requirement_label`/never, `no_external_action`), `detail_notice`, `memory_used` ("Orientações da marca utilizadas"), `upcoming`, `history`, `events` ("Alterações" com o texto pronto), `conversation_id`. Ações: `POST …/pause|resume|end` (devolvem o detalhe; 409 com falha ou bloqueio), `POST /autonomy/switch`, `POST …/redelegate`.
- **Delegação**: `GET /autonomy/templates` (perguntas e opções na ordem do `Q5`, `existing_id` para "O Otto já cuida disso", `publish_option` para "As aprovações") → `POST /autonomy/proposals` com as respostas e `conversation_id` → o cartão `responsibility_proposal` chega na conversa (Realtime da mensagem) → o owner decide a pendência `confirm` (`approved` = "Confirmar a delegação"; `rejected` = "Ajustar"). Editar = mesma rota com `responsibility_id`.
- **Histórico**: `GET /autonomy/runs?responsibility_id=&before=&limit=` (código, título, `status_label`, `message`, `scheduled_label`, `work_item_id` para "Abrir o trabalho", `memory_used`, `alerts`/`stale`).
- **Realtime**: `responsibility.*` e `responsibility_run.*` no canal `workspace:<id>` (payload com `id`, `status`, `code`).
- O "Simular a execução de quinta" do protótipo (demonstração) não existe como rota de produto: em local, `hellosquad-scheduler --once --force-due <id>`.

## 7. O que a S3a precisa ligar

1. Trocar o corpo de `app.responsibility_connection_state(workspace, connection)` para ler `connections` (`connected`/`needs_reconnect`/`not_connected`), mantendo a assinatura.
2. Ao expirar ou desconectar: `app.block_responsibilities_for_connection(ws, conn, 'connection_expired'|'connection_missing')`; ao reconectar: `app.unblock_responsibilities_for_connection(ws, conn, <horário da nova tentativa>)` ("Nova tentativa às 11h" vira o ciclo `-NNb`).
3. Antes de criar `external_actions`: `requires_authorization(responsibility.actions, action, approved_in_plan=…)`; `pre_authorized` só para "Publicar no Instagram" dos itens aprovados no plano com `auto_publish`.
4. Leitores reais: `seo` e `reviews` hoje terminam em "Não executada: a leitura do Google Perfil chega com a conexão" quando conectados; 07.05/07.06 passam a ler as métricas da conexão (hoje `metrics_daily` fictício).

## 8. Fora desta fatia

- O roteador de texto livre do Nexo para delegação (`_d5Kind`) dentro do runtime do LLM e as perguntas como mensagens persistidas do responsável (o web conduz).
- "Simular a execução de quinta" como rota de produto (só a ferramenta local `--force-due`).
- Leitores reais de Google Perfil, avaliações e e-mail (S3a), e o envio (Fase 4).
