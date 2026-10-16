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
| 0 | Progresso aberto | ✅ | `b72d7a6` |
| 1 | Resolvedor de idioma (pessoa → negócio → pt-BR) + `X-NEXT-INTL-LOCALE` pelo middleware | ✅ | `4feee63` |
| 2 | Seletor de idioma no menu da conta (`updateUser` + `refreshSession`) e do negócio (aviso padrão, sem API) | ✅ | `bf7b186`, `9f4f795` |
| 3 | Catálogos `en` e `es` (sub-agentes, revisão minha) + paridade de chaves, argumentos e marcas do português | ✅ | en 9 commits, es 5, `304c59f` |
| 4 | `/en` e `/es` com `hreflang` e sitemap | ✅ | `4feee63` |
| 5 | Onboarding progressivo (cartão da V4.6 com progresso real, objetivo pelo Nexo → Memória) | ✅ | `fc241b6`, `e04a0fb` |
| 5b | "Adicionar conhecimento" e "contar agora" ligados à rota da S1f | ✅ | `dc37439` |
| 5c | Artigo do agente e textos fixos que vazavam no en/es | ✅ | `630b87f`, `9c5d0a2` |
| 6 | Vitest + e2e (Pedro onboarding; Marina en e volta; /en e /es) + build + `make e2e` | ✅ | `1a8e252`, `2d38c50`, `03f64f5`, `a5e3024` |
| 7 | Lado a lado em `docs/parciais/a2a/` + relatório | ✅ | `39f764f`, este |

Fechada às 15:26: `make test-web` exit 0 (web 181, ui 49, contracts 9); `make e2e` exit 0 (13/13, build de produção, `/` estática).
Relatório: `A2a-relatorio.md`.
