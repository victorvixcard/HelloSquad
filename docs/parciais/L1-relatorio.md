# L1 — Relatório (Aranha)

**Fatia:** L1, Landing V1 (R32) fiel, com os efeitos e as animações. **Data:** 17/10/2026, 07:37 → 08:30 (53 min; alvo 75).
**Regra que guiou:** segue o protótipo sempre; seção animada na R32 → porta-se o motor, não se substitui. O que a A2c
"registrou" como divergência (Hero estático, cartões no lugar das seções animadas) era defeito e foi corrigido.
**Escopo:** `apps/web`, `packages/ui` e docs da fatia. Nada em `apps/backend`, `supabase/`, `infra/`. Banco intocado
(o e2e rodou sem o setup/teardown que reaplica o seed). O `next dev` do dono na 3100 ficou no ar o tempo todo.

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Inventário por script** | `docs/parciais/l1/inventario.md`: as 11 partes da R32 (barra, Hero, demonstração, especialistas, Modo Autônomo, Memória, Resultados, comparativo, FAQ, encerramento, rodapé), 165 métodos da classe `Component` agrupados por motor, 152 KB de CSS (48 `@keyframes`), × o que havia em `/` (A2c). Sem ler o `.dc.html` inteiro. | `89ed08f` |
| 2 | **Extração por script** | `packages/ui/scripts/extract-landing.ts` gera `landing.css` (o `<style>` inteiro, na ordem, fontes locais), `landing-template.ts` (o template do `<x-dc>` já analisado em árvore, com o mesmo pré-processamento do `support.js`), `landing-logic.ts` (as 88 constantes de roteiro e a classe `Component` como estão) e `ds-bundle-runtime.ts` (o `bundle.js` do DS, o mesmo da Product UI, como fábrica). Teste de defasagem contra o handoff. | `dbb115a`, `b12ca72`, `f855880` |
| 2 | **Runtime do protótipo em React** | `packages/ui/src/landing/runtime.tsx`: interpretador com a semântica do `support.js` (lacunas `{{…}}`, `sc-if`, `sc-for`, `x-import` com o invólucro `sc-host-x`, estilo em texto aplicado como `cssText`, valor interpolado em `<span class="sc-interp">`, `DCLogic` com `setState`/ciclo de vida). Roda no servidor (o HTML traz o texto de todas as seções) e no cliente (o `componentDidMount` liga os motores, como no protótipo). | `c247087` |
| 2 | **`/`, `/en`, `/es` = R32 seção por seção** | `apps/web/components/landing/LandingR32.tsx`. Todos os motores são os do protótipo: Hero que digita e envia sozinho (~2,9 s depois de montar), faixa de sugestões contínua (para no cursor e no foco de teclado; o motor de arrastar também veio, não testei o arrasto à parte), sequência pedido → coordenação → especialistas → CTA, "Veja o Squad trabalhando" levando à demonstração com cursor, especialistas que reagem, Modo Autônomo com as 5 rotinas e as 4 etapas interativas, Memória com a rede animada, Resultados com gráfico e conversa, comparativo, FAQ, encerramento com o logotipo animado, `prefers-reduced-motion`. **Única mudança de comportamento (pedida no briefing):** "Criar conta grátis" e "Entrar" levam a `/criar-conta` e `/entrar` em vez dos modais demonstrativos; o pedido do Hero vai para `sessionStorage` `hs-landing-pedido` pelo próprio protótipo. | `c247087` |
| 2 | **Nenhum fornecedor citado** | Tabela `NEUTRAL` no script: 19 trocas exatas e contadas (Instagram, Facebook, Google Ads, Google → "redes sociais", "anúncios de busca", "busca"); os logotipos Canva e ChatGPT saem do comparativo (a caixa de 56 px fica, o desenho da tabela não muda) e as regras com os PNG saem do CSS. Lista completa na §5. | `b12ca72` |
| 2 | **en e es** | Lista das 856 strings visíveis gerada por script (`apps/web/scripts/landing-strings.mjs` → `content/landing/pt-BR.json`); `en.json`/`es.json` traduzem por índice. Os roteiros da classe são traduzidos **na fonte** (a classe é recriada por idioma com as constantes traduzidas), então o motor digita o pedido já no idioma; frases que a classe monta (nomes + estado, leitor de tela do Modo Autônomo) por 4 regras em `compose.ts`. Traduções minhas (revisão nativa recomendada). | `d7bbf58`, `f855880`, `6b5a686`, `f737bb0` |
| 3 | **SEO/GEO da A2c preservados** | Metadata API, JSON-LD (Organization + WebSite + SoftwareApplication), `hreflang`, canônico, `sitemap`, `robots`, `llms.txt`: intocados. `/` segue **estática (○)**. O HTML do servidor traz o texto de todas as seções (os motores só animam no cliente). | — |
| 3 | **Otimização sem tirar animação** | Subárvores 100% estáticas do template viram elementos memorizados (o React pula a reconciliação delas a cada passo do motor). | `057b0d7` |
| 4 | **Prova lado a lado** | `docs/parciais/l1/`: vídeos `proto-1440.mp4`, `nosso-1440.mp4` (3100, `next dev`), `nosso-prod-1440.mp4` (build de produção), `lado-a-lado-1440.mp4`; `proto-390.mp4`, `nosso-prod-390.mp4`, `lado-a-lado-390.mp4`; capturas por seção `lado-1440-01…09.jpg` e `lado-390-01…09.jpg` (R32 à esquerda). | `dcef306` |
| 5 | **Testes** | Vitest: SSR da landing (ui), defasagem da extração (ui, 2), motores (web, 5: dispara ~3 s, en digita traduzido, para ao escrever, faixa para no cursor e no foco, movimento reduzido), seções na ordem/sem fornecedor/en/es (web, 4), dicionários (web, 3), frases montadas (web, 1). E2e do site atualizado. | `8be50ff`, `fedbd66`, `944f9ef` |

## 2. Como foi verificado (evidência colada)

### 2.1 `make test-web` (08:28, HEAD `0d87ff9`, com todos os commits da L1; exit 0)

```text
pnpm --filter web lint            → eslint sem problemas
pnpm -r --if-present typecheck    → contracts, ui, web: Done
packages/contracts test:  Test Files  1 passed (1)    Tests  9 passed (9)
packages/ui test:         Test Files  7 passed (7)    Tests  53 passed (53)
apps/web test:            Test Files  43 passed (43)  Tests  502 passed (502)
EXIT 0
```

### 2.2 Build de produção (worktree `/tmp/l1-wt` em `f737bb0`; exit 0)

```text
┌ ○ /                                                135 B         210 kB
├ ƒ /en                                              135 B         210 kB
├ ƒ /es                                              134 B         210 kB
+ First Load JS shared by all                       102 kB
```

`/` continua estática. O primeiro carregamento passou de 109 kB (A2c) para 210 kB: template, classe e bundle do DS.

### 2.3 E2e do site (worktree, `next start` na 3200; config só com as specs do site, **sem** setup/teardown: nada de worker nem de seed)

```text
✓ 1 auth-shell.spec.ts:82 › site público › página inicial em pt-BR com SEO e crawlers de IA liberados (451ms)
✓ 2 site.spec.ts:15 › as doze páginas respondem 200 nos três idiomas, com lang, título, canônico, hreflang e JSON-LD no head (783ms)
✓ 3 site.spec.ts:38 › slug desconhecido dá 404 no idioma da rota (27ms)
✓ 4 site.spec.ts:43 › /app e /admin ficam fora dos buscadores; robots.txt, sitemap e llms.txt da N2a (20ms)
✓ 5 site.spec.ts:61 › no celular: página do agente com migalhas, conteúdo, botão sem preço e troca de idioma (238ms)
✓ 6 site.spec.ts:75 › no computador: landing R32 portada, com o Hero que digita e envia sozinho; FAQ e squad (6.2s)
6 passed (8.2s)
```

O teste 6 espera o campo do Hero chegar a "Criar uma campanha…" e o `#topo` entrar nas fases `is-ph-*`, clica "Veja o Squad
trabalhando" (a `#demo` entra na tela), confere o comparativo sem `[data-brand]`, clica "Entrar" (vai para `/entrar`) e abre `/en`.

### 2.4 Lighthouse mobile (13.5.0, perfil padrão, contra o build acima; máquina com os outros agentes rodando)

```text
rota                        perf a11y  seo   FCP     LCP     TBT       CLS
/  (4 rodadas)            70/81/84/86  92  100   1.2–1.5 s 2.3–3.0 s 480–1220 ms 0.034
/en (4 rodadas)           82/80/81/80  92  100   1.7 s   2.4–2.8 s 540–640 ms 0.076
/squad/otto                  100  100  100   0.9 s   1.8 s   50 ms     0
/faq                         100  100  100   0.9 s   1.8 s   50 ms     0
/en/squad/otto                99  100  100   1.1 s   2.0 s   70 ms     0
/es/preguntas-frecuentes      99  100  100   1.1 s   2.0 s   40 ms     0
```

**A landing ficou abaixo da meta de 95** (mediana ≈ 83 em `/`, ≈ 81 em `/en`; a A2c media 98 com o Hero estático). O que
pesa, pelo próprio Lighthouse: TBT de tarefas longas no momento em que o motor do Hero começa (~300 ms cada, com a CPU 4×
mais lenta do perfil mobile), "Style & Layout" 644 ms (página de 12 mil px, ~5 mil nós, 48 animações CSS) e "Parse HTML &
CSS" 553 ms (HTML de 360 KB com os SVG dos agentes + 155 KB de CSS). Otimizei sem tirar animação (subárvores estáticas
memorizadas: 83 → 85 na mesma máquina) e **não removi nem adiei nenhum motor**. Próximos passos possíveis, com risco
baixo/médio, numa fatia própria: (1) memorizar cada seção pelo pedaço de `renderVals` que ela usa; (2) ligar os motores das
seções abaixo da dobra só quando entram na tela; (3) hidratar as seções abaixo da dobra sob demanda. Acessibilidade 92: os
dois achados são da própria R32 (§4, perguntas 2 e 3). Saídas em `/tmp/l1/lh3/`.

### 2.5 No navegador (Playwright, 1440×900 e 390×844, R32 na 8010 × nosso)

- **Hero:** aos ~5 s o campo mostra "Criar uma campanha para o fim de s…" (digitando) e o Hero entra em `is-ph-read`, nos
  dois; **0 erros de console** no nosso em `/`, `/en` e `/es` (o protótipo tem 89, os avisos de template do README §B).
- **Vídeo (produção, 1440):** carregou 0,1 s · Hero digitado e enviado 8,7 s (R32: 8,8 s) · "Veja o Squad trabalhando" →
  demonstração · especialistas 15,7 s (R32: 15,9 s) · Modo Autônomo, etapas 2, 3 e 4 clicadas · Memória · Resultados ·
  comparativo · FAQ · encerramento. Mesma sequência, mesmos tempos.
- **Altura da página:** 12.128 px nosso × 12.117 px R32 (1440); 13.424 × 13.357 (390).
- **en/es:** percorrendo a página inteira em `/en`, 278 linhas de texto vistas, **0** com cara de pt-BR.

### 2.6 Seção por seção (capturas `lado-1440-*.jpg`, `lado-390-*.jpg` e os vídeos)

| Seção | Resultado | Difere em quê / por quê |
|---|---|---|
| Barra | igual | — |
| Hero `#topo` | igual (palco, campo que digita e envia, faixa, sequência, CTA) | "Criar conta grátis"/"Entrar" levam às telas reais (briefing) |
| Demonstração `#demo` | igual (Sala do Squad, "Squad pronto"; quadro a quadro igual no vídeo alinhado) | "Peças · redes sociais" e roteiros sem nome de rede (fornecedor) |
| Especialistas `#squad` | igual | — |
| Modo Autônomo `#autonomo` | igual (5 rotinas, 4 etapas interativas, revisão) | "Publicar 3x por semana **nas redes sociais**" e "Posts nas redes sociais" (fornecedor) |
| Memória `#memoria` | igual (rede animada) | — |
| Resultados `#resultados` | igual (gráfico, conversa simulada) | — |
| Comparativo `#porque` | igual no desenho | sem os logotipos Canva e ChatGPT (caixa mantida; fornecedor) |
| FAQ `#faq` | igual (9 perguntas) | inclui a de créditos, que a A2c tirava (pergunta 7) |
| Encerramento `#comecar` | igual (logotipo animado) | — |
| Rodapé | igual | — |
| 390 px | igual ao protótipo, inclusive onde a própria R32 estoura a largura (a R32 não tem desenho de celular) | — |

## 3. Decisões técnicas (não mudam o combinado)

1. **Portar o runtime, não reescrever.** 165 métodos e 88 constantes de roteiro não dão "igual" reescritos à mão. A classe
   roda como está; o interpretador reproduz o `support.js` (a mesma ideia da A1f com o palco, levada à página inteira).
2. **SSR com o estado inicial.** No servidor só o construtor e o `renderVals` rodam (com um `window` que só tem o
   `HelloSquad` e um `document` mínimo); o texto das seções sai no HTML para buscadores e leitores de IA.
3. **Fontes locais.** Famílias Gabarito/JetBrains Mono → variáveis do `next/font` (CSS e estilos inline); a medição de texto
   em canvas da classe usa a Gabarito local. Young Serif (peças da Miolo) não existe no repositório: cai em Georgia, como
   a A1f registrou na área logada.
4. **Sem `data-dc-tpl`.** São anotações do editor de design; nem o CSS nem a classe as usam.
5. **en/es traduzidos na fonte.** Traduzir só a saída deixava o Hero digitando letra a letra em português; a classe é criada
   uma vez por idioma com as constantes traduzidas (`Component.__data`). O campo `act` fica em pt-BR na fonte porque a classe
   compara com o literal (`'Confirmar'`); ele é traduzido na hora de mostrar.
6. **E2e sem banco.** O teardown do e2e sempre reaplica o seed; com J3 e S3b em paralelo, rodei só as specs do site com uma
   config temporária no worktree (sem setup/teardown).

## 4. O que o protótipo não mostra (ou mostra e conflita com regra do dono)

- **Modais de cadastro e login:** substituídos pelas telas reais (briefing). O Nexo **ainda não lê** `hs-landing-pedido`
  depois do cadastro: nada no app consome a chave hoje (pergunta 5).
- **Celular:** a R32 não tem desenho; a 390 px reproduzimos o protótipo como ele é.
- **Troca de idioma visível:** a R32 não tem; `/en` e `/es` existem e estão no `hreflang`, mas não há link visível na landing
  (o rodapé da A2c tinha; a R32 manda).

## 5. Perguntas ao dono (e ao Diogo)

1. **Fornecedor.** Para cumprir "nenhum fornecedor citado", troquei na R32: "Instagram/Facebook" → "redes sociais",
   "Google Ads" → "anúncios de busca", "Google" → "busca", e tirei os logotipos Canva e ChatGPT do comparativo (o texto
   "Softwares tradicionais" e "Assistentes de IA genéricos" ficou). Tabela exata em `NEUTRAL` (`extract-landing.ts`). Aprova
   os termos, ou prefere outros? Voltar ao texto da R32 é apagar linhas da tabela.
2. **Contraste (Diogo):** o cinza `#8A8799` sobre `#F7F7F5` (segunda linha dos títulos "Você toma as decisões…", "Mais do que
   ferramentas.", rodapé) dá 3,25:1; o mínimo AA para texto grande é 3:1 e para texto pequeno 4,5:1 (o rodapé de 11,5 px
   falha). Um cinza `#6E6B80` passa. Mantive a R32.
3. **Comparativo (Diogo):** o `role="table"` tem um filho `div[aria-hidden]` que não é linha (aviso do Lighthouse). Mantive.
4. **Kiwi:** a R32 diz "Kiwi · Mídia" e "Mídia e Performance"; a decisão de 15/10 diz "Growth Marketing em todo o fluxo".
   Mantive a R32 (regra de 16/10 10:20, como na barra da V4.6). Trocar é uma linha na tabela do script.
5. **Pedido do Hero depois do cadastro:** a landing guarda o pedido em `hs-landing-pedido`; quer que o Nexo o receba como
   primeira mensagem depois do cadastro (a promessa da R32: "Crie sua conta e o Nexo começa por ele")? É trabalho no
   onboarding/Início, fora desta fatia.
7. **FAQ:** a R32 tem "Posso começar gratuitamente? Como funcionam os créditos?"; a A2c tirava essa pergunta (P2 da N2a,
   créditos por último). Segui a R32. Tirar é esconder uma pergunta.
6. **Performance:** com todos os motores a landing mede ≈ 83 (mobile). Abro uma fatia de otimização (§2.4, três passos sem
   tirar animação) ou fica assim até a publicação?

## 6. O que ficou de fora

- Meta de Lighthouse ≥ 95 na landing (§2.4).
- Revisão nativa das traduções en/es (minhas).
- Young Serif local (peças da Miolo em Georgia).
- O e2e completo (`make e2e`) não rodou: ele reaplica o seed do banco compartilhado; rodaram as 6 specs do site.

## 7. Onde discordei do briefing / incidentes

- **Fornecedor × "igual à R32":** a R32 cita fornecedores; o briefing pede nenhum. Segui o briefing com a menor troca possível
  e listei tudo (pergunta 1).
- **`pkill -f` pegou o próprio comando** (o incidente que a A2c registrou): só o meu `next start` da 3200 caiu, o commit e o
  push já tinham saído. Passei a parar por PID.

## 8. Estado em que deixei a máquina

- `next dev` do dono (3100): no ar, nunca parado; recarregou do disco (`GET /` 200).
- Worktree `/tmp/l1-wt`, `next start` da 3200 e o Chromium do Lighthouse (9334): parados e removidos ao fim (§ progresso).
- Banco: nenhuma escrita; nenhum seed reaplicado. API (8100) intocada.
- Logs e medições em `/tmp/l1/` (sem chave).
