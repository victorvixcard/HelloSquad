# Notas de telas e navegação · Product UI V4.6 (X1)

Origem: extratos de `design/handoff-v4.6/product-ui/ProductUIV4.dc.html` em `docs/parciais/x1/out/pui/` (o HTML não foi aberto). Convenção: "Rótulo" (L1234) = literal visível e linha de origem no HTML; `código` = identificador interno. "Não aparece no protótipo" = sem registro nos extratos lidos. O CSS não foi extraído: efeitos visuais (caixa alta, rótulo oculto na barra recolhida) não podem ser confirmados. "Conta em uso" = `uso`; "Primeiro acesso" = `primeiro`.

## 1. Camadas, cenários e conta fictícia

| Camada | Linhas | Efeito em navegação e telas |
|---|---|---|
| V3 (classe base) | L6408–9587 | Navegação antiga (Início, Trabalhos, Modo Autônomo, Memória da Marca, Resultados, Minha Equipe + grupo "Conversar com o Squad", L8167–8217). Ainda valem: `_vHome` (L8247), `_vTeam` (L9391), `_vChats` (L9569), `_vWorks` (L8827), conta, créditos e sino. |
| V4 | L9589–10962 | 11 ambientes (`ENVS`, L9597), barra por agentes (`_vSide`, L10503), `_go` redireciona destinos antigos (L9723), identidade (`_vId`, L10569). |
| V4.1 | L10964–11308 | Roadmap em colunas (L11012), calendário com estado na peça (L11148), Resultados (L11200), painel contextual (L11268). |
| V4.2 | L11310–11770 | Kiwi vira "Growth" (L11318); catálogo de capacidades (`CAP_G` L11337, `CAPX_L` L11346). |
| V4.3 | L11771–12217 | Kaia (L12107) e Kiwi (L12145) definitivos; catálogo compacto em popover com busca (`_capCat`, L11880). |
| V4.4 | L12218–12694 | Bia (L12528) e Max (L12615) definitivos. |
| V4.5 | L12695–13840 | Páginas Memória da Marca (L13611) e Modo Autônomo (L13511); faixa "Precisa de você" (L13760–13831). |
| V4.6 | L13841–13962 | Padronização de status, "<agente> percebeu", rosto na faixa (L13864). "O Início não é tocado" (L13845). Alguns ajustes V4.6 estão no próprio código V4 (ex.: largura do painel, L10444). |

Regra de precedência: vale a definição de maior linha. Exemplos: `_vProj` L10578 → L11012; `_vCont` L10690 → L11148; `_vRs` L10791 → L11200; `_vEnv` L10857 → L11294 → L11641; `_vCap` L11608 → L11911; `_vNd5` L13822 → L13864. `_vSide` tem versão V3 (L8144) e V4 (L10503); vale a V4.

Cenário e estado:
- Prop `cenario` (`uso` padrão, `primeiro`) em `pui_meta.json`; `_setScen` (L7965) recria o estado com `initState(scen)` (L6330); `uso = scen !== 'primeiro'` (L6331). Troca em uso: botão "Demo" (§6).
- Conta (`ACCOUNT`, L5819): Marina, "dona da Miolo", negócio "Miolo", "Padaria · Pinheiros". Hoje no protótipo: segunda, 12/10/2026 (L6374), 10:24 (L6404).
- Estado comum (L6334–6369): `view: 'home'`, conversa fechada (`cv.mode: 'off'`), `sideMin: null`, 1440×900, `works.view: 'Quadro'`, `res.period: 'Mês'` e `res.kpi: 'orders'`, `cont.view: 'Semana'`, `teamTab: 'Equipe'`, `eqSel: 'leaf'`, `eqTab: 'Agora'`.

| Estado em `initState` | Conta em uso | Primeiro acesso |
|---|---|---|
| Post do Dia Mundial do Pão (`post`) | `review`, v1 (10/10) e v2 (hoje, só a data mudou) (L6342) | `none` (L6351) |
| Campanha de Natal (`camp`) | `production`, 3 de 5 peças, "os dois" (L6352) | `none` |
| Planejamento semanal (`rot`) | `active` desde 28/09, "3 posts por semana", quinta (L6353) | `none` |
| Modo Autônomo extra (`auto.extra`) | `r-res` ativa desde 01/10 (L6354) | vazio |
| Memória (`memItems`) | 24 itens (L6151–6174; 2 em `hypo`: `m-data`, `m-l2`) + V4.5 (`MEM5_ADD`, L12759) | 3 do cadastro: Nome, Segmento, Cidade (L6178–6180) |
| Arquivos da Memória | 4 (Guia da marca, Logo Miolo, Fotos da loja, Cardápio, L6360) | nenhum |
| Conversas (`threadsFor`) | 9 conversas; `leaf` com 1 não lida (L6307, L6327) | `coord` "Boas-vindas" (1 não lida) + apresentações dos outros 6 com `act: false` (L6279–6284) |
| Sino | 4 notificações, ponto até abrir | 1 notificação, sem ponto |
| Créditos | "64%" | "4%" |

## 2. Barra lateral (final V4.6)

### 2.1 Topo
- Marca "HelloSquad" (L4541; `nav` com aria-label "HelloSquad", L4539).
- Botão "Demo" ao lado do logotipo (L4542, classe `ps-demo`). O texto no código é "Demo" (se aparece em caixa alta, vem do CSS). `title` = "Protótipo · conta em uso" ou "Protótipo · primeiro acesso" (L10482); `aria-expanded` acompanha o guia. Abre/fecha o "Guia do protótipo" (§6).
- Botão de recolher (ícone de painel, L4543): "Recolher a barra lateral" / "Expandir a barra lateral" (L10542).

### 2.2 Grupos e itens (ordem exata)

| Grupo (L) | Item (rótulo, L) | Id | Agente (chip) | Ao clicar | Contador / ponto |
|---|---|---|---|---|---|
| "Principal" (L10530) | "Início" (L10531) | `home` | não | `_go('home')` | não |
| | "Sala do Squad" (L10532) | `room` (thread `squad`) | não | `_openConv('squad', {mode:'full'})` | ponto de mensagem nova |
| "Seu squad" (L10534) | "Projetos" (L9599) | `proj` | Nexo | `_go('proj')` | número = decisões pendentes |
| | "Estratégia" (L9600) | `strat` | Bia | `_go('strat')` | não |
| | "Marca & Criação" (L9601) | `brand` | Kaia | `_go('brand')` | não |
| | "Conteúdo" (L9602) | `cont` | Otto | `_go('cont')` | não |
| | "Growth" (L11318; era "Mídia", L9603) | `media` | Kiwi | `_go('media')` | não |
| | "CRM" (L9604) | `crm` | Max | `_go('crm')` | não |
| | "Resultados" (L9605) | `res` | Íris | `_go('res')` | não |
| "Gestão" (L10535) | "Modo Autônomo" (L10536) | `auto` | não | `_openAuto(null)` | número suave = rotinas ativas |
| | "Memória da Marca" (L10537) | `mem` | não | `_go('mem')` | número suave = informações a confirmar |
| | "Minha Equipe & Conversas" (L10538) | `team` | não | `_go('team', {teamTab: s.teamTab \|\| 'Equipe'})` | ponto de mensagens novas |

- Ordem de "Seu squad" = `ENV_SQUAD` (L9610) = ordem dos agentes `ORDER` (L5626). Cada item de "Seu squad" mostra o rótulo + um chip discreto (avatar 16 px + nome, L4548): expressão "big" se o agente aguarda você, "sleep" se pausado, senão "oval" (L10525). Em Conta em uso: Kaia "big" (post em revisão) e Max "sleep" (reativação pausada) (L8051–8057).
- "Sala do Squad" não é ambiente: não está em `ENVS` (11 chaves: `home, proj, strat, brand, cont, media, crm, res, auto, mem, team`, L9597–9609). É a conversa `squad` (`TH_META.squad`, L6251) aberta em tela cheia por cima da página.
- "Modo Autônomo" usa um glifo de interruptor (`sb-sw is-nav`, L10536) em vez de ícone; só colore quando é a página aberta (comentário L4538). Rótulo > 20 caracteres ganha `is-long` ("Minha Equipe & Conversas", L10520).
- Tooltip (`data-tip`): `rótulo · Agente · say`; aria-label: `rótulo, com Agente, say` (L10521).

### 2.3 Regras dos contadores e pontos
| Item | Regra (L) | `say` (tooltip/aria) | Conta em uso (inicial) | Primeiro acesso |
|---|---|---|---|---|
| Projetos | `needN = needs.length` (L10509); `_needs` (L8033) soma até 5 tipos: post em revisão, publicação a decidir, pergunta do Nexo, conceito, combinado do planejamento | "N aguarda você" / "N aguardam você" (L10534) | 1 (post v2) | sem contador |
| Modo Autônomo | `act` = responsabilidades `active` de `_resps` (L10505–10506); pausadas não entram no número | "N rotina ativa" / "N rotinas ativas" + ", N pausada(s)"; ou "pausado"; "um combinado aguarda você"; "não configurado" (L10507) | 2 (planejamento semanal + leitura de resultados) | sem contador, "não configurado" |
| Memória da Marca | `memN` = itens com `st === 'hypo'` (L10508) | "N informação para confirmar" / "N informações para confirmar" (L10537) | 2 | 0; sobe para 5 depois de "Ler o site" (L6185–6189) e 6 com o Instagram (L6192) |
| Sala do Squad | ponto se `thread.squad.unread > 0` e não está aberta (`unreadOf`, L10511) | "o squad está trabalhando" (status `work`/`live`) ou "todos os especialistas" (L10514, L10532) | sem ponto | sem ponto |
| Minha Equipe & Conversas | ponto se qualquer thread diferente de `squad` tem `unread > 0` e não está aberta (L10515) | "mensagens novas" (L10538) | ponto (Kaia, L6307) | ponto (Nexo, L6280) |

- `unread` sobe quando um especialista fala (`msg.k === 'a'`) numa conversa que não está aberta (L6555); zera ao abrir a conversa (L6476).
- Item selecionado (`cur`, L10512–10513): `_navOf` (L9737) devolve o ambiente da página; em detalhe de trabalho (`view: 'work'`) mantém o ambiente de origem (`back`) ou "Projetos". Com conversa em tela cheia: sala → "Sala do Squad"; conversa de contexto → mantém a página; conversa direta ou em grupo → "Minha Equipe & Conversas". Painel lateral não muda o item.
- Destinos antigos (L9725–9727): `works` → `proj`; `chats` → `team` com aba "Conversas"; `team` sem aba → "Equipe".

### 2.4 Recolher e expandir
- `_sideToggle` (L6514) inverte `sideMin` e fecha popovers. `_isMin` (L6515): com `sideMin: null` (inicial), recolhe sozinho se a largura < 1100.
- Largura: 72 px recolhida, 256 px expandida (L10442). Recolhida, os itens ficam em ícone/chip com tooltip e aria-label (rótulo oculto é CSS, não extraído).

### 2.5 Pé da barra (conta, negócio, créditos, sino)
- Botão da conta (L4554): avatar "M" com iniciais do negócio, "Marina" e "Miolo · Pinheiros" (L10551). aria: "Conta, negócio e configurações. Marina, Miolo".
- Popover (diálogo "Conta, negócio e configurações", L4555): cabeçalho "Marina" / "dona da Miolo"; seção "Negócio" (L4557) com "Miolo" / "Padaria · Pinheiros" (marcado) e "Adicionar um negócio" / "Outra marca na mesma conta" (só toast "Vários negócios na mesma conta · demonstrativo", L10546); barra "Plano Squad · créditos do mês" com "64%" (uso) ou "4%" (primeiro) (L10548); itens "Minha conta", "Configurações", "Sair" (só toast "… · demonstrativo neste protótipo") e "Guia do protótipo" (abre o guia) (L10554–10557).
- Sino ao lado da conta: ver §5.

### 2.6 O que mudou da V3
Substituído: "Trabalhos" (agora dentro de Projetos), "Resultados" e "Minha Equipe" soltos, e o grupo "Conversar com o Squad" (sala, 7 agentes, recentes, "Todas as conversas"; L8206–8217). Mantido: badges de Modo Autônomo e Memória (`soft`, mesma regra), rodapé de conta, créditos e sino, e o gesto de recolher.

## 3. Cabeçalho do ambiente (camada de identidade) e faixa "Precisa de você"

Não há cabeçalho global no palco; cada ambiente do squad abre com `<header class="v4-id">` (`_vId`, L10569; usado em L10674, L11109, L10764, L10843, L12134, L12160, L12555, L12645): avatar do especialista (expressão por estado e "pensando" se está trabalhando, L10571), título, linha "**Nome** descrição", catálogo "O que pedir…" (§4) e botão escuro "Conversar com …". O status curto (`st`) é calculado mas não é exibido.

| Ambiente | Título (h1) | Linha de identidade (`ENVS[].d`) | Botão |
|---|---|---|---|
| `proj` | "Projetos" | "Nexo organiza os projetos da Miolo e te chama quando a decisão é sua." (L9599) | "Conversar com Nexo" |
| `strat` | "Estratégia" | "Bia encontra onde está a oportunidade da Miolo." (L9600) | "Conversar com Bia" |
| `brand` | "Marca & Criação" | "Kaia dá forma à marca da Miolo em cada peça." (L9601) | "Conversar com Kaia" |
| `cont` | "Conteúdo" | "Otto cuida do calendário, das legendas e do que a Miolo fala em cada canal." (L9602) | "Conversar com Otto" |
| `media` | "Growth Marketing" (L11319; barra: "Growth") | "Kiwi cuida do crescimento da Miolo: busca, anúncios e mais visitas virando encomendas." (L11320) | "Conversar com Kiwi" |
| `crm` | "CRM" | "Max cuida de quem já é cliente, sempre com consentimento." (L9604) | "Conversar com Max" |
| `res` | "Resultados" | "Íris lê os números da Miolo e diz o que fazer com eles, sem inventar causa." (L9605) | "Conversar com Íris" (V4.1, L11202; a V4 tinha "Analisar com Íris", L10572) |

Rótulo do botão: `'Conversar com ' + nome` (L10572). Início, Modo Autônomo, Memória da Marca e Minha Equipe & Conversas não têm identidade de agente.

### 3.1 O que "Conversar com …" abre
- `_openCtx('env', env)` (L10572, L9831) cria/reabre a conversa de contexto `x-env-<env>`: painel à direita se a largura ≥ 1080, senão tela cheia (L9841). Painel de 380 px (≥ 1360) ou 364 px (L10444). Nos ambientes piloto (`PILOTS`: `proj, cont, res, brand, media, strat, crm, mem, auto`, L9616, L11779, L12226, L12700) o painel abre por cima da página quando sobrariam < 760 px (L10447). Esc fecha o painel (L9753).
- Cartão "Conversando sobre" (TSV L5506): tipo "Ambiente" (L10902), nome do ambiente, meta "<Nome> <descrição>" (L9777), link "Ver <Ambiente>" (L10901), "Conversa sobre o ambiente" (L10907). Campo: "Mensagem para a Bia…" (L10913). Rótulo das sugestões: "Pergunte à Bia" (L11276).
- Primeira fala do especialista: `_cxEnvFirst` (L10195). Exemplos: Projetos "Hoje tem uma decisão sua: …"; Conteúdo em Primeiro acesso "Ainda não cuido do calendário da Miolo. Posso planejar os conteúdos toda semana, no Modo Autônomo, …"; Resultados em Primeiro acesso "Ainda não tenho números da Miolo para ler. …".
- Sugestões (L9778): Projetos "O que precisa de mim esta semana?", "Qual projeto pede mais atenção?", "Quero começar um projeto novo."; Conteúdo "Como está o plano da próxima semana?", "Que conteúdos funcionaram melhor?", "Quero melhorar meu Instagram."; Resultados "Como foi a última semana?", "O que mais trouxe encomendas?", "O que devo acompanhar no Natal?"; demais ambientes: as 3 primeiras `asks` do agente (`AG`, L5627; Kiwi atualizado em L11326).

### 3.2 Faixa "Precisa de você" (V4.5, refinada na V4.6)
- Abaixo do cabeçalho de Projetos, Estratégia, Marca & Criação, Conteúdo, Growth, CRM, Resultados, Modo Autônomo e Memória da Marca. Nunca no Início (L13845). Sem pendência, sem faixa (L13763). aria: "Precisa de você" + ": N" (L13831).
- Linha: rosto + nome do agente ("Squad" na Memória, L13868) + " · " + tipo (`NDK5`, L13765): "Para você revisar", "Para você aprovar", "Para você autorizar", "Para você decidir", "Para você confirmar", "Para você responder", "Para você reconectar", "Em seguida"; título, subtítulo e link de ação. Mostra a 1ª; as demais abrem sob "+N" / "Fechar" (L13828). "Em seguida" nunca abre a faixa sozinho (L13824).
- Fontes (`_nd5Items`, L13776): Projetos = as pendências globais (iguais às do Início: `_nd5Global`, L13770) + 1 "Em seguida" ("Ver no roadmap"); Estratégia = plano v2 ("Revisar o plano") e diagnóstico entregue ("Ler o diagnóstico"); Marca & Criação = v do post ("Revisar e aprovar a v2"); Conteúdo = "Peça de sexta: Dia Mundial do Pão" ("Revisar a peça"), publicação, combinado e "Plano da semana 43" ("Revisar o plano"); Growth = "Teste de anúncios perto da loja" ("Ver a proposta"), "Google Perfil" ("Reconectar (simulação)") e "Plano de anúncios de Natal" ("Conversar sobre o plano"); CRM (só uso) = "Mensagens da reativação" ("Revisar as mensagens") e "Envio da reativação" ("Ver a autorização"); Resultados = a hipótese `m-l2` ("Ver na Memória"); Modo Autônomo = aprovações, autorizações, falhas e memória; Memória = "N sugestões, N em conflito, N desatualizado" ("Revisar").

## 4. Catálogo "O que você quer fazer com …" (nos sete ambientes e nas conversas)
- Botão no cabeçalho (L4773): ícone + "O que pedir" + " à Bia" / " ao Nexo" / " à Kaia" / " ao Otto" / " ao Kiwi" / " ao Max" / " à Íris" (L11917). aria: "Ver o que dá para pedir …" / "Fechar o que dá para pedir …" (L11918).
- Popover (diálogo): rosto + "O que você quer fazer com a Bia?" (L11893) + "A Bia conduz o briefing na conversa, sem formulário."; busca (aria "Buscar o que pedir") com placeholder "Buscar: " + exemplos por agente (L11894): "projeto, aprovação…", "diagnóstico, concorrentes…", "carrossel, cartaz, vídeo…", "post, artigo, calendário…", "SEO, campanha, teste…", "jornada, e-mail…", "relatório, comparar…"; grupos (`CAP_G`) com cartões rótulo + descrição + estado "trabalho criado" / "N trabalhos" / "em conversa" (L11886); vazio "Nada com “…”. Escreva na conversa o que você precisa: a Bia entende." (L11895); rodapé "Quando o pedido envolve outra especialidade, a Bia chama quem precisa na mesma conversa." (L11896). Enter escolhe o 1º; Esc fecha (L11898).
- Escolher uma capacidade fecha o popover e chama `_openCap(id)` (L11888, L11938): abre uma conversa de pedido (`x-cap-<id>`) com a 1ª mensagem do usuário = `ask`, abertura do especialista = `q`, respostas rápidas `o`, convidados `j`/`jt` e, ao escolher, um trabalho `w` ligado a um projeto (L11333–11336). Pedido concluído não reabre: novo pedido vira nova conversa e novo trabalho (L11944).
- Dentro de qualquer conversa: o mesmo catálogo do especialista da conversa (a Sala usa o do Nexo), botão "O que mais pedir …" (L11922–11928).
- Lista completa de capacidades: §16.

## 5. Notificações (sino)
- Sino no pé da barra (L4563), aria "Notificações" + ", há novidades" (L10562); ponto vermelho só em Conta em uso e enquanto `notifSeen` for falso (L10561). Abrir marca como visto.
- Popover "Notificações" (L4564): avatar do agente, título em negrito, subtítulo, hora. Clicar leva ao destino (`_notifGo`, L7889): `work:` → detalhe do trabalho; `auto:` → Modo Autônomo (responsabilidade); outro → `_go(view)`; `chat` → conversa completa com o Nexo.

| Id | Agente | Título | Subtítulo | Hora | Destino |
|---|---|---|---|---|---|
| n1 | Kaia | "A Kaia entregou a v2 do post" | "Post do Dia do Pão · aguarda você" | 08:40 | `work:w-post` |
| n2 | Otto | "“Fornada de segunda” foi publicado" | "O Instagram confirmou às 09:01" | 09:01 | `auto:r-plan` |
| n3 | Íris | "Leitura semanal pronta" | "Semana de 05 a 11/10 · 34 encomendas" | 09:00 | `res` |
| n4 | Bia | "A Bia começou a ler as avaliações" | "126 avaliações do Google" | 08:12 | `work:w-aval` |
| n0 (Primeiro acesso) | Nexo | "Boas-vindas ao HelloSquad" | "O Nexo quer saber o objetivo da Miolo" | 10:02 | `chat` |

Fonte: `NOTIFS` (L6070), lista de Primeiro acesso em L10563. Não há contador numérico; novas notificações geradas durante o uso não aparecem no sino (só toasts, `_notifyIfAway`, L6591).

## 6. Botão "Demo" e Guia do protótipo
- "Demo" (L4542) e o item "Guia do protótipo" (L10556) abrem o mesmo painel (L5604–5612, aria "Guia do protótipo"): cabeçalho "Protótipo · conta em uso · dados fictícios" (L5606), "Fechar o guia", seletor "Conta em uso" / "Primeiro acesso" (aria "Cenário", L5607), jornadas com botão "Começar" e rodapé "Nada é publicado, enviado ou pago." + "Reiniciar" (volta ao estado inicial do cenário, `_setScen`).
- Jornadas: "1 · Entrega pontual" ("Peça um post à Kaia, peça um ajuste e aprove.") abre a conversa completa com a Kaia com o pedido do Dia Mundial do Pão preenchido (L5800, L7978); "2 · Campanha na Sala do Squad" ("O Nexo monta o squad; a Bia propõe o conceito.") abre a Sala com "Quero uma campanha de Natal para vender mais panetones." (L5801, L7985); "3 · Modo Autônomo" ("Delegue o planejamento semanal numa conversa, com limites claros.") leva à página Modo Autônomo e abre a conversa com o Nexo (painel ao lado se a largura ≥ 1080) com "Quero que vocês planejem meus conteúdos toda semana." no campo (L13279–13285); "4 · Memória da Marca" ("Peça à Kaia para destacar o preço, confirme a preferência e rode o planejamento semanal.") abre a Kaia com "Kaia, aumenta o destaque do preço na peça de encomendas do panetone." (L13751–13755).

## 7. Início (`home`)
- Entrada: item "Início"; é a tela inicial. Aprovada e congelada (V3 R1.2); a V4.6 não a toca (L13845). Não tem cabeçalho de agente nem faixa "Precisa de você".
- Visão protagonista (uma composição centralizada): palco do squad (os 7 agentes, decorativo, `aria-hidden`, reage ao texto e ao hover/seleção, L7464), saudação "Hello, Marina." (L8453), pergunta "Com o que vamos trabalhar hoje?" (L4583), campo de pedido.
- Campo de pedido: placeholder "Peça ao squad. O Nexo organiza quem faz…" (ou "Escreva para a Kaia…" / "Escreva para Bia e Kaia…", L8260); "Anexar" com menu "Foto ou vídeo", "Arquivo", "Da Memória da Marca", "Peça da Biblioteca" (L10478); Enter envia, dica "↵ enviar" (L4600).
- "Quem participa": botão "Squad" + 7 avatares (Nexo, Bia, Kaia, Otto, Kiwi, Max, Íris) e legenda: "Sala do Squad" / "Conversa direta com a Kaia" / "Bia, Kaia e Otto · conversa em grupo" / "N especialistas · conversa em grupo" / "Pelo menos um especialista participa" (L8255). Envio (L7059): 7 → Sala do Squad; 1 → conversa direta; 2 a 6 → conversa em grupo demonstrativa; sempre em tela cheia.
- Faixa de sugestões (chips que correm, param sob o cursor, arrastáveis): escolher um chip só preenche o campo e marca quem participa, sem enviar (L5820, L7087).
  - Conta em uso (`HOME_SUG`, L5821): "Planejar meus próximos conteúdos"; "Analisar os resultados da semana"; "Criar uma promoção para esta semana"; "Revisar minha identidade visual"; "Entender melhor meus clientes"; "Preparar um lançamento"; "Reativar clientes que sumiram"; "Quero melhorar meu Instagram".
  - Primeiro acesso (`HOME_SUG_FIRST`, L5831): "Criar um post para o Dia Mundial do Pão"; "Planejar meus próximos conteúdos"; "Entender melhor meus clientes"; "Preparar um lançamento"; "Criar uma promoção para esta semana"; "Quero melhorar meu Instagram".
- Controle de dobra: "Recolher resumos" / "Mostrar resumos" (L8310; aria "Recolher resumos e ficar só com o squad", L8311). Recolhido, o squad fica sozinho no centro e um ponto avisa se há decisão pendente (L8309).
- Quatro resumos abaixo (um card aberto por vez, `_homeCard`, L7214):
  1. "Resultados" (só em uso, L8329): período "05 a 11/10"; seletor "Encomendas" / "Visitas" / "Alcance" (`HOME_KPIS`, L5841); número com variação; leitura "Íris: …" (`IRIS_SAY`); gráfico de 12 semanas com a marca "bastidores". Botões "Abrir Resultados" (→ Resultados em "Semana", indicador escolhido, L8349) e "Conversar com a Íris" (→ conversa completa com a Íris, contexto "Posts de bastidores · setembro", L7012–7016).
  2. "Para o squad conhecer a Miolo" (só em Primeiro acesso, L4644): contador "N de 3". Passo "Mande o site" ("O Nexo lê e separa o que for útil."): campo (placeholder "miolo.com.br") + "Ler o site" → "Nexo lendo as páginas do site" → "6 páginas lidas · 5 informações para confirmar" (5 sugestões na Memória, L6185). Passo "Conecte o Instagram" ("Conectar não autoriza publicar."): "Conectar" → "Íris conectando ao Instagram" → "@miolo.padaria conectado" + selo "simulação" (L7918–7927). Passo "Conte o resto ao Nexo" ("Objetivo, público, o que vende mais.", L4658): "Conversar" → conversa completa com o Nexo, que pergunta o objetivo com 3 respostas ("Vender mais encomendas", "Trazer gente nova para a loja", "Fortalecer a marca", L6280); a resposta grava o objetivo na Memória e o passo passa a mostrar "Objetivo: …" (L7928).
  3. "Trabalhos": "N em andamento" / "Nada em andamento" + "1 aguarda você" / "N aguardam você" (L8364–8365). Aberto: "Nexo · Hoje, uma decisão é sua" / "Hoje, duas decisões são suas" (L8368, `NUMW` L5839); até 3 pendências com botão de 1 palavra ("Revisar", "Decidir", "Responder", L8369); "Em andamento" (até 3, com título, status, barra e prazo); vazio "Nada em produção agora. Peça algo ao squad e o Nexo organiza quem faz."; rodapé "Ver todos os trabalhos" → Projetos (L8372, L9725). Pendências abrem: post e publicação → detalhe do trabalho; pergunta do Nexo e conceito → Sala do Squad; combinado → conversa com o Nexo ou Sala (L8457–8461).
  4. "O Squad percebeu": "N informação para confirmar" / "Tudo revisado" / "Nada para confirmar agora" (L8395). Aberto: "O squad notou e quer confirmar com você antes de guardar:" e até 3 itens (assunto, valor, fonte) com "Aceitar" (guarda na Memória) e "Recusar"; depois "Na Memória" / "Recusada" (L8408). Vazio: "Quando o squad perceber algo novo sobre a Miolo, aparece aqui para você confirmar." (uso) ou "Quando o Nexo ler o site, o que ele encontrar aparece aqui para você confirmar." (primeiro). Rodapé "Ver a Memória da Marca" / "Ver todas na Memória da Marca" (L8411).
  5. "Modo Autônomo": resumo "N rotinas ativas · próxima <dia, data>" / "Pausado · nada novo é preparado" / "Um combinado aguarda você" / "Delegue o que se repete" (L8423–8428); linhas com interruptor ("Pausar esta rotina" / "Reativar esta rotina", L8441) ou botão "Revisar" (combinado proposto); vazio "Nada configurado ainda. Delegue o que se repete: o squad cuida sozinho e pede a sua aprovação quando precisa." + "Configurar uma rotina"; rodapé "Ver Modo Autônomo".
- O 1º card muda com o cenário: "Resultados" em Conta em uso (`home.res.has = uso`, L8329) e "Para o squad conhecer a Miolo" em Primeiro acesso (`home.isFirst`, L8453); os outros três são comuns, com textos de vazio próprios.

## 8. Sala do Squad
- Entradas: item da barra; "Abrir a Sala do Squad" em Minha Equipe & Conversas (L4724); Início com os 7 selecionados; "Pedir na Sala do Squad" e "Conversar na Sala do Squad" nos detalhes (L5064, L5036); "Começar pela Campanha de Natal" em Projetos; pendências de pergunta e conceito.
- Tela: conversa em tela cheia (`_vConv`, L8500; `isRoom`). Título "Sala do Squad" (L8522); subtítulo = assunto ("Campanha de Natal" em uso) ou "Pedidos grandes" (L8523); status "todos os especialistas · o Nexo coordena" ou o status ao vivo (L8511). "Quem está na sala": "7 especialistas" / "Na Sala do Squad" (L8524) com "Chamar" (insere @Nome) e "Conversar" (conversa direta) por especialista (TSV L5509). Controles: "Mostrar o contexto", "Expandir a conversa", "Abrir ao lado da tela", "Fechar a conversa" (TSV L5515–5518).
- Conta em uso: histórico de 05/10 a hoje (L6286–6298): pedido da campanha, pergunta do Nexo ("site, loja ou os dois?"), conceito da Bia aprovado em 08/10, andamento de Otto, Kiwi e Kaia (3 de 5 peças). Primeiro acesso: só "Esta é a Sala do Squad. Use para pedidos maiores, como uma campanha: eu organizo quem entra, cada especialista contribui na sua parte e eu te chamo quando a decisão for sua." (L6281); a conversa só entra no histórico depois de usada (`act: false`).

## 9. Projetos · Nexo (`proj`)
- Visão protagonista: "Roadmap de projetos" (L4778). Legenda "projeto", "marco", "previsto", "decisão sua"; eixo "Projeto" · meses/segundas · "hoje" · coluna "Próximo marco" (some se a largura útil < 860). Janela fixa 21/09 a 27/12 (L9675). Subtítulo: "<N> ativos · <N> pausado(s) · <N> decisão(ões) suas por perto" (L11115).
- Linhas em Conta em uso (`_projs`, L10106): "Campanha de Natal" (Nexo, meta 400 panetones em 20/12), "Planejamento de conteúdos" (Otto, contínuo), "Identidade visual da Miolo" (Kaia, 2 de 3 etapas), "Acompanhamento de performance" (Íris, contínuo), "Reativação de clientes" (Max, pausado). Faixa no tom do agente que conduz (L10974); marcos em formas; decisão em coral com "!".
- Clicar na linha ou no marco abre o detalhe inline (Esc fecha): "Objetivo", "Responsáveis", "Status", "Próximo marco", "Prazo", "Trabalhos pedidos neste projeto · N" e botões: ação da decisão (se houver, ex. "Revisar entrega"), "Conversar com Nexo sobre este projeto" (→ `_openCtx('proj', id)`) e o botão de abrir: "Abrir projeto" (Campanha, Reativação → detalhe do trabalho), "Ver em Conteúdo", "Ver em Marca & Criação", "Ver em Resultados" (L10130–10163).
- Abaixo, duas colunas: "Seu Squad está trabalhando" (até 2 linhas + "Ver mais N"/"Mostrar menos"; cada uma abre o trabalho; ícone "Conversar com Nexo" → resumo `working`) e "Próximos marcos" (até 3 + "Ver mais N"; data, título, agente; ícone "Conversar com Nexo" → resumo `next`) (L11126–11137).
- "Todos os trabalhos" ("Projetos, entregas pontuais e ciclos do Modo Autônomo, pela situação de cada um.", L4833):
  - Visões: "Quadro" (padrão), "Lista", "Biblioteca" (L9082). Filtro de tipo (menu "Tipo de trabalho"): "Todos os tipos", "Entregas pontuais", "Projetos" (L9083, L9111). Filtro por especialista: 7 avatares ("Mostrar só trabalhos com a Bia" / "Mostrar trabalhos de todos os especialistas", L9116–9119). Na Biblioteca o filtro de tipo dá lugar a "Tudo" / "Peças" / "Documentos" com contagem (L9114). "Limpar filtros" nos vazios.
  - Quadro: colunas "Precisa de você" ("Nenhuma decisão pendente"), "Em andamento" ("Nada em produção"), "Programados" ("Nada programado"), "Concluídos" ("Nada concluído ainda") (L8875). Cartão: prévia (post), tipo ("Entrega", "Projeto", "Modo Autônomo"), título, situação, equipe e ação ou próximo passo.
  - Lista: os mesmos grupos, colunas "Situação", "Responsável", "Data", "Próximo passo" (TSV L4872).
  - Biblioteca: seções "Peças" e "Documentos" com prévia, título, formato, equipe, data e tag (L9095). Ao entrar por "Ver na biblioteca" do detalhe do post, abre aqui (L10958).
- Primeiro acesso: "Nenhum projeto ainda" / "Projetos são pedidos maiores, como uma campanha. O Nexo monta o squad, organiza as etapas e te chama quando a decisão é sua." / botão "Começar pela Campanha de Natal" (→ Sala do Squad com o pedido preenchido, L11116); "Ninguém em produção agora. Peça algo e o Nexo organiza quem faz."; "Nenhum marco com data nos próximos dias."; em "Todos os trabalhos": "Nenhum trabalho ainda" + "Peça algo ao squad em Novo pedido. …" (L9103; o botão "Novo pedido" não aparece no template V4.6).

## 10. Estratégia · Bia (`strat`)
- Visão protagonista (Conta em uso): "Direção estratégica" (L5434): citação “Ser reconhecida como a padaria de fermentação natural do bairro.” (aprovada em 23/09), botão "Refinar com a Bia" (→ `bx-pos`), linhas "Objetivo principal", "Prioridade agora", "Público prioritário" (L12556).
- "Oportunidades identificadas" ("em ordem de relevância"): 5 itens numerados (01 Crescer nas buscas locais; 02 Explorar produtos sazonais; 03 Fortalecer o relacionamento com empresas; 04 Melhorar a percepção de valor; 05 Reativar clientes que sumiram), 3 visíveis e "Ver mais 2 oportunidades" / "Mostrar só as principais"; selo "Bia percebeu" + fonte no 1º (V4.6, L13885); "Relevância alta/média", "Indício · …", quem assume; botão "Conversar sobre isso" (→ conversa do objeto `bx-o*`) (L12530–12538).
- "Em análise" ("ainda sem conclusão"): "O que os clientes dizem da Miolo" (→ `w-aval`), "Padarias do bairro" (→ `w-conc`), "Natal: presentes para empresas" (→ `w-camp`); com "Preliminar" e o sinal parcial; o estado usa o mesmo selo "Em andamento" e, pelo comentário da V4.6, sem barra de progresso inventada (L13843, L13887).
- "Planos e diagnósticos" ("documentos da Bia, com versões e aprovação"): "Plano de marketing" (out a dez · v2; "Aguarda você" até aprovar), "O marketing da Miolo" (diagnóstico de setembro), "Campanha de Natal" (estratégia), "Padarias do bairro" (em andamento), e "Diagnóstico da Miolo" (outubro) depois do pedido "Analisar meu negócio" (L12546–12553). Clicar abre o documento em leitura editorial (template L5069): Panorama, Principais forças, Pontos de atenção, Oportunidades, Recomendações ("Transformar em ação", "Conversar sobre isso", "Feito"), Próximas ações; no plano: Objetivo, Público prioritário, Posicionamento, Prioridades, Iniciativas e horizonte ("Projeto", "Transformar em trabalho", "Trabalho criado", "Já em andamento", "Condicional"), Especialistas envolvidos. Ações do documento: "Aprovar o direcionamento" / "Aprovar o diagnóstico", "Pedir ajuste", "Baixar PDF" (simulação), "Versões", "Histórico" (L12604–12608). Aprovar não cria trabalhos (L12605).
- Primeiro acesso (`bia.first`): "Direção estratégica" / "A Bia ainda não conhece a Miolo o bastante para propor uma direção." / "Comece por um diagnóstico: ela usa o que você contar na conversa e pergunta o que faltar." / botão "Analisar meu negócio" (→ capacidade `b-diag`, L12564). Nada além disso é renderizado.

## 11. Marca & Criação · Kaia (`brand`)
- Visão protagonista: estúdio em duas partes (L5378). "Bancada da Kaia" (aria): faixa "Precisa de você" com a v do post ("Revisar e aprovar a v2") e "Em produção" com contador: "Post do Dia Mundial do Pão" (se a Kaia está fazendo nova versão), "Campanha de Natal · peças" ("3 de 5 prontas", tira de prévias, "Revisão das peças com você", "qui, 15/10"), pedidos novos feitos pelo catálogo e "Materiais da loja" (planejado, leva ao roadmap do projeto Identidade visual) (L12125–12132). Tags: "Em andamento" (V4.6, L13923) e "Planejado".
- "Criações" ("O que a Kaia criou para a Miolo, com o que está em produção primeiro. Os mesmos arquivos da Biblioteca."): filtros "Todas", "Redes sociais", "Carrosséis", "Identidade", "Promocionais", "Imagens", "Vídeo e motion" com contagem (`KA_CATS`, L11870); tiles = peças e documentos da Biblioteca em que a Kaia participa (`_wkLib`, L8696 e L12046), por exemplo "Fornada de segunda", "Carrossel: Do levain ao forno", "Identidade visual e guia da marca", "Fotos dos pães para o site" e "Reels: Como nasce o levain". Com um filtro ativo, o último tile é "Novo pedido": "Nova peça para as redes", "Novo carrossel", "Revisar a identidade", "Novo material promocional", "Editar imagens", "Novo vídeo" (`KA_NEW`, L11873), que abre a capacidade correspondente (`KA_CAP`, L11871). Tile de peça abre o trabalho (`_openWork`).
- Primeiro acesso: sem texto de estado vazio próprio no template; "Em produção" com contador 0 e galeria sem peças (a Biblioteca só tem peças depois de produzidas, L8696–8710). Ver §18.

## 12. Conteúdo · Otto (`cont`)
- Visão protagonista: "Calendário editorial" (L4923), com visões "Semana" (padrão), "Mês" e "Lista" (L10766). Navegação: "Semana anterior" / "Próxima semana" (ou "Mês anterior" / "Próximo mês"), intervalo ("<intervalo da semana> · esta semana" ou "<mês> de <ano>", L10768), botão "Hoje" quando fora do período atual; limites -2/+4 semanas e -1/+1 mês (L10769–10773). Legenda "aguarda você", "agendado", "publicado" (TSV L4927). Chip do Modo Autônomo: "Planejamento semanal" / "Planejamento semanal pausado" + "seg, qua e sex · próximo plano <data>" / "nada novo é preparado" / "aguarda a sua confirmação" (→ `_openAuto('r-plan')`, L10774–10777).
  - Semana: 7 colunas com "hoje" marcado; cartões de publicação (prévia, estado, "Reels", "+ 3 stories", título, "9h · Post"), espaços do plano ("Sugestão do Otto" ou "A definir") e eventos (plano da semana N; "Natal · abertura das encomendas", 26/10). Mês: grade "SEG … DOM", até 3 por dia + "+N". Lista: grupos "Semana N · intervalo" (+ "esta semana"), com data, prévia, título + canal, estado e quem (L10729–10732).
  - Itens em uso (`CAL_POSTS`, L9639): "Fornada de segunda" (05/10 e 12/10), "Como nasce o levain" (07/10, Reels), "Focaccia de alecrim" (09/10), "36 horas de paciência" (14/10, agendado), "Dia Mundial do Pão" (16/10, segue o estado da entrega pontual); planos das semanas 41 e 42 (feitos) e os seguintes no dia combinado no Modo Autônomo, a partir da semana 43 (`_planDays`, L10045); espaços das semanas seguintes (seg, qua e sex) aparecem como "A definir" ou "Sugestão do Otto" (L10081–10092).
  - Item selecionado (inspetor; Esc ou botão fecha): estado, data ("sex, 16/10, 9h · Instagram · Post 4:5"), título, "Legenda do Otto" (+ "nova"), "Quem", "Origem", "Stories", "Desempenho". Botões: decisões em escuro ("Aprovar v2", "Autorizar publicação", "Agora não"), "Conversar com Otto sobre este conteúdo" / "… esta data" / "… este plano" / "… este dia" (→ `_openCtx('post', id)`) e links "Abrir entrega", "Analisar com Íris", "Ver no Modo Autônomo", "Abrir a Campanha de Natal" (L10739–10754, L11162–11167).
- Abaixo: "Próximas publicações" (até 3 prévias; vazio "Nada agendado por enquanto."), "Desempenho orgânico" (semana de 05 a 11/10: "Visitas ao site", "Alcance", post que mais levou gente ao site, "dados ilustrativos", link "Ver em Resultados"; ícone "Analisar com Íris") e "Otto percebeu" (1ª oportunidade + fonte, V4.6 L13905; "Mais N oportunidades"; ações "Levar para o plano", "Sugerir para a semana 43", "Ver a campanha"; "Explorar com Otto") (`_opps`, L10175).
- Primeiro acesso (`ct.empty`, sem itens): "O Otto ainda não tem um calendário da Miolo" / "Ele pode planejar os conteúdos toda semana, no Modo Autônomo. Você aprova antes de qualquer publicação." / botões "Delegar o planejamento semanal" (→ delegação por conversa no Modo Autônomo, L13276) e "Pedir um post à Kaia" (→ conversa completa com a Kaia, pedido preenchido, L10785). Também "A Íris ainda não tem números do Instagram para ler." e "As oportunidades aparecem quando o Otto conhecer a Miolo e a Íris tiver os primeiros números." (L10784). O chip do planejamento só aparece depois de delegar.

## 13. Growth · Kiwi (`media`, título "Growth Marketing")
- Visão protagonista (L5399): "Objetivo de crescimento": "Mais encomendas pelo site no Natal, sem depender só do Instagram." e "Meta da Campanha de Natal: 400 panetones até 20/12. Combinado com a Bia e o Nexo." (L12161). Ao lado (só em uso, V4.6 L13895) "Kiwi percebeu": "Quem procura panetone no Google não encontra a Miolo." com fonte e "Conversar sobre isso". Três números-base: "27%" das encomendas vieram da busca no Google; "6,6%" das visitas ao site viram encomenda; "R$ 0" investidos em anúncios até hoje; selo "dados ilustrativos" (L12163).
- Faixa "Precisa de você": "Teste de anúncios perto da loja", "Google Perfil", "Plano de anúncios de Natal" (§3.2).
- Três frentes em abas (estado `kw.lane`, padrão `org`): "Aquisição orgânica" ("4 oportunidades"), "Campanhas pagas" ("Nada no ar"), "Conversão e testes" ("1 teste rodando") (L12153–12155).
  - Aquisição orgânica: ação "Pedir uma análise SEO" (→ `g-seo`); tabela "Busca", "Interesse", "Onde a Miolo está", "Próximo passo" com 4 buscas ("panetone artesanal" marcada "Comece por aqui", "padaria em pinheiros", "encomenda de panetone", "pão de fermentação natural"), cada uma abre a conversa do objeto `gx-q*`; painel "Presença no Google" com 4 checagens (Google Perfil, Fotos recentes, Horário de feriados, Página do panetone no site) (L12167–12172).
  - Campanhas pagas: "Nenhum anúncio no ar. Nada é investido nem ativado sem a sua autorização."; ação "Nova campanha" (→ `g-paid`); cartões "Teste perto da loja" (até 3 km da loja, até R$ 40/dia; botão "Revisar e autorizar" → `gx-teste`, depois "Ver a conversa") e "Anúncios de Natal" (rascunho, plano em 20/10; "Conversar sobre o plano" → `gx-natal`) (L12173–12185).
  - Conversão e testes: "Uma hipótese por vez, com o que conta como resultado combinado antes."; ação "Novo teste" (→ `g-test`); colunas "Hipóteses" (2), "Planejado" (1), "Em andamento" (1: "Bastidores toda semana"), "Concluído" (1: "Link da bio direto para a encomenda", de 5,1% para 6,6%) (L12186–12194).
- Primeiro acesso: o código só esconde "Kiwi percebeu" (`in6.has = uso`); objetivo, números, abas e conteúdo seguem iguais. Não há estado vazio dedicado (ver §18).

## 14. CRM · Max (`crm`) e Resultados · Íris (`res`)

### 14.1 CRM · Max
- Primeiro acesso, sem planilha importada (`mx.none`): "Central de relacionamento" / "Sua base de clientes ainda não está aqui." / "O Max começa pelos contatos que você já tem. Nada é enviado sem consentimento e sem a sua autorização." e quatro fontes: "Planilha de clientes" ("CSV ou Excel · ainda não importada") com "Importar"; "Plataforma da loja" ("integração pendente"); "E-mail" ("não conectado") com "Conectar"; "WhatsApp" ("canal indisponível") com "Saber mais" (L5453). "Importar" abre a conversa `mx-imp`; "Usar a planilha de exemplo" liga a central em modo demonstração ("dados de exemplo · importada hoje", L12616, L12650).
- Conta em uso (ou importado): números "412 Clientes cadastrados", "274 Ativos", "138 Inativos", "68 Novos contatos"; barra "Aceitam receber mensagens: 123 de 439 contatos"; "Fontes e canais" (Planilha de encomendas, E-mail com "Conectar", WhatsApp com "Saber mais"; selo "dados ilustrativos") (L12646–12653).
- "Segmentos" ("escolha um público para ver quem está nele"): "Clientes frequentes" 62, "Inativos há 60 dias" 138 (padrão), "Novos clientes" 41, "Maior recorrência" 18, "Leads recentes" 27 (`MX_SEG`, L12299). Painel "Público selecionado": critério, contatos, pontos com/sem consentimento, "Origem", "Pode receber", "Canal", "Ação sugerida"; botões "Criar campanha para este público" e "Conversar sobre o público" (L12654–12656).
- "Campanhas e jornadas": cartões "Reativação de clientes" (estado: "Pausada", "Aguardando aprovação", "Aguardando autorização" ou "Programada (simulação)"), "Comunicação de Natal" (Rascunho), "Relacionamento pós-compra" (Rascunho); legenda "Estados": Rascunho, Aguardando aprovação, Programada, Ativa, Pausada, Concluída (L12623–12658). "Max percebeu" (1ª em destaque, V4.6 L13917): "Você tem 138 clientes que não compram há 60 dias." ("Reativar com o Max"), "Clientes frequentes podem receber o aviso antecipado do panetone." ("Conversar sobre o Natal"), "41 clientes compraram pela primeira vez neste mês." ("Ver a proposta") (L12640–12642).
- "Jornada de relacionamento · Reativação de clientes": faixa de estado; 5 passos (Entrada "Inativos há 60 dias"; "Mensagem 1 · dia 0"; Espera "5 dias ou até comprar"; "Mensagem 2 · dia 5"; Saída "Encerrar"); detalhe com assunto e texto (do Otto), "Canal", "Condição"; botões "Aprovar esta mensagem", "Pedir ajuste", selo "Aprovada por você · aprovar não envia"; "Abrir a conversa" (L12630–12664). Aprovar texto não autoriza envio: "Autorização de envio", "Conectar o e-mail (simulação)", "Sem canal conectado, não há envio.", "Programada · simulação, nada é enviado" (TSV L5557).

### 14.2 Resultados · Íris
- Visão protagonista (Conta em uso, `_vRs`, L11200): barra de período "Semana" / "Mês" / "Trimestre" (padrão "Mês") + "<período> · comparado com <comparação>" + selo "dados ilustrativos" e fonte "planilha de encomendas, Instagram e Google Perfil" (L10844–10845). Três números: "Encomendas pelo site" (destaque), "Visitas vindas do Instagram", "Alcance no Instagram" (`RS_KPIS`, L9679); escolher um muda o gráfico ("no gráfico"); cada um tem mini-botão "Analisar com Íris". Cartão "Custo por clique" · "sem dados": "A Miolo não tem anúncios ativos, então não há número para ler. Um teste depende da sua autorização." com "Por que não há?" (TSV L5310).
- Gráfico principal: indicador, "por semana · 20/07 a 05/10", faixa do período, faixa de comparação, médias, marcas "1" (pico) e "2" ("primeiros bastidores"); "Ver tabela" / "Ver gráfico"; hover e setas leem cada semana (L10815–10837).
- Ao lado do gráfico: "Íris percebeu" com a leitura curta por indicador e período (`RS_SAY`, L9688), evidências, nota de base (`RS_SAYN`, L9705) e "Analisar com Íris". Abaixo: "Análises recentes" ("Leitura da semana", "Setembro na Miolo", "Bastidores levam mais gente ao site"), "Desempenho por canal" (Instagram, Busca no Google, Direto no site, WhatsApp; "encomendas pelo site · <período> · total N") e "Oportunidades" (1 em destaque + fonte; ações "Transformar em trabalho", "Levar para a campanha", "Ver a proposta"; "Analisar com Íris") (L10849–10851, L11255–11261).
- Primeiro acesso (`rs.empty`): "A Íris ainda não tem números para ler" / "Conecte o Instagram ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real." / lista "Encomendas pelo site", "Visitas vindas do Instagram", "Alcance no Instagram" / botão "Ver conexões" (→ Memória da Marca, L10842). Com o Instagram conectado no Início: "A Íris começou a acompanhar o Instagram hoje" / "A primeira leitura chega na segunda, com uma semana de dados. A Íris não estima o que não mediu." (L10841).

## 15. Gestão: Modo Autônomo, Memória da Marca, Minha Equipe & Conversas

### 15.1 Modo Autônomo (`auto`, V4.5, L13511; template L5097–5187)
- Topo: "Modo Autônomo" / "Deixe por conta do squad o que se repete. Você define os limites."; interruptor geral "Ligado" / "Pausado" (aria "Pausar o Modo Autônomo" / "Retomar o Modo Autônomo", L13567); botão "Delegar uma responsabilidade" (delegação conduzida por conversa, L13138).
- Resumo: "Fazendo sozinho", "A seguir", "Últimos 7 dias" (L13561). "Responsabilidades" ("o que o squad faz sozinho, em ciclos"); "Encerradas · N"; "O que mais pode ficar com o squad" ("cada delegação começa numa conversa"): modelos ainda não ativos entre "Planejar meus conteúdos toda semana", "Preparar posts toda segunda-feira", "Me avisar quando surgir uma oportunidade" e "Responder avaliações do Google" (`_d5Templates`, L13141; títulos em `TPL`, L6078); cada um abre uma conversa com o Nexo ("O que você quer deixar por conta do squad? …", L13161); "Como a autonomia funciona" ("três níveis, cada um com o seu limite": Analisar, Preparar, Executar, Nunca); "Próximas execuções"; "Histórico de execuções" (3 + "Ver todo o histórico (N)").
- Detalhe de uma responsabilidade: "Conversar sobre ela", "Editar", "Pausar", "Retomar", "Encerrar" (confirma "Encerrar esta responsabilidade?" com "Encerrar" / "Cancelar"), "Delegar de novo"; seções "O combinado", "Limites da autonomia", "Orientações da marca utilizadas" (+ "Abrir a Memória"), "Próximas execuções", "Histórico", "Alterações".
- Primeiro acesso: "Nada delegado ainda." / "Comece pelo que mais se repete na sua semana. O squad conversa com você, mostra o combinado e só ativa depois do seu ok." / "Delegar a primeira responsabilidade". Em Conta em uso a página lista também "Monitorar oportunidades de busca local" (falha de acesso) e "Preparar campanhas de relacionamento" (bloqueada), responsabilidades de demonstração (`TPL.seo` L12808, `TPL.crm` L12814; L13061–13062) que o contador da barra não inclui (§2.3).

### 15.2 Memória da Marca (`mem`, V4.5, L13611; template L5188–5292)
- Topo: "Memória da Marca" / "O que o seu squad sabe sobre você e o seu negócio."; busca "Buscar na memória"; botão "Adicionar conhecimento" (campo "O que o squad precisa saber?", exemplo "Ex.: aos domingos a loja fecha às 13h", "Assunto", "Cancelar" / "Guardar"; "Entra como declarado por você, já confirmado. Todo o squad passa a usar.").
- Áreas (`AREA5`, L12704): "Meu negócio", "Minha marca", "Meu público", "Conhecimento e aprendizados", "Conexões e fontes".
- Seções: "O que o squad sabe" (síntese + "Principais conhecimentos"), "De onde vem" (fontes: onboarding, site, Instagram, Google Perfil, planilha, guia da marca, conversas, especialistas), "O squad percebeu" ("nada vira orientação sem o seu ok"; ações "Vale este", "Salvar como confirmado", "Confirmar", "Corrigir", "Descartar", "Nenhum dos dois: corrigir", "Continua valendo", "Enviar planilha nova (simulação)"), "Alterações recentes" (5 + "Ver todas as alterações (N)"), "Tudo o que o squad sabe" ("por assunto · abra um item para ver a origem e quem usa"; "Ver pelo especialista"; "Origem", "Alterações", "Salvar", "Não usar mais", "Voltar a usar", "Conversar sobre isso"). Rodapé: "Dados ilustrativos. Neste protótipo nenhuma conta é sincronizada de verdade: conectar e reconectar são simulações."
- Primeiro acesso: só os 3 dados do cadastro; síntese "O squad ainda sabe pouco sobre a Miolo: só o que você contou no cadastro. …" (L13623).

### 15.3 Minha Equipe & Conversas (`team`, V4 `_vEq` L10879 sobre V3 `_vTeam` L9391; template L4720–4765)
- Cabeçalho "Minha Equipe & Conversas" + subtítulo por aba ("Sete especialistas que conhecem a Miolo. Escolha um para ver o que está fazendo." / "Tudo o que você conversou com o squad, por assunto e por contexto.", L10885) + botão "Abrir a Sala do Squad". Abas "Equipe" (7) e "Conversas" (N; ponto se há não lidas) (L10884).
- Equipe: palco com os 7 (nome + papel: Coordenação, Estratégia, Criação, Conteúdo, Growth, CRM, Dados); clicar escolhe (padrão Kaia). Perfil: nome, função completa (ex.: "Growth Marketing"), frase de apresentação, "agora" (`_longNow`), botões "Conversar com a Kaia" / "Conversar com o Nexo" (conversa completa) e "Pedir algo" (menu "Pedidos comuns" com as 3 `asks`). Abas do perfil: "Agora" (trabalhos e rotinas; vazio "Nada em andamento agora. …"), "Competências", "Entregas" (vazio "Ainda sem entregas para a Miolo."), "Trabalha com" (colegas clicáveis). Status dos trabalhos no desenho V4.6 (L13952).
- Conversas: busca "Buscar conversas"; filtro por avatar ("Sala do Squad" + 7 agentes); linhas com título, "<Agente> · <Ambiente>" + " · sobre uma publicação / um projeto / um indicador / o ambiente" (L10874), última mensagem, hora e ponto de não lida; vazio "Nenhuma conversa com esse filtro." + "Limpar filtros". Pedidos do catálogo aparecem como "pedido: <nome>" (L11648). Contagem inicial: 9 em uso; 2 em primeiro acesso (nexo + sala).

### 15.4 Detalhes de trabalho (fora da barra)
Abertos por `_openWork(id)` (view `work`, L9730) com botão de voltar para o ambiente de origem (padrão "Projetos", L10952): entrega pontual "Post do Dia Mundial do Pão" (L4993; "Conversar com a Kaia", "Comparar", "Pedir ajuste", "Decidir agora", "Pedir à Kaia"), projeto "Campanha de Natal" (L5030; "Conversar na Sala do Squad", Conceito/Peças/Textos/Plano de anúncios, "Próxima decisão", "Combinado"; vazio "Nenhuma campanha ainda" + "Pedir na Sala do Squad"), outros trabalhos (L5068) e documentos da Bia (L5069).

## 16. Capacidades por agente (`CAPX_L`, L11346; grupos `CAP_G`, L11337)
Rótulo exato e descrição de cada capacidade, no grupo indicado. Estado final: V4.2 com ajustes de V4.3 (L11785–11787) e V4.4 (L12229, L12238–12246). `m-reat` entra antes de `m-lead` (L12246). Há também conversas de objeto (`bx-*`, `gx-*`, `mx-*`) que não aparecem no catálogo (`hid`).

| Agente (bloco) | Grupo | Rótulo (descrição) |
|---|---|---|
| Nexo (L11347) | "Organizar o trabalho" | "Começar um projeto novo" (Você conta o objetivo; eu monto etapas, time e prazos.); "Coordenar uma campanha" (Estratégia, peças, textos e aquisição num plano só.); "Passar uma tarefa para o squad" (Diga o que precisa; eu escolho quem faz e acompanho.) |
| | "Acompanhar" | "Acompanhar as entregas" (O que andou, o que atrasou e o que vem a seguir.); "Revisar o que espera minha aprovação" (Tudo o que depende de você, em ordem de prazo.) |
| Bia (L11372) | "Entender o negócio" | "Analisar meu negócio" (Diagnóstico: forças, oportunidades e o que fazer primeiro.; V4.4, antes "Fazer um diagnóstico da Miolo"); "Analisar o mercado e os concorrentes" (As padarias do bairro: o que vendem, quanto cobram, como aparecem.) |
| | "Decidir o rumo" | "Definir o posicionamento" (Como a Miolo quer ser lembrada, em uma frase.); "Montar um planejamento" (Objetivos com número, prioridades e quem cuida de cada uma.); "Encontrar oportunidades" (Onde a Miolo pode crescer com o que já tem.) |
| Kaia (L11404) | "Marca" | "Criar ou revisar a identidade visual" (Cores, letras e o jeito de a Miolo aparecer.) |
| | "Peças e materiais" | "Criar uma peça para as redes" (Post, stories ou capa, com a cara da Miolo.); "Criar um carrossel" (Uma história em várias telas, com o texto do Otto.); "Criar materiais promocionais" (Cartazes, etiquetas e cardápios para a loja.) |
| | "Imagem e vídeo" | "Editar e adaptar imagens" (Formatos, recortes e ajustes nas suas fotos.); "Produzir vídeos e motion" (Reels curtos e animações com a marca.) |
| Otto (L11440) | "Planejar" | "Planejar os conteúdos" (Temas, formatos e frequência para as próximas semanas.); "Preparar o calendário editorial" (Datas, canais e o que sai em cada dia.) |
| | "Escrever" | "Criar uma publicação" (Ideia e legenda; a Kaia faz a peça.); "Escrever textos e artigos" (Para o site, o blog ou e-mails, na voz da Miolo.); "Escrever para aparecer no Google" (Conteúdo a partir das buscas que o Kiwi encontrar.) |
| | "Publicar" | "Programar os conteúdos" (Deixo agendado; nada sai sem a sua autorização.) |
| Kiwi (L11475) | "Busca e orgânico" | "Ver onde a Miolo pode aparecer no Google" (Análise de SEO: buscas, concorrentes e páginas.); "Trazer mais visitas sem anúncio" (Google Perfil, site e conteúdo trabalhando juntos.) |
| | "Anúncios" | "Planejar uma campanha paga" (Objetivo, público, verba e o que medir.); "Otimizar uma campanha" (Ajustes no que estiver no ar, sempre dentro do teto.; V4.3, antes "Cuidar dos anúncios"); "Revisar orçamento e públicos" (Para quem anunciar e quanto faz sentido investir.; V4.3, antes "Avaliar públicos e investimento") |
| | "Conversão" | "Fazer mais visitas virarem encomendas" (Otimizar o caminho do site até a encomenda.); "Criar um teste de conversão" (Uma hipótese, duas versões e um resultado claro.; V4.3, antes "Criar um teste de crescimento") |
| Max (L11520) | "Conhecer os clientes" | "Organizar meus públicos" (Quem é cliente, quem só segue e quem sumiu.); "Segmentar clientes" (Grupos por frequência, preferência e momento.) |
| | "Relacionamento" | "Planejar uma campanha de relacionamento" (Mensagens para quem já conhece a Miolo.); "Criar uma jornada" (Mensagens em sequência, no momento certo.); "Preparar fluxos de mensagens" (E-mail e WhatsApp, com regras claras de envio.) |
| | "Captar e reativar" | "Reativar clientes inativos" (Quem não compra há 60 dias, só com consentimento.; V4.4); "Captar e reativar clientes" (Trazer contatos novos e fazer voltar quem sumiu.) |
| Íris (L11557) | "Entender os números" | "Analisar um indicador" (O que mudou, quando e o que coincide com isso.); "Comparar períodos" (Semana, mês ou trimestre contra o anterior.); "Interpretar um resultado" (Em palavras simples, sem inventar causa.) |
| | "Acompanhar" | "Montar um relatório" (Para você ou para mostrar a alguém.); "Investigar um problema" (Quando algo cai ou um número não faz sentido.); "Acompanhar uma oportunidade" (Medir se uma ideia está dando certo.) |

## 17. Primeiro acesso × Conta em uso, por tela
| Tela | Conta em uso | Primeiro acesso |
|---|---|---|
| Início | 4 resumos: Resultados, Trabalhos, O Squad percebeu, Modo Autônomo; sugestões `HOME_SUG` | 4 resumos: "Para o squad conhecer a Miolo" no lugar de Resultados; sugestões `HOME_SUG_FIRST` |
| Sala do Squad | Campanha de Natal em andamento | Só a mensagem de apresentação |
| Projetos | Roadmap com 5 projetos, 3 cartões, trabalhos nas 3 visões | "Nenhum projeto ainda" + "Começar pela Campanha de Natal" |
| Estratégia | Direção, 5 oportunidades, 3 em análise, documentos | "Analisar meu negócio" |
| Marca & Criação | Bancada + galeria preenchidas | Contador 0 e galeria vazia, sem texto próprio |
| Conteúdo | Calendário com 6 posts e planos | "O Otto ainda não tem um calendário da Miolo" |
| Growth | Objetivo, números, 3 frentes, "Kiwi percebeu" | Igual, sem "Kiwi percebeu" |
| CRM | Central completa (números, segmentos, jornada) | "Sua base de clientes ainda não está aqui." |
| Resultados | Gráficos e indicadores, período "Mês" | "A Íris ainda não tem números para ler" |
| Modo Autônomo / Memória | Rotinas e 24+ conhecimentos | "Nada delegado ainda." / 3 dados do cadastro |
| Minha Equipe & Conversas | 9 conversas | 2 conversas (Nexo e Sala) |

## 18. Lacunas e inconsistências
- CSS não extraído: não dá para confirmar "DEMO" em caixa alta nem como a barra recolhida esconde rótulos e chips.
- "Sala do Squad" não tem id em `ENVS` nem `view` própria; a barra a trata como item `room` que abre a conversa `squad`.
- Growth e Marca & Criação não têm estado vazio próprio em Primeiro acesso (Kiwi mostra os mesmos dados; Kaia só um contador 0).
- "Ver conexões" (Resultados) passa `mem.tab: 'Conexões'` (L10842), mas a Memória V4.5 não lê `mem.tab`; abre a página no estado padrão.
- Copy desatualizada: "Peça algo ao squad em Novo pedido…" (L9103) cita um botão que não existe no template V4.6.
- Ambientes provisórios (`ENV_PROV`, `_vEnv`, template L5462) ficaram sem uso depois de L11778 e L12225; o botão de Resultados "Analisar com Íris" da V4 foi trocado por "Conversar com Íris" (L11202), mas os mini-botões do template mantêm "Analisar com Íris".
- O contador do Modo Autônomo vem de `_resps`, que não inclui as responsabilidades de demonstração da V4.5 (`r-seo`, `r-crm`, L13061–13062); a página pode listar mais itens que a barra conta.
- Não aparece no protótipo: cabeçalho global do palco (barra superior), busca global, contador numérico no sino, notificações novas durante o uso, troca real de negócio, edição de conta/configurações, "Sair" real.
