# A1f — Relatório (Aranha)

**Fatia:** A1f, fidelidade visual à Product UI V4.6 (Fase 1). **Data:** 16/10/2026, 08:27 → 09:15 (48 min).
**Regra que guiou a fatia:** nada do que foi combinado muda (regra do dono, 16/10). O combinado é o protótipo do Diogo, tela por tela. Onde não deu para reproduzir igual, a diferença está na §3 com a pergunta; não "melhorei" nada por conta própria.
Não toquei em `apps/backend`, `supabase/`, `squad/`. Não rodei `make e2e` nem `make seed`. Única escrita no banco: **uma** mensagem na conversa da Miolo com o Otto (§2.5).

## 1. O que foi feito

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Catálogo pt-BR** (ADR-0010) | `next-intl` **4.3.12** (3 dependências; a 4.5+ traz `@swc/core` e `@parcel/watcher` com script de instalação, que o pnpm bloqueia). Sem rota por idioma por enquanto: `i18n/request.ts` devolve pt-BR; `i18n/config.ts` declara `pt-BR`, `en`, `es`; `i18n/catalogs.ts` só carrega pt-BR (en e es caem no padrão até a tradução chegar). Catálogo em `apps/web/messages/pt-BR/<área>.json` (10 áreas), **chaves tipadas** (`global.d.ts` + `AppConfig`: chave inexistente não compila). `lang` vem do idioma ativo (pt-BR) e o `hreflang` continua pt-BR. Todo texto da casca, Início, conversa, Otto e entrega nasceu no catálogo; as telas públicas e de auth foram migradas por um sub-agente meu (site 27 chaves, auth 50, onboarding 20, system 6), sem mudar palavra. `/` continua estática (`○`). | `a5e99db`, `e556a60`, `4c75651`, `c7ca54d` |
| 2 | **Barra lateral idêntica à V4.6** | CSS do protótipo portado **por script, inteiro e na mesma ordem** (`packages/ui/scripts/extract-product-ui-css.ts` → `src/generated/product-ui.css`, 396 KB; e o `bundle.css` do DS → `ds-bundle.css`), só com as fontes locais no lugar do Google Fonts; teste de defasagem. Componente com o mesmo DOM e as mesmas classes do template (`sb`, `sb-ni`, `has-who`, `sb-who-av`, `sb-nb`, `sb-sw is-nav`, `sb-me`…). **Divergências da A0 desfeitas:** agente mini (16 px, com expressão) no hover e no item ativo, no lugar da bolinha; conta da pessoa no pé da barra (menu Conta, negócio e configurações, com Sair real); interruptor do Modo Autônomo (o Coordenador dormindo); nome do agente nas cores da V4.6 (`#8A8799`, hover/ativo `#5F5C73`); badge de pendências em Projetos (dado real: 1). Recolher/expandir com 256/72 px, recolhida por padrão abaixo de 1100 px, lembrada por cookie. Também corrigi a extração da A0: o ícone do Growth é a curva que a V4.2 reatribui (`IC.nav.media = …`), não o megafone. | `105a228`, `a984ecd`, `0d7f639` |
| 3 | **Início = Home V3** | Mesmo DOM do template (`hm-hero`, `hm-box`, `hm-tray`, `hm-band`, `hm-fold`, `hm-grid`). **O palco dos sete é o do protótipo**: o SVG e o motor (`SQ_*` e os métodos `_sq*`: entrada, olhar que segue o cursor, piscadas, reações, queda ao recolher, `prefers-reduced-motion`) foram extraídos por script para `packages/ui/src/generated/squad-stage.ts`, sem reescrever. "Hello, Marina." e "Com o que vamos trabalhar hoje?". Quem participa: Squad ou especialistas, teclado por setas. Sugestões em faixa contínua (para no cursor e no foco; parada com movimento reduzido). Topo **medido** como o `_homeLayout()` (a composição fica centrada). Resumos com dado real: Trabalhos "Nada em andamento · 1 aguarda você" (a 04.01 do seed, com o Otto de olhos grandes e "Revisar" levando à entrega); O Squad percebeu e Modo Autônomo com o estado vazio da própria V4.6; cartão da esquerda = o do primeiro acesso da V4.6 (sem dados de Resultados no seed). Pedido enviado vai para a Sala do Squad (squad) ou para a conversa direta (um especialista) pelo `POST`, e abre o painel. | `a984ecd`, `0d7f639`, `96b9a62` |
| 4 | **Painel de conversa universal** | `ConversationPanel` na casca (persiste entre ambientes): 380 px a partir de 1360, 364 abaixo, **por cima** a 1280 nos pilotos (medidas do `renderVals()`); cabeçalho com "Conversando sobre [objeto ↗]"; mensagens de pessoa (bolha Tinta) e de agente (agente 32 px, nome, área, hora mono); separador Hoje/Ontem/data; "Pergunte ao Otto" (sugestões da V4.6); campo do DS ligado a `POST /conversations/{id}/messages` (Server Action; primeira mensagem a um especialista sem conversa cria a conversa direta); Esc fecha e devolve o foco a quem abriu; expandir → conversa dedicada; **Sala do Squad** é a mesma conversa, dedicada, na rota `/sala-do-squad`. Histórico real pelo `GET` (só leitura). | `0d7f639`, `2d41376`, `1987773` |
| 5 | **Otto/Conteúdo, quatro camadas** | Identidade (`v4-id`, "O que pedir ao Otto", "Conversar com Otto"); visão protagonista (calendário editorial: Semana/Mês/Lista, navegação de semana, "12 a 18 out · esta semana") com o **estado vazio da própria V4.6** ("O Otto ainda não tem um calendário…"); componentes inteligentes (Próximas publicações, Desempenho orgânico, **"Otto percebeu" com contorno na cor do agente**), todos com o vazio da V4.6; conversa contextual (painel). **Faixa "Precisa de você"** com a revisão do seed (Otto · Para você revisar · título real · ação), abrindo a **entrega pontual**: etapas (Preparação, Sua aprovação, Publicação, Confirmação), a legenda real do seed à vista, versões, decisão "Otto aguarda você" com **Aprovar v1** e **Pedir ajuste** ligados a `POST /approvals/{id}/decision` (`approved` / `changes_requested` + abre a conversa ao lado), abas Legenda/Briefing/Histórico. Os outros seis ambientes ganharam a camada de identidade, a faixa e um vazio honesto (fora do escopo desta fatia). | `2d41376`, `730e1c0` |
| 6 | **Comparação lado a lado** | `docs/parciais/a1f/`: `proto-*.png` (protótipo servido na 8010) × `nosso-*.png` (web na 3100, Marina, dados do seed), mesmo tamanho (1440×900; e 1280×800 para a sobreposição), e `lado-a-lado-*.png` (9 pares). Tabela na §3. | `ac0038c` … `730e1c0` |
| 7 | Testes e docs | Vitest no web (28 testes, API mockada), testes de defasagem do CSS, do bundle e do palco no `@hellosquad/ui`; e2e da A0 atualizado para a casca nova (não rodado, §4); `packages/ui/README.md`; este relatório e o progresso. | `60740d8`, `96b9a62`, `730e1c0` |

## 2. Como foi verificado

### 2.1 `make test-web` (09:11, exit 0)

```text
pnpm --filter web lint            → eslint, 0 problemas
pnpm -r --if-present typecheck    → contracts, ui, web: Done
packages/contracts test:  Tests  9 passed (9)
packages/ui test:         Test Files  5 passed (5)   Tests  49 passed (49)
apps/web test:            Test Files  6 passed (6)   Tests  28 passed (28)
```

Rodada final, depois do último ajuste de texto (09:16): `make test-web` exit 0 de novo (contracts 9, ui 49, web 28) e `pnpm --filter web build` exit 0 (`/` estática).

### 2.2 `pnpm --filter web build` (09:12, exit 0)

```text
✓ Compiled successfully in 5.4s
┌ ○ /                                              3.14 kB         109 kB
├ ƒ /app/[workspace]                               17.1 kB         147 kB
├ ƒ /app/[workspace]/squad/[agente]                2.73 kB         132 kB
├ ƒ /app/[workspace]/squad/[agente]/trabalho/[id]  2.05 kB         129 kB
… (16 rotas)
```

`/` segue estática. `/criar-conta` e `/sair` já eram dinâmicas por causa do nonce da CSP (A0b), não desta fatia.

### 2.3 O que os testes provam

| Arquivo | Prova |
|---|---|
| `apps/web/test/Sidebar.test.tsx` (7) | três grupos e os 12 destinos na ordem; **agente mini (`svg.hs-mini`) em cada ambiente, nenhuma bolinha**; `aria-current` no ativo; badge "1" em Projetos ("Projetos, com Nexo, 1 aguarda você"); Modo Autônomo com o interruptor (`.sb-sw.is-nav .hs-k-sleep`) e sem ícone; **conta no `.sb-foot`**, menu com "Adicionar um negócio" e "Sair", Esc fecha e devolve o foco; recolher. |
| `apps/web/test/ConversationPanel.test.tsx` (5) | 380 px; "Conversando sobre" com link para o ambiente; histórico do `GET` com separador "Ontem"; "Pergunte ao Otto"; envio chama o `POST` com o texto e mostra a mensagem; **Esc fecha e devolve o foco**; expandir → `full`; fechado não ocupa largura e fica `aria-hidden`. |
| `apps/web/test/Approval.test.tsx` (5) | faixa "Precisa de você: 1" com quem pede, tipo, título e ação; sem pendência, sem faixa; **Aprovar → `decision("ap-1", "approved")`** e "Aprovar não publica"; **Pedir ajuste → `changes_requested` e abre a conversa sobre o trabalho**; erro da API em português sem perder a revisão. |
| `apps/web/test/HomeView.test.tsx` (4) | saudação, pergunta, sete participantes, resumos; um especialista → conversa direta (`send("otto-1", …)` e painel aberto); squad → Sala do Squad (`send("room-1", …)`); Trabalhos mostra a decisão pendente; recolher avisa "Uma decisão aguarda você". |
| `apps/web/test/product-layout.test.ts` (4) | 380/364 no limite de 1360; por cima a 1280 nos pilotos (`is-ov`); 256/72 e recolhida abaixo de 1100; dedicada ocupa o palco. |
| `apps/web/test/catalog.test.ts` (3) | áreas do catálogo = `squad/*/agent.yaml` (Kiwi = Growth Marketing); nenhuma chave com ponto; saudação e pergunta da V4.6. |
| `packages/ui/test/generated.test.ts` (+5) | `product-ui.css`, `ds-bundle.css` e `squad-stage.ts` em dia com o protótipo e o bundle; sem família do Google Fonts; o palco tem os sete com as seis expressões cada. |

### 2.4 No navegador (Playwright, Marina, seed da Miolo)

- Capturas `nosso-*.png` sem erro de console (`sem erros no console` em todas as rodadas finais).
- Esc no painel: o foco voltou a `button.v4-talk` ("Conversar com Otto").
- 1280×800, Conteúdo com a conversa aberta: raiz `ps is-panel is-ov is-ovp is-short is-cvh`, painel com **364 px** por cima da página (como o Notebook do protótipo; `lado-a-lado-08-conversa-1280.png`).
- O palco do Início ficou com `data-ready="1"` (motor ligado) depois de eu corrigir um problema real: com `dangerouslySetInnerHTML` o React recriava o SVG depois que o motor já o tinha pegado; agora o SVG entra só no cliente, e o React nunca o reconcilia.

### 2.5 A única escrita no banco

Pela interface, como a Marina, na conversa direta com o Otto (`5eed0000-…-000000000102`), às 09:10: **"Otto, pode deixar a legenda um pouco mais curta?"**. Resultado do script: `{"before":2,"after":3,"persisted":1}` (2 bolhas antes, 3 depois, e a mensagem volta do `GET /conversations/{id}/messages` depois de recarregar a página). Captura: `nosso-08-envio-uma-mensagem.png` e `nosso-09-conversa-1280.png`. Nenhuma aprovação foi decidida no banco (a decisão só foi exercitada mockada).

### 2.6 Texto fixo

`grep` em `apps/web/app`, `components`, `lib` (09:11): sobrou só o wordmark "HelloSquad" (marca, como o handoff manda: texto vivo) e as mensagens de configuração do `lib/env.ts` (erro de `.env` para quem sobe o servidor, não é tela).

## 3. O que ainda difere do protótipo, e por quê

Legenda: **D** = dado que o banco/a API ainda não tem (estado vazio honesto, regra 5 do Documento Mestre); **P** = só existe no protótipo; **?** = decisão do dono (pergunta na §5).

| Tela | O que difere | Tipo | Pergunta |
|---|---|---|---|
| Barra | Rótulo "**Growth Marketing**"; a barra da V4.6 diz "Growth" | ? | 1 |
| Barra | Sem o botão "Demo" e sem "Guia do protótipo" no menu da conta | P | — |
| Barra | Pé: "Miolo" em vez de "Miolo · Pinheiros"; papel "Titular" em vez de "dona da Miolo" | D/? | 2 |
| Barra | Sem a barra de créditos no menu da conta | ? (créditos por último, 16/10) | — |
| Barra | Sem badge do Modo Autônomo (2) e da Memória (2), sem ponto de "mensagens novas" e de notificação | D (rotinas, Memória, não lidas e notificações não existem na API) | — |
| Barra | Sino abre "Notificações" com um texto de vazio que a V4.6 não desenha | D/? | 3 |
| Início | Cartão da esquerda = o do **primeiro acesso** da V4.6; a conta em uso mostra Resultados da Íris com dados ilustrativos | D | 4 |
| Início | "Para o squad conhecer **Miolo**" (a V4.6: "a Miolo"); placeholder do site `seunegocio.com.br` (V4.6: `miolo.com.br`) | ? | 5 |
| Início | "Ler o site", "Conectar" (Instagram), anexar e "O que pedir" mostram o aviso "Ainda não disponível nesta versão." (o protótipo também avisa "demonstrativo") | D | 6 |
| Início | Faixa de sugestões passa sozinha e para no cursor e no foco, mas **não arrasta** para os lados (o motor `_band*` do protótipo não foi portado) | falta | — |
| Início | Escolher 2 a 6 especialistas ("conversa em grupo"): o pedido vai para a Sala do Squad, porque a API só tem Sala, conversa direta e conversa de objeto | ? | 7 |
| Início | Lista de sugestões = a da conta em uso (a do primeiro acesso começa por "Criar um post para o Dia Mundial do Pão") | ? | 8 |
| Conversa | Sem a primeira fala do agente (no protótipo é roteiro pré-escrito); o painel mostra só o histórico real | D (não inventar fala de agente) | — |
| Conversa | Sem seletor de conversas ("Nova conversa"), sem trilho de contexto, sem "Chamar alguém", sem status ao vivo ("Otto está escrevendo…") | D (Realtime e runtime são A1a/S1c) | — |
| Sala do Squad | Sem "Campanha de Natal · 7 especialistas ⌄" e sem o trilho "Projeto em contexto" (não há projeto no seed); cabeçalho "todos os especialistas · o Nexo coordena" | D | — |
| Conteúdo | Calendário, Próximas publicações, Desempenho e "Otto percebeu" no **estado vazio da própria V4.6** (nada datado nem número no seed) | D | — |
| Conteúdo | Faixa: subtítulo "Legenda, versão 1, aguarda a sua revisão" e ação "Revisar a legenda" (a V4.6: "A publicação de sex… depende da sua aprovação da v2" / "Revisar a peça"), porque o seed não tem data de publicação e a entrega é texto | ? | 9 |
| Conteúdo | "+N" das outras pendências não feito (o seed tem uma só) | falta | — |
| Entrega | A mesa mostra a **legenda num cartão Branco** com a sombra da peça; a V4.6 só desenha peça visual (imagem). CSS novo `.ps-capf` | ? (Diogo) | 10 |
| Entrega | Fatos "Formato · **Canal** · Publicação" (a V4.6: "Formato · **Para** (data) · Publicação"); sem "Mais ações" (…) e sem a pilha de agentes | D | — |
| Entrega | **Pedir ajuste** registra `changes_requested` e abre a conversa; o protótipo só abre a conversa e escreve "Quero pedir um ajuste nesta versão." sozinho | brief × protótipo | 11 |
| Entrega | Depois de aprovar: "Aprovada por você · Aprovar não publica…" (texto novo); a V4.6 segue para o cartão "Autorizar publicação", que é ação externa (não existe ainda) | D/? | 12 |
| Todas | Peças da Miolo (imagens, fonte Young Serif) não aparecem: não há entrega visual (o motor de imagem é do Vic) | D | — |
| Todas | Mobile: não há desenho na V4.6; a casca nova não tem a gaveta da A0 (abaixo de 1100 px a barra recolhe, como o protótipo) | ? | 13 |

Fora isso, as capturas lado a lado mostram a mesma composição, as mesmas medidas, cores, tipografia e estados (`lado-a-lado-01` a `08`).

## 4. O que ficou de fora

1. **`make e2e`** não rodou (proibido durante a S1c). Atualizei `apps/web/e2e/auth-shell.spec.ts` para a casca nova (conta no pé, "Hello, Marina.", nomes acessíveis da V4.6), mas **ele não foi executado**; precisa de uma rodada quando o banco estiver livre.
2. Motor de arrastar da faixa de sugestões e o "+N" da faixa "Precisa de você" (§3).
3. Realtime, status ao vivo e a resposta do squad no painel: A1a (depende da S1c).
4. Catálogo de capacidades ("O que pedir ao…"), anexos, conexão de Instagram e leitura de site: sem backend; avisam "Ainda não disponível nesta versão."
5. Ambientes de Nexo, Bia, Kaia, Kiwi, Max e Íris além da identidade + faixa + vazio.
6. Texto repetido no catálogo ("Pular para o conteúdo" em `site`, `auth`, `onboarding` e `shell`): dá para juntar em `common` numa próxima passada.
7. O `/app` passou de 110 para 121 kB de JS no primeiro carregamento (o sub-agente notou; suspeita: `useTranslations` no `ApiUnavailable`). Não investiguei.

## 5. Perguntas para o dono (e para o Diogo)

1. Na barra, o ambiente da Kiwi fica "**Growth Marketing**" (sua decisão de 15/10, que eu segui) ou o rótulo curto "**Growth**" da barra da V4.6?
2. O pé da barra mostra "Marina · Miolo · Pinheiros" e o papel "dona da Miolo". O cadastro do negócio vai ter segmento e bairro (por exemplo "Padaria · Pinheiros")? E o papel pode aparecer como "Titular" (neutro) ou quer "dono/dona"?
3. Texto do vazio das notificações: "Nada novo por aqui. Quando o squad precisar de você, aparece aqui." Aprova?
4. Sem números da Íris no banco, o Início mostra o cartão do **primeiro acesso** da V4.6 ("Para o squad conhecer…") no lugar de Resultados. Está certo?
5. "Para o squad conhecer **Miolo**" fica sem artigo. Guardamos o artigo do negócio no cadastro ("a Miolo") ou troca a frase? E o placeholder do site pode ser `seunegocio.com.br`?
6. Botões que ainda não funcionam (Ler o site, Conectar, anexar, O que pedir, Minha conta, Configurações) mostram "Ainda não disponível nesta versão." Aprova o texto, ou prefere esconder?
7. Conversa em grupo (2 a 6 especialistas) não existe na API: hoje o pedido vai para a Sala do Squad. Leva ao Stark como novo tipo de conversa, ou fica assim na Fase 1?
8. Sugestões do Início: a lista da conta em uso ou a do primeiro acesso?
9. Faixa "Precisa de você" da legenda: "Legenda, versão 1, aguarda a sua revisão" e "Revisar a legenda". Aprova?
10. **Diogo:** a entrega 04.01 é só texto. Na mesa ela entra num cartão Branco com a sombra da peça. É esse o desenho?
11. **Pedir ajuste:** o briefing pede a decisão `changes_requested` na hora; o protótipo só abre a conversa e escreve "Quero pedir um ajuste nesta versão." Qual dos dois? (Liga com a pergunta 4 da S1a: rejeitar cancela ou pede outra proposta?)
12. Depois de aprovar, "Aprovada por você. Aprovar não publica: a publicação pede autorização própria." até existir a autorização de publicação. Aprova o texto?
13. Mobile: a V4.6 não tem desenho. Mantenho a barra recolhida (como o protótipo abaixo de 1100 px) até o Diogo desenhar o celular, ou volto a gaveta da A0 como proposta?

## 6. Onde discordei ou decidi algo técnico

- **Sem divergência visual deliberada.** Duas trocas de texto que eu tinha feito na entrega ("Sua revisão", "preparou a versão 1") foram revertidas para o texto da V4.6 ("Sua aprovação", "Otto criou") antes de fechar (`730e1c0`).
- **Portar o CSS e o motor do palco por script, em vez de reescrever.** É o que garante "igual": 396 KB de CSS com a cascata V3 → V4.6 intacta, e o motor dos agentes como o Diogo deixou. O custo é peso (o CSS inteiro vai para a área logada); otimizar fica para depois, com teste visual.
- **next-intl 4.3.12, não a 4.9:** a 4.5+ puxa compilador e observador de arquivos com script de instalação, bloqueados pela política do pnpm (A0). A 4.3 tem tudo o que o ADR-0010 pede (catálogo, ICU, rotas por idioma quando vierem).
- **Links no lugar de botões** na barra e nos negócios: mesmo desenho, mas navegação real (URL, voltar do navegador, abrir em outra aba). `product.css` só tira o sublinhado.
- **Acidente de índice:** apaguei a casca da A0 com `git rm` e, antes do meu commit, o commit `b015aaf` (X1) entrou com essas remoções junto. O resultado no `main` é o pretendido; só a autoria do commit ficou trocada.

## 7. Estado em que deixei a máquina

- Porta 3100 livre, nenhum `next` rodando (conferido com `ss` e `ps`).
- API: a instância que eu subi com `make dev-api` (a segunda; a primeira foi parada por outra pessoa às ~08:58, quando a S1c reiniciou a API) foi derrubada ao fim: `Stopping reloader process [70303]`, porta 8100 livre. O Supabase do HelloSquad seguiu no ar, sem reinício.
- Banco: estado do seed + **1 mensagem** da Marina na conversa com o Otto (§2.5).
- Protótipo seguia servido na 8010 (não fui eu que subi; deixei como estava).
- Logs em `/tmp/a1f/` (sem chave). Sub-agente `a1f_i18n_auth` concluído.
