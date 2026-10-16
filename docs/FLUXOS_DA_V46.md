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

<!-- §3.3 em redação -->

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

<!-- §6 em redação -->

## 7. Modo Autônomo

<!-- §7 em redação -->

## 8. Conexões e integrações

<!-- §8 em redação -->

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
