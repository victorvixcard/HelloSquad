# H2 · Telas da A2b × protótipo V4.6: diferenças NÃO registradas

**Auditor:** sub-agente do Hulk, 16/10/2026, 18:58 → 19:45. **Ambientes:** protótipo em :8010
(`ProductUIV4.dc.html`, cenários "Conta em uso" e "Primeiro acesso" pelo botão Demo) × nosso web em :3100 (`next dev`
do dono, sem parar nem reiniciar), 1440×900, pt-BR. Marina (Miolo, conta em uso) e Juliana (Trilha, primeiro acesso).
**Método:** `cap.mjs` passa pelas mesmas telas dos dois lados, captura (tela, tela rolada e página inteira) e extrai
títulos, botões, nomes acessíveis, regiões e campos; `compara.mjs` lista o que só existe de um lado; cada candidato foi
conferido no código do protótipo (trechos curtos por linha) e no nosso código, e **descartado** quando já está nas
listas registradas ou quando é só dado diferente. Listas conferidas: A2b §4 (1–30) e §6; A2a §4 (1–8); A1b §4 (1–28);
FLUXOS §1.2, §1.3 e §5; S2a §5; achados da H1 (H1-01 a H1-11). Regra do dono: o que o protótipo não responde é pergunta,
não achado; "a Kiwi" e o rótulo "Growth" na barra são decisão do dono.
**Escritas no banco:** nenhuma de pedido, entrega, aprovação ou importação. O único `POST` de dado foi abrir "Conversar
com Bia" na Miolo, que cria (ou reabre) a conversa do ambiente, como a própria tela faz (A2b §3 item 2), sem mensagem.
Os outros `POST` na rede são as Server Actions de leitura das páginas (calendário, resumo de contatos, token do
Realtime, eventos do run).

## Tabela-resumo

| # | Tela · elemento | Diferença | Sev. |
|---|---|---|---|
| P-01 | Conteúdo · "Desempenho orgânico" e "Otto percebeu" | Com 90 dias de Instagram no banco (Resultados mostra "Alcance no Instagram 32.592"), o card diz "A Íris ainda não tem números do Instagram para ler." e o "Otto percebeu" espera "a Íris tiver os primeiros números"; a V4.6 só mostra esse vazio sem números | 🟡 |
| P-02 | Conversa do ambiente da Íris · primeira fala | Sempre "Ainda não tenho números da Miolo para ler…", mesmo com as séries que a página ao lado mostra; na V4.6 (conta em uso) a fala lê a última semana | 🟡 |
| P-03 | Resultados · "Desempenho por canal" | Variação e valor se sobrepõem ("-13,9%" em cima de "3.694 sessões"), rótulos cortados ("Seguidores no Inst…"); a V4.6 tem nome, barra e valor em colunas | 🟡 |
| P-04 | Resultados · gráfico de 12 semanas | As duas faixas do período não têm rótulo ("SETEMBRO" e "AGOSTO" na V4.6) | 🟡 |
| P-05 | Conversa do ambiente · sugestões de Bia, Kaia, Kiwi e Max | Vêm de `pedidos_sugeridos` do `agent.yaml`, não dos `asks` da V4.6 (ex.: "Analisar os concorrentes do bairro" × "Analisar as padarias do bairro") | ℹ️ |
| P-06 | CRM · frase "Nada é enviado sem consentimento…" | Colada na borda esquerda e no pé do cartão dos números, fora do respiro dos outros blocos | ℹ️ |
| P-07 | Growth · objeto da conversa do ambiente | Nome "Growth Marketing" no nome acessível do botão e no cartão; na V4.6 o objeto se chama "Growth" (`ENVS.media.l`) | ℹ️ |

(Tabela em construção: as telas da Miolo com documentos entram depois das entregas reais do Hulk.)

## Achados

### P-01 · Conteúdo diz que a Íris não tem números do Instagram, mas tem · 🟡

1. **Tela e rota:** Conteúdo · Otto, `/app/miolo/squad/otto`, cards "Desempenho orgânico" e "Otto percebeu".
2. **Protótipo:** o card só mostra o vazio quando não há número: `<sc-if value="{{ct.b.has}}">` com "Visitas ao site",
   "Alcance" e a peça que mais levou gente ao site (L4973–L4975); o texto "A Íris ainda não tem números do Instagram para
   ler" é o ramo sem dados (L4979). Na conta em uso: "512" visitas e "8,4 mil" de alcance (`proto-otto.png`).
3. **Nosso:** o card mostra sempre o vazio: `apps/web/components/env/ContentEnvironment.tsx:410`
   (`<p className="v41-cd-e">{t("perf.empty")}</p>`), com o comentário em `:41` "desempenho orgânico e 'Otto percebeu'
   seguem no vazio da V4.6, sem números no banco". O banco tem números: `metrics_daily` da Miolo traz `instagram.reach` e
   `instagram.followers` de 18/07 a 15/10 (90 dias cada) e a própria Resultados mostra "Alcance no Instagram 32.592"
   (`nosso-iris.png`). O "Otto percebeu" vazio diz "…quando o Otto conhecer Miolo e a Íris tiver os primeiros números."
   (`apps/web/messages/pt-BR/content.json:36`), o que também não é verdade nesta conta.
4. **Como reproduzir:** Marina → Conteúdo; depois Resultados.
5. **Prova:** `proto-otto.png` × `nosso-otto.png` (card do meio, embaixo) e `nosso-iris.png` (card "Alcance no Instagram").
6. **Severidade:** 🟡. É um vazio desonesto: a tela nega um dado que existe e que outra tela mostra.
**Conferido:** A2b §4 itens 16–20 tratam só do calendário e do inspetor do Otto; A1f entregou esse vazio quando ainda
não havia métrica no banco. Não está em A2b §4, A2a §4 nem A1b §4.

### P-02 · A primeira fala da Íris no ambiente nega as séries que existem · 🟡

1. **Tela e rota:** Resultados, `/app/miolo/squad/iris` → "Conversar com Íris" (conversa do ambiente).
2. **Protótipo:** `_cxEnvFirst('res')` (L10207): na conta em uso, "A última leitura é da semana de 05 a 11/10: 34
   encomendas pelo site, 6% a mais que a anterior. O que você quer entender?"; só sem números: "Ainda não tenho números
   da Miolo para ler. Assim que o Instagram ou a planilha de encomendas estiverem conectados, eu começo."
3. **Nosso:** a fala vem da API e não olha a série: `apps/backend/src/hellosquad/conversations/opening.py:154-155`
   (`elif agent_id == "iris": message = t(locale, "environment.first.iris.no_data", …)`), texto em
   `apps/backend/src/hellosquad/i18n/pt-BR.json:194`. Na Miolo, com 357 linhas em `metrics_daily`, o painel abriria
   dizendo que não há números, ao lado de uma página com "Pedidos 1.123", "Sessões no site 3.694" e o gráfico.
4. **Como reproduzir:** Marina → Resultados → "Conversar com Íris".
5. **Prova:** só código (abrir essa conversa criaria a conversa do ambiente da Íris na Miolo no meio do teste do Hulk;
   não abri). O texto do lado do protótipo está na L10207.
6. **Severidade:** 🟡 (fala do agente contradiz o dado da tela).
**Conferido:** a S2a §5 pergunta 3 registra que a fala da Íris segue "ao pé da letra" o protótipo, mas foi escrita
antes das séries da Miolo; não registra o caso com números. A A2b §4 não fala da primeira fala da Íris.

### P-03 · "Desempenho por canal" sobrepõe variação e valor · 🟡

1. **Tela e rota:** Resultados, `/app/miolo/squad/iris`, card "Desempenho por canal" (abaixo do gráfico).
2. **Protótipo:** cada linha tem nome, barra de participação, valor e parte do total ("Instagram ▬ 54 42%"), num
   grid de três colunas `.rs-cr{grid-template-columns:minmax(0,118px) minmax(0,1fr) 70px}` (CSS portado, L2278 e o
   ajuste da V4.6); markup no card de L5358.
3. **Nosso:** a coluna do meio (a barra) virou a variação e a última coluna de 70 px recebe valor + unidade:
   `apps/web/components/env/results/ResultsEnvironment.tsx:231-240` (`rs-cr is-nobar`: `rs-cr-l`, `rs-cr-m` = variação,
   `rs-cr-v` = `<b>3.694</b><small>sessões</small>`), com só `text-align:right` em
   `apps/web/components/env/results/results.css:2`. Em 1440×900 o valor transborda para a esquerda e cobre a variação:
   "-13,9%" e "3.694" se sobrepõem, "+18,3%" fica embaixo de "32.592", "-1,8%" encosta em "1.123"; os nomes saem
   cortados ("Seguidores no Inst…", "Alcance no Instagr…").
4. **Como reproduzir:** Marina → Resultados → rolar até "Desempenho por canal".
5. **Prova:** `nosso-iris-canais.png` (recorte ampliado) e `nosso-iris-r1.png` × `proto-iris-r1.png`.
6. **Severidade:** 🟡 (leitura errada possível: "-13,93.694"). A falta da barra é a A2b §4 item 30; a sobreposição não.

### P-04 · Faixas do período sem rótulo no gráfico de Resultados · 🟡

1. **Tela e rota:** Resultados, `/app/miolo/squad/iris`, gráfico "Pedidos por semana".
2. **Protótipo:** cada faixa sombreada tem o nome do período no alto: `<span class="rs-cl is-band">{{rs.ch.bL}}</span>` e,
   com período anterior, `<span class="rs-cl is-band is-prev">{{rs.ch.pL}}</span>` (L5333–L5334); na captura,
   "SETEMBRO" e "AGOSTO" (rótulos de `RS_PER`, L9686).
3. **Nosso:** desenha as duas faixas (`rs-band-p` e `rs-band`) mas não escreve rótulo nenhum nelas:
   `apps/web/components/env/results/ResultsEnvironment.tsx:469-470` (retângulos) e `:488-501` (`rs-lbls` só com os
   eixos). As datas aparecem só na legenda do cabeçalho ("16/09 a 15/10", "17/08 a 15/09").
4. **Como reproduzir:** Marina → Resultados, período "Mês".
5. **Prova:** `proto-iris.png` × `nosso-iris.png` (faixas do gráfico).
6. **Severidade:** 🟡. **Conferido:** A2b §4 item 29 registra só as linhas de média e as marcas "1" e "2"; item 27, o
   texto do período. O rótulo das faixas não está registrado.

### P-05 · Sugestões da conversa do ambiente não são as da V4.6 (Bia, Kaia, Kiwi, Max) · ℹ️

1. **Tela e rota:** qualquer ambiente desses quatro → "Conversar com <Nome>", bloco "Pergunte à <Nome>".
2. **Protótipo:** `sug: … : AG[ag].asks.slice(0, 3)` (L9778). Bia (L5642): "Onde a Miolo pode crescer até o Natal?",
   "Crie uma promoção para esta semana", "Analisar as padarias do bairro". Kaia (L5650): "Criar um post para o Dia
   Mundial do Pão", "Um cartaz de encomendas para o balcão", "Novas capas para os destaques". Kiwi (ajuste V4.2, L11326):
   "Onde a Miolo pode aparecer mais no Google?", "Quanto investir em anúncios no Natal?", "Por que tanta visita não vira
   encomenda?". Max (L5674): "Reativar clientes que sumiram", "Um e-mail para quem encomendou no Natal passado", "Ideias
   de fidelidade para o balcão".
3. **Nosso:** a API usa os três primeiros `pedidos_sugeridos` (`apps/backend/src/hellosquad/conversations/opening.py:75-82`):
   Bia "Analisar os concorrentes do bairro" (`squad/bia/agent.yaml:24`); Kaia "Criar um post para uma data
   comemorativa", "Um cartaz para o balcão"; Kiwi "Testar dois anúncios do produto principal", "Por que o site não
   aparece no Google?" (e outra ordem); Max "Um e-mail para quem comprou no ano passado". Nexo, Otto e Íris seguem a
   V4.6. O nosso `team.json:76` ainda tem "Analisar as padarias do bairro" (perfil da Bia em Minha Equipe).
4. **Como reproduzir:** Marina → Estratégia → "Conversar com Bia".
5. **Prova:** `proto-conversa-bia.png` × `nosso-conversa-bia.png` (terceira sugestão).
6. **Severidade:** ℹ️ (texto; a versão do `agent.yaml` é genérica de propósito, mas não está registrada como divergência).

### P-06 · Frase do consentimento fora do respiro do cartão do CRM · ℹ️

1. **Tela e rota:** CRM, `/app/miolo/squad/max` (com contatos), cartão dos números.
2. **Protótipo:** na conta em uso, o cartão termina em "Aceitam receber mensagens: 123 de 439 contatos" com a barra
   (`mx-kc`); a frase "Nada é enviado sem consentimento e sem a sua autorização." só existe no vazio (FLUXOS §1.3).
3. **Nosso:** `<p className="mx-rule">` entra dentro de `.mx-kw`, depois de `.mx-kc`
   (`apps/web/components/env/crm/CrmEnvironment.tsx:176`), com `margin:8px 0 0` e sem recuo
   (`apps/web/components/env/crm/crm.css:17`): o texto começa na borda do cartão (x≈300, os outros blocos em x≈320) e
   encosta no pé.
4. **Prova:** `nosso-max.png` (abaixo da barra de consentimento).
5. **Severidade:** ℹ️. A frase sempre visível está declarada na A2b §1 item 3; o desalinhamento não.

### P-07 · O objeto "ambiente" da Kiwi se chama "Growth Marketing", não "Growth" · ℹ️

1. **Tela e rota:** Growth, `/app/miolo/squad/kiwi`, botão "Conversar com Kiwi" e o cartão da conversa.
2. **Protótipo:** `talkAria: 'Conversar com ' + AG[ag].n + ' sobre ' + E.l + ', ao lado'` (L10572) e o objeto
   `name: E.l` (L9777), com `ENVS.media.l = 'Growth'` (L11318): "Conversar com Kiwi sobre Growth, ao lado" e "Conversando
   sobre Growth"; na lista, "Growth · Kiwi · Growth · sobre o ambiente".
3. **Nosso:** `apps/web/components/env/EnvIdentity.tsx:33` e `:42` usam o título da tela (`area` = "Growth
   Marketing"): o nome acessível capturado é "Conversar com Kiwi sobre Growth Marketing, ao lado", e o cartão e o título
   da conversa saem "Growth Marketing".
4. **Prova:** extração de nomes acessíveis (`/tmp/h2_proto_diff_primeiro.txt`, tela `kiwi`) e código; o painel da Kiwi
   não foi aberto (criaria a conversa).
5. **Severidade:** ℹ️. **Conferido:** A1a item 11 (barra "Growth", identidade "Growth Marketing") e a decisão do dono
   falam da barra e do título; o nome do objeto da conversa não está registrado.

## Conferido e bateu

- **Primeiro acesso (Trilha × "Primeiro acesso"):** Estratégia (kicker, título, texto e "Analisar meu negócio"), CRM
  (texto, quatro fontes, "Importar", "Conectar", "Saber mais", pontos), Conteúdo (vazio do calendário, "Delegar o
  planejamento semanal", "Pedir um post à Kaia", três cards), Resultados (vazio) e Marca & Criação (estúdio, sete filtros):
  iguais; as diferenças são as registradas (A1b §4 12, 24, 25; A2b §4 7 e 22).
- **Catálogo "O que pedir à Bia":** título, frase, grupos, capacidades e rodapé iguais; sem estado por capacidade (A2b §4 1).
- **Conversa do ambiente da Bia:** cabeçalho "Bia" · "Conversando sobre" · "Estratégia", "Hoje", primeira fala no formato
  "Oi, eu sou a Bia. <agora> O que você precisa?" ("Disponível." é o mesmo texto da V4.6, L8070), "Pergunte à Bia",
  campo "Mensagem para a Bia…"; sem hora na fala (A2b §4 5).
- **Kaia:** cartão "Aguardando o motor de imagem", "Em produção", "Criações" e os filtros (A2b §4 7, A1b §4 24).
- **Resultados:** "Semana", "Mês", "Trimestre", três indicadores com "Analisar com Íris", "Custo por clique" · "sem dados",
  "Ver tabela", "Análises recentes", "Desempenho por canal"; rótulos, período e origem são os da A2b §4 26–30.
- **CRM com base:** números, "Aceitam receber mensagens: 10 de 20 contatos", "Fontes e canais", "Segmentos", "Campanhas e
  jornadas" com a legenda "Estados" (A2b §4 21–24).
