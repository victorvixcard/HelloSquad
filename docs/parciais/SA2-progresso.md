# SA2 — UI do Super Admin (leitura) · progresso

Aranha (Frontend & Design), 16/10/2026, início 21:50. Área: `apps/web` (rota `/admin`), `packages/ui` (se preciso) e os documentos da fatia. Em paralelo com a SA3a do Stark (`apps/backend`, `supabase/`, `squad/`).

## PASSO 0 (lido)

- `docs/DIRETRIZES_DO_DONO.md`: Super Admin na mesma aplicação (`/admin`), mesma API, mesmo banco; branding e DS do HelloSquad; preço por último (provisório sempre marcado); segredo nunca no painel; textos novos nos 3 catálogos.
- `docs/PLANO_DE_ACAO_SA.md` (linha SA2), `docs/SUPER_ADMIN.md` §1, §2, §4.
- `docs/parciais/SA0-relatorio.md` §1, §3, §4: etiqueta "Super Admin" no lugar da DEMO, faixa de 2FA em todas as páginas, Kiwi = Growth Marketing, "Provisório"/"Exemplo".
- `docs/parciais/SA1-relatorio.md` §1 e §6: mapa protótipo → API, rótulos por código, cursor, o que não existe no banco.
- `docs/parciais/A1f-relatorio.md` e `A2c-relatorio.md` §1: casca, middleware, resolvedor de idioma, `X-Robots-Tag` em `/admin/*`.

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 1 | Entrada e casca (`/admin`, middleware `GET /admin/me`, 403 honesto, `noindex`, etiqueta, barra lateral, faixa 2FA, menu da pessoa, catálogo) | feito | `0a42d16`, `9416b19`, `892fbf0` |
| 2 | Contas + detalhe da conta | feito | `c9d8d26`, `3d6954b` |
| 3 | Catálogo + Planos e recargas | feito | `8afeae3` |
| 4 | Pagamentos + Auditoria + Fila de trabalhos | feito | `97e1746`, `54943a3` |
| 5 | Modelos e custos | feito | (este commit) |
| 6 | Vitest, e2e (worktree `/tmp`), lado a lado, relatório | em andamento | |
