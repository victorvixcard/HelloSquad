# A2d — Progresso (Aranha)

**Fatia:** correções da H2 no web (projeto coordenado e fidelidade à V4.6). **Início:** 16/10/2026 19:45.
**Alvo:** 60 min. **Escopo:** `apps/web`, `packages/ui` e docs da fatia. Stark em paralelo na S2g (`apps/backend`,
`supabase/`, `squad/`): não toco. Lado a lado em `docs/parciais/a2d/`.

Horas = hora do commit.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 19:52 | Abertura do progresso; PASSO 0 em leitura (diretrizes, H2 §b, `h2/prototipo/achados.md`) | 6582aec | feito |
| 19:53 | Três sub-agentes do Aranha em paralelo, cada um com arquivos exclusivos: (a) H2-04/06/08/22/24/26; (b1) P-01/03/04/05/07/08; (b2) P-09 a P-13. O Aranha fica com o H2-01 | — | feito |
| 19:58 | H2-01 (1/3): campanha na Sala do Squad e com o Nexo vira o 01.02; "Coordenar uma campanha" abre o Nexo com 01.02 (não a Bia 02.04); cartão `team` na conversa ("Squad da campanha · o Nexo coordena", "Abrir o projeto"); tela do projeto coordenado (etapas com responsável e estado, Entregas/Decisões/Squad/Histórico, próxima decisão, combinado); cartão do material com "Etapa N · título" | 5492078 | feito |
| 20:03 | H2-01 (2/3): Quadro e Lista mostram o 01.02 como "Projeto" com o nome do projeto e "etapa N de M"; e2e novo `e2e/a2d-projeto.spec.ts` (Sala → equipe → Bia aprovada → Kaia aguardando motor → Otto com a estratégia no contexto → projeto fechado) **1 passed (13,5 s)** no worktree `/tmp/hs-a2d` (build exit 0) | d8df994 | feito |
| 20:08 | H2-01 (3/3): testes de componente `test/A2dProject.test.tsx` (8); lado a lado `a2d/proto-sala-campanha.png` × `a2d/a2d-sala-campanha.png` e `a2d/proto-projeto-estrategia.png` × `a2d/a2d-projeto-estrategia.png` | este | feito |
