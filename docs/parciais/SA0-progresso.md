# SA0 — Protótipo navegável do Super Admin · progresso

Aranha, 16/10/2026. Escopo: `docs/SUPER_ADMIN.md` §2 e §6. Pasta: `design/super-admin-proto/`. Porta 8020.

## Linha do tempo

- 08:51 — PASSO 0 lido: `DIRETRIZES_DO_DONO.md`, `SUPER_ADMIN.md` (inteiro), README do DS, README do handoff (seção B), `squad/*/agent.yaml`, `squad/README.md`, `DADOS_FICTICIOS.md`, catálogo de 46 deliveries.
- 08:52 — estrutura criada; `vendor/` e `ds/` copiados byte a byte de `design/handoff-v4.6/product-ui/` (sha256 do `bundle.js` conferido igual). Commit `30ae718`.
- 09:10 — casca (`app/shell.css`, `app/shell.js`): barra lateral e superfícies da V4.6, faixa de 2FA no desenho de "Precisa de você", status por desenho, tabela/abas/diálogo/campo compostos com tokens. `tools/gerar_dados.py` gera `app/data-squad.js` (squad/ + catálogo) e `app/tokens.css` (tokens.json). `app/data.js` com o cenário fictício. Tela Contas. Commit `bc9d11b`.
- 09:12 — as outras 12 telas em construção em paralelo (3 ajudantes, 4 telas cada), com a mesma casca.
- 09:21 — telas Conta (detalhe, entrar no ambiente com motivo, ajuste de crédito, suspensão), Squad (palco do DS) e Agente (Alma, Skills, Ferramentas e limites, O que ele lê). Hash do prompt conferido igual ao do loader do backend: otto/04.01 `fb290a332565`, nexo/01.01 `b1623f1c52c9`.
- 09:41 — Catálogo, Planos e recargas, Pagamentos e Auditoria integrados e revisados. Commit `9ec6f5c`.
- 09:52 — Regras de negócio, Referências, Motor de imagem, Modelos e custos, Consumo, Saúde das APIs, Fila e Qualidade integrados; três incoerências de dados corrigidas (gasto de 7 dias da Anthropic, texto da falha da Meta, médias de outubro); testes dos ajudantes copiados para `tools/`. Commit `74e659b`.
- 09:52 — verificação final no estado final; servidor da 8020 no ar com o mesmo bind da 8010; relatório fechado.

## Telas

| Tela | Estado | Verificação (estado final) |
|---|---|---|
| Casca (barra lateral, cabeçalho, aviso 2FA) | pronta | `testar.cjs` 30/30 (foco, Esc, movimento reduzido) |
| Contas · Conta (detalhe) | prontas | capturas 01–02; `testar.cjs` |
| Catálogo · Planos e recargas · Pagamentos · Auditoria | prontas | capturas 03–06; `testar.cjs` |
| Squad · Agente (Alma, Skills, Ferramentas e limites, O que ele lê) | prontas | capturas 07–11; `testar.cjs`; hash do prompt = backend |
| Regras de negócio · Referências · Motor de imagem · Modelos e custos | prontas | capturas 12–15; `testar-regras-referencias-motor-modelos.cjs` 57/57 |
| Consumo · Saúde das APIs · Fila · Qualidade | prontas | capturas 16–19; `testar-consumo-saude-fila-qualidade.cjs` 52/52 |
| Todas | — | 19/19 capturas sem erro de console a 1440×900 e a 1280×800; 44/44 rotas×larguras sem transbordo |
