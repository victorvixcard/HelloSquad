# SA3b — UI Squad IA do Super Admin · relatório

Aranha (Frontend & Design), 16/10/2026, 22:26–22:56, em paralelo com a SA4a do Stark (`apps/backend`, `supabase/`), sem sub-agentes. Skill principal `frontend-vix`; apoio `verification-before-completion`. Área tocada: `apps/web` (rotas `/admin/squad`, `/admin/squad/[agente]`, `/admin/regras`, ações de servidor, componentes `components/admin/squad/*`, barra lateral, catálogo `admin` nos 3 idiomas, testes), `packages/ui` (o `regras.css` do SA0 portado pelo script de extração) e os documentos da fatia. Nada em `apps/backend`, `supabase/`, `squad/` ou `packages/contracts`.

## 1. Entregue

| # | Item | Onde | Conteúdo | Commits |
|---|---|---|---|---|
| 1 | **Squad (lista dos 7)** | `app/admin/(painel)/squad/page.tsx`, `components/admin/nav.ts`, `AdminSidebar.tsx`, `AdminPage.tsx` | `GET /admin/squad`: palco com os sete (`Agent` do DS) e papel; cartões (agentes, deliveries com quantas têm skill, runs em 30 dias, rascunhos esperando); tabela com cor (amostra + hex), forma, papel completo (**Kiwi = Growth Marketing**, vem da API), modelo e esforço padrão, deliveries, versões da Alma e do agent.yaml (rascunhos marcados, último hash do prompt ou "sem run ainda"), custo médio por run em 30 dias ("sem run em 30 dias" quando nulo). **Squad e Regras de negócio saem de "em breve"** e abrem; nas páginas do squad os sete aparecem como subnavegação com o agente mini (SA0), o aberto com `aria-current`. Etiqueta do topo "Edição com versão" no lugar de "Só leitura" nas telas do Squad IA | `6bcc515`, `aa955a5` |
| 2 | **Agente › Alma** | `app/admin/(painel)/squad/[agente]/page.tsx`, `squad/actions.ts`, `components/admin/squad/SoulPanel.tsx`, `VersionFlow.tsx`, `Md.tsx` | `GET /admin/squad/agents/{id}`: as seis seções com título, texto (markdown mínimo do SA0, `{{marca.nome}}` destacado), "mudou na vN", palavras; "**N de N seções entram no prompt**, cerca de X caracteres"; versão ativa, data e autor. **Editar seção** (título, texto, entra no prompt, motivo) → `PUT …/soul/sections/{section}` → rascunho (versão N+1, não ativa). Cartão "**Versão N da Alma do Otto pronta para publicar**" (seções alteradas, fora do prompt, tamanho) com **Publicar** (confirmação) · **Comparar versões** (`GET /admin/squad/diff`, lado a lado no diálogo largo do SA0, seções que mudaram, linhas iguais recolhidas com contexto) · **Descartar** (confirmação). Lista de versões (`GET /admin/squad/versions`): ativa "Em uso"; substituída com "Comparar com a ativa" e "**Voltar para esta versão**" (confirmação com motivo → `POST …/restore`, versão nova já ativa, "voltou da versão N"); voltar bloqueado com explicação enquanto há rascunho (a API responde 409). Erro da API aparece no diálogo, com a mensagem dela | `69565b2`, `6423523` |
| 3 | **Skills** e **Ferramentas e limites** | `SkillsPanel.tsx`, `ConfigPanel.tsx`, `AdminTabs.tsx` (abas em linha e sem `#` dentro de outra aba) | Skills: uma aba por delivery do agente; skill escrita mostra versão, tipo de entrega, briefing essencial, tamanho e as seções `##` (procedimento, formato, critérios); **editar** o arquivo inteiro (a API recebe o arquivo) → rascunho → publicar/comparar/descartar; versões com voltar. Sem skill: **estado vazio honesto** ("Skill ainda não escrita… o Otto não executa esta delivery"). Ferramentas: `config.fields` — ferramentas permitidas com a nota do agent.yaml ("Pede autorização" só quando a nota diz; "idem" herda a de cima), autonomia máxima, modelo por etapa (padrão, esforço, raciocínio, triagem…) com link para Regras por tarefa, colaboradores (agente mini, link), memória (lê / sugere), deliveries, **agent.yaml visível só leitura**; **editar** ferramentas (checkboxes contra o catálogo de 48) e autonomia (analisar/preparar/executar) com motivo → `PUT …/config` → rascunho; versões | `aa817ba` |
| 4 | **O que ele lê** | `PromptPanel.tsx` | `GET …/prompt?route=…&draft=…`: rota (deliveries com skill, Conversa, Reflexão) e versão (**Ativa / Com os rascunhos**); cartões System, Mensagem, Total estimado (≈ tokens, com o método da API) e **hash do prompt** com a origem; blocos na ordem do runtime com caracteres, tokens estimados e marca **Em cache / Sem cache**; versões usadas; contexto de exemplo da API; copiar o prompt. Só leitura. A aba remonta quando as versões mudam (sem prompt velho depois de publicar) | `22de84c`, `a2f0b84` |
| 5 | **Regras de negócio** | `app/admin/(painel)/regras/page.tsx`, `RulesPanel.tsx`; `packages/ui/scripts/extract-super-admin-css.ts` (+ `regras.css`) | `GET /admin/rules` + `GET /admin/rules/{id}` + `GET /admin/squad/shared/README.md`: cartões (documentos, parágrafos, pendentes, propostas), "Como ler as marcações", lista de documentos em **abas verticais** (setas, Home, End) e o documento: **marcação por parágrafo** (`[DECIDIDO] [BASE ATUAL] [PENDENTE] [PROPOSTA]`, "Pendente: o painel não aplica"), "**Entra no prompt / Referência interna**" com os sete que leem. **Editar parágrafo** (texto, marcação, fonte, motivo) → `POST /admin/rules/{id}/versions` com todos os parágrafos → versão nova; "Levar para o prompt / Tirar do prompt" com confirmação; rascunho das regras compartilhadas para publicar. **Regras compartilhadas dos agentes** (`squad/README.md`) editam pela rota **`shared/README.md`**: cada item numerado é um parágrafo "Base atual"; editar troca só a linha → rascunho → publicar/comparar/descartar; versões | `aa955a5` |
| 6 | **Testes, lado a lado, relatório** | `test/SquadIA.test.tsx` (17), `test/SuperAdmin.test.tsx` (1 ajustado), `e2e/sa3b-squad.spec.ts` (2), `docs/parciais/sa3b/` | §2 | `4361266` (autosave levou o Vitest), `a2f0b84`, `f801aa5`, `66e7285`, `1666c24`, `6423523` |

## 2. Como foi verificado

Build e e2e **só no worktree `/tmp/sa3b-wt`** (último no commit `6423523`), web de produção na **3200**; a web do dono na 3100 ficou no ar e só recebeu leituras (login do Vic e capturas). Banco pela trava (`flock -o -w 600 /tmp/hellosquad-db.lock`), sem esperar. Saídas completas em `/tmp/sa3b/*.log`.

| Verificação | Comando | Resultado (colado) |
|---|---|---|
| Build de produção | `pnpm --filter web build` (worktree, `6423523`) | `build exit=0`; `├ ƒ /admin/regras 4.53 kB 136 kB` · `├ ƒ /admin/squad 187 B 128 kB` · `├ ƒ /admin/squad/[agente] 7.47 kB 139 kB` |
| e2e da fatia + o da SA2 | `flock … env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3200 E2E_WORKER=off pnpm --filter web exec playwright test e2e/sa3b-squad.spec.ts e2e/sa2-admin.spec.ts --project=chromium` | `✓ 1 … sem sessão, /admin leva ao login …` · `✓ 2 … o Vic fictício entra no /admin e vê as sete telas …` · `✓ 3 … a Marina … recebe o 403 honesto …` · `✓ 4 … o Vic abre o Otto, edita uma seção da Alma, publica, vê a versão nova e volta para a anterior (4.0s)` · `✓ 5 … a Marina (owner, sem papel de plataforma) recebe o 403 honesto no Squad IA (453ms)` · `5 passed (9.4s)` · `e2e exit=0` |
| `make test-web` | `make test-web` (worktree, `6423523`) | `packages/contracts test: Tests 9 passed (9)` · `packages/ui test: Tests 50 passed (50)` · `apps/web test: Test Files 37 passed (37)` · `Tests 440 passed (440)` (423 da SA2 + 17) · ESLint e `tsc --noEmit` dos três pacotes sem erro · `make test-web exit=0` |
| Vitest da fatia | `npx vitest run test/SquadIA.test.tsx test/SuperAdmin.test.tsx` | `Tests 34 passed (34)` (17 + 17) |
| Edição pela tela → versão nova auditada | `select … from public.audit_events where entity_type = 'squad_version'` depois do e2e | `22:47:36 squad.draft_saved v2 nota=e2e SA3b por vic@hellosquad.example` · `22:47:37 squad.version_published v2 … por vic@hellosquad.example` · `22:47:38 squad.version_restored v3 … por vic@hellosquad.example`; o motivo da volta ("e2e SA3b: voltar") aparece na lista de versões (o e2e confere) |
| O prompt muda com a versão e volta | e2e, aba "O que ele lê" | depois de publicar a v2 o hash `fb290a332565` some e o bloco "regras compartilhadas + Alma" traz o texto novo; depois de voltar (v3 = v1) o hash `fb290a332565` (o mesmo do SA0 e da SA3a para otto/04.01) está de volta |
| Banco do dono limpo depois do e2e | `select kind, count(*) filter (where status='active'), … from public.squad_versions group by kind` | `config:7 ativas, 0 outras` · `shared:3 ativas, 0 outras` · `skill:19 ativas, 0 outras` · `soul:7 ativas, 0 outras` (o `afterAll` apaga só as versões que o fluxo criou, com os gatilhos desligados nessa limpeza, como o roteiro da SA3a) |
| Paridade dos catálogos | `test/catalog-parity.test.ts` (dentro do `make test-web`) | en e es com as mesmas chaves e argumentos do pt-BR; o en sem apóstrofo reto (regra do catálogo: pegou 7 textos meus na primeira rodada, corrigidos em `1666c24`) |
| CSS do SA0 em dia | `test/generated.test.ts` do `@hellosquad/ui` | `super-admin.css está em dia com o protótipo SA0` (agora com `regras.css`) |
| Telas reais na 3100 (só leitura) | Playwright com o login do Vic: `/admin/squad`, `/admin/squad/otto#alma/#skills/#ferramentas/#le`, `/admin/squad/nexo#le`, `/admin/regras` | `h1` certo em todas, `status-errors: 0` (nenhum erro de console) |
| Lado a lado | SA0 (8020) × e2e (3200, seed), 1440×900 | `docs/parciais/sa3b/lado-a-lado-{squad,alma,skills,ferramentas,le,regras}.png`; `nosso-comparar.png`, `nosso-voltou.png`, `nosso-403-marina.png` |

**O que o Vitest prova (17):** subnavegação dos sete só nas páginas do squad, com o agente aberto como página atual; diff em pares lado a lado e linhas iguais recolhidas com duas de contexto; Alma com "6 de 6 seções entram no prompt", "mudou na v1", `{{marca.nome}}` destacado; editar seção chama a API com seção, título, texto, entra no prompt e motivo, avisa e relê; publicar só depois da confirmação; comparar chama `diff(v1, v2)` e mostra cabeçalhos "Versão 1 · Ativa" / "Versão 2 · Rascunho" e a linha acrescentada como `<ins>`; voltar pede motivo e chama `restore(v1, motivo)`; com rascunho pendente o botão fica desabilitado e explica; erro 409 aparece no diálogo e nada é dado como feito; en e es; Skills com aba por delivery e vazio honesto; Ferramentas com "Pede autorização" (inclusive "idem"), esforço e raciocínio pelo catálogo, YAML visível, edição com lista e autonomia; O que ele lê com cache, tokens e troca de rota/versão; Regras com marcações, pendente não aplicado, abas verticais por teclado, versão nova com todos os parágrafos e regras compartilhadas trocando só a linha do parágrafo no `README.md`.

## 3. Decisões (onde o briefing e o SA0 não definem; nada do combinado foi mudado)

1. **Cada "Salvar rascunho" grava na API na hora** (o SA0 acumulava no estado da página e publicava tudo junto). Nada se perde ao sair da página, e cada gravação vai para a auditoria; o cartão "Versão N pronta para publicar" vem do `soul_draft` da API.
2. **Motivo opcional** em editar, voltar e mudar a flag (a API aceita `note` e não exige). O rótulo diz onde ele fica: "Motivo (fica no histórico de versões)". Conferido: na volta, a SA3a grava o motivo na nota da versão nova (não no payload da auditoria); no rascunho, vai também para a auditoria.
3. **Voltar com rascunho pendente**: o botão fica desabilitado com a explicação (a API recusa com 409); se mesmo assim a API recusar, a mensagem dela aparece no diálogo.
4. **"O que ele lê" remonta quando as versões mudam**, para não mostrar o prompt antigo depois de publicar ou voltar.
5. **Skill edita o arquivo inteiro** (com o cabeçalho), porque o `PUT` da SA3a recebe o arquivo; as seções aparecem lidas do arquivo.
6. **O e2e limpa o que criou** (só as versões novas, gatilhos desligados nessa limpeza), como o roteiro da SA3a: o banco do dono volta à versão 1 de tudo.
7. **Teste da SA2 ajustado**: "no Squad IA só Modelos e Fila abrem" virou "abrem Squad, Regras de negócio, Modelos e Fila" (o briefing manda ativar os dois).
8. **`regras.css` do SA0 portado pelo script** (`extract-super-admin-css.ts`), como a SA2 fez com `planos.css`; o teste de defasagem cobre.

## 4. Divergências do SA0 (registradas, para o Vic e o Diogo)

| SA0 | SA3b | Por quê |
|---|---|---|
| Squad: palco do DS (`SquadStage`, olhos que acompanham o cursor) | os sete com o `Agent` do DS em linha, nome e papel | o `SquadStage` do web é o do Início do produto (estado e CSS do produto); levar o palco para o painel é trabalho à parte |
| Squad: colunas "Prompt (v1 · hash · SOUL de data)" e "Autonomia"; custo "aguarda motor"; cartões "Entregas em 30 dias (cenário fictício)" e "Prompts v1" | "Versões" (Alma vN · agent.yaml vN, rascunhos, último hash ou "sem run ainda"); sem Autonomia; custo por run em 30 dias ou "sem run em 30 dias"; cartões "Runs em 30 dias" e "Rascunhos" | é o que `GET /admin/squad` manda; autonomia está só no detalhe |
| Alma: checkbox "Entra no prompt" direto no cartão | o checkbox fica dentro da edição (salvar gera o rascunho) | toda mudança passa por rascunho e versão |
| Alma: `ApprovalCard` do DS | cartão composto com o mesmo conteúdo (agente, texto, fatos, Publicar · Comparar versões · Descartar) | `@hellosquad/ui` não exporta o `ApprovalCard` |
| Comparar: seção por seção (só as que mudaram) | diff de linhas da API lado a lado, seções que mudaram como chips, linhas iguais recolhidas | é o que `GET /admin/squad/diff` devolve |
| Voltar versão "troca a versão ativa" | cria a versão nova, já ativa, com o conteúdo antigo ("voltou da versão N") | comportamento da SA3a (pergunta 4 dela segue aberta) |
| Skills: editar por seção; vazio com "Começar rascunho" e dados do catálogo (resultado, integrações, pré-requisitos, preço) | editar o arquivo inteiro; vazio sem botão e sem os dados do catálogo | a API recebe o arquivo; o detalhe do agente não traz o catálogo; criar skill nova não foi provado na SA3a |
| Ferramentas: etiqueta "Autônoma" nas outras; cartão "Nunca faz" | só "Pede autorização" quando a nota do agent.yaml diz; "O que nunca faz" fica na Alma; + cartões Deliveries e agent.yaml (só leitura) | não inferir o que o arquivo não diz; o YAML visível é do briefing |
| O que ele lê: seletor "Conta de exemplo" (Miolo, Vitta, Trilha) | sem seletor de conta; + "Ativa / Com os rascunhos" e "Versões usadas" | a API monta com um contexto de exemplo fixo (Miolo); o rascunho é do briefing |
| Regras: cinco documentos (precedência, autonomia, aprovações, créditos, memória) + compartilhadas | "Diretrizes do dono" + "Regras compartilhadas dos agentes" | só esses existem no banco; os outros textos eram fictícios (SA3a, pergunta 5) |
| Regras: "Desfazer alterações" na edição; Dropdown do SA0 | "Cancelar" desfaz; `select` nativo com o mesmo campo | menos um botão com o mesmo efeito; acessível por teclado sem componente novo |
| Selects, checkboxes e segmentado do DS | nativos com o desenho do painel (rota, marcação, ferramentas, autonomia, versão) | o painel não tem `Select`/`Checkbox` interativos portados (a SA2 usa `LockedCheck` só de leitura) |
| Barra: contador de pendentes em Regras de negócio | sem contador | como na SA2 (contadores da barra ficam para a SA4) |

## 5. O que a API precisa (próximas fatias)

- **Autonomia máxima na lista** (`GET /admin/squad`) para a coluna do SA0.
- **Dados do catálogo no detalhe do agente** (resultado verificável, integrações, pré-requisitos, profundidade, preço provisório) para o vazio honesto das skills como no SA0; e confirmar se `PUT …/skills/{delivery}` cria a primeira versão de uma skill que não existe ("Começar rascunho").
- **Motivo da volta na auditoria** (hoje fica na nota da versão nova; o payload de `squad.version_restored` não traz `note`), se o dono quiser o motivo na tela de Auditoria.
- **Regras de negócio**: diff e "voltar versão" para os documentos (hoje só versão nova); criar documento novo quando houver texto aprovado.
- **Contas de exemplo** para "O que ele lê" (o SA0 tinha três; a API usa a Miolo).

## 6. Perguntas ao dono

1. **Voltar versão**: versão nova (como está, SA3a) ou trocar a ativa (como no SA0)? Mesma pergunta 4 da SA3a.
2. **Motivo obrigatório** em publicar, voltar e descartar? Hoje é opcional (a API não exige) e fica no histórico de versões.
3. **`conversa.md` e `reflexao.md`** (instruções das rotas de conversa e reflexão) têm rota (`shared/{doc}`) mas não aparecem no SA0: entram na tela de Regras de negócio?
4. **"Pede autorização"** lido da nota de cada ferramenta no agent.yaml: fica assim ou o agent.yaml ganha um campo explícito por ferramenta?
5. **Skill por seção** (SA0) ou arquivo inteiro (como a API recebe hoje)?
6. **Palco com olhos vivos** no Squad do painel: precisa, ou os sete em linha bastam?
7. Seguem abertas as do SA0 §5, da SA2 §6 e da SA3a §5 (quem pode publicar e marcar "Decidido", `[PROPOSTA]` no prompt, esforço por etapa).

## 7. O que ficou de fora

- **Mobile**: só 1440 (como o SA0 e a SA2).
- **`make e2e` inteiro**: rodei os specs do painel (SA3b + SA2, 5 testes) com a trava; o `make test-web` inteiro está verde.
- **Referências, Motor de imagem** (SA5) e **Consumo, Saúde, Qualidade** (SA4b) continuam "em breve".
- **Criar skill nova** e **criar documento de regras**: ver §5.
