# A1a — Progresso (Aranha)

Fatia A1a, "Ao vivo" (Fase 1). Início: 16/10/2026 10:28. A sessão caiu às 10:44 por limite de cota; retomada às 11:15 a partir do disco (nada refeito do que estava commitado).

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 10:28–10:55 | PASSO 0: diretrizes (10:20 e 10:30), FLUXOS §4, §5, §10; A1f, S1c, S1a, A0b; SETUP_LOCAL e Makefile; worker (`squad/flow.py`, `store.py`: eventos `started`, `agent.thinking`, `step.done`, `delivery.created`, `message.created`, `approval.requested`, `memory.suggested`, `finished`, `failed`) e protótipo (`_modes`, `_shortNow`, `_status`, `SquadStatus` do DS) | feito | — |
| 10:32 | Rótulo "Growth" na barra (`shell.areas`); identidade segue "Growth Marketing" (diretriz 10:20) | feito | `bdf0a77` |
| 10:33 | WebSocket do Realtime no `connect-src` da CSP (`ws://` local, `wss://` na nuvem), com teste | feito | `aeaf6a7` |
| 10:35 | Reducer dos eventos ao vivo (`lib/live/live-state.ts`): runs, pendências, status vivo dos sete e da conversa; testes de ordem, repetição e isolamento | feito | `214a50b` |
| 10:38 | Realtime no browser (`lib/live/realtime.ts`, `components/product/live.tsx`): canal privado `workspace:<id>` com o token da sessão, reconexão com espera crescente, fallback pela API (`GET /runs/{id}/events?after=`) ao voltar; estado ao vivo na casca e rosto de quem aguarda você na barra | feito | `a12aad0` |
| 10:42 | Conversa ao vivo: mensagem da pessoa na hora, pedido de legenda vira trabalho (`POST /messages/{id}/work-items`), texto com pergunta do agente pendente vira resposta (`answered`), status vivo e "está escrevendo"; "Pedir ajuste" abre a conversa com "Quero pedir um ajuste nesta versão." e o envio registra `changes_requested` (diretriz 10:20) | feito | `1e22dd8` |
| 10:45 | Autosave (`wip:`) levou o resto da sessão que caiu: efeito da mensagem no squad extraído para `use-squad-effect.ts` (painel e Início usam o mesmo), Início manda o pedido para o squad, rosto do especialista na identidade do ambiente segue o modo ao vivo; teste do Início. Conferido na retomada: é meu e fica (o `supabase/seed.sql` do mesmo autosave é da S1e) | feito | `42a056b` (wip) |
| 11:15–11:25 | Retomada: PASSO 0 relido; `git status` limpo (nada meu fora de commit) | feito | — |
| 11:20 | Item 2: entrega e pendência chegam sem recarregar: cartão "Material · vN" na mensagem do agente (V4.6 L5539, `isMat`: miniatura que abre o trabalho, estado da versão, "Aprovar vN" e "Pedir ajuste" só para o owner), lido de `GET /runs/{id}` + `GET /work-items/{id}`; "+N" da faixa "Precisa de você" (V4.6 `_vNd5`) | feito | `9c9624d` |
| 11:24 | Item 4: e2e ao vivo com o worker real em modo simulado (setup sobe `hellosquad-worker` com `LLM_PROVIDER=simulated`; teardown para o worker e reaplica o seed **sem** pedir a trava de novo: `make seed` dentro do `make e2e` esperaria por ela mesma 30 min). Bug real achado pelo e2e: mensagem enviada enquanto a conversa carregava sumia (a leitura `before=latest` saía antes do POST e sobrescrevia a lista); corrigido com teste (mutação: falha sem a correção) | feito | `4be9bcc` |
| 11:29 | Item 3: segundo fluxo e2e: "Pedir ajuste" no cartão → texto do protótipo no campo → `changes_requested` com a nota → "Otto ajustando a versão" → v2 chega ao vivo, v1 "Substituída pela v2" → aprovar a v2 pelo cartão. 3 rodadas seguidas do primeiro fluxo verdes antes de somar o segundo | feito | `4827fe7` |
| 11:32 | Cartão "Contexto da conversa" (V4.6 `_vRail`, L10916) em tela cheia a partir de 940 px, com "Mostrar o contexto": Ambiente, Tipo, Período e Origem quando há, Negócio, quem responde, "Voltar para"; a origem do trabalho ("pedido na conversa com o Otto · 16/10") vai no contexto do "Pedir ajuste" | feito | `b31a938` |
| 11:34 | Item 5: H0-03 decidido: cookie da sessão httpOnly; o Realtime do browser recebe só o token de acesso pelo servidor (`realtimeTokenAction`), renovado perto de vencer; e2e confere o cookie e os fluxos ao vivo (7 de 7 verdes). O código entrou pelo autosave antes do meu commit | feito | `23d7cab` (wip) |
| 11:37 | `make test-web` verde (eslint; typecheck; contracts 9, ui 49, web 56); teste antigo do "Pedir ajuste" atualizado para a origem no contexto | feito | `4f3dcfa` |
| 11:38 | `make e2e` com build de produção: 1 falha no teste da A0/A1f (meta robots duplicado no build de produção: o do `/entrar` fica no body depois do login); asserção passou a exigir noindex em todos os metas; 7 de 7 | feito | `aae78b2` |
| 11:41 | Aviso curto de entrega quando a pessoa não está na conversa (V4.6 `_notifyIfAway`: "O Otto entregou a v2"), reducer + e2e | feito | `0718f48` |
| 11:42 | Rodada final: `make test-web` (web 58) e `make e2e` (build de produção, worker simulado, 7 de 7); `next dev` subido de novo na 3100 (200), API intocada | feito | — |
| 11:45 | Item 6: `docs/SETUP_LOCAL.md` e `docs/parciais/A1a-relatorio.md` | feito | este |

