# A1b — Relatório (Aranha)

**Fatia:** A1b, "Projetos, Memória e os outros ambientes" (Fase 1). **Data:** 16/10/2026, 11:47 → 12:16 (29 min; alvo 70).
**Como foi feito:** depois do PASSO 0 e de uma estrutura comum commitada (`5d78606`: catálogo por área e uma página por ambiente do squad), três sub-agentes meus trabalharam em paralelo, cada um só nos seus arquivos: (a) Projetos · Nexo e detalhe do trabalho; (b) Minha Equipe & Conversas e Modo Autônomo; (c) Bia, Kaia, Kiwi, Max e Íris. Eu fiz a Memória da Marca, a barra de créditos, o número da Memória na barra, o e2e, a verificação e este relatório.
**Regra que guiou a fatia:** segue o protótipo sempre (diretriz das 10:20). Onde a V4.6 não responde ou a API ainda não tem o dado, a diferença está na §4, com a pergunta; nada foi "corrigido" por conta própria. Não toquei em `apps/backend`, `supabase/` nem `squad/` (a S1f do Stark estava lá; a migration `20261016150300_memory_actions.sql`, não commitada, é dele).

## 1. O que foi entregue

| # | Entregável | Como | Commits |
|---|---|---|---|
| 1 | **Projetos · Nexo** | Identidade do Nexo, faixa "Precisa de você", "Roadmap de projetos" (o seed não tem projeto: vazio exato da V4.6, "Começar pela Campanha de Natal" abre a Sala em tela cheia com "Quero uma campanha de Natal para vender mais panetones." no campo, sem enviar), "Seu Squad está trabalhando" e "Próximos marcos" com os vazios exatos, **"Todos os trabalhos"** com "Quadro", "Lista" e "Biblioteca", filtro de tipo e por especialista, "Limpar filtros". Colunas e mapa de status do FLUXOS §10.2 (`needs_you` → "Precisa de você"; `in_progress` e `paused` → "Em andamento"; `scheduled` → "Programados"; `approved` e `done` → "Concluídos"), sinal STK6 (anel, ponto, relógio, check, pausa), sem barra de progresso inventada. Só GET; nenhum CSS novo (as classes já estavam no CSS portado) | `e42f2c0`, `16e395f`, `22dc43a`, `95f18fc`, `ba738e5`, `37bd6f8` (sub-agente a) |
| 2 | **Detalhe do trabalho** | Origem da conversa ("pedido na conversa com o Otto · 15/10"), time em pilha, link do projeto quando há, histórico montado do que a API devolve (pedido, runs, versões, decisões), "Conversar" abre a conversa do trabalho; voltar leva ao ambiente de origem. Rótulos e botões que o `live.spec` e o `Approval.test` usam ficaram intactos | `897229b`, `b5e8573` (sub-agente a) |
| 3 | **Memória da Marca** | Mesmo DOM e classes do template V4.5 (L5188–5292) com a linguagem da V4.6: dossiê ("O que o squad sabe", "De onde vem" com as fontes e o estado SRCST5, os sete rostos, "Principais conhecimentos" com o estado KST5 e "Ainda não sabe · contar agora"); **"O squad percebeu"** com "<Agente> percebeu · <assunto>", a pergunta, "Origem: …" e **Confirmar / Corrigir ("Salvar como confirmado") / Descartar só para o owner** (os outros veem em leitura, com "Quem decide é o dono da conta"); conflito com "Vale este" e "Nenhum dos dois: corrigir"; desatualizado; "Ver mais N"; **"Alterações recentes"** só com o que aconteceu (V4.6: não repete o que ainda espera você); **"Tudo o que o squad sabe"** com as abas e contagens ("Tudo", "Meu negócio", "Minha marca", "Meu público", "Conhecimento e aprendizados", "Conexões e fontes"), busca em chave, valor e assunto ("N resultados para “…”", "Limpar a busca", "Nada encontrado…"), **"Ver pelo especialista"** ("O Otto consulta N conhecimentos" · "Usa … Sugestões e conflitos ficam de fora até você decidir." · "Ver tudo"), linha aberta com origem, estado por extenso, "Antes: “…”", "Alterações" (histórico do conhecimento pela API), quem usa e as ações; "Mostrar descartados e fora de uso (N)"; faixa "Squad · Para você confirmar" com "Revisar" (desce até "O squad percebeu"). **Ao vivo:** `memory_suggestion.created`, `.decided`, `.seen`, `.done` no canal `workspace:<id>` → a tela relê o servidor e a sugestão que chegou na sessão ganha o destaque de nova | `f75e54f`, `8db7b10`, `b97515a` (autosave), `6015364` |
| 4 | **Minha Equipe & Conversas** | Cabeçalho com subtítulo por aba e "Abrir a Sala do Squad"; aba "Equipe": os sete com nome e papel, perfil oficial (função completa, apresentação, "agora" a partir do estado vivo real, "Conversar com a Kaia", "Pedir algo") e as abas "Agora", "Competências", "Entregas", "Trabalha com", com os vazios da V4.6; aba "Conversas": lista real (Sala, diretas, de objeto, grupo), busca, filtro por rosto, última mensagem lida de verdade (`before=latest`, teto de 20 conversas), ponto de não lida a partir do `unread_count` que a S1f publicou às 12:02, "Nova conversa" por especialista (rascunho `fresh`) | `4d88e1a`, `c936369`, `82fd9ac`, `7c3813b` (sub-agente b) |
| 5 | **Modo Autônomo** (só o vazio e os limites) | O que a V4.6 desenha sem nenhuma responsabilidade: "Deixe por conta do squad o que se repete. Você define os limites.", "Nada delegado ainda." com "Delegar a primeira responsabilidade", resumo, "O que mais pode ficar com o squad", "Como a autonomia funciona" (os três níveis da página) e os vazios de "Próximas execuções" e "Histórico de execuções"; botões que dependem de rotina mostram o aviso padrão (rotinas são Fase 3) | `4d88e1a`, `82fd9ac` (sub-agente b) |
| 6 | **Bia, Kaia, Kiwi, Max e Íris** | Identidade, faixa e a visão protagonista com o **vazio honesto da própria V4.6**: Bia ("Direção estratégica" · "Analisar meu negócio", que abre a conversa direta com o pedido no campo, sem enviar); Kaia (estúdio: "Bancada da Kaia" com "Em produção" contando os trabalhos reais dela e "Criações" com os sete filtros e contagens reais, galeria vazia); Kiwi **sem nenhum número ilustrativo** (as três frentes e as regras da V4.6, vazio que pede conexão); Max ("Central de relacionamento", as quatro fontes com estado); Íris (o vazio, os três indicadores, "Ver conexões" → Memória). Linha de identidade do Kiwi alinhada à V4.2 (L11320) | `5195d7a`, `87b9db3`, `29b7dbd`, `3dc70f5`, `7a39f04`, `0431e79` (sub-agente c) |
| 7 | **Barra "Plano Squad · créditos do mês"** | No menu da conta, entre os negócios e "Minha conta", como na V4.6 (L4559): "Plano <plano> · créditos do mês" e a parte usada do ciclo em % (`cycle_used / cycle_credits` de `GET /me`, S1e). Miolo 64% (36 de 100 restantes), Trilha 4%. Sem preço nem saldo em créditos na tela | `857538e` |
| 8 | **Número suave da Memória na barra** | Sugestões abertas (V4.6 `memN`), dica "1 informação para confirmar"; leitura leve no layout, em paralelo com o núcleo. A A1f tinha deixado de fora por falta de dado, que a S1d criou | `6b9c19d` |
| 9 | Limpeza | `PlaceholderView` e as chaves `pages.auto`, `pages.mem`, `pages.team` saíram (as três telas têm página própria) | `5808f3e` |
| 10 | Testes e e2e | Vitest: Memória (15), créditos (2), barra (+1), Projetos (13), detalhe do trabalho (6), Equipe e Modo Autônomo (15), ambientes (11). E2e novo `apps/web/e2e/a1b.spec.ts` (3 fluxos, §2.2) | `6015364`, `857538e`, `6b9c19d`, `22dc43a`, `b5e8573`, `82fd9ac`, `7a39f04`, `094eec9` |
| 11 | Comparação lado a lado | `docs/parciais/a1b/`: `proto-*` (protótipo na 8010, cenário certo pelo guia "Demo") × `nosso-*` (Marina, seed da Miolo, 1440×900) e 22 `lado-a-lado-*` (Memória 5, Projetos 6, trabalho 2, Equipe 2, Modo Autônomo, Bia, Kaia, Kiwi, Max, Íris, créditos) | vários (acima) |

## 2. Como foi verificado

### 2.1 `make test-web` (12:12, depois do último código; exit 0)

```text
pnpm --filter web lint            → eslint (sem problemas)
packages/contracts typecheck: Done
packages/ui typecheck: Done
apps/web typecheck: Done
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:  Test Files  16 passed (16)
apps/web test:       Tests  121 passed (121)
```

O web tinha 58 testes no fim da A1a; esta fatia somou 63. Os da Memória, nominalmente (`vitest run test/Memory.test.tsx`, 12:06): `Tests 15 passed (15)`.

### 2.2 `make e2e` (12:12 → 12:13: `pnpm --filter web build` + Playwright com o worker simulado; exit 0)

```text
 ✓ Compiled successfully in 3.7s
 ✓ Generating static pages (9/9)
├ ƒ /app/[workspace]/equipe                        4.81 kB         203 kB
├ ƒ /app/[workspace]/memoria-da-marca              9.67 kB         201 kB
├ ƒ /app/[workspace]/modo-autonomo                 1.24 kB         124 kB
├ ƒ /app/[workspace]/squad/[agente]                9.55 kB         208 kB
├ ƒ /app/[workspace]/squad/[agente]/trabalho/[id]  2.83 kB         133 kB
Running 10 tests using 1 worker
  ✓   1 › Projetos e Memória da Marca (A1b) › o Quadro de Projetos mostra o trabalho do seed na coluna Precisa de você (514ms)
  ✓   2 › Projetos e Memória da Marca (A1b) › dossiê da Miolo: o que o squad sabe, de onde vem, principais conhecimentos e o que espera o seu ok (440ms)
  ✓   3 › Projetos e Memória da Marca (A1b) › Marina confirma o que o Otto percebeu, o conhecimento aparece e a outra aba recebe ao vivo (3.1s)
  ✓   4 › área logada › sem sessão, /app manda para o login e volta para onde a pessoa ia (417ms)
  ✓   5 › área logada › senha errada mostra o erro em português e mantém o e-mail (274ms)
  ✓   6 › área logada › Marina entra e vê a barra lateral com o workspace Miolo (857ms)
  ✓   7 › área logada › Pedro entra sem workspace, cria pedro-teste-<timestamp> e cai no shell dele (963ms)
  ✓   8 › site público › página inicial em pt-BR com SEO e crawlers de IA liberados (178ms)
  ✓   9 › Ao vivo (A1a) › Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova (4.1s)
  ✓  10 › Ao vivo (A1a) › Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo (4.4s)
seed aplicado: ../../supabase/seed.sql
  10 passed (17.6s)
```

Log do worker da mesma rodada (`/tmp/hellosquad-e2e-worker.log`): `run 29a00e51-… concluído: entrega v1; … 10.00 créditos cobrados`, `run 6aa78212-… concluído: entrega v2; …`, `worker encerrado`. Antes, às 12:09, o `a1b.spec.ts` sozinho já tinha passado 3 de 3 contra o `next dev` (`E2E_WORKER=off`), com o seed reaplicado pelo `make seed` dentro da trava.

**O que os três fluxos novos provam:**

- **Quadro:** em `/app/miolo/squad/nexo`, o roadmap mostra "Nenhum projeto ainda"; a região "Precisa de você, 1 trabalho" tem "Legenda do post de sábado: pão de fermentação longa"; "Em andamento", "Programados" e "Concluídos" não têm.
- **Dossiê da Miolo:** marca "Miolo"; "Público: Moradores de Pinheiros e Vila Madalena, 28 a 45 anos", "Produtos: Pão de fermentação longa", "Tom de comunicação: Acolhedor, direto, sem gíria"; fontes "Onboarding e o que você contou: Declarado por você" e "Instagram: Não conectada"; faixa "Squad · Para você confirmar: 1 sugestão. Revisar"; "Palavra proibida … Decisão sua" e, em "Alterações recentes", "Você decidiu: não usar a palavra 'artesanal' nas legendas".
- **Confirmar como Marina:** uma segunda aba da mesma sessão fica aberta na Memória, com uma marca na `window`. Na primeira aba, o cartão "Otto percebeu · descobertas", com "Posts com bastidores do forno têm mais salvamentos?", recebe "Confirmar". Resultado: aviso "Confirmado. Todo o squad passa a usar.", o cartão some, aparece "Tudo revisado. …", a linha "Bastidores … Confirmado" entra em "Tudo o que o squad sabe", o histórico ganha "Você confirmou: posts com bastidores do forno têm mais salvamentos" e a faixa sai. **A segunda aba muda sozinha pelo Realtime (`memory_suggestion.decided`), sem recarregar: a marca na `window` continua lá.** Depois de recarregar, a linha aberta diz "Confirmado por você" e "Como o squad utiliza".

### 2.3 No navegador (Playwright, Marina, seed da Miolo)

- Memória sem erro de console (12:15). A barra lateral diz "Memória da Marca, 1 informação para confirmar", com o número suave "1". O "Revisar" da faixa leva "O squad percebeu" ao topo (y de 576 para 8; URL `…/memoria-da-marca#me-pend`). Captura `nosso-memoria-revisar.png`.
- Menu da conta: `.sb-cred` = "Plano Squad · créditos do mês / 64%", igual ao protótipo na conta em uso (`lado-a-lado-conta-creditos.png`).
- Sub-agentes, nas rodadas deles: sem erro de console em Projetos, detalhe, Equipe, Modo Autônomo e nos cinco ambientes. Numa captura da Equipe apareceu um 500 de recurso, que não voltou em duas repetições. A causa provável é a API recarregando com o commit da S1f das 12:02, mas não foi confirmada.

### 2.4 Texto fixo e dado inventado

Todo texto novo está nos catálogos `projects.json`, `memory.json`, `team.json`, `auto.json` e `envs.json`. As chaves são tipadas: chave inexistente não compila. O teste dos ambientes confere que Bia, Kiwi, Max e Íris não mostram dígito nenhum e que o Kiwi não traz "27%", "6,6%", "R$ 0" nem "dados ilustrativos". O teste da barra confere que ela não mostra preço.

## 3. Decisões técnicas (não mudam a experiência)

1. **Três frentes em paralelo com arquivos separados.** Antes de abrir as frentes, commitei a estrutura comum: um catálogo por área registrado no `index.ts` e a rota `squad/[agente]`, que despacha para `ProjectsPage`, `StrategyPage`, `BrandPage`, `GrowthPage`, `CrmPage` e `ResultsPage`. Cada frente commitou só os próprios caminhos (`git commit -- <caminhos>`); o autosave levou um ajuste meu (`b97515a`).
2. **Memória lida no servidor** (dossiê, todas as sugestões e conflitos) e **decidida por Server Actions** (`memory-actions.ts`). Depois de decidir, `router.refresh()`. O Realtime faz o mesmo para quem está em outra aba: a ação `memory` do estado ao vivo sobe a versão e a casca relê.
3. **Quem usa vazio = todo o squad.** A V4.5 omite `ags` quando são os sete; o seed grava `used_by_agents` vazio nos conhecimentos do cadastro.
4. **Busca no cliente, como o protótipo** (chave, valor e assunto, sem diferenciar maiúsculas). A busca da API (radicais, S1d) continua servindo o runtime. Assuntos na ordem `TOPIC5`; assunto fora da lista vai ao fim.
5. **"Principais conhecimentos" por assunto.** A V4.5 aponta para itens fixos; aqui cada chave usa o primeiro conhecimento em uso do assunto equivalente, com "Confirmado" e "Decisão sua" antes.
6. **`NeedsStrip`** ganhou `who` ("Squad" na Memória, V4.6 L13868) e `tight` (`nd is-tight`, L13832). **Painel de conversa** ganhou o contexto `memory`, com Tipo "Conhecimento" (V4.6 `_cx('mem')`).
7. **Peso:** o primeiro carregamento de `/app/[workspace]` está em 216 kB (147 kB no fim da A1f), e as telas novas em 201–208 kB. Não investiguei; fica como observação.

## 4. Divergências do protótipo e perguntas (registradas, não corrigidas)

Legenda: **D** = dado que a API ainda não tem (vazio honesto); **P** = só existe no protótipo (simulação); **?** = pergunta.

| # | Tela | O que a V4.6 faz | O que ficou | Tipo |
|---|---|---|---|---|
| 1 | Memória · dossiê | Descrição ("Padaria de fermentação natural · Pinheiros, São Paulo · desde 2016") e a síntese do squad (`SUM5`) | A síntese do primeiro acesso da V4.6 ("O squad ainda sabe pouco sobre Miolo: só o que você contou no cadastro. …") e "Síntese a partir do cadastro", sem a linha de descrição. A API não tem perfil da marca: `brand_profiles` está na S1f | D |
| 2 | Memória | "Adicionar conhecimento", "Ainda não sabe · contar agora", "Não usar mais", "Voltar a usar", "Confirmar" de "Da fonte" e "Observado", "Continua valendo" | Aviso "Ainda não disponível nesta versão." (padrão da A1f) até as rotas da S1f entrarem; a migration está sendo escrita | D |
| 3 | Memória | "Enviar planilha nova (simulação)", "Reconectar (simulação)", "Conectar (simulação)" e o rodapé "Dados ilustrativos. Neste protótipo nenhuma conta é sincronizada de verdade: …" | Fora, como o "Demo" e o "Guia do protótipo" da A1f | P |
| 4 | Memória · conflito | Só o horário: "… sobre o horário. …"; opções "Google Perfil · 20/09" e "Site · lido em 14/09" | Frase com a chave do conhecimento ("… sobre <chave>. …"); opção "<fonte> · <dd/mm>". O seed não tem conflito | ? Diogo |
| 5 | Memória · sugestão | "Origem: Ajuste pedido à Kaia · post do Dia Mundial do Pão" | Sem origem gravada (seed e worker): "Origem: Especialistas", o rótulo da fonte do tipo observação | ? Stark/Diogo: o worker passa a gravar a origem? |
| 6 | Memória · fontes | Subtítulo e descrição escritos ("@miolo.padaria", "Para ler os posts e acompanhar os números") | Data da última leitura e as permissões reais ("Ler posts e métricas · Publicar só com sua autorização") | D |
| 7 | Memória · linha aberta | Cada especialista diz como usa ("nas peças de Natal") | "<Nome> · <papel>" sem o "como usa"; a API não guarda (`how`, S1d §7) | D |
| 8 | Memória · histórico | Textos do `_m5Hist` e do `LOG5` | Os mesmos ("Você confirmou: …", "Você corrigiu: …", "Você descartou: …", "Você decidiu: …", "<O Otto> sugeriu: …"). O conflito vira "Você resolveu o conflito de <chave>: vale <valor>" (a V4.6 só tem "… do horário: vale o do Google Perfil") | ? Diogo |
| 9 | Memória · "Conversar sobre isso" | Conversa do conhecimento, com a primeira fala roteirizada do agente | Conversa direta com o especialista (o que percebeu ou o primeiro que usa; com todos, o Nexo), com o cartão "Conhecimento". A API ainda não guarda o contexto `memory_fact` (S1f), e não invento fala de agente | D |
| 10 | Memória · quem não é owner | A V4.6 tem uma pessoa só | Tudo em leitura, com "Quem decide é o dono da conta" no lugar das ações, como na A1f | ? (FLUXOS §11 item 1) |
| 11 | Barra de créditos | "Plano Squad · créditos do mês 64%" | Igual, com o plano e o ciclo de `GET /me`. Os valores provisórios estão marcados no banco (S1e); a tela não diz "provisório", porque a V4.6 não tem esse rótulo | ? dono + Diogo: quer um selo? |
| 12 | Todas as telas novas | "a Miolo", "da Miolo", "para a Miolo" | "Miolo", "de Miolo", "para Miolo", a convenção da A1f | ? (pergunta 5 da A1f) |
| 13 | Quadro | Sem desenho para `draft`, `blocked`, `failed`, `cancelled` | Fora do Quadro | ? dono + Diogo (§11 item 3) |
| 14 | Filtro "Projetos" | Pega cartões de projeto | Projeto não é trabalho na API: o filtro pega trabalhos com projeto; o projeto aparece só no roadmap | ? dono + Diogo |
| 15 | Biblioteca | Só peças visuais e documentos | Vazio exato da V4.6 (a entrega do seed é legenda, texto) | ? Diogo: legenda é documento, peça ou fica fora? |
| 16 | Cartão e Lista do Quadro | Frase de status, prazo e próximo passo | Rótulo da situação; "Data" vira "—" ou "até dd/mm" quando a pendência tem prazo. Os campos chegam na S1g | D |
| 17 | Roadmap | Eixo no tempo, faixas e marcos | Linhas sem faixa e detalhe com "Sem data" e "Sem prazo" (sem projeto no seed). Datas e marcos chegam na S1g | D |
| 18 | Histórico do trabalho | Textos do roteiro | Literais da V4.6 onde existem, mais textos novos: "<Nome> começou a trabalhar nisso", "… não conseguiu concluir", "Você pediu uma nova proposta", "Você cancelou o trabalho", "Você respondeu", "Você não aprovou", "Você pediu um ajuste na vN" | ? Diogo |
| 19 | "Conversar com Nexo" nos cartões de Projetos | Contexto "Resumo" | Contexto de ambiente, com "Resumo · Projetos" na linha de apoio | — |
| 20 | Minha Equipe · Conversas | "Nova conversa" só no seletor do cabeçalho da conversa (L5507) | "Nova conversa com a Kaia" também ao lado dos filtros, quando um especialista está filtrado | ? Diogo |
| 21 | Minha Equipe · conversa em grupo (S1f) | "conversa em grupo · demonstração" | Texto literal; abre como conversa direta do agente principal, até o painel ter modo grupo | ? dono: manter "demonstração" no produto? |
| 22 | Minha Equipe · palco | Palco do DS com olhar e piscada | Mesmo DOM, desenhos parados | ? portar o motor depois |
| 23 | Modo Autônomo | Três níveis na página (Analisar, Preparar, Executar); "Nunca" só no detalhe da responsabilidade | Os três da página. O briefing da frente pedia quatro; ficou o protótipo | — |
| 24 | Kaia · primeiro acesso | Contador 0 e galeria sem texto | "Nenhuma criação ainda." · "O que a Kaia produzir para Miolo aparece aqui. Escolha um tipo acima para fazer o primeiro pedido." (regra do Documento Mestre §7) | **? Diogo (§11 item 10)** |
| 25 | Kiwi · primeiro acesso | Os mesmos números ilustrativos da conta em uso | Sem número. Objetivo: "Nenhum objetivo de crescimento combinado ainda." · "Conecte o Google Perfil ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real." · "Ver conexões". Frentes: "Sem dados" ("nenhuma busca para mostrar"), "Nada no ar" ("nada é investido sem a sua autorização"), "Nenhum teste" ("nenhuma hipótese na fila"). Corpos: "Nenhuma busca para mostrar ainda.", "Nenhuma campanha ainda.", "Nenhum teste ainda." (Documento Mestre §7 e §12) | **? Diogo (§11 item 10)** |
| 26 | Bia, Kaia, Kiwi · pedidos | Abrem uma conversa de pedido já enviada, com resposta roteirizada | Abrem a conversa direta real com o pedido no campo, sem enviar | D |
| 27 | Max · "Importar", "Conectar", "Saber mais" | Conversas roteirizadas | Aviso padrão | D |
| 28 | Kiwi · "Interesse estimado pelo Kiwi" | "o Kiwi" | "pela Kiwi" (decisão do dono de 15/10) | — |

**Perguntas, por destinatário:**

- **Diogo:** 4, 8, 15, 18, 20, 22, 24 e 25 (os vazios de Kaia e Kiwi são o item 10 da §11 do FLUXOS).
- **Dono + Diogo:** 11, 13 e 14.
- **Dono:** 21.
- **Stark:** 5.

## 5. O que ficou de fora

- **Ações da Memória que ainda não têm rota** (§4, item 2): a S1f está escrevendo. Quando entrarem, é ligar os botões que já estão na tela.
- **"Conta em uso" de Estratégia, Kaia, Kiwi, Max e Íris** e os "<Agente> percebeu" desses ambientes: a API não tem direção, peças, métricas, CRM nem insights. Também fica de fora a variante da Íris "começou a acompanhar o Instagram hoje", porque não há conexão real.
- **Roadmap no tempo, marcos, detalhe de projeto e de campanha:** sem datas, marcos nem projetos (S1g).
- **Rotinas do Modo Autônomo** (Fase 3): interruptor, responsabilidades, execuções e detalhe.
- **Biblioteca com itens:** não há entrega visual (o motor de imagem é do Vic), e a lista de trabalhos não traz as entregas.
- **Minha Equipe:** aba Conversas por URL; prévia de peça em "Entregas".
- **Investigar o peso** do primeiro carregamento (§3, item 7).

## 6. Onde discordei do briefing

- **Áreas da Memória:** o briefing cita três ("Meu negócio, Minha marca, Conhecimento"); a V4.6 tem quatro ("Meu negócio", "Minha marca", "Meu público", "Conhecimento e aprendizados") mais "Conexões e fontes". Segui a V4.6, como a S1d.
- **Níveis do Modo Autônomo:** eu tinha pedido os quatro à frente (b); a página da V4.6 mostra três ("Nunca" fica no detalhe). Ficou o protótipo.

## 7. Estado em que deixei a máquina

- **`next dev` da 3100:** derrubei às 12:12 para o `make e2e` (o build quebra o dev, e o Playwright reaproveitaria a porta). Subi de novo às 12:13, com `setsid make dev-web` desacoplado da sessão (log em `/tmp/hellosquad-dev-web.log`); `GET /entrar` → 200. Antes rodava o `make dev-web` que a A1a subiu às 11:43.
- **API da 8100:** intocada (`/health` 200). O worker do e2e encerrou ("worker encerrado").
- **Banco:** seed reaplicado pelo teardown do `make e2e` (12:13), dentro da trava. Às 12:09 já tinha sido reaplicado uma vez, pelo `make seed` do e2e da fatia rodado sozinho.
- **Arquivos fora de commit:** nenhum meu. `supabase/migrations/20261016150300_memory_actions.sql` é da S1f.
- **Logs e scripts:** logs em `/tmp/a1b*` (`a1b-test-web-1.log`, `a1b-make-e2e-1.log`, `a1b-e2e-1.log`, `a1b-mem-vitest.log`). Scripts das capturas em `/tmp/a1b/`, `/tmp/a1b-proj/`, `/tmp/a1b-team/` e `/tmp/a1b-envs/`. Nada disso contém chave.
