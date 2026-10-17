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
| 0 | Abertura do progresso | feito | este |
| 1 | Detalhe da conta: entrar no ambiente (motivo + duração), sessão ativa com tempo restante e Encerrar, "Ver como o cliente", ajustar crédito (idempotency_key, saldo antes/depois), suspender/reativar; estado `suspended` e filtro na lista | em andamento | |
| 2 | Catálogo (preço e venda, homologação, à venda com 409 honesto); Planos e recargas (versão nova, trava "preço aprovado", versões anteriores só leitura) | pendente | |
| 3 | Fila (reenfileirar, cancelar com motivo); Pagamentos (reprocessar, marcar conciliação) | pendente | |
| 4 | Confirmação, motivo, resultado na tela, auditoria sem recarregar; rótulos pt-BR/en/es | pendente | |
| 5 | Vitest, e2e (worktree `/tmp`), lado a lado, relatório | pendente | |
