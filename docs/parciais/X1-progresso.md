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

- 08:55–09:05 Seções escritas e commitadas, cada uma com push: §3.1–3.2 e §5 (`d7c8db1`), §10 (`e7d4f8b`), §3.3–3.4 e §6–§8 (`c19ab04`), §4 (`36967d3`), §2 e §9 (`3d253b8`), §1 (`b015aaf`), §11 (`65a03e9`).
- 09:07 Conferência automática das aspas (`verifica_rotulos.py`): 1.567 literais, 112 montadas e 98 frases montadas, citações do handoff ou termos do documento; cinco aspas corrigidas (`4f89d72`).
- 09:10 Relatório `X1-relatorio.md`.

## Estado
Concluída. Documento: `docs/FLUXOS_DA_V46.md` (716 linhas). Perguntas ao dono: só a §11.
