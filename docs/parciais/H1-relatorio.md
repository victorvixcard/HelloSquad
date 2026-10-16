# H1 — Relatório de QA adversária da Fase 1 (Hulk)

**Fatia:** H1, QA adversária da Fase 1. **Data:** 16/10/2026, 13:25 → 14:05. **Método:** tentar refutar
S1a–S1g, A1f, A1a e A1b lendo o código real e atacando o ambiente local (API 8100, web 3100, Supabase
`hellosquad`, worker do produto em modo simulado). Nenhum código de produto foi alterado. Scripts e provas em
`docs/parciais/h1/`; saídas longas em `/tmp/h1_*` (lidas só por `tail`/`grep`). Toda operação no banco rodou
sob a trava `flock /tmp/hellosquad-db.lock`. Três auditores auxiliares (sub-agentes) fizeram a comparação com o
protótipo, a varredura web/estática e o clone limpo; conferi no código os achados 🟡 deles antes de aceitá-los
e reclassifiquei o que meus testes ao vivo resolveram.

**Veredito em uma linha:** a Fase 1 atende o critério da fase; **nenhum achado bloqueante (🔴 = 0)**. O aceite
do Documento Mestre §16 passou pelo browser duas vezes (crédito debitado uma vez), e idempotência, créditos,
worker, isolamento (API, Data API e Realtime), owner-only e memória **resistiram a todos os ataques**.
Encontrei **4 🟡** (1 de segurança em profundidade, 1 da guarda do autosave, 2 diferenças do protótipo não
registradas) e **7 ℹ️**.

## (a) Tabela-resumo

| # | Achado | Sev. | Onde | Quebra isolamento/segredo/combinado? |
|---|---|---|---|---|
| H1-01 | O "token do Realtime" entregue ao browser é o access token completo da sessão; com `secure_password_change = false`, um XSS troca a senha e a conta fica tomada para sempre (a A1a §3 diz "no máximo 1 h") | 🟡 | `apps/web/app/app/[workspace]/actions.ts:245-248`, `supabase/config.toml:236` | Não sozinho (exige XSS; a CSP contém) |
| H1-02 | A guarda do autosave não procura JWT nem cookie de sessão em arquivo **novo**, e o autosave faz push no repositório público | 🟡 | `infra/git-autosave.sh:33` | Não hoje (0 JWT no repo e no histórico) |
| H1-03 | Sugestões "Pergunte ao Otto" continuam na tela depois que a pessoa escreveu; na V4.6 somem na primeira mensagem dela | 🟡 | `apps/web/components/product/ConversationPanel.tsx:236-238` | Diverge do protótipo (não registrado) |
| H1-04 | "Conversar com &lt;Nome&gt;" no ambiente abre a conversa **direta** com o cartão do ambiente; na V4.6 abre a conversa do ambiente, separada | 🟡 | `apps/web/components/env/EnvIdentity.tsx:54-55` | Diverge do protótipo (não registrado) |
| H1-05 | Textos menores diferentes do protótipo: papel no cabeçalho da conversa de objeto; nomes acessíveis "Ver mais/Fechar" e listas "Nexo e Bia e Kaia" | ℹ️ | web (Início, conversa) | Diverge levemente (não registrado) |
| H1-06 | Memória, "De onde vem": só as 2 fontes do seed; a V4.6 lista também as não conectadas | ℹ️ | seed/API da memória | Não (origem é dado) |
| H1-07 | Fixture do modo simulado: o Otto diz "Escrevi duas versões" e entrega uma (v1), sempre sobre o sábado | ℹ️ | `apps/backend/src/hellosquad/llm/fixtures/04.01/otto.produce.json` | Não (texto simulado) |
| H1-08 | Trava do banco sem `-o`: processo que o alvo sobe (worker do `make e2e`) herda a trava; órfão a segura até 30 min. `make up`/`make migrate` não pegam a trava | ℹ️ | `Makefile` (`DB_LOCK`) | Não (robustez) |
| H1-09 | Higiene do SETUP_LOCAL: `.env` do `cp` nasce 664; `make status`/`make up` imprimem as chaves locais; `make test-web` omite o Vitest do web; segundo checkout rotaciona a senha do papel compartilhado | ℹ️ | `docs/SETUP_LOCAL.md`, `Makefile` | Não (chaves são os defaults públicos do CLI) |
| H1-10 | Web local: cookie sem `Secure` e com 400 dias; a ação do token responde também em `/`; `'unsafe-eval'` só em dev; nomes de fornecedores num comentário de `squad/` | ℹ️ | `lib/supabase/session-cookie.ts`, `lib/security-headers.ts`, `squad/max/agent.yaml:35` | Não |
| H1-11 | Placeholder `voce@seunegocio.com.br` (domínio real, fora de `.example`) no catálogo; veio do protótipo | ℹ️ | `apps/web/messages/pt-BR/auth.json:11`, `home.json:59` | Não (texto de exemplo, não dado de teste) |

Contagem: 🔴 0 · 🟡 4 · ℹ️ 7.

## (b) Achados

### H1-01 — Token do Realtime é o access token completo e troca a senha sem reautenticação (🟡)

- **Cenário concreto.** A A1a resolveu o H0-03 com cookie httpOnly e uma Server Action que entrega ao browser
  "o token do Realtime". Essa ação devolve `session.access_token` (`actions.ts:245-248`): é o JWT inteiro da
  pessoa, válido 1 h (`jwt_expiry = 3600`), que abre a API 8100, a Data API, o Storage e `PUT /auth/v1/user`.
  Com `secure_password_change = false` (`supabase/config.toml:236`), um XSS em `/app` (mesma origem, passa a
  checagem de Origin da Server Action) pega o token e troca a senha: a conta fica tomada para sempre, não por
  1 h como diz a A1a §3. O httpOnly protege o refresh token, mas não o acesso.
- **Correção proposta.** Token próprio do Realtime, curto e de escopo mínimo (emitido pela API só com o que o
  `realtime.messages` precisa: `sub` e `role`, sem servir para a API nem para a Auth), ou, no mínimo,
  `secure_password_change = true` (troca de senha/e-mail exige reautenticação) antes da Fase 5. Corrigir o texto
  da A1a §3. Decisão técnica do Thor; o fluxo de login real segue a pergunta 5 da §11 do `FLUXOS_DA_V46.md`.
- **Prova.** `h1/estatico/achados.md` (H1E-01, com o `a2_web.mjs`: Rafael chama a ação e recebe o próprio
  token completo); conferido por mim no código: `actions.ts:245-248` e `config.toml:171,236`.

### H1-02 — Guarda do autosave não vê JWT em arquivo novo (🟡)

- **Cenário concreto.** `infra/git-autosave.sh` roda a cada 5 min, commita tudo e faz push no repositório
  **público**. A guarda dos diffs (linha 30) procura `eyJ…`, mas a de arquivos novos (linha 33) só procura
  `sk-ant-`, `sb_secret_` e chave privada. Uma evidência nova `docs/parciais/**/x.txt` com um
  `Authorization: Bearer eyJ…` colado (o que um agente faz ao provar uma rota) é publicada sem aviso. Hoje há
  0 JWT no repositório e no histórico.
- **Correção proposta.** Usar o mesmo padrão nas duas guardas (incluir `eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.`
  e `sb-[a-z0-9-]+-auth-token` na linha 33).
- **Prova.** `sed -n 25,40p infra/git-autosave.sh` (linhas 30 e 33 lado a lado); `h1/estatico/achados.md` H1E-05.

### H1-03 — Sugestões da conversa não somem quando a pessoa escreve (🟡)

- **Cenário concreto.** Na V4.6, as sugestões ("Pergunte ao Otto") aparecem só enquanto a pessoa não escreveu:
  `hasSug: !userAfter && !o.typing` (protótipo L10912; `FLUXOS_DA_V46.md` §4.3). No nosso, a condição é "o
  agente ainda não falou" (`ConversationPanel.tsx:236-238`, `!agentSpoke`). Marina escreve algo que não vira
  pedido (por exemplo "obrigada"): a mensagem fica só como mensagem, nenhum agente responde e as sugestões ficam
  na tela para sempre naquela conversa. Não está na A1f §3, na A1a §5 nem na A1b §4.
- **Correção proposta.** Trocar a condição para "a pessoa ainda não escreveu" (e sem digitação em curso), como
  a V4.6.
- **Prova.** `h1/prototipo/achados.md` §1 e o par `proto-conversa.png`/`nosso-conversa.png`; conferido por mim
  no código (as duas condições citadas acima).

### H1-04 — "Conversar com <Nome>" abre a conversa errada (🟡)

- **Cenário concreto.** No cabeçalho do ambiente, a V4.6 abre a conversa **do ambiente** (objeto `env`, L10572),
  que aparece em Conversas como "Conteúdo · Otto · sobre o ambiente". O nosso abre a conversa **direta** com o
  Otto com o cartão "Conteúdo" (`EnvIdentity.tsx:54-55`): o histórico direto passa a aparecer como se fosse sobre
  o ambiente. A A1f §6 registra só o caso "Conversar" do Início (retoma a direta), não este.
- **Correção proposta.** Abrir/reabrir a conversa de objeto do ambiente, como o protótipo; a conversa direta
  continua no Início e em Minha Equipe.
- **Prova.** `h1/prototipo/achados.md` §2 e o par `proto-equipe-conversas.png`/`nosso-equipe-conversas.png`.

### H1-05 a H1-11 (ℹ️)

- **H1-05.** Cabeçalho da conversa de objeto mostra "Otto Conteúdo" (a V4.6 põe o papel só na direta, L5504);
  nomes acessíveis do Início ". Ver mais"/". Fechar" (V4.6: ". Ver detalhes"/". Recolher detalhes", L8356) e
  "só Íris participa"/"Nexo e Bia e Kaia participam" (V4.6: "só a Íris participa", "Nexo, Bia e Kaia
  participam", L8296). Prova: `h1/prototipo/achados.md` §3–5.
- **H1-06.** "De onde vem" lista 2 fontes (seed); a V4.6 lista também "Cadastro", "Site", "Google Perfil" e
  "Documentos" não conectadas. A origem é o seed/API: decisão técnica do Thor (seed ganha as fontes ou a tela
  completa as não conectadas). Prova: `h1/prototipo/achados.md` §6.
- **H1-07.** No aceite, o pedido "pão de centeio da semana" recebeu "Escrevi duas versões da legenda de sábado…"
  e um cartão com uma versão só (`h1/aceite/04-trabalho-aprovado.png`). É a fixture determinística do modo
  simulado, mas numa demonstração ao dono o texto contradiz o cartão. Correção: a fixture dizer "Escrevi a
  legenda…".
- **H1-08.** O `flock` do `Makefile` passa o descritor da trava aos filhos. Nesta H1 um worker meu (subido
  dentro da trava, parado com o PID errado) segurou a trava 14 min (13:33–13:47) e travou o clone e o meu
  harness; parei o grupo com SIGTERM (saiu limpo) e corrigi o script. O `make e2e` tem o mesmo mecanismo: se o
  teardown não roda (Ctrl+C no meio), o worker órfão segura a trava e o próximo `make test` espera 30 min e
  falha. Correção: `DB_LOCK := flock -o -w 1800 …` e uma linha em "Problemas comuns" (`lsof
  /tmp/hellosquad-db.lock`); avaliar a trava também em `make up`/`make migrate`. Prova:
  `docs/parciais/H1-progresso.md` (registro 13:36–13:47) e `h1/clone/achados.md`.
- **H1-09.** Do clone limpo (`h1/clone/achados.md`): `cp .env.example .env` nasce `664` (o principal é `600`;
  sugerir `chmod 600`); `make status` e o log do `make up` imprimem as chaves locais (defaults públicos do CLI);
  a tabela de alvos diz que `make test-web` roda "testes Vitest dos pacotes", mas roda também os 121 do web; um
  segundo checkout na mesma máquina grava outra senha no papel compartilhado `hellosquad_api` e derruba a API
  do primeiro (dedução do código, não reproduzido para não derrubar a API do dono).
- **H1-10.** Cookie de sessão sem `Secure` e com 400 dias (esperado em http local; acertar na Fase 5); a Server
  Action do token responde também na página pública `/` (só devolve o token do próprio cookie; Origin
  conferida); `'unsafe-eval'` na CSP só em dev e `'unsafe-inline'` na `/` estática (pendência conhecida da A0b);
  "RD Station" e "HubSpot" num comentário de `squad/max/agent.yaml:35` (integrações-alvo, não dado de teste).
  Prova: `h1/estatico/achados.md` H1E-03, 04, 07 e 09.
- **H1-11.** `voce@seunegocio.com.br` e `seunegocio.com.br` como placeholder no catálogo vieram do protótipo;
  pela regra "segue o protótipo sempre" ficam, e o Vic/Diogo trocam no ajuste do front se quiserem. Prova:
  `h1/estatico/achados.md` H1E-06 (rebaixado de 🟡 para ℹ️ por ser o texto do protótipo).

## (c) O que tentei e NÃO quebrou

**1. Aceite do Documento Mestre §16 pelo browser** (`h1/01_aceite.sh` + `h1/01_aceite_browser.mjs`, Playwright
com o worker do produto em modo simulado; duas rodadas, 13:32 e 13:57). Marina entra, abre o Nexo, pede "Quero
uma legenda para o Instagram sobre o pão de centeio da semana."; a v1 do Otto chega na conversa **sem
recarregar** (marcador `window.__h1` intacto); abre a v1, **clique duplo** em "Aprovar v1"; "Aprovada por você"
no trabalho e no cartão do painel ao lado em até 10 s, sem recarregar (rodada 2); após recarregar continua; o
histórico do trabalho (`GET /work-items/{id}`, `h1/aceite2/historico_api.txt`) traz pedido (Marina) → entregue
(Otto) → decidido (Marina), com origem tipada "mensagem na conversa com o Nexo"; Projetos mostra o trabalho em "Concluídos · Aprovado" e a faixa volta a 1 pendência. No banco, as
duas rodadas: **saldo 36 → 26**, 1 run `succeeded` (`attempts 1`, `credits_charged 10`), 1 reserva `captured`,
extrato `hold` ×1 + `capture` ×1 (−10), 1 versão `approved`, aprovação `decided/approved`, **1** evento
`approval.decided` apesar do clique duplo, estimativa 10 = cobrado, 5 itens em `run_context_items`. Capturas em
`h1/aceite/` e `h1/aceite2/`.

**2. Idempotência** (`h1/02_idempotencia_creditos_worker.py`, worker do produto no processo; `h1/02_rodada2.txt`).
- Decidir 12x em paralelo com 3 decisões diferentes (aprovar, pedir ajuste, rejeitar com nova proposta): 12×200,
  todas devolvem a mesma decisão, 1 evento de auditoria, 1 run (o aprovar venceu). Repetir depois com "rejeitar
  e cancelar": 200 com a decisão original, trabalho continua `approved`.
- O mesmo run 3 vezes na fila e 2 workers ao mesmo tempo: `delivered` + `busy` ×2, depois `finished` ×2; 1 versão,
  1 captura, `attempts 1`, fila vazia.
- Falha passageira depois de produzir (`otto.check` indisponível): run volta a `queued` com a reserva `held`;
  retry entrega com `attempts 2`, **1 reserva, 1 captura**, 1 versão.
- Reenfileirar run concluído: `app.enqueue_run` recusa (`55000`); mensagem duplicada crua no pgmq → `finished`,
  extrato e versões iguais.

**3. Isolamento das tabelas novas e Realtime** (`h1/03_isolamento_papeis_memoria.py`, `h1/04_realtime_tenants.mjs`,
`h1/04c_broadcast_injecao.mjs`).
- Data API: as 31 tabelas da Fase 1 (memória, créditos, conversas em grupo, leituras, cartões, trabalho rico,
  projetos, marcos, participantes, runs, eventos) × Rafael, Pedro e anônimo × GET/POST/PATCH/DELETE: 0 linhas da
  Miolo lidas, 0 inserções, 0 alterações, 0 remoções; embed `messages → conversations` sem a Miolo; anônimo sem
  linhas. Controle: Marina vê linhas em 20 tabelas.
- API: 42 rotas com ids da Miolo usados pelo Rafael: 41 × 404 e 1 × 422 (corpo inválido validado antes da busca,
  sem dado); nenhum id nem nome da Miolo nas respostas.
- Realtime, leitura: no canal privado `workspace:<Miolo>`, Rafael, Pedro e anônimo levam `CHANNEL_ERROR:
  Unauthorized`; Rafael e anônimo no canal **público** com o mesmo nome entram e **não recebem nada** (fecha a
  dúvida H1E-02 do auxiliar); controles: Marina recebe só a sonda da Miolo e Rafael só a da Vitta.
- Realtime, escrita: Rafael e Marina tentam injetar `approval.decided` falso no canal da Miolo pela REST (202) e
  pelo websocket (Rafael não entra; Marina "envia"): o ouvinte da Miolo recebe **nada**. `realtime.messages` só
  tem política de SELECT.

**4. Owner-only, editor, admin e viewer** (mesmo script). Carla inserida na Miolo como editor, depois admin,
depois viewer: decidir aprovação, confirmar sugestão, corrigir fato, "não usar mais" e editar o perfil → 403 nos
três papéis; ler memória → 200; abrir conversa e enviar → 201 (editor, admin) e 403 (viewer). Aprovação, fato e
sugestão intactos. Rafael no "Agora não" de uma pendência da Miolo → 404.

**5. Memória respeita confirmação** (mesmo script; o LLM simulado do produto envolto para gravar o que recebe).
Marina descarta "Posts com bastidores do forno têm mais salvamentos" e corrige o tom de voz; o run seguinte
(pedido que cita bastidores e tom de voz) tem 4 itens em `run_context_items`, todos `confirmed`/`decision`: a
versão nova do tom entra, a antiga não, a sugestão descartada não; nas 3 chamadas ao LLM o texto da sugestão e o
tom antigo não aparecem e o novo aparece. Nenhuma sugestão nova nasceu do run.

**6. Créditos.** Falha definitiva (recusa do modelo) → run e trabalho `failed`, extrato `hold` + `release`, saldo
igual, reservado 0. Falha passageira 3 vezes → `failed` e liberado. Pergunta do Nexo (`respond`) → `hold` +
`release`, saldo igual; a resposta gera a entrega com 1 captura (−10). Estimativa = cobrado na primeira versão e
no ajuste (10/10, `revision = true`). Vitta com 20 créditos, 5 pedidos e 2 workers: 2 entregues, o resto recusado
com `insufficient_credits`, saldo 0, nenhum grant negativo, reservado 0. Extrato imutável: `postgres` e
`hellosquad_api` recusados (`42501`) em UPDATE, DELETE e TRUNCATE (e INSERT direto da API); Data API PATCH/DELETE
→ 403. "Agora não": 200 duas vezes, pendência continua `pending` sem decisão e sai da faixa; "Agora não" de uma
revisão → 422; trabalho, extrato e runs iguais.

**7. Worker.** Dois workers de concorrência 4 com 9 runs lentos (Miolo 6, Vitta 3): pico 3 por workspace, 6 no
total. SIGTERM no meio do run (carência 1 s): o run volta a `queued` sem gastar tentativa e depois entrega uma
vez. SIGKILL no meio do run: fica `running`; vencido o lease, outro worker retoma (`attempts 2`) e entrega; 1
reserva, 1 captura, 1 versão nas duas variantes.

**8. Web** (`h1/estatico/`). CSP em 15 rotas (inclusive 307 e rota funda) com `ws://127.0.0.1:56321` e nenhum
host de nuvem; 0 violação de CSP no Chromium logado em 10 rotas; o websocket entra no canal privado. Cookie
`HttpOnly` e `SameSite=Lax`; `document.cookie` vazio. Ação do token: sem sessão 307, de `evil.example`,
`localhost` e `null` 500, sem CORS, `Cache-Control: no-store`, refresh token nunca sai. `?next=`: 14 variações
+ 5 com o campo oculto adulterado ficam em 127.0.0.1:3100; `/app/vitta` não vaza; `/sair?next=` vai a `/entrar`.
`noindex` em todo `/app`; `robots.txt` bloqueia `/app` e `/sair`; sitemap só com `/` e `/criar-conta`.
Comparação com o protótipo sem diferença nova em: Início, barra lateral, Conteúdo/Otto, "Precisa de você",
Projetos (Quadro, Lista, Biblioteca, filtros), detalhe do trabalho e histórico, Memória (dossiê, "percebeu",
abas), Minha Equipe & Conversas, Bia, Kaia, Kiwi, Max, Íris, Modo Autônomo e "Plano Squad · créditos".

**9. Diretrizes.** 0 segredo na árvore, no histórico e nas evidências (`docs/parciais/**/*.txt`), 6 de 9
capturas de nome suspeito abertas sem chave; 0 URL de nuvem nas configurações; 0 emoji nos catálogos do web e do
backend e nas fixtures do LLM; 0 e-mail fora de `.example` em seed, testes e e2e; 0 CPF/CNPJ; 230 commits desde
16/10 sem emoji nem assunto em inglês; catálogo com 1006 chaves e 0 em inglês (auxiliar + minha conferência).

**10. Clone limpo** (`h1/clone/`). Clone do GitHub público (commit `b090f2e`) em `/tmp/h1_clone`, seguindo o
"Subir do zero" do SETUP_LOCAL no mesmo Supabase `hellosquad` (sem outro projeto nem outras portas; senha do
papel reaproveitada para não derrubar a API do dono): `make up` 0, `make migrate` 0, `make seed` 0, `make test`
0 em 41 s (pytest 133, Vitest web 121 + ui 49 + contracts 9, pgTAP 489), worker do clone sobe em simulado e
encerra limpo no SIGTERM. `make e2e` do clone (atualizado para `fa77efa`, que só mexe em docs) com a API e o web
do dono parados às 13:55:05: build de produção + **Playwright 10/10 em 17,1 s, exit 0**, com a API, o web e o
worker do próprio clone. Cinco afirmações do SETUP_LOCAL conferidas (portas, `make status`, roteiro S1g, worker,
aviso do `make up` sem `.env`, que confirma o H0-06 corrigido).

**O que não ataquei a fundo:** a vez do especialista em conversa em grupo (S1f: só li o `_begin_reply`, que
espera a vez com o run de outro especialista em execução) e o "não volta" da sugestão pelo `app.suggest_memory`
direto (o run de A5 não sugeriu nada; fica com o pgTAP da S1d).

## (d) Veredito por fatia e da Fase 1

| Fatia | Veredito | Base |
|---|---|---|
| S1a schema, estados, RLS, Realtime | ✅ | 31 tabelas isoladas na Data API; canal privado recusa leitura e escrita entre tenants; extrato imutável até para `postgres` |
| S1b API do núcleo | ✅ | 42 rotas sem vazamento; decisão idempotente sob 12 chamadas concorrentes |
| S1c runtime e worker | ✅ (ℹ️ H1-07) | retry, teto, SIGTERM, SIGKILL, run duplicado; owner-only |
| S1d memória | ✅ | sugestão descartada fora do contexto e do prompt; correção vira versão nova; owner-only |
| S1e créditos | ✅ | saldo nunca negativo, falha libera, pergunta não cobra, estimativa = cobrado, uma captura por run |
| S1f conversa completa | ✅ (parcial) | isolamento de participantes, leituras e mensagens; vez do especialista não atacada |
| S1g trabalho rico | ✅ | "Agora não" não cobra nem rejeita; histórico e Projetos no aceite |
| A1f fidelidade à V4.6 | ✅ com 🟡 H1-03, H1-04 | duas diferenças visíveis não registradas; ℹ️ H1-05 |
| A1a ao vivo | ✅ com 🟡 H1-01 | entrega e decisão sem recarregar; CSP com `ws://`; cookie httpOnly; o token do Realtime é amplo demais |
| A1b Projetos, Memória e ambientes | ✅ (ℹ️ H1-06) | Projetos e histórico no aceite; telas sem diferença nova |
| **Fase 1** | ✅ **pronta** | critério da fase atendido pelo browser e pelo banco; 🔴 0 |

Como QA sou consultivo: recomendo ao Thor tratar **H1-02** já (uma linha, protege o repositório público),
**H1-03** e **H1-04** na próxima fatia de interface (são o combinado do protótipo), e **H1-01** antes da Fase 5.
Quem aceita ou devolve é o Thor.

## (e) Perguntas ao dono

Nenhuma pergunta nova: o que encontrei o protótipo ou as diretrizes respondem. O aceite toca uma pergunta já
aberta: **S1e §4 pergunta 5** (ajuste e nova proposta cobram o mesmo preço). Hoje "Pedir ajuste" cobra de novo
(T7: 10 + 10 no mesmo trabalho); "crédito debitado uma vez só" vale para o caminho pedido → entrega → aprovação,
e o ajuste depende dessa resposta.

## (f) Estado em que deixei a máquina

- Banco no estado do seed (`make seed` ao fim; conferido abaixo). Membership temporária da Carla na Miolo,
  grants de teste e trabalhos dos cenários removidos pelo seed.
- API (8100) e web (3100) do dono parados às 13:55:05 para o `make e2e` do clone e religados às 13:56 a partir do
  repositório principal, desacoplados da sessão (`setsid nohup make dev-api` / `make dev-web`; logs em
  `/tmp/hellosquad-dev-api.log` e `/tmp/hellosquad-dev-web.log`). Nenhum worker no ar.
- Só os 11 containers `supabase_*_hellosquad` foram usados; nada de outros projetos foi tocado.
- Clone em `/tmp/h1_clone` removido ao fim (tinha um `.env` com as chaves locais).
