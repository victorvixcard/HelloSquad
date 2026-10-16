# N2a — Progresso (Nick Fury)

**Fatia:** N2a, conteúdo SEO/GEO do site público e revisão de domínio do squad (Fase 2). Início: 16/10/2026 15:34. Alvo: 60 min.
Área: só `docs/conteudo/` e `docs/parciais/N2a-*`. Não toco em `squad/`, `apps/`, `packages/` nem `supabase/` (S2b do Stark em paralelo).

**Retomada 16:15** (a sessão anterior parou às 15:48 por limite de cota da conta). Alvo da retomada: 40 min. Estado encontrado no disco: árvore limpa; `llms.txt` e `robots.txt` entraram no autosave `4f352bc` (15:50) e não num commit da fatia; `docs/conteudo/revisao_squad.md` **não existe** (o sub-agente revisor morreu junto com a sessão sem gravar nada), então a revisão do squad é refeita por mim do zero. Área da S2c (Stark) em paralelo: continuo sem tocar em `squad/`, `apps/`, `packages/` e `supabase/`.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 15:37 | PASSO 0 lido: `DIRETRIZES_DO_DONO.md` inteiro; `ARQUITETURA_PROPOSTA.md` §7; Documento Mestre §1, §2, §4, §5, §6, §11; `squad/README.md`, `conversa.md`, sete `SOUL.md` e `agent.yaml`; catálogo de deliveries (extraído por script para `/tmp`); copy da Landing V1 R32 extraída por script (hero, squad, Modo Autônomo, Memória, Resultados, Comparativo, FAQ); catálogos `apps/web/messages/{pt-BR,en,es}` (`site`, `common`, `shell`, `pages`, `memory`, `auto`); `DADOS_FICTICIOS.md`; S2a §1 | feito | e21aba4 |
| 15:47 | 1. `docs/conteudo/site/README.md` (rotas, promessa, palavras-chave, perguntas GEO, metadados, JSON-LD, termos por idioma). Verificado por script: 12 titles entre 39 e 54 caracteres, 12 descriptions entre 134 e 151 | feito | 8f7d04c |
| 15:46 | 2. Conteúdo pt-BR das 12 rotas (início, como funciona, squad, 7 agentes, faq, sobre) | escrito; falta a varredura de termos proibidos | 00c9dc7, ff0ffe4, f3e930b, a52d2b4 |
| 15:50 | 4. `llms.txt` e `robots.txt` (rascunho) | no autosave; conferência pendente | 4f352bc |
| 16:16 | Retomada: PASSO 0 relido (diretrizes, este progresso, `git log`, mapa do site, `llms.txt`, `robots.txt`) | feito | 3e1efb5 |
| 16:17 | 2. Varredura por script (`/tmp/n2a/scan.sh`: termos comerciais em pt/en/es, fornecedores, HelloOtto, domínio) nas 12 páginas pt-BR e no `llms.txt`: 0 fornecedor, 0 HelloOtto, 0 domínio; 25 ocorrências de "plano" são entregas (plano de marketing, de mídia, de testes); "grátis" e "créditos" só em notas de implementação, reescritas como pergunta ao dono (P1, P2); `cta` do frontmatter marcado como proposta nas 12 páginas | feito | ad57c21 |
| 16:19 | 3. en e es: dois sub-agentes em paralelo, um por idioma, com regras, termos do §6 e verificação por script; eu confiro a consistência no fim | em andamento | |
| 16:19 | 4. `llms.txt`: links das páginas de agente nos blocos en e es. `robots.txt`: `/admin` (Super Admin, decisão de 16/10 09:15) bloqueado; robôs de busca dos assistentes nomeados; Disallow antes de Allow. Verificado com dois leitores (primeira regra, `urllib.robotparser`, e RFC 9309, regra mais longa): 80/80 combinações corretas em cada (8 robôs x 10 caminhos); antes da reordenação, o leitor de primeira regra liberava `/app`, `/admin` e `/sair` (32 falhas) | feito | 637ac90 |
| 16:26 | 5. `docs/conteudo/revisao_squad.md` (4.339 palavras), refeita por mim: 6 riscos transversais com linha de origem (idioma, moeda BRL, números de exemplo em SOUL, sugestão pendente usada como fato em 4 fixtures, medição antes do gasto, estados de memória não confirmados no prompt), forte / fraco / texto pronto / riscos dos 7 agentes, tabela do que a fixture não entrega para Bia, Kiwi, Max e Íris, ordem de aplicação separando o que **muda o combinado**. Evidência por `grep` em `/tmp/n2a/evid.txt`; nada editado em `squad/` | feito | este |
| | 6. Relatório | pendente | |
