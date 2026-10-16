# Fontes do Design System (auto-hospedadas)

As fontes ficam no repositório para o build e o app não dependerem da internet (nada de Google Fonts em tempo de execução nem de build). O web carrega os arquivos com `next/font/local` (`apps/web/app/fonts.ts`).

| Arquivo | Família | Pesos | Cobertura | Origem | Licença |
|---|---|---|---|---|---|
| `gabarito-latin-wght-normal.woff2` | Gabarito (variável) | 400–900 (o DS usa 400–800) | subconjunto latino: U+0000-00FF e pontuação geral, cobre todo o português | `@fontsource-variable/gabarito@5.3.0` (Google Fonts, v9) | SIL OFL 1.1, `OFL-Gabarito.txt` |
| `jetbrains-mono-latin-wght-normal.woff2` | JetBrains Mono (variável) | 100–800 (o DS usa 400–500) | subconjunto latino | `@fontsource-variable/jetbrains-mono@5.3.0` (Google Fonts, v24) | SIL OFL 1.1, `OFL-JetBrainsMono.txt` |

SHA-256:

```text
780dd129f53815f23c37d4b786c98139c3cfa3086c391ec0bb9aa40d26e7a8fe  gabarito-latin-wght-normal.woff2
18be452724bfdc236c074ca94a249a7f41a86752c7d04ab258ce9ed5651f6a7e  jetbrains-mono-latin-wght-normal.woff2
```

Para trocar de versão: baixe o pacote do fontsource (`pnpm view <pacote>@<versão> dist.tarball`), copie o `files/*-latin-wght-normal.woff2` e o `LICENSE`, atualize esta tabela.
