# S2g — progresso (correções da H2: servidor e infra)

Disparada às 19:45 de 16/10/2026 pela main (Opus 5.5), em paralelo com a A2d do Aranha
(`apps/web`, `packages/ui`). Área desta fatia: `apps/backend`, `supabase/`, `squad/`, `infra/`, `Makefile`,
`docs/SETUP_LOCAL.md`, `packages/contracts` (gerado) e os documentos da fatia.

Método: o Stark dividiu os achados com cinco auxiliares (sub-agentes), cada um num worktree próprio em `/tmp/s2g-*`
(nunca na árvore do dono, de onde rodam a API 8100 e a web 3100), todos com a trava do banco
(`flock -o /tmp/hellosquad-db.lock`) em pytest, seed e migration, publicando direto em `main` com rebase.
Horas = hora do commit (`git log --date=format:%H:%M`).

| Hora | Item | Commit | Quem | Estado |
|---|---|---|---|---|
| 19:45 | Abertura do progresso; PASSO 0 lido (diretrizes, H2 §b e §f) | `3e672bc` | Stark | feito |
| 19:51 | H2-21: fornecedores fora do comentário de `squad/max/agent.yaml` | `efc392b` | aux. erros | feito |
| 19:52 | H2-03: aprendizado promovido vale para o agente em todas as deliveries dele (mesma delivery → busca → gerais do agente, motivo `agent`), migration `20261016230000`; teste 04.01 → 04.03 do Otto e isolamento da Vitta | `aa12f80` | Stark | feito |
| 19:53 | H2-29 + H2-05: sugestões dos ambientes pelos `asks` da V4.6 e saudação do squad no idioma do negócio | `bd15b35` | aux. erros | feito |
| 19:53 | H2-13: nome do negócio sem controle/HTML (422) e e-mail impossível falha uma vez com o motivo (`invalid_message`) | `aa47ea8` | Stark | feito |
| 19:53 | H2-15: webhook do Mercado Pago com `ts` fora de 5 minutos → 401 | `8166d87` | aux. cobrança | feito |
| 19:55 | H2-16: trava do Postgres na rodada de renovação; o segundo scheduler pula | `9014148` | aux. cobrança | feito |
| 19:55 | H2-07: guarda do autosave reconhece as chaves da cobrança | `1f8001f` | aux. infra | feito |
| 19:56 | H2-05: en e es do catálogo do backend completos e teste das chaves dos três idiomas | `a78248a` | aux. catálogo | feito |
| 19:57 | H2-02: fixture de reflexão das 16 deliveries com fluxo | `2c20a21` | aux. fixtures | feito |
| 19:58 | H2-05: mensagens de erro da API pelo catálogo, no idioma da pessoa ou do negócio | `a86f6a0` | aux. erros | feito |
| 19:58 | H2-28: `make test` segura uma trava só do pytest ao pgTAP | `3afbbbf` | aux. infra | feito |
| 19:59 | H2-14: fixture 01.02 do Nexo lê a resposta da pessoa | `4cf2854` | aux. fixtures | feito |
| 19:59 | H2-17 + H2-18: revogação de consentimento (rota owner/admin com auditoria; reimportação com "não" revoga), fórmula de planilha neutralizada; migration `20261016230100` | `69dc709` | Stark | feito |
| 20:00 | H2-27: `make seed` apaga os convites | `9113341` | aux. infra | feito |
| 20:01 | Erros novos da revogação pelo catálogo nos três idiomas | `f8ae6ad` | Stark | feito |
| 20:02 | H2-20: telefones do teste de importação na convenção | `e34c4ac` | aux. infra | feito |
| 20:02 | H2-28: `make seed` confere a senha do `hellosquad_api` antes de aplicar | `519bc7b` | aux. infra | feito |
| 20:02 | H2-29: teste das sugestões confere os sete ambientes em en | `af3fcb4` | aux. erros | feito |
| 20:03 | H2-28/H2-27: guia do segundo checkout, trava única e convites no `SETUP_LOCAL.md` | `cf0b330` | aux. infra | feito |
| 20:06 | `make openapi` + `pnpm --filter contracts generate`: 58 → 59 operações, nada removido | `efe6e1f` | Stark | feito |
| 20:08 | pgTAP `27_consent_revocation` (12); `supabase test db` 712/712 | `0f74e39` | Stark | feito |
| 20:12 | Verificação final: `make test-infra` 21/21; backend + pgTAP numa trava: ruff ok, pytest 267 passed, pgTAP 700/700 (712 com o 27); `make test` inteiro vermelho só no `test-web` (3 testes do `apps/web`, A2d em andamento); relatório; H2 anotada | `faa06d2` | Stark | feito |

**Fatia fechada às 20:12.** Relatório: `docs/parciais/S2g-relatorio.md`.

## Retomada (20:15)

A main achou a fatia sem relatório: o `faa06d2` foi publicado do worktree e só chegou à árvore do dono no rebase da A2d
(`2540657`, 20:15). Nada refeito; conferência e `make test` completo no worktree `/tmp/s2g-final`.

| Hora | Item | Commit | Quem | Estado |
|---|---|---|---|---|
| 20:19 | PASSO 0; H2-20 (`e34c4ac`: 0021/0022, nenhum telefone fora de `+55 11 99999-00NN` em `apps/backend/tests`) e guia do 2º checkout (`cf0b330`) conferidos; `make openapi` + `pnpm --filter contracts generate` sem diferença (59 operações) | este | Stark | feito |
| — | `make test` completo (infra, web, backend, pgTAP) | — | Stark | em andamento |
