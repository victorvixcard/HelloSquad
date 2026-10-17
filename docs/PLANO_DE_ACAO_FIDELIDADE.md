# Plano de ação — Fidelidade ao protótipo (correções fora de fase)

Escrito por Thor (main) em 17/10/2026 08:10, a pedido da orquestradora (dashboard) e por prioridade do Vic (08:00): a área logada foi aprovada ("99,9% igual"); a landing **não** está igual à Landing V1 R32 (a A2c manteve o Hero estático da A0 e trocou as seções animadas por cartões). Regra: **segue o protótipo sempre**; "parecido" não é "igual"; seção animada no protótipo → porta-se o motor, não se substitui nem se pergunta.

| # | Fatia | Agente | Estado | Depende de | Critério de pronto |
|---|---|---|---|---|---|
| L1 | **Landing R32 fiel**: portar CSS e motores de animação da Landing V1 R32 por script (como a A1f fez com a Product UI), Hero e seções animadas iguais, SEO/GEO da A2c preservados (metadados, JSON-LD, hreflang, sitemap, llms.txt), prova em vídeo lado a lado; briefing completo em `docs/parciais/briefings/L1_LANDING_R32_FIEL.md` | Aranha | 🟡 em execução (disparada 17/10 08:10 pela main, Opus 5.5; worktree /tmp/l1-wt nas portas 3200/8200) | — | vídeo/capturas lado a lado R32 × nosso sem diferença visível; Lighthouse mantido; `make test-web` + e2e verdes; relatório `L1-relatorio.md` |
