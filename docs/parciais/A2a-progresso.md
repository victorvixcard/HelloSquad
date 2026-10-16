# A2a — Progresso (Aranha)

**Fatia:** A2a, onboarding progressivo + idiomas (Fase 2). **Início:** 16/10/2026 14:47. **Escopo:** `apps/web`,
`packages/ui` e docs da fatia; nada em `apps/backend`, `supabase/`, `squad/` (S2a do Stark em paralelo).

## PASSO 0 (lido)

- `DIRETRIZES_DO_DONO.md` (ADR-0010: pt-BR, en, es; idioma por workspace e por usuário; rota por idioma com `hreflang`).
- `PLANO_DE_ACAO_FASE2.md` (linha A2a), `FLUXOS_DA_V46.md` §1, §3, §6 (primeiro acesso), §11 (itens 5 e 6).
- Documento Mestre §6 (jornada) e §14 (onboarding progressivo, conectores opcionais).
- Relatórios A1f, A1a, A1b, A1c. Protótipo extraído por `sed`/`grep` (L4642–4662 cartão, L6280 Boas-vindas do Nexo,
  L7898–7931 `_readSite`/`_connectIg`/`_setObjective`, L8480–8496 `_vOnb`, L7040 escolha `obj:`).

## O que a API tem hoje (conferido em `packages/contracts/src/schema.ts`)

- **Não há `PUT /workspaces/{id}`** e nem `GET /me` nem `GET /workspaces/{id}` devolvem `locale`
  (`workspaces.locale` existe no banco desde a S1c, mas não sai pela API). → seletor do negócio sem persistência; pedido à S2b.
- `POST /workspaces/{id}/memory/facts` (S1f): "Adicionar conhecimento", declarado e já confirmado, só o owner.
- `GET /workspaces/{id}/memory/sources`: fontes com estado (`connected`, `not_connected`…).
- Nada cria Boas-vindas do Nexo ao criar o workspace (a V4.6 tem a fala roteirizada; não invento fala de agente).

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | Progresso aberto | ✅ | este |
| 1 | Resolvedor de idioma (usuário → workspace → pt-BR) + `X-NEXT-INTL-LOCALE` pelo middleware | 🟡 | |
| 2 | Seletor de idioma no menu da conta (`updateUser` + `refreshSession`) e do negócio (sem persistência na API) | ⚪ | |
| 3 | Catálogos `en` e `es` (sub-agentes, revisão minha) + teste de paridade de chaves e argumentos | 🟡 | |
| 4 | `/en` e `/es` com `hreflang` | ⚪ | |
| 5 | Onboarding progressivo (cartão da V4.6 com progresso real, objetivo pelo Nexo → Memória) | ⚪ | |
| 6 | Vitest + e2e (Pedro onboarding; Marina en e volta) + build + `make e2e` | ⚪ | |
| 7 | Lado a lado em `docs/parciais/a2a/` + relatório | ⚪ | |
