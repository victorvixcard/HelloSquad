# Notas: Landing V1 (R32) e MioloPeca (handoff V4.6)

Fontes: extratos `out/land/` e `out/miolo/` (nenhum `.dc.html` foi aberto). "L1234" = linha no HTML original. Texto entre aspas = literal do código. "Não aparece no protótipo" = ausente dos extratos.

## A1. Modais de cadastro e login (Landing V1)

Um único modal com dois modos (`modal: 'signup'` ou `'signin'`, L2615, L2887). Template em L1883-1897.

**Pontos de entrada**

| Modo | Onde | Rótulo |
|---|---|---|
| login | barra superior | "Entrar" (L1310) |
| login | cabeçalho da Hero | "Entrar" (L1331) |
| login | rodapé | "Entrar" (L1875) |
| cadastro | barra superior | "Criar conta grátis" (L1311) |
| cadastro | Hero, CTA primário | "Criar conta grátis" (L1366) |
| cadastro | seção 08, botão soft | "Criar conta" (L1837) |
| cadastro | encerramento | "Criar conta grátis" (L1863) |
| cadastro | ação na conversa da demo | "Criar conta grátis" (L2709; abre em L2716) |

**Textos por modo**

| Modo | Título (h3) | Apoio |
|---|---|---|
| cadastro, com pedido guardado | "Seu pedido está guardado." (L1888) | rótulo "Seu pedido" + o pedido citado; "Crie sua conta e o Nexo começa por ele." (L1888) |
| cadastro, sem pedido | "Crie sua conta grátis." (L1889) | "Diga o que você precisa e o squad começa por aí." (L1889) |
| login | "Bem-vindo de volta." (L1890) | "Entre para ver o que o seu squad fez desde a última vez." (L1890) |

**Campos, botões e mensagens**
- Único campo, igual nos dois modos: "Seu e-mail", `type="email"`, placeholder "voce@seunegocio.com.br", `autoComplete="email"` (L1891).
- Botão de cadastro "Criar conta grátis" (L1892): em andamento "Criando sua conta", concluído "Pronto".
- Botão de login "Entrar" (L1893): em andamento "Entrando", concluído "Pronto".
- Fechar: ícone com rótulo "Fechar" (L1886), tecla Esc (L5361) ou clique no fundo (L5362).
- Avatar do Nexo (`coord`, expressão `big`) no topo (L1887); `role="dialog"`, `aria-modal="true"` (L1885).
- Aviso após enviar: "Nesta versão, nenhuma conta foi criada e nada foi enviado." (L1894).
- Não aparece no protótipo: senha, nome, aceite de termos, "esqueci a senha", login social, link para alternar cadastro/login dentro do modal, mensagens de erro, boas-vindas ou onboarding.

**Passos** (uma tela só, sem assistente)
1. Abrir (`_openModal`, L2887-2891): botão volta a `rest`, campo recebe foco após 80 ms, Nexo do hero vai a `attend`.
2. Digitar: cada alteração grava `email` no estado (L5357). Nada é guardado fora do componente; o e-mail sobrevive a fechar e reabrir na mesma página (`_closeModal` não o limpa, L2893).
3. Enviar (L5359): clique no botão. Se o estado não é `rest`, ignora; senão vai a `loading` e, após 1000 ms, a `done`.
4. Concluído: botão "Pronto" e o aviso de L1894. O modal não fecha sozinho e não reenvia sem ser reaberto.
5. Fechar (`_closeModal`, L2892-2895): `modal: null`, `heroSending: false`, Nexo volta a `idle`.

**Validações simuladas**
- Nenhuma validação de e-mail: vazio ou inválido envia igual (L5359; sem `required`, `pattern` ou mensagem de erro).
- Única trava: novo clique é ignorado durante `loading` e `done` (L5359).
- Sem `<form>` e sem tratamento de Enter: só o clique envia. Sem trap de foco nem devolução de foco ao fechar.
- Sem rede, navegação ou `localStorage`: o único `setItem` do script é o do pedido.

**Pedido da Hero reaproveitado (`hs-landing-pedido`)**
- Gravar: `_savePrompt(v)` guarda no estado `saved` e em `sessionStorage['hs-landing-pedido']`, com `try/catch` mudo (L2883-2886). Quem chama: envio da Hero (L3328) e envio livre na conversa da demo (L2704).
- Ler: ao montar a página, `sessionStorage` vira `saved` (L4859). Vale por aba: sobrevive a recarregar, some ao fechar a aba.
- Mostrar: só no cadastro. `saved` preenchido: "Seu pedido está guardado." + citação; vazio: "Crie sua conta grátis." (L5356, L1888-1889). O login não mostra o pedido.
- Nada limpa a chave (sem `removeItem`) nem leva o pedido adiante: "Crie sua conta e o Nexo começa por ele." (L1888) é só texto; o pós-cadastro não aparece no protótipo.
- Atenção (lido no código): `_heroSend` salva todo envio, inclusive as sugestões que a Hero toca sozinha (`manual = false`, L3250, L3292, L3301, L3328). Quem abre "Criar conta grátis" sem digitar nada vê como "Seu pedido" a sugestão em cena (a 1ª: "Criar uma campanha para o fim de semana"). Com movimento reduzido não há autoplay (L3246): só grava após clique ou envio manual.
- Demo (fora da Hero): ao digitar na conversa, a resposta fixa é "Nesta demonstração as respostas são pré-definidas. Seu pedido fica guardado para quando você criar sua conta." (L2710), com as ações "Ver o exemplo" (L2708) e "Criar conta grátis" (L2709).

## A2. Hero: pedido, coordenação, especialistas, CTA

**Elenco** (L1904-1905): Nexo · Coordenador (`coord`), Bia · Estratégia (`arch`), Kaia · Criação (`leaf`), Otto · Conteúdo (`pill`), Kiwi · Mídia (`hex`), Max · CRM (`funnel`), Íris · Dados (`square`).

**Textos fixos**
- Título: "Você cuida do seu negócio." e "Seu squad de IA assume o marketing." (L1334).
- Campo (DS `CommandField`): placeholder "Diga o que você precisa"; rótulo "Converse com o seu squad" (L1336; o extrato quebra a linha no meio da palavra, juntei as duas partes).
- Faixa de sugestões, rótulo de acessibilidade: "Sugestões de pedidos para o seu squad" (L1341).
- CTAs: "Criar conta grátis" (L1366, abre o modal) e "Veja o Squad trabalhando" (L1367, leva à demo).

**Pedido-exemplo (R32, L3241-3252)**
- Sem toque algum, 2900 ms depois de a página montar, a Hero digita sozinha a 1ª sugestão, "Criar uma campanha para o fim de semana", e a envia. Depois segue em ciclo (R27, L3396-3411): próxima sugestão 1500 ms depois de a faixa voltar (L3394, L3411), na ordem da faixa, voltando à 1ª.
- Se a pessoa já digitou ou escolheu, nada começa sozinho. Digitar suspende o ciclo; ele volta com o campo vazio, após 4 s sem digitar (L3418-3428) ou ao sair do campo (L4933).
- Movimento reduzido: o campo traz o exemplo estático "Quero criar uma campanha para minha marca." (L2108, L3246) e não há autoplay.
- Outro exemplo, da demo e não da Hero: "Quero uma campanha de fim de ano para o nosso panetone." (L2112).

**Sugestões** (L1932-1943). Cada uma nomeia quem a atende (comentário do código em inglês: "a temporary squad", L1931); a ordem é a de chamada.

| # | Texto | Especialistas |
|---|---|---|
| 1 | "Criar uma campanha para o fim de semana" (L1933) | Bia, Kaia, Kiwi |
| 2 | "Criar uma identidade visual" (L1934) | Kaia |
| 3 | "Planejar meus próximos conteúdos" (L1935) | Otto, Bia |
| 4 | "Analisar meus resultados" (L1936) | Íris |
| 5 | "Preparar um lançamento" (L1937) | Bia, Kaia, Otto |
| 6 | "Entender melhor meus clientes" (L1938) | Bia, Íris |
| 7 | "Criar uma campanha de anúncios" (L1939) | Kiwi, Kaia |
| 8 | "Reativar clientes que sumiram" (L1940) | Max, Otto |
| 9 | "Encontrar oportunidades para minha marca" (L1941) | Bia |
| 10 | "Melhorar o relacionamento com clientes" (L1942) | Max |

- Dica (`title`) de cada sugestão: "Nome · Papel" separados por ", ", ex. "Bia · Estratégia, Kaia · Criação, Kiwi · Mídia" (L5116). Clicar digita o texto no campo (34 a 60 ms por letra) e envia 420 ms depois (L3300-3301).
- Texto livre: `inferAgents` (L2092-2102) pontua palavras-chave por especialista (L2084-2091) e escolhe até 3; sem acerto, Bia e Otto. Nexo nunca entra na lista: sempre coordena.
- Envio (L3305-3314): texto aparado; vazio é ignorado; ignora durante digitação, nas fases expect/focus/coord e a menos de 700 ms do envio anterior.

**Etapas** (ao enviar, a pílula de status toma o lugar da faixa: `heroSlot: 'status'`, L3342)

| Etapa | Texto exato | Quem aparece | Linhas |
|---|---|---|---|
| 1 Pedido | "Pedido recebido" | só a pílula com três pontos; os sete agentes do hero em foco coletivo | L5073, L3344-3350 |
| 2 Coordenação | "Nexo" (negrito) + "está montando seu squad" | Nexo (avatar pensando) na pílula; ele chama os especialistas do pedido um a um e cada um surge ao lado da pílula quando chamado (1ª chamada +700 ms, demais +560 ms) | L5074, L5087-5091, L3352-3365, L2083 |
| 3 Especialistas | nomes (negrito) + "estão a postos"; com um só: "Nome (Papel)" + "está a postos" | avatares dos chamados dentro da pílula; Nexo passa para a esquerda dela; os não chamados fazem o movimento `ack` | L5075, L2103-2107, L5089-5092, L3367-3378 |
| 4 CTA | sem texto novo; a pílula da etapa 3 segue até o fim | os chamados, de olhar feliz; um traço dá uma volta no botão "Veja o Squad trabalhando" | L3383-3387, L3429-3459 |

- Exemplos da etapa 3 (montados pelo código): "Bia, Kaia e Kiwi estão a postos" (sugestão 1), "Kaia (Criação) está a postos" (2), "Otto e Bia estão a postos" (3).
- Leitor de tela: a pílula é `role="status"` com `aria-live="polite"` (L1353) e lê "Pedido recebido." / "Nexo está montando seu squad." / "<nomes> estão a postos." (L5101).
- Ritmo (L3323-3326, em ms): envio +620 (digitado à mão: +200); "Pedido recebido" +280 após o envio; etapa 2 +1650 depois; 1ª chamada +700; demais a cada 560; etapa 3 +1000 após a última chamada; volta do CTA +3300 depois (+2700 com 1 especialista); fim +2900; sugestões voltam +900 (L3394). Movimento reduzido (L3326): etapa 1 em 200, etapa 2 em 1800, etapa 3 e CTA em 4000, fim em 9500.
- "Veja o Squad trabalhando" (`_goDemo`, L3464-3471): rola até `#demo` e abre a conversa do especialista chamado (se foi só um) ou a do "squad".

## B. MioloPeca.dc.html (product-ui, 69 linhas)

Desenha uma "peça" de proporção 4:5 da marca demo Miolo (padaria fictícia). Template L30-48, script L51-65. A palavra "MIOLO" é texto fixo (L32). O contêiner é `role="img"` com `aria-label` "Peça da Miolo: " + título sem quebras (L30, L62); com os padrões: "Peça da Miolo: Hoje é Dia Mundial do Pão."

**Props** (`props_cenario` do meta.json; a linha exata da tag não vem no extrato)

| Prop | Tipo e limites | Efeito |
|---|---|---|
| `p` | objeto, `editor: null` (sem controle no cenário) | campos da peça, mesclados sobre os padrões `D` (L53-54); campo omitido usa o padrão |
| `w` | inteiro, padrão 320, mín. 40, máx. 640 | largura: `W = max(40, round(w))`, com 320 se `w` faltar (L55); altura `H = round(W × 1,25)` (L56) |
| `$preview` | 320 × 400 | tamanho da prévia no canvas |

`fs = W / 20` (2 casas, L59) é provável tamanho de fonte-base: `margin-top: 0.8em` (L45) indica medidas em em. O `style` do contêiner vem resumido ("…"), então o uso exato de `W`, `H` e `fs` não aparece.

**Campos de `p`** (padrões em L53)

| Campo | Padrão | Papel no template |
|---|---|---|
| `bg` | "#F4E9D4" | cor do texto do selo, do CTA e da faixa (L33, L45, L46); fundo da peça (provável, ver pui) |
| `fg` | "#6E3A1C" | fundo do CTA (L45); cor do texto principal (provável) |
| `acc` | "#D45A26" | fundo do selo (L33), cor da etiqueta `top` (L34), fundo da faixa (L46) |
| `badge` | "SEX · 16/10" | selo no topo, ao lado de "MIOLO" (L33); vence `top` |
| `top` | "" | etiqueta de texto no topo; só aparece sem `badge` (L34, L60) |
| `title` | "Hoje é Dia\nMundial do Pão." | título (L43); `\n` é quebra de linha (o CSS que a respeita não está no extrato) |
| `sub` | "Sábado tem fornada especial. Encomende pelo site." | subtítulo opcional (L44) |
| `il` | "loaf" | ilustração (abaixo) |
| `cta` | "" | etiqueta de botão, fundo `fg`, texto `bg`; opcional (L45) |
| `band` | "" | faixa de destaque, fundo `acc`, texto `bg`; opcional (L46) |

**Variantes**
- `il`: "loaf", "panetone", "jar", "pumpkin" (L61; pão, panetone, pote, abóbora). Qualquer outro valor, inclusive vazio ou "none", não desenha nada (L57). As quatro SVG (L37-40) têm cores fixas (ex.: #9A5528, #6E3A1C, #E6CFA2 no pão) e não seguem `bg`, `fg` e `acc`.
- Topo: `badge` ou `top`, nunca os dois. Opcionais: `sub`, `cta`, `band` (mostrados só se preenchidos, L60). Ordem do bloco de texto: título, subtítulo, CTA, faixa (L43-46).
- Dicas de design (`hint-placeholder-val`): o editor mostra selo, subtítulo e pão (L33, L37, L44).

**Para que serve no produto**: o arquivo não diz. Pelo alt e pela pasta é a arte de uma peça de marketing da Miolo. Referência cruzada no extrato `out/pui/` (fora do meu escopo, só consultei):
- 30 imports `<dc-import name="MioloPeca" p w>` em `pui_template.txt`, de 22 a 400 px: miniaturas, peça dentro de mensagem (`m.isPiece`), prévia de post (`work.post`, com comparação `showCmp`), campanha (`work.camp.pieces`), área de conteúdo (`ct.*`) e carrossel/imagens/vídeo (`ka-*`).
- `PIECES`: 8 peças demo (pui L5771-5781); `ADJ`: 4 ajustes que a Kaia aplica, "Deixar a data mais visível", "Título mais curto", "Fundo verde da Miolo", "Destacar a fornada de sábado" (pui L5782-5788). Eles confirmam `bg` = fundo, `fg` = texto, `acc` = destaque, `badge` = data em destaque, `band` = faixa de destaque.
- Paletas (bg / fg / acc) no pui: claro #F4E9D4 / #6E3A1C / #D45A26; verde #24402F / #F4E9D4 / #E6CFA2; laranja #D45A26 / #F4E9D4 / #F4E9D4; marrom #6E3A1C / #F4E9D4 / #E6CFA2; areia #E6CFA2 / #6E3A1C / #D45A26. `top` leva dia e hora ("Segunda, 7h"), tema ("Bastidores") ou contador de carrossel ("1/5", pui L11864).
- A landing não importa o MioloPeca (0 ocorrências nos extratos `land`).

**Observação**: o componente trava `w` em 40, mas o product UI pede `w=22` (1 uso) e `w=32` (5 usos), com `hint-size` 22×28 e 32×40. A peça sairia com 40×50, a menos que o wrapper escale ou recorte (CSS fora dos extratos).

## Lacunas

- Modais: o CSS (`.lp-modal`, `.lp-sheet`) e o comportamento interno dos componentes do DS (`Button` em `rest/loading/done`, `IconButton`, `CommandField`) não estão nos extratos. Não aparecem: erro de e-mail, Enter para enviar, rótulo do botão de enviar do campo da Hero.
- Pós-cadastro: nada é criado nem enviado (L1894); como o pedido guardado chega ao Nexo não aparece no protótipo.
- MioloPeca: CSS `.mp*` e o `style` do contêiner estão resumidos; tipografia, espaçamentos e tratamento de `\n` no título não são verificáveis. O uso no produto vem só do cruzamento com `out/pui/`.
