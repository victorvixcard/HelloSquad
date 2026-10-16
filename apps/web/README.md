# apps/web

Next.js 15 (App Router, TypeScript, Tailwind, ESLint) do HelloSquad: site público e app autenticado.

Roda local na porta **3100**. Como subir o ambiente completo: [`docs/SETUP_LOCAL.md`](../../docs/SETUP_LOCAL.md).

```bash
pnpm --filter web dev        # http://127.0.0.1:3100
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

Esta pasta ainda é o esqueleto da J0. Design System, login e shell do app chegam na fatia A0.
