# A2a — Relatório (Aranha)

**Fatia:** A2a, onboarding progressivo + idiomas (Fase 2). **Data:** 16/10/2026, 14:46 → 15:26 (40 min; alvo 70).
**Escopo:** `apps/web`, `packages/ui` e docs da fatia. Nada em `apps/backend`, `supabase/`, `squad/` (S2a e depois S2b do Stark
em paralelo) e nenhuma mudança de contrato de API: o que faltou na API está na §5, para a S2b.
**Como foi feito:** PASSO 0 lido e registrado em `A2a-progresso.md`; dois sub-agentes meus traduziram os catálogos `en` e
`es` em paralelo (só `messages/en` e `messages/es`), com glossário fechado por mim; eu fiz o resto e revisei as duas traduções.
**Regra que guiou:** segue o protótipo sempre. Onde a V4.6 não desenha (seletor de idioma, cartão de Resultados sem números),
a diferença está na §4 com a pergunta; nada combinado foi trocado.

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Resolvedor de idioma** (ADR-0010) | `i18n/resolve.ts`: ordem **pessoa → negócio → pt-BR**; idioma da pessoa em `user_metadata.locale` da Auth, lido das claims do token no middleware (`getClaims`, que o middleware já fazia); o middleware grava `X-NEXT-INTL-LOCALE` (apaga o que vier do browser) e o `next-intl` lê pelo `requestLocale`. O negócio entra na ordem assim que a API devolver `locale` (§5). | `4feee63` |
| 2 | **Seletor de idioma** | Menu da conta, grupo "Idioma" com Português (Brasil), English e Español (nome no próprio idioma, `lang` em cada botão, `aria-pressed`). Server Action `setUserLocaleAction`: `updateUser({ data: { locale } })` + `refreshSession()` (o token novo já leva a escolha) e `router.refresh()`: a casca inteira troca sem recarregar. **Idioma do negócio**: linha no grupo "Negócio", com o aviso padrão "Ainda não disponível nesta versão." porque não há `PUT /workspaces/{id}` nem `locale` no `GET /me` (conferido em `packages/contracts`). | `bf7b186`, `9f4f795` |
| 3 | **Rotas públicas por idioma + `hreflang`** | `/` (pt-BR, segue estática `○`), `/en` e `/es` (a mesma página, `components/site/Landing.tsx`, com o catálogo do idioma e `lang` certo no `<html>`); canônico próprio e `alternates` pt-BR/en/es/x-default em cada uma; sitemap com as alternativas. As áreas do squad na landing passaram a vir do catálogo (antes vinham em pt-BR do `packages/ui`). | `4feee63` |
| 4 | **Catálogos en e es completos** | 16 áreas + `index.ts` tipado contra o pt-BR (`const messages: Messages`: chave faltando não compila). Glossário fechado: Negócio/Business/Negocio, Squad, Sala do Squad/Squad Room/Sala del Squad, Precisa de você/Needs you/Necesita de ti, créditos/credits/créditos, áreas do squad, Aprovar/Pedir ajuste. Espanhol neutro com "tú"; inglês americano. Revisão minha: termos e frases conferidos por amostra nas áreas da casca (shell, home, common, conversation, memory). | en: `4d216c8` … `2cc8284` (9); es: `076b105` … `ee61334` (5); registro `304c59f` |
| 5 | **Teste de paridade dos catálogos** | `test/catalog-parity.test.ts` (6 testes × en e es): mesmas chaves e estrutura (nenhuma faltando ou sobrando), mesmos argumentos ICU e tags (só o `article` do pt-BR pode sumir), toda mensagem formata no próprio idioma sem erro de ICU, ids técnicos iguais, **nenhuma marca que só o português tem** (ã, õ, ç, "você", "não"…), sem apóstrofo reto, exemplos em `.example`. Leitor de ICU próprio em `i18n/icu.ts`. | `4feee63`, `304c59f` |
| 6 | **Onboarding progressivo** (primeiro acesso da V4.6) | Cartão "Para o squad conhecer <negócio>" (V4.6 L4642, `_vOnb` L8480) com **progresso real**: site e Instagram contam só com a fonte conectada (`GET /memory`, `sources`); o objetivo conta quando está na Memória. "Conversar" abre o Nexo em **tela cheia** (V4.6) com as três escolhas de objetivo da V4.6; a escolhida vira a mensagem da pessoa ao Nexo ("Vender mais encomendas.") e entra na Memória como confirmada (`POST /workspaces/{id}/memory/facts`, "Objetivos" · "Objetivo atual", como o `OBJ_FIND` L6194). O cartão some quando a Memória já sabe algo além do objetivo (Marina, Miolo do seed); no lugar, o cartão de Resultados com o vazio honesto da própria tela da Íris. | `fc241b6`, `e04a0fb` |
| 7 | **Fatos essenciais pelo caminho da Memória** | "Adicionar conhecimento" e "Ainda não sabe · contar agora" (que estavam com o aviso padrão desde a A1b) ligados à rota da S1f, com o formulário da V4.5 (L5200: "O que o squad precisa saber?", assunto, Cancelar/Guardar, "Entra como declarado por você, já confirmado…"); a chave do dossiê abre o formulário na área e no assunto dela; só o owner guarda. | `dc37439` |
| 8 | **Saída honesta a qualquer momento** | Nada bloqueia: o cartão é um resumo do Início (recolhe com "Recolher resumos"), a conversa fecha com Esc, e os passos sem rota dizem "Ainda não disponível nesta versão." em vez de simular leitura de site ou conexão. A criação do negócio mantém "Sair" e, para quem já tem negócio, "Voltar para …". | `fc241b6` |
| 9 | **Textos fixos que vazavam no en/es** | `CommandField` do DS com `sendLabel` e `hint` (o "enviar" e o "Enviar pedido" eram fixos); artigo do agente saiu do código para o catálogo de cada idioma ("Talk to o Otto", "O Otto delivered v2" no en, achados pelo tradutor): `common.agentRef`, `live.toastDelivered`, `content.work.talk`/`adjustNote`, Memória (`log.suggested`, `browse.*`), origem do trabalho; mês do calendário em en com maiúscula ("Oct"); conectivo da lista pelo catálogo (em espanhol "y" vira "e" antes de Íris). | `630b87f`, `9c5d0a2` |
| 10 | Testes, e2e, capturas | Vitest: resolvedor e datas por idioma (16), menu de idioma (5), onboarding (13), Memória "Adicionar conhecimento" (+4), paridade (12). E2e novo `e2e/onboarding.spec.ts` (4 fluxos, §2.2); o fluxo do Pedro saiu de `auth-shell.spec.ts` para ele (um caminho só, sem depender da ordem dos arquivos). `snap` do e2e espera as animações de entrada. Capturas e lado a lado em `docs/parciais/a2a/`. | `1a8e252`, `2d38c50`, `03f64f5`, `39f764f`, `a5e3024` |

## 2. Como foi verificado

### 2.1 `make test-web` (15:23, árvore final; exit 0)

```text
$ eslint                                   (sem problemas)
packages/contracts typecheck: Done
packages/ui typecheck: Done
apps/web typecheck: Done
packages/contracts test:  Test Files  1 passed (1)   Tests  9 passed (9)
packages/ui test:         Test Files  5 passed (5)   Tests  49 passed (49)
apps/web test:            Test Files  21 passed (21) Tests  181 passed (181)
EXIT=0
```

O web tinha 131 testes no fim da A1c; esta fatia somou 50.

### 2.2 `make e2e` (15:20, build de produção + Playwright com o worker simulado; exit 0)

```text
 ✓ Compiled successfully in 2.1s
 ✓ Generating static pages (11/11)
┌ ○ /                                              3.16 kB         109 kB
├ ƒ /_not-found                                      136 B         102 kB
├ ƒ /en                                            3.16 kB         109 kB
├ ƒ /entrar                                        1.35 kB         122 kB
├ ƒ /es                                            3.16 kB         109 kB
├ ○ /robots.txt                                      136 B         102 kB
└ ○ /sitemap.xml                                     136 B         102 kB
  ✓   1 … a1b.spec.ts › o Quadro de Projetos mostra o trabalho do seed na coluna Precisa de você
  ✓   2 … a1b.spec.ts › dossiê da Miolo: o que o squad sabe, de onde vem, principais conhecimentos e o que espera o seu ok
  ✓   3 … a1b.spec.ts › Marina confirma o que o Otto percebeu, o conhecimento aparece e a outra aba recebe ao vivo
  ✓   4 … auth-shell.spec.ts › sem sessão, /app manda para o login e volta para onde a pessoa ia
  ✓   5 … auth-shell.spec.ts › senha errada mostra o erro em português e mantém o e-mail
  ✓   6 … auth-shell.spec.ts › Marina entra e vê a barra lateral com o workspace Miolo
  ✓   7 … auth-shell.spec.ts › página inicial em pt-BR com SEO e crawlers de IA liberados
  ✓   8 … live.spec.ts › Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova
  ✓   9 … live.spec.ts › Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo
  ✓  10 … onboarding.spec.ts › Pedro entra sem negócio, cria o negócio e faz o onboarding inteiro em pt-BR até o primeiro pedido ao Nexo (4.3s)
  ✓  11 … onboarding.spec.ts › Marina (conta configurada) não vê o onboarding: o Início mostra Resultados no vazio honesto (400ms)
  ✓  12 … onboarding.spec.ts › Marina troca para en, vê a casca traduzida (também depois de recarregar) e volta para pt-BR (1.5s)
  ✓  13 … onboarding.spec.ts › site público em /en e /es com hreflang para as três versões (250ms)
seed aplicado: ../../supabase/seed.sql
  13 passed (23.1s)
EXIT=0
```

A primeira rodada (terminou 15:19) deu 12/13: o teste do canônico esperava `/` com barra final e o Next grava a raiz sem ela
(`http://127.0.0.1:3100`). Corrigi a asserção (compara o caminho), não o produto (`03f64f5`), e rodei tudo de novo.
Depois, só o `onboarding.spec.ts` rodou mais uma vez (4/4, 15:22, contra o `next dev`) para as capturas, com o `snap` esperando as animações.

**O que o fluxo 10 prova (Pedro, dados reais):** "Comece pelo seu negócio." → endereço em uso dá o erro no campo → cria
"Oficina do Pedro" → Início com "Para o squad conhecer Oficina do Pedro" e "0 de 3", sem cartão de Resultados → "Ler o site"
dá "Ainda não disponível nesta versão." e o progresso não anda → "Conversar" abre o Nexo com "Para começar: qual é o objetivo
mais importante de Oficina do Pedro agora?" → "Vender mais encomendas" vira a mensagem "Vender mais encomendas." e o aviso
"Anotado na Memória da Marca: “Vender mais encomendas”." → primeiro pedido ao Nexo na mesma conversa → recarregar: "1 de 3",
"Objetivo: Vender mais encomendas", sem o botão → Memória mostra o objetivo → "Público: ainda não sabe. Contar agora" abre o
formulário em "Meu público" → "Guardar" → "Guardado na Memória da Marca. Todo o squad passa a usar." e a chave Público passa a
ter o valor → o Início deixa o primeiro acesso e mostra Resultados → a conversa com o Nexo, relida da API, tem as duas mensagens.

**Fluxo 12 (Marina):** começa em pt-BR (se uma rodada anterior caiu no meio, ela é devolvida a pt-BR antes) → menu → "English,
idioma da tela" → `html lang="en"`, barra com "Home" e "Brand Memory", título "What are we working on today?" (lidos do
catálogo en no teste) → recarregar continua em inglês (a escolha está na conta) → "Português (Brasil), display language" →
`lang="pt-BR"`, "Com o que vamos trabalhar hoje?" e "Início". Captura: `a2a/a2a-08-marina-en.png`.

### 2.3 Rotas públicas e banco (15:23)

```text
$ curl -s http://127.0.0.1:3100/en | grep -o '<link rel="alternate"[^>]*>'
<link rel="alternate" hrefLang="pt-BR" href="http://127.0.0.1:3100"/>
<link rel="alternate" hrefLang="en" href="http://127.0.0.1:3100/en"/>
<link rel="alternate" hrefLang="es" href="http://127.0.0.1:3100/es"/>
<link rel="alternate" hrefLang="x-default" href="http://127.0.0.1:3100"/>
$ curl -s http://127.0.0.1:3100/es | grep -o '<html[^>]*>'
<html lang="es" class="…">
$ curl -s http://127.0.0.1:3100/sitemap.xml   (/, /en e /es, cada um com xhtml:link hreflang pt-BR, en e es)
$ psql: select email, raw_user_meta_data->>'locale' from auth.users …
marina@miolo.example|pt-BR        (o e2e devolve a Marina a pt-BR)
pedro@semconta.example|           (nunca escolheu)
```

### 2.4 Lado a lado com a V4.6 (`docs/parciais/a2a/`)

`proto-*` (protótipo na 8010, cenário "Primeiro acesso" pelo guia "Demo") × `nosso-*` e `a2a-*` (web na 3100, 1440×900):
`lado-a-lado-01-primeiro-acesso.png` (cartão, "0 de 3", os três passos com os mesmos textos e classes),
`lado-a-lado-02-conversa-objetivo.png` (as três escolhas), `lado-a-lado-03-objetivo-escolhido.png`; e
`a2a-05-pedro-um-de-tres.png` (passo feito com o check, anel em 33 %, "Objetivo: …"), `a2a-06-pedro-contar-agora.png`,
`a2a-07-pedro-configurado.png`, `nosso-06-menu-idioma.png`, `a2a-08-marina-en.png`. Console sem erros nas capturas.

## 3. Decisões técnicas (não mudam a experiência)

1. **Idioma pelo middleware, `/` estática.** O `next-intl` lê o idioma do cabeçalho `X-NEXT-INTL-LOCALE`, que só o middleware
   grava. A `/` ganhou `export const dynamic = "force-static"` (sem cabeçalho, pt-BR) e segue `○`. `/en` e `/es` são
   dinâmicas (o middleware põe o idioma), e o `/_not-found` passou a `ƒ` (o layout raiz lê o idioma da requisição).
2. **Idioma da pessoa no token:** depois do `updateUser`, `refreshSession()` emite um token com o `user_metadata` novo; sem
   isso o middleware leria o idioma antigo por até 1 h (o token só renova na hora).
3. **"Primeiro acesso" pelo que a Memória sabe:** o cartão aparece enquanto a Memória não sabe nada além do objetivo que o
   próprio cartão pergunta (Pedro, Juliana da Trilha) e some quando sabe (Marina). Não há flag de onboarding na API; o critério
   é o da própria V4.6 ("a memória só tem o cadastro", FLUXOS §9).
4. **"Contar agora" no assunto da chave:** o código da V4.5 abre o formulário só na área (e guardaria no primeiro assunto, o
   que deixaria a chave ainda "não sabe"); segui o FLUXOS §6 ("no assunto certo") e mando o assunto da chave à API.
5. **Artigo no catálogo, não no código:** `common.agentRef` ("o Otto" em pt-BR, "Otto" em en e es) e selects por mensagem;
   a paridade aceita que en e es não usem o argumento `article`.
6. **Fluxo do Pedro num arquivo só:** o teste de criação do Pedro saiu de `auth-shell.spec.ts` e virou o começo do onboarding;
   dois testes criando negócio para o mesmo Pedro dependeriam da ordem dos arquivos.

## 4. Divergências do protótipo (registradas, não corrigidas)

| # | Onde | V4.6 | O que ficou | Pergunta |
|---|---|---|---|---|
| 1 | Conversa do objetivo | Fala roteirizada do Nexo ("Oi, Marina. Eu sou o Nexo…") com as escolhas abaixo; depois, "Anotei na Memória da Marca…" do Nexo | A pergunta da V4.6 vira o rótulo das escolhas, no lugar das sugestões; depois de escolher, o aviso curto "Anotado na Memória da Marca: “…”." (texto novo). Não invento fala de agente, e o Nexo não responde mensagem solta nesta versão | Diogo: aprova a pergunta como rótulo e o texto do aviso? |
| 2 | Conversa do objetivo | Título "Boas-vindas" e a coluna "Especialista" | Título da conversa = a primeira mensagem (regra da A1f); sem a coluna (A1a §5 item 6) | — |
| 3 | Escolhas de objetivo | "Vender mais encomendas", "Trazer gente nova para a loja", "Fortalecer a marca" (pensadas para a Miolo) | Iguais, para todo negócio (a loja de bikes da Trilha também vê "encomendas") | Dono: escolhas por segmento quando o cadastro tiver segmento? |
| 4 | Início da conta configurada | Resultados com o indicador da semana e o gráfico da Íris | Mesmo cartão (`hm-res`) com o vazio honesto da tela de Resultados ("A Íris ainda não tem números para ler"), "Abrir Resultados" e "Conversar com a Íris". Substitui o que a A1f fazia (cartão do primeiro acesso para todos, pergunta 4 da A1f) | Dono + Diogo: é esse o Início sem números? |
| 5 | Seletor de idioma | Não existe (FLUXOS §11 item 6: onde a pessoa escolhe o idioma é pergunta aberta) | Grupo "Idioma" no menu da conta, com as linhas do grupo "Negócio" e um quadrado neutro com a sigla (CSS novo `.sb-bz-ic.is-lang`); "Idioma do negócio" no grupo "Negócio" | **Dono + Diogo:** lugar e desenho do seletor; textos "Idioma do negócio" · "O squad responde nele" |
| 6 | Passos "Mande o site" e "Conecte o Instagram" | Simulam leitura e conexão | Aviso padrão; o progresso só anda com fonte conectada de verdade (nesta versão, nunca) | — |
| 7 | Rótulo "Hello, {name}." | — | "Hello" mantido em en e es (é o jogo com a marca) | Dono: em espanhol fica "Hello" ou "Hola"? |
| 8 | Barra recolhida e mês | — | Nada mudou no pt-BR; em en o mês sai "Oct" (o pt-BR continua "out") | — |

## 5. O que a API precisa (para a S2b)

1. **`locale` do negócio no contrato:** `GET /me` (`memberships[].workspace.locale`) e `GET /workspaces/{id}` devolvendo
   `workspaces.locale`, e **`PUT` (ou `PATCH`) `/workspaces/{id}` aceitando `locale`** (só owner/admin). Com isso: o resolvedor
   já recebe o idioma do negócio (é passar o valor), e o "Idioma do negócio" do menu passa de aviso a seletor.
2. **`locale` da pessoa no banco** (ADR-0010 fala em `users`): hoje fica no `user_metadata` da Auth, sem passar pela API.
   Se a API passar a guardar, o web troca a Server Action por uma rota; o runtime pode querer o idioma de quem pediu.
3. **Primeira fala do Nexo no negócio novo** ("Boas-vindas", com a pergunta do objetivo): criar a conversa e a mensagem no
   `create_workspace` (ou no primeiro acesso), no idioma do negócio, em vez do rótulo da §4 item 1.
4. **Assunto e chave do objetivo no idioma do negócio:** o web manda "Objetivos" · "Objetivo atual" (como o dossiê em pt-BR).
   Num negócio em en ou es, quem deveria nomear é a API (ex.: `POST /memory/facts` com `kind: "objective"`).
5. **Erros da API por código estável** (ADR-0010): as mensagens de erro (ex.: "Só o dono da conta toma esta decisão.") chegam
   em português e o web mostra como vêm; em en e es elas aparecem em português até a API mandar o código e o web traduzir.
6. **Seed:** o `seed.sql` mescla o `raw_user_meta_data` e não limpa `locale`; uma rodada que caia no meio deixaria a Marina em
   inglês para os outros testes (o e2e se protege, mas o seed poderia zerar `locale` dos usuários fictícios).

## 6. Perguntas ao dono e ao Diogo

1. **Dono + Diogo:** onde fica o seletor de idioma (hoje no menu da conta) e o do negócio (hoje no grupo "Negócio")? (§4 item 5)
2. **Dono + Diogo:** o Início de quem já configurou, sem números da Íris, é o cartão de Resultados vazio? (§4 item 4)
3. **Diogo:** a pergunta do objetivo como rótulo das escolhas e o aviso "Anotado na Memória da Marca: “…”."? (§4 item 1)
4. **Dono:** as três escolhas de objetivo valem para todo segmento? (§4 item 3)
5. **Dono:** "Hello, Marina." também em espanhol, ou "Hola"? (§4 item 7)
6. **Dono:** visitante de `/en` que clica em "Criar conta" cai no cadastro em pt-BR (o cadastro não tem rota por idioma).
   Levo o idioma da rota pública para o cadastro (cookie) ou fica para a A2c, com o site completo?

## 7. O que ficou de fora

- Idioma do negócio persistido e na ordem de resolução (§5 item 1): o resolvedor e o teste já têm o caso; falta o dado.
- Telas de entrar e criar conta por idioma (pergunta 6); hoje seguem pt-BR para quem não está logado.
- Rótulos padrão do `Button` do DS ("Carregando", "Pronto") continuam em pt-BR quando a tela não passa os dela; ficam
  escondidos (só aparecem no estado de carregando/pronto do botão primário). Os botões do produto que carregam já passam o seu.
- Revisão nativa de cada frase das 1.300 linhas: revisei os termos do glossário e as áreas da casca por amostra; a paridade
  garante estrutura, argumentos e que nada ficou em português. As escolhas dos tradutores que pedem olho estão abaixo.

**Escolhas de tradução para revisar (dos sub-agentes, conferidas por mim):** en: "ambiente" → "Area", "Responsável" →
"Owner", "Principais conhecimentos" → "Key facts", origem "Onboarding" → "Sign-up", "Nenhum real é investido" → "Not a cent
is spent". es: "legenda" → "pie de foto" (termo do Instagram em espanhol), "ambiente" → "espacio", Roadmap → "Hoja de ruta",
"Google Perfil" → "Perfil de Negocio de Google", Entrar/Sair → "Iniciar sesión"/"Cerrar sesión". O título do seletor de conversas
("Conversas Nova conversa com…", pergunta 14 da A1f) foi traduzido literalmente, como está no protótipo.

## 8. Onde discordei do briefing

- **"Marina não vê onboarding"** troca o cartão da esquerda que a A1f mostrava para todos (pergunta 4 da A1f, ainda sem
  resposta). Segui o briefing; o que entrou no lugar é o cartão de Resultados vazio (§4 item 4), para o dono confirmar.
- **"Seletor na configuração do negócio":** não há tela de configuração do negócio (a V4.6 só tem o aviso "demonstrativo") nem
  rota que guarde; ficou a linha no grupo "Negócio" do menu, com o aviso padrão, em vez de um seletor que não salva.

## 9. Estado em que deixei a máquina

- **`next dev` da 3100:** derrubei antes do primeiro `make e2e` (grupo de processos do `make dev-web` das 14:34, sem `pkill -f`);
  subi de novo depois do segundo (15:21) com `setsid -f make dev-web` (log em `/tmp/hellosquad-dev-web.log`), `GET /entrar` → 200.
- **API da 8100:** intocada. Worker do e2e encerrado pelo teardown.
- **Banco:** seed reaplicado pelos teardowns (15:19, 15:20 e 15:22), dentro da trava; Marina com `locale = pt-BR` no `user_metadata`.
- **Arquivos fora de commit:** nenhum meu. Logs em `/tmp/a2a/` (sem chave). Sub-agentes de tradução encerrados.
