# HelloSquad

Sete agentes especialistas que trabalham juntos no marketing do seu negócio — e uma interface neutra, silenciosa e precisa para conversar com eles.

Este é o Design System oficial da HelloSquad, consolidado do **Design System V1** aprovado no canvas *Exploração 01* (pranchetas A1–A9, B1–B3, C1–C5). Valores, desenhos e comportamentos foram levados **sem redesenho**: os agentes, os olhos, as cores e os componentes são os mesmos arquivos e números das pranchetas.

> **Wordmark provisório.** O logotipo “HelloSquad” ainda é texto vivo em Gabarito ExtraBold 800 (tracking −0,02em). Ele vale como referência até a entrega do SVG definitivo; não há arquivo de logotipo neste sistema e nenhum deve ser recriado por aproximação.

## Princípios

1. **Neutro por padrão.** Papel, Branco e Tinta resolvem a interface sozinhos. Ela funciona sem os personagens e sem animação.
2. **Agentes dão vida.** A cor entra quando um especialista está envolvido. Os olhos dizem como está o trabalho.
3. **Movimento com propósito.** Nada se move sem motivo. Toque, foco e eventos reais disparam o movimento; o resto descansa.

## Voz e conteúdo

- Português do Brasil, segunda pessoa, frases curtas. O squad fala do trabalho, não de si: “Estratégia desenvolvendo o plano”.
- A pessoa decide, o squad executa: “Você toma as decisões. Eles fazem o trabalho.”
- Botões começam por verbo e dizem o resultado: “Criar conta grátis”, “Aprovar e publicar”.
- Status nomeia o agente responsável e a ação em andamento, sem jargão técnico. Horários em mono curto: `09:12`, `seg, 9h`.
- Sugestões são pedidos naturais de quem tem um negócio: “Vender mais neste fim de semana”.
- Sem emojis, exclamações em série ou promessas vagas.

## Fundamentos visuais, em resumo

| Fundamento | Regra | Tokens |
|---|---|---|
| Cor da interface | Papel de fundo, Branco nas superfícies, Tinta no texto e na ação principal | `hs-papel`, `hs-branco`, `hs-tinta`, `hs-tinta-suave` |
| Cor dos agentes | Só quando o agente está presente; nunca como cor de UI genérica | `hs-coord` … `hs-dados` |
| Linhas | Três forças de contorno a partir da Tinta | `hs-l1`, `hs-l2`, `hs-l3`, `hs-lip` |
| Tipografia | Gabarito para tudo; JetBrains Mono para rótulos, horários e código | `display`, `mono` |
| Forma | Pílula para tudo que se toca; raios nomeados pelo uso | `r-pilula`, `r-campo`, `r-menu` … |
| Elevação | Sombras planas (lábio); sombra difusa só no que flutua | `e1-apoiado`, `e1-tecla`, `e2-flutuante` |
| Movimento | Quatro durações e três curvas | `t-toque` … `t-fluido`, `e-saida`, `e-mola`, `e-precisa` |

Detalhes em *Marca e agentes*, *Fundamentos visuais*, *Movimento e interatividade*, *Status vivo do squad*, *Modo autônomo* e *Implementação*.

## Iconografia

Onze ícones de traço (1,9 px, pontas e junções arredondadas, grade 18 × 18) em `currentColor`: seta, enviar, mais, check, abrir, voltar, avançar, fechar, enter, opções e play. Use o componente `Icon`; os SVGs em Tinta estão em `assets/Icones`. Os agentes nunca viram ícone de interface: no lugar de um ícone de “pessoa” ou “bot”, use o `Agent` em tamanho mini.

## Como usar

Carregue `components/bundle.css` e, depois de React 18, `components/bundle.js`; os componentes ficam em `window.HelloSquad` (`HelloSquad.Button`, `HelloSquad.SquadStatus`…). Os valores vêm de `tokens.css` (gerado de `tokens.json`); o bundle traz os mesmos valores como reserva. As fontes são do Google Fonts (Gabarito 400–800, JetBrains Mono 400–500), importadas pelo próprio `bundle.css`.

## Origem

| Área | Pranchetas no canvas *Exploração 01* |
|---|---|
| A · Brand Foundations | A1 Marca e agentes · Color Foundations · Tipografia · Hello Animation · Expressões do squad e do Coordenador · Motion 07 · Interações 01 · Agent Glow System |
| B · UI Foundations | B1 UI Foundations R1 · B2 Tokens · B3 Preview interativo |
| C · Squad Experience | C1 Comportamento · C2 Status vivo · C3 Modo autônomo · C4 Preview interativo · C5 Autonomous Mode |
