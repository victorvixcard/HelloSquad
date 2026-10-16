# H1 · Interface entregue (A1f, A1a, A1b) × protótipo V4.6: diferenças NÃO registradas

**Auditor:** sub-agente do Hulk, 16/10/2026, rodada de 30 min. **Ambientes:** protótipo em :8010 (cenários "Conta em uso" e "Primeiro acesso" pelo botão Demo), nosso web em :3100 (Marina, Miolo), 1440×900, pt-BR.
**Método:** `cap.mjs` passa pelas mesmas telas dos dois lados, captura e extrai títulos, botões, nomes acessíveis, regiões e campos; `compara.mjs` lista o que só existe de um lado (`diff-conta-em-uso.txt`, `diff-primeiro-acesso.txt`); cada candidato foi conferido no código do protótipo (`trecho.py`, trechos curtos) e no nosso código, e **descartado quando já está nas listas registradas** (A1f §3 e §5 perguntas 1–18, A1a §5 itens 1–8, A1b §4 itens 1–28, SA0 §5) ou quando é só dado diferente. Nenhum botão de decisão foi clicado; no nosso lado só houve navegação e abertura do painel de conversa.

## Tabela-resumo

| # | Tela · elemento | Diferença | Sev. |
|---|---|---|---|
| 1 | Conversa · sugestões "Pergunte ao Otto" | Continuam na tela depois que a pessoa já escreveu; na V4.6 somem na primeira mensagem dela | 🟡 |
| 2 | Ambiente · "Conversar com <Nome>" e Conversas | Abre a conversa **direta** do agente com o cartão do ambiente; na V4.6 é a conversa do objeto (ambiente), separada, que aparece na lista como "Conteúdo · Otto · Conteúdo · sobre o ambiente" | 🟡 |
| 3 | Conversa de objeto · cabeçalho | Mostra o papel ("Conteúdo") ao lado do nome; a V4.6 só mostra o papel na conversa direta | ℹ️ |
| 4 | Início · resumos (nome acessível) | ". Ver mais" / ". Fechar"; a V4.6 diz ". Ver detalhes" / ". Recolher detalhes" | ℹ️ |
| 5 | Início · sugestões (nome acessível) | "só Íris participa", "Nexo e Bia e Kaia participam"; a V4.6: "só a Íris participa", "Nexo, Bia e Kaia participam" | ℹ️ |
| 6 | Memória · dossiê, "De onde vem" | Duas pílulas ("Onboarding e o que você contou", "Instagram"); a V4.6 lista as fontes mesmo não conectadas ("Cadastro", "Site", "Google Perfil", "Documentos" no primeiro acesso; 8 na conta em uso) | ℹ️ |

Nenhum 🔴: nada quebra uma jornada do protótipo e nada mostra dado inventado.

## Achados

### 1. Sugestões "Pergunte ao Otto" não somem depois da mensagem da pessoa · 🟡

1. **Tela e elemento:** painel de conversa (Conteúdo → "Conversar com Otto"), bloco `.cx-sug` "Pergunte ao Otto".
2. **Protótipo:** FLUXOS §4.3: "Sugestões de pergunta ("Pergunte à Kaia") somem depois da primeira mensagem da pessoa (L11276, L10912)". No código: `const userAfter = t.msgs.slice(t.sugFrom || 0).some((m) => m.k === 'u');` (L10898) e `hasSug: !userAfter && !o.typing && …` (L10912). Na captura, as sugestões vêm logo abaixo da primeira fala do Otto.
3. **Nosso:** a conversa tem duas mensagens da Marina ("Otto, preciso de uma legenda…", "Tom acolhedor e direto…") e as três sugestões continuam abaixo delas. A regra é outra: `apps/web/components/product/ConversationPanel.tsx:236-238` mostra as sugestões enquanto o **agente** não falou (`!agentSpoke`), sem olhar as mensagens da pessoa.
4. **Prova:** `proto-conversa.png` × `nosso-conversa.png` (coluna da direita).
5. **Severidade:** 🟡 (o comportamento difere do combinado).
**Conferido:** A1f §3 só registra que a "Nova conversa" abre com as sugestões no lugar da primeira fala roteirizada; nada sobre esconder as sugestões depois da mensagem da pessoa. Também não aparece na A1a §5 nem na A1b §4.

### 2. "Conversar com <Nome>" no ambiente usa a conversa direta, não a do ambiente · 🟡

1. **Tela e elemento:** cabeçalho de identidade dos ambientes (ex.: Conteúdo, "Conversar com Otto"); reflexo em Minha Equipe & Conversas, aba "Conversas".
2. **Protótipo:** `talk: () => this._openCtx('env', env)` (L10572). Isso abre a conversa do objeto "Ambiente", uma por objeto (FLUXOS §4.1, linha "Conversa a partir de um objeto (uma por objeto)"), separada das conversas diretas. Na lista ela aparece como título "Conteúdo" e linha "Otto · Conteúdo · sobre o ambiente" (FLUXOS §4.4, "· sobre … o ambiente").
3. **Nosso:** `apps/web/components/env/EnvIdentity.tsx:54-55` abre `conversationId: shell.conversationIds.direct[agent]`, ou seja, a conversa direta mais recente com o cartão "Conversando sobre Conteúdo" por cima. A conversa do seed é `agent_direct` "Conversa com o Otto" (`supabase/seed.sql:194`). O painel mostra o histórico da conversa direta como se fosse sobre o ambiente, e a lista mostra "Conversa com o Otto · Otto · Conteúdo", sem "sobre o ambiente". Não há conversa própria do ambiente.
4. **Prova:** `proto-equipe-conversas.png` (1ª linha "Conteúdo · Otto · Conteúdo · sobre o ambiente") × `nosso-equipe-conversas.png` (1ª linha "Conversa com o Otto · Otto · Conteúdo"); `proto-conversa.png` × `nosso-conversa.png` (o nosso painel "sobre Conteúdo" mostra as mensagens da conversa direta).
5. **Severidade:** 🟡 (o contexto do objeto se mistura com a conversa direta, e o histórico por assunto perde a conversa do ambiente).
**Conferido:** a A1f §6 registra que **abrir um especialista** (Início com um selecionado, "Conversar") retoma a conversa direta mais recente, "como o `_agentThread`". O botão do ambiente, no protótipo, não usa `_agentThread`: usa `_openCtx('env')`. Esse caso não está na A1f §3/§5, na A1a §5 nem na A1b §4. A A1b #19 trata só do contexto "Resumo" dos cartões de Projetos.

### 3. Cabeçalho da conversa de objeto mostra o papel do agente · ℹ️

1. **Tela e elemento:** painel de conversa, `.ps-cvh-n`.
2. **Protótipo:** `<b>{{conv.title}}</b><sc-if value="{{conv.isDm}}"><span class="ps-cvh-r">{{conv.role}}</span></sc-if>` (L5504): o papel só entra na conversa direta. Na captura: "Otto" sozinho.
3. **Nosso:** "Otto **Conteúdo**", porque `ConversationPanel.tsx:426` põe o papel sempre que há agente e não é a Sala.
4. **Prova:** `proto-conversa.png` × `nosso-conversa.png` (canto superior da coluna da direita).
5. **Severidade:** ℹ️.
**Conferido:** não consta da A1f §3 (itens "Conversa"), da A1a §5 nem da A1b §4.

### 4. Início · nome acessível dos resumos · ℹ️

1. **Tela e elemento:** Início, os quatro resumos (botões "Trabalhos", "O Squad percebeu", "Modo Autônomo"…).
2. **Protótipo:** `const verb = (k) => (openK === k ? '. Recolher detalhes' : '. Ver detalhes');` (L8356). Extraído do DOM: "[Trabalhos: Nada em andamento. Ver detalhes]".
3. **Nosso:** "[Trabalhos: Nada em andamento, 1 aguarda você. Ver mais]". O catálogo `apps/web/messages/pt-BR/home.json` tem `"open": ". Fechar"` e `"closed": ". Ver mais"`.
4. **Prova:** `diff-primeiro-acesso.txt`, bloco `inicio` (texto extraído dos dois DOMs).
5. **Severidade:** ℹ️ (só leitor de tela).
**Conferido:** fora das listas registradas.

### 5. Início · nome acessível das sugestões e do palco · ℹ️

1. **Tela e elemento:** faixa de sugestões do Início (`hm-chip`).
2. **Protótipo:** `aria: c.t + '. Preenche o pedido; ' + who` (L8296). Extraído do DOM: "Preenche o pedido; só a Kaia participa", "só o Otto participa", "Nexo, Bia e Kaia participam".
3. **Nosso:** "só Kaia participa", "só Otto participa", "**Nexo e Bia e Kaia** participam". Falta o artigo do agente, e a lista sai unida com "e" em vez de vírgula.
4. **Prova:** `diff-conta-em-uso.txt` e `diff-primeiro-acesso.txt`, bloco `inicio`.
5. **Severidade:** ℹ️ (só leitor de tela).
**Conferido:** a pergunta 5 da A1f e o item 12 da A1b falam do artigo do **negócio** ("a Miolo"), não do artigo dos agentes. A junção "e … e" não aparece em nenhuma lista.

### 6. Memória · "De onde vem" mostra só as fontes que existem no banco · ℹ️

1. **Tela e elemento:** Memória da Marca, dossiê, pílulas "De onde vem".
2. **Protótipo:** as fontes do `SRC5` aparecem mesmo sem conexão, com o estado. No primeiro acesso: "Cadastro" (`{ id: 'onb', … t: 'Cadastro', h: 'contado por você' }`, L12786), "Site: Não conectada", "Google Perfil: Não conectada", "Documentos: Não conectada". Na conta em uso são oito, com "Conversas e aprovações" (L12794).
3. **Nosso:** duas pílulas, "Onboarding e o que você contou" (rótulo que vem do seed, `supabase/seed.sql`) e "Instagram: Não conectada".
4. **Prova:** `proto-memoria.png` (primeiro acesso) × `nosso-memoria.png`; nomes acessíveis em `diff-primeiro-acesso.txt`, bloco `memoria`.
5. **Severidade:** ℹ️ (o dado vem do seed/API, não da tela; a pergunta é se o seed ganha as fontes não conectadas e o rótulo "Cadastro").
**Conferido:** o item 6 da A1b trata do **subtítulo e da descrição** de cada fonte (data e permissões), não da quantidade de pílulas nem do rótulo da fonte "você". O item 1 trata da descrição e da síntese do dossiê.

## Telas conferidas sem diferença nova

As diferenças de dado (quantidade, nomes de trabalho, textos do seed) e as já registradas foram descartadas.

- **Início (Home V3):** palco, título, campo, "Quem participa", sugestões e os quatro resumos com o mesmo desenho. As diferenças restantes ("conhecer Miolo", `seunegocio.com.br`, lista de sugestões) já estão nas perguntas 4, 5 e 8 da A1f.
- **Barra lateral:** grupos, ordem, contadores e dicas. O que muda está registrado: o "Demo" e o "Guia do protótipo" na A1f §3; o ponto de mensagens novas e de notificação, como dado (D), também na A1f §3; "Miolo · Pinheiros" na pergunta 2; "Growth" na A1a item 11. Já "Kiwi, Growth Marketing" no palco e "Escolher só ela" seguem a decisão do dono (papel Growth Marketing; "a Kiwi").
- **Conteúdo · Otto** (primeiro acesso): mesmos títulos, botões e vazios. A faixa "Revisar a legenda" está na pergunta 9 da A1f.
- **Faixa "Precisa de você"** e o "+N": como na A1a item 4. O texto está registrado.
- **Projetos · Nexo:** topo, "Roadmap de projetos", "Seu Squad está trabalhando", "Próximos marcos", Quadro, Lista, Biblioteca e filtros. O que muda está na A1b, itens 13 a 17 ("Kiwi" com "a" segue a decisão de 15/10).
- **Detalhe do trabalho e Histórico:** o que muda está registrado na A1f §3 (pilha, "Mais ações", cartão Branco, "Pedir nova proposta" e "Cancelar trabalho") e na A1b item 18. "v2 hoje" e "Comparar" dependem de haver duas versões, e o seed tem uma.
- **Memória da Marca:** dossiê, "O squad percebeu" com Confirmar, Corrigir e Descartar, abas e "Tudo o que o squad sabe". O que muda está na A1b, itens 1 a 12.
- **Minha Equipe & Conversas:** cabeçalho, abas, busca e filtros por rosto iguais (fora o achado 2).
- **Bia, Kaia, Kiwi, Max e Íris:** os vazios batem com o primeiro acesso da V4.6. Ficam fora o artigo "Miolo" (A1b item 12) e os vazios novos de Kaia e Kiwi (A1b itens 24 e 25). As únicas diferenças restantes são nomes acessíveis a mais nos filtros da Kaia e nos botões do Max, sem mudar o texto visível.
- **Modo Autônomo:** igual ao primeiro acesso. Só muda "no tom de Miolo" (A1b item 12).
- **Barra "Plano Squad · créditos do mês":** está no menu da conta. O selo de provisório é o item 11 da A1b.

**Não conferido nesta rodada** (fica para outra passada, sem achado):

- **Status vivo dos sete:** exige um run em curso, e não enviei mensagem.
- **Cartão "Material · vN" na mensagem:** o seed não tem mensagem de entrega na conversa.
- **Memória:** conflito, "Ver pelo especialista" e a aba "Conexões e fontes" ficaram de fora. A A1b já os capturou lado a lado.

## Arquivos

`cap.mjs` (captura e extração; `node ../../docs/parciais/h1/prototipo/cap.mjs <proto|nosso> [uso|primeiro]` a partir de `apps/web`), `compara.mjs` (diferença por tela), `trecho.py` (trechos do protótipo), `diff-*.txt` (saída do comparador) e quatro pares `proto-*.png` × `nosso-*.png`. O par `inicio` é a referência visual do Início, sem achado visual.
