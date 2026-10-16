# X1 · progresso — especificação de fluxos derivada da V4.6

Início: 16/10/2026 08:40. Alvo: 60 min. Escopo de escrita: `docs/FLUXOS_DA_V46.md`, `docs/parciais/x1/`, este arquivo e `X1-relatorio.md`.

## Feito
- 08:40 PASSO 0 lido: `DIRETRIZES_DO_DONO.md`, handoff `README.md` (C, D, E), README do DS.
- 08:42 Mapa do `ProductUIV4.dc.html` (13.966 linhas): CSS 14–4532, template 4533–5615, script 5618–13962. Classe base V3 em 6408–9587; camadas V4, V4.1, V4.2, V4.3, V4.4, V4.5 e V4.6 por `Object.assign(Component.prototype, …)` (a última camada vence).
- 08:44 `docs/parciais/x1/extract.py` escrito e rodado (commit `4a6503b`): blocos por linha de origem em `docs/parciais/x1/out/` (regenerável, fora do git); índices e extratos curados em `docs/parciais/x1/*.txt|json`.

- 08:46 Leitura distribuída: seis leitores em paralelo, um por tema (jornadas; conversa e pendências; memória, Modo Autônomo e conexões; telas; objetos e seed; landing e Miolo), cada um grava `docs/parciais/x1/notas_<tema>.md` a partir dos extratos (nunca do HTML).
- 08:47 Corrigido filtro de SVG do extrator (trocava por "M…" frases sem acento que começavam com "M"); extratos regenerados.
- 08:48 Esqueleto de `docs/FLUXOS_DA_V46.md` (convenções, agentes) commitado (`80a3004`).
- 08:49 Lado do banco para o cruzamento levantado: enums e tabelas do núcleo (S1a), rotas (S1b), tipos de contexto aceitos por `app.create_conversation` (`project`, `work_item`, `delivery`).

## Em andamento
- Aguardando as notas dos leitores; em paralelo, leitura própria de `initState`, guia DEMO, Início (pedido e quem participa, conversa em grupo), insights, status da V4.6 (STK6, NDK5).

## Próximo
- Seções 1–11 de `docs/FLUXOS_DA_V46.md`, commit por seção.
