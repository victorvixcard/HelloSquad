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

Fonte: V4 (`ENVS`, L9597–9609; barra `_vSide`, L10501–10566), V4.1 a V4.5 (ambientes definitivos) e V4.6 (linguagem comum). Detalhe tela a tela em `docs/parciais/x1/notas_telas.md`.

### 1.1 Barra lateral

**Topo:** "HelloSquad" (wordmark em texto, provisório) · botão "Demo" (§3) · "Recolher a barra lateral" ou "Expandir a barra lateral" (L4541–4543, L10542). A barra tem 256 px aberta e 72 px recolhida (L10442) e recolhe sozinha abaixo de 1100 px de largura; recolhida, mostra ícone e dica.

| Grupo | Item (ordem exata) | Leva a | Contador ou ponto (L10505–10538) |
|---|---|---|---|
| "Principal" | "Início" | Início | — |
| | "Sala do Squad" | conversa `squad` em tela cheia (não é ambiente) | ponto de mensagem nova; dica "o squad está trabalhando" ou "todos os especialistas" |
| "Seu squad" | "Projetos" · Nexo | Projetos | **número de decisões suas**; dica "1 aguarda você" ou "N aguardam você" |
| | "Estratégia" · Bia | Estratégia | — |
| | "Marca & Criação" · Kaia | Marca & Criação | — |
| | "Conteúdo" · Otto | Conteúdo | — |
| | "Growth" · Kiwi | Growth Marketing | — |
| | "CRM" · Max | CRM | — |
| | "Resultados" · Íris | Resultados | — |
| "Gestão" | "Modo Autônomo" (desenho de interruptor no lugar do ícone) | Modo Autônomo | número suave de rotinas ativas; dica "N rotinas ativas, N pausada", "pausado", "um combinado aguarda você" ou "não configurado" |
| | "Memória da Marca" | Memória da Marca | número suave de informações a confirmar; dica "N informações para confirmar" |
| | "Minha Equipe & Conversas" | Minha Equipe & Conversas | ponto de mensagens novas fora da Sala; dica "mensagens novas" |

Cada item de "Seu squad" leva o rosto pequeno e o nome do agente, com expressão de estado: "big" quando ele aguarda você, "sleep" quando está pausado, "oval" no resto. Na conta em uso, a Kaia aparece "big" e o Max "sleep" (L10525). Endereços antigos redirecionam: Trabalhos vai para Projetos, e Conversas vai para Minha Equipe & Conversas, na aba "Conversas" (L9725–9727).

**Pé da barra** (L4554–4564, L10544–10563):

- **Conta:** "Marina" · "Miolo · Pinheiros" abre "Conta, negócio e configurações", com "Marina" · "dona da Miolo". Na seção "Negócio", a "Miolo" aparece marcada e há "Adicionar um negócio" · "Outra marca na mesma conta" (só aviso "Vários negócios na mesma conta · demonstrativo").
- **Créditos e menu:** "Plano Squad · créditos do mês" com a barra (64% na conta em uso, 4% no primeiro acesso) e os itens "Minha conta", "Configurações", "Guia do protótipo" e "Sair". Minha conta, Configurações e Sair só dão o aviso "… · demonstrativo neste protótipo".
- **Sino:** "Notificações", com ", há novidades" e um ponto até ser aberto, só na conta em uso. A lista traz rosto, título, linha de apoio e hora, e cada item leva ao trabalho, ao Modo Autônomo, a Resultados ou à conversa. Não há número no sino, e o que acontece na sessão só gera avisos curtos.

### 1.2 Cabeçalho de cada ambiente do squad (camada de identidade)

Cada ambiente abre com rosto do especialista, título, a linha "<Nome> <descrição>" (`ENVS[].d`), o catálogo "O que pedir à Bia" (ou "ao Nexo", "à Kaia"…) e o botão "Conversar com <Nome>" (L10569–10572). Logo abaixo vem a faixa "Precisa de você" (§5).

| Ambiente | Título | Linha de identidade |
|---|---|---|
| Projetos | "Projetos" | "Nexo organiza os projetos da Miolo e te chama quando a decisão é sua." |
| Estratégia | "Estratégia" | "Bia encontra onde está a oportunidade da Miolo." |
| Marca & Criação | "Marca & Criação" | "Kaia dá forma à marca da Miolo em cada peça." |
| Conteúdo | "Conteúdo" | "Otto cuida do calendário, das legendas e do que a Miolo fala em cada canal." |
| Growth | "Growth Marketing" (na barra, "Growth") | "Kiwi cuida do crescimento da Miolo: busca, anúncios e mais visitas virando encomendas." |
| CRM | "CRM" | "Max cuida de quem já é cliente, sempre com consentimento." |
| Resultados | "Resultados" | "Íris lê os números da Miolo e diz o que fazer com eles, sem inventar causa." |

"Conversar com <Nome>" abre a conversa do ambiente, em painel a partir de 1080 px, com sugestões como "O que precisa de mim esta semana?", "Qual projeto pede mais atenção?" e "Quero começar um projeto novo." (Projetos, L9778).

**Catálogo "O que você quer fazer com a Bia?"** (V4.2/V4.3, L11879–11930): diz "A Bia conduz o briefing na conversa, sem formulário.". Traz uma busca (ex.: "Buscar: diagnóstico, concorrentes…"), as capacidades agrupadas por finalidade e o estado de cada uma ("trabalho criado", "N trabalhos", "em conversa"). Vazio: "Nada com “…”. Escreva na conversa o que você precisa: a Bia entende." Rodapé: "Quando o pedido envolve outra especialidade, a Bia chama quem precisa na mesma conversa." Cada capacidade abre uma conversa de pedido (§4.7). As capacidades de cada agente (`CAPX_L`, L11346–11587) são:

| Agente | Grupos e capacidades |
|---|---|
| Nexo | "Organizar o trabalho": "Começar um projeto novo", "Coordenar uma campanha", "Passar uma tarefa para o squad" · "Acompanhar": "Acompanhar as entregas", "Revisar o que espera minha aprovação" |
| Bia | "Entender o negócio": "Analisar meu negócio", "Analisar o mercado e os concorrentes" · "Decidir o rumo": "Definir o posicionamento", "Montar um planejamento", "Encontrar oportunidades" |
| Kaia | "Marca": "Criar ou revisar a identidade visual" · "Peças e materiais": "Criar uma peça para as redes", "Criar um carrossel", "Criar materiais promocionais" · "Imagem e vídeo": "Editar e adaptar imagens", "Produzir vídeos e motion" |
| Otto | "Planejar": "Planejar os conteúdos", "Preparar o calendário editorial" · "Escrever": "Criar uma publicação", "Escrever textos e artigos", "Escrever para aparecer no Google" · "Publicar": "Programar os conteúdos" |
| Kiwi | "Busca e orgânico": "Ver onde a Miolo pode aparecer no Google", "Trazer mais visitas sem anúncio" · "Anúncios": "Planejar uma campanha paga", "Otimizar uma campanha", "Revisar orçamento e públicos" · "Conversão": "Fazer mais visitas virarem encomendas", "Criar um teste de conversão" |
| Max | "Conhecer os clientes": "Organizar meus públicos", "Segmentar clientes" · "Relacionamento": "Planejar uma campanha de relacionamento", "Criar uma jornada", "Preparar fluxos de mensagens" · "Captar e reativar": "Reativar clientes inativos", "Captar e reativar clientes" |
| Íris | "Entender os números": "Analisar um indicador", "Comparar períodos", "Interpretar um resultado" · "Acompanhar": "Montar um relatório", "Investigar um problema", "Acompanhar uma oportunidade" |

### 1.3 Telas

| Tela | Visão protagonista e componentes | Conta em uso | Primeiro acesso (vazio honesto) |
|---|---|---|---|
| **Início** (V3 R1.2, aprovado e congelado; a V4.6 não toca) | palco com os sete agentes; "Hello, Marina."; "Com o que vamos trabalhar hoje?"; campo "Peça ao squad. O Nexo organiza quem faz…" com "Anexar" e "↵ enviar"; "Quem participa" ("Squad" + sete rostos; a legenda diz "Sala do Squad", "Conversa direta com a Kaia" ou "Bia, Kaia e Otto · conversa em grupo"); faixa de sugestões que só preenchem o campo; "Recolher resumos" e "Mostrar resumos"; quatro resumos, um aberto por vez | "Resultados" (indicador da semana com "Íris: …", "Abrir Resultados" e "Conversar com a Íris"), "Trabalhos", "O Squad percebeu" ("Aceitar" e "Recusar") e "Modo Autônomo" (interruptor por rotina: "Pausar esta rotina" ou "Reativar esta rotina") | "Para o squad conhecer a Miolo" ("N de 3": "Mande o site", "Conecte o Instagram", "Conte o resto ao Nexo") no lugar de Resultados; "Nada em produção agora. Peça algo ao squad e o Nexo organiza quem faz."; "Nada configurado ainda. Delegue o que se repete: o squad cuida sozinho e pede a sua aprovação quando precisa." com "Configurar uma rotina" |
| **Sala do Squad** | conversa coletiva em tela cheia (§4) | Campanha de Natal em andamento | só a apresentação do Nexo |
| **Projetos · Nexo** | "Roadmap de projetos" (§2.3); "Seu Squad está trabalhando"; "Próximos marcos"; "Todos os trabalhos" · "Projetos, entregas pontuais e ciclos do Modo Autônomo, pela situação de cada um." com "Quadro", "Lista" e "Biblioteca" (§2.1) | 5 projetos e 12 trabalhos | "Nenhum projeto ainda" · "Projetos são pedidos maiores, como uma campanha. O Nexo monta o squad, organiza as etapas e te chama quando a decisão é sua." · "Começar pela Campanha de Natal"; "Ninguém em produção agora. Peça algo e o Nexo organiza quem faz."; "Nenhum marco com data nos próximos dias." |
| **Estratégia · Bia** | "Direção estratégica" ("Refinar com a Bia"); "Oportunidades identificadas" · "em ordem de relevância" (a primeira com "Bia percebeu" e a fonte); "Em análise" · "ainda sem conclusão"; "Planos e diagnósticos" · "documentos da Bia, com versões e aprovação", em leitura editorial com "Aprovar o direcionamento" ou "Aprovar o diagnóstico", "Pedir ajuste", "Baixar PDF", "Versões" e "Histórico" | direção, 5 oportunidades, 3 análises, 4 documentos | "A Bia ainda não conhece a Miolo o bastante para propor uma direção." · "Comece por um diagnóstico: ela usa o que você contar na conversa e pergunta o que faltar." · "Analisar meu negócio" |
| **Marca & Criação · Kaia** (estúdio) | "Bancada da Kaia" (o que precisa de você e "Em produção") e "Criações" · "O que a Kaia criou para a Miolo, com o que está em produção primeiro. Os mesmos arquivos da Biblioteca.", com os filtros "Todas", "Redes sociais", "Carrosséis", "Identidade", "Promocionais", "Imagens", "Vídeo e motion"; com filtro ativo, o último quadro é o novo pedido ("Nova peça para as redes", "Novo carrossel"…) | bancada e galeria preenchidas | contador 0 e galeria vazia, sem texto próprio (lacuna do protótipo, §11) |
| **Conteúdo · Otto** | "Calendário editorial", com "Semana", "Mês" e "Lista", "Semana anterior" e "Próxima semana", e "Hoje"; legenda "aguarda você", "agendado", "publicado"; o chip "Planejamento semanal"; o inspetor do item (estado, data, "Legenda do Otto", "Quem", "Origem", "Stories", "Desempenho", decisões e "Conversar com Otto sobre este conteúdo"); "Próximas publicações", "Desempenho orgânico" e "Otto percebeu" | 6 posts e planos das semanas 41 a 46 | "O Otto ainda não tem um calendário da Miolo" · "Ele pode planejar os conteúdos toda semana, no Modo Autônomo. Você aprova antes de qualquer publicação." · "Delegar o planejamento semanal" · "Pedir um post à Kaia" |
| **Growth · Kiwi** | "Objetivo de crescimento" ("Mais encomendas pelo site no Natal, sem depender só do Instagram."); "Kiwi percebeu"; três números de base com "dados ilustrativos"; três frentes: "Aquisição orgânica" ("4 oportunidades", tabela de buscas, "Presença no Google"), "Campanhas pagas" ("Nada no ar", "Nenhum anúncio no ar. Nada é investido nem ativado sem a sua autorização.", "Revisar e autorizar"), "Conversão e testes" ("1 teste rodando", "Uma hipótese por vez, com o que conta como resultado combinado antes.") | completo | igual, só sem "Kiwi percebeu" (lacuna do protótipo, §11) |
| **CRM · Max** | "Central de relacionamento": números, "Aceitam receber mensagens: 123 de 439 contatos", "Fontes e canais", "Segmentos" (painel "Público selecionado" com "Criar campanha para este público"), "Campanhas e jornadas" (estados "Rascunho", "Aguardando aprovação", "Programada", "Ativa", "Pausada", "Concluída"), "Max percebeu" e a jornada da reativação em cinco passos | completo | "Sua base de clientes ainda não está aqui." · "O Max começa pelos contatos que você já tem. Nada é enviado sem consentimento e sem a sua autorização." e quatro fontes ("Importar", "Conectar", "Saber mais") |
| **Resultados · Íris** | "Semana", "Mês" ou "Trimestre" com a comparação, "dados ilustrativos" e as fontes; três indicadores ("Analisar com Íris"); "Custo por clique" · "sem dados" · "A Miolo não tem anúncios ativos, então não há número para ler."; gráfico de 12 semanas ("Ver tabela"); "Íris percebeu"; "Análises recentes"; "Desempenho por canal"; "Oportunidades" | completo | "A Íris ainda não tem números para ler" · "Conecte o Instagram ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real." · "Ver conexões". Com o Instagram conectado: "A Íris começou a acompanhar o Instagram hoje" · "A primeira leitura chega na segunda, com uma semana de dados. A Íris não estima o que não mediu." |
| **Modo Autônomo** | §7 | 4 responsabilidades | "Nada delegado ainda." |
| **Memória da Marca** | §6 | 33 conhecimentos | só o cadastro |
| **Minha Equipe & Conversas** | "Abrir a Sala do Squad"; abas "Equipe" (os sete; perfil com "agora", "Conversar com a Kaia", "Pedir algo" e as abas "Agora", "Competências", "Entregas", "Trabalha com") e "Conversas" (§4.4) | 9 conversas | 2 conversas (Nexo e Sala) |
| **Detalhe do trabalho** (fora da barra; volta ao ambiente de origem) | §2.1 e §2.2 | — | "Nenhuma campanha ainda" · "Pedir na Sala do Squad"; "Ainda não há post" · "Peça à Kaia e acompanhe as versões aqui." · "Pedir à Kaia" (L5026) |

### 1.4 Entrada pela landing (Landing V1 R32)

Detalhe em `docs/parciais/x1/notas_landing_miolo.md`.

**Hero:** "Você cuida do seu negócio." · "Seu squad de IA assume o marketing."; campo "Diga o que você precisa"; dez sugestões, cada uma com os especialistas que a atendem (ex.: "Criar uma campanha para o fim de semana", com Bia, Kaia e Kiwi). Ao enviar, a sequência é:

1. "Pedido recebido"
2. "Nexo" + "está montando seu squad" (ele chama os especialistas um a um)
3. "<nomes> estão a postos" (ou "Kaia (Criação) está a postos")
4. a volta em torno de "Veja o Squad trabalhando"

Na landing, o Nexo nunca entra na lista: ele sempre coordena.

**Modais** (um só, com dois modos, L1883–1897):

| Modo | Título | Campo e botão | Ao enviar |
|---|---|---|---|
| Cadastro, com pedido guardado | "Seu pedido está guardado." · "Seu pedido" + o pedido · "Crie sua conta e o Nexo começa por ele." | "Seu e-mail" (`voce@seunegocio.com.br`) · "Criar conta grátis" | "Criando sua conta" → "Pronto" |
| Cadastro, sem pedido | "Crie sua conta grátis." · "Diga o que você precisa e o squad começa por aí." | idem | idem |
| Login | "Bem-vindo de volta." · "Entre para ver o que o seu squad fez desde a última vez." | "Seu e-mail" · "Entrar" | "Entrando" → "Pronto" |

Depois de enviar, os dois modos mostram "Nesta versão, nenhuma conta foi criada e nada foi enviado." O pedido digitado na Hero fica em `sessionStorage` (`hs-landing-pedido`) e só o cadastro o mostra. No protótipo, a Hero grava também as sugestões que toca sozinha, de modo que quem abre o cadastro sem digitar vê uma sugestão automática como "Seu pedido". Não aparecem no protótipo: senha, nome, termos, "esqueci a senha", login social, mensagens de erro e o que acontece depois do cadastro (§11).

## 2. Objetos e estados visíveis

**Um desenho por status** (V4.6, L13841–13859). O sinal de situação é forma, não cor (L6393): "anel, ponto, relógio, check, pausa", e o coral fica só para o que precisa de você. A V4.6 leva todo texto de status antigo a cinco famílias (`STK6`):

| Família | Sinal | Rótulos que caem nela |
|---|---|---|
| `you` | anel com "!" (coral) | "Aguarda você", "Aguardando você", "Aguarda aprovação", "Aguarda a sua aprovação" (e todo texto que começa por "aguarda") |
| `and` | ponto | "Em andamento", "Em produção" (e o que não casar com as outras) |
| `prog` | relógio | "Programado", "Programada", "Planejado" (e "agendad…") |
| `done` | check | "Concluído", "Concluída", "Aprovado", "Aprovado por você", "Entregue", "Publicado" |
| `pause` | duas barras | "Pausado", "Pausada" |

O comentário da L13856 cita ainda "Bloqueado" e "Erro" na família, mas nenhum trabalho usa esses estados. Bloqueio e falha só aparecem em responsabilidades e execuções do Modo Autônomo (§7). Detalhe dos objetos em `docs/parciais/x1/notas_objetos_seed.md` §A.

### 2.1 Trabalho

"Trabalhos agora vive em Projetos" (L9722): não há item de menu próprio; a seção "Todos os trabalhos" da página Projetos tem "Quadro", "Lista" e "Biblioteca" (L4833).

**Campos** (`_works`, L8006–8030): título, tipo ("Entrega", "Projeto" ou "Ciclo"; na tela, "Entrega", "Projeto" e "Modo Autônomo"), etiqueta ("entrega pontual", "projeto coordenado", "trabalho do projeto"), responsável e colaboradores, família de status, rótulo e detalhe curto do estado ("v2", "qui, 9h", "desde 05/10"), frase de status, próximo passo, prazo, resumo, documento, origem, histórico (agente ou você, texto, quando, marca "automático" ou "aprovado por você"), projeto, conversa e um destaque "novo". O protótipo tem `pct`, mas a V4.6 tira a barra onde não há medição real (L13957): **não exibir progresso inventado**.

**Colunas do Quadro** (L8875): "Precisa de você" ("Nenhuma decisão pendente"), "Em andamento" ("Nada em produção"; os pausados vão por último), "Programados" ("Nada programado") e "Concluídos" ("Nada concluído ainda"). Filtros: "Todos os tipos", "Entregas pontuais", "Projetos" e por especialista. Vazio, na conta nova: "Nenhum trabalho ainda" · "Peça algo ao squad em Novo pedido. O Nexo organiza quem faz, e o que precisar de você aparece aqui primeiro." (L9103). Com filtros: "Nenhum trabalho com esses filtros" · "Limpar filtros".

**Cartão:** o responsável e até dois colaboradores. Mostra "<Nome> está trabalhando nisso" quando há alguém em ação, ou "<Nome> responde", mais " · com <colaborador>" (L8867).

**Estados que o protótipo percorre** (post e campanha, L8010–8023):

| Situação | Família · rótulo | Frase de status | Próximo passo |
|---|---|---|---|
| post em criação | `and` · "Em andamento" | "Kaia criando a primeira versão" ou "Kaia ajustando a data" | "Kaia entrega a v2" |
| post em revisão | `you` · "Aguarda você" | "v2 aguarda sua aprovação" | "Aprovar a v2 até sex, 16/10" |
| aprovado, publicação por decidir | `you` · "Aguarda você" | "Aprovado. Falta decidir a publicação." | "Autorizar ou não a publicação" |
| publicação autorizada | `prog` · "Programado" | "Publicação agendada para sex, 16/10, 9h" | "Otto publica sex, 9h" |
| publicação recusada por ora | `done` · "Concluído" | "v2 aprovada · publicação não autorizada" | "Publicação quando você quiser" |
| campanha com pergunta | `you` · "Aguarda você" | "O Nexo quer saber: site, loja ou os dois?" | "Responder ao Nexo" |
| campanha em estratégia | `and` · "Em andamento" · "etapa 1 de 5" | "Bia desenvolvendo a estratégia" | "Bia apresenta o conceito" |
| conceito por aprovar | `you` · "Aguarda você" | "Conceito aguarda sua aprovação" | "Aprovar o conceito" |
| campanha em produção | `and` · "Em andamento" · "etapa 2 de 5" | "Kaia preparando as peças · 3 de 5 prontas" | "Revisão das peças · qui, 15/10" |
| ciclo da rotina | `prog` · "Programado" · "qui, 9h" | "Otto entrega para sua aprovação" | "Aprovar o plano na quinta" |
| trabalho pausado | `pause` · "Pausado" · "desde 05/10" | "Pausado por você · falta a lista com consentimento" | — |
| concluído | `done` · "Concluído" | "Entregue e aprovado por você" | — |

O post publicado de fato ("Publicado", depois da confirmação do canal) não acontece na sessão: a etapa "Confirmação" fica sempre por fazer (L9149–9157). Cancelar, excluir, reatribuir ou mudar o prazo de um trabalho não aparece no protótipo (§11).

**Origem** (`origin`, literal): "pedido na conversa com a Kaia · 10/10", "pedido na Sala do Squad · 05/10", "pedido pelo Nexo · 08/10", "combinado com a Íris · 01/10", "primeiro pedido da conta · 14/09", "Identidade visual da Miolo · etapa 1", "pedido em <Ambiente> · <assunto> · hoje", "conversa sobre <assunto> · hoje", "criado a partir de um insight da Íris · hoje", "Modo Autônomo · Planejar conteúdos toda semana · execução PL-43 (simulação)" (L9164, L9211, L6212–6236, L11856, L12005, L7002, L13119).

**Detalhe do trabalho** (L9131–9250; V4.3 L12081): título, etiqueta, origem, resumo, "Próximo passo", arquivo ("Arquivo final na Biblioteca" ou "Arquivo final depois da sua aprovação"), time, histórico, "Conversar" ou "Abrir a conversa do pedido" e o link do projeto. O post tem as abas "Legenda", "Briefing" e "Histórico"; a campanha, "Entregas", "Decisões", "Squad" e "Histórico" (L9161, L9209).

### 2.2 Entrega, versão e etapas

- **Peça:** fundo, texto, destaque, etiqueta do topo ou selo, título, subtítulo, ilustração, faixa e botão (`MioloPeca`, proporção 4:5).
- **Versões:** "v1", "v2"… com data e o que mudou ("data em destaque", "título mais curto", "fundo verde", "fornada em destaque", "nova abordagem"); selo na peça "mudou: data em destaque"; "Comparar" com "Antes" e "Agora"; "Você está vendo a v1 · versão anterior" (L9176–9181).
- **Estados da versão no cartão:** "Aguarda sua aprovação", "Aprovada por você", "Nova versão a caminho", "Substituída pela v3" (L8615).
- **Etapas do post** (L9149): "Preparação" ("Kaia cria a peça" → "Kaia criou e ajustou"), "Sua aprovação" ("v2 aguarda você" → "v2 aprovada"), "Publicação" ("só com autorização sua" → "precisa da sua autorização" → "autorizada · sex, 9h") e "Confirmação" ("quando o Instagram confirmar").
- **Etapas da campanha** (L9202): "Estratégia" (Bia: "Conceito aguarda você" → "Conceito aprovado"), "Peças" (Kaia: "3 de 5 prontas"), "Textos" (Otto: "Legendas e e-mail"), "Divulgação" (Kiwi: "Verba depende de você") e "Acompanhamento" (Íris: "A partir de 26/10"). Etapa sem medição fica indeterminada, sem barra (L13958).
- **Decisões da campanha** (L9227): "Aprovar o conceito" ou "Conceito aprovado", "Revisão das peças", "Verba de anúncios", "Publicação".

### 2.3 Projeto

- **Roadmap** (L9675, L10105–10173; V4.3 L12071): uma janela de 21/09 a 27/12, com faixas na cor de quem conduz e marcos. A legenda tem "projeto", "marco", "previsto" e "decisão sua" (L4779).
- **Cabeçalho:** "<n> ativos · <n> pausados · <n> decisões suas por perto" (L11115).
- **Detalhe:** "Objetivo", "Responsáveis", "Status", "Próximo marco", "Prazo", "Trabalhos pedidos neste projeto · N". Vazio: "Nenhum projeto ainda" · "Começar pela Campanha de Natal" (L4799–4812).
- **Rótulos de status do projeto:** "Em produção · etapa 2 de 5", "Em estratégia · etapa 1 de 5", "O conceito aguarda você", "Uma pergunta aguarda você", "Ativo no Modo Autônomo · desde 28/09", "Pausado no Modo Autônomo", "O combinado aguarda você", "2 de 3 etapas concluídas · a última ainda sem data", "Ativo · leitura toda segunda, 9h" e "Pausado por você desde 05/10".
- **Prazos:** "20/12" · "meta: 400 panetones", "Contínuo", "Sem prazo", "Sem data".
- **Trabalho pedido dentro de um projeto** vira marco "novo trabalho · <agente>" e entra na equipe do projeto (L12076).

### 2.4 Aprovação e pendência

Tipos, rótulos, catálogo e efeitos em §5. Cada pendência guarda o tipo, o objeto, quem pede, o título, a linha de apoio e o rótulo da ação. O Início não usa a faixa:

- No cartão "Trabalhos" (L8362–8369), mostra "1 aguarda você" ou "N aguardam você" e "Hoje, uma decisão é sua" ou "Hoje, <número por extenso> decisões são suas".
- Lista até três pendências; cada botão é a primeira palavra da ação ("Revisar", "Decidir", "Responder").
- Na barra lateral, o item "Projetos" leva o número de decisões, com a dica "N aguarda você" (L10533).

### 2.5 Rotina, conhecimento e conexão

| Objeto | Estados (rótulo exato) | Onde |
|---|---|---|
| Responsabilidade do Modo Autônomo | "Ativa", "Pausada", "Bloqueada por integração", "Falha na execução", "Encerrada", "Aguarda sua confirmação" | §7 |
| Execução | "Concluída", "Falhou", "Não executada", "Aguarda sua aprovação", "Aprovada por você", "Programada" | §7 |
| Conhecimento da Memória | "Confirmado", "Decisão sua", "Da fonte", "Observado", "Sugerido", "Desatualizado", "Descartado", "Em conflito", "Não usado" | §6 |
| Fonte e conexão | "Declarado por você", "Conectada", "Desatualizada", "Precisa reconectar", "Não conectada", "Indisponível" | §8 |
| "<Agente> percebeu" | aberto → visto → feito (vira trabalho ou conversa) | §1, §4.7 |
| Status vivo de cada agente | "disponível", "criando", "escrevendo", "pesquisando", "na estratégia", "trabalhando", "aguarda você", "coordenando", "acompanhando", "pausado" (L8063–8065), mais a frase longa ("Acompanha 3 trabalhos e te chama quando a decisão é sua.", "Aguarda a sua aprovação na v2 do post.", L8067–8075) | Início e Minha Equipe |

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
| 1 | Marina | o pedido acima | enviar | O roteador reconhece post e data (L6611–6617) e chama `_j1Start`. A Kaia aparece digitando por 1,2 s. Mandado a outro especialista, o pedido gera "Isso a Kaia resolve direto, sem reunir o squad. Passei o seu pedido para ela." (L6618), e a conversa da Kaia abre. |
| 2 | Kaia | "Combinado. Um post 4:5 para o Instagram, com a identidade da Miolo, para sexta, 16/10. Chamei o Otto para a legenda." + cartão "Trabalho criado · entrega pontual" · "Post do Dia Mundial do Pão" · "Kaia com o Otto" (L6738, L8607) | o cartão abre o trabalho | Trabalho `w-post` criado (post em `making`), com histórico "Você pediu na conversa com a Kaia". A conversa passa a se chamar "Post do Dia do Pão". Status vivo: "Kaia · criando a primeira versão", com o Otto. **Colaboração: a Kaia chama o Otto.** |
| 3 | Kaia | após 4,6 s: "Primeira versão pronta. Usei o pão como protagonista e o convite para sábado logo abaixo. O que acha?" + cartão do material (L6744) | "Aprovar v1" · "Pedir ajuste" · abrir a peça (L8616, L5539) | Post em `review`; histórico "v1 entregue". Status: "aguarda sua aprovação". Se a pessoa está em outra tela, chega o aviso "A Kaia entregou a v1 do post". Nasce a pendência "Para você revisar" (§5). |
| 4 | Marina | "Quero pedir um ajuste nesta versão." | "Pedir ajuste" | Kaia: "Claro. O que você quer mudar? Eu mudo só isso e mantenho o resto." + os ajustes ainda não usados: "Deixar a data mais visível", "Título mais curto", "Fundo verde da Miolo", "Destacar a fornada de sábado" (L6766–6768, L5784–5787). Texto livre também escolhe o ajuste por palavra-chave: data, curto, verde, sábado (L6751–6759). "Outra abordagem" só aparece na conversa do Otto sobre o post (L9637, L9949). |
| 5 | Kaia | "Mudo só a data. O resto fica igual." e, após 3,8 s, "Pronto, v2: data em destaque. Falta a sua aprovação." + cartão da v2 (L6776–6784) | "Aprovar v2" · "Pedir ajuste" | Histórico: "Você pediu: “Deixar a data mais visível”" e "v2 entregue · só a data mudou". O cartão da v1 passa a dizer "Substituída pela v2" (L8615). Aviso: "A Kaia entregou a v2 do post". |
| 6 | Marina | "Aprovar v2", no cartão, no detalhe do trabalho ou por texto ("aprov", "perfeit", "pode seguir", "está ótimo", "fechado", L6624) | aprovar | Nota "Você aprovou a v2 · 10:31". Histórico: "Você aprovou a v2". Status: "v2 aprovada". Aviso: "v2 aprovada. A Kaia foi avisada." (L6795–6799). |
| 7 | Kaia | "Obrigada! Quer que o Otto publique no Instagram na sexta, às 9h? Aprovar a peça não publica nada sozinho." + cartão de autorização (L6800) | "Autorizar publicação" · "Agora não" (L5544) | Nasce a pendência "Para você autorizar": "Publicação do post" (§5). |
| 8a | Kaia | "Combinado: o Otto agendou para sexta, às 9h, com a legenda dele. Ele te avisa quando o Instagram confirmar." | "Autorizar publicação" | Histórico do Otto: "Publicação autorizada para sex, 16/10, 9h". Status vivo: "Otto · publicação agendada · sex, 9h". Aviso: "Publicação agendada · simulação". O trabalho mostra "Publicação autorizada · sex, 16/10, 9h", "simulação" e "Confirmada só quando o Instagram confirmar." (L6807–6811, L5016). **Colaboração: a Kaia entrega e o Otto publica.** |
| 8b | Kaia | "Sem problema. A peça fica pronta em Trabalhos; você autoriza a publicação quando quiser." | "Agora não" | Post com `pub: 'no'`. O cartão vira "Publicação não autorizada por enquanto". O trabalho mostra "Publicação ainda não autorizada." e o botão "Decidir agora", que volta a pedir a autorização (L6812–6814, L5017, L9189). |

**Estados do post:** `none` → `making` → `review` → (ajuste) `making` → `review` → `approved`. Publicação: `none` → `ask` → `yes` ou `no`. Em Projetos, o trabalho em revisão aparece como "v2 aguarda sua aprovação" · "Aguarda você", com o próximo passo "Aprovar a v2 até sex, 16/10" (L8011).

### 3.2 Campanha coordenada: Natal na Sala do Squad (Nexo, Bia, Kiwi, Kaia, Otto)

**Gatilho** (`_journey(2)`, L7985–7991): zera a campanha e abre a Sala do Squad com "Esta é a Sala do Squad. Para pedidos maiores, eu organizo quem entra e cada especialista contribui na sua parte." O campo vem preenchido com "Quero uma campanha de Natal para vender mais panetones." (L5801).

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Nexo | "Boa. Antes de montar o time: as encomendas de panetone vão ser pelo site, na loja ou nos dois?" (L6829). Pedido de campanha feito a outro especialista: "Uma campanha envolve várias frentes. Chamei o Nexo para organizar na Sala do Squad." (L6630), e a Sala abre | "Pelo site" · "Na loja" · "Nos dois" | Campanha em `asking`. Tópico da sala: "Campanha de Natal". Status: "organizando seu pedido", depois "aguarda sua resposta". Pendência "Para você responder": "Uma pergunta do Nexo" (§5). |
| 2 | Nexo | "Combinado: site e loja. Montei o squad da campanha e eu acompanho. Te chamo quando houver decisão." + cartão da equipe: Bia "estratégia e conceito", Kaia "peças da campanha", Otto "legendas e e-mail", Kiwi "anúncios, se você liberar verba" (L6837, L8626) | o cartão abre o projeto | Campanha em `strategy`. Mensagem de sistema: "O Nexo chamou a Bia, a Kaia, o Otto e o Kiwi". Aviso: "Projeto criado: Campanha de Natal". Status: "Bia · desenvolvendo a estratégia". **Colaboração: o Nexo monta o squad.** |
| 3 | Kiwi | "Enquanto a Bia trabalha, já separei os públicos perto da loja. Só entro com verba depois da sua autorização." (L6842) | — | **Colaboração: o Kiwi trabalha em paralelo à Bia.** |
| 4 | Bia | "Proposta de conceito para o Natal da Miolo:" + cartão do conceito "O Natal que leva tempo." · "A fermentação natural vira prova de cuidado. Para famílias do bairro e empresas que presenteiam equipes.", com Para "famílias e empresas", Canais "Instagram, site e e-mail" e "Este conceito orienta peças, textos e anúncios da campanha." (L6845, L8046–8047, L8629, L5542) | "Aprovar conceito" · "Outra direção" | Campanha em `concept`. Status: "Bia · aguarda sua aprovação". Aviso: "A Bia enviou o conceito da campanha". Pendência "Para você aprovar": "Conceito da campanha" (§5). |
| 5a | Marina e Bia | "Quero ver outra direção." → "Outra direção: o panetone como presente que se divide. Foco em empresas e famílias grandes." + conceito "Um presente que se divide." (L6873–6875) | "Outra direção" | O cartão anterior passa a "Você pediu outra direção". Status: "buscando outra direção", depois volta a "aguarda sua aprovação". |
| 5b | Nexo, Otto, Kaia | Nexo: "Conceito aprovado. A Kaia e o Otto começam agora; a revisão das peças fica para quinta, 15/10. Nenhuma verba é usada sem a sua autorização." Otto: "Vou escrever as legendas e o e-mail de encomendas a partir do conceito." Kaia, após 4,2 s: "3 de 5 peças prontas. Termino as outras duas até quarta e mostro tudo junto na revisão." + cartão "Peças de Natal · 3 de 5" (L6863–6867) | "Aprovar conceito" | Nota "Você aprovou o conceito · hh:mm". O cartão diz "Conceito aprovado por você". Campanha em `production`. Status: "Kaia · preparando as peças", com o Otto. Aviso: "Conceito aprovado. Kaia e Otto começaram." Próximo marco: "Revisão das peças de Natal" · "Kaia apresenta as 5 peças" (L8469). **Colaboração: três agentes em sequência na mesma conversa.** |

**Estados da campanha:** `none` → `asking` → `strategy` → `concept` → `production`. Se a campanha já existe, o Nexo responde "A campanha de Natal já está em andamento. Abri o projeto para você acompanhar." (L6823). O roteiro termina nas "3 de 5" peças: a revisão das cinco peças, a verba do Kiwi e a publicação da campanha não aparecem no protótipo. A Memória não guarda o conceito nem o canal escolhidos.

### 3.3 Rotina no Modo Autônomo: planejamento semanal (Nexo, Otto, Kaia)

**Gatilho** (V4.5 `_journey`, L13279–13286, sobre a V4.4): abre a conversa com o Nexo, em painel a partir de 1080 px, com o campo preenchido com "Quero que vocês planejem meus conteúdos toda semana.". A V3 abria um assistente de quatro passos na página do Modo Autônomo; na V4.5 a delegação é "uma conversa, não um formulário" (L13138). O mesmo fluxo começa por "Delegar uma responsabilidade", "Delegar a primeira responsabilidade", pelos cartões de "O que mais pode ficar com o squad", por "Configurar uma rotina" no Início ou por texto livre ao Nexo.

| # | Quem | Texto-roteiro | Decisão e botões | Efeito |
|---|---|---|---|---|
| 1 | Marina | o pedido acima | enviar | `_d5Kind` reconhece "planej/conteúd/plano/posts/instagram" e escolhe o modelo `plan` (L13165). A conversa se chama "Nova responsabilidade". Sem modelo reconhecido, o Nexo pergunta "O que você quer deixar por conta do squad? Pode escrever do seu jeito, como “quero que vocês planejem meus conteúdos toda semana”." e oferece "Planejar conteúdos toda semana", "Preparar posts toda segunda", "Avisar sobre oportunidades" e "Responder avaliações do Google". |
| 2 | Nexo | "Isso fica com o Otto, com a Kaia quando houver produção visual. Eu coordeno e te chamo quando algo depender de você." Logo depois, a mensagem de sistema "O Nexo chamou o Otto e a Kaia para esta conversa" (L13177, L9867) | — | O Otto conduz as perguntas. **Colaboração: o Nexo passa a palavra ao responsável.** Fora da jornada, se a rotina já existe: "O Otto já cuida disso: “planejar meus conteúdos toda semana”, toda quinta, às 9h (ativa). Para não ter duas rotinas iguais, eu ajusto a que existe." com "Ajustar a rotina atual" e "Ver no Modo Autônomo" (L13171). Pedido de rotina feito a outro especialista: "O que se repete passa pelo Nexo, no Modo Autônomo. Chamei ele." (L6638). |
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
| 2 | Kaia | "Feito. Na peça de encomendas do panetone, o preço saiu do texto pequeno e foi para o selo no topo." + cartão "Antes" ("Panetone de fermentação natural · R$ 89" no texto pequeno) e "Agora" (selo "R$ 89" no topo) (L5559, L13726) | — | A peça muda: o ajuste foi pedido e feito. |
| 3 | Kaia | "Percebi uma possível preferência sua. Deixei como sugestão na Memória da Marca: as próximas peças só mudam se você confirmar." + cartão "Memória da Marca · sugestão" com a pergunta, "Origem: este ajuste · hoje" e "Sugestão · aguardando você" (L13052, L13728–13730, L5560) | "Ver na Memória da Marca" | Nasce o conhecimento "Peças promocionais" · "Preços mais visíveis nas peças promocionais", em "Sugerido", sugerido pela Kaia e usado por Kaia, Otto e Bia depois do ok. Pergunta: "Você prefere preços mais visíveis nas peças promocionais?". Origem: "Ajuste pedido à Kaia · peça de encomendas do panetone". Histórico: "A Kaia sugeriu: preços mais visíveis nas peças promocionais". Na Memória, aparece no topo de "O squad percebeu" como "Kaia percebeu · …". **O ajuste não vira regra sozinho.** |
| 4 | Marina | — | "Confirmar" · "Corrigir" · "Descartar" (na Memória, §6) | "Confirmar" leva a "Confirmado", com o aviso "Confirmado. Kaia, Otto e Bia usam a partir da próxima entrega." e o selo "confirmada hoje". |
| 5 | Marina (navega até lá; o guia não leva) | — | no Modo Autônomo, na responsabilidade "Planejar meus conteúdos toda semana", "Simular a execução de quinta", que vira "Ver a execução PL-43" | Cria o trabalho "Plano da semana 43" (Otto com a Kaia, "Aguarda a sua aprovação") e a execução "PL-43", em "Aguarda sua aprovação" · "Entregue: 3 posts para 19 a 25/10 · aguarda a sua aprovação". Com o preço confirmado: "O preço do panetone aparece em destaque, como você confirmou na Memória da Marca." Sem confirmar: "O preço do panetone fica no texto: a preferência por preços visíveis ainda não foi confirmada." O Otto diz "Plano da semana 43 pronto, no ciclo de quinta. Usei as orientações confirmadas da Memória da Marca. Nada é publicado antes da sua aprovação." Aviso: "PL-43 · plano da semana 43 entregue (simulação)". A execução lista "Orientações da marca utilizadas: N" e "Não usada, porque ainda é sugestão: “…”". **Colaboração: Kaia, Memória, Otto.** |
| 6 | Marina | — | "Aprovar o plano" (L5561) | "PL-43" passa a "Aprovado por você hoje, HH:MM. Cada publicação continua pedindo a sua aprovação." Aviso: "Plano da semana 43 aprovado. Nada é publicado sem a sua aprovação de cada post." O próximo ciclo vira "Plano da semana 44" (qui, 22/10). |

Se a preferência já existe, a Kaia responde "O preço já está em destaque nessa peça. A preferência continua na Memória da Marca, do jeito que você deixou." (L13047). O plano tem três peças: "seg · Encomendas de panetone" (com o selo "R$ 89" se o preço está confirmado), "qua · Bastidores" e "sex · Pão de abóbora" (L13466–13470). A faixa mostra "Plano da semana 43" · "Para você aprovar" · "Revisar o plano", mas esse botão abre o trabalho, que não tem "Aprovar": no protótipo, aprova-se pelo cartão da conversa. O ajuste da jornada 1 e o conceito da jornada 2 **não** viram sugestão na Memória; só o pedido de preço da jornada 4 vira.

### 3.4 Ciclo de aprendizado da Memória: preço em destaque (Kaia → Memória → planejamento)

<!-- §3.4 em redação -->

## 4. Conversa

"A conversa é a interface principal" (handoff §A). Um só componente serve todos os ambientes (V4, L9762); a camada final de cada método está mapeada em `docs/parciais/x1/notas_conversa_pendencias.md` §0, e o detalhe completo em §A da mesma nota.

**Regra do Nexo** (L6694): "Dá para organizar em três frentes: o que é pontual vira pedido, o que é grande vira projeto na Sala do Squad e o que se repete vai para o Modo Autônomo."

### 4.1 Tipos de conversa

| Tipo | Como nasce | O que a tela diz |
|---|---|---|
| Sala do Squad (uma por negócio) | item "Sala do Squad" da barra; Início com os sete selecionados (L7063); "Responder" ou "Revisar conceito" na faixa | título "Sala do Squad", subtítulo com o tópico ou "Pedidos grandes"; "7 especialistas"; "todos os especialistas · o Nexo coordena"; campo "Escreva para o squad…"; dica "O Nexo distribui para quem precisa" (L8511–8546) |
| Conversa direta com um especialista (várias por agente) | Início com um selecionado (L7064); "Conversar com…" na identidade do ambiente; "Nova conversa" | campo "Mensagem para a Kaia…"; dica "Conversa direta com a Kaia" |
| Conversa em grupo (2 a 6) | Início com dois a seis selecionados (L7130) | sistema: "Conversa em grupo com <nomes>"; nota "Conversa em grupo demonstrativa: aqui, responde um especialista por vez."; dica "Conversa em grupo · demonstração: responde um especialista por vez". Responde o especialista mais ligado ao pedido, por palavra-chave (`GKEYS`, L5876–5884), e o Nexo desempata |
| Conversa a partir de um objeto (uma por objeto) | "Conversar com <agente> sobre…", "Analisar com Íris", "Conversar sobre isso" etc. (`_openCtx`, L9831) | tipos: "Ambiente", "Projeto", "Resumo" ("Precisa de você", "Seu Squad está trabalhando", "Próximos marcos"), "Publicação", "Plano semanal", "Data da campanha", "Espaço no calendário", "Indicador", "Canal", "Análise da Íris", "Oportunidade", "Pedido", "Conversa sobre", "Conhecimento", "Responsabilidade", "Nova responsabilidade" (L9777–9825, L11936, L13301–13313) |
| Pedido do catálogo (uma por pedido) | "O que você quer fazer com <agente>?" e cada capacidade (§1) | tipo "Pedido"; novo pedido da mesma capacidade abre outra conversa: "Mais um, separado do anterior." (L11959) |
| Delegação (Modo Autônomo) | "Delegar uma responsabilidade" etc. | "Nova responsabilidade" (§3.3) |

Com o dono (16/10 08:55): a conversa de objeto é reaproveitada; a conversa direta tem histórico e "Nova conversa" cria um diálogo novo, como no protótipo.

### 4.2 Abrir, fechar, expandir e retomar

- **Modos:** fechada, painel à direita (380 px a partir de 1360 px de largura, 364 px abaixo disso, por cima da página quando espremeria o conteúdo) e tela cheia (L6526, L10444–10447). Conversa de objeto e pedido abrem em painel a partir de 1080 px; as outras, em tela cheia.
- **Botões do cabeçalho** (L5515–5518): "Mostrar o contexto" ("Contexto"), "Expandir a conversa" ("Expandir", do painel para a tela cheia), "Abrir ao lado da tela" ("Abrir ao lado", da tela cheia para o painel) e "Fechar a conversa" ("Fechar").
- **Esc** (L9747–9758): fecha o que estiver aberto por cima; no painel, fecha a conversa e devolve o foco ao botão que a abriu; em tela cheia, não fecha.
- **Retomar:** reabrir sobre o mesmo objeto volta à mesma conversa, com o histórico e sem não lidas. Se o objeto mudou, entra "Contexto atualizado: <resumo>" e uma nova primeira mensagem (L9846). Conversa nova começa com "Hoje" e a primeira fala do especialista, em 720 ms.
- **Não lida:** mensagem em conversa fechada soma uma não lida; com a pessoa em outra tela, chega um aviso curto (ex.: "A Kaia entregou a v1 do post") e aparece o ponto na barra.

### 4.3 Cartão de contexto

O contexto não é uma mensagem; aparece em três lugares:

1. **Cabeçalho:** "Conversando sobre" + o nome do objeto, com o link de volta ("Ver no calendário", "Ver no roadmap", "Ver <Ambiente>").
2. **Faixa de período:** "A página está em outro período." + "Atualizar para <período>", em indicadores e canais (L11274, L10900).
3. **Coluna "Contexto da conversa"**, em tela cheia a partir de 940 px (L5571, L10920–10926): título e resumo do objeto; "Ambiente", "Tipo", "Período" (quando há), "Negócio" ("Miolo · <lugar>"), "Origem" (ex.: "Calendário · semana", "Resultados · mês"); pessoas "responde · <Ambiente>" e "participa · <Ambiente>"; e "Voltar para <Ambiente>".

Sugestões de pergunta ("Pergunte à Kaia") somem depois da primeira mensagem da pessoa (L11276, L10912). Para o backend, o contexto que a conversa carrega é: negócio, ambiente, tipo e id do objeto, nome, resumo, período, filtros de origem, agente que responde e participantes (handoff §E.2).

### 4.4 Histórico e "Nova conversa"

- **Minha Equipe & Conversas**, aba "Conversas" (contagem e ponto de não lida): "Tudo o que você conversou com o squad, por assunto e por contexto."; busca "Buscar conversas"; filtros "Sala do Squad" e os sete rostos; vazio "Nenhuma conversa com esse filtro." · "Limpar filtros" (L10884–10885, L9581).
- **Linha:** título (ou "Sala do Squad · <tópico>"), "<Nome> · <Ambiente>" + "· sobre uma publicação" (um projeto, um indicador, o ambiente, um contexto) ou "pedido: <nome>", a última mensagem ("Você: …", "<Nome>: …" ou "enviou um material"), hora e ponto de não lida. Clicar abre em tela cheia.
- **"Nova conversa"** (L5507, L6537–6545), no seletor de conversas do cabeçalho de uma conversa direta: cria "Nova conversa", que começa com "<Oi, eu sou …> <pitch> O que você precisa?" e os três pedidos de exemplo do agente. Na primeira mensagem da pessoa, o título vira o texto dela (até 34 caracteres) e a conversa passa a constar no histórico. O seletor lista as conversas com o mesmo especialista.

### 4.5 Como o agente responde

- **Envio:** "Enter" envia; a mensagem da pessoa entra com hora e nome dos anexos. Só anexo também envia (L6593–6598).
- **"Digitando":** "<Nome> está escrevendo" e o status "escrevendo…" por 700 a 2400 ms, conforme o roteiro (L6576, L8540).
- **Roteiro:** a cadeia de roteadores (V4.5 → V4.4 → V4 → V3, L13394, L12492, L9871, L6606) reconhece as jornadas, os pedidos de cada especialista (`_intent`, L6647) e as intenções sobre o objeto da conversa.
- **Resposta-padrão para texto fora do roteiro** (L6727–6728, L9942):
  - Conversa comum: "Anotei. Neste protótipo eu respondo a alguns roteiros de exemplo. Experimente:" + dois pedidos de exemplo.
  - Conversa de objeto: "Anotei, sobre “<objeto>”. Neste protótipo eu respondo a alguns roteiros de exemplo; experimente um destes:" + até três sugestões.
  - **Na produção, é aqui que entra o agente real; a resposta-padrão não vai para o produto.**
- **Pedido para o especialista certo:** pedir um post fora da conversa da Kaia faz o agente responder "Isso a Kaia resolve direto, sem reunir o squad. Passei o seu pedido para ela." (L6606); promoção pedida ao Nexo vai à Bia ("Promoção é com a Bia, que cuida da estratégia. Pedi a ela uma proposta que combine com a Miolo.", L6698).
- **Anexo:** "Anexar" abre "Anexar à conversa" com "Foto ou vídeo", "Arquivo", "Da Memória da Marca" e "Peça da Biblioteca" (L10478). Resposta: "Recebi o anexo e guardei junto com “<objeto>”. Vou considerar no que estou preparando." (L9937); a Kaia diz "Vou usar como referência visual." (L6650). O anexo do Início passa para a conversa.
- **Mensagens de sistema e notas:** "O Nexo chamou a Bia, a Kaia, o Otto e o Kiwi", "Você aprovou a v2 · 10:31", "Contexto atualizado: …".
- **Cartões:** 24 tipos, com os botões em `docs/parciais/x1/cartoes_da_conversa.txt` e os campos em §A9 da nota. Escolher uma opção desabilita as outras e marca a escolhida.

### 4.6 Colaboração entre agentes na mesma conversa

- **Convite:** "<O Nexo> chamou <a Bia> para esta conversa" entra como mensagem de sistema, e o convidado fala em seguida ("Aqui é a Bia. …") (`_cxJoin`, L9862). O cabeçalho mostra os rostos e "com Kaia e Otto"; a coluna lateral separa quem "responde" de quem "participa".
- **Na Sala:** o popover de pessoas tem "Chamar", "Conversar" e "Chamar alguém" (L5509, L5595). "Chamar" só escreve "@<Nome> " no campo; o protótipo não interpreta a menção (L8514).
- **Regra:** "Quando o pedido envolve outra especialidade, <o Nexo> chama quem precisa na mesma conversa." (L11896). Nada é duplicado: o convidado trabalha na mesma conversa e no mesmo trabalho.

### 4.7 Como um pedido vira trabalho

1. **Entrega pontual** (§3.1): o especialista confirma o escopo e cria o trabalho na hora, com o cartão "Trabalho criado · entrega pontual". A origem é "pedido na conversa com a Kaia · 10/10" (L9164). O status começa em "Kaia criando a primeira versão" · "Em andamento".
2. **Projeto** (§3.2): o Nexo esclarece, monta o squad e cria o projeto ("Projeto criado: Campanha de Natal", cartão "Projeto criado · Sala do Squad").
3. **Rotina** (§3.3): vira responsabilidade no Modo Autônomo, não trabalho.
4. **Pedido do catálogo** (V4.3, `_capAskWork`, L11979):
   - O especialista conduz o briefing por perguntas com opções e depois diz "Antes de começar, confere o trabalho:". O cartão "Confirmar o trabalho" traz a relação ("Projeto novo", "Entrega pontual" ou "Trabalho do projeto <nome>"), "Responsável", "Com", "Próximo passo" e "Prazo", com "Criar o trabalho" e "Ajustar" (L5554).
   - "Criar o trabalho" cria o trabalho "Em andamento" ("<Líder> preparando"), com origem "pedido em <Ambiente> · <pedido> · hoje" e histórico "Você pediu…", "Você confirmou o trabalho", "<Líder> assumiu o trabalho, com …". Mensagem: "Pronto. Está em Projetos, dentro de <projeto>." (ou "Está em Projetos, em Todos os trabalhos.") + "Te chamo quando tiver a primeira versão." + "Fazer outro pedido assim". Aviso: "Trabalho criado · <título>". O cartão vira "Trabalho criado", com "Abrir o trabalho" e "Ver o projeto".
   - "Ajustar" responde "Claro. Me diga aqui o que mudar (prazo, projeto, formato) e eu ajusto antes de criar." (L11995).
5. **"<Agente> percebeu":** "Transformar em trabalho" cria o trabalho com origem "criado a partir de um insight da Íris · hoje", com o aviso "Virou trabalho do Otto: bastidores semanais" (L7001–7006).

Regra do Documento Mestre §8, que o protótipo respeita: pedido recebido não é trabalho criado. O trabalho só nasce quando o escopo foi confirmado na conversa: na entrega pontual, pela resposta do especialista; no catálogo, por "Criar o trabalho".

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

Todos os dados são fictícios ("dados ilustrativos"). **Regra do dono:** o seed usa `docs/DADOS_FICTICIOS.md`; o que o protótipo traz e colide com a regra muda no seed. Exemplos: o domínio "miolo.com.br" vira um domínio `.example`, e o "@miolo.padaria" e a cidade só entram como texto de exemplo. Listas completas, com campos e exemplos literais, em `docs/parciais/x1/notas_objetos_seed.md` §B e `notas_memoria_autonomo_conexoes.md` §A15 e §B3.

| Conjunto | Origem | Itens | Resumo |
|---|---|---|---|
| Conta | `ACCOUNT` (L5819) | 1 | Marina, "dona da Miolo"; negócio "Miolo", "Padaria · Pinheiros" |
| Conversas | `TH_META` e `threadsFor` (L6250, L6273) | 9 | "Sala do Squad" (tópico "Campanha de Natal"), "Organização da semana" (Nexo), "O que os clientes dizem" (Bia), "Post do Dia do Pão" (Kaia), "Planejamento semanal" (Otto), "Anúncios de Natal" (Kiwi), "Reativação de clientes" (Max), "Análise de resultados" (Íris), "Identidade da Miolo" (Kaia). No primeiro acesso: "Boas-vindas" do Nexo e uma "Apresentação" de cada agente |
| Trabalhos | `GEN` (L6208–6246) + post, campanha e ciclo | 12 no Quadro (1 · 3 · 2 · 6 por coluna) | ex.: "O que os clientes dizem da Miolo" (Bia, "Em andamento", até qua 14/10), "Reativação de clientes inativos" (Max, "Pausado"), "Diagnóstico de marketing" ("Concluído", 18/09), "Relatório de outubro" ("Programado", 02/11) |
| Projetos | `_projs` (L10106), `PJ_OF` (L11782) | 5 | "Campanha de Natal", "Planejamento de conteúdos", "Identidade visual da Miolo", "Acompanhamento de performance", "Reativação de clientes" |
| Peças | `PIECES` (L5772, L9635), `ADJ` (L5783) | 9 peças, 5 ajustes | post do Dia Mundial do Pão (v1 e v2), três peças de Natal, "Fornada de segunda", "Bastidores", abóbora, focaccia, levain |
| Calendário | `CAL_POSTS`, `CAPS`, `CAP_ALT`, `MORE_LINE`, `CAL_PLANS` (L9639–9673) | 6 posts, planos das semanas 41 a 46 | ex.: "36 horas de paciência" (14/10, agendado), "Dia Mundial do Pão" (16/10, segue o post) |
| Resultados | `KPIS`, `RES`, `RS_*` (L6030–6061, L9679–9711) | 4 indicadores × 12 semanas; 3 períodos | "Encomendas pelo site" (128 em setembro, "+18%"), "Visitas vindas do Instagram", "Alcance no Instagram", "Nota no Google"; canais: Instagram 54, "Busca no Google" 31, "Direto no site" 27, WhatsApp 16 |
| Recomendações e oportunidades | `RECS` (L6063), `_opps` (L10175), `OPSRC6` (L13848) | 3 + 6 | "Manter um post de bastidores por semana", "Abrir as encomendas de panetone em 26/10", "Reforçar o sábado, dia com mais encomendas" |
| Notificações | `NOTIFS` (L6070) | 4 | "A Kaia entregou a v2 do post", "“Fornada de segunda” foi publicado", "Leitura semanal pronta", "A Bia começou a ler as avaliações". No primeiro acesso: "Boas-vindas ao HelloSquad" |
| Memória | `memItems` (L6148), `MX5`, `MEM5_ADD`, `LOG5` (L12722–12917) | 33 conhecimentos, 6 alterações | inclui uma sugestão ("Peças de oferta"), um conflito ("Horário"), um desatualizado ("Mais vendidos") e um descartado ("Emojis") |
| Fontes | `src5` (L12783) | 9 | §8 |
| Responsabilidades e execuções | `TPL` (L6077, L12806), `EX5` (L12866) | 8 modelos, 4 ativas na conta, 8 execuções | §7 |
| Kaia | `KA_*` (L11863–11873) | carrossel de 3 telas, 4 imagens, 5 capas, 7 categorias | "Do levain ao forno." |
| Kiwi | `GX` (L11799) | 11 objetos | "Teste perto da loja" (até R$ 40 por dia, 7 dias, 3 km da loja), "Busca: panetone artesanal" |
| Bia | `BX`, `DX_SEP`, `DX_OCT`, `PLAN` (L12251–12394) | 11 objetos, 2 diagnósticos, 1 plano (v1 e v2) | "Plano de marketing · outubro a dezembro"; objetivo "Vender 400 panetones até 20/12 e depender menos do Instagram…" |
| Max | `MX_SEG`, `MX`, `M_REAT`, `RE_MSG` (L12238–12348) | 5 segmentos, 12 objetos | "Inativos há 60 dias" (138, 23 com consentimento); "Clientes frequentes" 62/31; mensagens da reativação em duas etapas |
| Sugestões do Início | `HOME_SUG` (L5821), `HOME_SUG_FIRST` (L5831), `SUGG` (L5805) | 8 (conta em uso), 6 (primeiro acesso), 9 (V3) | pedidos de exemplo com quem participa, ex.: "Planejar meus próximos conteúdos" (Otto e Kaia), "Analisar os resultados da semana" (Íris), "Criar uma promoção para esta semana" (Bia e Kaia) |

**Primeiro acesso:** nada de post, campanha, rotina ou trabalho; a memória só tem o cadastro (Nome "Miolo", Segmento "Padaria", Cidade "São Paulo"); créditos em 4%. Esse é o estado vazio honesto de referência.

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

Só isto vira pergunta. O resto deste documento é o combinado: em caso de dúvida, vale o protótipo (regra do dono de 16/10). "Dono" é decisão de regra; "dono + Diogo" precisa também de desenho, porque não existe tela ou rótulo na V4.6 e ninguém inventa rótulo.

| # | Tema | O que o protótipo mostra | O que falta decidir | Quem |
|---|---|---|---|---|
| 1 | Papéis e multiusuário | Uma pessoa só (Marina, "dona da Miolo"); "Minha Equipe" é a equipe de agentes, não de pessoas | O que admin, editor e viewer veem e fazem: conversar, pedir trabalho, ver pendências sem botão de decisão. Convite de pessoas e onde fica. O viewer só lê? (S1a, pergunta 2) | dono + Diogo |
| 2 | Rejeitar com duas saídas | Só "Pedir ajuste", "Outra direção" e "Agora não"; nenhum "Rejeitar" | Rótulos e lugar dos dois botões que o dono decidiu em 16/10 08:55 (cancelar o trabalho ou pedir nova proposta) | dono + Diogo |
| 3 | Trabalho cancelado, bloqueado, com falha ou em rascunho | Nenhum rótulo nem desenho de trabalho para esses estados; não há "Cancelar", "Excluir" nem mudança de prazo pela pessoa | Se existem como estados visíveis e ações da pessoa, com que rótulo e em que coluna do Quadro | dono + Diogo |
| 4 | Interruptor do Modo Autônomo | "Ligado" e "Pausado" pausam ou retomam tudo, inclusive as encerradas, e não alcançam as com falha ou bloqueio (L13568, L6988). O Documento Mestre §10 marca a semântica como pendente | O que "Pausado" interrompe: execuções novas, trabalhos em andamento, publicações já autorizadas e agendadas. E se reativa as encerradas | dono |
| 5 | Cadastro e login reais | Só "Seu e-mail", sem senha, e "Nesta versão, nenhuma conta foi criada e nada foi enviado." | Método (link mágico, código ou senha), aceite de termos e LGPD, e o que o Nexo faz com o pedido guardado depois do cadastro ("Crie sua conta e o Nexo começa por ele.") | dono, conferindo o que a A1f já seguiu |
| 6 | "Minha conta" e "Configurações" | Só avisos "… · demonstrativo neste protótipo" | O conteúdo das telas (perfil, idioma, notificações, faturamento, excluir conta) e onde a pessoa escolhe o idioma, que o dono já decidiu ser pt-BR, en e es | dono + Diogo |
| 7 | Notificações fora do produto | Sino, avisos curtos e ponto na barra; a responsabilidade "Me avisar quando surgir uma oportunidade" oferece "no Início e por e-mail" | Canais de aviso à dona (e-mail, push, WhatsApp) e o que gera aviso | dono |
| 8 | Conversa em grupo de verdade | "Conversa em grupo demonstrativa: aqui, responde um especialista por vez."; "Chamar" só escreve "@Nome" no campo | No produto, responde um especialista por vez ou vários? A menção "@Nome" chama o agente? | dono |
| 9 | Celular e telas menores que 1280 px | Só 1440 e 1280; nada abaixo disso (a gaveta de celular da A0 está marcada para reverter) | Navegação e conversa no celular. O dono quer compra no mobile (Fase 4) | dono + Diogo |
| 10 | Vazios de Marca & Criação e Growth no primeiro acesso | Kaia mostra contador 0 sem texto; o Kiwi mostra os mesmos números da conta em uso | O texto do vazio honesto dessas duas telas (regra do Documento Mestre §7: não inventar métrica) | Diogo, levado pelo Thor |
| 11 | Vários negócios na mesma conta | "Adicionar um negócio" · "Outra marca na mesma conta" (só aviso) | O fluxo de troca entre negócios na barra. A regra comercial fica com preços, por último | dono + Diogo |

**Já decidido pelo dono, fora do protótipo (não perguntar de novo):**

- Kiwi é "a Kiwi", em Growth Marketing.
- Só o owner aprova e autoriza.
- Rejeitar tem duas saídas; falta só o desenho, item 2.
- "Programado" vira "Concluído" quando o canal confirma.
- Conversas são visíveis a todo o workspace, com histórico e "Nova conversa".
- Idiomas: pt-BR primeiro, depois en e es.
- Preço, plano e créditos ficam por último; a barra "Plano Squad · créditos do mês" fica com valor provisório.
- Pagamento recorrente via Asaas e Mercado Pago.
- O motor de imagem é do Vic.

**Inconsistências internas do protótipo** (decisão técnica do time; não mudam a experiência e não vão ao dono):

- "Recusar" no Início apaga a sugestão, enquanto "Descartar" na Memória a guarda.
- O foco perguntado na delegação não aparece em lugar nenhum.
- A faixa diz "v2 aprovada" mesmo na v1 (L13773).
- O contador do Modo Autônomo na barra não inclui as responsabilidades com falha ou bloqueio.
- "Ver conexões", em Resultados, não abre "Conexões e fontes".

Lista completa nas notas `docs/parciais/x1/notas_*.md`, seção de lacunas de cada uma.
