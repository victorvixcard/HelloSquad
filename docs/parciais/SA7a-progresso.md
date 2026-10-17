# SA7a — Correções da H-SA (servidor e infra) · progresso

Stark, 17/10/2026, início 01:07. Área: `apps/backend`, `supabase/`, `Makefile`, `docs/SETUP_LOCAL.md`,
`packages/contracts` (gerado) e documentos da fatia. Nada em `apps/web` (SA7b do Aranha em paralelo). Sem sub-agentes.

| Hora | Item | Estado |
|---|---|---|
| 01:12 | Passo 0 lido (diretrizes, H-SA §b 01/02/07 e notas, SA6a §1, SA1 §1, seed, trava de owner da S0) | ok |
| — | H-SA-01: motivos internos fora da Data API | em andamento |
| — | H-SA-02: seed com negócio do Vic; `GET /me` com `is_platform_admin`; saldo informado | pendente |
| — | H-SA-07: `test_email.py` sem porta fixa; guia do 2º checkout; clone limpo | pendente |
| — | Notas de servidor (até 2), `make test`, relatório | pendente |

## Decisão de desenho (H-SA-01)

Privilégio de coluna quebraria leituras `select p.*` que rodam como `authenticated`
(`app.current_delivery_price` é SQL SECURITY INVOKER com `select p.*`). Os dois motivos vão para tabelas próprias do
painel (RLS forçada, sem GRANT para `anon`/`authenticated`/`service_role`, só `hellosquad_admin`), e as colunas saem
das tabelas do produto; as rotas `/admin/*` leem pela junção e devolvem o mesmo.
