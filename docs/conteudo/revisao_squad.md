# Revisão de domínio do squad (N2a)

**Autor:** Nick Fury (Marketing & Growth), 16/10/2026, escrita na retomada da fatia (16:20 a 16:30). O rascunho do sub-agente revisor da sessão anterior não chegou a ser gravado; esta revisão foi feita do zero.
**Base revisada:** `squad/` como está no commit `b125b79` (último commit que tocou a pasta), `README.md`, sete `SOUL.md`, sete `agent.yaml`, 17 skills (`01.01`, `02.01` a `02.04`, `02.07`, `04.01` a `04.03`, `05.01`, `05.02`, `06.01` a `06.03`, `07.02` a `07.04`) as fixtures `*.produce.json` do modo simulado de Bia, Kiwi, Max e Íris (extraídas por script) e, por `grep`, as do Otto.
**Natureza:** só sugestão. Nada foi editado em `squad/`, `apps/`, `packages/` ou `supabase/`. Pela diretriz de 15/10, mudança em `SOUL.md` ou `agent.yaml` gera versão nova de prompt; e pela regra do Vic de 16/10, o que muda contrato (campo novo no JSON de entrega, id de segmento, moeda) ou regra combinada está marcado **[muda o combinado]** e vai ao Vic pelo Thor antes de qualquer aplicação.

## 0. Resumo

1. **O que está forte:** as travas. Aprovar não é autorizar, nada inventado, consentimento por canal, teto de verba, separação entre fato e hipótese, proibição de verbo causal, evidência citada por id. Poucas ferramentas do mercado são tão rigorosas, e as fixtures seguem as regras.
2. **O que está fraco:** o ofício. As SOUL dizem melhor o que não fazer do que como fazer um trabalho de marketing excelente. Faltam, nas skills, quatro coisas que uma pessoa de marketing cobra logo na primeira entrega: **como a conversão será medida antes de gastar**, **ciclo de compra do negócio** (os cortes de 30 e 90 dias são fixos), **sazonalidade** na comparação de períodos e **incrementalidade** (o que a campanha trouxe além do que viria sem ela).
3. **Riscos com evidência:** idioma fixo em pt-BR no `README.md` e na SOUL do Otto, contra a decisão de 16/10 (R1); moeda fixa em BRL na Kiwi (R2); números de exemplo dentro de SOUL que o modelo pode repetir como se fossem reais (R3); fixtures que usam uma **sugestão pendente** ("bastidores têm mais salvamentos") como fato (R4); indicador "custo por encomenda" sem evento de conversão para medir (R5).

## 1. Riscos transversais (em ordem de prioridade)

| # | Risco | Evidência | Sugestão |
|---|---|---|---|
| R1 | Idioma: a regra 1 do `squad/README.md` diz "Português do Brasil" e a SOUL do Otto diz "Não escreve em inglês quando a marca fala português". A decisão de 16/10 é lançamento em pt-BR, en e es, com o agente respondendo no idioma do cliente. As skills já usam `<idioma>`; o prefixo estável (SOUL) contradiz. | `squad/README.md:34`; `squad/otto/SOUL.md:32` | Regra 1: "No idioma do negócio (o de `<idioma>`: pt-BR, en ou es), segunda pessoa, frases curtas. Falar do trabalho, não de si. Sem emoji, sem exclamação em série, sem promessa vaga." Otto: "Escreve no idioma do negócio e nunca mistura idiomas no mesmo texto." |
| R2 | Moeda: "Nenhum real sai sem autorização" (SOUL da Kiwi) e `moeda: BRL`, "valores inteiros em reais" (05.01 e 05.02). Um negócio no México ou nos EUA receberia plano em reais. | `squad/kiwi/SOUL.md:3`; `squad/kiwi/skills/05.01.md:34`; `05.02.md:40` | SOUL: "Nenhum valor sai sem autorização." Skill **[muda o combinado: contrato]**: "`orcamento.moeda`: a moeda do negócio, recebida em `<moeda>`; valores inteiros nessa moeda." Exige o fluxo passar `<moeda>` do workspace. |
| R3 | Números de exemplo dentro da SOUL: "Impressões caíram 18% em 7 dias na campanha X (Meta, 1 a 7/10)" e "Sessões: 1.240 (GA4, 1 a 7/10), 12% abaixo". A SOUL vai no prefixo de todo run; um modelo sem dado conectado tende a ecoar o formato com números parecidos. | `squad/kiwi/SOUL.md:18`; `squad/iris/SOUL.md:16` | Trocar por molde sem número: Kiwi: "Com número e fonte, no formato '[métrica] [subiu/caiu] [variação] em [período] na campanha [nome] ([fonte], [datas])', e não 'o alcance está baixo'. O molde não é dado: sem métrica conectada, diga o que falta conectar." Íris: o mesmo molde com "[métrica]: [valor] ([fonte], [datas]), [variação] contra [período de comparação]. Hipótese: …". |
| R4 | Fixture usa sugestão pendente como fato. No seed, "Posts com bastidores do forno têm mais salvamentos" está em `memory_suggestions` (sugestão "Otto percebeu", não confirmada) e não existe dado de salvamentos: o seed de métricas da S2b tem sessões, seguidores, alcance e pedidos (`S2b-relatorio.md` §1, item 3), e o próprio diagnóstico 02.01 lista "alcance e salvamentos" em `dados_que_faltam`. Mesmo assim, o plano 02.03 justifica uma ação com "Bastidores têm mais salvamentos" e o calendário 04.02 diz "rendem mais salvamentos; vale fixá-los na quarta". A demo ensina o contrário da regra 2 do README. Na origem (`fixtures/04.01/otto.produce.json:92`) a leitura está no lugar certo, em `observacoes`, mas a explicação afirma que esses posts "foram os mais salvos" sem fonte. | `supabase/seed.sql:359`; `fixtures/02.03/bia.produce.json:31,82`; `fixtures/04.02/otto.produce.json:40,95,157,177`; `fixtures/02.01/bia.produce.json:55` | Reescrever esses `por_que`/`objetivo` e, na 04.01, trocar "foram os mais salvos" por "parecem ter mais salvamentos; não tenho o número" (área do Stark): "O Otto percebeu que os bastidores podem render mais salvamentos; ainda não está confirmado e o Instagram não está conectado. Vale testar por quatro semanas." No `README.md`, regra 2, acrescentar: "Sugestão pendente não justifica prioridade nem decisão; se for útil, cite como hipótese e diga que falta confirmar." |
| R5 | Medição antes do gasto: o plano de mídia da fixture mede "custo por encomenda pelo site" só com "link com UTM". UTM identifica a visita; só vira custo por encomenda se a encomenda concluída for registrada com a origem (evento de conversão no site ou registro da origem no pedido). Nenhuma skill da Kiwi cita evento de conversão. | `fixtures/05.01/kiwi.produce.json` (`para_executar`); `grep -n -i 'pixel\|evento de convers' squad/kiwi/skills/*.md` = 0 linhas | Ver sugestão K1 na seção 2.5. |
| R6 | Estados de memória que não são confirmados entram no prompt pela busca (`observed`, `outdated`, `from_source`), com rótulo ("Observado", "Desatualizado"). Nenhuma SOUL ou skill diz o que fazer com eles. | `apps/backend/src/hellosquad/squad/memory.py:56`; `i18n/pt-BR.json:57-60` | Regra nova no `README.md`: "Fato 'Observado' é indício, não regra. Fato 'Desatualizado' não orienta entrega; se ele importa para o pedido, pergunte se ainda vale." |

## 2. Por agente

Formato: **Forte** (manter como está) · **Fraco ou genérico** · **Sugestões de texto prontas** (com o arquivo e o ponto de inserção) · **Riscos**.

### 2.1 Nexo (`squad/nexo/`)

**Forte.** "No máximo duas perguntas" e "se o briefing basta, não pergunta": respeita o tempo de quem tem um negócio para tocar. "Nunca repassa o pedido cru." "Não toma silêncio como aprovação." "Não inventa prazo que o especialista não deu." A triagem (01.01) extrai só o que foi dito e deixa nulo o resto.

**Fraco ou genérico.** O critério entre "pedido simples" e "projeto" não está escrito, então o modelo decide no impulso. Não há regra de ordem quando várias decisões esperam a pessoa em "Precisa de você". A triagem extrai canal, objetivo, tema, tom, restrições, CTA e data, mas **não extrai público**, que é o campo de briefing que mais muda uma entrega de marketing.

**Sugestões de texto prontas.**
- `SOUL.md`, "Decide o caminho", substituir a segunda frase por: "Vira projeto quando o pedido precisa de duas ou mais especialidades em sequência ou de uma data em comum (campanha, lançamento, data comemorativa). O resto vai direto para um especialista."
- `SOUL.md`, "Acompanha", acrescentar: "Com mais de uma decisão pendente, mostre primeiro a que trava mais trabalho ou vence antes, com o prazo de cada uma."
- `skills/01.01.md`, passo 3 **[muda o combinado: contrato da triagem]**: "Extraia o briefing: canal, objetivo, **público**, tema, tom, restrições, CTA e data."

**Riscos.** Nenhum além dos transversais.

### 2.2 Bia (`squad/bia/`)

**Forte.** Conclusão primeiro; premissas separadas do que foi visto; "três prioridades em vez de dez"; na 02.07, a separação entre `pesquisa` (com id de fonte da busca) e `sugestao` é o melhor mecanismo anti-alucinação do squad, e a fixture diz com todas as letras quando a busca está desligada.

**Fraco ou genérico.**
- 02.01: lacuna e oportunidade não dizem em que se apoiam, e a prioridade não tem critério. A pessoa não consegue conferir por que algo é "alta".
- 02.02: posicionamento sem a alternativa contra a qual o cliente compara a marca (o concorrente do bairro, o supermercado, fazer em casa) e sem prova; objetivo com indicador e prazo, mas **sem ponto de partida**, então a meta fica solta.
- 02.03: ação sem "como saber se funcionou" e sem o que ficou de fora. Plano bom também diz o que não fazer agora.
- 02.04: a estratégia de campanha não tem o pedido central (o que a campanha pede que o cliente faça) nem a oferta.
- `agent.yaml`: o pedido sugerido "Crie uma promoção para esta semana" leva a desconto, e a SOUL não diz que condição comercial é da pessoa. `colabora_com` não inclui a Íris, embora a Bia leia `resultados`.

**Sugestões de texto prontas.**
- `skills/02.01.md`, passo 3, acrescentar: "Cada lacuna e cada oportunidade diz em que se apoia (fato confirmado, avaliação, dado conectado). Sem apoio, ela vai para `premissas`. A prioridade pesa impacto no objetivo, esforço e prazo; diga o critério em uma frase no `resumo`."
- `skills/02.02.md`, passo 3, acrescentar: "Diga também com o que o cliente compara a marca hoje (a alternativa real dele) e por que escolheria a marca no lugar dela." Passo 6 **[muda o combinado: contrato]**: "Cada objetivo traz `ponto_de_partida`: o número de hoje, com fonte, ou 'a medir'."
- `skills/02.03.md` **[muda o combinado: contrato]**: "Cada ação traz `como_saber_se_funcionou` (o sinal e quando olhar). Em `fora_do_plano`, até três coisas que ficaram de fora agora, cada uma com o porquê."
- `skills/02.04.md`, passo 4, acrescentar: "Uma das mensagens-chave é o pedido central da campanha (encomendar, agendar, visitar a loja). Oferta só se a pessoa confirmou; sem ela, a campanha não depende de desconto e isso fica em `premissas`."
- `SOUL.md`, "O que você nunca faz", acrescentar: "Não define desconto, preço nem condição comercial: propõe o formato da promoção e pede o número à pessoa."
- `agent.yaml`, `colabora_com` **[muda o combinado: nova versão]**: `[kaia, otto, kiwi, iris]`.

**Riscos.** R4: o plano 02.03 da fixture prioriza uma ação com base em sugestão pendente. Na mesma fixture, a ação 1 ("Abrir as encomendas de Natal com data de retirada") tem `responsavel: bia`, mas abrir encomendas é decisão operacional do negócio. A ação da Bia seria "Estratégia da campanha de encomendas (02.04)", e a abertura entra como decisão da pessoa.

### 2.3 Kaia (`squad/kaia/`)

**Forte.** "Propõe uma direção clara, não cinco." Pede referência em vez de adivinhar. Não apaga versões, não usa imagem sem direito de uso, não inventa embalagem fabricável. Está certo não haver skill enquanto o motor de imagem não chega (decisão de 16/10).

**Fraco ou genérico.** O critério de qualidade é "o seu próprio critério". Faltam as checagens que um diretor de arte faz antes de mostrar: legibilidade no celular, área segura de cada formato e texto alternativo para quem usa leitor de tela (que também ajuda a busca).

**Sugestões de texto prontas.**
- `SOUL.md`, "Como você trabalha", acrescentar: "Antes de mostrar uma peça, confira três coisas: o texto se lê no celular (tamanho e contraste), o produto aparece sem disputar com a marca, e nada importante fica na área que o formato corta (stories e vídeos verticais cortam em cima e embaixo). Entregue junto uma frase de texto alternativo descrevendo a peça, para o Otto publicar com ela."

**Riscos.** Nenhum hoje. Quando entrar a skill, o texto alternativo precisa de campo no contrato **[muda o combinado: contrato]**.

### 2.4 Otto (`squad/otto/`)

**Forte.** "Na voz da marca, não na sua." "Lê o que o cliente cortou ou mudou e não repete o erro." "Não publica duas vezes por causa de erro de rede." Comentário público é marketing, não atendimento. Duas versões com abordagens diferentes na 04.01; ritmo realista na 04.02; roteiro com o que se fala e o que aparece na tela na 04.03.

**Fraco ou genérico.**
- R1 (idioma).
- 04.01: não diz que a primeira linha é a que aparece antes do "mais", que é onde o post ganha ou perde a leitura; não há texto alternativo.
- 04.02: o calendário não amarra cada post a uma mensagem-chave da estratégia e não olha as datas do período.
- 04.03: vídeo curto sem gancho nos primeiros segundos, sem texto na tela para quem assiste sem som e sem duração alvo.

**Sugestões de texto prontas.**
- `SOUL.md`, "O que você nunca faz", trocar a última frase por: "Escreve no idioma do negócio e nunca mistura idiomas no mesmo texto."
- `skills/04.01.md`, passo 3, acrescentar: "A primeira linha carrega a ideia e o motivo para continuar lendo: é o que aparece antes do 'mais'." **[muda o combinado: contrato]** "Post com imagem leva `texto_alternativo`, uma frase que descreve a peça."
- `skills/04.02.md`, passo 4, acrescentar: "Cada post diz a que mensagem-chave da estratégia aprovada ele serve. Sem estratégia, alterne produto, processo e cliente, sem empilhar oferta. Olhe as datas do período que fazem sentido para o negócio e a região e use só as que servem ao objetivo."
- `skills/04.03.md`, passo 3, acrescentar: "Em vídeo curto, o primeiro trecho prende nos três primeiros segundos, todo trecho falado tem texto na tela (muita gente assiste sem som) e o roteiro diz a duração alvo."

**Riscos.** R4: a fixture 04.02 trata "bastidores rendem mais salvamentos" como fato e decide o dia da semana com base nisso.

### 2.5 Kiwi (`squad/kiwi/`)

**Forte.** `teto_informado` e `teto_proposto`, com o proposto nunca acima do informado; regra de pausa proposta para a pessoa aprovar; verba de mídia separada dos créditos; "confirma pela resposta da plataforma, não pela sua intenção"; um teste muda uma variável só; o teste inconclusivo é declarado como tal. A fixture do plano de Natal da Miolo é crível para uma padaria de bairro.

**Fraco ou genérico.**
- R2 (moeda) e R3 (número de exemplo na SOUL).
- **Medição antes do gasto (R5):** nenhuma linha manda confirmar o evento de conversão antes do primeiro real.
- **Teste com verba pequena:** a fixture compara "custo por encomenda iniciada" com R$ 300 em 7 dias divididos entre duas variações. Com essa verba, o número de encomendas tende a ser pequeno demais para separar as variações. A skill acerta ao declarar inconclusivo, mas o melhor desenho usa como métrica principal o sinal que vem antes da conversão (clique para a página de encomenda) e deixa a encomenda como secundária.
- **Teto sem valor no briefing:** a skill manda propor "um teto conservador". É um número sem base, o que as próprias regras evitam em todo o resto.

**Sugestões de texto prontas.**
- K1, `skills/05.01.md`, novo passo entre 7 e 8: "Antes de propor o primeiro real, diga como a conversão vai ser medida: qual evento conta como resultado (encomenda concluída, mensagem iniciada, agendamento), onde ele é registrado com a origem e se já foi testado. Link com UTM identifica a visita, não a encomenda. Se o evento não existe, ele é o primeiro item de `para_executar` e o indicador de custo por resultado fica como 'a medir'."
- K2, `skills/05.02.md`, passo 6, acrescentar: "Com verba pequena, a métrica principal é a que acontece antes da conversão (cliques para a página de encomenda, custo por clique) e a conversão é secundária. Diga antes de começar quantos resultados por variação são necessários para decidir; abaixo disso, o teste é inconclusivo."
- K3, `skills/05.01.md`, passo 5 **[muda o combinado: regra da S2b]**: "Sem valor no briefing, não proponha número: pergunte a faixa que a pessoa topa investir e mostre o que cabe em cada faixa (quantos testes, por quantos dias)." Hoje a skill propõe um teto conservador; a troca é decisão do Vic.
- K4, `SOUL.md`, "Como você fala": o molde sem número do R3.

**Riscos.** R2, R3, R5. Os canais são só `meta_ads` e `google_ads`; para um negócio B2B em outro país isso limita, mas é o recorte combinado do MVP e fica como está.

### 2.6 Max (`squad/max/`)

**Forte.** Consentimento separado por canal, com base legal; descadastro em toda etapa; frequência somada entre segmentos; uma mensagem só para quem está em dois segmentos; regra do modelo aprovado no WhatsApp; tamanho de segmento calculado pelo fluxo e nunca escrito pelo modelo. É a parte mais madura do squad do ponto de vista de risco.

**Fraco ou genérico.**
- **Ciclo de compra:** os cortes `ativos_30`, `esfriando_31_90` e `inativos_90` são fixos. Para uma padaria que vende toda semana, 90 dias sem compra é perda antiga; para uma clínica de estética, 31 dias pode ser o intervalo normal.
- **Valor:** a segmentação só olha recência; `recorrentes` ("compram com frequência") não diz o critério e não existe recorte por valor, que é o primeiro que uma pessoa de CRM pede no Natal.
- **Incrementalidade:** `como_medir` conta as encomendas de quem está no segmento, inclusive as que viriam sem campanha. Sem grupo de controle, o resultado sai inflado.
- **Calendário:** na fixture, o último e-mail sai em 17/11 para uma reserva que vale até 30/11. O último lembrete funciona melhor perto do fim da validade. Nenhum passo diz o horário de envio.
- **Entrega de e-mail:** não há regra para tirar das próximas sequências quem nunca abre, nem pré-requisito de domínio de envio autenticado.

**Sugestões de texto prontas.**
- `skills/06.03.md`, passo 2, acrescentar: "Os cortes de 30 e 90 dias são o padrão. Se o ciclo de compra do negócio for muito diferente (quem vende toda semana, quem atende a cada dois ou três meses), diga em `premissas` qual corte faria mais sentido e peça confirmação." **[muda o combinado: ids de segmento]** se for para o fluxo calcular cortes pelo ciclo ou incluir um segmento `maior_valor`.
- `skills/06.01.md`, passo 7, acrescentar: "Para saber o que a campanha trouxe além do que aconteceria sem ela, proponha deixar uma parte pequena do segmento sem receber (grupo de controle, sorteado pelo fluxo). A pessoa decide se usa; sem controle, diga que a medida conta também as compras que viriam de qualquer jeito." O sorteio exige suporte do fluxo **[muda o combinado: fluxo]**.
- `skills/06.01.md`, passo 6, acrescentar: "O último passo fica perto do fim da validade (dois ou três dias antes). Cada passo diz o horário de envio, dentro do horário comercial do negócio."
- `skills/06.02.md`, passo 5, acrescentar: "Quem não abre nem clica em nenhuma etapa sai das próximas sequências de e-mail, para proteger a entrega. E-mail só sai de domínio de envio autenticado; se não estiver, isso entra como pendência do envio."

**Riscos.** O ponto do grupo de controle conversa com a Íris: sem ele, qualquer leitura de resultado da reativação fica em "coincide com", o que está certo, mas não responde à pergunta da pessoa ("valeu a pena?").

### 2.7 Íris (`squad/iris/`)

**Forte.** Evidência por id (E1…); lista de verbos causais proibidos; regras de agregação certas (seguidor é o último valor; alcance somado não é gente diferente; pedido não diz de que canal veio); lacuna dita, nunca preenchida; dado atrasado avisado; na 07.04, "medir o que falta antes de agir sobre palpite". A fixture 07.04 põe "registrar a origem de cada encomenda" em primeiro lugar, que é exatamente o que uma analista sênior faria.

**Fraco ou genérico.**
- R3 (número de exemplo na SOUL).
- **Sazonalidade e calendário:** a comparação é "30 dias contra os 30 anteriores" sem olhar fins de semana, feriados, datas comerciais ou o mesmo período do ano anterior. Em novembro e dezembro, isso distorce qualquer leitura de varejo.
- **Métrica explicada:** a fixture explica bem o alcance somado, mas a skill não pede que toda métrica seja explicada na primeira vez que aparece, e o público é dono de pequeno negócio.
- **Razões:** pedidos por sessão, por exemplo, só valem com as duas métricas da mesma fonte e do mesmo período, e a skill não diz isso.
- **Recomendação** sem "como saber se funcionou".
- **Pedido sugerido** "Qual post levou mais gente ao site?": só tem resposta com link rastreado por post. Nenhuma skill diz isso.

**Sugestões de texto prontas.**
- `skills/07.03.md`, passo 3, acrescentar: "Diga se os dois períodos têm o mesmo número de fins de semana e se algum inclui feriado, data comercial ou campanha. Quando houver dado do mesmo período do ano anterior, mostre também essa comparação. Evento conhecido entra como contexto da leitura, nunca como causa."
- `skills/07.02.md` e `07.03.md`, acrescentar: "Na primeira vez que uma métrica aparece, explique em uma frase o que ela conta. Razão entre métricas (pedidos por sessão) só com as duas da mesma fonte e do mesmo período, dizendo o que está no denominador."
- `skills/07.04.md`, passo 3 **[muda o combinado: contrato]**: "Cada recomendação traz `como_saber_se_funcionou`: o sinal, a fonte e quando olhar."
- `SOUL.md`, "Limites", acrescentar: "Saber qual post levou gente ao site exige link rastreado por post. Sem isso, diga que não dá para saber e proponha o rastreio."
- `SOUL.md`, "Como você fala": o molde sem número do R3.

**Riscos.** R3. A leitura "Instagram em alta e site em queda coincidem" está certa na forma; sem link rastreado na bio e nos stories, a hipótese seguinte ("os posts não convidam a visitar o site") não tem como ser testada. A recomendação 3 da fixture 07.04 precisa trazer o rastreio junto.

## 3. Bia, Kiwi, Max e Íris: o que uma pessoa de marketing esperaria e a fixture simulada não entrega

| Agente | O que uma pessoa de marketing esperaria | O que a fixture entrega hoje | Por que importa |
|---|---|---|---|
| Bia | Prioridade com critério e com a evidência de cada lacuna | Prioridade "alta"/"media" sem critério; lacunas sem apoio declarado | A pessoa não consegue discordar com base em nada |
| Bia | Plano que diz também o que fica de fora | Quatro ações, nenhuma descartada | Foco é escolher o que não fazer |
| Bia | Justificativa só com fato confirmado | "Bastidores têm mais salvamentos" (sugestão pendente, sem Instagram conectado) | Contradiz a regra 2 e o próprio diagnóstico (R4) |
| Bia | Pesquisa real de concorrentes do bairro | Busca desligada: dois achados `sugestao`, ditos como tal | Está certo para o modo simulado; a demonstração não mostra o valor da 02.07 com fontes |
| Kiwi | Evento de conversão confirmado antes de investir | UTM na página de encomendas | Sem evento, "custo por encomenda" não é medível (R5) |
| Kiwi | Teste com métrica que a verba consegue mover | Custo por encomenda iniciada, R$ 300 em 7 dias, duas variações | Tende a sair inconclusivo; o desenho com métrica anterior à conversão decide antes |
| Kiwi | Público de quem já visitou o site (remarketing) | Vizinhança e quem interagiu com o perfil | Remarketing pede o mesmo evento do site; vale entrar em `para_executar` |
| Max | Segmento pelo ciclo de compra e por valor | Recência fixa 30/90; `recorrentes` sem critério | Para a Miolo, 90 dias é perda antiga; no Natal o recorte por valor é o primeiro pedido |
| Max | Grupo de controle | Encomendas do segmento depois do envio | O resultado conta compras que viriam de qualquer jeito |
| Max | Último lembrete perto do prazo e horário de envio | Último e-mail 13 dias antes do fim da reserva; sem horário | A última chamada perde força longe do prazo |
| Íris | Comparação que respeita calendário e sazonalidade | 30 contra 30 dias, sem nota de calendário | Em novembro e dezembro, a leitura distorce |
| Íris | Taxa de conversão do site (pedidos por sessão) com a ressalva certa | Sessões e pedidos lidos separadamente | É o primeiro número que uma pessoa de growth pede |
| Íris | Resposta honesta para "qual post levou gente ao site" | Não há fixture para esse pedido sugerido | Sem link rastreado por post, a resposta certa é "não dá para saber ainda" |

## 4. Ordem sugerida de aplicação (para o Thor levar ao Vic)

1. **Sem mudar contrato, só texto (nova versão de prompt):** R1 (idioma), R3 (moldes sem número), R6 (estados de memória), a regra de sugestão pendente na regra 2, K1, K2, as sugestões de texto de Otto, Kaia, Max (ciclo de compra em `premissas`, último lembrete, horário, entrega de e-mail) e Íris (calendário, métrica explicada, razões, rastreio por post).
2. **Fixtures (área do Stark):** reescrever os trechos de R4 em `02.03/bia` e `04.02/otto`; na `07.04/iris`, a recomendação 3 traz o rastreio junto; na `05.01/kiwi`, o evento de conversão entra em `para_executar`.
3. **Com mudança de contrato ou de regra combinada (decisão do Vic):** R2 (moeda por workspace), K3 (teto sem valor), público na triagem, `ponto_de_partida`, `como_saber_se_funcionou`, `fora_do_plano`, `texto_alternativo`, grupo de controle, cortes de segmento e `maior_valor`, Íris em `colabora_com` da Bia.

## 5. Como esta revisão foi verificada

- Leitura integral de `squad/README.md`, das sete `SOUL.md` e dos campos de `agent.yaml` (identidade, skills, pedidos sugeridos, deliveries, ferramentas, `nunca`, autonomia, memória); das 17 skills, as etapas "Briefing mínimo", "produzir", "Formato da entrega" e o critério de qualidade (as etapas `autoverificar` e `revisar` existem em 16 das 17, todas menos a 01.01, que é triagem; o texto delas segue o mesmo modelo e foi lido inteiro em 02.01, 02.02 e 02.03).
- Fixtures extraídas por script (`/tmp/n2a/fixtures.txt`, 13 arquivos `*.produce.json` de Bia, Kiwi, Max e Íris) e campos lidos um a um nos casos citados.
- Cada risco tem a linha de origem citada; a evidência por `grep` está em `/tmp/n2a/evid.txt`: moeda (3 ocorrências de BRL ou reais nas skills da Kiwi e uma na SOUL), idioma (`README.md:34`, `otto/SOUL.md:32`), números de exemplo em SOUL (2), "salvamentos" nas fixtures (10 ocorrências em 4 arquivos), e **zero** ocorrências de "grupo de controle", "sazonal", "feriado", "ano anterior", "pixel" ou "evento de conversão" nas skills de Kiwi, Max e Íris, que é o que sustenta as lacunas de medição.
- O que é julgamento de marketing, não verificação mecânica: o que é "forte" ou "fraco", o desenho de teste com verba pequena e os cortes de ciclo de compra. Isso está assinado por mim como opinião de domínio.

Assinado: Nick Fury, Marketing & Growth, 16/10/2026.
