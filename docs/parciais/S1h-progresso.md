# S1h — Progresso (Stark)

Correções da H1 (servidor e infra): H1-01, H1-02, H1-07, H1-08, H1-09. Início 16/10/2026 14:15.
Escopo de escrita: `supabase/`, `apps/backend`, `infra/`, `Makefile`, `docs/SETUP_LOCAL.md`, docs da S1h.

| Hora | Item | Estado |
|---|---|---|
| 14:15 | PASSO 0 lido (diretrizes, H1 §b e §f, A1a §3, `config.toml [auth]`, autosave, `DB_LOCK`) | feito |
| 14:20 | H1-02: guarda única para diff e arquivo novo (JWT, cookie de sessão com valor, `sb_secret_`/`sb_publishable_`, `ANTHROPIC_API_KEY=`); `make test-infra` 8/8 (o script antigo falha 7/8) | feito |
| 14:27 | H1-07: fixtures `otto.produce` e `otto.revise` com uma versão e texto que diz isso; sábado só quando o pedido (ou o retorno) fala em sábado; 6 testes novos em `test_llm.py`; 62 testes de worker/LLM/créditos/memória/conversa verdes | feito |

## Notas

- GoTrue local é v2.197.0. `secure_password_change = true` liga `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION`,
  que só pede reautenticação quando a sessão tem mais de 24 h (`internal/api/user.go:157`). A opção que exige a senha
  atual (`security_update_password_require_current_password`) existe só na configuração da nuvem; o CLI 2.121.0 não a
  repassa ao container local. Detalhe e consequência no relatório.
