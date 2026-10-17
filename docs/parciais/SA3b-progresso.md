# SA3b — UI Squad IA do Super Admin · progresso

Aranha (Frontend & Design), 16/10/2026, início 22:26. Área: `apps/web` (rotas `/admin/squad*` e `/admin/regras`), `packages/ui` (se preciso) e os documentos da fatia. Em paralelo com a SA4a do Stark (`apps/backend`, `supabase/`). Sem sub-agentes.

## PASSO 0 (lido)

- `docs/DIRETRIZES_DO_DONO.md`: mudança de SOUL/skill gera versão nova, nunca edição silenciosa; Super Admin controla a estrutura dos agentes "como no OpenClaw"; i18n nos 3 catálogos; segredo nunca no painel; Kiwi = Growth Marketing.
- `docs/PLANO_DE_ACAO_SA.md` (linha SA3b) e `docs/SUPER_ADMIN.md` §2 "Squad IA".
- `docs/parciais/SA0-relatorio.md` §1 e §4; protótipo `design/super-admin-proto/` (extraído por script).
- `docs/parciais/SA3a-relatorio.md` §1 e §6 (rotas `/admin/squad/*`, ciclo rascunho → publicar, diff, restore, regras `shared/{doc}`).
- `docs/parciais/SA2-relatorio.md` §1 (casca, tabela, cursor, 403, faixa de 2FA).

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 1 | Squad (lista dos 7) + item Squad ativo na barra, os sete como subnavegação | feito | (este) |
| 2 | Agente › Alma (seções, rascunho, publicar, comparar, voltar, descartar) | em andamento | |
| 3 | Agente › Skills e Ferramentas e limites | pendente | |
| 4 | Agente › O que ele lê | pendente | |
| 5 | Regras de negócio | pendente | |
| 6 | Vitest, e2e (worktree `/tmp`), lado a lado, relatório | pendente | |
