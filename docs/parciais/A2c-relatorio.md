# A2c — Relatório (Aranha)

**Fatia:** A2c, site público completo com SEO/GEO (Fase 2). **Data:** 16/10/2026, 17:38 → 18:15 (37 min; alvo 70).
**Escopo:** `apps/web`, `packages/ui` (só consumido, sem mudança) e docs da fatia. Nada em `apps/backend` nem `supabase/`
(S2e do Stark em paralelo). Fora o pedido técnico da N2a (duas linhas do conteúdo es, §3 item 11), não toquei em
`docs/conteudo/`.
**Regra que guiou:** o conteúdo é o da N2a palavra por palavra; a landing segue a R32 (os 8 títulos batem em texto e
ordem, §2.6); onde a R32 não desenha (as páginas novas), o desenho é proposta minha com o DS, registrada na §4.

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Rotas públicas, 12 × 3 idiomas** | URL por idioma = **prefixo** (o que a A2a e o README da N2a §2 já usam): pt-BR na raiz, `/en/...` e `/es/...` com slug traduzido (`/en/how-it-works`, `/es/preguntas-frecuentes`, `/en/about`…); o slug do agente é igual nos três. pt-BR estático (`○` e `●` com `generateStaticParams`, slug de agente desconhecido = 404); en e es pelo middleware (`ƒ`), como a A2a fez em `/en` e `/es`. Tabela de rotas em `lib/site-routes.ts`. | `febc554`, `c990c74` |
| 1 | **Conteúdo da N2a em componentes** | `scripts/site-content.mjs` converte `docs/conteudo/site/<idioma>/*.md` em `content/site/<idioma>.json` (H1, frase, seções, listas, tabelas, perguntas, botão); `--check` e um Vitest acusam JSON fora de sincronia com o Markdown. `SitePage` (cabeçalho com navegação, migalhas, abertura com o agente do DS, seções, botão, rodapé com troca de idioma), `Blocks`/`Inline` (tabela em `<table>` com legenda, pergunta em `h3`, marcação de linha sem HTML cru). O texto fica fora do catálogo de mensagens (que vai inteiro para o browser em toda tela) e é lido só no servidor. | `f0c3d09`, `c990c74` |
| 1 | **Landing** | Hero da R32 **sem mudança** (H1, definição, "Criar conta grátis", fileira do squad); abaixo dele, as seções da R32 na ordem da R32: do pedido à entrega (4 passos + "Entenda como funciona"), sete especialistas (cartões do catálogo com o nome linkando a página do agente), modo autônomo, memória, resultados, comparativo em `<table>`, 6 perguntas (as da R32 sem a de créditos) com "Ver todas as perguntas", encerramento com "Começar com o squad". Cabeçalho como a R32 no topo (só "Entrar"). | `c990c74`, `4366349`, `45d8071` |
| 2 | **Metadata API por rota** | `siteMetadata(locale, page)`: title e description da N2a (`title.absolute`), canônico da própria versão, `alternates.languages` pt-BR/en/es + `x-default` (pt-BR, P5 da N2a), Open Graph (tipo, `og:locale` e alternativos, url, imagem 1200×630) e Twitter `summary_large_image`. **Metadados sempre no `<head>`** (`htmlLimitedBots: /.*/`, §3 item 3). | `c990c74`, `8bc9642` |
| 2 | **Imagem por rota** | `/og/<idioma>/<página>`: 36 PNG gerados **no build** (`●`), placeholder da marca (wordmark, título da página, cores do squad ou do agente). Logo da Organization em `/logo-hellosquad.png` (512×512, gerado). | `fc38f0f` (§7) |
| 3 | **JSON-LD por rota (README N2a §5)** | Um `@graph` por página: `/` Organization + WebSite + SoftwareApplication **sem Offer**; páginas internas BreadcrumbList; `/squad` ItemList dos 7; agente Service ligado à Organization; `/faq` FAQPage com o texto puro idêntico ao visível; `/como-funciona` WebPage (`about` = app); `/sobre` AboutPage (`about` = organização). Vocabulário nos 3 catálogos (`site.ld`). | `c990c74` |
| 4 | **Rastreio** | `sitemap.xml`: 36 URLs + `/criar-conta`, cada uma com as 4 alternativas. `robots.txt` da N2a: `/app`, `/admin` e `/sair` bloqueados para todos, **Disallow antes de Allow**, os 4 robôs do briefing + 6 de busca e leitura sob demanda nomeados. `llms.txt` da N2a no lugar do `public/llms.txt`, com links absolutos. `X-Robots-Tag: noindex, nofollow` em `/admin/*` (o `/app/*` já tinha). | `fc38f0f` (§7) |
| 5 | **Performance** | Lighthouse mobile ≥ 98 / 100 / 100 (§2.4). Sem fonte externa (as do DS via `next/font/local`, como já era); sem imagem raster nas páginas (agentes são SVG do DS); a única imagem nova é a de compartilhamento, PNG estático gerado no build. 3,2 kB de JS próprio por página (109 kB com o compartilhado). | `9d2217b`, `f961fef` |
| 6 | **Testes** | Vitest: `site-seo.test.ts` (89: sincronia do conteúdo, rotas × N2a, sem preço/fornecedor/marcador, metadados das 36 páginas, JSON-LD por tipo e campos obrigatórios, sitemap, robots, llms, marcação), `SitePage.test.tsx` (8: tabela, perguntas, HTML cru, Otto pt-BR, FAQ es, squad en, landing pt-BR e en), `locale.test.ts` (+1). E2e `site.spec.ts` (5). E2e da A0 ajustado ao grafo e ao `llms.txt` da N2a. | `c462f6f`, `598b1fd`, `073b0dd`, `b20031b` |
| — | **Pedidos técnicos da N2a §6** | `/admin` no robots (item 4); `llms.txt` trocado (item 4); es com "tú": "¿Qué necesitas de mí esta semana?" no catálogo (`team.json`, `conversation.json`) e no conteúdo es (`squad.md`, `squad-nexo.md`). | `b209814` |

## 2. Como foi verificado

### 2.1 `make test-web` (18:12, árvore final `45d8071`; exit 0)

```text
packages/contracts test:  Test Files  1 passed (1)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:  Test Files  5 passed (5)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  28 passed (28)
apps/web test:       Tests  327 passed (327)
```

### 2.2 `pnpm --filter web build` (worktree `/tmp/hs-a2c` em `45d8071`; exit 0)

Rodado num worktree separado, como a S2c (o `.next` do `next dev` do dono na 3100 ficou intacto):

```text
┌ ○ /                                              3.18 kB         109 kB
├ ○ /como-funciona                                 3.22 kB         109 kB
├ ƒ /en                                            3.18 kB         109 kB
├ ƒ /en/about                                      3.22 kB         109 kB
├ ƒ /en/faq                                        3.22 kB         109 kB
├ ƒ /en/how-it-works                               3.22 kB         109 kB
├ ƒ /en/squad                                      3.22 kB         109 kB
├ ƒ /en/squad/[agent]                              3.22 kB         109 kB
├ ƒ /es                                            3.18 kB         109 kB
├ ƒ /es/como-funciona                              3.22 kB         109 kB
├ ƒ /es/preguntas-frecuentes                       3.22 kB         109 kB
├ ƒ /es/sobre                                      3.22 kB         109 kB
├ ƒ /es/squad                                      3.22 kB         109 kB
├ ƒ /es/squad/[agent]                              3.22 kB         109 kB
├ ○ /faq                                           3.22 kB         109 kB
├ ○ /llms.txt                                        145 B         102 kB
├ ○ /logo-hellosquad.png                           3.13 kB         105 kB
├ ● /og/[locale]/[page]                            3.13 kB         105 kB
├ ○ /robots.txt                                      145 B         102 kB
├ ○ /sitemap.xml                                     145 B         102 kB
├ ○ /sobre                                         3.22 kB         109 kB
├ ○ /squad                                         3.22 kB         109 kB
└ ● /squad/[agent]                                 3.22 kB         109 kB
+ First Load JS shared by all                       102 kB
```

### 2.3 `make e2e` equivalente (worktree, web :3199, API do dono :8100, trava do banco `flock -o`; 18:11; exit 0)

`flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3199 pnpm --filter web e2e` → **24 passed (48.0s)**
(a suíte inteira: A0, A1b, A2a, A2b, live e a nova). As do site:

```text
✓   7 [chromium] › e2e/auth-shell.spec.ts:82:7 › site público › página inicial em pt-BR com SEO e crawlers de IA liberados (249ms)
✓  14 [chromium] › e2e/site.spec.ts:15:7 › site público (A2c) › as doze páginas respondem 200 nos três idiomas, com lang, título, canônico, hreflang e JSON-LD no head
✓  15 [chromium] › e2e/site.spec.ts:38:7 › site público (A2c) › slug desconhecido dá 404 no idioma da rota (29ms)
✓  16 [chromium] › e2e/site.spec.ts:43:7 › site público (A2c) › /app e /admin ficam fora dos buscadores; robots.txt, sitemap e llms.txt da N2a (32ms)
✓  17 [chromium] › e2e/site.spec.ts:61:7 › site público (A2c) › no celular: página do agente com migalhas, conteúdo, botão sem preço e troca de idioma (286ms)
✓  18 [chromium] › e2e/site.spec.ts:75:7 › site público (A2c) › no computador: landing com o Hero da R32 e as seções; FAQ e squad (405ms)
```

O teste 14 pede as 36 páginas **como o GPTBot** (sem JavaScript) e confere no `<head>`: `lang` certo no `<html>`, `<title>`
com HelloSquad, description, canônico, `hreflang` pt-BR/en/es/x-default, `og:image`, um bloco JSON-LD e nenhum `Offer`.
Rodadas anteriores: a primeira (18:01) teve 2 vermelhos: o e2e da A0 esperando o grafo e o `llms.txt` antigos (§3 item 13)
e um defeito real, o `<html lang>` que não mudava na troca de idioma (§3 item 8). Os dois corrigidos; as rodadas de 18:03,
18:06 e 18:11 passaram inteiras.

### 2.4 Lighthouse mobile (`docs/parciais/a2c/lighthouse-mobile.txt`)

Lighthouse 13.5.0, perfil mobile padrão, Chromium 156 headless, contra o `next start` do build acima (commit `45d8071`):

```text
rota                         perf a11y  seo   FCP     LCP     TBT     CLS
/                              98  100  100   1.1 s   2.4 s   50 ms   0
/squad/otto                    99  100  100   1.1 s   2.0 s   40 ms   0
/faq                           99  100  100   1.1 s   2.0 s   50 ms   0
/en                            99  100  100   1.2 s   2.1 s   50 ms   0
/en/squad/otto                 99  100  100   1.1 s   2.0 s   40 ms   0
/es/preguntas-frecuentes       99  100  100   1.1 s   2.0 s   50 ms   0
```

Na primeira medição (17:56) as três rotas en/es deram **SEO 91** ("Document does not have a meta description"): o defeito
era real (§3 item 3), não do Lighthouse. No WSL o `chrome-launcher` tenta a pasta temporária do Windows; rodei o Chromium do
Playwright com `--remote-debugging-port` e o Lighthouse com `--port` (instalado em `/tmp/lh`, fora do repositório).

### 2.5 O que um robô sem JavaScript lê (curl com `User-Agent: GPTBot/1.2`, build final na 3199)

```text
/es/squad/iris | lang es | title Íris, resultados de marketing con IA | HelloSquad | hreflang no head 4 | canonical /es/squad/iris | blocos ld+json 1
/en/how-it-works | lang en | title How HelloSquad works: AI marketing agents you control | hreflang no head 4 | canonical /en/how-it-works | blocos ld+json 1
/sobre | lang pt-BR | title Sobre a HelloSquad: equipe de marketing com IA | hreflang no head 4 | canonical /sobre | blocos ld+json 1
/squad/otto | lang pt-BR | title Otto, conteúdo e redes sociais com IA | HelloSquad | hreflang no head 4 | canonical /squad/otto | blocos ld+json 1
== noindex
HTTP/1.1 307 Temporary Redirect X-Robots-Tag: noindex, nofollow <- /app
HTTP/1.1 404 Not Found X-Robots-Tag: noindex, nofollow <- /admin
== sitemap
37   (36 páginas + /criar-conta)
```

`robots.txt` servido (início): `User-Agent: *` · `Disallow: /app` · `Disallow: /app/` · `Disallow: /admin` ·
`Disallow: /admin/` · `Disallow: /sair` · `Allow: /`, e o mesmo bloco para os 10 robôs de IA nomeados; `Sitemap:` no fim.

### 2.6 Metadados, JSON-LD e paridade com a R32

- **Tamanhos** (do conteúdo da N2a, por idioma, 12 páginas cada): maior title 54 / 57 / 59 caracteres e maior description
  151 / 154 / 155 (pt-BR / en / es). O Vitest confere ≤ 60 e ≤ 155 nas 36 páginas.
- **JSON-LD** (Vitest, cada página serializada e lida de volta): `@context`; Organization com `@id`, nome, url, logo e
  descrição; WebSite com os 3 idiomas; SoftwareApplication com categoria, sistema e 6 recursos; **nenhum `offers`, `Offer`
  ou `price` em nenhuma das 36**; BreadcrumbList com posições 1..n terminando na própria URL (2 níveis; 3 no agente);
  Service por agente com `@id`, `provider` = organização, url e idiomas; FAQPage com o mesmo número de perguntas da página
  (≥ 19), nome igual ao `h3` e resposta em texto puro (sem `**` nem link); ItemList com 7; WebPage e AboutPage com `about`.
- **Landing × R32** (Playwright, 1440×900, protótipo da 8010 × nosso): os títulos `h1`/`h2` são os mesmos 8, na mesma
  ordem e com o mesmo texto ("Você cuida do seu negócio…", "Do pedido à entrega…", "Sete especialistas disponíveis…",
  "Seu marketing, em modo autônomo.", "Um Squad que conhece sua marca…", "Seus resultados revelam oportunidades…", "Mais do
  que ferramentas…", "Dúvidas antes de começar?…"). Capturas: `proto-r32-hero.png` × `nosso-landing-hero.png`.

### 2.7 Capturas (`docs/parciais/a2c/`)

`a2c-01-otto-celular.png` e `a2c-02-otto-en-celular.png` (390×844, antes e depois da troca de idioma), `a2c-03-landing.png`,
`a2c-04-faq.png`, `a2c-05-squad-es.png`, `a2c-06-landing-inteira.png` (página inteira), `a2c-07-kiwi-es-celular-inteira.png`,
`og-pt-BR-squad-otto.png` e `og-es-inicio.png` (imagens de compartilhamento), `proto-r32-hero.png`, `nosso-landing-hero.png`.

## 3. Decisões técnicas (não mudam o combinado)

1. **Prefixo por idioma e en/es dinâmicas.** O layout raiz lê o idioma do cabeçalho que o middleware grava (A2a); por
   isso en e es são `ƒ` e pt-BR é estático. Deixar en/es estáticas pede reestruturar o layout raiz em grupos de rota com
   layouts raiz próprios: risco grande para a área logada, ganho pequeno (as rotas en/es medem 99 de performance).
2. **Conteúdo gerado, não copiado à mão.** O Markdown da N2a é a fonte; o JSON é derivado e o teste falha se divergir. Fica
   de fora do JSON: comentários HTML (notas para o time), parágrafos com `{{…}}` (só o dono preenche) e a seção que fica vazia
   sem eles ("Quem faz a HelloSquad", P6), e o corpo de `inicio.md` (anotações sobre a R32, não texto corrido).
3. **Metadados sempre no `<head>`** (`htmlLimitedBots: /.*/` no `next.config.ts`). O Next 15 manda o `<title>`, a
   description e o `hreflang` das rotas **dinâmicas** para o fim do `<body>` (streaming) para qualquer agente fora da lista
   interna dele, e os robôs de IA (GPTBot, ClaudeBot, PerplexityBot) estão fora. Achado pelo Lighthouse (SEO 91 em en/es) e
   confirmado com curl como GPTBot. Vale para o app inteiro: as telas logadas voltam a montar os metadados antes de
   responder, como era antes do Next 15.2 (sem efeito visível).
4. **`robots.txt` por rota (`app/robots.txt/route.ts`), não pela Metadata API**, que escreve Allow antes de Disallow; a
   N2a pediu Disallow antes (leitores que usam a primeira regra). `User-Agent` com A maiúsculo (como o Next escrevia e o e2e
   da A0 confere; a RFC 9309 não diferencia).
5. **JSON-LD:** os `@id` passaram a ser os do README (`#organization`, `#website`, `#app`; a A0 usava `#organizacao`,
   `#aplicativo`); `sameAs` vazio omitido; `Service.description` = description da página no idioma (o README trazia só o
   pt-BR); `serviceType`, público e recursos traduzidos por mim no catálogo `site.ld` (revisão nativa recomendada).
6. **Description da inicial:** a página `/` usa a da N2a (≤ 155). A do catálogo (`site.meta.description`, 180 caracteres
   em pt-BR) continua como padrão das telas do app. Ver pergunta 3.
7. **Imagem de compartilhamento:** gerada com a fonte padrão do gerador do Next: o Gabarito do DS está em `woff2`, formato
   que o gerador não lê. Peça definitiva é do Visão.
8. **Troca de idioma com `<a>` (navegação completa).** Com `Link`, o `<html lang>` ficava `pt-BR` na página en (o layout
   raiz não renderiza de novo na navegação do cliente). Achado pelo e2e.
9. **Botões e menu:** o rodapé de todas as páginas leva a navegação do site, "Começar com o squad", "Entrar" e a troca de
   idioma; o cabeçalho das páginas novas leva a navegação (no celular, segunda linha rolável).
10. **Tabelas:** `<table>` com `<caption>` escondida (o título da seção) e foco de teclado no invólucro rolável; tirei o
    `role="region"` do invólucro porque a `<section>` com título já é a região (o teste acusou duas regiões com o mesmo nome).
11. **es com "tú"** no pedido ao Nexo, no catálogo e nas duas linhas do conteúdo es que copiavam a string (pedido da N2a §6).
12. **Rótulos ocultos do `Button` do DS** ("Carregando", "Pronto") passam pelo catálogo nas páginas do site; antes saíam em
    português no HTML en/es (é texto que robô lê, mesmo escondido).
13. **E2e da A0** (`auth-shell.spec.ts`) ajustado ao que esta fatia mudou de propósito: grafo com WebSite e o `llms.txt` da
    N2a ("Kiwi, Growth Marketing" no lugar de "Kiwi (Growth Marketing)").

## 4. Divergências da landing (R32), registradas e não corrigidas

| # | Onde | R32 | O que ficou | Pergunta |
|---|---|---|---|---|
| 1 | Hero | Campo de pedido com digitação animada e sugestões, "Veja o Squad trabalhando", palco grande do squad | O Hero da A0, **sem mudança nesta fatia** ("Hero aprovado mantido"): H1, definição, botão, fileira de agentes | — (divergência anterior, da A0) |
| 2 | Do pedido à entrega | Simulação animada da Sala do Squad | Os 4 passos citáveis da N2a em cartões + "Entenda como funciona" | Diogo: a simulação entra no site? |
| 3 | Sete especialistas | Cartões | Mesmos cartões e textos; o nome do agente linka a página dele; a frase "Sete agentes especialistas que conhecem sua marca…" (da seção 2 da R32) virou o lead do título | Diogo |
| 4 | Modo autônomo | Cena fixa com 5 rotinas de exemplo | Faixa escura com o título e o resumo da N2a; **as rotinas ficaram de fora porque citam fornecedor** ("Publicar 3x por semana no Instagram") | Dono/Diogo: rotinas sem nome de rede? |
| 5 | Memória e Resultados | Cenas visuais | Dois cartões com título, lead da R32 e resumo da N2a | Diogo |
| 6 | Comparativo | Ícones próprios da R32 | `<table>` com ✓, ½ e – e os rótulos da R32 como texto para leitor de tela; en/es traduzidos por mim | Diogo: ícones da R32? |
| 7 | Perguntas | 7, com a de créditos | 6, sem a de créditos (P2), em `<details>`, + "Ver todas as perguntas" | Dono (P2) |
| 8 | Encerramento e rodapé | "Criar conta grátis" | "Começar com o squad" (briefing) com a linha de apoio da R32; o rodapé da A0 dizia "Criar conta grátis" | Dono (P1) |
| 9 | Cabeçalho das páginas novas | Não existe (a R32 é uma página só; no topo, só "Entrar") | Landing igual à R32; páginas novas com Como funciona · Especialistas · Perguntas · Sobre | Diogo |
| 10 | Páginas novas | Sem desenho | Coluna de leitura de 880 px com tokens do DS, migalhas, agente do DS na abertura | Diogo: desenho das páginas internas |

## 5. Perguntas ao dono e ao Diogo

1. **Dono (P1 da N2a):** o botão do Hero continua "Criar conta grátis"? Hoje é o único lugar do site público com "grátis"
   (fora a própria tela de cadastro); todos os outros botões dizem "Começar com o squad" (pedido do briefing). Trocar é uma
   chave do catálogo (`site.home.signUp`).
2. **Dono (P2):** a pergunta de créditos fica fora da landing até o preço (está fora).
3. **Dono (P3):** a description da inicial passou à versão da N2a (≤ 155; o briefing pedia ≤ 155); o title não mudou. Ok?
4. **Dono (P4):** as páginas de agente mostram todas as entregas da N2a, inclusive as de imagem da Kaia que dependem do motor
   do Vic. Mostrar só as liberadas?
5. **Dono (P6):** o que a Sobre pode dizer de quem faz a HelloSquad (e `founder`, `address`, `contactPoint`, `sameAs` no
   JSON-LD)? Sem resposta, a seção não aparece.
6. **Dono (pergunta 6 da A2a):** `/entrar` e `/criar-conta` não têm versão por idioma: quem vem de `/en` cai no cadastro em
   pt-BR. Abre fatia para o cadastro por idioma?
7. **Diogo:** desenho das páginas internas, do cabeçalho com navegação (e do celular) e das divergências da §4.
8. **Diogo/Visão:** imagem de compartilhamento e logo são placeholders gerados; a peça e o logo oficiais trocam por arquivo.
9. **Dono/N2a:** em espanhol, "pie de foto" (catálogo do app) ou "textos de publicación" (site)? Vale escolher um.

## 6. O que ficou de fora

- `/precos` e `/blog` (preço por último; blog sem pauta).
- en/es estáticas (§3 item 1).
- Revisão nativa das traduções que são minhas (comparativo, vocabulário do JSON-LD, navegação) e das da N2a.
- `lastModified` no sitemap: não há data confiável por página; omitido em vez de inventado.
- Cadastro e entrada por idioma (pergunta 6).

## 7. Onde discordei do briefing / incidentes

- **"SSG/SSR":** pt-BR é SSG; en/es ficaram SSR (§3 item 1).
- **CTA:** segui "Hero aprovado mantido" no botão do Hero e "Começar com o squad" no resto (pergunta 1).
- **Conteúdo da N2a:** mudei duas linhas do es (o "tú" que a própria N2a pediu) para o site não divergir do catálogo.
- **Commit do item 4 dentro da S2e:** sitemap, robots, llms, imagem OG, logo e `/admin` entraram no remoto no commit
  `fc38f0f` ("S2e: período do ciclo…") do Stark: o índice do git é compartilhado e ele commitou enquanto meus arquivos
  estavam no stage. Nada se perdeu. Daí em diante commitei com `git commit -- <caminhos>` no mesmo comando do `add`.
- **`pkill -f` que pegou o próprio comando:** ao parar o `next start` da 3199, o padrão casou com o shell que rodava o
  comando e o encerrou depois do commit; só a minha 3199 foi afetada. Passei a parar por PID (`ss -ltnp`).
- **Capturas dos outros:** o `E2E_SCREENSHOTS` grava as capturas de todas as specs; apaguei de `a2c/` as que não eram
  minhas (cópias novas, não rastreadas) e nas rodadas seguintes usei uma pasta temporária.

## 8. Estado em que deixei a máquina

- **`next dev` do dono (:3100, pid 16675):** nunca parado; `GET /`, `/entrar`, `/squad/otto`, `/en/faq` → 200 às 18:12
  (recarregou do disco sozinho). Nenhum build rodou no checkout principal.
- **Worktree `/tmp/hs-a2c`:** removido (`git worktree list` só mostra o principal); `next start` da 3199 e o Chromium da 9333
  parados. Fica `/tmp/lh` (Lighthouse 13.5.0 instalado fora do repositório, reaproveitável na H2).
- **Banco:** seed reaplicado pelos teardowns do e2e (18:01, 18:03, 18:06, 18:11), sempre dentro da trava. API (:8100)
  intocada. Nenhum worker do HelloSquad rodando.
- **Não commitei:** `packages/contracts/openapi.json` e `schema.ts` modificados no disco são da S2e (Stark).
