# X1 — Relatório: especificação de fluxos derivada da V4.6

**Fatia:** X1. **Data:** 16/10/2026, 08:40 → 09:10. **Entrega:** `docs/FLUXOS_DA_V46.md` (716 linhas, cerca de 108 KB, 11 seções e uma introdução com convenções e os sete agentes). Commits em `main`, todos com push: `4a6503b`, `80a3004`, `46f07b4`, `d7c8db1`, `e7d4f8b`, `c19ab04`, `36967d3`, `3d253b8`, `b015aaf`, `65a03e9`, `4f89d72` e o deste relatório. Não toquei em código, banco, testes nem em outros docs; não rodei `make`.

## 1. Como extraí

1. **Mapa do arquivo** (1,4 MB, 13.966 linhas, nunca lido inteiro):
   - CSS: L14–4532.
   - Template: L4533–5615.
   - Script: L5618–13962.
   - A classe `Component` (V3) vai de L6408 a L9587. Depois vêm sete camadas (V4, V4.1, V4.2, V4.3, V4.4, V4.5, V4.6) que sobrescrevem métodos com `Object.assign(Component.prototype, …)` e guardam a versão anterior em `V3P` … `V46P`. A regra de leitura foi: vale a linha maior.
2. **`docs/parciais/x1/extract.py`:**
   - Corta o template e o script em blocos, pelas declarações de topo e pelas seções `// ----` dentro da classe e das camadas.
   - Grava cada bloco com o número da linha de origem em `docs/parciais/x1/out/` (424 arquivos; regenerável; fora do git por `docs/parciais/x1/.gitignore`).
   - Resume SVG e estilos longos.
   - Gera os índices (`*_INDICE.tsv`, commitados), os textos do template (`*_template_textos.tsv`), os literais em português (`*_strings.tsv`) e os rótulos curtos (`*_rotulos.tsv`).
   - Faz o mesmo, mais leve, para `MioloPeca.dc.html` e a landing.
3. **Leitura distribuída:**
   - Seis leitores (Sonnet) leram os extratos em paralelo, em faixas de até 200 linhas, e gravaram uma nota por tema, com o rótulo exato e a linha de origem: `notas_jornadas.md`, `notas_conversa_pendencias.md`, `notas_memoria_autonomo_conexoes.md`, `notas_telas.md`, `notas_objetos_seed.md`, `notas_landing_miolo.md`.
   - Eu li o núcleo: `AG`, `initState`, guia do Demo, jornadas 1 e 2, `_needs`, `_nd5Items`, status `STK6` e `NDK5`, o motor da conversa e o primeiro acesso. Com isso conferi as notas e escrevi o documento.
4. **Extratos curados commitados:** `cartoes_da_conversa.txt` (os 24 tipos de cartão da conversa, com os rótulos de botão) e `pui_meta.json`.
5. **Cruzamento:** S1a §1–§2, S1b §1 e, só lendo, os enums e tabelas das migrations do núcleo e de `app.create_conversation`. Isso foi além de `design/`, para a §10 sair exata; nada foi alterado.

## 2. Verificação

`python3 docs/parciais/x1/verifica_rotulos.py` procura cada texto entre aspas do documento no HTML do protótipo e da landing:

```
aspas verificadas: 1777
literais: 1567
montadas (todas as partes existem): 112
não encontradas: 98
```

As 98 restantes estão listadas em `docs/parciais/x1/verifica_rotulos.txt` e são de três tipos:

- **Frases que o código monta juntando nome e texto**, conferidas por amostra no código-fonte. Exemplos: "Nexo organiza os projetos da Miolo…" é `<b>Nexo</b>` + `ENVS.d`; "Hello, Marina." é `'Hello, ' + ACCOUNT.name + '.'`; "Pausada: nada novo até você retomar" é `'Pausada: ' + nxa.toLowerCase()`.
- **Citações do handoff**, e não do HTML: "A conversa é a interface principal", a lista de oito estados.
- **Termos do próprio documento:** "Rejeitar", "a Kiwi", "Dono".

Na conferência corrigi cinco aspas que não eram literais:

- O status da conversa direta não leva o nome do agente.
- O histórico do ajuste leva ponto final.
- Uma regex, um título e uma ausência estavam entre aspas.

## 3. O que não consegui extrair

- **CSS:** não extraí. Caixa alta, rótulos escondidos na barra recolhida e o título visível da faixa "Precisa de você", que só aparece em `aria-label` no template, não são confirmáveis.
- **Componentes do DS:** a lógica interna de `ApprovalCard`, `Button` e `CommandField` está em `bundle.js`, que não li. Só os rótulos passados por atributo aparecem.
- **Ícones:** alguns caminhos SVG dos sinais de status foram resumidos pelo filtro ("M…"). Os nomes e o significado de cada sinal estão no código; o desenho exato não.
- **`setState` do runtime** (`support.js`): não li. O que "Reiniciar" preserva ou zera foi inferido pelos leitores e está marcado como inferência na nota.
- **Landing:** li só os modais e a sequência da Hero, como pedia o briefing.

## 4. Achados que mudam trabalho de outras fatias (sem decidir nada)

- **Faltam no banco:**
  - Conversa em grupo de 2 a 6 especialistas.
  - Contextos de conversa além de `project`, `work_item` e `delivery`.
  - Cartões tipados nas mensagens.
  - Leitura por participante.
  - Memória, fontes, responsabilidades e execuções, "<Agente> percebeu" e notificações (§10).
- **Conflitos com o banco:**
  - O tipo `decide` ("Para você decidir") e a linha `next` ("Em seguida") não existem em `approval_kind`.
  - "Agora não", na autorização, não é `rejected`: a pessoa decide depois com "Decidir agora" (§10.2).
- **Sem desenho na V4.6, apesar de decididos pelo dono:**
  - Rejeitar com duas saídas.
  - Cancelamento de trabalho.
  - Trabalho bloqueado ou com falha.
- **Inconsistências do próprio protótipo:** listadas no fim da §11, para o time decidir tecnicamente sem mudar a experiência.

## 5. Perguntas para o dono

Estão só na §11 do documento (11 itens): papéis e multiusuário; rejeitar com duas saídas; estados de trabalho sem rótulo; o efeito do interruptor do Modo Autônomo; cadastro e login reais; Minha conta e Configurações, com o seletor de idioma; notificações fora do produto; conversa em grupo de verdade; celular; os vazios de Marca & Criação e Growth; e vários negócios.

## 6. Estado em que deixei a máquina

Só arquivos meus commitados: `docs/FLUXOS_DA_V46.md` e `docs/parciais/x1/*` (com o `.gitignore` de `out/`). Também `X1-progresso.md` e este relatório. As alterações em `apps/`, `packages/` e `supabase/` no diretório de trabalho são dos outros dois agentes e não foram tocadas. O `git pull --rebase` não roda com essas alterações não commitadas no diretório; como o `main` local é compartilhado, fiz `git fetch` e o push direto, sem divergência.
