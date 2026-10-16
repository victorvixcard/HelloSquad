# H2 — Relatório de QA adversária da Fase 2 (Hulk)

**Fatia:** H2, QA adversária da Fase 2. **Data:** 16/10/2026, 18:55 → 19:40. **Método:** tentar refutar S2a–S2f,
A2a–A2c e N2a lendo o código real e atacando o ambiente local (API 8100, web 3100, Supabase `hellosquad`, worker do
produto em modo simulado, Mailpit 56324). Nenhum código de produto foi alterado. Roteiros e provas em
`docs/parciais/h2/`; saídas longas em `/tmp/h2_*`. Toda operação que muda o banco rodou dentro da trava
`flock -o /tmp/hellosquad-db.lock`, medindo o estado **dentro** da mesma trava (o clone limpo reaplicou o seed entre
dois blocos meus e apagou a primeira rodada: a lição está no §(f)). Três auxiliares (sub-agentes): comparação com o
protótipo (`h2/prototipo/`), clone limpo (`h2/clone/`) e varredura estática + site em build de produção
(`h2/estatico/`); conferi no código ou ao vivo os achados deles antes de aceitar e reclassifiquei dois.

**Veredito em uma linha:** pela API, o critério da Fase 2 **passa** (seis personas entregam, o projeto Bia →
Kaia(stub) → Otto fecha com responsável por etapa, a correção da Marina entra na entrega seguinte do Otto), e
isolamento, créditos, cobrança, e-mail e worker **resistiram a todos os ataques**. Pela tela, **não passa**: o projeto
coordenado não tem caminho nem tela no web (**H2-01 🔴**). Encontrei também **11 🟡** e **16 ℹ️**.

## (a) Tabela-resumo

| # | Achado | Sev. | Onde | Quebra isolamento/segredo/combinado? |
|---|---|---|---|---|
| H2-01 | O projeto coordenado (01.02, critério da fase) não existe no web: a Sala do Squad não responde ao pedido de campanha; "Coordenar uma campanha" do Nexo abre a Bia (02.04); um projeto criado pela API aparece como "Entrega pontual · Nexo · legenda · Aprovar v1", sem etapas, sem responsável por etapa e sem a Kaia aguardando motor | 🔴 | `apps/web` (0 referências a `01.02`, `steps`, cartão `team`, `waiting_engine`); `lib/live/request.ts:7`; `lib/capabilities.ts:15` | Critério da fase não atingível pela tela; jornada 2 da V4.6 (FLUXOS §3.2) |
| H2-02 | Reflexão (memória camada 3) falha em 13 das 16 deliveries no modo simulado: aprovar Bia 02.01/02.02/02.03/02.07, Otto 04.02, Kiwi, Max ou Íris grava `memory_reflections.status = failed` (`llm_config`) e loga ERROR | 🟡 | `apps/backend/src/hellosquad/llm/fixtures/*/` (só 02.04, 04.01 e 04.03 têm `*.reflect.json`) | Não; a camada 3 só funciona para 3 deliveries no modo da fase |
| H2-03 | A correção da Marina só chega à mesma delivery: promovida na 04.01, não entra no contexto da 04.03 (posts e roteiros) do Otto | 🟡 | `squad/memory.py:68-92` (`SEARCH_LEARNINGS`) | Critério da fase vale só se a "entrega seguinte" for outra 04.01 |
| H2-04 | Idioma do negócio não entra na web: quem não escolheu idioma vê pt-BR num negócio em en (o e-mail da mesma pessoa chega em en) | 🟡 | `apps/web/lib/supabase/middleware.ts:39-41` | Ordem pessoa → negócio → pt-BR (ADR-0010, A2a) quebrada no web |
| H2-05 | API e falas do squad em pt-BR num negócio en/es: catálogo do backend com 81 de 290 chaves em en/es (status, histórico, perguntas da triagem, aberturas, erros de run), 37 erros da API fixos em pt-BR, saudação e sugestões do `agent.yaml` | 🟡 | `apps/backend/src/hellosquad/i18n/*.json`, `i18n/__init__.py:24`, `conversations/opening.py:81` | ADR-0010 ("mensagens de erro da API por idioma"; "os agentes respondem no idioma do workspace") |
| H2-06 | Web grava e compara texto pt-BR: objetivo do primeiro acesso com "Objetivos"/"Objetivo atual" fixos; Memória ordena os "Principais conhecimentos" por texto pt-BR | 🟡 | `apps/web/lib/onboarding.ts:10`, `components/memory/memory-model.ts:16-32` | Regra "nenhum texto fixo em código" |
| H2-07 | A guarda do autosave não reconhece chave do Asaas, do Mercado Pago nem segredo de webhook (o autosave faz push no repositório público) | 🟡 | `infra/git-autosave.sh:32` | Não hoje (0 segredo no repo e no histórico); risco quando as contas sandbox chegarem |
| H2-08 | O catálogo inteiro (inclusive o da área logada) vai serializado no HTML de cada página pública: 190 KB em `/sobre`, com nomes de plataformas no código-fonte | 🟡 | `apps/web/app/layout.tsx:36` (`NextIntlClientProvider` sem `messages`) | Regra da N2a "nenhum fornecedor citado" vale para o texto visível; o HTML bruto os leva |
| H2-09 a H2-12 | Diferenças visíveis da A2b contra a V4.6 não registradas (§b) | 🟡 | `apps/web/components/env/**` | Diverge do protótipo (não registrado) |
| H2-13 a H2-28 | Notas (§b) | ℹ️ | vários | Não |

Contagem: 🔴 1 · 🟡 11 · ℹ️ 16 (números finais no §(b); os da comparação com o protótipo conferidos por mim).

## (b) Achados

### H2-01 — O projeto coordenado não existe no web (🔴)

- **Cenário concreto.** Critério da fase: "um projeto coordenado (Bia → Kaia → Otto) fecha com um responsável por
  etapa". A S2d entregou isso na API (`work_item_steps`, cartão `team`, marcos por etapa, `waiting_engine`) e deixou
  em `S2d-relatorio.md` §7 "O que o web precisa para a A2c ou A2d"; a A2c foi o site público e **não existe A2d** no
  plano. No web: (1) a Marina escreve na Sala do Squad "Quero uma campanha de Natal para vender mais panetones." (a
  jornada 2 da V4.6, FLUXOS §3.2) e **nada acontece** em 25 s: o pedido vira só mensagem, porque
  `deliveryForRequest` só reconhece "legenda/texto" → 04.01 (`lib/live/request.ts:7`); o botão do estado vazio de
  Projetos, "Começar pela Campanha de Natal", leva exatamente a esse beco (abre a Sala com o pedido já escrito,
  `components/env/projects/ProjectsView.tsx:62-63`); (2) "Coordenar uma campanha"
  no catálogo do Nexo abre a conversa da **Bia** com 02.04 (`lib/capabilities.ts:15`; registrado pela A2b §4 item 4
  como interpretação); (3) um projeto coordenado criado pela API (Bia aprovada, Kaia `waiting_engine`, Otto aguardando)
  aparece no detalhe do trabalho como **"ENTREGA PONTUAL"**, **"Nexo · legenda"**, "Nexo aguarda você · Primeira
  versão", "FORMATO 01.02" e **"Aprovar v1"**, sem etapas, sem "etapa 3 de 3", sem responsável por etapa e sem a
  Kaia aguardando motor; a versão pendente é a dos textos do Otto. `grep` em `apps/web`: 0 referências a `01.02`,
  `steps`, `step_label`, `waiting_engine` ou cartão `team`. Consequência: pela tela, o Nexo não entrega nada próprio
  e o projeto coordenado não pode ser pedido, acompanhado nem fechado; a Marina aprovaria os textos do Otto num
  cartão que diz "legenda do Nexo".
- **Correção proposta.** Fatia de web (a "A2d" que a S2d previu) com o contrato que já existe: na Sala do Squad, o
  pedido de campanha cria o trabalho 01.02 (como a jornada 2: pergunta do Nexo, cartão da equipe, projeto); detalhe
  do trabalho coordenado com as etapas (`steps[]`, `step_label`, responsável, `status_reason_label`), a pendência da
  etapa certa e a Kaia "aguardando motor"; cartão `team` na conversa. Até lá, o critério da fase só se prova pela API.
- **Prova.** `h2/07_browser_criterio.txt` (Sala: só a mensagem da Marina no banco; worker sem run), captura
  `h2/browser/sala-campanha-natal.png`; `h2/browser/nexo-erro.png` (catálogo do Nexo abre a Bia);
  `h2/10_projeto_na_tela.txt` e `h2/browser/projeto-coordenado-trabalho.png` (projeto da API como entrega pontual).
  Pela API o mesmo projeto fecha certo: `h2/02_projeto_e_memoria.txt` §B.

### H2-02 — Reflexão falha em 13 das 16 deliveries no modo simulado (🟡)

- **Cenário concreto.** A S2c liga a fila `memory_reflect` a todo fechamento de trabalho. O LLM simulado procura
  `fixtures/<delivery>/<agente>.reflect.json`; sem o arquivo, levanta `LLMConfigError` (`llm/simulated.py:93-97`), que
  é definitivo: a reflexão vai a `failed` na 1ª tentativa e a mensagem é arquivada. Só 02.04, 04.01 e 04.03 têm a
  fixture (a S2d acrescentou as duas primeiras porque "aprovar uma estratégia ou textos no modo simulado deixava a
  reflexão sem resposta", §3, mas não as outras 13). Na Vitta, aprovar 02.01, 05.01 e 07.02 deu três
  `failed {"code": "llm_config", "step": "bia.reflect" | "kiwi.reflect" | "iris.reflect"}`; o mesmo vale para 02.02,
  02.03, 02.07, 04.02, 05.02, 06.01, 06.02, 06.03, 07.03 e 07.04 (sem o arquivo). O modo simulado é o modo da fase
  inteira: a camada 3 só aprende com 3 deliveries, e cada aprovação das outras grava um ERROR no log do worker.
- **Correção proposta.** Fixture `*.reflect.json` com o caso "nada a aprender" para as 13 (como a S2d fez para 02.04
  e 04.03) e um teste que exige, para cada delivery do catálogo com fluxo, as etapas `produce`, `check` e `reflect`.
- **Prova.** `h2/02_projeto_e_memoria.txt` §C; `h2/01_worker_reflexao_falhou.txt` (5 falhas depois das aprovações
  da primeira rodada); `ls apps/backend/src/hellosquad/llm/fixtures/*/` (lista no §C da prova).

### H2-03 — A correção da Marina não chega a outra delivery do Otto (🟡)

- **Cenário concreto.** Marina pede a legenda do pão de abóbora (04.01), pede ajuste com "Nunca use 'promoção
  imperdível'; chame o cliente de 'você'.", aprova a v2; a reflexão promove **Vocabulário** e **Tratamento**. Na 04.01
  seguinte, os dois entram no contexto (`run_context_items`, motivo `delivery`) e no prompt (`<aprendizados>`), e o
  texto sai sem a expressão e com "você": **critério da fase atendido**. Mas no pedido seguinte de **04.03** (reels e
  status de WhatsApp) o contexto não tem nenhum aprendizado: `SEARCH_LEARNINGS` só traz os de outra delivery quando a
  busca textual acha palavras do pedido no texto do aprendizado, e "posts dos bastidores" não casa com "promoção
  imperdível". Uma regra de voz que a dona corrigiu na legenda não vale para os roteiros do mesmo agente.
- **Correção proposta.** Decisão técnica (Thor/Stark), não do dono: aprendizado de voz e tratamento com escopo do
  agente (todas as deliveries dele) ou a reflexão marcar o escopo; manter a busca para os específicos. Teste: a
  correção da 04.01 aparece no contexto da 04.02 e da 04.03.
- **Prova.** `h2/02_projeto_e_memoria.txt` §D (W2 com os dois aprendizados; W3 `contexto: []`).

### H2-04 — Idioma do negócio não entra na web (🟡)

- **Cenário concreto.** Vitta em `en` (PATCH do owner), Rafael sem idioma próprio, Carla com `es`. Na web, Carla vê
  `<html lang="es">` e a barra em espanhol (certo); **Rafael vê pt-BR** (`lang="pt-BR"`, "Início", "Projetos"). O
  e-mail "Needs you" do mesmo Rafael chegou em inglês (o backend resolve pessoa → negócio). O middleware chama
  `resolveLocale({ user })` sem o negócio, com o comentário "o do negócio, que a API ainda não devolve (pedido à
  S2b)" (`lib/supabase/middleware.ts:39-41`); a S2b entregou `memberships[].workspace.locale` em `GET /me` às 15:43 e
  nenhuma fatia de web religou (A2b e A2c não citam). O "Idioma do negócio" do menu continua aviso.
- **Correção proposta.** Passar o `locale` do negócio da rota ao `resolveLocale` (o resolvedor já tem o parâmetro) e
  um e2e com uma pessoa sem idioma num negócio en.
- **Prova.** `h2/11_idioma_web.txt`; `h2/05_email.txt` §1 (Rafael recebe "Needs you: …" em en).

### H2-05 — API e falas do squad em pt-BR num negócio en/es (🟡)

- **Cenário concreto.** Com a Vitta em `en`, o pedido de legenda ao Otto volta com `status_label` "v1 aguarda sua
  aprovação" e as etapas do projeto com motivo e títulos em pt-BR; a pergunta da triagem ("Para começar, preciso
  saber: …"), as aberturas dos ambientes, o histórico do trabalho e os erros de run também, porque `en.json`/`es.json`
  do backend têm 81 das 290 chaves e `t()` cai calado no pt-BR (`i18n/__init__.py:24`). Além disso, 37 mensagens de
  erro da API estão escritas em pt-BR no código e a tela as mostra em en/es (ex.: importação de CSV,
  `components/env/crm/ImportPanel.tsx:54`), e a saudação e os pedidos sugeridos vêm de `agent.yaml` em pt-BR
  (`conversations/opening.py:81`). A S2c registrou "o resto cai no pt-BR (como antes, ADR-0010)", mas a ADR-0010 diz
  o contrário: "mensagens de erro da API por idioma via código estável; os agentes recebem o idioma do workspace no
  contexto e respondem nele" (só as SOULs ficam para depois). No modo real o texto do LLM sai no idioma (o
  `<idioma>` está no system); o que o backend escreve sozinho, não.
- **Correção proposta.** Completar en/es do catálogo do backend (tradução revisada, como a A2a fez no web), erros da
  API pelo `code` traduzido no web, e um teste que compara as chaves dos três catálogos do backend (o web já tem).
- **Prova.** `h2/06_worker.txt` §5; contagem das chaves no §(c) item 8; `h2/estatico/achados.md` E-05, E-06, E-07.

### H2-06 — Web grava e compara texto em pt-BR (🟡)

- **Cenário concreto.** O objetivo do primeiro acesso entra na Memória com `topic: "Objetivos"` e
  `key: "Objetivo atual"` fixos (`lib/onboarding.ts:10`; o comentário diz "texto do idioma do workspace", mas é
  literal), então um negócio en grava chaves em português; e a Memória acha e ordena os "Principais conhecimentos"
  comparando com textos pt-BR (`components/memory/memory-model.ts:16-32`), o que num negócio en/es deixa o dossiê
  sem as chaves certas.
- **Correção proposta.** Chaves estáveis (ids) no banco e rótulo pelo catálogo; comparação por id.
- **Prova.** `h2/estatico/achados.md` E-08 e E-09 (conferido: `onboarding.ts:10`).

### H2-07 — Guarda do autosave cega para as chaves da cobrança (🟡)

- **Cenário concreto.** `SECRET_RE` (`infra/git-autosave.sh:32`) conhece Anthropic, Supabase, JWT e cookie, mas não
  `$aact_…` (Asaas), `APP_USR-…`/`TEST-…` (Mercado Pago), `ASAAS_API_KEY=`/`MERCADOPAGO_ACCESS_TOKEN=` preenchidos nem
  os segredos de webhook. A S2e criou esses segredos (`.env.example` vazio); quando o Vic trouxer as contas sandbox,
  um `.env.local` ou um roteiro com a chave seria commitado e enviado ao repositório público pelo cron.
- **Correção proposta.** Acrescentar os padrões e casos ao `infra/tests/git-autosave-guard.sh`.
- **Prova.** `h2/estatico/achados.md` E-02 (conferido no arquivo).

### H2-08 — Catálogo inteiro serializado em cada página pública (🟡)

- **Cenário concreto.** `NextIntlClientProvider` sem `messages` no layout raiz entrega ao cliente todo o catálogo
  do idioma, inclusive o da área logada: `/sobre` tem 190 KB de HTML (73% catálogo), com nomes de plataformas
  (Instagram, Google Ads, WhatsApp) e "grátis" no código-fonte que os robôs de IA leem, contra a regra da N2a para o
  site. O Lighthouse ainda dá 99, mas o peso cresce com cada tela nova.
- **Correção proposta.** Passar ao provider só os namespaces da rota (site público × app).
- **Prova.** `curl -s http://127.0.0.1:3100/sobre | wc -c` = 190529; `h2/estatico/achados.md` E-12.

### H2-09 a H2-12 — Diferenças da A2b contra a V4.6 não registradas (🟡)

Comparação lado a lado (auxiliar, `h2/prototipo/achados.md`, capturas `proto-*.png` × `nosso-*.png` em 1440×900),
só o que nenhum relatório registrou (A2b §4, A2a §4). Conferi cada 🟡 no código ou na captura antes de aceitar.

- **H2-09 — "Sem números" com 90 dias de métricas no banco (P-01, P-02).** Em Conteúdo, o card "Desempenho
  orgânico" mostra sempre "A Íris ainda não tem números do Instagram para ler." (renderizado sem consultar nada,
  `components/env/ContentEnvironment.tsx:410`) e o "Otto percebeu" espera a Íris; e a primeira fala da conversa do
  ambiente da Íris é sempre "Ainda não tenho números da Miolo para ler…" (`conversations/opening.py:154-155`, sem
  ler `metrics_daily`), enquanto a página ao lado mostra "Alcance no Instagram 32.592" e as séries de 90 dias do seed
  da S2b. É o estado vazio honesto ao contrário: diz que não há dado quando há. Correção: ler a série (a API
  `GET /metrics` já existe) e cair no vazio só sem dado. Prova: código e `nosso-iris.png`, `nosso-otto.png`.
- **H2-10 — Resultados (P-03, P-04, P-05).** "Desempenho por canal" sobrepõe variação e valor ("-13,9%" sob "3.694",
  "+18,3%" sob "32.592") e corta os nomes ("Seguidores no Inst…"): a V4.6 tem nome, barra e valor em três colunas
  (`ResultsEnvironment.tsx:231-240`, `results.css:2`; `nosso-iris-canais.png`); o gráfico de 12 semanas não rotula as
  faixas do período ("AGOSTO"/"SETEMBRO" na V4.6) nem a média; "Análises recentes" e "Desempenho por canal" sem o
  botão de conversa do cabeçalho do card.
- **H2-11 — Conversas de objeto abrem mudas (P-09, P-10).** "Analisar com Íris" num indicador abre o painel vazio:
  sem "Hoje", sem a primeira fala da Íris, sem o cartão do indicador e sem "Pergunte à Íris"; a V4.6 abre com a
  leitura ("Encomendas pelo site, setembro: 128, 18% a mais…"), o cartão com a curva e três perguntas
  (`proto-indicador-painel.png` × `nosso-indicador-painel.png`). O mesmo vale, pelo código, para publicação e
  oportunidade. A coluna "Contexto da conversa" do indicador não traz número, variação nem curva
  (`ConversationPanel.tsx:788-791`).
- **H2-12 — Documento revisável (P-11, P-12).** No diagnóstico, no plano e nos relatórios, o cartão da decisão não
  traz a regra da V4.4 ("Aprovar o diagnóstico não cria trabalhos…", FLUXOS §5) e mostra o texto da legenda do
  Otto: "O ajuste abre a conversa com a Bia ao lado, com a legenda à vista." (`docs/DocumentDetail.tsx:197` usa
  `content.adjustNote`); a migalha leva o título do pedido ("Quero analisar meu negócio") e o h1 o do documento (na
  V4.6 são o mesmo), e o botão é "Conversar com a Bia" em vez de "Conversar sobre o diagnóstico".

### H2-13 a H2-28 (ℹ️)

| # | Nota | Onde | Prova |
|---|---|---|---|
| H2-13 | Nome do negócio aceita CR/LF e HTML (`POST /workspaces`, `max_length` 120 sem filtro de controle). O HTML sai escapado no e-mail e **não houve injeção de cabeçalho** (Bcc), mas todo e-mail daquele negócio falha com `ValueError` classificado como `internal` e fica voltando à fila | `identity/schemas.py:28`, adaptador SMTP | `h2/05_email.txt` §4, `h2/05b_email_html.txt` |
| H2-14 | Nexo repete a pergunta depois da resposta (campanha sem tema): a fixture 01.02 olha só o `<pedido>` original; no modo simulado o "fim de ano" nunca destrava o plano | `llm/fixtures/01.02/nexo.plan.json` | `h2/02_projeto_e_memoria.txt` §A |
| H2-15 | Webhook do Mercado Pago aceita `ts` de 2020 (sem tolerância de tempo). Risco baixo: o estado vem da consulta ao recurso e o evento é idempotente | `billing/mercadopago.py:365-372` | `h2/04_cobranca.txt` |
| H2-16 | Dois schedulers ao mesmo tempo relatam os dois "renovou 1" (sem trava); o banco impede o grant duplo (2 grants: o do webhook e o da renovação) | `billing/renewal.py` | `h2/04_cobranca.txt` |
| H2-17 | Consentimento não tem como ser revogado: reimportar o contato com "não" é recusado (`no_consent`) e não há rota; antes de qualquer envio (Fase 3/4) | `contacts/routes.py` | `h2/09_consentimento_e_papeis.txt` |
| H2-18 | Nome com fórmula (`=HYPERLINK("…")`) é gravado cru; só importa quando houver exportação para planilha | `contacts/routes.py` | `h2/01_criterio_api.txt` §1 |
| H2-19 | "grátis"/"free"/"gratis" no Hero, em `/criar-conta` (título, h1, botão) e em `/entrar`: é o texto da R32 ("Criar conta grátis", 6 vezes no protótipo) e a pergunta P1 da N2a segue aberta. Reclassificado do 🔴 do auxiliar: o protótipo é o combinado. A A2c disse que só o Hero tinha a palavra | `messages/*/site.json:115`, `auth.json:25-32` | `h2/estatico/achados.md` E-01 |
| H2-20 | Telefones de teste fora da convenção `+55 11 99999-00NN` | `tests/test_s2b_deliveries.py:607-665` | E-03 |
| H2-21 | RD Station e HubSpot num comentário de `squad/` (reincidente da H1) | `squad/max/agent.yaml:35` | E-04 |
| H2-22 | Sem `error.tsx`/`global-error.tsx`/`loading.tsx`: erro de execução mostra a página padrão do Next em inglês | `apps/web/app/` | E-10 |
| H2-23 | `home.hello` = "Hello, {name}." nos três idiomas (é o texto da V4.6; só registro) | `messages/*/home.json:3` | E-11 |
| H2-24 | `/favicon.ico` 404 no site todo (best-practices 96) | `apps/web/app/` | E-13 |
| H2-25 | CSP do site com `script-src 'unsafe-inline'` sem nonce; sem HSTS (local é http) | `middleware.ts:18-22` | E-14 |
| H2-26 | JSON-LD das páginas internas aponta para `@id` que só existe no grafo da home; meta robots duplicada nos 404 | `lib/site-seo.ts:84,169` | E-15 |
| H2-27 | `make seed` não apaga convites e convite que sobra quebra o pgTAP (`02_workspace_isolation` #16, `04_invitations` #11); "Problemas comuns" manda rodar `make seed`. Nenhum caminho do produto cria convite hoje (sem rota; só SQL ou Data API), por isso nota | `supabase/seed.sql`, `SETUP_LOCAL.md:146,597` | `h2/clone/achados.md` C-04 |
| H2-28 | Higiene do clone: `make test` solta a trava entre pytest e pgTAP (outra sessão entra no meio); segundo checkout com a senha nova do guia falha no `make up` (o guia manda copiar a do primeiro); `make seed` aplica e só depois recusa a senha; portas do segundo checkout | `Makefile`, `SETUP_LOCAL.md:26,68` | `h2/clone/achados.md` C-01, C-02, C-03, C-05 |

## (c) O que tentei e NÃO quebrou

**1. Critério da fase pela API** (`h2/01_criterio_api.txt`, `h2/02_projeto_e_memoria.txt`, Vitta, um tenant que os
roteiros das fatias não usaram). Bia 02.01, Otto 04.02, Kiwi 05.01, Max 06.03 e Íris 07.02: cada uma `succeeded`
na 1ª tentativa, 1 versão, 1 reserva `captured` de 10, extrato `hold` + `capture` (−10). Calendário da 04.02: 3 posts
`planned` depois da aprovação. Projeto coordenado (pedido de Natal na Sala): Bia 02.04 `done` → Kaia 03.01
`waiting_engine` (`image_engine_pending`, fala honesta na conversa) → Otto 04.03 `done`; trabalho e projeto `done`;
dono "decide cada entrega"; participantes e marcos por etapa (Peças aberto); handoff `kind = step` para Kaia e Otto com
a versão da Bia; créditos **por etapa**: 01.02 liberado, 02.04 10, 03.01 liberado, 04.03 10; Carla (editora) 403 na
decisão da etapa; Juliana 404 no projeto. Correção da Marina: ver H2-03 (atendido na 04.01).

**2. Critério pela tela** (`h2/07_browser_criterio.txt`, Marina, worker do produto simulado): Kiwi ("Planejar uma
campanha paga"), Bia ("Analisar meu negócio"), Max ("Segmentar clientes") e Íris ("Analisar um indicador") pelo
catálogo: v1 ao vivo na conversa, abrir, **clique duplo** em aprovar, "Aprovada por você"; no banco, cada trabalho
`approved`, 1 versão aprovada, 1 reserva `captured` 10 e **1** evento `approval.decided`. Otto pela tela: e2e da A2b
(calendário) e aceite da H1 (04.01).

**3. Isolamento das 20 tabelas novas** (`h2/03_isolamento.txt`), com dados criados na Miolo na mesma trava: pela Data
API, Rafael, Carla, Pedro e anônimo veem **0 linhas** da Miolo em `calendar_posts`, `contacts`, `consents`,
`contact_imports`, `contact_consent_state`, `metrics_daily`, `agent_learnings`, `memory_reflections`,
`work_item_steps`, `subscriptions`, `payments`, `email_messages`, `email_preferences`, `project_milestones`,
`credit_holds`, `run_context_items` (anônimo 401; `billing_customers`, `payment_events`, `plan_prices`, `topup_packs`
403 para todos). Escrita direta pela Data API (INSERT/PATCH/DELETE em 12 combinações, inclusive a Marina no próprio
negócio): 403. API: 8 rotas novas com o id da Miolo → 404 para Rafael, Carla e Pedro, 401 sem token; Rafael importa
na Miolo → 404; Carla lê cobrança da Vitta → 403. IDOR no objeto da conversa: Rafael abre, na Vitta ou na Miolo,
conversa sobre um post do calendário ou um trabalho da Miolo pelo id real → 404 nos quatro casos; controle da Marina
201 (`h2/12_idor_objeto.txt`). Realtime: nenhuma tabela pública na publicação; regressão da H1
(canal privado) passou (`h2/09_realtime_regressao.txt`). No prompt: o run da Vitta não tem nenhum aprendizado nem a
palavra "Miolo" (`h2/08_falha_e_contexto.txt` B4).

**4. Consentimento** (`h2/01_criterio_api.txt` §1, `h2/09_*.txt`). Nove linhas adversárias: aceitas 3 (válida, uma
com o mesmo e-mail de um contato da Miolo, sem vazar existência entre tenants, e a da fórmula); recusadas 6 com o
motivo certo (`no_consent`, `duplicate_in_file` com caixa diferente, `email_not_fictitious` para `.example.com` e
`gmail.com`, `missing_consent_date`, `consent_without_address`). Duplicata de outra importação com caixa diferente:
`duplicate_existing`. Editora importa: 403. Nenhum `email_messages` para contato; o prompt do Max só recebe contagens
(sem nome nem e-mail de contato); a 06.03 conta só quem consentiu.

**5. Créditos.** Uma reserva e uma captura por delivery nova (API e tela); falha libera: recusa → `failed` 1 tentativa,
reserva `released`, 0 captura; indisponível → 3 tentativas, `released`, 0 captura (`h2/08_falha_e_contexto.txt` A);
pergunta não cobra (Nexo sem tema, 04.02 sem período: `released`); estimativa = cobrado em todos os runs com entrega;
projeto cobra por etapa (item 1). Dois workers e SIGTERM no item 12.

**6. Cobrança** (`h2/04_cobranca_test.py`, fakes da S2e fora da árvore de testes): 10 webhooks Asaas idênticos + 3
gêmeos (`PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED` com ids diferentes) **em paralelo** → 1 `applied`, 9 `duplicate`, 3
`no_change`, 1 lançamento, saldo +50 uma vez; 6 notificações idênticas + 5 distintas do mesmo ciclo do Mercado Pago
em paralelo → 1 grant; assinatura de outro recurso, segredo errado, sem `x-request-id`, sem assinatura, token Asaas
ausente ou errado, assinatura simulada errada → 401 e nada gravado; dois schedulers renovando ao mesmo tempo → o ciclo
uma vez. Respostas de cobrança ao owner sem dinheiro (`h2/09_*.txt`); sem rota de preço no app nem no site
(`find apps/web/app`; sitemap sem `/precos`); 0 chave real no repo e no histórico (`h2/estatico/achados.md`,
parte 1 item 2); o provedor simulado é recusado fora de `local`/`test` (`billing/factory.py:37-40`).

**7. E-mail** (`h2/05_email.txt`, `05b`): Carla (es) recebe "Entrega lista" em espanhol e Rafael (sem idioma, Vitta en)
"Needs you" em inglês; nada da Vitta para a Marina; editora não muda o idioma do negócio (403); preferência desligada
→ nenhum e-mail gerado; convite não é opcional (422); `gmail.com` e `contatos.example.com` → `refused`
(`recipient_domain_not_allowed`), 0 no Mailpit; nome do negócio com `<img onerror>` → escapado no HTML; CRLF no nome →
sem Bcc injetado (H2-13); SMTP fechado → `queued` com `smtp_unavailable` e enviado na 2ª tentativa, sem duplicar.

**8. i18n.** Catálogos do web íntegros: 1779 chaves em cada idioma, nenhuma faltando (auxiliar); ordem pessoa →
pt-BR na web certa (Carla es); falhas em H2-04 a H2-06. Backend: pt-BR 290 chaves, en 81, es 81 (faltam 209:
memory 28, agent 28, history 28, environment 23, status 22, work 19, work_item_step 17, triage 17, run_error 11,
date 10…); as 53 `email.*` completas nos três.

**9. Web e site** (auxiliar, build de produção num worktree na 3198): 37 URLs do sitemap 200; 96 pares de `hreflang`
recíprocos; 36 blocos JSON-LD válidos, sem `Offer`; `noindex` em `/app/**` e `/admin/**`; `robots.txt` e `llms.txt`
coerentes com a N2a e sem fornecedor; cookie `HttpOnly`, `SameSite=Lax`, 7 dias (sem `Secure` porque local é http);
Lighthouse mobile em rotas que a A2c não mediu: `/como-funciona` 99/100/100 (best-practices 96, favicon) e
`/es/squad/kiwi` 99/100/100/100.

**10. Segredos e dados** (auxiliar): nenhum segredo real no repo, em `docs/parciais/**` nem no histórico (as chaves do
`.env` são as padrão do CLI); dados só fictícios; nenhum fornecedor no texto visível do site; produto sem emoji.

**11. Clone limpo** (auxiliar, `h2/clone/achados.md`): clone do remoto (`bc58140`), só o `SETUP_LOCAL`: `make install`,
`make up`, `make migrate`, `make seed` 0 (com a senha do primeiro checkout, como manda a linha 68), ruff ok, **pytest
220 passed**, ESLint/tsc ok, Vitest 9 + 49 + 327, **pgTAP 700/700** com o banco no seed, autosave 8/8; `make worker`
levou um pedido até "v1 aguarda sua aprovação" e saiu com 0 no SIGTERM. A API do dono respondeu 200 em 7 conferências,
inclusive logo depois do `make migrate` do clone com senha diferente (o H1-09 não reproduz).

**12. Worker e scheduler** (`h2/06_worker.txt`, `06b`, `08`): SIGTERM com um run em execução (LLM a 3 s por chamada):
o worker para de ler, termina o run e sai em 7 s; o run fica `succeeded` 1 tentativa, 1 captura, 1 versão, e um
`--drain` depois não repete nada. Reflexão com erro passageiro injetado: 3 tentativas e `failed`, sem travar a fila.
E-mail com SMTP fechado: retry e envio único. Dois workers no ar: 8 runs, 1 tentativa e 1 versão cada, nenhuma
captura dupla (um dos dois pegou todos; a corrida entre workers ficou provada na H1). Memória no prompt: promovido
entra, candidato não, descartado sai, sem reafirmação há mais de 90 dias entra com `revisar="sim"`
(`h2/08b_validade.txt`; para envelhecer o registro de teste usei `session_replication_role = replica` só na sessão,
porque o gatilho recusa editar datas até para o `postgres`).

**O que não ataquei a fundo:** a corrida real entre dois workers (um só consumiu tudo), o envio para a Kaia quando o
motor chegar (não existe) e o Lighthouse das telas logadas.

## (d) Veredito por fatia e da Fase 2

| Fatia | Veredito | Base |
|---|---|---|
| S2a Bia e Otto | ✅ com 🟡 H2-02 | entregas pela API e pela tela; calendário `planned` só depois da aprovação |
| S2b Kiwi, Max, Íris, CSV | ✅ (ℹ️ H2-17, H2-18) | 6 de 9 linhas adversárias recusadas com o motivo certo; nada para contato |
| S2c memória camada 3 | ✅ com 🟡 H2-02, H2-03 | promovido/candidato/descartado/validade no prompt; isolamento; owner-only |
| S2d projeto coordenado | ✅ na API (ℹ️ H2-14) | fecha com responsável por etapa e cobra por etapa; a tela é o H2-01 |
| S2e cobrança | ✅ (ℹ️ H2-15, H2-16) | webhooks paralelos e forjados, dois schedulers |
| S2f e-mail | ✅ (ℹ️ H2-13) | idioma, preferência, recusa, retry, HTML escapado |
| A2a onboarding e idiomas | ✅ com 🟡 H2-04, H2-06 | idioma da pessoa certo; o do negócio não entra |
| A2b telas das deliveries | ✅ com 🟡 H2-09 a H2-12 | quatro personas aprovadas pela tela |
| A2c site público | ✅ com 🟡 H2-08 | 37 URLs, hreflang, JSON-LD, Lighthouse |
| N2a conteúdo | ✅ (ℹ️ H2-19) | nenhum fornecedor no texto visível |
| **Fase 2** | 🔴 **não fecha pela tela** | critério atendido pela API; o projeto coordenado (e, com ele, a entrega própria do Nexo) não existe no web |

Como QA sou consultivo: recomendo ao Thor abrir a fatia de web do projeto coordenado (**H2-01**) antes de dar a fase
por pronta, tratar **H2-02** e **H2-07** já (pequenos e mecânicos), **H2-04** e **H2-05** juntos (idioma), e **H2-03**
como decisão técnica. Quem aceita ou devolve é o Thor.

## (e) Perguntas ao dono

Nenhuma pergunta nova: o que encontrei o protótipo, as diretrizes ou as ADRs respondem. Continua aberta a **P1 da
N2a** ("Criar conta grátis" × "Começar com o squad"), que o H2-19 toca. A revogação de consentimento (H2-17) vira
pergunta só quando o envio entrar (Fase 3/4).

## (f) Estado em que deixei a máquina

(preenchido ao fechar)
