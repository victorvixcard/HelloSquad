# H-SA — progresso da QA adversária da trilha Super Admin (Hulk)

Início 17/10/2026 00:14. Método: tentar refutar SA1, SA2, SA3a, SA3b, SA4a, SA4b, SA6a e SA6b lendo o código real e
atacando o ambiente local (API 8100, web 3100 com `/admin`, Supabase `hellosquad`, Mailpit 56324). Nenhum código de
produto é alterado; roteiros e provas em `docs/parciais/hsa/`; saídas longas em `/tmp/hsa_*`. Toda operação que muda
o banco roda dentro da trava `flock -o /tmp/hellosquad-db.lock` (lição da H2 §f).

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | PASSO 0: diretrizes, plano SA (8 perguntas e leitura conservadora), SUPER_ADMIN §1–§4, relatórios SA1–SA6b, H2 (formato), SETUP_LOCAL (Vic fictício) | ✅ 00:16 |
| 1 | (1) escalonamento: Marina, Carla, Pedro, anon, authenticated sem papel, token forjado, Data API | em andamento |
| 2 | (2) papel privilegiado não vaza; sessão de suporte (expirada, encerrada, só leitura) | — |
| 3 | (3) auditoria de cada escrita; (5) cobrança e créditos; (6) valores e segredos | — |
| 4 | (4) versões do squad × runtime; `make squad-export` | — |
| 5 | (8) consumo/qualidade/saúde; (9) e-mail da sessão de suporte no Mailpit | — |
| 6 | (7) web `/admin`: noindex, 2FA, 403, i18n, lado a lado com o SA0 | — |
| 7 | (10) clone limpo em `/tmp` | — |
| 8 | Relatório `H-SA-relatorio.md`, banco no seed | — |
