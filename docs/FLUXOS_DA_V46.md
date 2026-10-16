# Fluxos da V4.6 — especificação derivada do protótipo

**Fatia X1 · 16/10/2026.** Fonte: `design/handoff-v4.6/product-ui/ProductUIV4.dc.html` (Product UI V4.6), `MioloPeca.dc.html` e `landing/LandingPageV1.dc.html` (Landing V1 R32). Este documento é o **PASSO 0 de toda fatia de produto**: antes de perguntar ao dono, procure aqui. O que está aqui é o combinado (regra do dono, `docs/DIRETRIZES_DO_DONO.md`); o que o protótipo não responde está na §11 e só isso vira pergunta.

## Como ler

- Texto entre aspas é o **rótulo exato do protótipo**, copiado do código. Não troque palavra, maiúscula nem pontuação.
- `(L1234)` é a linha em `ProductUIV4.dc.html`; `(Land L1234)` é a linha na landing. Os extratos por linha ficam em `docs/parciais/x1/out/` (regenerar com `python3 docs/parciais/x1/extract.py`); as notas de leitura, em `docs/parciais/x1/notas_*.md`.
- O protótipo é feito em **camadas**: classe base V3 (L6408–9587) e camadas V4, V4.1, V4.2, V4.3, V4.4, V4.5 e V4.6 que sobrescrevem métodos com `Object.assign(Component.prototype, …)`. **Vale a camada mais tardia.** Quando a V4.x reaproveita a V3, isto é dito.
- Tudo no protótipo é simulado: "Nada é publicado, enviado ou pago." (L5612). Relógio fixo em segunda, 12/10/2026, a partir de 10:24 (L6404). Respostas dos agentes são roteiros locais, sem IA.

## Os sete agentes (objeto `AG`, L5627–5684, com os ajustes da V4.2 em L11317–11327)

| id interno | Nome | Tratamento | Área no produto (ambiente) | Cor | Fala de apresentação ("pitch") | Colabora com (`with`) |
|---|---|---|---|---|---|---|
| `coord` | Nexo | "o Nexo" | "Projetos" (`proj`) · "Coordenação de Marketing" | `#FF4D1F` | "Organizo o squad e te chamo só quando a decisão é sua." | todos |
| `arch` | Bia | "a Bia" | "Estratégia" (`strat`) · "Estratégia e Inteligência" | `#8A3BFF` | "Encontro onde está a oportunidade da Miolo." | Kaia, Otto, Kiwi |
| `leaf` | Kaia | "a Kaia" | "Marca & Criação" (`brand`) · "Marca e Criação" | `#FF2E9A` | "Dou forma à marca da Miolo em cada peça." | Bia, Otto |
| `pill` | Otto | "o Otto" | "Conteúdo" (`cont`) · "Conteúdo e Comunicação" | `#FFE11A` | "Mantenho a Miolo presente, com a voz dela." | Kaia, Bia |
| `hex` | Kiwi | "o Kiwi" (no protótipo); **"a Kiwi"** por decisão do dono de 15/10 | "Growth" (`media`, id interno mantido) · "Growth Marketing" | `#B6FF2E` | "Faço a Miolo crescer: mais gente encontrando, mais visitas virando encomendas." | Kaia, Íris |
| `funnel` | Max | "o Max" | "CRM" (`crm`) · "CRM e Relacionamento" | `#00E5C3` | "Faço os clientes da Miolo voltarem." | Otto, Íris |
| `square` | Íris | "a Íris" | "Resultados" (`res`) · "Dados e Resultados" | `#1F5BFF` | "Leio os números e digo o que fazer com eles." | Kiwi, Max, Bia |

Na V4, cada especialista passa a ser apresentado pela especialidade do seu ambiente ("Nexo · Projetos", "Kaia · Marca & Criação") (L9617–9618). Cada agente tem `hi` ("Oi, eu sou o Nexo."), `intro`, quatro `skills` e três pedidos de exemplo (`asks`), que aparecem na camada de identidade do ambiente e como sugestões.

> Divergência registrada (não resolvida aqui): o protótipo trata o Kiwi no masculino ("o Kiwi", `art: 'o'`, L5661); a decisão do dono de 15/10 é "a Kiwi". O código de produto segue o dono; o Diogo precisa ajustar a próxima versão do protótipo.

<!-- seções 1 a 11 em redação -->
