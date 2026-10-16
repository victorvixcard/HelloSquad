---
rota: /
idioma: pt-BR
alternates: { en: /en, es: /es, x-default: / }
title: "HelloSquad: seu squad de IA assume o marketing"
description: "Equipe de marketing com IA para pequenos e médios negócios: sete especialistas que conhecem sua marca e trabalham juntos. Você toma as decisões."
jsonld: [Organization, WebSite, SoftwareApplication]   # README §5.1
cta: "Começar com o squad"
---

# Página inicial (`/`)

A página inicial é a **Landing V1 R32**, já aprovada. Este arquivo não reescreve a landing: indica, seção por seção, qual texto é **copy aprovada** (não muda) e qual é **texto de SEO/GEO** proposto para entrar no HTML inicial sem alterar o desenho (parágrafo de definição, textos alternativos, resumo de cada seção para quem lê sem animação). Ordem das seções igual à da R32.

## 1. Primeira dobra

**Copy aprovada (R32):**

- H1: **Você cuida do seu negócio. Seu squad de IA assume o marketing.**
- Campo de pedido: "Diga o que você precisa" · "Converse com o seu squad"
- Link: "Veja o Squad trabalhando"

**CTA principal:** "Começar com o squad". Na R32 o botão é "Criar conta grátis"; este documento não troca o botão implementado. A troca depende do dono (pergunta P1 do relatório), porque "grátis" é condição comercial e o preço ficou por último.

**Definição da HelloSquad (texto de GEO, logo abaixo do H1, no HTML inicial):**

> A HelloSquad é uma equipe de marketing com inteligência artificial para pequenos e médios negócios. São sete especialistas que compartilham a memória da sua marca e trabalham de forma coordenada: você pede numa conversa, o squad organiza e entrega, e as decisões continuam com você. Aprovar, autorizar e confirmar são sempre escolhas suas.

O catálogo do app já tem uma definição equivalente (`site.json`, chave `definition`, que começa por "A HelloSquad funciona como…"). A versão acima começa por "A HelloSquad é…", que é a forma que os assistentes de IA citam como definição. Qualquer uma das duas atende; a escolha é do Aranha com o Thor.

## 2. O squad

**Copy aprovada (R32):** "Sete agentes especialistas que conhecem sua marca e trabalham juntos, da estratégia à execução." · "Você toma as decisões. Eles fazem o trabalho."

**Resumo citável (lista no HTML, mesmo que o desenho mostre as figuras):**

- **Nexo**, coordenação: recebe o pedido, monta o time e acompanha cada etapa.
- **Bia**, estratégia: diagnóstico, posicionamento e plano de marketing com prioridades.
- **Kaia**, marca e criação: peças, carrosséis e identidade visual no padrão da marca.
- **Otto**, conteúdo: calendário, legendas, roteiros e artigos com a voz da marca.
- **Kiwi**, Growth Marketing: anúncios, buscadores e conversão, dentro do teto que você autorizar.
- **Max**, CRM: reativação, fidelização e jornadas só para quem consentiu.
- **Íris**, resultados: números com fonte e período, leitura clara e próximo passo.

Cada nome linka para `/squad/<agente>`.

## 3. Do pedido à entrega

**Copy aprovada (R32):** "Do pedido à entrega. Tudo em uma conversa." · "Veja como uma simples conversa mobiliza os especialistas certos, organiza o trabalho e coloca as decisões nas suas mãos."

**Resumo citável:**

1. Você diz o que precisa, com as suas palavras.
2. O Nexo transforma o pedido num trabalho e chama os especialistas certos.
3. Os especialistas produzem usando o que a sua marca já decidiu.
4. Você revisa, pede ajuste ou aprova. Publicar, enviar e investir pedem autorização separada.

Link: "Entenda como funciona" → `/como-funciona`.

**Texto alternativo da demonstração** (a simulação é animada; o texto garante que robôs e leitores de tela entendam o que ela mostra): "Demonstração com dados fictícios: a padaria Miolo pede uma campanha de Natal. O Nexo organiza o trabalho, a Bia define o conceito 'O Natal que leva tempo', a Kaia e o Otto preparam as peças e os textos e a Kiwi propõe a divulgação. Nada é publicado, enviado ou investido sem a aprovação da dona do negócio."

## 4. Sete especialistas disponíveis

**Copy aprovada (R32):** "Sete especialistas disponíveis" · "24 horas por dia, 7 dias por semana." e o texto de cada cartão.

Ajuste já decidido pelo Vic (15/10), não por este documento: o cartão da Kiwi mostra **Growth Marketing** no lugar de "Mídia e Performance".

## 5. Modo Autônomo

**Copy aprovada (R32):** "Seu marketing, em modo autônomo." e as quatro rotinas de exemplo.

**Resumo citável:** "No Modo Autônomo, você delega uma responsabilidade recorrente, como preparar os posts da semana ou acompanhar os resultados todo dia. O squad combina com você o escopo, a frequência e os limites, e cada ciclo fica registrado. Você pode pausar ou revogar a qualquer momento, e nada sai para fora sem a autorização que você deu."

## 6. Memória da Marca

**Copy aprovada (R32):** "Um Squad que conhece sua marca. E aprende a cada nova interação." · "Sua marca, seus objetivos e suas decisões viram conhecimento compartilhado. Assim, cada especialista trabalha com mais contexto a cada interação."

**Resumo citável:** "A Memória da Marca guarda o que o seu negócio já decidiu: público, tom de voz, canais, produtos, palavras que você não usa e correções que você fez. Todos os especialistas consultam a mesma memória, então você não precisa repetir o briefing. O que o squad percebe sozinho entra como sugestão e só vira regra quando você confirma."

## 7. Resultados

**Copy aprovada (R32):** "Seus resultados revelam oportunidades. Seu Squad transforma em ação."

**Resumo citável:** "A Íris lê os números dos canais que você conectou, sempre com fonte, período e unidade, e explica o que mudou em linguagem simples. Quando a causa não está clara, ela diz isso. A recomendação vira trabalho para o especialista certo, e qualquer mudança de verba só acontece com a sua autorização."

## 8. Comparativo

**Copy aprovada (R32):** "Mais do que ferramentas. Um Squad trabalhando por você." e a tabela (softwares tradicionais, assistentes de IA genéricos, HelloSquad) como está no protótipo. A tabela deve estar em HTML de tabela (`<table>`), não em imagem: os assistentes de IA citam tabelas comparativas com frequência.

## 9. Perguntas

**Copy aprovada (R32):** "Dúvidas antes de começar? A gente responde."

Mostrar seis perguntas curtas da `/faq` (1, 2, 7, 8, 9 e 12 de `faq.md`, as mesmas da R32 sem a de créditos) com link "Ver todas as perguntas" → `/faq`. A pergunta da R32 "Posso começar gratuitamente? Como funcionam os créditos?" fica fora até o dono decidir preço (pergunta P2 do relatório). O `FAQPage` em JSON-LD fica só na `/faq`.

## 10. Encerramento

CTA: **"Começar com o squad"** (ver P1). Linha de apoio: "Diga o que você precisa e o squad começa por aí." (copy aprovada da R32, do modal de cadastro).
