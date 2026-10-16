# Notas de extração · Memória da Marca, Modo Autônomo, Conexões (Product UI V4.6)

Fonte: extratos em `docs/parciais/x1/out/pui/`. "(Lnnnn)" é a linha de origem no HTML. Rótulos entre aspas estão como no código. "Não aparece no protótipo" = ausente dos extratos lidos. Tudo é simulado: o próprio código diz que nada é sincronizado, enviado ou publicado (L12698).

## 0. Camadas e o que vale no final

- **V3** (classe base, L6408–9587; dados L6077–6206): `TPL`, `memItems`, `SITE_FINDS`, `IG_FINDS`, `OBJ_FIND`, `connItems`, `_resps`, `_autoAll`, `_respPause`, `_memConfirm`, `_memRemove`, `_readSite`, `_connectIg`.
- **V4.5** (L12695–13766): `renderVals` (L13743) cria `o.m5 = _vMem5` e `o.a5 = _vAuto5`. O template final só lê `m5.*` e `a5.*` (Modo Autônomo L5097–5186, Memória L5188–5291). `_vMem` (L9428) e `_vAuto` (L9267) da V3 ainda são chamados por `_vMore`, mas nenhuma tela os usa (o template não tem mais `ps-mc`, `ps-rc2`, `ps-tpl`, `ps-ss`, `ps-cn`).
- **V4.6** (L13841–13962): "Nenhuma funcionalidade nova" (L13842). Só muda linguagem: "<Agente> percebeu" (L13929), "Alterações recentes" sem o que ainda espera você (L13934), histórico do Modo Autônomo com 3 linhas + "Ver todo o histórico (N)" (L13943), faixa "Precisa de você" com rosto do agente (L13864). O Início não é tocado (L13845).
- **Da V3 ainda em uso**: estado `mem.items`, `memDec`, `rot`, `auto.extra`; `_memConfirm`/`_memRemove`/`_memPatch` (L7935–7946); `_respPause`/`_autoAll` (L6982–6994); `_rotPause` (L6920); primeiro acesso (`_readSite`, `_connectIg`, `_setObjective`, L7907–7930); cartões do Início "O Squad percebeu" e "Modo Autônomo" (L8376–8447; template L4681–4710).
- **Vestígios da V3 sem tela**: `s.conns`/`connItems` (escrito no primeiro acesso, nenhuma tela V4.5 lê); assistente `auto.setup` de 4 passos (L9300); cartão "proposal" e `_rotActivate` (L6896); estado `proposed` (existe em `RST5`, mas nada o produz depois que `_j3Start` foi trocado em L13275).
- IDs dos agentes: coord=Nexo, arch=Bia, leaf=Kaia, pill=Otto, hex=Kiwi, funnel=Max, square=Íris. Papéis ao consultar a memória (`RL5`, L12703): Coordenação, Estratégia, Criação, Conteúdo, Growth, CRM, Resultados.
- "Hoje" no protótipo é segunda, 12/10 (cenário `uso`); cenário `primeiro` = conta nova.

---
## A. Memória da Marca

### A1. Estrutura da página (L5191–5290)
1. Cabeçalho: h1 "Memória da Marca", "O que o seu squad sabe sobre você e o seu negócio." (L5195); busca (placeholder e aria "Buscar na memória", L5196); botão "Adicionar conhecimento" (L5197).
2. Faixa "Precisa de você" (L5199). No `uso`, junta as contagens: "N sugestão/sugestões, N em conflito e N desatualizado", subtexto "Nada vira orientação do squad sem o seu ok.", botão "Revisar" (rola até `#me-pend`) (L13815). Na V4.6 quem pede aparece como "Squad" nesta página (L13868); tipo "Para você confirmar".
3. Painel "Adicionar conhecimento" (só quando aberto, A11).
4. **Dossiê** (L5204): selo "M", nome ("Miolo"), descrição, rótulo "O que o squad sabe" + síntese, linha "De onde vem" (pílulas das fontes), rosto dos 7 agentes + rodapé, e lista "Principais conhecimentos".
5. "O squad percebeu" (sugestões, conflito, desatualizado) + "Alterações recentes" lado a lado (L5216–5253).
6. "Tudo o que o squad sabe" (L5257): "por assunto · abra um item para ver a origem e quem usa"; filtro "Ver pelo especialista"; abas de assunto; lista expansível.

### A2. Dossiê (L13621, `dos`)
| Campo | `uso` | `primeiro` |
|---|---|---|
| name | "Miolo" | "Miolo" |
| desc | "Padaria de fermentação natural · Pinheiros, São Paulo · desde 2016" | "Padaria · São Paulo" |
| sum | `SUM5` (L12920): "A Miolo faz pão de fermentação natural, com 36 horas de processo e farinha de pequenos moinhos. Vende para famílias do bairro, na loja e por encomenda no site. Fala de tempo e cuidado, sem exagero, e quer ser reconhecida como a padaria de fermentação natural do bairro." | "O squad ainda sabe pouco sobre a Miolo: só o que você contou no cadastro. Cada fonte conectada e cada conversa ajudam a completar. Nada vira orientação sem o seu ok." |
| foot | "Síntese do squad a partir de N conhecimentos confirmados" (N = itens `ok`+`dec`) | "Síntese a partir do cadastro" |
| chips | "N sugestão/sugestões" (hypo), "N em conflito" (conf), "N desatualizado" (old, sempre singular); clicar rola até `#me-pend` | idem |

"Principais conhecimentos" = `KEY5` (L12919), 7 chaves fixas → item: "Proposta de valor"→m-val, "Público"→m-pub, "Produtos"→m-prod, "Diferenciais"→m-dif, "Posicionamento"→m-pos, "Identidade visual"→m-vis, "Tom de comunicação"→m-tom. Cada linha mostra rótulo, valor e o estado do item (ícone + texto). Chave sem item: "Ainda não sabe · contar agora" (ícone `M8 4.6v6.8 M4.6 8h6.8`, classe `me-st is-miss`); clicar abre "Adicionar conhecimento" com o assunto pré-escolhido ("Público"→Meu público; "Posicionamento", "Identidade visual", "Tom de comunicação"→Minha marca; o resto→Meu negócio) (L13620).

### A3. Assuntos e abas (L12704–12716, L13687)
Abas: "Tudo" + as 5 de `AREA5`, cada uma com contagem (itens que não são `rej` nem `off`; "Conexões e fontes" conta fontes). Cabeçalho do grupo só aparece na aba "Tudo".
| id | Aba (`l`) | Descrição (`d`) | Assuntos (`TOPIC5`) |
|---|---|---|---|
| neg | "Meu negócio" | História, localização, produtos, diferenciais e operação | História · Proposta de valor · Localização · Produtos · Diferenciais · Operação · Objetivos |
| marca | "Minha marca" | Identidade visual, tom de voz, posicionamento, preferências criativas e referências | Posicionamento · Identidade visual · Tom de voz · Preferências criativas · Referências |
| pub | "Meu público" | Quem compra, do que precisa e como se comporta | Perfil dos clientes · Necessidades · Comportamentos conhecidos · Preferências identificadas |
| con | "Conhecimento e aprendizados" | Pesquisas, descobertas, decisões e orientações confirmadas | Pesquisas · Descobertas · Decisões · Preferências · Orientações confirmadas |
| src | "Conexões e fontes" | De onde vem o que o squad sabe | (lista de fontes, C2) |

V3 tinha 4 abas ("Meu negócio", "Minha marca", "Conhecimento", "Conexões") e grupos `g` ("Sobre a Miolo", "Clientes", "Objetivos", "Voz", "Preferências", "Decisões", "Aprendizados", "Links"); na V4.5 `tab`/`g` só servem para derivar a área quando o item não está em `MX5` (L12943).

### A4. Estados do conhecimento (`KST5` L12893, `KIC5` L12896; sempre ícone + texto)
| chave | Rótulo | classe | Path do ícone | Texto na linha expandida (L13666) | Squad usa? |
|---|---|---|---|---|---|
| ok | "Confirmado" | ok | `M4.4 8.3l2.4 2.4 4.8-5` (check) | "Confirmado por você · <data>" | sim |
| dec | "Decisão sua" | ok | igual a ok | "Decisão sua · <data>" | sim |
| src | "Da fonte" | src | `M…` (elidido no extrato) | "Lido em <fonte> · <data> · em uso, sem confirmação sua" | sim, sem confirmação |
| learn | "Observado" | obs | `M…` (elidido) | "Observado pelo squad · usado como contexto, não como regra" | só contexto |
| hypo | "Sugerido" | hypo | `M8 5.2v.1 M8 7.4v3.6` (ponto sobre traço) | "Sugestão · ninguém usa até você confirmar" | não |
| old | "Desatualizado" | old | `M8 4.6V8l2 1.3` (ponteiros de relógio) | "Desatualizado · o squad avisa quando usar" | com aviso |
| rej | "Descartado" | rej | `M5.2 5.2l5.6 5.6 M10.8 5.2l-5.6 5.6` (X) | "Descartado por você · não vira regra" | não |
| conf | "Em conflito" | conf | `M5.4 4.4v7.2 M10.6 4.4v7.2` (duas barras) | "Em conflito · não é usado até você decidir" | não |
| off | "Não usado" | off | `M4.4 11.6l7.2-7.2` (traço diagonal) | "Fora de uso a seu pedido" | não |

Rótulo do bloco "quem usa" na linha expandida: "Como o squad utiliza" (padrão), "Quem vai usar depois do seu ok" (hypo), "Ninguém usa agora" (conf, rej, off); com 7 agentes: "Todo o squad consulta quando precisa". Cada agente: "<Nome> · <papel RL5>" + `how` (ex.: Kaia · Criação, "nas peças de Natal").
Estados do **chip na conversa** (cartão `m5learn`, L13730): "Sugestão · aguardando você", "Descartada por você", "Fora de uso", "Confirmada por você".

### A5. Sugestões "<Agente> percebeu" (L13633–13638, V4.6 L13929)
- Título da seção "O squad percebeu" (L5217), sub "nada vira orientação sem o seu ok".
- Cabeçalho do cartão: rosto de `by` (padrão Nexo; m-l2 = Íris) + `kick` + data (`at`, padrão "hoje"). V4.6: `kick` = "<Nome> percebeu · <assunto em minúsculas>", ex. "Kaia percebeu · preferências criativas", "Íris percebeu · comportamentos conhecidos". Antes da V4.6: "O squad percebeu uma preferência · …" / "O squad observou · …".
- Pergunta (`q`): ex. "Você prefere a data sempre visível, no topo das peças de oferta?"; sem `q`, usa `v + "?"` (leitura do site vira "Padaria de fermentação natural?").
- "Origem: <ori>" (ex. "Ajuste pedido à Kaia · post do Dia Mundial do Pão"; sem `ori`: `src` com inicial maiúscula, ex. "Do site").
- Nota fixa: "Nada muda nas entregas até você confirmar." (L13636).
- Ordem: `isNew` primeiro, `m-preco` antes de todos; 3 visíveis, o resto atrás de "Ver mais N" (L13645, L13697). Depois das sugestões vêm conflito e desatualizado.
- Vazio: `uso` "Tudo revisado. Quando o squad perceber algo novo, aparece aqui para você confirmar, corrigir ou descartar."; `primeiro` "Quando o Nexo ler o site ou você conversar com o squad, o que ele perceber aparece aqui para você confirmar. Nada vira orientação sem o seu ok." (L13697).

| Botão (origem) | Método | Efeito no item |
|---|---|---|
| "Confirmar" (L5226, L5275) | `_m5Confirm` L12951 | `st`→ok; `src`→"confirmado por você · agora"; `isNew`→false; se era hypo, `memDec[id]={st:'ok'}` (Início mostra "Na Memória"); `meta.cAt`="hoje, HH:MM"; histórico "Você confirmou: <valor>". Toast: hypo "Confirmado. Todo o squad passa a usar."; m-preco "Confirmado. Kaia, Otto e Bia usam a partir da próxima entrega."; outros "Confirmado na Memória da Marca". |
| "Corrigir" (L5226, L5276) | `_m5Fix` L12962 / `_m5Save` L12963 | Abre textarea (aria "Corrigir o conhecimento") com botões "Salvar como confirmado" (cartão) ou "Salvar" (linha) e "Cancelar". Salvar vazio só fecha. Salvar: `v` novo, `st`→ok, `src`→"corrigido por você · agora", `meta.prev`=valor antigo (linha mostra "Antes: “…”"), histórico "Você corrigiu: <valor>", toast "Corrigido. O squad usa a versão nova." |
| "Descartar" (L5226, L5277) | `_m5Discard` L12975 | `st`→rej; `src`→"descartado por você · agora"; histórico "Você descartou: <valor>"; toast "Descartado. Não vira regra e ninguém do squad usa." O registro permanece (oculto até "Mostrar descartados e fora de uso (N)"). |
| "Não usar mais" (L5278) | `_m5Off` L12983 | guarda `meta.offFrom`=estado atual, `st`→off; "Você pediu para não usar: <valor>"; toast "Fora de uso. Fica guardado, mas o squad não usa." |
| "Voltar a usar" (L5279) | `_m5Off(id,true)` | `st`→`offFrom` (ou ok); "Você voltou a liberar: <valor>"; toast "De volta à memória do squad". |
| "Conversar sobre isso" (L5280) | `_m5Talk` → `_openCtx('mem', id)` | Abre conversa contextual (A13). |

Disponibilidade por estado (L13675): "Confirmar" = hypo, src, learn; "Corrigir" = todos menos rej; "Descartar" = só hypo; "Não usar mais" = ok, dec, src, learn, old; "Voltar a usar" = off. Em conflito: só "Nenhum dos dois: corrigir" (L5227). Em desatualizado: "Enviar planilha nova (simulação)" e "Continua valendo" (L5228).
Diferença importante: no **Início**, "Recusar" (V3 `_memRemove`, L7942) apaga o item de `mem.items` (guarda só `memDec[id]={st:'rej',snap}` para mostrar "Recusada"); na Memória, "Descartar" mantém o registro com `st: 'rej'`.

### A6. Conflito (mesma informação de duas fontes; `CONF5` L12770, só `m-hor`)
- O item `m-hor` passa a `st: 'conf'`, `src: 'duas fontes diferentes'` (L12906). Kick "Informações em conflito · horário"; texto: "Duas fontes dizem coisas diferentes sobre o horário. Enquanto você não decide, o squad não usa nenhuma das duas." (L13640).
- Duas opções (ícone da fonte + data, valor, botão "Vale este"; aria "Vale este: <valor>"): "Google Perfil · 20/09" → "Terça a domingo, das 7h às 19h"; "Site · lido em 14/09" → "Terça a sábado, das 7h às 19h; domingo, das 7h às 13h".
- `_m5Conflict(i)` L12991: `v` da escolhida, `st`→ok, `src`→"resolvido por você · agora", `meta.sk`=fonte escolhida, `meta.prev`=valor da outra; histórico "Você resolveu o conflito do horário: vale o do Google Perfil" (ou "do site"); toast "Conflito resolvido. A outra versão sai da memória."
- Link "Nenhum dos dois: corrigir" abre a edição livre.

### A7. Desatualizado (L13643, `_m5Outdated` L12998)
- `m-mais` vira `st: 'old'`, `src: 'da planilha de setembro'`. Kick "Desatualizado · mais vendidos"; `q` = valor atual; texto "Veio da planilha de encomendas de setembro. Outubro ainda não entrou."; data "01/10"; agente Íris; nota "O squad avisa quando usar esse dado."
- "Enviar planilha nova (simulação)": `A.plan`='new'; valor→"Levain tradicional, focaccia de alecrim e pão de abóbora"; `st`→src; `src`→"da planilha de outubro · simulação"; histórico (Íris) "A Íris atualizou os mais vendidos com a planilha de outubro (simulação)"; toast "Planilha de outubro recebida · simulação".
- "Continua valendo": `st`→src; `src`→"mantido por você · agora"; histórico "Você manteve os mais vendidos de setembro".

### A8. Fontes na Memória ("De onde vem")
- Linha de pílulas no dossiê (L5209): aria "De onde vem o que o squad sabe"; pílula = ícone + nome curto (`SH`: "Você", "Conversas", "Site", "Instagram", "Google Perfil", "Planilha", "Documentos", "E-mail", "WhatsApp") + ponto colorido do estado; aria "<fonte>: <estado>. Ver as fontes"; clicar abre a aba "Conexões e fontes" e rola até `#me-br-t` (L13698). Detalhes dos estados em C.
- Por conhecimento (`SRCK5` L12718): `sk` ∈ onb "Onboarding", site "Site", ig "Instagram", gp "Google Perfil", plan "Planilha de encomendas", doc "Guia da marca", chat "Conversas", team "Especialistas", you "Declarado por você". Texto de origem (`ORI5` L13661): "Contado por você no cadastro", "Lido no site miolo.com.br", "Lido no Instagram @miolo.padaria", "Lido no Google Perfil", "Lido na planilha de encomendas", "Lido no Guia da marca", "Dito por você numa conversa", "Registrado por um especialista", "Declarado por você".
- Se `src` não começar por "confirmado por você / do site / do google perfil / da planilha / do cadastro / declarado por você / corrigido por você / adicionado por você / resolvido por você / mantido por você", a origem é `src` com inicial maiúscula (L13664). `ori` explícito vence.
- `sk` derivado quando falta em `MX5` (L12945): /cadastro/→onb, /site/→site, /instagram/→ig, /google/→gp, /planilha/→plan, /você/→you, senão chat.

### A9. Busca e filtros (L13658–13704)
- Busca: substring sem caixa em `k + v + tp` (não olha fonte nem agente). Digitar na aba "Conexões e fontes" volta para "Tudo". Rótulo "N resultado(s) para “<q>”" + link "Limpar a busca" (L5261). Vazio: "Nada encontrado. Tente outra palavra ou adicione esse conhecimento." / "Nada aqui ainda."
- Por especialista: rótulo "Ver pelo especialista" (L5259); 7 botões-rosto (aria "Ver o que <o Otto> consulta", `aria-pressed`). Seleção mostra faixa: "<O Otto> consulta N conhecimentos" + "Usa <AGB5>. Sugestões e conflitos ficam de fora até você decidir." + "Ver tudo" (L13702). N exclui rej, off, hypo, conf (L13688), mas a lista visível ainda mostra hypo/conf do agente (inconsistência).
- `AGB5` (L12918): coord "para organizar projetos e prazos"; arch "para definir prioridades e campanhas"; leaf "para criar peças, artes e a identidade"; pill "para planejar e escrever conteúdos"; hex "em buscas, anúncios e testes"; funnel "em segmentos e mensagens para clientes"; square "para ler e explicar os resultados".
- Descartados e fora de uso ficam ocultos; link "Mostrar descartados e fora de uso (N)" / "Esconder descartados e fora de uso" (L13704).
- Linhas: colapsada = `k`, `v`, estado, fonte (ícone + rótulo), até 4 rostos + "+N". Expandida = "Origem" (ori + frase de confirmação + "Antes: …"), "Alterações" (histórico do item), quem usa, ações. `_m5Open` expande (exceto hypo/conf/old, que ficam no bloco de cima), rola e destaca por 3,2 s (L13034).
- Escopo de quem usa: `_m5Scope` (L13020) troca `ags` por ["leaf"], ["leaf","pill"] ou os 7; histórico "Você ajustou quem usa: todo o squad" / "<nomes>". Só acessível pela conversa (A13).

### A10. Histórico de alterações
- Seção "Alterações recentes" (L5247); 5 linhas + "Ver todas as alterações (N)"; vazio "As confirmações, correções e descartes aparecem aqui." (L5251). Linha = rosto do agente ou selo "M" (você) + texto + data; clicar leva ao item.
- V4.6 filtra o que ainda espera você (hypo/conf/old com agente) (L13934).
- Entrada de log: `{who, t, at, id}`; `who=null` = você. `LOG5` (L12910): "A Kaia sugeriu: data sempre visível nas peças de oferta" 11/10 m-data; "A Íris observou: sábado é o dia com mais encomendas" 09/10 m-l2; "Você decidiu: empresas que presenteiam no fim de ano" 08/10 m-pub2; "Você confirmou a meta: 400 panetones até 20/12" 05/10 m-meta; "Você descartou: emojis no fim das legendas" 02/10 m-emo; "A Bia registrou o posicionamento aprovado" 23/09 m-pos.
- Histórico por item (`meta.hist`, mais novo primeiro): `[who, texto, "hoje · HH:MM"]`; a última linha é sempre "Entrou na memória: <origem>" com `at`.

### A11. Adicionar conhecimento (L5200–5202, `_m5AddSave` L13009)
- Rótulo "O que o squad precisa saber?"; placeholder "Ex.: aos domingos a loja fecha às 13h"; grupo "Assunto" com 4 chips (Meu negócio, Minha marca, Meu público, Conhecimento e aprendizados); "Cancelar"/"Guardar"; nota "Entra como declarado por você, já confirmado. Todo o squad passa a usar."
- Item criado: `id` "m-you-<base36>", `k` "Contado por você", `st` ok, `src` "declarado por você · agora", `ags` = 7 agentes; meta `{a, tp: 1º assunto da área, sk:'you', at:'hoje', cAt}`; histórico "Você adicionou: <valor>"; toast "Guardado na Memória da Marca. Todo o squad passa a usar."
- Texto vazio só fecha o painel.

### A12. Primeiro acesso (leitura do site/Instagram vira sugestão)
- Cartão do Início "Para o squad conhecer a Miolo" (L4644): "Mande o site" ("O Nexo lê e separa o que for útil.", campo "Endereço do site", botão "Ler o site"); "Conecte o Instagram" ("Conectar não autoriza publicar.", botão "Conectar"); "Conte o resto ao Nexo" ("Objetivo, público, o que vende mais.", botão "Conversar"). Contagem "N de 3".
- `_readSite` (L7907): 2,8 s; `onb.siteSt` idle→busy ("Nexo lendo as páginas do site")→done ("6 páginas lidas · 5 informações para confirmar"); adiciona `SITE_FINDS` (5 itens, todos `st:'hypo'`, `src:'do site'`, `isNew`): Negócio "Padaria de fermentação natural", Produtos "Pães, focaccias, doces e café", Canais de venda "Encomendas pelo site e retirada na loja", Onde "Pinheiros, São Paulo", Tom de voz "Acolhedor, fala de tempo e cuidado". Toast "O Nexo leu o site: 5 informações para confirmar". Atualiza `conns` c-site: "Lido hoje. O Nexo relê uma vez por mês."
- `_connectIg` (L7918): 2 s; adiciona `IG_FINDS` (1 item hypo, `src:'do Instagram · exemplo'`, Aprendizados/"Instagram": "Os posts com mais interação mostram fornadas e bastidores"); toast "Instagram conectado · simulação"; chip "@miolo.padaria conectado" + tag "simulação".
- `_setObjective` (L7928): item `f-obj` já `st:'ok'`, `src:'contado ao Nexo'`, "Objetivo atual"; Nexo: "Anotei na Memória da Marca: “<objetivo>”. Já dá para pedir a primeira entrega…"
- Cadastro: `memItems('primeiro')` (L6177) = Nome "Miolo", Segmento "Padaria", Cidade "São Paulo", todos ok, `src:'do cadastro'`.
- Os `f-*` não existem em `MX5`: área/assunto vêm do fallback (1º assunto da área: "História", "Posicionamento" ou "Pesquisas"), `by`=coord, então o cartão sai como "Nexo percebeu · história" (V4.6) e pergunta "<valor>?", origem "Do site". No Início o mesmo achado do Instagram é atribuído à Íris (`byOf`, L8389), na Memória ao Nexo.
- No Início esses itens aparecem em "O Squad percebeu" com "Aceitar" / "Recusar" (L4691; texto "O squad notou e quer confirmar com você antes de guardar:"; contagem "N informação/informações para confirmar"; depois "Na Memória" / "Recusada"; "Tudo revisado"; links "Ver todas na Memória da Marca" / "Ver a Memória da Marca").
  Efeitos: "Aceitar"=`_memConfirm` (toast "Confirmado. Todo o squad passa a usar."); "Recusar"=`_memRemove` (toast "Recusada. A informação não entra na Memória da Marca.").

### A13. Conversa contextual de um conhecimento (`_cx('mem')` L13297, `_m5Reply` L13330)
- Cabeçalho: tipo "Conhecimento", nome `k`, meta "Memória da Marca · <estado em minúsculas>". Sugestões: `off` → "Quero voltar a usar isso.", "De onde veio essa informação?"; demais → "Quero mudar essa preferência.", "Quero ajustar como minha equipe usa isso.", "Não use mais essa informação."
- Primeira fala: “<valor>”: <estado>[ em <cAt>]. <Todo o squad usa | <nomes> usa/usam> <só depois que você confirmar | quando precisa>. "O que você quer ajustar?"
- Intenções: não usar → `_m5Off` ("Pronto: ninguém do squad usa mais “…”…" + "Voltar a usar" / "Ver na Memória da Marca"); voltar a usar; quem usa → "Só a Kaia" / "Kaia e Otto" / "Todo o squad"; de onde veio → "Veio de: <ori|src>[, em <at>]. …"; mudar → alternativas `ALT5` (L12776: m-preco, m-data, m-tom, m-leg) + "Escrever do meu jeito"; escolher alternativa = `_m5Alt` (v novo, ok, "Você mudou pela conversa: <v>").

### A14. Ciclo de aprendizado (Kaia → sugestão, nunca regra; `_m5Price` L13045)
- Gatilho: texto com "preç" na conversa da Kaia (jornada 4, L13753: "Kaia, aumenta o destaque do preço na peça de encomendas do panetone."). Kaia responde "Feito. Na peça de encomendas do panetone, o preço saiu do texto pequeno e foi para o selo no topo." (cartão Antes/Agora) e cria `m-preco` (`PRECO5` L12774, hypo, `by: leaf`, `ags: leaf, pill, arch`, `isNew`), com `q` "Você prefere preços mais visíveis nas peças promocionais?" e `ori` "Ajuste pedido à Kaia · peça de encomendas do panetone". Fala seguinte: "Percebi uma possível preferência sua. Deixei como sugestão na Memória da Marca: as próximas peças só mudam se você confirmar."
- Se `m-preco` já existe: "O preço já está em destaque nessa peça. A preferência continua na Memória da Marca, do jeito que você deixou."

### A15. Inventário de conhecimentos do cenário `uso` (V3 L6150 + V4.5 L12759; `ags` omitido quando "todos")
Formato: id · k · estado · fonte(sk) data · área›assunto.
- Neg: m-neg "Negócio" ok onb 14/09 neg›História · m-val "Proposta de valor" ok onb 14/09 · m-onde "Onde" src site 14/09 neg›Localização · m-prod "Produtos" ok onb neg›Produtos · m-mais "Mais vendidos" **old** plan 01/10 · m-dif "Diferencial" src site neg›Diferenciais · m-hor "Horário" **conf** gp 20/09 neg›Operação · m-can "Canais de venda" ok onb neg›Operação · m-obj "Objetivo atual" dec chat 02/10 neg›Objetivos · m-meta "Meta" ok chat 05/10 neg›Objetivos.
- Marca: m-pos "Posicionamento" dec team 23/09 · m-vis "Identidade visual" ok doc 14/09 · m-natal "Natal 2026" dec chat 06/10 (Identidade visual) · m-tom "Tom de voz" ok onb · m-evit "Evitar" ok chat 18/09 · m-leg "Legendas" ok chat 25/09 (Preferências criativas) · m-data "Peças de oferta" **hypo** chat 11/10 `by` leaf · m-preco **hypo** (sob demanda) · m-emo "Emojis" **rej** chat 02/10 · m-ref "Fotos" learn team 30/09 (Referências).
- Público: m-pub "Público principal" ok onb · m-pub2 "Fim de ano" dec chat 08/10 · m-nec "Necessidade" learn team 09/10 · m-l2 "Dia da semana" **hypo** plan 09/10 `by` square · m-l3 "Dia dos Pais" learn plan 01/10 · m-elog "O que elogiam" learn gp 12/10.
- Conhecimento: m-pq1 "Diagnóstico de setembro" learn team 18/09 (Pesquisas) · m-l1 "Bastidores" learn ig 01/10 (Descobertas) · m-hora "Publicação" learn ig 30/09 (Preferências) · m-d1 "Campanha de Natal" dec chat 05/10 · m-d2 "Conceito" dec chat 08/10 (Decisões) · m-d3 "Anúncios" dec chat 14/09 · m-d4 "Reativação" dec chat 05/10 (Orientações confirmadas).
- Valores e `how` por agente: ver L6150–6174, L12724–12756, L12759–12767.

### A16. Campos de um item de memória (modelo para o banco)
- **Estado base** (`mem.items[]`): `id`, `tab`, `g`, `k` (chave), `v` (valor), `st` (ok|dec|src|learn|hypo|old|rej|conf|off), `src` (texto livre de origem+data, ex. "decisão · 08/10"), `ags[]` (quem usa; 7 = todos), `by` (agente que sugeriu), `isNew`, `isAdd`.
- **Metadados V4.5** (`MX5`/`meta[id]`): `a` (área), `tp` (assunto), `sk` (tipo de fonte), `at` (data da origem), `q` (pergunta da sugestão), `ori` (origem em texto), `how{agente: "quando/para quê usa"}`, `hist[[who,texto,at]]`, `prev` (valor anterior), `cAt` (quando confirmou/corrigiu), `offFrom` (estado antes de "Não usar mais").
- **Decisões do Início** (`memDec[id]`): `{st:'ok'|'rej', ix, snap}`.
- **Log global** (`m5.log[]`): `{who|null, t, at, id|null}`.
- **Fonte** (`src5[]`): `{id, ic, t, h, st, m, n}` (C2).
- Estado de tela da Memória (`m5`): `area, ag, open, q, edit, editVal, add, addVal, addArea, logMore, pendMore, disc, hi`.
- Datas são texto ("14/09", "hoje, 10:42"); `src` mistura origem e data; `ags` é lista de IDs. Nada disso tem timestamp real: o banco precisará de `created_at`, `confirmed_at`, `updated_at`, `source_id`, `suggested_by`.

---
## B. Modo Autônomo

### B1. Estrutura (L5097–5186)
- **Lista**: h1 "Modo Autônomo", "Deixe por conta do squad o que se repete. Você define os limites."; interruptor (B11); botão "Delegar uma responsabilidade" (L5108); faixa "Precisa de você: N"; resumo; "Responsabilidades"; "Encerradas · N"; "O que mais pode ficar com o squad"; "Como a autonomia funciona"; lateral "Próximas execuções" e "Histórico de execuções".
- **Resumo** (L13560, 3 cartões): "Fazendo sozinho" ("N responsabilidade ativa/responsabilidades ativas" | "Nada ativo agora"; sub "N pausada(s) · N com falha · N bloqueada" | "tudo dentro do combinado" | "delegue o que se repete"); "A seguir" (data/hora da próxima + título | "—", "Nada programado"); "Últimos 7 dias" ("N execução/execuções"; sub "N sem concluir, com o motivo registrado" | "todas concluídas").
- **Sem nada**: "Nada delegado ainda." / "Comece pelo que mais se repete na sua semana. O squad conversa com você, mostra o combinado e só ativa depois do seu ok." / botão "Delegar a primeira responsabilidade" (L5122).
- **Linha de responsabilidade**: rostos (responsável 34 px, colaboradores 24), título, `metaL` "<Nome> lidera · com <colab> · <frequência>", chip de estado, ritmo (bolinhas), "<próxima> · <título>" ou "Pausada: nada novo até você retomar", e, se falha/bloqueio, texto de aviso (B5).
- "Encerradas · N": cada item "encerrada · o histórico continua" (L5123).
- **Detalhe** (L5146–5183): migalha "Modo Autônomo / <título>"; cabeçalho com `DAC(lead) lidera · com … · o Nexo coordena · desde …`; botões (B8); faixa de correção; "O combinado"; "Limites da autonomia"; "Orientações da marca utilizadas"; lateral "Próximas execuções", "Demonstração", "Histórico", "Alterações".

### B2. Catálogo de responsabilidades (`TPL`, L6077 + `seo` L12808 + `crm` L12814)
| id | Título (`t`) | Líder › colabora | Periodicidade | Opções (`toks`; padrão = `def`; onde não marcado, a 1ª opção) |
|---|---|---|---|---|
| plan | "Planejar meus conteúdos toda semana" | Otto › Kaia | semanal | day: segunda, **quinta**, sexta; vol: "3 posts e 2 stories" (padrão), "3 posts por semana", "5 posts e 3 stories" |
| posts | "Preparar posts toda segunda-feira" | Kaia › Otto | semanal | day: **segunda**, quinta, sexta; vol: "3 posts" (padrão), "4 posts", "5 posts" |
| res | "Acompanhar meus resultados" | Íris | recorrente | freq: "Toda segunda" (padrão), "Todo dia"; src: "Instagram, site e Google" (padrão), "Instagram e site" |
| opp | "Me avisar quando surgir uma oportunidade" | Bia › Íris | contínua | where: "no bairro e nas datas", "só nas datas comemorativas"; how: "no Início", "no Início e por e-mail" |
| reat | "Reativar clientes que sumiram" | Max › Otto | mensal | freq: "Todo mês", "A cada 15 dias"; days: "60 dias", "90 dias" |
| reviews | "Responder avaliações do Google" | Max | diária | freq: "Todo dia", "Duas vezes por semana" |
| seo | "Monitorar oportunidades de busca local" | Kiwi › Íris | semanal | freq: "Toda segunda", "A cada 15 dias" |
| crm | "Preparar campanhas de relacionamento" | Max › Otto | mensal | freq: "Todo mês", "A cada 15 dias" |
- Cada um tem também: `s` (subtítulo), `seg` (frase do combinado, com palavras trocáveis), `does`, `asks`, `never`, `pubOpt` (só plan "Publicar sozinho o que eu aprovar no plano" e posts "Publicar sozinho o que eu aprovar"), `needs` (só reat: "Precisa do e-mail marketing conectado para enviar. Até lá, o Max só prepara." — V3, sem tela na V4.5).
- Frases do combinado (`seg`): plan "Toda <dia> às 9h, o Otto apresenta o plano da semana seguinte com <vol>. A Kaia cria as artes." + " Nada é publicado sem a sua aprovação." ou " O que você aprovar no plano é publicado sozinho." (L13500, também em posts); posts "Toda <dia> às 8h, a Kaia prepara <vol> para a semana. O Otto escreve as legendas."; res "<freq>, às 9h, a Íris te manda uma leitura de <src>, com a fonte de cada número."; opp "Quando a Bia ou a Íris encontrarem uma oportunidade <where>, você recebe um aviso <how>."; reat "<freq>, o Max separa quem não compra há <days> e o Otto escreve as mensagens."; reviews "<freq>, o Max lê as avaliações novas e escreve respostas no tom da Miolo."; seo "<freq>, às 9h, o Kiwi consulta as buscas do bairro e o Google Perfil e prepara recomendações. A Íris confere os números."; crm "<freq>, o Max separa os públicos com consentimento e o Otto escreve as mensagens. Nada é enviado sem a sua autorização."
- Frequência exibida (`freq5` L12860): com `day` → "Toda <dia>, às 9h"; opp → "Sempre que surgir"; demais → `freq` (+ ", às 9h" em res e seo).
- Entrega (`DLV5` L12859): plan "Plano editorial com <vol>"; posts "Peças da semana (<vol>), com legenda"; opp "Avisos <how>, com a oportunidade explicada"; reviews "Respostas no tom da Miolo, para você aprovar"; res "Leitura curta, com a fonte de cada número"; reat "Lista e mensagens para você aprovar"; seo "Recomendações de busca local"; crm "Segmentos e mensagens para você aprovar".
- Aprovação (`APPR5` L13460): plan "Necessária antes de publicar" | "Do plano; depois, publica sozinho o que você aprovou"; posts "Necessária antes de publicar" | "Das peças; depois, publica sozinho"; res "Não há ação externa"; seo "Autorização específica para anúncios e verba"; crm "Consentimento, integração válida e autorização de envio"; opp "Para transformar em trabalho"; reviews "Cada resposta, antes de publicar"; reat "A lista e cada envio".
- Oferecidas pela tela em "O que mais pode ficar com o squad" (`_d5Templates` L13139): só plan, posts, opp, reviews, e só se ainda não existirem. res, reat, seo e crm só nascem por texto livre ou pela conta.

### B3. Responsabilidades da conta (cenário `uso`; `primeiro` = nenhuma)
| id | tpl | Início | Fonte do estado |
|---|---|---|---|
| r-plan | plan | `Ativa` desde 28/09; cfg `{day:'quinta', vol:'3 posts por semana', auto:false}` | `s.rot` (L6353) |
| r-res | res | `Ativa` desde 01/10; cfg `{freq:'Toda segunda', src:'Instagram, site e Google'}` | `auto.extra` (L6354) |
| r-seo | seo | "Falha na execução" desde 21/09 (vira Ativa após reconectar o Google Perfil) | calculado em `_a5List` (L13061), `base:true` |
| r-crm | crm | "Bloqueada por integração" desde 01/09 (vira Ativa após conectar o e-mail) | calculado em `_a5List` (L13062), `base:true` |
- Responsabilidades base não podem ser pausadas nem encerradas (`canEnd: … && !R.base`, L13601; `_respPause` não as encontra). Viram comuns em `auto.extra` quando `_a5Promote` roda (L13072), junto com `A.seo/crm='moved'`.
- Novas delegações entram com id `r-<tpl>-<base36 timestamp>` e `isNew:true`; plan reaproveita `r-plan` e grava em `s.rot`.

### B4. Campos de uma responsabilidade
- **Gravado**: `id, tpl, st, since ("hoje" ou data), cfg{…opções, auto?}, pub, isNew, base`. Para plan: `rot{st, since, cfg{day,vol,auto}, hist[{time,agent,text,origin}]}`.
- **Estado V4.5 `a5`** (L12936): `seo, crm ('base'|'moved'), gp ('exp'|'ok'), plan ('old'|'new'), runs[], rlog{rid:[[who,texto,at]]}, cfg{rid:…}, endAsk, histMore, x43, approved43, hi`.
- **Normalizado para a tela** (`_a5Norm` L13476): `id, tpl, t, s, lead, co[], ags[], leadN, coL, metaL, st5, stL, stK, stIc, stCls, on, base, cfg, freqL, nextD, nextT, deliver, say, nxa, since, sentence, lv{an,pr,ex,nv}, mem[], runs[], cad[], cadAria`.
- **Fatos do detalhe** (L13594), na ordem: "Responsável" (<Nome> · <papel RL5>), "Colaboração" (lista ou "—"), "Coordenação" ("Nexo"), "Frequência", "Entrega", "Aprovação". O cartão da conversa acrescenta "Primeira execução" (ou "Vale a partir de" → "a próxima execução").
- **Próxima execução** (`nextD`, `nextT`): plan "qui, 15/10, 9h"/"Plano da semana 43" (depois do PL-43: "qui, 22/10, 9h"/"Plano da semana 44"); res "seg, 19/10, 9h"/"Leitura da semana 12 a 18/10" (se "Toda segunda e sexta": "sex, 16/10, 9h"/"Leitura parcial da semana"; "Todo dia": "amanhã, 9h"); seo "seg, 19/10, 9h"/"Buscas da semana" (após reconectar: "hoje, 11h"/"Nova tentativa: buscas da semana"); crm "01/11" ou "26/10"/"Campanha de relacionamento"; demais: `tplFirst`/"Primeiro ciclo". `FIRST` (L6142): segunda "seg, 19/10", quinta "qui, 15/10", sexta "sex, 16/10", "Toda segunda" "seg, 19/10", "Todo dia" "amanhã, 9h", "Todo mês" "01/11", "A cada 15 dias" "26/10", "Duas vezes por semana" "qua, 14/10"; ausente → "a partir de hoje".
- Texto `say` por estado (L13488): ativa "Próxima execução: <data> · <título>. <entrega>."; pausada "Pausada por você: nada novo é preparado ou publicado até você retomar."; falha "A última execução falhou: o acesso ao Google Perfil expirou e precisa ser reconectado."; bloqueada "O e-mail marketing não está conectado: o Max prepara segmentos, mas nada pode ser enviado."; encerrada "Encerrada por você. O histórico continua disponível."; proposta "Aguarda a sua confirmação."

### B5. Estados da responsabilidade (`RST5` L12878; ícones `RIC5` L12879; "sempre ícone e texto, nunca só cor")
| chave | Rótulo | classe | Path do ícone |
|---|---|---|---|
| active | "Ativa" | act | `M…` (elidido) |
| paused | "Pausada" | pause | `M6.4 5.2v5.6 M9.6 5.2v5.6` (duas barras) |
| blocked | "Bloqueada por integração" | block | `M…` (elidido) |
| fail | "Falha na execução" | fail | `M…` (elidido) |
| ended | "Encerrada" | end | `M3.6 8h8.8` (traço horizontal) |
| proposed | "Aguarda sua confirmação" | you | `M…` (elidido); resíduo V3 |
- "Aguarda aprovação" **não** é rótulo de responsabilidade: aparece só como status de etapa no Max (L12629) e na família `STK6`. "Programada", "Não executada" e "Aguarda sua aprovação" são estados de **execução** (B6). O rótulo curto "Falha" não existe; o código usa "Falha na execução" (responsabilidade) e "Falhou" (execução).
- Texto de aviso na lista (L13554): falha "Não foi possível consultar as buscas: o acesso ao Google Perfil expirou."; bloqueada "O e-mail marketing não está conectado. Nada é enviado." Aviso no detalhe (L13602): falha "A consulta de hoje falhou duas vezes (9h e 9h30): o acesso ao Google Perfil expirou. Nada foi apresentado como concluído."; bloqueada "O e-mail marketing não está conectado. O Max pode preparar segmentos, mas nada é enviado sem integração, consentimento e a sua autorização."
- Sem execução quando não ativa (`noUpL` L13598): pausada "Nenhuma execução até você retomar."; encerrada "Encerrada: nada mais é programado."; bloqueada "Nada acontece até a integração ser conectada."; falha "Nada acontece até a conexão voltar."

### B6. Estados e registro de cada execução (`EXST5` L12876, `EX5` L12866)
| chave | Rótulo | classe/ícone (RIC5) |
|---|---|---|
| done | "Concluída" | done · `M4.4 8.3l2.4 2.4 4.8-5` (check) |
| fail | "Falhou" | fail · elidido |
| skip | "Não executada" | skip · elidido |
| appr | "Aguarda sua aprovação" | you · elidido |
| ok | "Aprovada por você" | done · check |
| sched | "Programada" | prog · elidido |
- Campos de uma execução: `id` (PL-42, PL-42.1, RS-42, BL-42, RC-10…), `rid`, `when` (texto), `d` (chave numérica de ordenação, ex. 12.36), `t`, `st`, `m` (mensagem), `go`/`goL` (destino e rótulo), `fix`, `wid` (trabalho gerado), `used[]` e `skipped[]` (ids de memória). A lista ordena por `d` decrescente.
- Dados (L12867–12874): RS-42 "hoje · 09:00" done "Leitura da semana 05 a 11/10" ("Entregue · 34 encomendas pelo site", "Ver a leitura"); BL-42 "hoje · 09:00 e 09:30" **fail** "Consulta das buscas da semana" ("Falhou nas duas tentativas: o acesso ao Google Perfil expirou e precisa ser reconectado."); PL-42.1 "hoje · 09:01" done "“Fornada de segunda” publicado" ("Publicação aprovada por você no plano da semana 42 · o Instagram confirmou", "Ver no calendário"); PL-42 "qui, 08/10 · 09:00" done "Plano da semana 42" ("Aprovado por você na sexta, 17:42"); RS-41 "seg, 05/10 · 09:00" done "Leitura da semana 28/09 a 04/10" ("Entregue · 31 encomendas pelo site", "Ver resultados"); BL-41 "seg, 05/10 · 09:00" done "Buscas da semana" ("“padaria em Pinheiros” cresceu; a Miolo aparece em 3º", "Ver em Growth"); RC-10 "qui, 01/10 · 09:00" **skip** "Campanha mensal de relacionamento" ("Não executada: o e-mail marketing não está conectado. Nada foi preparado para envio."); PL-41 "qui, 01/10 · 09:00" done "Plano da semana 41" ("Aprovado por você com um ajuste").
- Convenção dos ids inferida dos exemplos (o código não a explica): PL=plano, RS=resultados, BL=busca local, RC=relacionamento; sufixo = número da semana (RC-10 = mês).
- Geradas pelo uso: PL-43 (B10) e BL-42b "hoje · 11:00" `sched` "Nova tentativa: buscas da semana" ("Programada depois da reconexão (simulação). O registro da falha continua aqui.").
- Cartão de execução: título, id, "<nome da responsabilidade> · <when>", mensagem, rótulo do estado, link `goL` ("Abrir o trabalho" quando há `wid`), "Orientações da marca utilizadas: N", "confirmada hoje" (para m-preco), "Não usada, porque ainda é sugestão: “…”". Histórico da home: 3 linhas + "Ver todo o histórico (N)" (L13947); vazio "Cada execução fica registrada aqui, com o que foi feito, o que falhou e o trabalho que gerou."
- Ritmo (bolinhas, `CAD5` L12924 + execuções): rótulos "concluída", "falhou", "não executada", "aguarda você", "próxima", "programada", "pausada", "bloqueada" (L13495); futuras: ativa → próxima + programada; pausada → 2× pausada; falha/bloqueada → 2× bloqueada.
- "Próximas execuções" (home, até 5): estado `prog` "programada", `block` "bloqueada", `you` "depende de você"; texto "<hora> · <estado>" (ex. "9h · programada"); bloqueada: "Não acontece até o Google Perfil ser reconectado" / "Bloqueada: o e-mail marketing não está conectado". Pausadas e bloqueadas nunca aparecem como se fossem acontecer (L13526).

### B7. Níveis de autonomia
- `LV5B` (L13461), "Como a autonomia funciona" / "três níveis, cada um com o seu limite": **Analisar** "Pesquisa, acompanha e interpreta informações, só nas contas que você conectou." (Faz sozinho); **Preparar** "Cria rascunhos, planos, peças e relatórios a cada ciclo, sem você pedir de novo." (Faz sozinho · você aprova o que sai); **Executar** "Publicar, enviar mensagens, alterar campanhas e investir só acontecem com a autorização específica de cada ação." (Só com a sua autorização). Rodapé: "Aprovar um conteúdo não autoriza publicar, enviar mensagens, alterar campanhas ou investir. Cada uma dessas ações pede a sua própria autorização." (L5129)
- No detalhe, 4 linhas: "Analisar" ("Faz sozinha"), "Preparar" ("Faz sozinha · você aprova o que sai"), "Executar" ("Só com autorização"; cada item `[ação, exigência, ok|you|no]`), "Nunca" ("Nem com autorização desta rotina"). Sem ação externa: "Nenhuma ação externa nesta responsabilidade."
- `lv5` por modelo (L12822; os demais usam fallback: `pr`=`does`, `ex`=`asks` com "Sua aprovação", `nv`=`never`):
  - plan — Analisar: Ler o desempenho dos posts; Acompanhar datas e o calendário. Preparar: Criar pautas; Escrever legendas; Preparar as peças com a Kaia. Executar: "Publicar no Instagram" (auto: "Autorizado: o que você aprovar no plano" ok; senão "Sua aprovação, publicação por publicação" you); "Alterar campanhas pagas" ("Autorização específica · não concedida" no). Nunca: Investir em anúncios; Responder mensagens de clientes; Mudar preços ou ofertas.
  - res — Analisar: Ler Instagram, site e Google; Comparar com o período anterior; Apontar o que mudou. Preparar: Montar a leitura da semana. Executar: nada. Nunca: Mudar anúncios ou campanhas; Publicar ou enviar qualquer coisa.
  - seo — Analisar: Analisar as buscas do bairro; Acompanhar o Google Perfil; Identificar oportunidades. Preparar: Preparar recomendações. Executar (todas "no"): Ativar anúncios; Alterar orçamento ("Autorização específica · não concedida"); Executar investimentos ("Autorização específica, com teto · não concedida"). Nunca: Mudar o site sem a sua aprovação.
  - crm — Analisar: Ler a base de clientes; Ver quem não compra há 60 dias. Preparar: Criar segmentos; Preparar mensagens com o Otto. Executar: "Enviar mensagens" ("Consentimento dos contatos, integração válida e a sua autorização de envio" no). Nunca: Enviar para quem não deu consentimento; Oferecer descontos sem você.
  - posts: Preparar: Criar as peças com a marca; Escrever as legendas. Executar: As peças de cada semana; Cada publicação no Instagram (Sua aprovação). Nunca: Investir em anúncios; Usar fotos sem licença; Mudar preços ou ofertas.
  - opp: Preparar: Acompanhar datas e o bairro; Ler perfis públicos de concorrentes; Cruzar com os seus resultados. Executar: Transformar a oportunidade em trabalho. Nunca: Começar um trabalho sem você; Investir qualquer verba.
  - reviews: Preparar: Ler as avaliações novas; Escrever as respostas. Executar: Cada resposta, antes de publicar. Nunca: Responder sem a sua aprovação; Oferecer descontos ou brindes.
  - reat: Preparar: Separar os clientes inativos; Escrever as mensagens no tom da Miolo. Executar: A lista de cada envio; Cada envio. Nunca: Enviar para quem não deu consentimento; Oferecer descontos.
- "Publicar sozinho" é uma opção por responsabilidade (`cfg.auto`/`pub`), feita na conversa (B9), só para plan e posts. Isso não autoriza anúncios, mensagens nem investimento (L13216).

### B8. Ações (detalhe L5150–5157 e lista)
| Rótulo | Quando aparece | Efeito |
|---|---|---|
| "Conversar sobre ela" | sempre | abre conversa contextual (`_openCtx('resp', id)`) com o responsável |
| "Editar" | estado ≠ ended | `_d5Edit`: abre a conversa e pergunta "O que você quer ajustar?" (B9); não há formulário |
| "Pausar" | ativa | `_a5Pause(id,false)`: `st`→paused; log "Você pausou a responsabilidade"; toast "Pausada. Nada novo é preparado." (plan: "Pausada. Nada novo é preparado ou publicado.") |
| "Retomar" | pausada | `st`→active; log "Você retomou a responsabilidade"; toast "Retomada: <título em minúsculas>" (plan: "Retomada. O Otto volta na quinta.") |
| "Encerrar" (link) | não encerrada e não base | abre alerta "Encerrar esta responsabilidade?" — "Nada novo será preparado e o histórico continua aqui. Para só interromper por um tempo, use Pausar." — botões "Encerrar" / "Cancelar" |
| "Encerrar" (no alerta) | — | `_a5EndGo`: `st`→ended (some de `_resps`, entra em "Encerradas · N"); log "Você encerrou a responsabilidade. Nada novo é preparado; o histórico fica guardado."; toast "Encerrada. O histórico continua no Modo Autônomo." |
| "Delegar de novo" | encerrada | `_d5Start(tpl)` |
| "Reconectar conta (simulação)" / "Conectar o e-mail (simulação)" | falha / bloqueada | C3 |
| "Simular a execução de quinta" → "Ver a execução PL-43" | só plan, ativa, `uso` | B10 |
| "Abrir a Memória" | sempre | vai à Memória |
- Pela conversa de uma responsabilidade (`_a5Reply` L13355), por intenção: encerrar ("Encerrar para de vez: nada novo é preparado e o histórico continua guardado. Pausar, ao contrário, só interrompe até você retomar. O que você prefere?" → "Encerrar" / "Só pausar" / "Manter como está"); pausar; retomar; mudar dia ("Quero receber esse relatório também na sexta-feira." → res vira "Toda segunda e sexta"; plan aceita segunda/quinta/sexta) com "Dá para fazer. Confira como fica antes de eu mudar:"; "O que acontece na próxima execução?"; limites ("Analisar: … Preparar: … Executar só com autorização: … Nunca: …"); "O que falta para voltar a rodar?" (falha: "Falta reconectar o Google Perfil. O acesso expirou hoje às 9h e as duas tentativas falharam." + "Reconectar conta (simulação)"; bloqueada: "Falta conectar o e-mail marketing. Sem ele, eu preparo segmentos, mas nada é enviado." + "Conectar o e-mail (simulação)").
- Sugestões da conversa (L13314): ativa "Pause essa responsabilidade.", "Quero receber o plano na sexta." (res: "Quero receber esse relatório também na sexta-feira."), "O que acontece na próxima execução?"; pausada "Retome essa responsabilidade.", "O que ela pode fazer sozinha?"; outras "O que falta para voltar a rodar?", "O que ela pode fazer sozinha?"
- Início (V3): cada rotina tem interruptor próprio (dica "Pausar esta rotina" / "Reativar esta rotina", L8441); linha "Aguarda a sua confirmação" + "Revisar" (proposed, hoje inalcançável); "Configurar uma rotina" quando vazio; "Ver Modo Autônomo".

### B9. Delegação pela conversa com o Nexo (`_d5*`, L13138–13270; `Q5` L12842)
Pontos de entrada: "Delegar uma responsabilidade"; "Delegar a primeira responsabilidade"; cartões em "O que mais pode ficar com o squad" (aria "Delegar: <título>"); guia jornada 3 "3 · Modo Autônomo — Delegue o planejamento semanal numa conversa, com limites claros." + "Começar" (preenche o campo do Nexo com "Quero que vocês planejem meus conteúdos toda semana."); Início "Configurar uma rotina"; texto livre ao Nexo (`_j3Start`→plan).
Fluxo (`d5.step`: pick → q → sum → done):
1. Abre/usa a conversa "Nova responsabilidade" (id `x-d5-<n>`). Sem modelo, Nexo: "O que você quer deixar por conta do squad? Pode escrever do seu jeito, como “quero que vocês planejem meus conteúdos toda semana”." + botões (`SHORT5` L12923): "Planejar conteúdos toda semana", "Preparar posts toda segunda", "Avisar sobre oportunidades", "Responder avaliações do Google" (só os que ainda não existem).
2. Texto livre → `_d5Kind` (L13165): result/número/relat/leitura/acompanh→res; oportun/avis→opp; reativ/sumir/inativ→reat; avalia/respond→reviews; busca/seo/google→seo; relacionamento/crm/e-mail→crm; peças/posts toda segunda/preparar posts→posts; planej/conteúd/plano/posts/instagram→plan. Sem acerto: "Entendi. Neste protótipo eu sei delegar planejamento de conteúdos, peças da semana, avisos de oportunidade e respostas a avaliações. Qual chega mais perto?"
3. Já existe (não encerrada)? Nexo: "<O Otto> já cuida disso: “<título>”, <frequência>, (<estado>). Para não ter duas rotinas iguais, eu ajusto a que existe." + "Ajustar a rotina atual" / "Ver no Modo Autônomo".
4. Novo: Nexo "Isso fica com o Otto, com a Kaia quando houver produção visual. Eu coordeno e te chamo quando algo depender de você." (colaborador: Kaia→"produção visual", Otto→"texto", outros→"números"); o responsável (e colaboradores) entra na conversa e faz as perguntas.
5. Perguntas, uma por vez, como botões; a opção de `day` aparece como "Toda <dia>":
| tpl | Ordem · chave · pergunta · opções |
|---|---|
| plan | 1 obj "Qual é o foco desses conteúdos?" [Trazer encomendas pelo site; Mostrar o processo da padaria; Manter o Instagram ativo] · 2 day "Em que dia você quer receber o plano da semana seguinte?" [segunda; quinta; sexta] · 3 vol "O que entra em cada plano?" [3 posts por semana; 3 posts e 2 stories; 5 posts e 3 stories] |
| posts | obj "Qual é o foco dessas peças?" [mesmas 3] · day "Em que dia você quer receber as peças?" [segunda; quinta; sexta] · vol "Quantas peças por semana?" [3 posts; 4 posts; 5 posts] |
| opp | obj "Que tipo de oportunidade importa mais agora?" [Datas comemorativas; Movimento do bairro; O que os concorrentes fazem] · where "Onde a Bia e a Íris devem procurar?" [no bairro e nas datas; só nas datas comemorativas] · how "Como você quer ser avisada?" [no Início; no Início e por e-mail] |
| reviews | obj "O que é mais importante nas respostas?" [Responder rápido; Manter o tom da Miolo; Resolver reclamações] · freq "Com que frequência o Max deve olhar as avaliações?" [Todo dia; Duas vezes por semana] |
| res | freq "Quando você quer receber a leitura?" [Toda segunda; Toda segunda e sexta; Todo dia] |
| reat | freq "Com que frequência o Max separa os clientes inativos?" [Todo mês; A cada 15 dias] · days "A partir de quantos dias sem comprar?" [60 dias; 90 dias] |
| seo | freq "Com que frequência o Kiwi consulta as buscas?" [Toda segunda; A cada 15 dias] |
| crm | freq "Com que frequência o Max prepara uma campanha?" [Todo mês; A cada 15 dias] |
   - A resposta `obj` fica em `cfg.obj`, mas nenhuma tela do protótipo a exibe. Resposta digitada que contenha o texto de uma opção também vale (L13407).
6. Resumo: Nexo "Antes de ativar, confira o combinado:" (edição: "Confira como fica o combinado. Vale a partir da próxima execução:") + cartão (kicker "Responsabilidade" ou "Mudança no combinado"; linhas Responsável, Colaboração, Coordenação, Frequência, Entrega, Aprovação, Primeira execução/Vale a partir de; "Faz sozinho" = 3 primeiros itens de Preparar; "Só com a sua autorização" = Executar com exigência; "Nunca" = 2 primeiros). Botões "Confirmar a delegação" (ou "Confirmar a mudança") e "Ajustar".
7. "Ajustar": Nexo "O que você quer ajustar?" com "O objetivo" (obj), "A frequência" (day/freq), "O que é entregue" (demais), e "As aprovações" (só se há `pubOpt`). "As aprovações": "Hoje cada publicação pede a sua aprovação. Se você liberar, o Otto publica sozinho o que você aprovar no plano. Isso não autoriza anúncios, envio de mensagens nem investimento." + "Aprovar cada publicação" / "Publicar sozinho o que eu aprovar no plano". Depois de cada ajuste volta ao resumo.
8. Confirmar (`_d5Confirm` L13223): grava (plan em `rot`, outros em `auto.extra` com `st:'active'`, `since:'hoje'`, `pub=cfg.auto`); nota "Você confirmou a delegação · HH:MM" (edição: "Você confirmou a mudança · HH:MM"); log "Você delegou: <título em minúsculas>"; Nexo "Delegado. Está no Modo Autônomo como responsabilidade ativa. Primeira execução: <data>. Nada sai da Miolo sem a sua aprovação." + "Ver no Modo Autônomo"; edição: "Atualizado. Vale a partir da próxima execução, e o histórico continua o mesmo."; toasts "Responsabilidade ativa · primeira execução <data>" / "Combinado atualizado"; cartão passa a "Delegado · ativo no Modo Autônomo" / "Mudança confirmada por você"; destaque `hi` por 5,2 s.
9. Edição de existente: log "Você mudou o combinado: <frequência em minúsculas>" (`_a5Apply`, L13246); histórico e id continuam.

### B10. Execução simulada PL-43 e regra das orientações confirmadas
- `PLANMEM5` (L12922) = m-tom, m-evit, m-leg, m-vis, m-preco, m-data: "as orientações que o planejamento semanal consulta (só entra o que está confirmado)". `MEMOF5` (L13459) por modelo: plan/posts = PLANMEM5; res = m-meta, m-obj, m-mais; seo = m-onde, m-prod, m-dif, m-d3; crm = m-d4, m-tom, m-pub; opp = m-obj, m-pub2, m-l3; reviews = m-tom, m-evit; reat = m-d4, m-tom.
- Regra: na tela só contam como "usadas" as `ok` e `dec` ("N orientação confirmada / orientações confirmadas"); as `hypo` aparecem em "Ainda não entra, porque é sugestão:" (links); `src`, `learn`, `old`, `conf`, `off`, `rej` não entram em nenhuma das duas listas (L13585). Rodapé: "Só entra o que está confirmado na Memória da Marca." (L5169). Distintivo "confirmada hoje" em m-preco.
- "Simular a execução de quinta" (`_a5Sim` L13108; texto "Demonstração: roda o ciclo de qui, 15/10 com o que está confirmado na memória agora."): cria o trabalho `w-a5-43` "Plano da semana 43" (Otto + Kaia; status "Aguarda a sua aprovação"; "Três posts para 19 a 25/10: encomendas de panetone na segunda, bastidores na quarta e pão de abóbora na sexta." + frase do preço: com m-preco confirmado "O preço do panetone aparece em destaque, como você confirmou na Memória da Marca."; sem: "O preço do panetone fica no texto: a preferência por preços visíveis ainda não foi confirmada."), o registro PL-43 (`appr`, "Entregue: 3 posts para 19 a 25/10 · aguarda a sua aprovação", `used[]`, `skipped[]`), log "Execução PL-43 simulada: plano da semana 43 entregue", fala do Otto "Plano da semana 43 pronto, no ciclo de quinta. Usei as orientações confirmadas da Memória da Marca. Nada é publicado antes da sua aprovação." e toast "PL-43 · plano da semana 43 entregue (simulação)". Com os dados iniciais: usadas m-tom, m-evit, m-leg, m-vis; não usada (sugestão) m-data.
- "Aprovar o plano" (`_a5Approve43`): PL-43 → `ok` "Aprovado por você hoje, HH:MM. Cada publicação continua pedindo a sua aprovação."; toast "Plano da semana 43 aprovado. Nada é publicado sem a sua aprovação de cada post."; o próximo ciclo vira semana 44 (22/10).

### B11. Interruptor global (L13568; `_autoAll` L6988)
- **Existe** na V4.5, no cabeçalho da página (ao lado de "Delegar uma responsabilidade"); `role="switch"`, `aria-checked`. Rótulo **"Ligado"** quando há ao menos uma responsabilidade ativa, **"Pausado"** caso contrário. aria: "Pausar o Modo Autônomo" / "Retomar o Modo Autônomo". Não existe rótulo "Desligado".
- Só aparece se houver responsabilidade ativa ou pausada (`anyR`, L13565).
- Efeito (`_autoAll(on)`): `rot.st` e todas as `auto.extra[].st` viram active/paused de uma vez (o plan só se estiver ativo ou pausado). Toast: "Modo Autônomo retomado" / "Modo Autônomo pausado. Nada novo é preparado ou publicado." Não grava no log da responsabilidade (`_a5Log` não é chamado).
- Quirk: `extra.map` sobrescreve também as encerradas (`ended` vira active/paused) e não alcança as base (r-seo, r-crm). Decisão de produto: encerrada não deveria voltar.
- "Ligado:/Desligado:" da V3 (L9322, "Ligado: o que você aprovar é publicado nos horários combinados. Qualquer mudança volta para você." / "Desligado: mesmo aprovado, cada publicação pede a sua autorização.") era a opção por rotina "Publicar sozinho". Na V4.5 ela virou `cfg.auto`, escolhida na conversa ("Aprovar cada publicação" / "Publicar sozinho o que eu aprovar no plano").

---
## C. Conexões e integrações

### C1. Estados de conexão (`SRCST5`, L12804; rótulo + classe)
| chave | Rótulo | classe | O que a tela diz (campo `m`) |
|---|---|---|---|
| decl | "Declarado por você" | decl | Onboarding: "Cadastro de 14/09 e correções nas conversas"; Conversas: "Só vira orientação depois do seu ok" |
| ok | "Conectada" | ok | Site "Lido em 14/09 · o Nexo relê em 14/10"; Instagram "Conectado em 14/09 · dados de exemplo"; Google Perfil reconectado "Reconectado hoje (simulação)"; planilha nova "Planilha de outubro enviada hoje (simulação)"; Documentos "Enviados por você entre 14/09 e 01/10"; E-mail "Usado pelo Max para a reativação" |
| old | "Desatualizada" | old | Planilha: "Cobre até 30/09: outubro ainda não entrou" |
| exp | "Precisa reconectar" | exp | Google Perfil: "O acesso expirou hoje, 9h: precisa ser reconectado" |
| off | "Não conectada" | off | E-mail: "Necessário para o Max enviar mensagens"; `primeiro`: Site "O Nexo lê as páginas quando você informar o endereço"; Instagram "Para ler os posts e acompanhar os números"; Google Perfil "Avaliações, horários e buscas"; Documentos "Guia da marca, cardápio, fotos" |
| na | "Indisponível" | off | WhatsApp Business: "Ainda não disponível neste protótipo" |
- Sem ícone próprio: cada linha mostra um ponto (`<i>`) com a cor da classe + o rótulo (L5287). A palavra "expirado/expirou" aparece só no texto `m`.

### C2. Fontes (`src5`, L12783; campos `{id, ic, t, h, st, m, n}`)
- `uso`: onb "Onboarding e o que você contou" (h "declarado por você", decl); chat "Conversas e aprovações" (h "aprendizados do squad", decl); site "Site" (h "miolo.com.br", ok); ig "Instagram" (h "@miolo.padaria", ok); gp "Google Perfil" (h "Miolo · Pinheiros", exp→ok); plan "Planilha de encomendas" (h "encomendas-setembro.csv", old→ok); docs "Documentos" (h "Guia da marca, cardápio, logo, 18 fotos", ok); mail "E-mail marketing" (h "não conectado" | "conectado (simulação)", off→ok); wa "WhatsApp Business" (h "indisponível", na).
- `primeiro`: onb "Cadastro" (h "contado por você", decl, m "Nome, segmento e cidade"); site (h "ainda não lido", off); ig (h "não conectado", off); gp (h "não conectado", off); docs (h "nenhum enviado", off). A lista `primeiro` **não** reage a `onb`: ler o site ou conectar o Instagram no Início não muda estas linhas (só o contador `n` muda).
- `n` (L13652): itens não descartados cujo `sk` pertence à fonte (onb←onb+you; chat←chat+team; docs←doc; mail e wa = 0) → "N conhecimento/conhecimentos".
- Ação por linha (L13653): gp `exp` → "Reconectar (simulação)"; plan `old` → "Enviar planilha nova (simulação)"; mail `off` → "Conectar (simulação)". Outras linhas não têm ação (inclusive Site e Instagram desconectados). Rodapé: "Dados ilustrativos. Neste protótipo nenhuma conta é sincronizada de verdade: conectar e reconectar são simulações." (L5288)

### C3. Reconexão e conexão (simuladas)
- `_a5Reconnect` (L13079), de 4 lugares ("Reconectar (simulação)" na faixa e na fonte; "Reconectar conta (simulação)" no detalhe e na conversa): `a5.gp='ok'`; cria execução BL-42b (B6); promove r-seo (Ativa, desde 21/09); logs "Você reconectou o Google Perfil (simulação)" (responsabilidade e Memória, sem id); toast "Google Perfil reconectado · simulação. Nova tentativa às 11h."; a faixa e o aviso do Growth ("A consulta das buscas falhou hoje: o acesso expirou", L13799) somem.
- `_a5ConnectMail` (L13088): `crm.email=true`; promove r-crm (Ativa, desde 01/09); log "Você conectou o e-mail marketing (simulação)"; toast "E-mail marketing conectado · simulação. Nada é enviado sem a sua autorização." Não cria execução (RC-10 continua "Não executada"). Conectar pelo Max ("Simular a conexão") faz `crm.email=true` sem promover; r-crm fica ativa mas `base` (sem pausar/encerrar).
- Faixa "Precisa de você" do Modo Autônomo: só a falha do Google Perfil entra ("Google Perfil", "Monitorar busca local · a consulta de hoje falhou duas vezes", "Reconectar (simulação)", tipo "Para você reconectar", L13522). A bloqueada por e-mail **não** gera item na faixa.
- Rótulos de tipo (`NDK5`, L13765): "Para você revisar / aprovar / autorizar / decidir / confirmar / responder / reconectar" e "Em seguida".

### C4. Bloqueio de rotina por integração
- Falha por acesso expirado (r-seo): chip "Falha na execução"; execução "Falhou" (2 tentativas, 9h e 9h30); nada é marcado como concluído; próximas execuções mostram "bloqueada"; volta a "Ativa" ao reconectar.
- Bloqueio por integração ausente (r-crm): chip "Bloqueada por integração"; execução RC-10 "Não executada"; o Max só prepara segmentos; enviar exige "integração, consentimento e a sua autorização" (`lv5.crm`). Antes de conectar, "A seguir" mostra "Bloqueada: o e-mail marketing não está conectado".
- Nos modelos novos: reat declara `needs` ("Precisa do e-mail marketing conectado para enviar. Até lá, o Max só prepara.") mas a V4.5 não o exibe.
- Max, cartão de envio (L12520–12522, template L5557): lista de verificação "Mensagens aprovadas" ("por você, hoje"), "Público com consentimento" ("23 de 138 inativos"), "Canal de envio" ("e-mail conectado (simulação)" | "e-mail não conectado"), "Sua autorização de envio" ("pendente" | "autorizado para seg, 19/10, 9h"); botões "Conectar o e-mail (simulação)", "Autorizar envio para seg, 19/10, 9h"; textos "Sem canal conectado, não há envio." e "Programada · simulação, nada é enviado". Banner da jornada aprovada: "Mensagens aprovadas · não está ativa" / "Para enviar, falta conectar o e-mail e a sua autorização de envio." (L12638). Faixa: "Mensagens aprovadas · falta conectar o e-mail para poder autorizar" (L13805).

### C5. Envio de planilha
- Memória: linha "Planilha de encomendas" `old` → "Enviar planilha nova (simulação)"; cartão de desatualizado (A7). Vira "Conectada" com "Planilha de outubro enviada hoje (simulação)". A planilha é arquivo, não conexão contínua: V3 `perms` "Arquivo, sem acesso contínuo".
- Max, importação (`mx-imp`, L12322): "Para começar, anexe a planilha pelo clipe ao lado do campo. Eu procuro nome, e-mail, telefone, data da última compra e se a pessoa aceitou receber mensagens. Quem não aceitou entra na base, mas não recebe nada." Opções: "Usar a planilha de exemplo" (→ "Importei a planilha de exemplo: 412 clientes e 27 leads, todos marcados como dados de exemplo. 123 aceitaram receber mensagens."; toast "Planilha de exemplo importada") e "Conectar a plataforma da loja" ("Essa integração ainda está pendente: neste protótipo não conecto. Quando estiver disponível, os pedidos entram sozinhos na base."). Fontes do Max (L12649): "Planilha de encomendas" ("dados de exemplo · importada hoje" | "importada em 01/10 · dados ilustrativos"), "E-mail" ("conectado · simulação" | "não conectado", botão "Conectar"), "WhatsApp" ("canal indisponível", botão "Saber mais").
- Resultados vazio (L5372): "A Íris ainda não tem números para ler" / "Conecte o Instagram ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real." / botão "Ver conexões" (vai à Memória com a aba V3 "Conexões"; na V4.5 não abre "Conexões e fontes"). Com Instagram conectado: "A Íris começou a acompanhar o Instagram hoje".
- V3 (sem tela na V4.5): lacuna "O que vende mais" → "Enviar planilha" (toast "Envio de planilha · demonstrativo").

### C6. Conexões da V3 (`connItems` L6196; vestígio)
`{id, ic, t, h, on, s, perms[[rótulo, exigeAutorização]]}`: c-site "Site" (miolo.com.br; perms "Ler páginas"); c-ig "Instagram" (@miolo.padaria; "Ler posts e métricas"; "Publicar só com sua autorização" ★); c-gp "Google Perfil" (Miolo · Pinheiros; "Ler avaliações e buscas"; "Responder: só com aprovação" ★); c-plan "Planilha de encomendas" (encomendas-setembro.csv; "Arquivo, sem acesso contínuo"); c-wa "WhatsApp Business" ("Para mensagens a clientes com consentimento."); c-mail "E-mail marketing" ("Necessário para a reativação de clientes."). Tags "conectado" / "arquivo" / "não conectado"; botões "Gerenciar" / "Conectar" (toasts "Configurações de <t> · demonstrativo" / "Conectar <t> · demonstrativo"). As permissões por conexão não aparecem na V4.5; no Início resta "Conectar não autoriza publicar." (L4652).

### C7. Campos de uma conexão/fonte
`id, tipo (site|ig|gp|plan|docs|mail|wa|onb|chat), título, identificador (h: URL, @perfil, nome do arquivo), estado (decl|ok|old|exp|off|na), mensagem de estado, nº de conhecimentos que originou, data da última leitura/conexão (hoje só em texto), permissões (V3), ação disponível`.

---
## D. Lacunas e inconsistências do protótipo
- Paths dos ícones `act`, `block`, `fail`, `you`, `skip`, `prog` (RIC5), `src`, `obs` (KIC5) vêm elididos ("M…") nos extratos; só os traços curtos estão acima.
- Não aparece no protótipo: política de expiração real de acesso, periodicidade de releitura além de "o Nexo relê uma vez por mês", tela de permissões por fonte na V4.5, regra de retenção do histórico, prazo para um conhecimento ficar `old`, quem decide a precedência entre fontes (só `CONF5` para o horário), fluxo para conectar Site/Instagram/Google Perfil a partir de "Conexões e fontes", importação real de planilha/arquivo, motivo de "Descartado" além do texto.
- Inconsistências a decidir no backend: (1) "Recusar" no Início apaga o item e "Descartar" na Memória o mantém como `rej`; (2) o interruptor global reativa responsabilidades encerradas; (3) `src5` no `primeiro` ignora a leitura do site e a conexão do Instagram feitas no Início; (4) a contagem do filtro por especialista exclui sugestões/conflitos que a lista ainda mostra; (5) `conns` (V3) ficou sem leitor; (6) `cfg.obj` é perguntado e nunca exibido; (7) conectar o e-mail pelo Max deixa r-crm ativa porém "base" (sem pausar/encerrar); (8) `seoRan` é lido (L13484) e nunca definido; (9) kick das sugestões do site sai como "Nexo percebeu · história" por falta de `MX5`; (10) estado `proposed` e `Aguarda você` (V3) ainda existem em `RST5`/Início, sem produtor.
