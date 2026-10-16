# H1 — Progresso da QA adversária da Fase 1 (Hulk)

**Início:** 16/10/2026 13:25. **Método:** tentar refutar cada entrega (S1a–S1g, A1f, A1a, A1b) lendo o
código real e atacando o ambiente local; não altero código de produto. Scripts e provas em
`docs/parciais/h1/`; saídas longas em `/tmp/h1_*` (lidas só por `tail`/`grep`). Toda operação que
mexe no banco roda sob a trava `flock /tmp/hellosquad-db.lock`, como o `Makefile`.

## Blocos

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | PASSO 0: diretrizes, plano da Fase 1, FLUXOS §3/§5, relatórios das fatias, SETUP_LOCAL, Makefile | feito |
| 1 | Aceite §16 pelo browser (Playwright) e idempotência (decidir 2x, run 2x, retry, reenfileirar) | feito: aceite passou (36 -> 26, uma captura); idempotência 12x em paralelo, run 3x, retry e reenfileirar resistiram |
| 2 | Isolamento das tabelas novas (API e Data API) e Realtime entre tenants | feito: 31 tabelas x Rafael/Pedro/anônimo pela Data API, 42 rotas da API, Realtime leitura e escrita; nada vazou |
| 3 | Owner-only (aprovações e memória), editor e viewer; memória respeita confirmação | feito: editor/admin/viewer 403 em decidir e na memória; sugestão descartada fora do contexto e do prompt; correção vira versão nova |
| 4 | Créditos (saldo, ledger imutável, falha libera, respond, estimativa, "Agora não") e worker | feito: 14 cenários, todos resistiram (rodada 1 tinha erro do meu harness; rodada 2 10/10) |
| 5 | Web (CSP, cookie, `?next=`, noindex) e comparação com o protótipo | pendente |
| 6 | Diretrizes (nuvem, segredos, dados fictícios, pt-BR sem emoji) e clone limpo | pendente |

## Estado inicial do ambiente (13:26)

- 11 containers `supabase_*_hellosquad` no ar; API em :8100 (`uv run hellosquad-api`, com reload),
  web em :3100 (`next dev --turbopack`), protótipo em :8010, Super Admin em :8020. Nenhum worker no ar.
- `ANTHROPIC_API_KEY` vazia no `.env`: runtime em modo simulado.

## Registro

- 13:32 aceite §16 pelo browser (`h1/01_aceite.sh`): Nexo -> Otto -> v1 ao vivo -> Aprovar (clique duplo) ->
  histórico e Projetos; saldo 36 -> 26, uma reserva, uma captura, um evento `approval.decided`.
- 13:36-13:47 erro meu: o worker do aceite sobreviveu ao "stop" (PID do `setsid` que bifurcou) e segurou a
  trava herdada do `flock`; parei o grupo com SIGTERM (saiu limpo) e corrigi `h1/lib.sh` (`exec` + `3>&-`).
  Daqui em diante uso `flock -o`.
- 13:48 harness `h1/02_idempotencia_creditos_worker.py`, rodada 2: 10/10 (`h1/02_rodada2.txt`); rodada 1 em
  `h1/02_rodada1.txt` (falhas de harness: `Settings` com lease < 10 s, origem `manual` inexistente, saldo
  esgotado entre cenários).
- 13:51-13:55 `h1/03_isolamento_papeis_memoria.py` (resultado em `h1/03_resultado.txt`) e Realtime
  (`h1/04_realtime_tenants.mjs`, `h1/04c_broadcast_injecao.mjs`): tudo resistiu.
