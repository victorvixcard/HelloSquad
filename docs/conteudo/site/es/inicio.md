---
rota: /es
idioma: es
alternates: { pt-BR: /, en: /en, es: /es, x-default: / }
title: "HelloSquad: tu squad de IA se hace cargo del marketing"
description: "Equipo de marketing con IA para pequeños y medianos negocios: siete especialistas que conocen tu marca y trabajan juntos. Tú tomas las decisiones."
jsonld: [Organization, WebSite, SoftwareApplication]   # README §5.1
cta: "Empezar con el squad"   # proposta (P1 do relatório); o botão implementado segue o da R32 até o dono decidir
---

# Página de inicio (`/es`)

A página inicial em espanhol é a **Landing V1 R32**, já aprovada, com os textos do catálogo `apps/web/messages/es/`. Este arquivo não reescreve a landing: indica, seção por seção, qual texto é **copy aprovada** (não muda e vem literalmente do catálogo `es`) e qual é **texto de SEO/GEO** proposto para entrar no HTML inicial sem alterar o desenho (parágrafo de definição, textos alternativos, resumo de cada seção para quem lê sem animação). Onde a copy da R32 ainda não tem versão no catálogo `es`, o texto aparece como **Copy aprovada (R32), tradução proposta**, para o dono validar. Ordem das seções igual à da R32.

## 1. Primera pantalla

**Copy aprovada (R32):**

- H1: **Tú te ocupas de tu negocio. Tu squad de IA se hace cargo del marketing.**

**Copy aprovada (R32), tradução proposta:**

- Campo de pedido: "Cuenta qué necesitas" · "Conversa con tu squad"
- Link: "Mira al Squad trabajando"

**CTA principal:** "Empezar con el squad". Na R32 o botão tem outro texto (catálogo `site.json`, chave `home.signUp`); este documento não troca o botão implementado. A troca depende do dono (pergunta P1 do relatório), porque o texto atual do botão traz uma condição comercial e esse assunto ficou para o fim.

**Definição da HelloSquad (texto de GEO, logo abaixo do H1, no HTML inicial):**

> HelloSquad es un equipo de marketing con inteligencia artificial para pequeños y medianos negocios. Son siete especialistas que comparten la memoria de tu marca y trabajan de forma coordinada: tú pides en una conversación, el squad organiza y entrega, y las decisiones siguen siendo tuyas. Aprobar, autorizar y confirmar son siempre decisiones tuyas.

O catálogo do app já tem uma definição equivalente (`site.json`, chave `definition`, que em `es` começa por "HelloSquad funciona como…"). A versão acima começa por "HelloSquad es…", que é a forma que os assistentes de IA citam como definição. Qualquer uma das duas atende; a escolha é do Aranha com o Thor.

## 2. El squad

**Copy aprovada (R32), tradução proposta:** "Siete agentes especialistas que conocen tu marca y trabajan juntos, de la estrategia a la ejecución."

**Copy aprovada (R32):** "Tú tomas las decisiones. Ellos hacen el trabajo."

**Resumo citável (lista no HTML, mesmo que o desenho mostre as figuras):**

- **Nexo**, coordinación: recibe el pedido, arma el equipo y da seguimiento a cada etapa.
- **Bia**, estrategia: diagnóstico, posicionamiento y plan de marketing con prioridades.
- **Kaia**, marca y creación: piezas, carruseles e identidad visual con el estilo de la marca.
- **Otto**, contenido: calendario, textos de publicación, guiones y artículos con la voz de la marca.
- **Kiwi**, Growth Marketing: anuncios, buscadores y conversión, dentro del tope que tú autorices.
- **Max**, CRM: reactivación, fidelización y recorridos solo para quienes dieron su consentimiento.
- **Íris**, resultados: números con fuente y período, lectura clara y siguiente paso.

Cada nome linka para `/es/squad/<agente>`.

## 3. Del pedido a la entrega

**Copy aprovada (R32), tradução proposta:** "Del pedido a la entrega. Todo en una conversación." · "Mira cómo una simple conversación moviliza a los especialistas adecuados, organiza el trabajo y pone las decisiones en tus manos."

**Resumo citável:**

1. Dices lo que necesitas, con tus propias palabras.
2. Nexo convierte el pedido en un trabajo y llama a los especialistas adecuados.
3. Los especialistas producen con lo que tu marca ya decidió.
4. Revisas, pides ajustes o apruebas. Publicar, enviar e invertir requieren una autorización aparte.

Link: "Descubre cómo funciona" → `/es/como-funciona`.

**Texto alternativo da demonstração** (a simulação é animada; o texto garante que robôs e leitores de tela entendam o que ela mostra): "Demostración con datos ficticios: la panadería Miolo pide una campaña de Navidad. Nexo organiza el trabajo, Bia define el concepto 'La Navidad que se toma su tiempo', Kaia y Otto preparan las piezas y los textos, y Kiwi propone la difusión. Nada se publica, se envía ni se invierte sin la aprobación de la dueña del negocio."

## 4. Siete especialistas disponibles

**Copy aprovada (R32):** "Siete especialistas disponibles" · "24 horas al día, 7 días a la semana." e o texto de cada cartão (o que ainda não estiver no catálogo `es` segue como tradução proposta).

Ajuste já decidido pelo Vic (15/10), não por este documento: o cartão da Kiwi mostra **Growth Marketing** no lugar de "Mídia e Performance".

## 5. Modo Autónomo

**Copy aprovada (R32), tradução proposta:** "Tu marketing, en modo autónomo." e as quatro rotinas de exemplo.

**Resumo citável:** "En el Modo Autónomo, delegas una responsabilidad recurrente, como preparar las publicaciones de la semana o dar seguimiento a los resultados todos los días. El squad acuerda contigo el alcance, la frecuencia y los límites, y cada ciclo queda registrado. Puedes pausar o revocar en cualquier momento, y nada sale de tu negocio sin la autorización que diste."

## 6. Memoria de Marca

**Copy aprovada (R32), tradução proposta:** "Un Squad que conoce tu marca. Y aprende con cada nueva interacción." · "Tu marca, tus objetivos y tus decisiones se convierten en conocimiento compartido. Así, cada especialista trabaja con más contexto en cada interacción."

**Resumo citável:** "La Memoria de Marca guarda lo que tu negocio ya decidió: público, tono de voz, canales, productos, palabras que no usas y correcciones que hiciste. Todos los especialistas consultan la misma memoria, así que no tienes que repetir el brief. Lo que el squad detecta por su cuenta entra como sugerencia y solo se vuelve regla cuando tú lo confirmas."

## 7. Resultados

**Copy aprovada (R32), tradução proposta:** "Tus resultados revelan oportunidades. Tu Squad las convierte en acción."

**Resumo citável:** "Íris lee los números de los canales que conectaste, siempre con fuente, período y unidad, y explica qué cambió en un lenguaje sencillo. Cuando la causa no está clara, lo dice. La recomendación se convierte en trabajo para el especialista adecuado, y cualquier cambio de presupuesto solo ocurre con tu autorización."

## 8. Comparativo

**Copy aprovada (R32), tradução proposta:** "Más que herramientas. Un Squad trabajando para ti." e a tabela (en es: "Software tradicional", "Asistentes de IA genéricos", "HelloSquad") como está no protótipo. A tabela deve estar em HTML de tabela (`<table>`), não em imagem: os assistentes de IA citam tabelas comparativas com frequência.

## 9. Preguntas

**Copy aprovada (R32), tradução proposta:** "¿Dudas antes de empezar? Te respondemos."

Mostrar seis perguntas curtas da `/es/preguntas-frecuentes` (1, 2, 7, 8, 9 e 12 de `faq.md`, as mesmas da R32 sem a pergunta de condição comercial) com link "Ver todas las preguntas" → `/es/preguntas-frecuentes`. Este documento não traz essa pergunta da R32, porque a resposta depende de uma decisão comercial que ainda não foi tomada; se ela sai da landing implementada é decisão do dono (pergunta P2 do relatório). O `FAQPage` em JSON-LD fica só na `/es/preguntas-frecuentes`.

## 10. Cierre

CTA: **"Empezar con el squad"** (ver P1). Linha de apoio: "Cuenta qué necesitas y el squad empieza por ahí." (copy aprovada da R32, do modal de cadastro; catálogo `auth.json`, chave `signUp.lead`).
