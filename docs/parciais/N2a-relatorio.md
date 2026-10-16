# N2a — Relatório (Nick Fury)

**Fatia:** N2a, conteúdo SEO/GEO do site público e revisão de domínio do squad (Fase 2).
**Data:** 16/10/2026. Sessão 1 de 15:34 a 15:48, interrompida por limite de cota da conta. Retomada de 16:15 a 16:32.
**Área:** só `docs/conteudo/` e `docs/parciais/N2a-*`. Nada tocado em `squad/`, `apps/`, `packages/` ou `supabase/` (S2c do Stark em paralelo). Nenhum serviço subido ou derrubado. Nenhuma chamada externa.
**Commits em `main`, todos com push:** sessão 1: `e21aba4`, `8f7d04c`, `00c9dc7`, `ff0ffe4`, `f3e930b`, `a52d2b4` (e o autosave `4f352bc`, que levou `llms.txt` e `robots.txt`). Retomada: `3e1efb5`, `ad57c21`, `637ac90`, `544a46a`, `c94331e`, mais os da tradução en (`374c7ef`, `263fb7e`, `f22de60`, `87bd93c`, `a96a771`, `fea3509`), os da es (`4f0e2da`, `ed51693`, `728eb53`, `607f029`, `3709084`, `29a91cc`), a correção de quem aprova o conceito (`71135f2`) e o deste relatório.

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | Mapa do site (sessão 1) | 12 rotas por idioma, promessa, palavras-chave e perguntas GEO por página, metadados, JSON-LD sem `Offer`, termos pt/en/es, hreflang e canonical | `docs/conteudo/site/README.md` |
| 2 | Conteúdo pt-BR + varredura | 12 páginas (início, como funciona, squad, 7 agentes, FAQ com 19 perguntas, sobre). Varredura de termos proibidos por script e correção: o `cta` de frontmatter passou a ser marcado como proposta nas 12 páginas, e as notas que citavam "grátis" e créditos foram reescritas como pergunta ao dono | `docs/conteudo/site/pt-BR/` |
| 3 | en e es | 24 páginas com a mesma estrutura, os mesmos nomes de arquivo e os slugs do §2 do README. Tradução de marketing, com a copy do catálogo `apps/web/messages/<idioma>` usada literalmente onde ela existe; o resto da copy da R32 está rotulado "tradução proposta". Notas para o time ficaram em português | `docs/conteudo/site/en/`, `docs/conteudo/site/es/` |
| 4 | `llms.txt` e `robots.txt` | `llms.txt`: definição citável, regras do squad, os sete especialistas e as páginas em pt-BR, com blocos en e es que agora trazem também as páginas de agente (36 links internos). `robots.txt`: `/app`, `/admin` (Super Admin, decisão de 16/10 09:15) e `/sair` bloqueados para todos; GPTBot, ClaudeBot, PerplexityBot e Google-Extended liberados no público, mais seis robôs de busca e de leitura sob demanda dos assistentes; Disallow antes de Allow | `docs/conteudo/site/llms.txt`, `docs/conteudo/site/robots.txt` |
| 5 | Revisão de domínio do squad | Seis riscos transversais com a linha de origem; forte / fraco / texto pronto / riscos para os sete agentes; tabela do que a fixture não entrega para Bia, Kiwi, Max e Íris; ordem de aplicação que separa o que **muda o combinado** | `docs/conteudo/revisao_squad.md` |
| 6 | Relatório | Este arquivo e o progresso | `docs/parciais/N2a-relatorio.md`, `docs/parciais/N2a-progresso.md` |

## 2. Como foi verificado

### 2.1 Palavras, títulos e metadados por página

Script `/tmp/n2a/verify.py`: palavras do arquivo inteiro (frontmatter e notas incluídos), número de títulos Markdown, links internos, tamanho do `title` e da `description`.

| Página | pt-BR palavras | en palavras (en/pt) | es palavras (es/pt) | títulos pt/en/es | links pt/en/es | title car. pt/en/es | description car. pt/en/es |
|---|---|---|---|---|---|---|---|
| inicio | 1119 | 1214 (108%) | 1229 (110%) | 11/11/11 | 0/0/0 | 46/50/54 | 144/154/146 |
| como-funciona | 1215 | 1261 (104%) | 1257 (103%) | 13/13/13 | 0/0/0 | 47/53/53 | 144/147/145 |
| squad | 730 | 783 (107%) | 756 (104%) | 6/6/6 | 7/7/7 | 54/42/51 | 146/152/150 |
| squad-nexo | 777 | 817 (105%) | 772 (99%) | 10/10/10 | 0/0/0 | 50/43/51 | 141/146/145 |
| squad-bia | 862 | 794 (92%) | 858 (100%) | 10/10/10 | 0/0/0 | 48/39/48 | 151/144/155 |
| squad-kaia | 812 | 764 (94%) | 819 (101%) | 10/10/10 | 0/0/0 | 41/54/42 | 140/149/154 |
| squad-otto | 849 | 851 (100%) | 900 (106%) | 10/10/10 | 0/0/0 | 50/42/52 | 134/136/136 |
| squad-kiwi | 980 | 960 (98%) | 1006 (103%) | 10/10/10 | 0/0/0 | 42/38/42 | 141/143/153 |
| squad-max | 753 | 768 (102%) | 782 (104%) | 10/10/10 | 0/0/0 | 45/48/41 | 148/150/146 |
| squad-iris | 733 | 736 (100%) | 744 (102%) | 10/10/10 | 0/0/0 | 53/48/49 | 149/150/148 |
| faq | 1174 | 1165 (99%) | 1202 (102%) | 23/23/23 | 0/0/0 | 39/53/59 | 144/149/144 |
| sobre | 504 | 513 (102%) | 525 (104%) | 6/6/6 | 0/0/0 | 46/57/44 | 143/146/150 |
| **Total** | 10508 | 10626 (101%) | 10850 (103%) | | | | |

Resultado: 36 de 36 arquivos presentes; número de títulos igual nos 12 trios; 36 `title` entre 38 e 59 caracteres (limite 60); 36 `description` entre 134 e 155; `rota`, `idioma` e `cta` conferidos contra o §2 do README em todos; 21 links internos, todos para rotas do próprio idioma; **0 problemas**. As páginas fora de `squad.md` citam rotas entre crases, para o Aranha montar o link, e por isso aparecem com 0 links.

### 2.2 Termos proibidos

Script `/tmp/n2a/scan.sh` com quatro grupos: comercial em pt/en/es (preço, plano, R$, grátis, free, trial, crédito, assinatura, cobrança, pagamento, desconto, checkout e equivalentes), fornecedores (meios de pagamento, fornecedores de IA, de imagem e de mídia, redes sociais, buscadores e a infraestrutura do produto), nome errado da entidade e domínio real.

| Conjunto | Fornecedor | HelloOtto | Domínio | Comercial | Classificação do comercial |
|---|---|---|---|---|---|
| pt-BR (12 páginas) + `llms.txt` | 0 | 0 | 0 | 30 + 6 | pt-BR: 25 "plano" como entrega (de marketing, de mídia, de testes) e 5 em notas de implementação que fazem a pergunta P1 ou P2 ao dono; `llms.txt`: 6, todos "plan" ou "plan de" como entrega nos blocos en e es |
| en (12 páginas) | 0 | 0 | 0 | 26 | 25 "plan" como entrega e 1 "Let’s plan a campaign", pedido sugerido literal do catálogo (`team.json`) |
| es (12 páginas) | 0 | 0 | 0 | 23 | 23 "plan", "planes" ou "planificar" como entrega |

A primeira rodada pegou "flux" dentro de "fluxo" (falso positivo do nome de um modelo de imagem); o padrão passou a exigir palavra inteira. Na rodada final, "meta" dentro de `meta.title`, numa nota minha em en, também acusou fornecedor; a nota foi reescrita e o grupo voltou a 0. Os robôs nomeados no `robots.txt` são agentes de usuário obrigatórios para o arquivo funcionar e não aparecem em texto público.

### 2.3 Consistência pt/en/es

- **Termos do §6 do README** (contagem no corpus de cada idioma): en: Needs you 3, Squad Room 4, Brand Memory 16, Autonomous Mode 11, Growth Marketing 10, account owner 5, Start with the squad 25, Brand & Creative 7. es: Necesita de ti 3, Sala del Squad 4, Memoria de Marca 16, Modo Autónomo 10, Growth Marketing 10, titular de la cuenta 4, Empezar con el squad 25, Marca y Creación 3.
- **Variantes erradas procuradas** (Brand memory, Autonomous mode, Squad room, Media and Performance, Memoria de la Marca, Sala de Squad, Necesita de usted, dueño de la cuenta, HelloOtto e outras): en 0; es 1, "en modo autónomo", que é a tradução da copy aprovada "Seu marketing, em modo autônomo." (minúscula também no original). Mantida.
- **FAQ:** 19 perguntas em pt-BR, en e es, na mesma ordem (a página inicial cita as de número 1, 2, 7, 8, 9 e 12).
- **Copy do catálogo:** o H1 e a nota da página inicial são o valor literal de `site.json` em cada idioma. O `title` da página inicial é o `meta.title` do catálogo nos três idiomas. A tradução en tinha trocado esse `title` e um pedido sugerido do Nexo ("Let’s plan a campaign"); voltei os dois ao catálogo (`c94331e`), e a proposta de `title` com palavra-chave foi para a P3.
- **Quem aprova:** a tradução es apontou que o pt-BR dizia "a Bia aprovou o conceito" (Kaia) e "o conceito que a Bia aprovou" (Otto). Quem aprova é o dono da conta (decisão de 16/10 08:55). Corrigido no pt-BR e no en (`71135f2`); `grep` por essas frases nos três idiomas: 0.
- **Leitura de amostra feita por mim** (qualidade de tradução não se verifica por script): en `inicio`, `squad-kiwi`; es `squad-kiwi`, `como-funciona`. Tom natural, sem decalque, termos certos. O resto das traduções, feitas por dois sub-agentes, teve só a verificação mecânica acima. A qualidade de redação dessas páginas é julgamento meu por amostragem; o Diogo ou uma pessoa nativa deve revisar antes da Fase 5.

### 2.4 `robots.txt` e `llms.txt`

- `robots.txt` testado com dois leitores em 8 robôs x 10 caminhos (públicos, `/entrar`, `/app`, `/app/...`, `/admin`, `/sair`). Leitor de primeira regra (`urllib.robotparser`): 80/80. Leitor RFC 9309, em que vence a regra mais longa: 80/80. Antes de pôr o Disallow na frente do Allow, o leitor de primeira regra liberava `/app`, `/admin` e `/sair` para todos os robôs (32 falhas). O `apps/web/app/robots.ts` de hoje gera Allow antes de Disallow; pela RFC ele está certo, mas fica a sugestão para o Aranha.
- `llms.txt`: 36 links internos, todos para rotas existentes do §2; varredura sem fornecedor, domínio ou nome errado.

### 2.5 Revisão do squad

Cada risco cita arquivo e linha; a evidência por `grep` está em `/tmp/n2a/evid.txt`. Exemplos: moeda BRL ou "reais" em três linhas das skills da Kiwi e "Nenhum real" na SOUL; idioma fixo em `squad/README.md:34` e `squad/otto/SOUL.md:32`; "salvamentos" 10 vezes em 4 fixtures, contra uma sugestão pendente no seed (`supabase/seed.sql:359`); **0** ocorrências de grupo de controle, sazonalidade, feriado, ano anterior, pixel ou evento de conversão nas skills de Kiwi, Max e Íris. O que é forte ou fraco no ofício de marketing é julgamento meu, assinado como tal no arquivo.

## 3. Decisões tomadas dentro da minha área (nada combinado foi mudado)

1. Mesmos nomes de arquivo nos três idiomas; slugs traduzidos conforme o §2 do README.
2. Nos arquivos en e es, o texto público está no idioma; notas para o time (rótulos "Copy aprovada", comentários, notas de implementação) ficam em português, a língua do time.
3. Copy aprovada da R32: onde o catálogo do app tem a string, vale o valor literal do catálogo; onde não tem, o rótulo é "Copy aprovada (R32), tradução proposta", porque a aprovação foi do texto em português.
4. `cta` "Começar com o squad" / "Start with the squad" / "Empezar con el squad" é **proposta** em todas as páginas (P1); o botão implementado segue o da R32.
5. en usa "social media" (mais natural nos EUA) onde o pt-BR diz "redes sociais"; o frontmatter dos agentes em en usa `pronome` em vez de `artigo`, que não existe em inglês. es usa "tope" para teto, "planificación semanal" para pauta (na América Latina, "pauta" sugere compra de mídia) e "textos de publicación" para legendas; o catálogo es usa "pies de foto" uma vez, na tabela do Otto (ver seção 6).
6. Revisão do squad: tudo é sugestão. O que muda contrato, id, moeda ou regra da S2b está marcado **[muda o combinado]** e depende do Vic.

## 4. O que ficou de fora

- **Implementação** das páginas, do `robots.ts`, do `sitemap` e do `hreflang`: é do Aranha.
- **Aplicação da revisão** em `squad/` e nas fixtures: é do Stark, depois do OK do Thor e, onde muda o combinado, do Vic.
- **`/precos` e `/blog`:** fora da fatia; preço fica por último (16/10) e o blog não tem pauta.
- **Dados reais da empresa na página Sobre:** marcador `{{…}}` mantido até o Vic responder (P6).
- **Revisão nativa das traduções:** não havia revisor nativo; fica recomendada antes da publicação.

## 5. Perguntas ao dono (o Thor leva ao Vic)

| # | Pergunta | O que está combinado | O que proponho e por quê |
|---|---|---|---|
| P1 | O botão principal continua "Criar conta grátis"? | Landing R32: "Criar conta grátis" (en e es no catálogo, chave `home.signUp`) | "Começar com o squad": "grátis" é condição comercial e o preço ficou por último. Enquanto não houver resposta, nada muda no implementado |
| P2 | A pergunta da R32 "Posso começar gratuitamente? Como funcionam os créditos?" fica na landing? | Está na FAQ da R32 | Tirar até o preço ser definido; o conteúdo da `/faq` já não a traz |
| P3 | O `title` da página inicial ganha a palavra-chave? | Catálogo: "HelloSquad: seu squad de IA assume o marketing" (e en, es) | Opcional: "HelloSquad: equipe de marketing com IA para o seu negócio" / "HelloSquad: the AI marketing team for your business"; o H1 da R32 não muda |
| P4 | As páginas de agente mostram só as entregas já liberadas na data de publicação? | Catálogo completo de entregas no Documento Mestre | Mostrar só as liberadas, para o site não prometer o que ainda não funciona (as de imagem dependem do motor do Vic) |
| P5 | `x-default` do hreflang aponta para o pt-BR? | Lançamento em vários países, desenvolvimento em pt-BR primeiro | Sim, enquanto o pt-BR for a versão principal; revisar quando en ou es ganharem tráfego próprio |
| P6 | O que a página Sobre pode dizer sobre quem faz a HelloSquad (empresa, cidade, desde quando, contato)? | Nada definido | Preencher só com o que o Vic aprovar; sem isso, a página fica nos princípios |
| P7 | Os itens **[muda o combinado]** da revisão do squad (moeda por negócio, teto sem valor no briefing, campos novos de contrato, grupo de controle, cortes de segmento) entram na Fase 2 ou depois? | Skills e fluxos da S2a e da S2b como estão | Prioridade minha: moeda por negócio (R2) antes do lançamento fora do Brasil, e medição da conversão (R5) antes do primeiro anúncio real |

## 6. Para o Thor, o Aranha e o Stark (técnico, sem decisão do dono)

- **Aranha:** acrescentar `/admin` ao bloqueio do `robots.ts` antes do Super Admin entrar; nomear os robôs de busca e pôr Disallow antes de Allow é opcional. Avaliar trocar `apps/web/public/llms.txt` pelo de `docs/conteudo/site/llms.txt`. Conteúdo no HTML inicial (SSR/SSG), tabelas como `<table>`.
- **Aranha (catálogo es):** `team.json` traz "¿Qué necesita de mí esta semana?" para o Nexo, que soa como "usted" num catálogo todo em "tú" (sugestão: "¿Qué necesitas de mí esta semana?"; o site copiou a string literal). E o termo para legenda: o site usa "textos de publicación" e o catálogo, "pies de foto" uma vez; vale escolher um só.
- **Stark:** a revisão traz, em ordem: (1) texto sem mudança de contrato (idioma, moldes sem número na SOUL de Kiwi e Íris, sugestão pendente, estados de memória, medição antes do gasto); (2) fixtures de R4 (`02.03/bia`, `04.02/otto`, `04.01/otto`).

## 7. Onde discordei do briefing

- O briefing lista quatro robôs de IA. Mantive os quatro e **acrescentei**, só como sugestão, os robôs de busca e de leitura sob demanda (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, Perplexity-User, Applebot-Extended), mais o bloqueio de `/admin`. O grupo `*` já libera esses robôs, então nada muda no comportamento; o ganho é deixar a intenção escrita. Decisão do Aranha e do Thor.
- Não proponho tirar os nomes de fornecedor de dentro das SOUL (Meta, GA4, WhatsApp): são ferramentas reais dos agentes e não aparecem no site. Proponho tirar só os números de exemplo, que o modelo pode repetir.
