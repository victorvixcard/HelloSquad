# Site público da HelloSquad: mapa de conteúdo SEO e GEO

**Fatia:** N2a (Nick Fury, Marketing & Growth), 16/10/2026. **Uso:** fonte de texto e de metadados para o Aranha implementar as páginas públicas em Next.js (SSR/SSG, conteúdo no HTML inicial, porque os robôs de IA não executam JavaScript). Este documento não muda nada do que está implementado nem do que foi aprovado: onde a Landing V1 R32 já tem texto, ele vale e aparece marcado como **copy aprovada**.

## 1. Regras que todo o conteúdo segue

| Regra | Origem | Como aparece no texto |
|---|---|---|
| Entidade sempre **"HelloSquad"** ("a HelloSquad" em pt-BR e es; "HelloSquad" em en). Nunca outro nome de produto. | Arquitetura §7 | Primeira frase de toda página define a HelloSquad. |
| **Nenhum preço, plano, crédito, "grátis" ou condição comercial.** Sem rota `/precos`. | Decisão do Vic, 16/10 ("preço e créditos ficam por último") | CTA único: **"Começar com o squad"** (en: "Start with the squad"; es: "Empezar con el squad"). |
| **Nenhum fornecedor citado**: nem de IA, nem de imagem, nem de mídia, nem plataforma de anúncio ou rede social por nome. | Briefing N2a | "redes sociais", "buscadores", "plataformas de anúncio", "aplicativo de mensagens", "ferramenta de análise". |
| **Exemplos só com marcas fictícias** de `docs/DADOS_FICTICIOS.md`: Miolo (padaria de fermentação natural, Pinheiros/SP), Vitta Estética (Vitória/ES), Trilha Urbana (Curitiba/PR). Todo número de exemplo vem marcado como ilustrativo. | Decisão do Vic, 15/10 | Bloco "Exemplo fictício" em cada página de agente. A Miolo não usa a palavra "artesanal" (decisão da Memória da Marca do seed), então o site também não usa em exemplo da Miolo. |
| **Não prometer resultado.** Sem "aumente suas vendas em X%", sem depoimento, sem logo de cliente, sem contagem de clientes. | Documento Mestre §2.3 e regra 5 das diretrizes | A prova é o método (quem faz o quê, o que precisa de você), não número inventado. |
| **Kiwi é Growth Marketing**, tratamento "a Kiwi". "Mídia e Performance" da V4.6 é legado. | Decisão do Vic, 15/10 | Em todas as línguas: "Growth Marketing". |
| **GEO na redação**: definição explícita da HelloSquad na primeira dobra; cada seção abre com a resposta em 40 a 60 palavras; parágrafos curtos que fazem sentido sozinhos (um robô pode citar um parágrafo isolado); listas e tabelas quando houver passos ou comparação. | Arquitetura §7 e skill de GEO | Ver arquivos em `pt-BR/`. |

## 2. Rotas

pt-BR na raiz; en e es com prefixo de idioma, como a página inicial já faz hoje (`/`, `/en`, `/es`). Os slugs são traduzidos (melhor para busca no idioma). O slug dos agentes é o mesmo nos três idiomas (`iris`, sem acento).

| Página | pt-BR | en | es | Arquivo de conteúdo |
|---|---|---|---|---|
| Início | `/` | `/en` | `/es` | `inicio.md` |
| Como funciona | `/como-funciona` | `/en/how-it-works` | `/es/como-funciona` | `como-funciona.md` |
| O squad | `/squad` | `/en/squad` | `/es/squad` | `squad.md` |
| Nexo | `/squad/nexo` | `/en/squad/nexo` | `/es/squad/nexo` | `squad-nexo.md` |
| Bia | `/squad/bia` | `/en/squad/bia` | `/es/squad/bia` | `squad-bia.md` |
| Kaia | `/squad/kaia` | `/en/squad/kaia` | `/es/squad/kaia` | `squad-kaia.md` |
| Otto | `/squad/otto` | `/en/squad/otto` | `/es/squad/otto` | `squad-otto.md` |
| Kiwi | `/squad/kiwi` | `/en/squad/kiwi` | `/es/squad/kiwi` | `squad-kiwi.md` |
| Max | `/squad/max` | `/en/squad/max` | `/es/squad/max` | `squad-max.md` |
| Íris | `/squad/iris` | `/en/squad/iris` | `/es/squad/iris` | `squad-iris.md` |
| Perguntas frequentes | `/faq` | `/en/faq` | `/es/preguntas-frecuentes` | `faq.md` |
| Sobre | `/sobre` | `/en/about` | `/es/sobre` | `sobre.md` |

Fora desta fatia: `/precos` (não existe até o Vic decidir preço), `/blog` (previsto na arquitetura §7; sem pauta ainda). O app (`/app/...`) e `/sair` são `noindex` e bloqueados no `robots.txt`. `/entrar` deve ser `noindex` (não tem conteúdo para busca); `/criar-conta` pode ser indexada.

**hreflang** em toda página: `pt-BR`, `en`, `es` e `x-default` apontando para a versão pt-BR (o lançamento é pt-BR primeiro; ver pergunta P5 no relatório). **canonical** sempre para a própria versão do idioma.

## 3. Promessa, palavras-chave e perguntas GEO por página

As "perguntas GEO" são escritas como a pessoa digita ou fala para um assistente de IA. Cada uma tem resposta direta na página indicada (a FAQ responde todas em versão curta).

| Rota | Promessa da página (uma frase) | Palavra-chave principal | Secundárias | Perguntas que a pessoa faz à IA |
|---|---|---|---|---|
| `/` | Você cuida do seu negócio; uma equipe de sete especialistas de marketing com IA, que conhece sua marca, faz o trabalho, e você decide. | equipe de marketing com IA | agentes de IA para marketing; marketing com IA para pequenas empresas; squad de marketing | "Existe uma equipe de marketing com IA para pequena empresa?"; "O que é a HelloSquad?"; "Como fazer o marketing do meu negócio com IA sem contratar agência?" |
| `/como-funciona` | Do pedido à entrega numa conversa: o Nexo organiza, os especialistas produzem, você aprova e autoriza. | como funciona marketing com agentes de IA | IA que publica só com autorização; memória da marca; marketing no modo autônomo | "A IA publica sozinha nas minhas redes?"; "Como controlar o que a IA faz no meu marketing?"; "Como a IA aprende o jeito da minha marca?" |
| `/squad` | Sete especialistas com responsabilidades distintas e um coordenador; você fala com qualquer um. | agentes de IA de marketing | especialistas de marketing com IA; time de marketing virtual | "Quais são os agentes da HelloSquad?"; "Quem faz o quê numa equipe de marketing com IA?" |
| `/squad/nexo` | O Nexo transforma seu pedido em trabalho organizado e só te chama quando a decisão é sua. | coordenador de marketing com IA | organizar demandas de marketing; gestão de projetos de marketing | "Tem IA que organiza as demandas de marketing e distribui para especialistas?" |
| `/squad/bia` | A Bia diz onde está a oportunidade do seu negócio e em que ordem atacar. | estratégia de marketing com IA | diagnóstico de marketing; plano de marketing para pequena empresa; análise de concorrentes | "Como fazer um diagnóstico de marketing do meu negócio?"; "IA consegue montar um plano de marketing?" |
| `/squad/kaia` | A Kaia dá forma à sua marca em cada peça, no padrão que você aprovou. | criação de peças para redes sociais com IA | identidade visual; carrossel para redes sociais; material para loja | "IA cria posts no padrão visual da minha marca?" |
| `/squad/otto` | O Otto mantém sua marca presente nos canais, com a voz dela, e publica só com autorização. | conteúdo para redes sociais com IA | calendário editorial; legendas com tom de voz da marca; roteiro de vídeo curto | "IA consegue escrever legendas com o tom da minha marca?"; "Como montar um calendário de posts?" |
| `/squad/kiwi` | A Kiwi faz o negócio crescer com critério: anúncios, buscadores e conversão, dentro do teto que você autorizar. | growth marketing com IA | gestão de anúncios com IA; SEO para pequenas empresas; plano de mídia; otimização de conversão | "IA pode cuidar dos meus anúncios sem gastar além do limite?"; "Por que meu site não aparece nas buscas?" |
| `/squad/max` | O Max faz os clientes voltarem, com mensagens consentidas e no momento certo. | CRM de marketing com IA | reativar clientes inativos; jornada de relacionamento; fidelização | "Como reativar clientes que pararam de comprar?"; "IA pode mandar mensagem para meus clientes?" |
| `/squad/iris` | A Íris lê seus números e diz o que fazer com eles, sem inventar dado nem causa. | análise de resultados de marketing com IA | relatório de marketing; métricas para pequenas empresas; recomendações | "IA consegue analisar os resultados do meu marketing?"; "Como saber qual post trouxe mais visitas ao site?" |
| `/faq` | Respostas diretas às dúvidas de quem está avaliando a HelloSquad. | perguntas sobre marketing com IA | segurança; autorização; idiomas; dados | Ver `pt-BR/faq.md` (18 perguntas). |
| `/sobre` | Por que a HelloSquad existe e os princípios que ela não negocia. | HelloSquad | equipe de marketing com IA; princípios | "Quem faz a HelloSquad?"; "A HelloSquad é confiável?" |

## 4. Metadados (pt-BR)

Limites: title até 60 caracteres, description até 155 (contagem verificada por script no relatório). Open Graph e Twitter usam o mesmo par; imagem de compartilhamento gerada por rota (o briefing visual é do Visão, não deste documento). Metadados de en e es estão no topo de cada arquivo em `en/` e `es/`.

| Rota | title | description |
|---|---|---|
| `/` | HelloSquad: seu squad de IA assume o marketing | Equipe de marketing com IA para pequenos e médios negócios: sete especialistas que conhecem sua marca e trabalham juntos. Você toma as decisões. |
| `/como-funciona` | Como funciona a HelloSquad: do pedido à entrega | Você pede numa conversa, o Nexo organiza, os especialistas produzem e você aprova. Nada é publicado, enviado ou investido sem a sua autorização. |
| `/squad` | Os sete especialistas de marketing com IA \| HelloSquad | Conheça o squad da HelloSquad: coordenação, estratégia, criação, conteúdo, growth, CRM e resultados. Cada especialista com papel e limites claros. |
| `/squad/nexo` | Nexo, coordenação de marketing com IA \| HelloSquad | O Nexo recebe seu pedido, monta o time certo, acompanha cada etapa e só te chama quando a decisão é sua. Conheça o coordenador da HelloSquad. |
| `/squad/bia` | Bia, estratégia de marketing com IA \| HelloSquad | A Bia faz o diagnóstico do seu negócio, define posicionamento e público e monta um plano de marketing com prioridades. Sem número de mercado inventado. |
| `/squad/kaia` | Kaia, marca e criação com IA \| HelloSquad | A Kaia cria peças, carrosséis, identidade visual e materiais para a loja no padrão da sua marca, com prévia, revisão e histórico de versões. |
| `/squad/otto` | Otto, conteúdo e redes sociais com IA \| HelloSquad | O Otto escreve legendas, roteiros e artigos com a voz da sua marca, organiza o calendário editorial e publica só quando você autoriza. |
| `/squad/kiwi` | Kiwi, growth marketing com IA \| HelloSquad | A Kiwi cuida de anúncios, SEO e conversão com número e fonte. Planeja antes de investir e só mexe na verba dentro do teto que você autorizar. |
| `/squad/max` | Max, CRM e relacionamento com IA \| HelloSquad | O Max segmenta sua base, planeja reativação e jornadas por e-mail e mensagens, só para contatos com consentimento e só quando você autoriza o envio. |
| `/squad/iris` | Íris, resultados e métricas de marketing \| HelloSquad | A Íris consolida seus números com fonte e período, compara, explica o que mudou e recomenda o próximo passo. Sem dado inventado, sem causa sem prova. |
| `/faq` | Perguntas frequentes sobre a HelloSquad | O que é a HelloSquad, o que os agentes fazem, quem aprova, o que acontece com seus dados e em quais idiomas o squad trabalha. Respostas diretas. |
| `/sobre` | Sobre a HelloSquad: equipe de marketing com IA | A HelloSquad existe para que o pequeno negócio tenha uma equipe de marketing completa, que conhece a marca e deixa as decisões com quem é dono. |

Observação para o Aranha: a description atual de `apps/web/messages/pt-BR/site.json` (`meta.description`) tem mais de 155 caracteres e é cortada no resultado de busca; a versão acima tem o mesmo sentido dentro do limite. Trocar ou não é decisão do dono (pergunta P3 no relatório); este documento não altera o catálogo.

## 5. Dados estruturados (JSON-LD)

Marcadores: `{{SITE_URL}}` = endereço público (domínio pendente, decisão do Vic de 16/10); `{{...}}` = dado que só o dono informa (nunca inventar). Todos os blocos são `<script type="application/ld+json">` no HTML inicial. Os `@id` ligam as entidades entre páginas.

**Sem `Offer`** em `SoftwareApplication`: preço fica por último. Consequência conhecida: sem `offers` o Google não mostra resultado enriquecido de aplicativo; a marcação continua útil para identificar a entidade nos buscadores e nos assistentes de IA. Quando o Vic definir preço, o `Offer` entra junto com a rota de preços.

### 5.1 `/` — Organization, WebSite e SoftwareApplication

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "{{SITE_URL}}/#organization",
      "name": "HelloSquad",
      "url": "{{SITE_URL}}/",
      "logo": { "@type": "ImageObject", "url": "{{SITE_URL}}/logo-hellosquad.png" },
      "description": "A HelloSquad é uma equipe de marketing com IA para pequenos e médios negócios: sete especialistas que compartilham a memória da marca, trabalham de forma coordenada e deixam as decisões com a pessoa dona do negócio.",
      "slogan": "Você cuida do seu negócio. Seu squad de IA assume o marketing.",
      "knowsAbout": ["marketing digital", "estratégia de marketing", "marketing de conteúdo", "growth marketing", "SEO", "CRM de marketing", "análise de resultados de marketing"],
      "sameAs": []
    },
    {
      "@type": "WebSite",
      "@id": "{{SITE_URL}}/#website",
      "url": "{{SITE_URL}}/",
      "name": "HelloSquad",
      "inLanguage": ["pt-BR", "en", "es"],
      "publisher": { "@id": "{{SITE_URL}}/#organization" }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "{{SITE_URL}}/#app",
      "name": "HelloSquad",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Marketing",
      "operatingSystem": "Web",
      "url": "{{SITE_URL}}/",
      "inLanguage": ["pt-BR", "en", "es"],
      "description": "Equipe de marketing com IA para pequenos e médios negócios. Sete especialistas (coordenação, estratégia, marca e criação, conteúdo, growth marketing, CRM e resultados) recebem pedidos numa conversa, organizam o trabalho e entregam material revisável. Publicar, enviar e investir exigem autorização da pessoa dona da conta.",
      "audience": { "@type": "BusinessAudience", "audienceType": "Pequenos e médios negócios" },
      "featureList": [
        "Sala do Squad: uma conversa com todos os especialistas",
        "Nexo coordena pedidos, projetos e aprovações",
        "Memória da Marca compartilhada, confirmada pela pessoa",
        "Modo Autônomo para responsabilidades recorrentes",
        "Aprovação e autorização separadas para publicar, enviar e investir",
        "Relatórios com fonte, período e unidade"
      ],
      "publisher": { "@id": "{{SITE_URL}}/#organization" }
    }
  ]
}
```

Campos que o dono informa quando quiser (não inventar): `foundingDate`, `founder`, `address`, `contactPoint` (e-mail de contato público), `sameAs` (perfis oficiais). Ver P6 no relatório.

### 5.2 Toda página interna — BreadcrumbList

Exemplo de `/squad/kiwi`; as outras seguem o mesmo padrão (`/como-funciona` e `/faq` e `/sobre` têm dois níveis; agente tem três).

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Início", "item": "{{SITE_URL}}/" },
    { "@type": "ListItem", "position": 2, "name": "Squad", "item": "{{SITE_URL}}/squad" },
    { "@type": "ListItem", "position": 3, "name": "Kiwi, Growth Marketing", "item": "{{SITE_URL}}/squad/kiwi" }
  ]
}
```

### 5.3 `/squad` — ItemList dos sete serviços

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "O squad da HelloSquad",
  "itemListOrder": "https://schema.org/ItemListUnordered",
  "numberOfItems": 7,
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "{{SITE_URL}}/squad/nexo", "name": "Nexo, Coordenação de Marketing" },
    { "@type": "ListItem", "position": 2, "url": "{{SITE_URL}}/squad/bia", "name": "Bia, Estratégia e Inteligência" },
    { "@type": "ListItem", "position": 3, "url": "{{SITE_URL}}/squad/kaia", "name": "Kaia, Marca e Criação" },
    { "@type": "ListItem", "position": 4, "url": "{{SITE_URL}}/squad/otto", "name": "Otto, Conteúdo e Comunicação" },
    { "@type": "ListItem", "position": 5, "url": "{{SITE_URL}}/squad/kiwi", "name": "Kiwi, Growth Marketing" },
    { "@type": "ListItem", "position": 6, "url": "{{SITE_URL}}/squad/max", "name": "Max, CRM e Relacionamento" },
    { "@type": "ListItem", "position": 7, "url": "{{SITE_URL}}/squad/iris", "name": "Íris, Dados e Resultados" }
  ]
}
```

### 5.4 `/squad/<agente>` — Service (um por agente)

Molde preenchido para os sete. Campos iguais em todos: `@context`, `provider` (`{"@id": "{{SITE_URL}}/#organization"}`), `isRelatedTo` omitido (SoftwareApplication não é Product), `audience` (`BusinessAudience`, "Pequenos e médios negócios"), `availableLanguage` (`["pt-BR", "en", "es"]`). Sem `offers` e sem `areaServed` até haver decisão de países.

| Agente | `@id` | `name` | `serviceType` | `description` |
|---|---|---|---|---|
| Nexo | `{{SITE_URL}}/squad/nexo#service` | Nexo, Coordenação de Marketing | Coordenação de projetos de marketing | Qualifica pedidos, organiza projetos e trabalhos, delega ao especialista certo, acompanha etapas e pede aprovação só quando a decisão é da pessoa. |
| Bia | `{{SITE_URL}}/squad/bia#service` | Bia, Estratégia e Inteligência | Estratégia de marketing | Diagnóstico de marketing, posicionamento, público, plano de marketing com prioridades, estratégia de campanha e pesquisa de concorrentes com fonte e data. |
| Kaia | `{{SITE_URL}}/squad/kaia#service` | Kaia, Marca e Criação | Design e direção de arte | Peças estáticas, carrosséis, adaptações de formato, identidade visual, materiais promocionais e edição com referências da marca, com prévia e versões. |
| Otto | `{{SITE_URL}}/squad/otto#service` | Otto, Conteúdo e Comunicação | Marketing de conteúdo | Textos e legendas no tom da marca, calendário editorial, roteiros multicanal, artigos para buscadores e publicação apenas com autorização. |
| Kiwi | `{{SITE_URL}}/squad/kiwi#service` | Kiwi, Growth Marketing | Growth marketing | Plano de mídia, públicos e testes de anúncio, leitura e otimização de campanhas, SEO e SEO local, otimização de conversão e experimentos, dentro do teto autorizado. |
| Max | `{{SITE_URL}}/squad/max#service` | Max, CRM e Relacionamento | CRM de marketing | Segmentação da base com consentimento, campanhas de reativação e fidelização, sequências de e-mail e mensagens e jornadas de relacionamento. |
| Íris | `{{SITE_URL}}/squad/iris#service` | Íris, Dados e Resultados | Análise de resultados de marketing | Consolida métricas com fonte, período e unidade, compara períodos, explica variações sem afirmar causa sem evidência e recomenda próximos passos. |

Exemplo completo (Kiwi):

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "{{SITE_URL}}/squad/kiwi#service",
  "name": "Kiwi, Growth Marketing",
  "serviceType": "Growth marketing",
  "description": "Plano de mídia, públicos e testes de anúncio, leitura e otimização de campanhas, SEO e SEO local, otimização de conversão e experimentos, dentro do teto autorizado.",
  "provider": { "@id": "{{SITE_URL}}/#organization" },
  "audience": { "@type": "BusinessAudience", "audienceType": "Pequenos e médios negócios" },
  "availableLanguage": ["pt-BR", "en", "es"],
  "url": "{{SITE_URL}}/squad/kiwi"
}
```

### 5.5 `/faq` — FAQPage

Montado a partir de `pt-BR/faq.md`: cada `###` vira uma `Question` e o parágrafo de resposta vira `acceptedAnswer.text` (texto puro, sem markdown). Mesmo texto da página, palavra por palavra (o Google penaliza marcação que não bate com o visível). Exemplo das duas primeiras:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O que é a HelloSquad?",
      "acceptedAnswer": { "@type": "Answer", "text": "A HelloSquad é uma equipe de marketing com inteligência artificial para pequenos e médios negócios. São sete especialistas (coordenação, estratégia, marca e criação, conteúdo, growth marketing, CRM e resultados) que compartilham a memória da sua marca e trabalham juntos. Você pede numa conversa, o squad organiza e entrega, e as decisões continuam com você." }
    },
    {
      "@type": "Question",
      "name": "Preciso entender de marketing para usar a HelloSquad?",
      "acceptedAnswer": { "@type": "Answer", "text": "Não. Você explica o que precisa com as suas palavras, por exemplo \"quero vender mais no fim de semana\". O Nexo, coordenador do squad, transforma o pedido em trabalho, faz no máximo as perguntas que faltam e chama os especialistas certos." }
    }
  ]
}
```

A página inicial não repete o `FAQPage` (marcação de perguntas fica numa página só, a `/faq`, para não duplicar entidade); a seção de perguntas da landing linka para `/faq`.

### 5.6 `/como-funciona` — HowTo não, WebPage com `about`

O fluxo da HelloSquad não é um procedimento que a pessoa executa sozinha, então `HowTo` seria marcação enganosa. Usar `WebPage` com `about` apontando para o `SoftwareApplication`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "{{SITE_URL}}/como-funciona#webpage",
  "name": "Como funciona a HelloSquad: do pedido à entrega",
  "inLanguage": "pt-BR",
  "about": { "@id": "{{SITE_URL}}/#app" },
  "isPartOf": { "@id": "{{SITE_URL}}/#website" }
}
```

`/sobre` usa `AboutPage` com `about` = `{"@id": "{{SITE_URL}}/#organization"}`.

## 6. Termos por idioma (consistentes com `apps/web/messages`)

| pt-BR | en | es |
|---|---|---|
| a HelloSquad | HelloSquad | HelloSquad (artigo "la" só quando a frase pedir) |
| squad / o squad | squad / the squad | squad / el squad |
| especialista | specialist | especialista |
| Negócio | Business | Negocio |
| Precisa de você | Needs you | Necesita de ti |
| Sala do Squad | Squad Room | Sala del Squad |
| Memória da Marca | Brand Memory | Memoria de Marca |
| Modo Autônomo | Autonomous Mode | Modo Autónomo |
| Trabalho / Projeto / Entrega | Work / Project / Delivery | Trabajo / Proyecto / Entrega |
| Biblioteca | Library | Biblioteca |
| Minha Equipe & Conversas | My Team & Conversations | Mi Equipo y Conversaciones |
| aprovar / autorizar / confirmar | approve / authorize / confirm | aprobar / autorizar / confirmar |
| Projetos (área do Nexo) | Projects | Proyectos |
| Estratégia (Bia) | Strategy | Estrategia |
| Marca & Criação (Kaia) | Brand & Creative | Marca y Creación |
| Conteúdo (Otto) | Content | Contenido |
| Growth Marketing (Kiwi) | Growth Marketing | Growth Marketing |
| CRM (Max) | CRM | CRM |
| Resultados (Íris) | Results | Resultados |
| Começar com o squad | Start with the squad | Empezar con el squad |
| dono da conta | account owner | titular de la cuenta |

## 7. Arquivos desta pasta

- `pt-BR/`, `en/`, `es/`: uma página por rota, com metadados no topo, texto e notas de implementação.
- `llms.txt`: descrição citável do produto e dos sete agentes (pt-BR, com blocos en e es). Sugestão para substituir `apps/web/public/llms.txt` (decisão do Aranha e do Thor).
- `robots.txt`: sugestão; a implementação já existe em `apps/web/app/robots.ts` e está alinhada.
