# SA7a — Correções da H-SA (servidor e infra) · progresso

Stark, 17/10/2026, início 01:07. Área: `apps/backend`, `supabase/`, `Makefile`, `docs/SETUP_LOCAL.md`,
`packages/contracts` (gerado) e documentos da fatia. Nada em `apps/web` (SA7b do Aranha em paralelo). Sem sub-agentes.

| Hora | Item | Estado |
|---|---|---|
| 01:12 | Passo 0 lido (diretrizes, H-SA §b 01/02/07 e notas, SA6a §1, SA1 §1, seed, trava de owner da S0) | ok |
| 01:12 | H-SA-01: motivos internos fora da Data API (`894d310`) | ok |
| 01:16 | H-SA-02: seed com negócio do Vic; `GET /me` com `is_platform_admin`; saldo informado (`6db1d8e`, `1504e8f`, `da2e744`) | ok |
| 01:19 | H-SA-07: `test_email.py` sem porta fixa; guia do 2º checkout; clone limpo 329 passed (`9fa41a9`) | ok |
| 01:22 | H-SA-09 (ℹ️): sessão de suporte recusada em conta suspensa (`238eec7`) | ok |
| 01:24 | `make test` verde; prova ao vivo; relatório `SA7a-relatorio.md` | ok |

## Decisão de desenho (H-SA-01)

Privilégio de coluna quebraria leituras `select p.*` que rodam como `authenticated`
(`app.current_delivery_price` é SQL SECURITY INVOKER com `select p.*`). Os dois motivos vão para tabelas próprias do
painel (RLS forçada, sem GRANT para `anon`/`authenticated`/`service_role`, só `hellosquad_admin`), e as colunas saem
das tabelas do produto; as rotas `/admin/*` leem pela junção e devolvem o mesmo.
