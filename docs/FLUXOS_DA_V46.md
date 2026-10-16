# Fluxos da V4.6 — especificação derivada do protótipo

**Fatia X1 · 16/10/2026.** Fonte: `design/handoff-v4.6/product-ui/ProductUIV4.dc.html` (Product UI V4.6), `MioloPeca.dc.html` e `landing/LandingPageV1.dc.html` (Landing V1 R32). Este documento é o **PASSO 0 de toda fatia de produto**: antes de perguntar ao dono, procure aqui. O que está aqui é o combinado (regra do dono, `docs/DIRETRIZES_DO_DONO.md`); o que o protótipo não responde está na §11 e só isso vira pergunta.

## Como ler

- Texto entre aspas é o **rótulo exato do protótipo**, copiado do código. Não troque palavra, maiúscula nem pontuação.
- `(L1234)` é a linha em `ProductUIV4.dc.html`; `(Land L1234)` é a linha na landing. Os extratos por linha ficam em `docs/parciais/x1/out/` (regenerar com `python3 docs/parciais/x1/extract.py`); as notas de leitura, em `docs/parciais/x1/notas_*.md`.
- O protótipo é feito em **camadas**: classe base V3 (L6408–9587) e camadas V4, V4.1, V4.2, V4.3, V4.4, V4.5 e V4.6 que sobrescrevem métodos com `Object.assign(Component.prototype, …)`. **Vale a camada mais tardia.** Quando a V4.x reaproveita a V3, isto é dito.
- Tudo no protótipo é simulado: "Nada é publicado, enviado ou pago." (L5612). Relógio fixo em segunda, 12/10/2026, a partir de 10:24 (L6404). Respostas dos agentes são roteiros locais, sem IA.

## Os sete agentes (objeto `AG`, L5627–5684, com os ajustes da V4.2 em L11317–11327)

| id interno | Nome | Tratamento | Área no produto (ambiente) | Cor | Fala de apresentação ("pitch") | Colabora com (`with`) |
|---|---|---|---|---|---|---|
| `coord` | Nexo | "o Nexo" | "Projetos" (`proj`) · "Coordenação de Marketing" | `#FF4D1F` | "Organizo o squad e te chamo só quando a decisão é sua." | todos |
| `arch` | Bia | "a Bia" | "Estratégia" (`strat`) · "Estratégia e Inteligência" | `#8A3BFF` | "Encontro onde está a oportunidade da Miolo." | Kaia, Otto, Kiwi |
| `leaf` | Kaia | "a Kaia" | "Marca & Criação" (`brand`) · "Marca e Criação" | `#FF2E9A` | "Dou forma à marca da Miolo em cada peça." | Bia, Otto |
| `pill` | Otto | "o Otto" | "Conteúdo" (`cont`) · "Conteúdo e Comunicação" | `#FFE11A` | "Mantenho a Miolo presente, com a voz dela." | Kaia, Bia |
| `hex` | Kiwi | "o Kiwi" (no protótipo); **"a Kiwi"** por decisão do dono de 15/10 | "Growth" (`media`, id interno mantido) · "Growth Marketing" | `#B6FF2E` | "Faço a Miolo crescer: mais gente encontrando, mais visitas virando encomendas." | Kaia, Íris |
| `funnel` | Max | "o Max" | "CRM" (`crm`) · "CRM e Relacionamento" | `#00E5C3` | "Faço os clientes da Miolo voltarem." | Otto, Íris |
| `square` | Íris | "a Íris" | "Resultados" (`res`) · "Dados e Resultados" | `#1F5BFF` | "Leio os números e digo o que fazer com eles." | Kiwi, Max, Bia |

Na V4, cada especialista passa a ser apresentado pela especialidade do seu ambiente ("Nexo · Projetos", "Kaia · Marca & Criação") (L9617–9618). Cada agente tem `hi` ("Oi, eu sou o Nexo."), `intro`, quatro `skills` e três pedidos de exemplo (`asks`), que aparecem na camada de identidade do ambiente e como sugestões.

> Divergência registrada (não resolvida aqui): o protótipo trata o Kiwi no masculino ("o Kiwi", `art: 'o'`, L5661); a decisão do dono de 15/10 é "a Kiwi". O código de produto segue o dono; o Diogo precisa ajustar a próxima versão do protótipo.

## 1. Mapa de telas e navegação

<!-- §1 em redação -->

## 2. Objetos e estados visíveis

<!-- §2 em redação -->

## 3. Jornadas guiadas (botão "Demo")

O botão "Demo", ao lado do logotipo (L4542), abre o "Guia do protótipo" (L5605), com o título "Protótipo · conta em uso · dados fictícios" ou "Protótipo · primeiro acesso · dados fictícios" (L8137). O guia também abre pelo menu da conta, em "Guia do protótipo" (L10556), e fecha com "Fechar o guia" ou Esc.

| Parte do guia | Rótulo exato (L5607–5612) | Efeito |
|---|---|---|
| Cenário | "Conta em uso" · "Primeiro acesso" | `_setScen` (L7965): limpa os temporizadores, volta o relógio para 10:24 e recria todo o estado com `initState('uso' \| 'primeiro')`. Só largura, altura e barra recolhida sobrevivem. |
| Jornada 1 | "1 · Entrega pontual" · "Peça um post à Kaia, peça um ajuste e aprove." · "Começar" | §3.1 |
| Jornada 2 | "2 · Campanha na Sala do Squad" · "O Nexo monta o squad; a Bia propõe o conceito." · "Começar" | §3.2 |
| Jornada 3 | "3 · Modo Autônomo" · "Delegue o planejamento semanal numa conversa, com limites claros." · "Começar" | §3.3 |
| Jornada 4 | "4 · Memória da Marca" · "Peça à Kaia para destacar o preço, confirme a preferência e rode o planejamento semanal." · "Começar" | §3.4 |
| Rodapé | "Nada é publicado, enviado ou pago." · "Reiniciar" | "Reiniciar" refaz o cenário atual do zero (`_setScen(s.scen)`, L8126). |

Nenhuma jornada envia nada sozinha: cada uma só prepara a conversa certa com o pedido já escrito no campo, e a pessoa aperta enviar.

### 3.1 Entrega pontual: post do Dia Mundial do Pão (Kaia, com o Otto)

**Gatilho** (`_journey(1)`, L7978–7984): zera o post, abre a conversa com a Kaia em tela cheia, com o título "Novo post", a saudação "Oi, eu sou a Kaia. Me diga o que precisa e eu crio com a cara da Miolo." e o campo preenchido com "Cria um post para o Dia Mundial do Pão, nesta sexta. Quero chamar o pessoal para a fornada especial de sábado." (L5800).

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Marina | o pedido acima | enviar | O roteador reconhece post + data (L7149–7152) e chama `_j1Start`. A Kaia aparece digitando por 1,2 s. |
| 2 | Kaia | "Combinado. Um post 4:5 para o Instagram, com a identidade da Miolo, para sexta, 16/10. Chamei o Otto para a legenda." + cartão "Trabalho criado · entrega pontual" · "Post do Dia Mundial do Pão" · "Kaia com o Otto" (L6738, L8607) | o cartão abre o trabalho | Trabalho `w-post` criado (post em `making`), com histórico "Você pediu na conversa com a Kaia". A conversa passa a se chamar "Post do Dia do Pão". Status vivo: "Kaia · criando a primeira versão", com o Otto. **Colaboração: a Kaia chama o Otto.** |
| 3 | Kaia | após 4,6 s: "Primeira versão pronta. Usei o pão como protagonista e o convite para sábado logo abaixo. O que acha?" + cartão do material (L6744) | "Aprovar v1" · "Pedir ajuste" · abrir a peça (L8616, L5539) | Post em `review`; histórico "v1 entregue". Status: "aguarda sua aprovação". Se a pessoa está em outra tela, chega o aviso "A Kaia entregou a v1 do post". Nasce a pendência "Para você revisar" (§5). |
| 4 | Marina | "Quero pedir um ajuste nesta versão." | "Pedir ajuste" | Kaia: "Claro. O que você quer mudar? Eu mudo só isso e mantenho o resto." + opções "Deixar a data mais visível", "Título mais curto", "Fundo verde da Miolo", "Destacar a fornada de sábado" e, na V4, "Outra abordagem" (L6766–6768, L5784–5787, L9637). Texto livre também escolhe o ajuste por palavra-chave: data, curto, verde, sábado (L6751–6759). |
| 5 | Kaia | "Mudo só a data. O resto fica igual." e, após 3,8 s, "Pronto, v2: data em destaque. Falta a sua aprovação." + cartão da v2 (L6776–6784) | "Aprovar v2" · "Pedir ajuste" | Histórico: "Você pediu: “Deixar a data mais visível”" e "v2 entregue · só a data mudou". O cartão da v1 passa a dizer "Substituída pela v2" (L8615). Aviso: "A Kaia entregou a v2 do post". |
| 6 | Marina | "Aprovar v2", no cartão, no trabalho ou por texto ("aprov", "perfeit", "pode seguir", "está ótimo", "fechado", L7154) | aprovar | Nota "Você aprovou a v2 · 10:31". Histórico: "Você aprovou a v2". Status: "v2 aprovada". Aviso: "v2 aprovada. A Kaia foi avisada." (L6795–6799). |
| 7 | Kaia | "Obrigada! Quer que o Otto publique no Instagram na sexta, às 9h? Aprovar a peça não publica nada sozinho." + cartão de autorização (L6800) | "Autorizar publicação" · "Agora não" (L5544) | Nasce a pendência "Para você autorizar": "Publicação do post" (§5). |
| 8a | Kaia | "Combinado: o Otto agendou para sexta, às 9h, com a legenda dele. Ele te avisa quando o Instagram confirmar." | "Autorizar publicação" | Histórico do Otto: "Publicação autorizada para sex, 16/10, 9h". Status vivo: "Otto · publicação agendada · sex, 9h". Aviso: "Publicação agendada · simulação". O trabalho mostra "Publicação autorizada · sex, 16/10, 9h", "simulação" e "Confirmada só quando o Instagram confirmar." (L6807–6811, L5016). **Colaboração: a Kaia entrega e o Otto publica.** |
| 8b | Kaia | "Sem problema. A peça fica pronta em Trabalhos; você autoriza a publicação quando quiser." | "Agora não" | Post com `pub: 'no'`. O trabalho mostra "Publicação ainda não autorizada." e o botão "Decidir agora" (L6812–6814, L5017). |

**Estados do post:** `none` → `making` → `review` → (ajuste) `making` → `review` → `approved`. Publicação: `none` → `ask` → `yes` ou `no`. Em Projetos, o trabalho em revisão aparece como "v2 aguarda sua aprovação" · "Aguarda você", com o próximo passo "Aprovar a v2 até sex, 16/10" (L8011).

### 3.2 Campanha coordenada: Natal na Sala do Squad (Nexo, Bia, Kiwi, Kaia, Otto)

**Gatilho** (`_journey(2)`, L7985–7991): zera a campanha e abre a Sala do Squad com "Esta é a Sala do Squad. Para pedidos maiores, eu organizo quem entra e cada especialista contribui na sua parte." O campo vem preenchido com "Quero uma campanha de Natal para vender mais panetones." (L5801).

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Nexo | "Boa. Antes de montar o time: as encomendas de panetone vão ser pelo site, na loja ou nos dois?" (L6829) | "Pelo site" · "Na loja" · "Nos dois" | Campanha em `asking`. Tópico da sala: "Campanha de Natal". Status: "organizando seu pedido", depois "aguarda sua resposta". Pendência "Para você responder": "Uma pergunta do Nexo" (§5). |
| 2 | Nexo | "Combinado: site e loja. Montei o squad da campanha e eu acompanho. Te chamo quando houver decisão." + cartão da equipe: Bia "estratégia e conceito", Kaia "peças da campanha", Otto "legendas e e-mail", Kiwi "anúncios, se você liberar verba" (L6837, L8626) | o cartão abre o projeto | Campanha em `strategy`. Mensagem de sistema: "O Nexo chamou a Bia, a Kaia, o Otto e o Kiwi". Aviso: "Projeto criado: Campanha de Natal". Status: "Bia · desenvolvendo a estratégia". **Colaboração: o Nexo monta o squad.** |
| 3 | Kiwi | "Enquanto a Bia trabalha, já separei os públicos perto da loja. Só entro com verba depois da sua autorização." (L6842) | — | **Colaboração: o Kiwi trabalha em paralelo à Bia.** |
| 4 | Bia | "Proposta de conceito para o Natal da Miolo:" + cartão do conceito "O Natal que leva tempo." · "A fermentação natural vira prova de cuidado. Para famílias do bairro e empresas que presenteiam equipes.", com Para "famílias e empresas", Canais "Instagram, site e e-mail" e "Este conceito orienta peças, textos e anúncios da campanha." (L6845, L8046–8047, L8629, L5542) | "Aprovar conceito" · "Outra direção" | Campanha em `concept`. Status: "Bia · aguarda sua aprovação". Aviso: "A Bia enviou o conceito da campanha". Pendência "Para você aprovar": "Conceito da campanha" (§5). |
| 5a | Marina e Bia | "Quero ver outra direção." → "Outra direção: o panetone como presente que se divide. Foco em empresas e famílias grandes." + conceito "Um presente que se divide." (L6873–6875) | "Outra direção" | O cartão anterior passa a "Você pediu outra direção". Status: "buscando outra direção", depois volta a "aguarda sua aprovação". |
| 5b | Nexo, Otto, Kaia | Nexo: "Conceito aprovado. A Kaia e o Otto começam agora; a revisão das peças fica para quinta, 15/10. Nenhuma verba é usada sem a sua autorização." Otto: "Vou escrever as legendas e o e-mail de encomendas a partir do conceito." Kaia, após 4,2 s: "3 de 5 peças prontas. Termino as outras duas até quarta e mostro tudo junto na revisão." + cartão "Peças de Natal · 3 de 5" (L6863–6867) | "Aprovar conceito" | Nota "Você aprovou o conceito · hh:mm". O cartão diz "Conceito aprovado por você". Campanha em `production`. Status: "Kaia · preparando as peças", com o Otto. Aviso: "Conceito aprovado. Kaia e Otto começaram." Próximo marco: "Revisão das peças de Natal" · "Kaia apresenta as 5 peças" (L8469). **Colaboração: três agentes em sequência na mesma conversa.** |

**Estados da campanha:** `none` → `asking` → `strategy` → `concept` → `production`. Se a campanha já existe, o Nexo responde "A campanha de Natal já está em andamento. Abri o projeto para você acompanhar." (L6823).

### 3.3 Rotina no Modo Autônomo: planejamento semanal (Nexo, Otto, Kaia)

**Gatilho** (V4.5 `_journey`, L13279–13286, sobre a V4.4): abre a conversa com o Nexo, em painel a partir de 1080 px, com o campo preenchido com "Quero que vocês planejem meus conteúdos toda semana.". A V3 abria um assistente de quatro passos na página do Modo Autônomo; na V4.5 a delegação é "uma conversa, não um formulário" (L13138). O mesmo fluxo começa por "Delegar uma responsabilidade", "Delegar a primeira responsabilidade", pelos cartões de "O que mais pode ficar com o squad", por "Configurar uma rotina" no Início ou por texto livre ao Nexo.

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Marina | o pedido acima | enviar | `_d5Kind` reconhece "planej/conteúd/plano/posts/instagram" e escolhe o modelo `plan` (L13165). A conversa se chama "Nova responsabilidade". Sem modelo reconhecido, o Nexo pergunta "O que você quer deixar por conta do squad? Pode escrever do seu jeito, como “quero que vocês planejem meus conteúdos toda semana”." e oferece "Planejar conteúdos toda semana", "Preparar posts toda segunda", "Avisar sobre oportunidades" e "Responder avaliações do Google". |
| 2 | Nexo | "Isso fica com o Otto, com a Kaia quando houver produção visual. Eu coordeno e te chamo quando algo depender de você." | — | O Otto entra na conversa e conduz as perguntas. **Colaboração: o Nexo passa a palavra ao responsável.** Se já existe rotina igual: "<O Otto> já cuida disso: … Para não ter duas rotinas iguais, eu ajusto a que existe." com "Ajustar a rotina atual" e "Ver no Modo Autônomo". |
| 3 | Otto | "Qual é o foco desses conteúdos?" | "Trazer encomendas pelo site" · "Mostrar o processo da padaria" · "Manter o Instagram ativo" | A resposta fica no combinado (`cfg.obj`), mas nenhuma tela a mostra depois. |
| 4 | Otto | "Em que dia você quer receber o plano da semana seguinte?" | "Toda segunda" · "Toda quinta" · "Toda sexta" | — |
| 5 | Otto | "O que entra em cada plano?" | "3 posts por semana" · "3 posts e 2 stories" · "5 posts e 3 stories" | Texto digitado que contenha uma das opções também vale (L13407). |
| 6 | Nexo | "Antes de ativar, confira o combinado:" + cartão "Responsabilidade" com Responsável, Colaboração, Coordenação, Frequência, Entrega, Aprovação, Primeira execução, "Faz sozinho", "Só com a sua autorização" e "Nunca" (L5558) | "Confirmar a delegação" · "Ajustar" | — |
| 7 | Nexo | "O que você quer ajustar?" | "O objetivo" · "A frequência" · "O que é entregue" · "As aprovações" | "As aprovações" explica: "Hoje cada publicação pede a sua aprovação. Se você liberar, o Otto publica sozinho o que você aprovar no plano. Isso não autoriza anúncios, envio de mensagens nem investimento." e oferece "Aprovar cada publicação" ou "Publicar sozinho o que eu aprovar no plano". Depois de cada ajuste, volta ao resumo. |
| 8 | Nexo | "Delegado. Está no Modo Autônomo como responsabilidade ativa. Primeira execução: <data>. Nada sai da Miolo sem a sua aprovação." + "Ver no Modo Autônomo" | "Confirmar a delegação" | Nota "Você confirmou a delegação · HH:MM". Registro: "Você delegou: planejar meus conteúdos toda semana". Aviso: "Responsabilidade ativa · primeira execução <data>". O cartão passa a "Delegado · ativo no Modo Autônomo". A responsabilidade nasce "Ativa", "desde hoje", e fica destacada na página por 5,2 s. |

Editar uma responsabilidade usa a mesma conversa ("Confira como fica o combinado. Vale a partir da próxima execução:", "Confirmar a mudança"; depois: "Atualizado. Vale a partir da próxima execução, e o histórico continua o mesmo."). O código e o histórico continuam os mesmos (L13246). As perguntas dos outros modelos estão em `Q5` (L12842–12858) e na nota §B9.

### 3.4 Ciclo de aprendizado da Memória: preço em destaque (Kaia → Memória → planejamento)

**Gatilho** (`_journey4`, L13751–13757): abre a conversa com a Kaia com o campo preenchido com "Kaia, aumenta o destaque do preço na peça de encomendas do panetone.".

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Marina | o pedido acima | enviar | O roteador da V4.5 reconhece "preç" e chama `_m5Price` (L13045). |
| 2 | Kaia | "Feito. Na peça de encomendas do panetone, o preço saiu do texto pequeno e foi para o selo no topo." + cartão "Antes" e "Agora" (L5559) | — | A peça muda: o ajuste foi pedido e feito. |
| 3 | Kaia | "Percebi uma possível preferência sua. Deixei como sugestão na Memória da Marca: as próximas peças só mudam se você confirmar." + cartão "Memória da Marca · sugestão" com "Ver na Memória da Marca" (L13052, L5560) | "Ver na Memória da Marca" | Nasce o conhecimento "Peças promocionais" · "Preços mais visíveis nas peças promocionais", em "Sugerido", sugerido pela Kaia e usado por Kaia, Otto e Bia depois do ok. Pergunta: "Você prefere preços mais visíveis nas peças promocionais?". Origem: "Ajuste pedido à Kaia · peça de encomendas do panetone". Histórico: "A Kaia sugeriu: preços mais visíveis nas peças promocionais". Na Memória, aparece no topo de "O squad percebeu" como "Kaia percebeu · …". **O ajuste não vira regra sozinho.** |
| 4 | Marina | — | "Confirmar" · "Corrigir" · "Descartar" (na Memória, §6) | "Confirmar" leva a "Confirmado", com o aviso "Confirmado. Kaia, Otto e Bia usam a partir da próxima entrega." e o selo "confirmada hoje". |
| 5 | Marina | — | no Modo Autônomo, "Simular a execução de quinta" (planejamento semanal) | Cria o trabalho "Plano da semana 43" (Otto com a Kaia, "Aguarda a sua aprovação") e a execução "PL-43", em "Aguarda sua aprovação" · "Entregue: 3 posts para 19 a 25/10 · aguarda a sua aprovação". Com o preço confirmado: "O preço do panetone aparece em destaque, como você confirmou na Memória da Marca." Sem confirmar: "O preço do panetone fica no texto: a preferência por preços visíveis ainda não foi confirmada." O Otto diz "Plano da semana 43 pronto, no ciclo de quinta. Usei as orientações confirmadas da Memória da Marca. Nada é publicado antes da sua aprovação." Aviso: "PL-43 · plano da semana 43 entregue (simulação)". A execução lista "Orientações da marca utilizadas: N" e "Não usada, porque ainda é sugestão: “…”". **Colaboração: Kaia, Memória, Otto.** |
| 6 | Marina | — | "Aprovar o plano" (L5561) | "PL-43" passa a "Aprovado por você hoje, HH:MM. Cada publicação continua pedindo a sua aprovação." Aviso: "Plano da semana 43 aprovado. Nada é publicado sem a sua aprovação de cada post." O próximo ciclo vira "Plano da semana 44" (qui, 22/10). |

Se a preferência já existe, a Kaia responde "O preço já está em destaque nessa peça. A preferência continua na Memória da Marca, do jeito que você deixou." (L13047).

### 3.4 Ciclo de aprendizado da Memória: preço em destaque (Kaia → Memória → planejamento)

<!-- §3.4 em redação -->

## 4. Conversa

<!-- §4 em redação -->

## 5. "Precisa de você"

**Onde e como** (V4.5, L13760–13763; V4.6, L13863): é uma faixa horizontal em Tinta, logo abaixo do cabeçalho de cada ambiente. "Uma pendência por faixa; quando há mais de uma, a primeira aparece e as outras abrem logo abaixo, no mesmo formato. Sem pendência, sem faixa." Cada linha mostra o rosto e o nome de quem pede ("Squad" na Memória), o tipo, o título, uma linha de apoio e a ação, com uma seta. O "+N" abre as demais e vira "Fechar"; a descrição acessível é "Ver mais N pendências" ou "Recolher as outras pendências". A seção acessível se chama "Precisa de você: N" (L13822–13831). O Início não usa a faixa: a V4.6 não toca o Início (L13845), que mostra as mesmas pendências no próprio layout. Em Projetos, no Quadro, "Precisa de você" também é a primeira coluna; vazia, diz "Nenhuma decisão pendente" (L8875).

**Tipos de decisão** (`NDK5`, L13765):

| Chave | Rótulo na faixa | Tipo no banco (`approval_kind`) |
|---|---|---|
| `review` | "Para você revisar" | `review` |
| `approve` | "Para você aprovar" | `approve` |
| `auth` | "Para você autorizar" | `authorize` |
| `confirm` | "Para você confirmar" | `confirm` |
| `fix` | "Para você reconectar" | `reconnect` |
| `answer` | "Para você responder" | `respond` |
| `decide` | "Para você decidir" (tipo-reserva quando a pendência não tem tipo, L13774 e L13813) | não existe |
| `next` | "Em seguida" (não é decisão: "ainda não depende de você"; nunca abre a faixa sozinho, L13824) | não existe |

**Catálogo de pendências que o protótipo mostra** (`_needs`, L8033–8040; `_nd5Items`, L13776–13820):

| Ambiente | Tipo | Título · linha de apoio | Ação |
|---|---|---|---|
| Projetos, Conteúdo | revisar | "Post do Dia Mundial do Pão · v2" · "Kaia ajustou: data em destaque, como você pediu · sai sex, 16/10, 9h, se você aprovar" (v1: "Primeira versão · …"). Em Conteúdo: "Peça de sexta: Dia Mundial do Pão" · "A publicação de sex, 16/10, 9h, depende da sua aprovação da v2" | "Revisar entrega" (Conteúdo: "Revisar a peça") → abre o trabalho |
| Projetos, Conteúdo | autorizar | "Publicação do post" · "v2 aprovada · o Otto pode publicar sex, 16/10, 9h" | "Decidir publicação" → abre o trabalho |
| Projetos | responder | "Uma pergunta do Nexo" · "Campanha de Natal · site, loja ou os dois?" | "Responder" → abre a Sala do Squad |
| Projetos | aprovar | "Conceito da campanha" · "Campanha de Natal · a produção começa depois do seu ok" | "Revisar conceito" → abre a Sala do Squad |
| Projetos, Conteúdo | confirmar | "Combinado do planejamento" · "Modo Autônomo · aguarda sua confirmação" | "Revisar combinado" → abre a conversa com o Nexo, ou a Sala |
| Projetos | em seguida | próximo marco · "<data> · <projeto> · ainda não depende de você" | "Ver no roadmap" |
| Estratégia | revisar | decisão do plano da Bia; "Diagnóstico da Miolo · v1" · "A Bia entregou a leitura do negócio. Aprovar não cria trabalhos." | "Revisar o plano" · "Ler o diagnóstico" |
| Marca & Criação | revisar | peça em revisão · versão · formato | rótulo da peça (ex.: "Revisar e aprovar a v2", L12123) |
| Conteúdo | aprovar | "Plano da semana 43" · "O Otto entregou 3 posts para 19 a 25/10 · nada é publicado antes" | "Revisar o plano" |
| Growth | autorizar | "Teste de anúncios perto da loja" · "Até R$ 40 por dia, 7 dias. Nada é investido sem a sua autorização." | "Ver a proposta" |
| Growth | reconectar | "Google Perfil" · "A consulta das buscas falhou hoje: o acesso expirou" | "Reconectar (simulação)" |
| Growth | em seguida | "Plano de anúncios de Natal" · "Chega em 20/10. A verba será decisão sua." | "Conversar sobre o plano" |
| CRM | aprovar | "Mensagens da reativação" · "O Otto escreveu duas mensagens para 23 clientes · aprovar não envia" | "Revisar as mensagens" |
| CRM | autorizar | "Envio da reativação" · "23 contatos com consentimento · seg, 19/10, 9h" ou "Mensagens aprovadas · falta conectar o e-mail para poder autorizar" | "Ver a autorização" |
| Resultados | confirmar | "<conhecimento sugerido>?" · "A Íris observou na planilha de encomendas · só vira orientação com o seu ok" | "Ver na Memória" |
| Modo Autônomo | aprovar, autorizar, reconectar, confirmar | pendências das responsabilidades (§7) | rótulo de cada uma |
| Memória da Marca | confirmar | "N sugestões, N em conflito e N desatualizado" · "Nada vira orientação do squad sem o seu ok." | "Revisar" → rola até as pendências |

**O que acontece em cada decisão** (o protótipo decide dentro do objeto ou da conversa, não na faixa; a faixa só leva até lá):

- **Revisar ou aprovar uma entrega:** "Aprovar vN" grava "Você aprovou a vN", avisa o agente ("vN aprovada. A Kaia foi avisada.") e, se houver ação externa, abre logo a autorização separada (§3.1, passos 6 e 7). Conceito: "Aprovar conceito" põe a produção em andamento (§3.2).
- **Pedir ajuste:** "Pedir ajuste" na entrega ou "Outra direção" no conceito volta o trabalho para produção com uma nova versão, e a versão anterior fica "Substituída pela vN". Mensagens do CRM: "Aprovar as mensagens" ou "Pedir ajuste" (L5556).
- **Autorizar:** "Autorizar publicação" ou "Agora não" (L5544); no CRM, "Conectar o e-mail (simulação)" e a autorização de envio (L5557); no Modo Autônomo, a confirmação do combinado (§7).
- **Responder:** escolher uma opção do cartão (ex.: "Nos dois") ou escrever.
- **Confirmar:** na Memória, "Confirmar", "Corrigir" ou "Descartar" (§6).
- **Reconectar:** "Reconectar (simulação)" ou "Reconectar conta (simulação)" (§8).
- **Rejeitar:** **o protótipo não tem botão "Rejeitar" em entregas.** O que existe é "Pedir ajuste", "Outra direção" e "Agora não". A decisão do dono de 16/10 08:55 (rejeitar com duas saídas, cancelar o trabalho ou pedir nova proposta) não tem desenho na V4.6. Os rótulos e o lugar dos dois botões viram pergunta (§11).

**Aprovar ≠ publicar, enviar ou investir.** O protótipo repete a regra onde a decisão acontece:

- "Aprovar um conteúdo não autoriza publicar, enviar mensagens, alterar campanhas ou investir. Cada uma dessas ações pede a sua própria autorização." (Modo Autônomo, L5129)
- "Aprovar a peça não publica nada sozinho." (L6800)
- "Mensagens aprovadas · isso não autoriza o envio" (L5556) e "aprovar não envia" (L13804)
- "Aprovar não cria trabalhos." (L13786)
- "Nada é investido sem a sua autorização." (L13798) e "Só entro com verba depois da sua autorização." (L6842)
- "Se você não aprovar, nada é publicado: o plano fica esperando por você." (L6904)
- "Confirmada só quando o Instagram confirmar." (L5016): publicação autorizada ainda não é publicação feita.

**Quem decide:** o protótipo tem uma pessoa só (Marina, "dona da Miolo"). A regra do dono de 16/10 diz que só o owner decide e que a interface mostra os botões de decisão só a ele. O protótipo não desenha a visão de quem não é owner (§11).

## 6. Memória da Marca

Fonte: camada V4.5 (`_vMem5`, L13610–13707; dados L12695–12931), com a V4.6 só ajustando linguagem. Da V3 ainda valem o estado `mem.items`, `_memConfirm` e `_memRemove` (L7935–7946) e o primeiro acesso (L7897–7931). Detalhe completo em `docs/parciais/x1/notas_memoria_autonomo_conexoes.md` §A.

**Página, de cima para baixo** (L5191–5290): "Memória da Marca" · "O que o seu squad sabe sobre você e o seu negócio."; busca "Buscar na memória"; botão "Adicionar conhecimento"; faixa "Precisa de você" (§5); dossiê; "O squad percebeu" ao lado de "Alterações recentes"; "Tudo o que o squad sabe" · "por assunto · abra um item para ver a origem e quem usa", com "Ver pelo especialista" e as abas.

**Dossiê** (L13621): nome, descrição ("Padaria de fermentação natural · Pinheiros, São Paulo · desde 2016"), a síntese do squad (`SUM5`, L12920) com "Síntese do squad a partir de N conhecimentos confirmados", "De onde vem" (pílulas das fontes com o ponto de estado), os sete rostos e "Principais conhecimentos": "Proposta de valor", "Público", "Produtos", "Diferenciais", "Posicionamento", "Identidade visual", "Tom de comunicação" (`KEY5`, L12919). Chave sem conhecimento: "Ainda não sabe · contar agora", que abre "Adicionar conhecimento" no assunto certo. No primeiro acesso: "O squad ainda sabe pouco sobre a Miolo: só o que você contou no cadastro. Cada fonte conectada e cada conversa ajudam a completar. Nada vira orientação sem o seu ok." e "Síntese a partir do cadastro".

**Abas e assuntos** (`AREA5` e `TOPIC5`, L12704–12716): "Tudo", "Meu negócio" (História · Proposta de valor · Localização · Produtos · Diferenciais · Operação · Objetivos), "Minha marca" (Posicionamento · Identidade visual · Tom de voz · Preferências criativas · Referências), "Meu público" (Perfil dos clientes · Necessidades · Comportamentos conhecidos · Preferências identificadas), "Conhecimento e aprendizados" (Pesquisas · Descobertas · Decisões · Preferências · Orientações confirmadas), "Conexões e fontes" (§8). Cada aba mostra a contagem.

**Estados do conhecimento** (`KST5`, L12892–12895; sempre ícone e texto):

| Estado | Rótulo | Linha expandida (L13666) | O squad usa? |
|---|---|---|---|
| `ok` | "Confirmado" | "Confirmado por você · <data>" | sim |
| `dec` | "Decisão sua" | "Decisão sua · <data>" | sim |
| `src` | "Da fonte" | "Lido em <fonte> · <data> · em uso, sem confirmação sua" | sim, sem confirmação |
| `learn` | "Observado" | "Observado pelo squad · usado como contexto, não como regra" | só como contexto |
| `hypo` | "Sugerido" | "Sugestão · ninguém usa até você confirmar" | não |
| `old` | "Desatualizado" | "Desatualizado · o squad avisa quando usar" | com aviso |
| `conf` | "Em conflito" | "Em conflito · não é usado até você decidir" | não |
| `rej` | "Descartado" | "Descartado por você · não vira regra" | não |
| `off` | "Não usado" | "Fora de uso a seu pedido" | não |

Quem usa, na linha aberta: "Como o squad utiliza", "Quem vai usar depois do seu ok" (sugestão) ou "Ninguém usa agora"; com os sete, "Todo o squad consulta quando precisa". Cada agente aparece como "<Nome> · <papel>" e diz como usa (ex.: Kaia · Criação, "nas peças de Natal").

**"<Agente> percebeu"** (L13633–13638; V4.6 L13929): seção "O squad percebeu" · "nada vira orientação sem o seu ok". Cada cartão traz rosto e "<Nome> percebeu · <assunto>" (ex.: "Kaia percebeu · preferências criativas"), a pergunta ("Você prefere a data sempre visível, no topo das peças de oferta?"), "Origem: <origem>" e "Nada muda nas entregas até você confirmar." Mostra três e guarda o resto em "Ver mais N". Vazio: "Tudo revisado. Quando o squad perceber algo novo, aparece aqui para você confirmar, corrigir ou descartar."

| Ação | Disponível quando | Efeito |
|---|---|---|
| "Confirmar" | sugerido, da fonte, observado | Vira "Confirmado". Histórico: "Você confirmou: <valor>". Aviso: "Confirmado. Todo o squad passa a usar." (preço: "Confirmado. Kaia, Otto e Bia usam a partir da próxima entrega.") |
| "Corrigir" | todos menos descartado | Abre a edição ("Salvar como confirmado" no cartão, "Salvar" na linha, ou "Cancelar"). O valor novo vira "Confirmado" e guarda o anterior ("Antes: “…”"). Aviso: "Corrigido. O squad usa a versão nova." |
| "Descartar" | só sugerido | Vira "Descartado", mas o registro fica guardado e só reaparece em "Mostrar descartados e fora de uso (N)". Aviso: "Descartado. Não vira regra e ninguém do squad usa." |
| "Não usar mais" | confirmado, decisão, da fonte, observado, desatualizado | Vira "Não usado". Aviso: "Fora de uso. Fica guardado, mas o squad não usa." |
| "Voltar a usar" | não usado | Volta ao estado anterior. Aviso: "De volta à memória do squad". |
| "Conversar sobre isso" | sempre | Abre a conversa do conhecimento (§4). |

**Conflito** (`CONF5`, L12770; só o horário no protótipo): "Duas fontes dizem coisas diferentes sobre o horário. Enquanto você não decide, o squad não usa nenhuma das duas." Mostra as duas versões com fonte e data ("Google Perfil · 20/09" e "Site · lido em 14/09"), cada uma com "Vale este", e o link "Nenhum dos dois: corrigir". Ao escolher: "Conflito resolvido. A outra versão sai da memória."

**Desatualizado** (L13643): "Veio da planilha de encomendas de setembro. Outubro ainda não entrou." · "O squad avisa quando usar esse dado." Ações: "Enviar planilha nova (simulação)" ou "Continua valendo".

**Busca e filtros** (L13658–13704): a busca procura em chave, valor e assunto, mostra "N resultados para “<termo>”" e oferece "Limpar a busca"; sem resultado, "Nada encontrado. Tente outra palavra ou adicione esse conhecimento.". O filtro "Ver pelo especialista" tem sete rostos ("Ver o que o Otto consulta") e mostra "<O Otto> consulta N conhecimentos" · "Usa <para quê>. Sugestões e conflitos ficam de fora até você decidir." · "Ver tudo". Descartados e fora de uso ficam escondidos.

**Histórico** ("Alterações recentes", L5247): cinco linhas e "Ver todas as alterações (N)". Cada linha tem rosto (ou "M", de você), texto e data, e leva ao item. Exemplos (`LOG5`, L12910): "A Kaia sugeriu: data sempre visível nas peças de oferta", "Você confirmou a meta: 400 panetones até 20/12", "Você descartou: emojis no fim das legendas". Vazio: "As confirmações, correções e descartes aparecem aqui." Cada item também tem o próprio histórico, que termina em "Entrou na memória: <origem>".

**Adicionar conhecimento** (L5200–5202): "O que o squad precisa saber?" · "Ex.: aos domingos a loja fecha às 13h" · escolha do assunto · "Cancelar" ou "Guardar" · "Entra como declarado por você, já confirmado. Todo o squad passa a usar."

**Primeiro acesso** (L4644, L7907–7931): o Início mostra "Para o squad conhecer a Miolo", com três passos ("N de 3"):

- "Mande o site": "O Nexo lê e separa o que for útil.", botão "Ler o site". Depois de 2,8 s: "O Nexo leu o site: 5 informações para confirmar"; as cinco viram **sugestões**, não regras.
- "Conecte o Instagram": "Conectar não autoriza publicar.", botão "Conectar". Gera uma sugestão; aviso "Instagram conectado · simulação".
- "Conte o resto ao Nexo": "Objetivo, público, o que vende mais.", botão "Conversar". O objetivo contado entra direto como confirmado ("contado ao Nexo"), e o Nexo responde "Anotei na Memória da Marca: “<objetivo>”. Já dá para pedir a primeira entrega." com "Pedir o post à Kaia".

No Início, as sugestões aparecem em "O Squad percebeu" · "O squad notou e quer confirmar com você antes de guardar:", com "Aceitar" e "Recusar". O resultado é "Na Memória" ou "Recusada" ("Recusada. A informação não entra na Memória da Marca.").

**Regra transversal:** só o que está confirmado orienta o squad. O Modo Autônomo conta como usadas só as orientações "Confirmado" e "Decisão sua"; as sugestões aparecem em "Ainda não entra, porque é sugestão:" e o rodapé diz "Só entra o que está confirmado na Memória da Marca." (L13585, L5169).

**Campos de um conhecimento**, para o banco: chave, valor, área, assunto, estado, fonte (tipo e texto de origem), data de origem, quem sugeriu, pergunta da sugestão, agentes que usam e como cada um usa, valor anterior, quando foi confirmado, estado anterior a "Não usar mais" e o histórico (quem, texto, quando).

> Inconsistências do protótipo registradas pelo leitor (não decidem nada; ver a nota §D): "Recusar" no Início apaga o item, enquanto "Descartar" na Memória o guarda como descartado; o filtro por especialista conta sem as sugestões, mas a lista ainda as mostra.

## 7. Modo Autônomo

Fonte: camada V4.5 (`_vAuto5` e página, L13056–13137 e L13474–13609; dados L12806–12925); delegação em L13138–13272. Da V3 ainda valem `rot`, `auto.extra`, `_autoAll` e `_rotPause`. Detalhe em `docs/parciais/x1/notas_memoria_autonomo_conexoes.md` §B.

**Página** (L5097–5186): "Modo Autônomo" · "Deixe por conta do squad o que se repete. Você define os limites."; o interruptor; "Delegar uma responsabilidade"; a faixa "Precisa de você"; o resumo; "Responsabilidades"; "Encerradas · N"; "O que mais pode ficar com o squad" · "cada delegação começa numa conversa"; "Como a autonomia funciona" · "três níveis, cada um com o seu limite"; e, ao lado, "Próximas execuções" e "Histórico de execuções".

- **Resumo** (L13560): "Fazendo sozinho" ("N responsabilidades ativas" ou "Nada ativo agora"; abaixo, "N pausada · N com falha · N bloqueada", "tudo dentro do combinado" ou "delegue o que se repete"), "A seguir" (a próxima execução, ou "Nada programado") e "Últimos 7 dias" ("N execuções"; "N sem concluir, com o motivo registrado" ou "todas concluídas").
- **Vazio:** "Nada delegado ainda." · "Comece pelo que mais se repete na sua semana. O squad conversa com você, mostra o combinado e só ativa depois do seu ok." · "Delegar a primeira responsabilidade" (L5122).
- **Linha da responsabilidade:** rosto do responsável e dos colaboradores; título; "<Nome> lidera · com <colaborador> · <frequência>"; estado; ritmo em bolinhas; a próxima execução ou "Pausada: nada novo até você retomar"; e o aviso, se houver falha ou bloqueio.
- **Detalhe** (L5146–5183): "Modo Autônomo / <título>"; "<O Otto> lidera · com … · o Nexo coordena · desde …"; as ações; "O combinado" (Responsável, Colaboração, Coordenação "Nexo", Frequência, Entrega, Aprovação); "Limites da autonomia"; "Orientações da marca utilizadas"; e, ao lado, "Próximas execuções", "Demonstração", "Histórico" e "Alterações".

**Estados da responsabilidade** (`RST5`, L12878; "sempre ícone e texto, nunca só cor"): "Ativa", "Pausada", "Bloqueada por integração", "Falha na execução", "Encerrada" e "Aguarda sua confirmação" (resto da V3, sem produtor na V4.5).

**Estados de cada execução** (`EXST5`, L12876): "Concluída", "Falhou", "Não executada", "Aguarda sua aprovação", "Aprovada por você", "Programada". No ritmo e em "Próximas execuções" aparecem também "próxima", "aguarda você", "pausada" e "bloqueada". O handoff lista os oito estados juntos ("Ativa, Pausada, Aguarda aprovação, Bloqueada por integração, Falha, Programada, Não executada e Encerrada"), mas o código separa responsabilidade e execução. O rótulo curto "Falha" não existe: o código usa "Falha na execução" e "Falhou".

| Texto que acompanha o estado (L13488, L13554, L13598) | |
|---|---|
| Ativa | "Próxima execução: <data> · <título>. <entrega>." |
| Pausada | "Pausada por você: nada novo é preparado ou publicado até você retomar." · "Nenhuma execução até você retomar." |
| Falha na execução | "A última execução falhou: o acesso ao Google Perfil expirou e precisa ser reconectado." · "Nada acontece até a conexão voltar." |
| Bloqueada por integração | "O e-mail marketing não está conectado: o Max prepara segmentos, mas nada pode ser enviado." · "Nada acontece até a integração ser conectada." |
| Encerrada | "Encerrada por você. O histórico continua disponível." · "Encerrada: nada mais é programado." |

**Catálogo de responsabilidades** (`TPL`, L6077–6139, mais `seo` e `crm` em L12806–12820):

| Modelo | Título | Responsável › com | Ritmo e opções |
|---|---|---|---|
| `plan` | "Planejar meus conteúdos toda semana" | Otto › Kaia | dia: segunda, quinta (padrão) ou sexta; volume: "3 posts e 2 stories", "3 posts por semana", "5 posts e 3 stories" |
| `posts` | "Preparar posts toda segunda-feira" | Kaia › Otto | dia: segunda (padrão), quinta ou sexta; volume: "3 posts", "4 posts", "5 posts" |
| `res` | "Acompanhar meus resultados" | Íris | "Toda segunda", "Toda segunda e sexta" ou "Todo dia" |
| `opp` | "Me avisar quando surgir uma oportunidade" | Bia › Íris | "Sempre que surgir"; onde: "no bairro e nas datas" ou "só nas datas comemorativas"; aviso: "no Início" ou "no Início e por e-mail" |
| `reat` | "Reativar clientes que sumiram" | Max › Otto | "Todo mês" ou "A cada 15 dias"; "60 dias" ou "90 dias" sem comprar |
| `reviews` | "Responder avaliações do Google" | Max | "Todo dia" ou "Duas vezes por semana" |
| `seo` | "Monitorar oportunidades de busca local" | Kiwi › Íris | "Toda segunda" ou "A cada 15 dias" |
| `crm` | "Preparar campanhas de relacionamento" | Max › Otto | "Todo mês" ou "A cada 15 dias" |

O combinado de cada um é uma frase com as palavras trocáveis. Exemplo `plan`: "Toda quinta às 9h, o Otto apresenta o plano da semana seguinte com 3 posts por semana. A Kaia cria as artes. Nada é publicado sem a sua aprovação." Em "O que mais pode ficar com o squad", a tela só oferece `plan`, `posts`, `opp` e `reviews`, e só os que ainda não existem.

**Na conta em uso:** "Planejar meus conteúdos toda semana" está "Ativa" desde 28/09, toda quinta, com "3 posts por semana". "Acompanhar meus resultados" está "Ativa" desde 01/10, toda segunda. "Monitorar oportunidades de busca local" está em "Falha na execução" (o Google Perfil expirou). "Preparar campanhas de relacionamento" está "Bloqueada por integração" (o e-mail não está conectado). As duas últimas não podem ser pausadas nem encerradas até serem resolvidas. No primeiro acesso, nenhuma responsabilidade.

**Histórico de execuções** (`EX5`, L12866–12874): cada execução tem código, data, título, estado, mensagem, link e o que usou da memória. Códigos do protótipo: PL (plano), RS (resultados), BL (busca local), RC (relacionamento), mais o número da semana ou do mês. Exemplos:

- "PL-42" · "Plano da semana 42" · "Aprovado por você na sexta, 17:42"
- "BL-42" · "Falhou nas duas tentativas: o acesso ao Google Perfil expirou e precisa ser reconectado."
- "RC-10" · "Não executada: o e-mail marketing não está conectado. Nada foi preparado para envio."

A lista mostra três execuções e "Ver todo o histórico (N)"; vazia, diz "Cada execução fica registrada aqui, com o que foi feito, o que falhou e o trabalho que gerou."

**Níveis de autonomia** (`LV5B`, L13461; `lv5`, L12822):

| Nível | Texto | Limite |
|---|---|---|
| "Analisar" | "Pesquisa, acompanha e interpreta informações, só nas contas que você conectou." | faz sozinho |
| "Preparar" | "Cria rascunhos, planos, peças e relatórios a cada ciclo, sem você pedir de novo." | faz sozinho · você aprova o que sai |
| "Executar" | "Publicar, enviar mensagens, alterar campanhas e investir só acontecem com a autorização específica de cada ação." | só com a sua autorização |
| "Nunca" | "Nem com autorização desta rotina" | ex. `plan`: "Investir em anúncios", "Responder mensagens de clientes", "Mudar preços ou ofertas" |

Cada modelo lista o que faz em cada nível. Em `plan`, por exemplo, "Publicar no Instagram" exige "Sua aprovação, publicação por publicação", ou fica "Autorizado: o que você aprovar no plano" se a pessoa liberou; "Alterar campanhas pagas" aparece como "Autorização específica · não concedida". Sem ação externa: "Nenhuma ação externa nesta responsabilidade." "Publicar sozinho" é opção da responsabilidade, só para `plan` e `posts`, escolhida na conversa ("Aprovar cada publicação" ou "Publicar sozinho o que eu aprovar no plano"), e "não autoriza anúncios, envio de mensagens nem investimento" (L13216).

**Ações** (detalhe, L5150–5157):

| Rótulo | Quando | Efeito |
|---|---|---|
| "Conversar sobre ela" | sempre | Abre a conversa da responsabilidade com o responsável (§4). |
| "Editar" | não encerrada | Abre a conversa: "O que você quer ajustar?". Não há formulário. |
| "Pausar" | ativa | Vira "Pausada". Registro: "Você pausou a responsabilidade". Aviso: "Pausada. Nada novo é preparado." |
| "Retomar" | pausada | Vira "Ativa". Registro: "Você retomou a responsabilidade". Aviso: "Retomada. O Otto volta na quinta." |
| "Encerrar" | não encerrada | Pergunta "Encerrar esta responsabilidade?" · "Nada novo será preparado e o histórico continua aqui. Para só interromper por um tempo, use Pausar." com "Encerrar" e "Cancelar". Confirmado: vai para "Encerradas · N"; aviso "Encerrada. O histórico continua no Modo Autônomo." |
| "Delegar de novo" | encerrada | Recomeça a delegação. |
| "Reconectar conta (simulação)" · "Conectar o e-mail (simulação)" | falha · bloqueio | §8 |
| "Simular a execução de quinta" | `plan` ativa, conta em uso | §3.4. Texto: "Demonstração: roda o ciclo de qui, 15/10 com o que está confirmado na memória agora." |
| "Abrir a Memória" | sempre | Vai à Memória da Marca. |

**Interruptor global** (L13568; `_autoAll`, L6988): fica no cabeçalho, com `role="switch"`, e só aparece se houver responsabilidade ativa ou pausada. O rótulo é **"Ligado"** quando ao menos uma está ativa e **"Pausado"** quando nenhuma está; a descrição acessível é "Pausar o Modo Autônomo" ou "Retomar o Modo Autônomo". Não existe rótulo "Desligado" na V4.5. O efeito é pausar ou retomar todas as responsabilidades de uma vez, com o aviso "Modo Autônomo pausado. Nada novo é preparado ou publicado." ou "Modo Autônomo retomado". No protótipo, o interruptor também mexe nas encerradas e não alcança as que estão com falha ou bloqueio. O "Ligado:" e o "Desligado:" da V3 (L9322) eram a opção "publicar sozinho" de cada rotina, não um interruptor global. O Documento Mestre (§10) marca a semântica do interruptor como pendente (§11).

**Delegação pela conversa com o Nexo** (fluxo completo em §3.3): "delegar: uma conversa, não um formulário" (L13138).

## 8. Conexões e integrações

As conexões aparecem na Memória da Marca, na aba "Conexões e fontes" e nas pílulas "De onde vem", e também onde travam alguma coisa: na faixa "Precisa de você", no Modo Autônomo e no cartão de envio do Max. A tela de conexões da V3 (`connItems`, com permissões por conexão) ficou sem leitor na V4.5. Detalhe em `docs/parciais/x1/notas_memoria_autonomo_conexoes.md` §C.

**Estados da fonte** (`SRCST5`, L12804; um ponto colorido e o rótulo):

| Estado | Rótulo | O que a tela diz (exemplos da conta em uso) |
|---|---|---|
| `decl` | "Declarado por você" | Onboarding: "Cadastro de 14/09 e correções nas conversas"; Conversas: "Só vira orientação depois do seu ok" |
| `ok` | "Conectada" | Site: "Lido em 14/09 · o Nexo relê em 14/10"; Instagram: "Conectado em 14/09 · dados de exemplo"; Documentos: "Enviados por você entre 14/09 e 01/10" |
| `old` | "Desatualizada" | Planilha: "Cobre até 30/09: outubro ainda não entrou" |
| `exp` | "Precisa reconectar" | Google Perfil: "O acesso expirou hoje, 9h: precisa ser reconectado" |
| `off` | "Não conectada" | E-mail: "Necessário para o Max enviar mensagens" |
| `na` | "Indisponível" | WhatsApp Business: "Ainda não disponível neste protótipo" |

**Fontes da conta em uso** (`src5`, L12783): "Onboarding e o que você contou", "Conversas e aprovações", "Site" (miolo.com.br), "Instagram" (@miolo.padaria), "Google Perfil" (Miolo · Pinheiros), "Planilha de encomendas" (encomendas-setembro.csv), "Documentos" (Guia da marca, cardápio, logo, 18 fotos), "E-mail marketing" e "WhatsApp Business". Cada linha diz quantos conhecimentos a fonte originou. No primeiro acesso: "Cadastro" ("Nome, segmento e cidade"), "Site" ("ainda não lido"), "Instagram", "Google Perfil" e "Documentos" ("nenhum enviado"). Rodapé: "Dados ilustrativos. Neste protótipo nenhuma conta é sincronizada de verdade: conectar e reconectar são simulações." (L5288).

**Ações por estado** (L13653): Google Perfil expirado tem "Reconectar (simulação)"; planilha desatualizada tem "Enviar planilha nova (simulação)"; e-mail não conectado tem "Conectar (simulação)". As outras linhas não têm ação nessa tela.

**Reconectar** (`_a5Reconnect`, L13079): aparece na faixa e na fonte como "Reconectar (simulação)" e, no detalhe e na conversa da responsabilidade, como "Reconectar conta (simulação)". Ao reconectar, o Google Perfil fica "Conectada" ("Reconectado hoje (simulação)") e a responsabilidade de busca local volta a "Ativa". Nasce a execução "Nova tentativa: buscas da semana" · "Programada depois da reconexão (simulação). O registro da falha continua aqui.". Registro: "Você reconectou o Google Perfil (simulação)". Aviso: "Google Perfil reconectado · simulação. Nova tentativa às 11h." A pendência some da faixa.

**Bloqueio por integração:**

- **Acesso expirado** (busca local): a responsabilidade fica em "Falha na execução" e a execução em "Falhou" depois de duas tentativas: "A consulta de hoje falhou duas vezes (9h e 9h30): o acesso ao Google Perfil expirou. Nada foi apresentado como concluído." As próximas execuções aparecem como bloqueadas. Na faixa, o pedido é "Para você reconectar".
- **Integração ausente** (relacionamento): a responsabilidade fica em "Bloqueada por integração" e a execução em "Não executada": "O e-mail marketing não está conectado. O Max pode preparar segmentos, mas nada é enviado sem integração, consentimento e a sua autorização." Esse bloqueio não gera pendência na faixa.
- **Cartão de envio do Max** (L5557, L12520–12522): uma lista de verificação com "Mensagens aprovadas" ("por você, hoje"), "Público com consentimento" ("23 de 138 inativos"), "Canal de envio" ("e-mail conectado (simulação)" ou "e-mail não conectado") e "Sua autorização de envio" ("pendente" ou "autorizado para seg, 19/10, 9h"). Botões: "Conectar o e-mail (simulação)" e "Autorizar envio para seg, 19/10, 9h". Textos: "Sem canal conectado, não há envio." e "Programada · simulação, nada é enviado". Conectado o e-mail: "E-mail marketing conectado · simulação. Nada é enviado sem a sua autorização."

**Planilha:** na Memória, "Enviar planilha nova (simulação)" leva a fonte a "Conectada" com "Planilha de outubro enviada hoje (simulação)" (a planilha é arquivo, "Arquivo, sem acesso contínuo"). No Max (L12322), a importação diz: "Para começar, anexe a planilha pelo clipe ao lado do campo. Eu procuro nome, e-mail, telefone, data da última compra e se a pessoa aceitou receber mensagens. Quem não aceitou entra na base, mas não recebe nada." As opções são "Usar a planilha de exemplo" e "Conectar a plataforma da loja", esta com "Essa integração ainda está pendente: neste protótipo não conecto.".

**Sem fonte, sem número:** Resultados vazio mostra "A Íris ainda não tem números para ler" · "Conecte o Instagram ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real." · "Ver conexões" (L5372).

**Regra de permissão visível:** conectar não autoriza agir. O protótipo diz "Conectar não autoriza publicar." (L4652), e as permissões da V3 separavam ler de agir: "Ler posts e métricas" e "Publicar só com sua autorização" no Instagram; "Ler avaliações e buscas" e "Responder: só com aprovação" no Google Perfil (L6196–6207).

## 9. Dados demo da Miolo (seed)

<!-- §9 em redação -->

## 10. Cruzamento com o banco e a API (S1a, S1b)

Fonte do lado do banco: `docs/parciais/S1a-relatorio.md` §1–§2, `S1b-relatorio.md` §1 e as migrations commitadas até 16/10 09:00, só lidas (`20261016063500_core_schema.sql`, `…063600_work_item_state_machine.sql`, `…070000_create_conversation_and_deliveries_bucket.sql`). Legenda: **temos**, **parcial** (existe, mas falta campo ou regra), **falta**, **conflita** (o banco contradiz o protótipo).

### 10.1 Conversas e mensagens

| O protótipo mostra | No banco e na API | Situação |
|---|---|---|
| Sala do Squad: uma por negócio, com tópico ("Campanha de Natal", L6251) | `conversation_kind = squad_room`, uma ativa por workspace (índice único) | **temos**; o tópico da sala não tem coluna (**parcial**) |
| Conversa direta com um especialista, várias por agente: "Nova conversa" cria outra (L6537–6545); histórico em "Minha Equipe & Conversas" | `agent_direct`; a API cria sempre uma nova; o dono confirmou em 16/10 08:55 | **temos** |
| Conversa em grupo com 2 a 6 especialistas escolhidos no Início: "Conversa em grupo com …" e "Conversa em grupo demonstrativa: aqui, responde um especialista por vez." (L7059, L7130–7140) | não há tipo de grupo; `conversation_participants` poderia guardar os agentes | **falta** (o desenho é combinado; o modelo é decisão técnica) |
| Conversa a partir de qualquer objeto: trabalho, peça e versão, projeto, post do calendário, indicador, "<Agente> percebeu", oportunidade, conhecimento da Memória, responsabilidade do Modo Autônomo, segmento do CRM, documento da Bia, capacidade ("O que você quer fazer com…") (§4) | `kind = object` aceita só `project`, `work_item` e `delivery` (`app.create_conversation`) | **falta** (os outros tipos de contexto) |
| Cartão de contexto: tipo, origem, período, participantes; o handoff pede negócio, especialista, ambiente, tipo e id do objeto, período e participantes (README §E.2) | `context_type`, `context_id`, participantes; `GET /conversations/{id}` devolve título e estado do objeto | **parcial** (faltam período, ambiente e origem) |
| Mensagens de cinco tipos: separador de dia, nota de sistema ("Você aprovou a v2 · 10:31", com marca de simulação), pessoa (com anexos), agente (com cartão) e sistema com agentes ("O Nexo chamou a Bia, a Kaia, o Otto e o Kiwi") (`M`, L6265–6271) | `author_type` `user`, `agent`, `system`; `body_format` só `markdown`; `attachments` jsonb | **parcial** (falta o cartão estruturado) |
| 24 tipos de cartão dentro da mensagem do agente, com ações e estado (pendente, aprovado, outra direção): trabalho criado, material, opções, equipe, conceito, proposta de rotina, publicação, indicador, pílula do Modo Autônomo, orçamento, pedido de trabalho, documento, mensagens do CRM, autorização de envio, combinado da delegação, sugestão e plano da Memória… (`docs/parciais/x1/cartoes_da_conversa.txt`) | não existe; a decisão passa por `approvals` | **falta** (cartão tipado ligado a `approvals` e às ações) |
| "Digitando", status vivo na conversa ("Kaia · criando a primeira versão"), aviso quando a pessoa está em outra tela | `run_events` (`message.created`, `run.progress`) pelo Realtime (S1a, S1c) | **parcial** (falta o texto de status por etapa) |
| Conversa não lida e badge na barra (`unread`) | não há leitura por participante | **falta** |
| A conversa abre nas mensagens mais recentes | dono, 16/10 08:55: a API ganha `before=` | **parcial** (pendente na S1b) |

### 10.2 Trabalhos, projetos, entregas e aprovações

| O protótipo mostra | No banco e na API | Situação |
|---|---|---|
| Família de status da V4.6 (`STK6`, L13856–13859): "Aguarda você" (e "Aguardando você", "Aguarda aprovação", "Aguarda a sua aprovação"), "Em andamento" (e "Em produção"), "Programado" ("Programada", "Planejado"), "Concluído" ("Concluída", "Entregue", "Publicado"), **"Aprovado" e "Aprovado por você" com o mesmo desenho de concluído**, "Pausado" ("Pausada") | `work_item_status`: `needs_you`, `in_progress`, `scheduled`, `approved`, `done`, `paused`, `blocked`, `failed`, `draft`, `cancelled` | **temos** o mapa `needs_you`→"Aguarda você", `in_progress`→"Em andamento", `scheduled`→"Programado", `approved`→"Aprovado", `done`→"Concluído", `paused`→"Pausado". `blocked`, `failed`, `draft` e `cancelled` **não têm rótulo nem desenho de trabalho na V4.6**: o comentário da L13856 cita "Bloqueado" e "Erro", mas nenhum trabalho os usa (§11) |
| Colunas do Quadro: "Precisa de você", "Em andamento", "Programados", "Concluídos", cada uma com o seu vazio (L8875) | filtro `status` repetível em `GET /work-items` | **temos** |
| Trabalho com frase de status ("Otto incluindo um bastidor no plano da semana 43"), próximo passo ("Aprovar a v2 até sex, 16/10"), prazo, resumo, documento, origem ("criado a partir de um insight da Íris · hoje", "execução PL-43") e histórico legível (agente, texto, hora, marca automática ou ok) (L7001–7003, L8011) | `title`, `briefing`, `delivery_type`, `primary_agent_id`, `collaborator_agent_ids`, `project_id`, `conversation_id`, `origin_message_id`; histórico em `audit_events` | **parcial** (faltam prazo, próximo passo, frase de status, origem tipada além da mensagem e o texto do histórico) |
| Modalidades: entrega pontual ("Trabalho criado · entrega pontual"), projeto coordenado ("Projeto criado · Sala do Squad") e rotina (Modo Autônomo) (L8607) | `work_items` e `projects`; rotina não existe | **parcial** (a rotina falta, §10.3) |
| Projeto com roadmap (janela de 21/09 a 27/12, L9675), marcos ("Próximos marcos"), faixa na cor de quem conduz, quem participa | `projects`: `name`, `objective`, `status`, `owner_agent_id` | **parcial** (faltam datas, marcos e participantes do projeto) |
| Versões "vN" com o que mudou ("data em destaque"), "Substituída pela v2", "Aprovada por você", "Nova versão a caminho", "Comparar" com "Antes" e "Agora" (L8613–8615, L5009, L5559) | `deliveries`, `delivery_versions` (`version_no`, `change_note`, `status` `draft`/`approved`/`superseded`) | **temos** (`change_note` ↔ o que mudou; `superseded` ↔ "Substituída pela vN"); "Nova versão a caminho" sai do run em andamento |
| Tipos de pendência `review`, `approve`, `auth`, `confirm`, `fix`, `answer` | `approval_kind`: `review`, `approve`, `authorize`, `confirm`, `reconnect`, `respond` | **temos** |
| Pendência `decide` ("Para você decidir", tipo-reserva) e linha `next` ("Em seguida", marco que ainda não depende de você) | não existem | **conflita** (`decide` não tem tipo no banco; `next` não é aprovação, vem de marcos) |
| "Agora não" na autorização deixa a decisão para depois: o trabalho mostra "Publicação ainda não autorizada." e "Decidir agora" (L6812–6814, L5017) | `approval_decision`: `approved`, `rejected`, `changes_requested`, `answered` | **conflita** se "Agora não" virar `rejected` (a pessoa precisa poder decidir de novo); a forma é decisão técnica, o comportamento é o do protótipo |
| "Pedir ajuste" e "Outra direção" | `changes_requested` → trabalho `in_progress` | **temos** |
| Rejeitar com duas saídas (cancelar ou pedir nova proposta) | dono, 16/10 08:55: `rejected` com `follow_up` `cancel` ou `revise` | **sem desenho na V4.6** (§11) |
| Pendência com prazo e consequência ("sai sex, 16/10, 9h, se você aprovar") e quem pede | `approvals.due_at`, `requested_by_agent_id` | **temos** |
| Uma decisora (Marina, "dona da Miolo") | dono, 16/10 08:55: só o owner decide | **temos** a regra; a interface de quem não é owner não existe (§11) |

### 10.3 Memória, Modo Autônomo, conexões e o resto

| O protótipo mostra | No banco e na API | Situação |
|---|---|---|
| Conhecimento da Memória com área ("Meu negócio", "Minha marca", "Conhecimento"), grupo, chave, valor, estado (`KST5`: "Confirmado", "Decisão sua", "Da fonte", "Observado", "Sugerido", "Desatualizado", "Descartado", "Em conflito", "Não usado"), fonte, agentes que usam, quem percebeu e histórico (§6) | nenhuma tabela de memória nas migrations commitadas (ADR-0009, embeddings, decidido) | **falta** |
| Fontes com estado (`SRCST5`: "Declarado por você", "Conectada", "Desatualizada", "Precisa reconectar", "Não conectada", "Indisponível") e permissões ("Ler páginas", "Ler posts e métricas", "Publicar só com sua autorização") (L12804, L7913, L7924) | não existe | **falta** |
| Responsabilidade (`RST5`: "Ativa", "Pausada", "Bloqueada por integração", "Falha na execução", "Encerrada", "Aguarda sua confirmação"), execução (`EXST5`: "Concluída", "Falhou", "Não executada", "Aguarda sua aprovação", "Aprovada por você", "Programada"), ciclo com código (PL-42, RS-42), frequência, próxima execução e níveis de autonomia (§7) | `run_kind = scheduled` e fila `runs_scheduled`, sem produtor nem consumidor | **falta** (Fase 3) |
| "<Agente> percebeu" com agente, leitura, explicação, fonte e uma ação ("Conversar sobre isso", "Transformar em trabalho"), com estado aberto, visto e feito (L13843–13844, L7019, `ins`) | não existe | **falta** |
| Status vivo do squad: modos `idle`, `work`, `wait`, `live`, `monitor`, `sleep`, com rótulos "disponível", "criando", "escrevendo", "pesquisando", "na estratégia", "trabalhando", "aguarda você", "coordenando", "acompanhando", "pausado" (L8049–8065) | não existe campo; dá para derivar de runs e approvals | **parcial** (derivado) |
| Sino de notificações com novidade e avisos curtos | Realtime em `approvals` e `run_events` | **parcial** (falta notificação guardada e lida) |
| Eventos que o protótipo dispara: trabalho e projeto criados, squad montado, versão entregue, aprovação, autorização, publicação agendada e confirmada, rotina ativada, pausada e retomada, memória sugerida, confirmada, corrigida e descartada, conexão lida, conectada e expirada | auditoria `work_item.created`, `work_item.status_changed`, `approval.decided`; Realtime `approval.created`, `approval.<status>`; `run_events` `message.created`, `run.progress`, `delivery.created`, `approval.requested` | **parcial** (faltam projeto, squad montado, publicação, rotina, memória e conexão) |
| "Plano Squad · créditos do mês" com barra (64% na conta em uso, 4% no primeiro acesso), no menu da conta (L10548) | créditos com valor provisório (dono, 16/10) | **falta** (a tela de preço fica por último, por decisão do dono) |
| "Adicionar um negócio" · "Outra marca na mesma conta" (L10546) | `workspaces` e `memberships` (uma pessoa em vários workspaces) | **temos** a base; falta o seletor na barra |

## 11. O que o protótipo não responde

<!-- §11 em redação -->
