# HelloSquad · Super Admin · protótipo SA0

Protótipo estático e navegável do painel Super Admin (`docs/SUPER_ADMIN.md`), com o Design System do HelloSquad. Dados fictícios, pt-BR. Nada aqui é funcionalidade de produção.

## Como abrir

```bash
cd design/super-admin-proto
python3 -m http.server 8020
```

Abra http://localhost:8020/ (redireciona para Contas). Janela de 1440×900 ou 1280×800.

Precisa de internet só para as fontes do Google Fonts (Gabarito e JetBrains Mono). React 18, o Design System (`ds/`) e os dados estão na pasta.

## Estrutura

```
super-admin-proto/
├── index.html            redireciona para contas.html
├── <tela>.html           uma página por tela (mesma casca)
├── app/shell.css         casca e composições com os tokens do DS
├── app/shell.js          barra lateral, cabeçalho, utilitários
├── app/data.js           dados fictícios (window.SA_DATA)
├── app/pages/<tela>.js   cada tela
├── vendor/               React 18.3.1 UMD (cópia do handoff)
└── ds/hellosquad/        bundle.css, bundle.js, tokens.json (cópia do handoff)
```

Cada pasta funciona sozinha: `vendor/` e `ds/` são cópias byte a byte de `design/handoff-v4.6/product-ui/`.
