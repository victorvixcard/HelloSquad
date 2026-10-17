# Plano de ação — Fase 3 (Integrações onda 1 contra mocks + Modo Autônomo)

Escrito por Thor (main) em 17/10/2026 07:40. Autorização: o Vic disse em 16/10 11:35 "Manda bala. Vamos seguir!!!" (fila inteira e fases seguintes pelo `docs/PLANO_DE_DESENVOLVIMENTO.md`, sem novo OK); confirmado pela orquestradora em 17/10 07:35. Fases 0, 1, 2 e trilha SA fechadas (ver `PLANO_DE_ACAO_FASE2.md`, `PLANO_DE_ACAO_SA.md`, `ESTADO_E_CONTINUIDADE.md`).

Ao retomar uma sessão: ler este arquivo → `git log` → `docs/parciais/` → sessões vivas → seguir do disco. Nunca re-disparar do zero. PASSO 0 de todo briefing: `docs/DIRETRIZES_DO_DONO.md`. Escopo e critério: `PLANO_DE_DESENVOLVIMENTO.md` §4 "Fase 3". Comportamento combinado: `docs/FLUXOS_DA_V46.md` **§7 (Modo Autônomo)** e **§8 (Conexões)** + `docs/parciais/x1/notas_memoria_autonomo_conexoes.md` §B. Catálogo: 01.04, 04.02 recorrente, 04.04, 04.05, 04.06, 05.03, 07.05, 07.06 (06.04–06.06 só desenho; envio real é Fase 4).

## Restrições do dono que moldam a fase

- **Tudo local, contra mocks**: nenhuma conta real de Meta/Google é criada; os mocks reproduzem OAuth, rate limit, falha e expiração de token. Chaves só por `.env`, vazias no exemplo.
- **Conectar não autoriza agir** (V4.6 L4652): ler é permissão da conexão; publicar, enviar, alterar campanha e investir exigem autorização específica do **dono da conta** por ação (ou autorização antecipada no plano aprovado). Níveis Analisar / Preparar / Executar / Nunca como o §7.
- **Nada publica duas vezes**: `external_actions` idempotentes por chave (workspace, conexão, ação, objeto); prova por teste.
- **Modo Autônomo segue o protótipo**: estados `RST5` (Ativa, Pausada, Bloqueada por integração, Falha na execução, Encerrada, Aguarda sua confirmação) e `EXST5` (Concluída, Falhou, Não executada, Aguarda sua aprovação, Aprovada por você, Programada); catálogo `TPL` (plan, posts, res, opp, reat, reviews, seo, crm); códigos PL/RS/BL/RC-NN; textos por estado; botão Ligado/Pausado; "Delegar" é conversa, não formulário.
- **Kaia continua atrás do adaptador** (motor é do Vic): rotinas que dependem de imagem (`posts`) rodam até a etapa da Kaia e ficam `waiting_engine`.
- Um par por vez (áreas disjuntas), briefings **sem sub-agentes**, commit ≤ 5 min, relatório em arquivo, build/e2e só em worktree `/tmp`, web 3100/API 8100 no ar, check silencioso a cada 10 min, resumo ao Vic a cada 2 h; evitar disparo ~5 min antes das janelas de cota (~02:00, ~07:00, ~12:00, ~17:00, ~22:00).

## Fila

| # | Fatia | Agente | Estado | Depende de | Critério de pronto |
|---|---|---|---|---|---|
| J3 | **Mocks locais dos provedores** em `infra/mocks/` (um processo, portas próprias, `make mocks`): Meta Graph (Instagram + Pages: OAuth, `/me/accounts`, mídia, publicar, comentários), GA4 Data API (relatórios), Search Console (consultas/páginas), Google Business Profile (localPosts, reviews, respostas); OAuth completo (authorize → code → token → refresh → expiração configurável), rate limit (429 com `Retry-After`), falhas injetáveis por cabeçalho/env (5xx, timeout, token expirado), gravação das chamadas para asserção; dados fictícios da Miolo/Vitta/Trilha; documentação `docs/MOCKS_LOCAIS.md` | Jarvis | 🟡 em execução (disparada 17/10 07:45 pela main, Opus 5.5; em paralelo com S3b) | — | `make mocks` sobe; roteiro curl de cada provedor (OAuth → leitura → escrita → 429 → expiração); testes próprios dos mocks; nenhuma chamada sai para a internet; relatório `J3-relatorio.md` |
| S3b | **Responsabilidades, scheduler e execuções**: `responsibilities` (modelo `TPL`, título, responsável, colaboradores, ritmo, opções, nível por ação, estado `RST5`, "o combinado", limites), `responsibility_runs` (código PL/RS/BL/RC-NN, estado `EXST5`, mensagem, link, o que usou da memória), scheduler (`hellosquad-scheduler`) que dispara no ritmo e no fuso do negócio, cria o trabalho/run do runtime, respeita Pausada/Encerrada, reagenda; delegação pela conversa (01.04: o Nexo monta "o combinado" e só ativa com o ok do dono); pausar/retomar/encerrar/delegar de novo; "Aguarda sua aprovação" para o que sai; rotinas iniciais: `plan` (Otto › Kaia, 04.02 recorrente), `res` (Íris, 07.05/07.06), `seo` (Kiwi › Íris), `reat` (Max › Otto); API + Realtime | Stark | 🟡 em execução (disparada 17/10 07:45 pela main, Opus 5.5; em paralelo com J3) | — | pytest: uma rotina real executa sem pedido manual, respeita pausa e nível, gera execução com código e estado; pgTAP (RLS, isolamento, imutabilidade das execuções); relatório `S3b-relatorio.md` |
| S3a | **Conectores atrás de adaptador** (`connections`, `connection_permissions` ler/agir, estados `SRCST5`): Meta (Instagram/Pages), GA4, Search Console, GBP contra os mocks da J3; OAuth por workspace com tokens cifrados no banco (chave por `.env`), refresh, expiração → "Precisa reconectar" e bloqueio das rotinas; `external_actions` idempotentes (publicar, agendar, responder avaliação) só com autorização do dono (04.04, 04.05, 04.06); leituras (05.03, 07.05/07.06 com dados reais do mock, 02.05/02.06); "Reconectar" e "Conectar" reais contra o mock | Stark | ⚪ pendente | J3 ✅, S3b ✅ | publicar duas vezes é impossível por teste; token expirado bloqueia a rotina com a mensagem do §8 e reconectar destrava; rate limit e 5xx se recuperam; relatório `S3a-relatorio.md` |
| A3a | **Conexões e fontes + publicar/agendar com autorização**: aba "Conexões e fontes" da Memória com estados `SRCST5` e ações (Conectar, Reconectar, Enviar planilha), OAuth pelo browser contra o mock, permissões ler/agir visíveis ("Conectar não autoriza publicar"); cartão de envio/publicação com a lista de verificação (aprovado, conexão, autorização); agendar e publicar (04.04/04.05) com autorização específica, resultado e falha compreensível; "Resultados" com dados da conexão | Aranha | ⚪ pendente | S3a ✅ | e2e: Marina conecta o Instagram do mock, aprova um post, autoriza a publicação, vê "Publicado" e a segunda tentativa não duplica; token expirado mostra "Precisa reconectar" e reconectar resolve; relatório `A3a-relatorio.md` |
| A3b | **Modo Autônomo completo** como a V4.6 §7: página (interruptor, resumo "Fazendo sozinho / A seguir / Últimos 7 dias", responsabilidades, encerradas, "o que mais pode ficar com o squad"), delegação pela conversa com o Nexo ("o combinado", níveis, limites), detalhe com ações (Conversar, Editar, Pausar, Retomar, Encerrar, Delegar de novo, Reconectar), histórico de execuções com códigos, estados sempre com ícone e texto, textos por estado, "Precisa de você" integrado | Aranha | ⚪ pendente | S3b ✅ (pode rodar ‖ S3a) | e2e: Marina delega "Planejar meus conteúdos toda semana", o scheduler executa, ela aprova o plano, pausa e retoma; lado a lado com a V4.6; relatório `A3b-relatorio.md` |
| H3 | **QA da Fase 3** (sozinho): critério da fase (rotina real executa sem pedido manual, respeita pausa e permissão, falha de forma compreensível e se recupera; publicar duas vezes impossível), isolamento de conexões/tokens entre tenants, tokens cifrados e nunca expostos, autorização por ação, mocks sem rede, clone limpo | Hulk | ⚪ pendente | A3a ✅, A3b ✅ | `H3-relatorio.md` no formato das anteriores |

## Ordem de disparo

1. J3 ‖ S3b → 2. S3a ‖ A3b → 3. A3a → 4. H3 (sozinho). SA5 e Kaia visual quando o motor chegar.

## Pendências herdadas (entram onde cabem)

- H2-17/S2g: revogação de consentimento já existe por rota; a tela entra na A3a (cartão de envio do Max) ou na Fase 4 com o envio.
- H1-01 (token do Realtime/senha atual), H2-25 (CSP nonce, HSTS), H-SA-08/10: Fase 5.
- SA6b: "Ver como o cliente" depende de decisão do Vic; A2b §5.3 (contato ativo/inativo/novo): pergunta ao Vic.

## Perguntas ao Vic (não bloqueiam; leitura conservadora em vigor)

1. Autorização antecipada no plano aprovado vale para publicar cada post do plano sem clique (V4.6 "Autorizado: o que você aprovar no plano")? Conservador: sim, só para os itens aprovados no plano, nunca para alterar campanhas ou investir.
2. Fuso das rotinas: o do negócio (`workspaces.timezone`, hoje Brasília fixo nos fictícios)? Conservador: sim.
3. Meta Ads (05.03+): só leitura na Fase 3; escrita fica pendente de validação técnica (Documento Mestre). Conservador: só leitura.
