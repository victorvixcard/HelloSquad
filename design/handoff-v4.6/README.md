# HelloSquad · Handoff V4.6

Pacote de referência para o início da integração com o backend.
Ele contém os protótipos navegáveis da **Landing Page V1 (R32)** e da **Product UI V4.6**, exportados do canvas de design "HelloSquad — Exploração 01". Os arquivos não foram redesenhados nem reimplementados.

---

## A. Visão geral

A HelloSquad funciona como uma equipe de marketing com IA para pequenos e médios negócios. São **sete especialistas** que compartilham a mesma memória da marca e trabalham de forma coordenada:

| Agente | Área no produto | Responsabilidade |
|---|---|---|
| **Nexo** | Projetos | Coordenação: distribui pedidos e acompanha projetos e trabalhos |
| **Bia** | Estratégia | Diagnóstico, plano de marketing e oportunidades |
| **Kaia** | Marca & Criação | Identidade e peças visuais |
| **Otto** | Conteúdo | Calendário editorial, textos e publicações |
| **Kiwi** | Growth | Mídia paga, SEO e aquisição orgânica, conversão e testes |
| **Max** | CRM | Relacionamento, jornadas e reativação |
| **Íris** | Resultados | Métricas, análises e leituras de desempenho |

**A conversa é a interface principal.** A pessoa pede, e o squad organiza e executa. As decisões continuam sendo dela: aprovar, autorizar, confirmar.

Regra que organiza a Product UI: *toda informação relevante pode virar uma conversa, e toda conversa pode virar um trabalho.*

---

## B. Artefatos

| | Landing Page | Product UI |
|---|---|---|
| Versão | Landing Page V1 · rodada R32 (última aprovada) | Product UI V4.6 · Consolidação visual + padronização UX |
| Pasta | `landing/` | `product-ui/` |
| Arquivo principal | `LandingPageV1.dc.html` | `ProductUIV4.dc.html` (desktop 1440) |
| Outros arquivos | — | `ProductUIV4Notebook.dc.html` (abre o mesmo protótipo em 1280×800)<br>`MioloPeca.dc.html` (componente das peças de exemplo da marca demo "Miolo", importado 30 vezes pela UI) |

Origem: canvas **HelloSquad — Exploração 01**, versão publicada `1792113198-4eb2`, páginas "Landing Page V1" e "Product UI V4.6".

### Estrutura

```
HelloSquad_Handoff_V4.6/
├── README.md
├── landing/
│   ├── LandingPageV1.dc.html          ← abrir este
│   ├── support.js                     runtime dos componentes .dc.html
│   ├── vendor/react.js, react-dom.js  React 18.3.1 (UMD, local)
│   └── ds/hellosquad/
│       ├── components/bundle.css      Design System HelloSquad (CSS)
│       ├── components/bundle.js       Design System HelloSquad (componentes React em window.HelloSquad)
│       ├── tokens.json                tokens oficiais (cores, tipo, espaçamento, raios, sombras, movimento)
│       └── README.md                  princípios e regras do Design System
└── product-ui/
    ├── ProductUIV4.dc.html            ← abrir este (1440)
    ├── ProductUIV4Notebook.dc.html    (1280×800)
    ├── MioloPeca.dc.html
    ├── support.js, vendor/, ds/       (os mesmos da landing)
```

Cada pasta funciona sozinha: as dependências estão duplicadas de propósito.

### Como executar

Os arquivos precisam ser servidos por HTTP. Alguns navegadores bloqueiam os scripts quando o arquivo é aberto direto pelo `file://`.

```bash
cd HelloSquad_Handoff_V4.6
python3 -m http.server 8000
# ou: npx serve .
```

Depois, abra no navegador:

- Landing: http://localhost:8000/landing/LandingPageV1.dc.html
- Product UI (1440): http://localhost:8000/product-ui/ProductUIV4.dc.html
- Product UI (1280×800): http://localhost:8000/product-ui/ProductUIV4Notebook.dc.html

Para ver a V4.6 como foi validada, use uma janela de **1440×900** ou **1280×800**.

Precisa de internet só para as fontes do Google Fonts: Gabarito, JetBrains Mono e Young Serif. Sem conexão, a interface funciona com uma fonte substituta. React, runtime e Design System estão todos no pacote. Não há imagens externas, porque agentes, ícones e peças são SVG inline.

### Formato dos arquivos `.dc.html`

Cada arquivo é um **Design Component**, o formato da ferramenta de design:

- um template HTML dentro de `<x-dc>`, com `{{lacunas}}`, `<sc-if>`, `<sc-for>` e `<dc-import>`;
- estilos em `<helmet><style>` e inline;
- uma classe JS no fim (`class Component extends DCLogic`) com o estado e a lógica do protótipo (`state`, `setState`, `renderVals()`, ciclo de vida do React).

O `support.js` converte isso em React no navegador.

**Todos os dados demonstrativos, roteiros de conversa e fluxos simulados estão nessa classe.** Ela é a melhor referência para modelar entidades, estados e eventos do backend.

**Fidelidade.** Os `.dc.html` são cópias exatas das fontes do canvas, com uma única diferença: as duas linhas abaixo, no `<head>`, que carregam o React local. É o mesmo procedimento da exportação HTML do editor de design.

```html
<script src="./vendor/react.js"></script>
<script src="./vendor/react-dom.js"></script>
```

`support.js`, `vendor/` e `ds/` são byte a byte os mesmos usados pelo canvas.

Ao abrir no console, aparecem avisos como `<svg> attribute d: Expected …, "{{…}}"`. Eles vêm do navegador lendo o template antes do runtime preencher as lacunas e não afetam a renderização.

---

## C. Funcionalidades (como estão no protótipo)

### Landing Page V1 (R32)

- **Hero.** O campo de pedido digita e envia um exemplo sozinho cerca de 3 s depois de carregar. Depois, as sugestões passam em reprodução contínua. Ao enviar, aparece a sequência pedido → coordenação → especialistas → CTA.
- **Seções narrativas com scroll:** demonstração do squad, Modo Autônomo com rotinas interativas em 4 etapas, Memória da Marca, Resultados, Comparativo, FAQ e encerramento com o logotipo animado.
- **CTAs.**
  - "Criar conta grátis" e "Entrar" abrem modais demonstrativos de cadastro e login, sem envio de dados.
  - "Veja o Squad trabalhando" leva à seção de demonstração.
  - O pedido digitado na Hero fica em `sessionStorage` (`hs-landing-pedido`) para ser reaproveitado no cadastro.
- Respeita `prefers-reduced-motion`.

### Product UI V4.6

- **Navegação.** Barra lateral recolhível com três grupos:
  - Principal: Início e Sala do Squad.
  - Seu squad: um ambiente por especialista.
  - Gestão: Modo Autônomo, Memória da Marca e Minha Equipe & Conversas.

  Badges indicam pendências e mensagens novas.
- **Ambientes dos especialistas.** Cada um tem quatro camadas: identidade com "Conversar com…", uma visão protagonista, componentes inteligentes e a conversa contextual. As visões protagonistas são:
  - Projetos/Nexo: roadmap.
  - Estratégia/Bia: editorial e plano.
  - Marca & Criação/Kaia: estúdio.
  - Conteúdo/Otto: calendário editorial.
  - Growth/Kiwi: objetivo, oportunidades orgânicas e testes.
  - CRM/Max: jornadas e reativação.
  - Resultados/Íris: gráficos e indicadores.
- **Conversas.**
  - Universais: o mesmo painel lateral em todos os ambientes (380 px a partir de 1360 px de largura, 364 px abaixo disso, em sobreposição a 1280).
  - Levam um cartão de contexto do objeto: tipo, origem, período e participantes.
  - Admitem colaboração entre agentes na mesma conversa e podem ser expandidas para a conversa dedicada.
  - Esc fecha e devolve o foco. Reabrir sobre o mesmo objeto retoma o histórico.
  - A Sala do Squad é a conversa com todo o squad.
  - Minha Equipe & Conversas reúne os perfis e o histórico.
- **Projetos e trabalhos.** Toda conversa pode gerar um trabalho. Os trabalhos ficam em Projetos (Quadro, Lista e Biblioteca), com detalhe, etapas, responsáveis e origem (por exemplo, "execução PL-43").
- **Aprovações.**
  - A faixa "Precisa de você" mostra uma pendência por ambiente, com quem pede e o tipo de decisão: revisar, aprovar, autorizar, confirmar, reconectar ou responder. Quando há mais, o "+N" abre as demais.
  - Aprovar conteúdo **não** autoriza publicar, enviar, investir ou alterar campanhas. Cada ação externa pede autorização própria.
- **Memória da Marca.**
  - Dossiê do que o squad sabe.
  - Sugestões do tipo "<Agente> percebeu", que só viram regra com Confirmar, Corrigir ou Descartar.
  - Conflitos, dados desatualizados e fontes/conexões.
  - Busca, filtros e a visão "por especialista".
  - Histórico de alterações.
- **Modo Autônomo.**
  - Responsabilidades recorrentes, cada uma com responsável, colaboração, frequência, próxima execução e histórico (PL-42, RS-42…).
  - Estados: Ativa, Pausada, Aguarda aprovação, Bloqueada por integração, Falha, Programada, Não executada e Encerrada.
  - Delegação é feita pela conversa com o Nexo.
  - Limites: analisar e preparar são autônomos, executar só com autorização, e há o que o squad nunca faz.
  - Usa apenas as orientações da memória que já foram confirmadas.
- **Estados demonstrativos.** O botão **DEMO**, ao lado do logotipo, abre o guia do protótipo com:
  - os cenários **Conta em uso** e **Primeiro acesso** (estados vazios honestos);
  - jornadas guiadas: entrega pontual, campanha coordenada, rotina no Modo Autônomo e ciclo de aprendizado da Memória;
  - o botão **Reiniciar**.
- **Padrões visuais da V4.6:**
  - superfícies A, B e C;
  - um desenho por status;
  - insights "<Agente> percebeu" com contorno na cor do agente;
  - "borda viva" animada (no máximo uma por ambiente);
  - suporte a `prefers-reduced-motion`.

---

## D. Limitações: protótipo × produção

**Nenhum fluxo deste pacote é funcionalidade de produção.** Tudo roda no navegador, sem servidor.

| Funciona de verdade no protótipo | Usa dados ou lógica simulada | Depende de backend | Depende de integrações reais |
|---|---|---|---|
| Navegação entre ambientes, barra lateral e responsividade 1440/1280 | Marca demo "Miolo" (padaria), usuária "Marina" e todos os números, marcados como "dados ilustrativos" | Contas, autenticação e cadastro (os CTAs da landing só abrem modais) | Instagram e redes: publicar e agendar |
| Abrir, fechar, expandir e retomar conversas, com foco e teclado | **Respostas dos agentes: roteiros locais pré-escritos, sem IA.** Texto livre fora do roteiro recebe uma resposta-padrão | Orquestração real dos agentes (Nexo → especialistas) e chamadas de LLM | Google (Perfil da Empresa, Search Console, Ads) |
| Estados de interface: cartões expansíveis, filtros, seleção, abas | Relógio fixo (segunda, 12/10/2026) | Persistência de conversas, trabalhos, projetos e histórico | Meta Ads e outras plataformas de mídia (investimento de verba) |
| Animações, olhos e expressões dos agentes, borda viva | Execuções do Modo Autônomo, disparadas manualmente (por exemplo, "Simular a execução de quinta") | Memória da Marca: armazenamento, versões, origem e uso por agente | E-mail e WhatsApp para CRM (envios) |
| Ciclos de aprovação e confirmação **dentro da sessão** | Conectar e reconectar fontes, enviar planilha, falhas e bloqueios de integração | Agendador das rotinas autônomas, com permissões e limites por ação | Fontes de dados de Resultados (site, e-commerce, analytics) |
| | Publicar, enviar, investir e agendar: **nada sai do navegador** | Notificações, pendências ("Precisa de você") e trilha de auditoria | |
| | O estado vive só na aba e se perde ao recarregar | Multiusuário e equipe (Minha Equipe) | |

Limitações já conhecidas da V4.6:

- O "+N" da faixa e as fontes "De onde vem" da Memória seguem o comportamento da V4.5.
- A Sala do Squad recebeu só os refinamentos da conversa.
- A borda viva depende de `@property` no CSS. Sem esse suporte, o arco fica parado.

---

## E. Orientações para a integração

1. **A interface será integrada ao backend aos poucos.** Substitua os roteiros e dados locais da classe `Component` por chamadas reais, ambiente por ambiente, sem mudar a experiência.
2. **Preserve a experiência e a arquitetura dos componentes**, em especial:
   - o painel de conversa universal e o seu contexto (negócio, especialista, ambiente, tipo e id do objeto, período, participantes);
   - a faixa "Precisa de você";
   - os status;
   - as regras de autorização (aprovar ≠ publicar/enviar/investir);
   - a Memória, em que nada vira orientação sem confirmação.
3. **Identidade dos agentes.** Nomes, cores, formas e expressões dos olhos são oficiais. Use `ds/hellosquad/tokens.json` e o `bundle.js` (`window.HelloSquad`) como fonte, sem recriar por aproximação. O wordmark ainda é texto vivo em Gabarito 800 (provisório).
4. **A UI/UX continua evoluindo em paralelo.** A V4.6 é a **base de referência** para começar a integração, **não um congelamento** do design. Novas rodadas de interface virão como novas versões deste pacote.
5. Este pacote não contém chaves, tokens, credenciais nem arquivos de ambiente, e não se conecta a nenhum serviço além do Google Fonts.

---

## Integridade (SHA-256)

Os hashes dos arquivos estão em `CHECKSUMS.sha256`. Para conferir:

```bash
cd HelloSquad_Handoff_V4.6 && shasum -a 256 -c CHECKSUMS.sha256
```

As fontes originais do canvas, antes da inserção das duas linhas do React, têm estes hashes:

| Arquivo | SHA-256 |
|---|---|
| `ProductUIV4.dc.html` | `2870e99b4dd321ddf4e3d10e9deac718ee0fd77a3ba312962f39bc70b8a3a6b5` |
| `LandingPageV1.dc.html` | `a36e1b13d2c002a4190715cc962f4592df5b0409ed153a5e5c60a59d42c7ab66` |
