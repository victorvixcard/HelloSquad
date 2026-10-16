---
rota: /en
idioma: en
alternates: { pt-BR: /, en: /en, es: /es, x-default: / }
title: "HelloSquad: the AI marketing team for your business"
description: "HelloSquad is an AI marketing team for small and medium-sized businesses: seven specialists who know your brand and work together. You make the decisions."
jsonld: [Organization, WebSite, SoftwareApplication]   # README §5.1
cta: "Start with the squad"   # proposta (P1 do relatório); o botão implementado segue o da R32 até o dono decidir
---

# Home page (`/en`)

A página inicial em inglês é a **Landing V1 R32**, já aprovada, com o texto do catálogo `apps/web/messages/en/`. Este arquivo não reescreve a landing: indica, seção por seção, o que é **copy aprovada** (valor literal do catálogo en, não muda), o que é **copy aprovada (R32), tradução proposta** (a string pt-BR ainda não está no catálogo) e o que é **texto de SEO/GEO** proposto para o HTML inicial sem alterar o desenho (parágrafo de definição, textos alternativos, resumo de cada seção para quem lê sem animação). Ordem das seções igual à da R32.

<!-- O title acima traz a palavra-chave "AI marketing team". O catálogo tem `site.json`, título de metadados = "HelloSquad: your AI squad takes over the marketing"; trocar ou não é decisão do dono (P3). -->

## 1. Above the fold

**Copy aprovada (R32):**

- H1: **You run your business. Your AI squad takes over the marketing.** (`site.json`, `home.heroLine1` + `home.heroLine2`)

**Copy aprovada (R32), tradução proposta:**

- Campo de pedido: "Say what you need" · "Talk to your squad"
- Link: "See the squad at work"

**CTA principal:** "Start with the squad". Na R32 o botão usa o texto de `site.json`, chave `home.signUp`; este documento não troca o botão implementado. A troca depende do dono (pergunta P1 do relatório), porque aquele texto traz condição comercial, e a parte comercial ficou por último.

**Definição da HelloSquad (texto de GEO, logo abaixo do H1, no HTML inicial):**

> HelloSquad is an AI marketing team for small and medium-sized businesses. Seven specialists share your brand's memory and work in coordination: you ask in a conversation, the squad organizes and delivers, and the decisions stay with you. Approving, authorizing and confirming are always your call.

O catálogo do app já tem uma definição equivalente (`site.json`, chave `definition`, que começa por "HelloSquad works like…"). A versão acima começa por "HelloSquad is…", que é a forma que os assistentes de IA citam como definição. Qualquer uma das duas atende; a escolha é do Aranha com o Thor.

## 2. The squad

**Copy aprovada (R32), tradução proposta:** "Seven specialist agents who know your brand and work together, from strategy to execution."

**Copy aprovada (R32):** "You make the decisions. They do the work." (`site.json`, `home.note`)

**Resumo citável (lista no HTML, mesmo que o desenho mostre as figuras):**

- **Nexo**, coordination: takes your request, builds the team and follows every step.
- **Bia**, Strategy: assessment, positioning and a marketing plan with clear priorities.
- **Kaia**, Brand & Creative: posts, carousels and visual identity that match your brand.
- **Otto**, Content: calendar, captions, scripts and articles in your brand's voice.
- **Kiwi**, Growth Marketing: ads, search engines and conversion, within the cap you authorize.
- **Max**, CRM: reactivation, loyalty and journeys, only for people who opted in.
- **Íris**, Results: numbers with source and period, a clear reading and the next step.

Cada nome linka para `/en/squad/<agente>`.

## 3. From request to delivery

**Copy aprovada (R32), tradução proposta:** "From request to delivery. All in one conversation." · "See how one simple conversation brings in the right specialists, organizes the work and puts the decisions in your hands."

**Resumo citável:**

1. You say what you need, in your own words.
2. Nexo turns the request into a piece of work and calls in the right specialists.
3. The specialists produce using what your brand has already decided.
4. You review, ask for changes or approve. Publishing, sending and spending each need a separate authorization.

Link: "See how it works" → `/en/how-it-works`.

**Texto alternativo da demonstração** (a simulação é animada; o texto garante que robôs e leitores de tela entendam o que ela mostra): "Demo with fictitious data: Miolo, a bakery, asks for a Christmas campaign. Nexo organizes the work, Bia sets the concept 'Christmas Takes Time', Kaia and Otto prepare the visuals and the copy, and Kiwi proposes how to get the word out. Nothing is published, sent or spent without the owner's approval."

## 4. Seven specialists available

**Copy aprovada (R32):** "Seven specialists available" · "24 hours a day, 7 days a week." (`site.json`, `home.squadTitleLine1` e `home.squadTitleLine2`) e o texto de cada cartão, como está no catálogo en.

Ajuste já decidido pelo Vic (15/10), não por este documento: o cartão da Kiwi mostra **Growth Marketing** no lugar de "Mídia e Performance".

## 5. Autonomous Mode

**Copy aprovada (R32), tradução proposta:** "Your marketing, in Autonomous Mode." e as quatro rotinas de exemplo.

**Resumo citável:** "In Autonomous Mode, you hand off a recurring responsibility, like preparing the week's posts or tracking results every day. The squad agrees with you on scope, frequency and limits, and every cycle is logged. You can pause or revoke it at any time, and nothing goes out without the authorization you gave."

## 6. Brand Memory

**Copy aprovada (R32), tradução proposta:** "A squad that knows your brand. And learns with every interaction." · "Your brand, your goals and your decisions become shared knowledge. So every specialist works with more context, every time."

**Resumo citável:** "Brand Memory keeps what your business has already decided: audience, tone of voice, channels, products, words you never use and corrections you made. Every specialist checks the same memory, so you never repeat the brief. What the squad notices on its own comes in as a suggestion and only becomes a rule when you confirm it."

## 7. Results

**Copy aprovada (R32), tradução proposta:** "Your results reveal opportunities. Your squad turns them into action."

**Resumo citável:** "Íris reads the numbers from the channels you connected, always with source, period and unit, and explains what changed in plain language. When the cause isn't clear, she says so. Her recommendation becomes work for the right specialist, and any budget change only happens with your authorization."

## 8. Comparison

**Copy aprovada (R32), tradução proposta:** "More than tools. A squad working for you." e a tabela (traditional software, generic AI assistants, HelloSquad) como está no protótipo. A tabela deve estar em HTML de tabela (`<table>`), não em imagem: os assistentes de IA citam tabelas comparativas com frequência.

## 9. Questions

**Copy aprovada (R32), tradução proposta:** "Questions before you start? We've got answers."

Mostrar seis perguntas curtas da `/en/faq` (1, 2, 7, 8, 9 e 12 de `faq.md`, as mesmas da R32 menos a comercial) com link "See all questions" → `/en/faq`. Este documento não traz a pergunta da R32 sobre condições para começar, porque a resposta depende da parte comercial; se ela sai da landing implementada é decisão do dono (pergunta P2 do relatório). O `FAQPage` em JSON-LD fica só na `/en/faq`.

## 10. Closing

CTA: **"Start with the squad"** (ver P1). Linha de apoio: "Say what you need and the squad starts from there." (copy aprovada da R32, do modal de cadastro: `auth.json`, `signUp.lead`).
