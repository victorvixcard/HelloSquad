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
