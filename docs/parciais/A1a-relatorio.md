# A1a — Relatório (Aranha)

**Fatia:** A1a, "Ao vivo" (Fase 1). **Data:** 16/10/2026, 10:28 → 10:44 (a sessão caiu por limite de cota) e 11:15 → 11:45 (retomada a partir do disco, sem refazer o que estava commitado).
**Regra que guiou a fatia:** segue o protótipo sempre (diretriz das 10:20); o que a V4.6 não responde está na §5, sem "correção" por conta própria. Não toquei em `apps/backend`, `supabase/` nem `squad/` (a S1e do Stark estava lá).
**Critério de pronto:** Marina envia um pedido e vê a resposta simulada chegar sem recarregar; o Playwright cobre com o worker rodando. **Atendido** (§2.2).

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Realtime no browser** | Canal privado `workspace:<id>` (S1a), reconexão com espera crescente, fallback pela API (`GET /runs/{id}/events?after=`) ao voltar; WebSocket do Realtime no `connect-src` da CSP (`ws://` local, `wss://` na nuvem) | `aeaf6a7`, `a12aad0` |
| 2 | **Status vivo dos sete e da conversa por etapa** (`run_events`) | Reducer puro (`lib/live/live-state.ts`): modos da V4.6 (`_modes`: `idle`, `work`, `wait`, `live`) e rótulos curtos do §10.3 ("disponível", "criando", "escrevendo", "pesquisando", "trabalhando", "aguarda você", "coordenando"). Na conversa, o `SquadStatus` do DS (`.ps-cstat`): Nexo "organizando seu pedido" na triagem, "<Especialista> criando a primeira versão", "ajustando a versão" depois de um pedido de ajuste, "aguarda sua aprovação" quando a entrega chega; cabeçalho "escrevendo…" e "<Nome> está escrevendo" **só enquanto um run está numa etapa** (run na fila sem worker não finge trabalho). Rostos: identidade do ambiente, barra lateral (quem aguarda você) e cabeçalho da Sala | `214a50b`, `1e22dd8`, `42a056b` (autosave) |
| 3 | **Conversa ao vivo** | Mensagem da pessoa na hora; pedido de legenda ou texto vira trabalho (`POST /messages/{id}/work-items`); texto com pergunta do agente pendente vira resposta (`answered`); o mesmo efeito no Início (`use-squad-effect.ts`) | `1e22dd8`, `42a056b` |
| 4 | **Entrega e pendência sem recarregar** | Cartão **"Material · vN"** na mensagem do agente (V4.6 L5539, `isMat`): miniatura que abre o trabalho, título, estado da versão ("Aguarda sua aprovação", "Aprovada por você", "Nova versão a caminho", "Substituída pela vN"), "Aprovar vN" e "Pedir ajuste" só para o owner; lido de `GET /runs/{id}` + `GET /work-items/{id}` e relido a cada novidade do canal. Faixa "Precisa de você" com o **"+N"** da V4.6 (`_vNd5`: a primeira à vista, "+N" abre as outras e vira "Fechar"); contagem da barra ao vivo. **Aviso curto** quando a pessoa não está na conversa (V4.6 `_notifyIfAway`, L6591): "O Otto entregou a v2" | `9c9624d`, `0718f48` |
| 5 | **Cartão de contexto com período e origem** | Coluna "Contexto da conversa" da V4.6 (`_vRail`, L10916) em tela cheia a partir de 940 px, com "Mostrar o contexto": Ambiente, Tipo, Período (quando há), Negócio, Origem (quando há), quem "responde · <Ambiente>" e "Voltar para <Ambiente>". O contexto do "Pedir ajuste" leva a origem do trabalho ("pedido na conversa com o Otto · 16/10") | `b31a938` |
| 6 | **Aprovação na tela, refletida ao vivo** | Revisar (trabalho) → "Aprovar vN" (`approved`) ou "Pedir ajuste" (abre a conversa com "Quero pedir um ajuste nesta versão."; o envio registra `changes_requested` com a nota, diretriz das 10:20) → run novo do Otto → v2 chega, v1 fica "Substituída pela v2"; também pelo cartão da conversa. Detalhe do trabalho remonta pela chave pendência + versão quando o servidor muda | `1e22dd8`, `9c9624d`, `4827fe7` |
| 7 | **`make e2e` real com o worker em modo simulado** | `e2e/global-setup.ts` sobe `uv run hellosquad-worker` com `LLM_PROVIDER=simulated` e espera "worker no ar"; o teardown para o worker e reaplica o seed. Dois fluxos novos em `e2e/live.spec.ts` (§2.2) | `4be9bcc`, `4827fe7`, `0718f48` |
| 8 | **Trava do banco no teardown** | Bug achado: o teardown chamava `make seed` **dentro** do `make e2e`, que já segura a `flock`; o seed esperaria pela própria trava 30 min e falharia. Agora o `make e2e` avisa (`HELLOSQUAD_DB_LOCK_HELD=1`) e o teardown roda o seed direto; fora do make, usa `make seed` | `4be9bcc` |
| 9 | **Bug real corrigido** | Mensagem enviada enquanto a conversa carregava sumia: a leitura `before=latest`, que saiu antes do POST, sobrescrevia a lista. Agora a leitura junta o que a pessoa enviou. Teste com mutação (falha sem a correção) | `4be9bcc` |
| 10 | **H0-03 decidido** (§3) | Cookie da sessão `httpOnly`; o Realtime recebe só o token de acesso pelo servidor | `23d7cab` (autosave), `4f3dcfa` |
| 11 | Rótulo "Growth" na barra (diretriz das 10:20) | `shell.areas`; a identidade segue Growth Marketing | `bdf0a77` |
| 12 | Docs | `docs/SETUP_LOCAL.md` (e2e com o worker, trava, `next dev` fora da 3100, cookie httpOnly); este relatório; progresso | `ca0ac6c` e este |

## 2. Como foi verificado

### 2.1 `make test-web` (11:41, depois do último código; exit 0)

```text
pnpm --filter web lint            → eslint, sem problemas
packages/contracts typecheck: Done
packages/ui typecheck: Done
apps/web typecheck: Done
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  9 passed (9)
apps/web test:       Tests  58 passed (58)
exit 0
```

O web tinha 37 testes no fim da A1f; os novos desta fatia: reducer ao vivo (ordem, repetição, isolamento, aviso de entrega), cartão "Material · v1" (aprovar, pedir ajuste, quem não é owner), "+N" da faixa, corrida do carregamento, cartão de contexto (tela cheia, alternar, painel sem coluna), token do Realtime (cache, vencimento, falha, `clear`), CSP com `ws://`.

### 2.2 `make e2e` (11:42, build de produção, worker simulado subido pelo Playwright; exit 0)

```text
 ✓ Compiled successfully in 2.6s
  ✓  1 › área logada › sem sessão, /app manda para o login e volta para onde a pessoa ia (453ms)
  ✓  2 › área logada › senha errada mostra o erro em português e mantém o e-mail (354ms)
  ✓  3 › área logada › Marina entra e vê a barra lateral com o workspace Miolo (1.1s)
  ✓  4 › área logada › Pedro entra sem workspace, cria pedro-teste-<timestamp> e cai no shell dele (930ms)
  ✓  5 › site público › página inicial em pt-BR com SEO e crawlers de IA liberados (181ms)
  ✓  6 › Ao vivo (A1a) › Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova (3.6s)
  ✓  7 › Ao vivo (A1a) › Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo (5.6s)
seed aplicado: ../../supabase/seed.sql
  7 passed (14.7s)
exit 0
```

Log do worker da mesma rodada (`/tmp/hellosquad-e2e-worker.log`):

```text
11:42:42 worker no ar: fila runs_interactive, concorrência 4, teto por workspace 3, LLM simulated
11:42:47 run 1da0b361-… concluído: entrega v1; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; …
11:42:51 run 6aa0261a-… concluído: entrega v1; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; …
11:42:53 run bb2c64e6-… concluído: entrega v2; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; …
11:42:54 worker encerrado
```

**O que os dois fluxos provam, com o worker e o Realtime reais:**

- Fluxo 6: cookie da sessão `httpOnly` e fora de `document.cookie`; "Precisa de você: 1" (seed); a mensagem da Marina aparece na hora; `.ps-cstat` com "Otto" e "criando a primeira versão", cabeçalho "escrevendo…" e "Otto está escrevendo"; depois o cartão "Material · v1" com o título do pedido e "Aguarda sua aprovação", sem aviso curto (a conversa está aberta), "digitando" some, status "aguarda sua aprovação", "Precisa de você: 2", "Ver mais 1 pendência", barra "Projetos, com Nexo, 2 aguardam você"; o cartão abre o trabalho, "Aprovar v1" → "Aprovada por você", barra volta a "1 aguarda você" e o cartão na conversa vira "Aprovada por você" sem botões; **a marca posta na janela antes do pedido continua lá no fim (nenhum recarregamento)**.
- Fluxo 7: pedido de texto → v1; "Pedir ajuste" no cartão põe "Quero pedir um ajuste nesta versão." no campo; o envio registra o ajuste; v1 "Nova versão a caminho"; "ajustando a versão" e "Otto está escrevendo"; a Marina fecha a conversa e chega o aviso "O Otto entregou a v2"; reabrindo, cartão v2 "Aguarda sua aprovação" e v1 "Substituída pela v2"; "Aprovar v2" no cartão → "Aprovada por você"; sem recarregar.

**Compasso do canal no teste.** O worker simulado termina um run em uns 100 ms (log das 11:23:40,714 → 40,811), rápido demais para ver "escrevendo…". O teste intercepta o WebSocket do Realtime (`page.routeWebSocket`): os eventos passam na hora até o `agent.thinking` da etapa `otto.produce`; dali em diante os eventos do squad ficam guardados e saem **na mesma ordem** quando o teste solta. Entrada no canal e batimentos passam sempre. Nada é inventado nem pulado: só o tempo de entrega muda. Não é contorno de medição; sem isso, o estado "escrevendo" é um quadro de 100 ms.

**Estabilidade:** o fluxo 6 passou 3 vezes seguidas contra o `next dev` antes de somar o 7; depois, 7 de 7 no `next dev` (com a mudança do cookie) e 7 de 7 duas vezes no build de produção (11:38 e 11:42). Logs em `/tmp/a1a/`.

### 2.3 Mutação

`ConversationPanel` sem a junção da leitura inicial → o teste "mensagem enviada enquanto a conversa carrega não some" falha (`1 failed`); com a correção, passa. O e2e pegou esse bug na 4ª rodada (a bolha da Marina sumiu enquanto o Otto já escrevia).

## 3. H0-03: decisão sobre o cookie httpOnly

**Postura adotada: cookie da sessão `httpOnly`; o browser recebe só o token de acesso, para o Realtime.**

- O Realtime no browser precisa de **um token de acesso**, não do cookie. Login, cadastro, saída e renovação da sessão já aconteciam no servidor (Server Actions e middleware); o único leitor da sessão no browser era o Realtime.
- `lib/supabase/session-cookie.ts`: `cookieOptions: { httpOnly: true }` no `createServerClient` do servidor e do middleware.
- `realtimeTokenAction` (Server Action): devolve `access_token` e `expires_at` da sessão do cookie (renova se venceu). O **refresh token nunca sai do servidor**.
- `lib/supabase/client.ts`: cliente do browser só para o Realtime, com a opção `accessToken` do supabase-js. O Realtime chama essa função ao entrar no canal, a cada batimento (25 s) e na reconexão; `lib/live/realtime-token.ts` guarda o token em memória e pede outro quando falta menos de 1 minuto para vencer. `supabase.auth` fica indisponível nesse cliente, de propósito. Canal recusado (`CHANNEL_ERROR`) limpa o token para a próxima tentativa.
- **Por que não o cookie legível** (a proposta da A0b): com o cookie legível, um XSS leva o refresh token e mantém a sessão da pessoa por dias. Agora leva no máximo o token de acesso em memória (vale cerca de 1 h). A defesa da CSP com nonce (A0b) continua.
- **Detalhe que decidiu o desenho:** sem a opção `accessToken`, o supabase-js renova o token do Realtime pelo próprio cliente de Auth do browser a cada batimento; com o cookie httpOnly, ele não acharia sessão e trocaria o token do canal privado pela chave publicável, e o canal cairia em ~25 s.
- **Prova:** e2e confere que os cookies `sb-*-auth-token` são `httpOnly` e não aparecem em `document.cookie`, e os dois fluxos ao vivo passam com o Realtime autenticado por esse token. Testes do cache do token (vencimento, pedidos ao mesmo tempo, falha, `clear`).
- **O que fica:** cookies criados antes da mudança seguem legíveis até a próxima renovação no servidor (no máximo 1 h). A sessão longa no browser (aba aberta por horas) só foi provada no cache, por teste de unidade; o e2e dura segundos.

## 4. Decisões técnicas

1. **Worker subido pelo Playwright** (global setup), não por fixture de teste: um worker para a rodada inteira, log em arquivo, parado no teardown pelo grupo de processos (`uv` e Python). `E2E_WORKER=off` usa um worker que já esteja no ar.
2. **Aviso de entrega nasce no `approval.requested` de revisão**, não no `delivery.created`: é quando a conversa do run já é conhecida (o `message.created` vem entre os dois), e assim "na conversa aberta não avisa" funciona.
3. **Cartão "Material · vN" relê o trabalho** (`GET /runs/{id}` + `GET /work-items/{id}`) a cada novidade do canal, em vez de montar o estado pelo canal: o estado da versão (aprovada, substituída) é do servidor.
4. **Teste antigo do meta robots fortalecido:** no build de produção, depois do login, o meta do `/entrar` ("noindex, follow") fica no `body` ao lado do da área logada ("noindex, nofollow, nocache"), metadado em streaming do Next 15. O teste (A0/A1f) passou a exigir `noindex` em **todos** os metas, em vez de quebrar pela ambiguidade do seletor. Não mexi no metadado; é observação para quem cuidar de SEO.

## 5. Divergências do protótipo e perguntas (registradas, não corrigidas)

| # | Onde | O que a V4.6 faz | O que ficou | Pergunta |
|---|---|---|---|---|
| 1 | Cartão "Material · vN" | Miniatura é a peça visual (`MioloPeca`) | A entrega da Fase 1 é texto: a miniatura mostra o começo da legenda num cartão Branco (CSS novo `.ps-capm`), como a mesa da A1f (pergunta 10 da A1f) | **Diogo:** é esse o desenho da miniatura de texto? |
| 2 | Cartão "Material · vN" | Etiqueta curta do que mudou (`ps-chgtag`, ex.: "data em destaque") | Sem etiqueta: a API guarda uma frase (`change_note`, ex.: "Nova versão com o ajuste que você pediu."), não a etiqueta curta | Guardar a etiqueta curta do ajuste (S1c/S1g) ou mostrar a frase? |
| 3 | Cartão "Material · vN" | Rótulo acessível "Abrir a v1 do post" | "Abrir a v1: <título do trabalho>" (não é post) | — |
| 4 | Aviso curto | "A Kaia entregou a v1 do post" | "O Otto entregou a v2" (sem o objeto: a entrega é legenda, não post) | Quer o objeto ("da legenda")? |
| 5 | Contexto da conversa | Todo contexto tem "Tipo" (Ambiente, Publicação, Indicador…) | Contexto de trabalho sai **sem Tipo**: a V4.6 não tem tipo para trabalho/entrega fora do calendário | **Dono + Diogo:** qual Tipo para trabalho/entrega ("Publicação", "Entrega", "Pedido")? |
| 6 | Contexto da conversa | Coluna também na conversa direta sem objeto e na Sala (habilidades do agente, pessoas, "Projeto em contexto", "Entrega em contexto") | Só nas conversas sobre um objeto (ambiente, trabalho) | Fica para a A1b (Minha Equipe, Sala com projeto) |
| 7 | Contexto da conversa | "Período" em indicadores e canais | Nenhum contexto da Fase 1 tem período (não há Resultados no seed); o campo aparece quando quem abre passar | — |
| 8 | Status por etapa | Roteiro sem autoverificação | Durante `otto.check` e a revisão interna (`otto.revise`) o status segue "criando a primeira versão" (a V4.6 não tem rótulo para a checagem) | — |

## 6. O que ficou de fora

- **Não lidas** (ponto na barra, contagem na conversa fechada): a API não tem leitura por participante (FLUXOS §10.1, "falta").
- Coluna de contexto das conversas sem objeto e da Sala (§5 item 6).
- "Agora não"/autorização de publicação: não existe na API (FLUXOS §10.2).
- Sessão longa com o token do Realtime renovado de verdade (só teste de unidade, §3).
- Sino de notificações guardadas (FLUXOS §11 item 7).

## 7. Estado em que deixei a máquina

- `next dev` da 3100: derrubado duas vezes para o `make e2e` (o `next build` quebra o `next dev`, e o Playwright reaproveitaria a porta) e **subido de novo** com `make dev-web` desacoplado (`setsid`), log em `/tmp/hellosquad-dev-web.log`; `GET /entrar` → 200 às 11:43. Antes era um `make dev-web` iniciado às 09:34.
- API da 8100 (`make dev-api` do dono): intocada, `/health` ok.
- Nenhum worker rodando (o do e2e encerrou: "worker encerrado").
- Banco: seed reaplicado pelo teardown do último `make e2e`, dentro da trava.
- Logs em `/tmp/a1a/` (sem chave).
