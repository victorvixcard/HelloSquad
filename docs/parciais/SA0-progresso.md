# SA0 — Protótipo navegável do Super Admin · progresso

Aranha, 16/10/2026. Escopo: `docs/SUPER_ADMIN.md` §2 e §6. Pasta: `design/super-admin-proto/`. Porta 8020.

## Linha do tempo

- 08:55 — PASSO 0 lido: `DIRETRIZES_DO_DONO.md`, `SUPER_ADMIN.md` (inteiro), README do DS, README do handoff (seção B), `squad/*/agent.yaml`, `squad/README.md`, `DADOS_FICTICIOS.md`, catálogo de 46 deliveries.
- 09:00 — estrutura criada; `vendor/` e `ds/` copiados byte a byte de `design/handoff-v4.6/product-ui/` (sha256 do `bundle.js` conferido igual). Commit `30ae718`.
- 09:30 — casca (`app/shell.css`, `app/shell.js`): barra lateral e superfícies da V4.6, faixa de 2FA no desenho de "Precisa de você", status por desenho, tabela/abas/diálogo/campo compostos com tokens. `tools/gerar_dados.py` gera `app/data-squad.js` (squad/ + catálogo) e `app/tokens.css` (tokens.json). `app/data.js` com o cenário fictício. Tela Contas. Commit `bc9d11b`.
- 10:05 — telas Conta (detalhe, entrar no ambiente com motivo, ajuste de crédito, suspensão), Squad (palco do DS) e Agente (Alma, Skills, Ferramentas e limites, O que ele lê). Hash do prompt conferido igual ao do loader do backend: otto/04.01 `fb290a332565`, nexo/01.01 `b1623f1c52c9`.
- 10:05 — as outras 12 telas em construção em paralelo (3 ajudantes, 4 telas cada), com a mesma casca.

## Telas

| Tela | Estado | Verificação |
|---|---|---|
| Casca (barra lateral, cabeçalho, aviso 2FA) | pronta | Playwright 1440×900, 0 erro de console |
| Contas | pronta | idem |
| Conta (detalhe) | pronta | idem |
| Squad | pronta | idem |
| Agente (Alma, Skills, Ferramentas e limites, O que ele lê) | pronta | idem, 4 abas |
| Catálogo · Planos e recargas · Pagamentos · Auditoria | em construção | — |
| Regras de negócio · Referências · Motor de imagem · Modelos e custos | em construção | — |
| Consumo por cliente · Saúde das APIs · Fila de trabalhos · Qualidade das entregas | em construção | — |
