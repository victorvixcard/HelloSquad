# HelloSquad · Super Admin · protótipo SA0

Protótipo estático e navegável do painel Super Admin (`docs/SUPER_ADMIN.md`), com o Design System do HelloSquad. Dados fictícios, pt-BR. Nada aqui é funcionalidade de produção: ações mudam só o estado da página e avisam "Demonstração".

## Como abrir

```bash
cd design/super-admin-proto
python3 -m http.server 8020
```

Abra http://localhost:8020/ (redireciona para Contas). Janela de 1440×900 ou 1280×800.

Precisa de internet só para as fontes do Google Fonts (Gabarito e JetBrains Mono), importadas pelo `bundle.css` do DS, como no handoff. React 18, o Design System e os dados estão na pasta.

## Telas

| Grupo | Tela | Arquivo |
|---|---|---|
| Operação | Contas · detalhe da conta | `contas.html` · `conta.html?id=miolo` |
| | Catálogo | `catalogo.html` |
| | Planos e recargas | `planos.html` |
| | Pagamentos | `pagamentos.html` |
| | Auditoria | `auditoria.html` |
| Squad IA | Squad | `squad.html` |
| | Agente (Alma, Skills, Ferramentas e limites, O que ele lê) | `agente.html?a=otto#alma` (`#skills`, `#ferramentas`, `#le`) |
| | Regras de negócio | `regras.html` |
| | Referências | `referencias.html` |
| | Motor de imagem | `motor-imagem.html` |
| | Modelos e custos | `modelos.html` (`#custos`, `#regras`, `#precos`) |
| | Consumo por cliente | `consumo.html` |
| | Saúde das APIs | `saude-apis.html` |
| | Fila de trabalhos | `fila.html` |
| | Qualidade das entregas | `qualidade.html` |

## Estrutura

```
super-admin-proto/
├── index.html              redireciona para contas.html
├── <tela>.html             uma página por tela, todas com a mesma casca
├── app/shell.css           casca e composições, só com tokens do DS
├── app/shell.js            barra lateral, topo, aviso de 2FA e componentes compostos (window.SA)
├── app/tokens.css          gerado de ds/hellosquad/tokens.json
├── app/data-squad.js       gerado de squad/ (agent.yaml, SOUL.md, skills) e do catálogo do handoff
├── app/data.js             cenário fictício: contas, planos, pagamentos, auditoria, runs, consumo, qualidade…
├── app/pages/<tela>.js     cada tela
├── tools/gerar_dados.py    regenera data-squad.js e tokens.css (rodar da raiz do repo)
├── tools/capturar.cjs      capturas PNG com o Playwright do repo
├── tools/testar.cjs        testes de interação (teclado, diálogos, filtros, movimento reduzido)
├── vendor/                 React 18.3.1 UMD (cópia do handoff)
└── ds/hellosquad/          bundle.css, bundle.js, tokens.json (cópia byte a byte do handoff)
```

Cada pasta funciona sozinha: `vendor/` e `ds/` são cópias de `design/handoff-v4.6/product-ui/`.

## Atualizar os dados de squad/

```bash
python3 design/super-admin-proto/tools/gerar_dados.py
```

O hash do prompt mostrado em "O que ele lê" e em Skills é calculado como no `squad/loader.py` do backend (manifesto dos arquivos lidos) e confere com ele.

## Verificar

Com a porta 8020 no ar, da raiz do repositório:

```bash
node design/super-admin-proto/tools/capturar.cjs            # PNGs em docs/parciais/sa0/
SA0_W=1280 SA0_H=800 node design/super-admin-proto/tools/capturar.cjs /tmp/sa0-1280
node design/super-admin-proto/tools/testar.cjs
```
