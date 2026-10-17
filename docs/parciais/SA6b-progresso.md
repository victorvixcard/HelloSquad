# SA6b — UI das ações de escrita do Super Admin · progresso

Aranha (Frontend & Design), 16/10/2026, início 23:46. Área: `apps/web` (detalhe e lista de Contas, Catálogo, Planos e recargas, Fila, Pagamentos, Auditoria, ações de servidor, catálogo `admin` nos 3 idiomas, testes), `packages/ui` (se preciso) e os documentos da fatia. Sozinha na árvore. Sem sub-agentes.

## PASSO 0 (lido)

- `docs/DIRETRIZES_DO_DONO.md`: toda ação com motivo e auditoria; sessão de suporte só leitura; preço por último (provisório marcado, trava "preço aprovado"); i18n nos 3 catálogos; nada do combinado muda.
- `docs/PLANO_DE_ACAO_SA.md` (linha SA6) e `docs/SUPER_ADMIN.md` §2 (ações de Contas, Catálogo, Planos, Pagamentos, Fila) e §4 (sessão de suporte com motivo, tempo limitado e registro).
- `docs/parciais/SA0-relatorio.md` §4 itens 6 e 7 (sessão 15/30/60 com motivo ≥ 10; motivo também em cancelar run e marcar conciliação) e o protótipo `design/super-admin-proto/` (diálogos de motivo e duração).
- `docs/parciais/SA6a-relatorio.md` §1 e §6 (mapa ação → rota, erros 422/409/404), `SA2-relatorio.md` §1 (botões "chega na SA6") e `SA4b-relatorio.md` §1 (diálogo com motivo do "informar saldo").

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | Abertura do progresso | feito | `6894456` |
| 1 | Detalhe da conta: entrar no ambiente (motivo + duração), sessão ativa com tempo restante e Encerrar, ajustar crédito (idempotency_key, saldo antes/depois), suspender/reativar; estado `suspended` e filtro na lista. "Ver como o cliente" **não entrou**: o produto resolve o negócio pelos memberships de `GET /me` (`app/app/[workspace]/layout.tsx` → `notFound()`), então não aceita a sessão de suporte (registrado no relatório) | feito | `be834c8`, `8b91c14`, `15d9d29`, `cb91bd1` |
| 2 | Catálogo (preço, homologação, à venda com 409 honesto) por delivery; Planos e recargas (versão nova, trava "preço aprovado", histórico das versões gravadas pelo painel, só leitura) | feito | `7f04d82`, `8a1e0dc` |
| 3 | Fila (reenfileirar, cancelar com motivo, na lista e no run); Pagamentos (reprocessar com o resultado, marcar conciliação) | feito | `2b63d96` |
| 4 | Confirmação, motivo com contador, resultado na tela (aviso na casca), auditoria da tela relida sem recarregar; etiqueta "Ações com motivo e auditoria"; rótulos pt-BR/en/es | feito | `8b91c14`, `954a201` |
| 5 | Vitest (17), e2e (2, worktree `/tmp/sa6b-wt`, web na 3200), lado a lado, relatório | em andamento | `fe5f9e0`, `b99b233` |
