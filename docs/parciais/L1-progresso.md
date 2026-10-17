# L1 — Progresso (Aranha)

**Fatia:** L1, Landing V1 (R32) fiel, com efeitos e animações. **Início:** 17/10/2026 07:37. **Alvo:** 75 min.
**Regra:** segue o protótipo sempre; seção animada na R32 → porta-se o motor (por script, como a A1f), não se substitui.
**Escopo de escrita:** `apps/web`, `packages/ui`, docs da fatia (`docs/parciais/L1-*`, `docs/parciais/l1/`).
Build e e2e só no worktree `/tmp/l1-wt` (3200/8200); o `next dev` do dono na 3100 fica no ar.

## Linha do tempo

| Hora | Item | Estado |
|---|---|---|
| 07:37 | PASSO 0: briefing L1, DIRETRIZES, A1f §1–§3/§6, A2c §1/§4, A0 (Hero), README do handoff §C | lido |
| 07:39 | Progresso aberto | ok |
| 07:42 | Item 1: inventário por script (`docs/parciais/l1/inventario.md`) | ok (`89ed08f`) |
| 07:46 | Item 2a: `packages/ui/scripts/extract-landing.ts` → `landing.css`, `landing-template.ts`, `landing-logic.ts`, `ds-bundle-runtime.ts` | ok (`dbb115a`) |
| 07:50 | Item 2b: interpretador `packages/ui/src/landing/runtime.tsx` (semântica do `support.js`), `/` = R32 portada, SSR testado | ok (`c247087`) |
| 07:51 | Navegador (next dev 3100, Playwright 1440×900): Hero digita sozinho ("Criar uma campanha para o fim de s…" aos ~5 s), sequência "Nexo está montando seu squad", **0 erros de console** | ok |
| 07:55 | Nenhum fornecedor: trocas neutras exatas (tabela `NEUTRAL`), logotipos do comparativo fora | ok (`b12ca72`) |
| 07:57 | Testes da landing (seções na ordem, SSR, sem fornecedor) | ok (`8be50ff`) |
| 08:02 | Vitest dos motores (dispara ~3 s, para ao escrever, faixa para no cursor/foco, movimento reduzido) | ok (`fedbd66`) |
| 08:04 | Lighthouse mobile 1ª medição: `/` 83, `/en` 81 (A2c: 98); otimização sem tirar animação (subárvores estáticas) | ok (`057b0d7`) |
| 08:10 | en/es por dicionário (856 strings, lista gerada por script) | ok (`d7bbf58`) |
| 08:13 | Prova: vídeos 1440/390 e capturas por seção lado a lado em `docs/parciais/l1/` | ok (`dcef306`) |
| 08:15 | E2e do site atualizado para a R32 | ok (`944f9ef`) |
| 08:18 | en/es traduzidos na fonte (o Hero digita no idioma) + defasagem da extração | ok (`f855880`, `6b5a686`, `f737bb0`) |
| 08:25 | Build do worktree em `f737bb0` (`/` ○, 210 kB), e2e do site 6/6, Lighthouse final (mediana `/` ≈ 83, `/en` ≈ 81) | ok |
| 08:28 | `make test-web` no HEAD `0d87ff9`: exit 0 (contracts 9, ui 53, web 502) | ok |
| 08:31 | Relatório `docs/parciais/L1-relatorio.md` | ok |
| 08:32 | Limpeza: 3200 e 9334 parados por PID, worktree removido; 3100 do dono no ar (GET / 200) | ok |
