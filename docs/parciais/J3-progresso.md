# J3 — progresso (mocks locais dos provedores)

Jarvis, 17/10/2026, início 07:33. Escopo: `infra/mocks/`, alvo `make mocks`/`make mocks-stop`, `make test-infra`, `.env.example` (variáveis `META_*`/`GOOGLE_*`), `docs/MOCKS_LOCAIS.md`, relatórios da fatia. Não toca em `apps/` nem `supabase/`.

## Decisões de partida

- Um processo FastAPI (uv, Python 3.12, mesmo stack do backend) em **127.0.0.1:8300** (faixa própria 8300–8309; livre, conferido com `ss -ltn`), os provedores em prefixos que espelham os hosts reais: `/meta/www` (www.facebook.com), `/meta/graph` (graph.facebook.com), `/google/accounts` e `/google/oauth2` (OAuth), `/google/analyticsdata` e `/google/analyticsadmin` (GA4), `/google/searchconsole`, `/google/mybusiness*` (GBP).
- Estado em memória; controle em `/_mock/*` (reset, calls, expire, fail, config, clock, health, network).
- Dados fictícios só de `docs/DADOS_FICTICIOS.md` (Miolo, Vitta, Trilha); GA4 reproduz a fórmula determinística do `metrics_daily` do seed.
- Guarda de rede no próprio processo (audit hook do Python): qualquer conexão ou resolução de nome fora do loopback é bloqueada e registrada.

## Itens

| # | Item | Estado |
|---|---|---|
| 0 | PASSO 0 lido; progresso aberto | ✅ 07:40 |
| 1 | Servidor de mocks, `make mocks`/`mocks-stop`, health, reset, calls | ⏳ |
| 2 | OAuth Meta e Google (authorize, token, refresh/troca, revogação, expiração forçável, escopos) | ⏳ |
| 3 | Leituras (Instagram, Pages, GA4, Search Console, GBP) | ⏳ |
| 4 | Escritas, rate limit, falhas injetáveis, timeout, guarda de rede | ⏳ |
| 5 | Testes, `docs/MOCKS_LOCAIS.md`, `.env.example`, `make test-infra`, relatório | ⏳ |
