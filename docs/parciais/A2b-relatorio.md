# A2b — Relatório (Aranha)

**Fatia:** A2b, telas das deliveries novas (Fase 2). **Data:** 16/10/2026, 16:42 → 17:30 (48 min; alvo 75).
**Escopo:** `apps/web`, `packages/ui` (nada mudou nele) e docs da fatia. Nada em `apps/backend`, `supabase/`, `squad/`
(o Stark fechou a S2c e abriu a S2d em paralelo) e nenhuma mudança de contrato de API: o que faltou está na §5.
**Como foi feito:** PASSO 0 lido e registrado em `A2b-progresso.md` (primeiro commit às 16:46). Antes de abrir as
frentes, commitei a estrutura comum: o mapa das entregas, o catálogo "O que pedir", o documento revisável e o alvo da
conversa com o objeto da API. Depois, quatro sub-agentes meus trabalharam em paralelo, cada um só nos próprios
arquivos: (a) Bia, (b) Otto, (c) Kiwi e Max, (d) Íris. Eu fiz o H1-04, o catálogo e a conversa do pedido, os cartões de
contexto, a Kaia, a ordem e os ajustes do e2e, o lado a lado e este relatório. Conferi cada frente pelo Vitest e pelo
`make e2e` inteiro.
**Regra que guiou:** segue o protótipo sempre. Onde a V4.6 não desenha ou a API não tem o dado, a diferença está na §4
com a pergunta. Nada combinado foi trocado.

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| — | **Estrutura comum** | `lib/delivery-types.ts`: as 16 entregas que o squad executa, com dono e chave de catálogo. `lib/capabilities.ts` + `caps.json` (3 idiomas): o catálogo `CAPX_L` da V4.3/V4.4 com os rótulos, descrições e pedidos da camada mais tardia. **Documento revisável** (`components/env/docs/DocumentDetail.tsx`) na leitura editorial do "Documento da Bia" da V4.4 (template L5069: `bd-doc` + `bd-side` com estado, decisão, Versões, conversar, "Baixar PDF" e Histórico), usado por todas as entregas em documento; `DocumentBody` escolhe o leitor de cada família. O detalhe do trabalho manda 02.0X, 04.02/04.03, 05.0X, 06.0X e 07.0X para ele (a 04.01 segue na mesa da legenda) | `a1dcc13` (autosave), `feb026c` |
| 0 | **H1-04 na tela** | "Conversar com <Nome>" em cada ambiente abre a **conversa do ambiente** (`kind: object`, `context: {type: "environment", key: <agente>}`), uma por ambiente e separada da direta: o painel cria ou reabre a conversa na API e mostra "Hoje", a **primeira fala** (`opening.message`) e as **sugestões do ambiente** (`opening.suggestions`, "Pergunte à Bia"), que somem na primeira mensagem. Na lista de Minha Equipe & Conversas: "Estratégia" · "Bia · Estratégia · sobre o ambiente"; abrir pela lista volta com o cartão "Ambiente" | `f5a8cb5`, `c476936`, `250920b` |
| — | **Catálogo "O que pedir" e conversa do pedido** | O botão "O que pedir à Bia" (antes, aviso padrão) abre o popover da V4.3 (L11893): "O que você quer fazer com a Bia?", "A Bia conduz o briefing na conversa, sem formulário.", busca sem acento, grupos, vazio "Nada com “…”…", rodapé; Enter escolhe o primeiro e Esc fecha. Cada capacidade com entrega abre a **conversa do pedido** (`capability`, uma por pedido) com o pedido da V4.6 no campo, sem enviar; a primeira mensagem cria a conversa e o **trabalho da entrega da capacidade**, com o dono da entrega à frente | `f5a8cb5`, `4fcd617` |
| 1 | **Bia: 02.01, 02.02, 02.03, 02.04, 02.07** | Estratégia com dado real (frente a): "Direção estratégica" (só com 02.02 aprovado), "Oportunidades identificadas" do último 02.01, "Em análise", **"Planos e diagnósticos"** com versão, sinal STK6 e estado. Leitor `StrategyDoc` por tipo. **02.07 distingue pesquisa real de sugestão**: achado "Pesquisa" com fonte (título, link, publicado em, coletado em) ou "Sugestão · sem validação"; sem busca: "Busca na web indisponível nesta versão: tudo aqui é sugestão". "Aprovar o diagnóstico" / "Aprovar o direcionamento" (V4.4 L12604). "Analisar meu negócio" do primeiro acesso abre a conversa do pedido `b-diag` (V4.6 L12564) | `7ab6e20`, `e4e294a`, `c34b60b`, `13e37f4` |
| 2 | **Otto: 04.02 e 04.03** | Calendário editorial real (frente b): Semana, Mês e Lista, "Semana anterior", "Próxima semana", "Hoje"; cada post com canal, formato, tema, responsável e estado; **abrir um post** mostra o inspetor (estado, data, "Quem", "Origem" com "Abrir entrega") e "Conversar com Otto sobre este conteúdo" abre a conversa do post (`calendar_post` pelo id); "Próximas publicações". `EditorialDoc`: a pauta da 04.02 e as **versões por canal** da 04.03 (texto, roteiro em trechos com o visual, hashtags, chamada, pedido para a Kaia com o aviso do motor) | `1fcf6bb`, `518ff0f`, `f6f7d03`, `2a8bcd5`, `da2ec10`, `54eef67` |
| 3 | **Kiwi e Max** | CRM com a base real (frente c): números com consentimento, "Aceitam receber mensagens: N de M contatos", "Fontes e canais", **importação de CSV** (arquivo e origem; Server Action; "1 contato importado, 2 linhas recusadas", "Linha 3 · sem consentimento", sem dado pessoal; recusa acima de 1 MB; só owner/admin), "Nada é enviado sem consentimento e sem a sua autorização." sempre visível, **Segmentos** do 06.03 com o painel "Público selecionado" e a conversa do segmento, "Campanhas e jornadas" com 06.01/06.02. Kiwi: "Campanhas pagas" lista o 05.01 (teto proposto, distribuição, limites) e o 05.02. `GrowthDoc` e `CrmDoc` com os avisos de execução ("Só texto: nada é enviado.") | `24eb3bd`, `d2871a8`, `ebd553f`, `a53cae2`, `46339b0`, `6f1a516`, `da67e20` |
| 4 | **Íris: 07.02, 07.03, 07.04 e `metric`** | Resultados com as séries de `metrics_daily` (frente d): "Semana", "Mês", "Trimestre" com a comparação pela média diária dos dias com dado (estoque pelo último valor), origem e dias sem dado; três indicadores com "Analisar com Íris" (**conversa do indicador** `metric` com a chave `<canal>.<métrica>`, período e "Resultados · mês"); "Custo por clique" · "sem dados"; gráfico de 12 semanas com "Ver tabela" (lacuna, nunca zero); "Análises recentes"; "Desempenho por canal". `ResultsDoc`: leituras com o tipo que o worker gravou (Fato / Hipótese), tabela de evidências E1… com período e origem, comparação entre períodos e recomendações com base, responsável e "discutir com" | `7be70d3`, `c5ba3aa`, `7ae5fcd`, `d0ad1cb` |
| 5 | **Kaia e cartões de contexto** | Estúdio mantido (bancada, Criações, filtros) com o cartão **"Aguardando o motor de imagem"** ("As peças, os carrosséis, as imagens e os vídeos da Kaia dependem do motor de imagem, que ainda não chegou. Até lá, nada é criado nem aparece aqui como pronto."), sem fornecedor e sem data; o vazio da galeria e o novo pedido dizem a mesma coisa. **Cartões de contexto novos**: o cabeçalho "Conversando sobre" e a coluna "Contexto da conversa" ganham os tipos "Pedido", "Publicação", "Indicador", "Oportunidade", "Segmento" e "Documento", com período, origem e o resumo que a API devolve | `c470380`, `f5a8cb5`, `c34b60b` |
| 6 | **Testes e lado a lado** | Vitest novo: `A2bConversation` (8), `A2bStrategy` (9), `A2bEditorial` (7), `A2bGrowthCrm`, `A2bResults`; `Environments` ajustado (Kaia, Bia, Max). E2e novos: `a2b-ambiente` (2), `a2b-bia`, `a2b-otto`, `a2b-max` (CSV em `e2e/fixtures/contatos-a2b.csv`), `a2b-iris`. Lado a lado em `docs/parciais/a2b/` (§2.3) | vários (acima), `5db6a0d` |

## 2. Como foi verificado

### 2.1 `make test-web` (17:23, árvore final; exit 0; `docs/parciais/a2b/make_test_web.txt`)

```
$ eslint
packages/contracts typecheck$ tsc --noEmit
packages/ui typecheck$ tsc --noEmit
apps/web typecheck$ tsc --noEmit
packages/contracts test:  Test Files  1 passed (1)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:  Test Files  5 passed (5)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  26 passed (26)
apps/web test:       Tests  229 passed (229)
make test-web exit=0
```

### 2.2 `make e2e` (17:20:49 → 17:21:50: `pnpm --filter web build` + Playwright com o worker simulado; exit 0; `docs/parciais/a2b/make_e2e.txt`)

```
 ✓ Compiled successfully in 2.3s
 ✓ Generating static pages (11/11)
├ ƒ /app/[workspace]/squad/[agente]                24.5 kB         223 kB
├ ƒ /app/[workspace]/squad/[agente]/trabalho/[id]  12.1 kB         142 kB
  ✓   1 [chromium] › e2e/a1b.spec.ts … o Quadro de Projetos mostra o trabalho do seed na coluna Precisa de você
  ✓   2 [chromium] › e2e/a1b.spec.ts … dossiê da Miolo …
  ✓   3 [chromium] › e2e/a1b.spec.ts … Marina confirma o que o Otto percebeu …
  ✓   4–7 [chromium] › e2e/auth-shell.spec.ts (4 fluxos)
  ✓   8 [chromium] › e2e/live.spec.ts … Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova (3.6s)
  ✓   9 [chromium] › e2e/live.spec.ts … Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo (3.4s)
  ✓  10–13 [chromium] › e2e/onboarding.spec.ts (4 fluxos)
  ✓  14 [chromium-a2b] › e2e/a2b-ambiente.spec.ts › Estratégia: Conversar com Bia abre a conversa do ambiente, com a primeira fala e as sugestões (2.6s)
  ✓  15 [chromium-a2b] › e2e/a2b-ambiente.spec.ts › Conteúdo: a conversa do ambiente do Otto é outra, não a conversa direta do seed (1.2s)
  ✓  16 [chromium-a2b] › e2e/a2b-bia.spec.ts › Analisar meu negócio vira o diagnóstico em documento, aprovado e na prateleira (3.5s)
  ✓  17 [chromium-a2b] › e2e/a2b-iris.spec.ts › indicadores com número e origem; Montar um relatório vira o relatório do período em documento (2.4s)
  ✓  18 [chromium-a2b] › e2e/a2b-max.spec.ts › importa uma planilha CSV e mostra as linhas recusadas, sem dado pessoal (969ms)
  ✓  19 [chromium-a2b] › e2e/a2b-otto.spec.ts › Preparar o calendário editorial vira a pauta proposta no calendário, aprovada pela Marina (6.1s)
  19 passed (44.3s)
make e2e exit=0
```

O que cada fluxo novo prova, no build de produção, com o worker simulado e o banco do seed:

- **Bia** (`a2b-bia`): catálogo → "Analisar meu negócio" → conversa do pedido com o texto no campo → Enter → cartão
  "Material · v1" → documento do diagnóstico → "Aprovar o diagnóstico" → aprovado → o documento em "Planos e diagnósticos".
- **Otto** (`a2b-otto`): "Preparar o calendário editorial" → o Nexo pergunta o período (triagem da 04.02, sem período
  no pedido) → a Marina responde na conversa → v1 → os posts propostos aparecem na semana de 19 a 25/10 com "Aguarda você"
  → o inspetor de "Fornada de segunda" → aprova a v1 → a pauta aparece "Aprovado" na Lista. O seed não tem post no
  calendário (`supabase/seed.sql` só limpa `calendar_posts`): os posts vêm da 04.02 que o worker simulado entrega.
- **Max** (`a2b-max`): "Aceitam receber mensagens: 10 de 20 contatos" → importa o CSV fictício (uma linha boa, uma
  sem consentimento, uma duplicada do seed) → "1 contato importado", "Linha 3 · sem consentimento", "Linha 4 · contato já
  está na base" → 11 de 21.
- **Íris** (`a2b-iris`): indicadores com número e "Origem: fonte de teste" → "Montar um relatório" → v1 → o relatório
  do período abre com destaques, por canal e limitações.
- **H1-04** (`a2b-ambiente`): primeira fala e três sugestões da Bia; a sugestão vai ao campo e sai na primeira mensagem;
  fechar e reabrir volta à mesma conversa; a lista mostra uma só conversa "Bia · Estratégia · sobre o ambiente"; a do
  Otto não é a conversa direta do seed.

### 2.3 Lado a lado com a V4.6 (`docs/parciais/a2b/`)

`proto-*` (protótipo na 8010, "Conta em uso" pelo guia "Demo", scripts `lado_a_lado.mjs` e `proto_ambientes.mjs`) ×
`nosso-*` (Marina, 1440×900: capturas do `make e2e` no build de produção e, para catálogo, conversa do ambiente, Kaia e
Kiwi, o `next dev`). `compor.py` junta os pares em 11 `lado-a-lado-*.png`: catálogo da Bia, conversa do ambiente, Kaia,
Estratégia, documento da Bia, calendário e post do Otto, Kiwi, Max, Íris e a lista de conversas. A V4.6 não desenha os
documentos de Otto, Kiwi, Max e Íris nem o relatório da Íris: esses ficam só no lado "nosso" (`nosso-a2b-iris-relatorio.png`).

### 2.4 Texto fixo

Todo texto novo está em `caps`, `docs`, `strategy`, `editorial`, `growth`, `crm` e `results` (e em chaves novas de
`common`, `pages`, `conversation`, `team` e `envs.kaia`), nos três idiomas. A paridade (`catalog-parity.test.ts`)
passou no `make test-web`: mesmas chaves, mesmos argumentos, nenhuma marca do português em en e es. Uma varredura dos
componentes novos por texto entre tags (`grep`) só achou comentários.

## 3. Decisões técnicas (não mudam a experiência)

1. **Pedido de entrega pelo catálogo da V4.3.** Até a A2a, o pedido virava trabalho só pela palavra ("legenda",
   "texto" → 04.01). Agora cada capacidade do catálogo aponta para a entrega que o squad executa (`lib/capabilities.ts`).
   A conversa do pedido só nasce com a primeira mensagem, para não criar conversa vazia ao fechar sem escrever. A
   mensagem vira trabalho com o `delivery_type` da capacidade. O mapeamento está na tabela abaixo; os interpretados estão
   na §4.

   | Agente | Capacidade → entrega |
   |---|---|
   | Nexo | "Coordenar uma campanha" → 02.04 (dono: Bia) |
   | Bia | "Analisar meu negócio" → 02.01 · "Analisar o mercado e os concorrentes" → 02.07 · "Definir o posicionamento" → 02.02 · "Montar um planejamento" → 02.03 |
   | Otto | "Planejar os conteúdos" e "Preparar o calendário editorial" → 04.02 · "Criar uma publicação" → 04.03 · "Escrever textos e artigos" → 04.01 |
   | Kiwi | "Planejar uma campanha paga" → 05.01 · "Revisar orçamento e públicos" → 05.02 |
   | Max | "Organizar meus públicos" e "Segmentar clientes" → 06.03 · "Planejar uma campanha de relacionamento" e "Reativar clientes inativos" → 06.01 · "Preparar fluxos de mensagens" → 06.02 |
   | Íris | "Analisar um indicador", "Interpretar um resultado" e "Investigar um problema" → 07.02 · "Comparar períodos" e "Montar um relatório" → 07.03 · "Acompanhar uma oportunidade" → 07.04 |
2. **Conversa do ambiente criada ao abrir.** A primeira fala vem só no detalhe da conversa (`opening`), então o painel
   faz o `POST` da conversa do objeto ao abrir: 201 na primeira vez, 200 depois. Com isso as conversas de post,
   indicador, oportunidade, segmento e documento também são reabertas, uma por objeto.
3. **Um leitor de documento para todas as entregas em documento**, o da V4.4. A V4.6 só desenha esse documento para a
   Bia. Para os outros, a leitura `bd-*` é a mais próxima do combinado. As seções de cada tipo seguem o formato que o
   worker grava (`squad/deliveries.py` e os acréscimos de `flow.py`) e só aparecem com conteúdo.
4. **Ordem do e2e.** Os fluxos da A2b pedem entregas (créditos), aprovam, importam contatos e criam pendências. Eles
   passaram a rodar num projeto do Playwright que depende do primeiro (`chromium-a2b`, `dependencies: ["chromium"]`),
   depois dos fluxos que contam com o seed intacto: as contagens da barra e os créditos da Miolo no `live.spec`. Na
   primeira rodada, na ordem alfabética, o `live.spec` caiu por `insufficient_credits` no worker e as contagens mudaram.
   Cada fluxo que pede entrega concede antes um **bônus local** de 10 créditos fictícios (`grantLocalCredits`,
   `app.grant_credits` pelo container `supabase_db_hellosquad`, como o roteiro da S2a). O teardown reaplica o seed.
5. **Vitest e CSS de componente.** As frentes importam o próprio CSS (`strategy.css`, `content.css`, `results.css`…).
   O Vite tentava carregar o PostCSS do Next e o teste quebrava; agora o `vitest.config.ts` usa uma configuração vazia
   de PostCSS. O build do Next continua com a dele.
6. **Duas mudanças em testes que já existiam, pelo comportamento combinado.** No `onboarding.spec`, "Conversar com
   Nexo" agora abre a conversa do ambiente (H1-04); a conversa direta do Pedro é reaberta pela lista de Minha Equipe &
   Conversas. No `Environments.test`, os casos da Kaia e do primeiro acesso da Bia seguem o motor de imagem e a conversa
   do pedido.

## 4. Divergências do protótipo (registradas, não corrigidas)

Legenda: **D** = a API não tem o dado (vazio honesto); **P** = só existe no protótipo (simulação); **?** = pergunta.

| # | Tela | O que a V4.6 faz | O que ficou | Tipo |
|---|---|---|---|---|
| 1 | Catálogo | Estado por capacidade ("trabalho criado", "N trabalhos", "em conversa") | Sem estado: a casca não tem os trabalhos por capacidade | D |
| 2 | Conversa do pedido | O especialista conduz o briefing com perguntas e opções e mostra "Confirmar o trabalho" ("Criar o trabalho", "Ajustar") | A primeira mensagem cria o trabalho; o que falta, a triagem do Nexo pergunta na conversa (ex.: o período da 04.02). Não há fala roteirizada | D/P |
| 3 | Catálogo | Toda capacidade abre uma conversa roteirizada | Sem entrega nesta versão: "Este pedido ainda não tem entrega nesta versão. Escreva na conversa o que você precisa." (Nexo: projeto novo, tarefa, acompanhar, aprovações; Bia: oportunidades; Otto: Google, programar; Kiwi: SEO, orgânico, otimizar, conversão, teste; Max: jornada, captar). Kaia: o aviso do motor | D |
| 4 | Catálogo | "Coordenar uma campanha": o Nexo responde e chama a Bia | Conversa do pedido 02.04 com a Bia à frente, porque a API deriva o agente da entrega. Também interpretados: "Revisar orçamento e públicos" → 05.02, "Acompanhar uma oportunidade" → 07.04, "Investigar um problema" → 07.02 | ? dono |
| 5 | Conversa do ambiente | A primeira fala entra no histórico com hora | A fala é calculada pela API a cada leitura: aparece sem hora, no começo do histórico | D |
| 6 | Conversa de indicador | Faixa "A página está em outro período." + "Atualizar para <período>" | Fora: a página ainda não conta à casca o período em que está | P/D |
| 7 | Kaia | Bancada com "Precisa de você"; o novo pedido abre a conversa | Cartão "Aguardando o motor de imagem" na bancada; o novo pedido mostra o aviso do motor (decisão do dono de 16/10). Com o stub `ImageEngine` da S2d, o quadro pode abrir a conversa da 03.01 | ? Diogo |
| 8 | Cartão de contexto | Tipos da V4.6 (Ambiente, Publicação, Indicador, Oportunidade, Pedido…) | "Segmento" e "Documento" são rótulos novos | ? Diogo |
| 9 | Documento | V4.4: "Aprovar …" e "Pedir ajuste" | Também "Pedir nova proposta" e "Cancelar trabalho", pela decisão do dono de 08:55 (rejeitar tem duas saídas) | — |
| 10 | Documento | "Baixar PDF" (simulação) | Aviso padrão "Ainda não disponível nesta versão." | P |
| 11 | Bia · Direção | Frase, objetivo, prioridade e público escritos | Só com 02.02 aprovado; objetivo e público = os primeiros do documento; "Prioridade agora" = a primeira ação de um 02.03 aprovado | D |
| 12 | Bia · Oportunidades | Rostos, próximo passo ("Kiwi assume…"), "Indício · …" | Sem eles; a fonte do "Bia percebeu" é o próprio diagnóstico; "Relevância baixa" é rótulo novo | D |
| 13 | Bia · Em análise | "Preliminar" com sinal parcial | A linha de apoio é o `status_label` da API | D |
| 14 | Bia · Prateleira | Diagnóstico pendente "Aguarda leitura" (V4.4) | "Aguarda você" em todos os tipos (regra STK6 da V4.6) | ? Diogo |
| 15 | Bia · Documento | Seções do diagnóstico e do plano | Também "Premissas", "Dados que faltam", "Públicos", "Diferenciais", "Mensagens-chave", "Frentes", "Achados", "Hipóteses", "Fontes" | ? Diogo |
| 16 | Otto · Calendário | Prévia da peça no cartão | Sem peça visual (motor): estado no alto do cartão; "Próximas publicações" mostram o formato | D |
| 17 | Otto · Estados | "aguarda você", "agendado", "publicado" | `draft` → "Aguarda você"; `planned` → "Aprovado" · "publicação não autorizada" (rótulo do protótipo para aprovado sem autorização); "Aprovado" não entra na legenda, como no protótipo | ? Diogo |
| 18 | Otto · Inspetor | "Legenda do Otto", "Stories", "Desempenho", "Quem" com papéis | Sem esses dados; "Quem" é o responsável; "Origem" é o título do trabalho com "Abrir entrega" | D |
| 19 | Otto · Calendário | Espaços "A definir", "Sugestão do Otto", eventos do plano, chip "Planejamento semanal" | Fora (não há dado) | D |
| 20 | Otto · Inspetor | "Aprovar v1" aprova o post | Aprova a versão inteira da pauta (a API decide por versão) | ? dono |
| 21 | Max · Números | "Clientes cadastrados", "Ativos", "Inativos", "Novos contatos" | "Contatos cadastrados", "Aceitam e-mail", "Aceitam WhatsApp", "Sem consentimento" (o resumo da API) | D |
| 22 | Max · Importar | Abre uma conversa (`mx-imp`) | Formulário no próprio ambiente (arquivo e origem obrigatória, gravada em cada consentimento) | ? dono + Diogo |
| 23 | Max | "Max percebeu", jornada da reativação, pontos `mx-dots`, "dados ilustrativos" | Fora (não há dado) | D |
| 24 | Max · Segmento | Origem do segmento | Link para o 06.03 + as origens da base inteira | D |
| 25 | Kiwi · Campanhas pagas | "Revisar e autorizar" | "Revisar o plano" / "Ver a proposta" (autorizar é da Fase 3); objetivo de crescimento segue vazio com 05.01 (é proposta) | ? dono |
| 26 | Íris · Indicadores | "Encomendas pelo site", "Visitas vindas do Instagram", "Alcance no Instagram" | Pela série real: "Pedidos", "Sessões no site", "Alcance no Instagram" (soma diária) | ? dono |
| 27 | Íris · Período | "setembro · comparado com agosto" | Janelas de 7, 30 e 90 dias com as datas; o Trimestre não tem período anterior com dado | ? dono |
| 28 | Íris · Origem | Selo "dados ilustrativos" | "Origem: fonte de teste" | ? dono |
| 29 | Íris · Gráfico | Linhas de média e marcas "1" e "2" | Sem elas; a lacuna é anotada e a tabela diz "4 de 7 dias com dado · soma parcial" | D |
| 30 | Íris | "Íris percebeu", "Oportunidades", barra de participação por canal | Fora (não há dado; as unidades são diferentes) | D |

## 5. O que a API precisa (para o Stark)

1. **Lista de trabalhos com a versão atual** (número, estado, data e decisão): Bia, Íris, Kiwi e Max fazem hoje um
   `GET /work-items/{id}` por documento para montar o ambiente.
2. **`CalendarPost`**: número da versão, título do trabalho de origem e o `objetivo` de cada post. Hoje a tela cruza com
   as pendências e com a lista de trabalhos, limitada a 50. Legenda e desempenho do post ficam para a Fase 3.
3. **Contatos**: ativos, inativos e novos no resumo; consentimento em qualquer canal e origem por segmento; estado dos
   canais de e-mail e WhatsApp.
4. **Métricas**: encomendas por canal de origem; série de anúncios e custo por clique quando houver conta conectada.
5. **"<Agente> percebeu" e oportunidades por ambiente**: na Bia, o responsável e o indício de cada oportunidade; na
   Íris, a leitura curta por indicador e período. Também o sinal "preliminar" das análises em andamento.
6. **Briefing do pedido do catálogo** (perguntas com opções e "Confirmar o trabalho"), se o dono quiser o fluxo da
   V4.3 antes do modo real (§4 item 2).
7. **Kaia**: com o stub `ImageEngine` da S2d no ar, a entrega 03.01 entra em `DELIVERY_OWNER` e o quadro "Nova peça"
   pode abrir a conversa do pedido, mostrando o "aguardando motor" que o worker responder.

## 6. Perguntas ao dono e ao Diogo

- **Dono:** 4 (mapeamento das capacidades), 20 (aprovar a pauta inteira pelo post), 25 (rótulos da Kiwi antes da
  autorização), 26, 27 e 28 (rótulos, períodos e origem da Íris), e se os limites de navegação do calendário do
  protótipo (2 semanas para trás, 4 para a frente) valem com dado real.
- **Dono + Diogo:** 22 (importar por formulário em vez de conversa).
- **Diogo:** 7 (o cartão do motor na bancada da Kaia), 8, 14, 15 e 17; os horários do calendário ("9h" em pt-BR,
  "9:00" em en, "9:00 h" em es); a semana incompleta como lacuna no gráfico da Íris.
- **Bia** (pergunta da frente): cada oportunidade abre a própria conversa (`opportunity`, chave
  `<trabalho>:o<N>`), em vez da conversa do diagnóstico inteiro. Pode ser assim?

## 7. O que ficou de fora

- **Faixa de período** da conversa de indicador (§4 item 6).
- **E2e da Kiwi**: o briefing pedia os quatro fluxos mínimos (Bia, Otto, CSV, Íris), e a Kiwi ficou só no Vitest. O
  lado "nosso" da Kiwi foi capturado no `next dev` com o seed, sem 05.01, e mostra o vazio.
- **Estado por capacidade no catálogo** (§4 item 1).
- **Pequeno visual a conferir:** com o catálogo aberto, a borda escura do botão "O que pedir" (`cap-trig.is-on`)
  parece mais clara que a do protótipo na captura `lado-a-lado-1-catalogo-bia.png`. Não investiguei; fica para a revisão
  do Diogo.

## 8. Onde discordei ou interpretei

- **"Calendário do Otto mostra o post do seed":** o seed não tem post no calendário (só apaga `calendar_posts`). Não
  toquei no seed, que é área do Stark. O post vem da 04.02 que o worker simulado entrega no próprio e2e ("Fornada de
  segunda", 19/10).
- **Ordem e créditos do e2e** (§3 item 4): necessários para os fluxos novos conviverem com os antigos no mesmo banco.
- **Quatro sub-agentes** em vez de fazer tudo sozinho, como na A1b: cada um commitou só os próprios caminhos. Ajustei o
  que cruzou fronteira: o teste antigo da Bia, o tipo "Oportunidade", o e2e do Otto (pergunta do período e estado
  exato) e a ordem do e2e.

## 9. Estado em que deixei a máquina

- **`next dev` da 3100:** derrubado às 17:13 para o `make e2e` (o build quebra o dev e o Playwright reaproveitaria a
  porta). Subiu de novo às 17:21 com `setsid make dev-web`, desacoplado da sessão (log em
  `/tmp/hellosquad-dev-web.log`); `GET /entrar` → 200.
- **API da 8100:** intocada. O worker do e2e encerrou ("worker encerrado").
- **Banco:** seed reaplicado pelo teardown do `make e2e` (17:21), dentro da trava. Depois disso, só a captura da Kiwi
  (login e leitura).
- **Arquivos fora de commit:** nenhum meu.
- **Logs:** `/tmp/a2b/` (`make-e2e-1..3.log`, `test-web-1..2.log`, `vt*.log`, `e2e-early*.log`). Nada disso contém chave.
