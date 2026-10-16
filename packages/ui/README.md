# @hellosquad/ui — Design System HelloSquad

Tokens, fontes e primitivos React do Design System oficial (handoff V4.6, `design/handoff-v4.6/product-ui/ds/hellosquad/`). Nada aqui é redesenho: valores, agentes, olhos e ícones são extraídos por script das fontes do handoff, e testes falham se o gerado ficar defasado.

Princípios do DS: interface neutra (Papel, Branco, Tinta); a cor de um agente só entra quando ele está presente; movimento com propósito, respeitando `prefers-reduced-motion`.

## Como usar no web

O pacote é consumido como código-fonte TypeScript pelo workspace pnpm (`"@hellosquad/ui": "workspace:*"` e `transpilePackages` no `next.config.ts`).

```css
/* app/globals.css */
@import "tailwindcss";
@import "@hellosquad/ui/tokens.css"; /* variáveis --hs-* geradas de tokens.json */
@import "@hellosquad/ui/styles.css"; /* CSS dos componentes, portado do bundle.css do DS */
```

```tsx
import { Agent, Button, CommandField, StatePill } from "@hellosquad/ui";
```

Fontes: Gabarito e JetBrains Mono em `src/fonts/` (woff2 variável, subconjunto latino, licença OFL ao lado). O web carrega com `next/font/local` (`apps/web/app/fonts.ts`) e liga às variáveis `--hs-font-display` e `--hs-font-mono`. Nada de Google Fonts.

## Geração e fontes da verdade

| Gerado | Fonte | Comando | Teste de defasagem |
|---|---|---|---|
| `src/tokens.css`, `src/tokens.ts` | `ds/hellosquad/tokens.json` | `pnpm --filter @hellosquad/ui build:tokens` | `test/tokens.test.ts` |
| `src/generated/agents.ts` (corpo, contorno e olhos dos 7 agentes; squad) | objeto `D` do `ds/hellosquad/components/bundle.js` e `squad/*/agent.yaml` | `pnpm --filter @hellosquad/ui extract:ds` | `test/generated.test.ts` |
| `src/generated/icons.ts` (11 ícones de traço) | objeto `D.icons` do `bundle.js` | idem | idem |
| `src/generated/product-ui.ts` (glifos de status, ícones da barra lateral) | `ProductUIV4.dc.html` (`WK_SG`, `RIC5`, `IC.nav`, `IC.panel`) | idem | idem |

`pnpm --filter @hellosquad/ui generate` roda os dois. Variáveis CSS: cores mantêm o nome do JSON (`--hs-papel`, `--hs-coord`…); escalas ganham o prefixo (`--hs-s-4`, `--hs-r-pilula`, `--hs-e1-tecla`, `--hs-t-toque`, `--hs-e-saida`); estilos de texto viram `--hs-type-<nome>-size|weight|tracking|leading`. No TS: `tokens.color["hs-papel"]` e `cssVar("r-campo")` → `"var(--hs-r-campo)"`.

Os nomes de token de cor dos agentes seguem o JSON oficial (`hs-midia` é a cor da Kiwi). Na interface, a área da Kiwi é **Growth Marketing** (decisão do dono, 15/10/2026), lida de `squad/kiwi/agent.yaml`.

## Componentes

### `Button`

Variantes do DS, todas em pílula: `primary` (Tinta com lábio, a ação principal da tela), `secondary` (transparente com o play), `soft` (pílula branca com contorno), `ghost` (só texto). Tamanhos `md` (52 px) e `s` (40 px). O primário tem estados `loading` e `done` com os olhos do squad e não dispara de novo enquanto ocupado.

```tsx
<Button type="submit" state={pending ? "loading" : "rest"} loadingLabel="Entrando">Entrar</Button>
<Button href="/criar-conta" linkAs={Link}>Criar conta grátis</Button>
<Button variant="secondary">Veja o Squad trabalhando</Button>
<Button variant="soft" size="s">Abrir a Sala do Squad</Button>
<Button variant="ghost" size="s" icon={null}>Cancelar</Button>
```

### `CommandField`

O campo de pedido. Enter envia, Esc limpa, o envio só acende com texto. `sending` mostra o Nexo assumindo (olhos no botão). `disabled` + `note` explicam por que ainda não dá para pedir (a nota é ligada ao campo por `aria-describedby`).

```tsx
<CommandField onSend={(pedido) => enviar(pedido)} />
<CommandField disabled note="Disponível na Fase 1: o squad ainda não responde por aqui." />
```

### `StatePill`

Dois usos, ambos do produto:

- **Estado** (V4.6, "um desenho por estado"): `awaiting_you` (Aguardando você, o único escuro, coral no glifo), `in_progress` (Em andamento), `scheduled` (Programado), `done` (Concluído), `paused` (Pausado, tracejado), `blocked` (Bloqueado, hachura), `failed` (Erro, coral claro). Sempre glifo e texto, nunca só cor.
- **Presença** (StatePill do DS): agente, ação e detalhe.

```tsx
<StatePill state="awaiting_you" />
<StatePill state="in_progress" label="Em produção" />
<StatePill agent="bia" label="Estratégia" detail="desenvolvendo o plano" thinking />
```

### `Agent`

Silhueta e olhos oficiais de cada agente (`nexo`, `bia`, `kaia`, `otto`, `kiwi`, `max`, `iris`). Tamanhos `mini` (16 px), `padrao` (24 px) ou um número; o corte óptico dos olhos acompanha o tamanho, como no DS. Expressões: `oval`, `big`, `happy`, `wink`, `serio`, `sleep`. `thinking` anima o olhar. Sem `title`, é decorativo; os agentes nunca viram ícone de interface genérico.

```tsx
<Agent agent="nexo" size="mini" />
<Agent agent="iris" size={96} expression="happy" title="Íris" />
```

### `Icon`

Os 11 ícones de traço do DS (grade 18, traço 1,9 px, `currentColor`): `arrow` (seta), `up` (enviar), `plus` (mais), `check`, `chev` (abrir), `left` (voltar), `right` (avançar), `close` (fechar), `enter`, `more` (opções), `play`. Decorativo por padrão; com `title`, vira imagem acessível. `NavIcon` traz os ícones dos destinos da barra lateral V4.6.

```tsx
<Icon name="arrow" />
<Icon name="close" title="Fechar" />
<NavIcon name="home" />
```

### `AgentDot`

A cor de um agente num ponto de 7 px (o ponto dos chips do DS), com contorno fino para as cores claras. Decorativo por padrão: o nome do agente deve estar no texto ao lado.

```tsx
<AgentDot agent="kiwi" /> Kiwi
```

### Squad

`SQUAD`, `AGENT_IDS`, `getAgent(id)`, `isAgentId(valor)` e `withArticle(id)` ("a Íris") expõem a identidade de `squad/*/agent.yaml` (nome, artigo, área, papel, cor, tinta suave, forma).

## Testes

```bash
pnpm --filter @hellosquad/ui test       # Vitest + Testing Library
pnpm --filter @hellosquad/ui typecheck
```
