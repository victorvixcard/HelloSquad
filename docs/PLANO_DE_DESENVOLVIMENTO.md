# HelloSquad — Plano de Desenvolvimento

**Versão:** 0.1 · **Data:** 15/10/2026 · **Autor:** Thor · **Status:** proposta
**Pré-requisito:** aprovação da `ARQUITETURA_PROPOSTA.md`.

---

## 1. Confronto honesto com o escopo "tudo em novembro"

O Documento Mestre mapeia 46 deliveries e 23 integrações para novembro de 2026. Hoje é 15/10. Faltam cerca de 6,5 semanas.

| Fato | Impacto |
|---|---|
| 8 integrações dependem de revisão de app na Meta (Instagram, Pages, Ads, WhatsApp) | Revisão de permissões de publicação costuma levar semanas e exige produto funcionando para gravar o vídeo de demonstração. Não controlamos o prazo. |
| Google Business Profile API exige solicitação e aprovação de acesso ao projeto | Idem: prazo externo. |
| WhatsApp Cloud API exige WABA, número verificado e templates aprovados | Idem. |
| Motor de imagem e vídeo ainda sem fornecedor | Kaia depende disso para 7 deliveries. |
| Preço e créditos sem decisão | Billing pode nascer com mecanismo, mas não pode lançar sem valores. |

**Minha recomendação:** manter novembro como meta do **MVP fechado** (Fases 0 a 2), com o teste de aceite do Documento Mestre passando de ponta a ponta para entregas que não dependem de API externa. Integrações entram em ondas em dezembro e janeiro, na ordem em que as aprovações externas chegarem. Pedir as aprovações da Meta e do Google **na primeira semana**, em paralelo ao código, porque elas são o caminho crítico.

---

## 2. Fases

### Fase 0 — Fundação (semana 1: 20 a 24/10)
Entregas: monorepo configurado com CI; projetos Supabase `staging` e `production`; schema v1 de identidade (workspaces, memberships, RLS) com teste de isolamento; Auth funcionando; serviços `api` e `worker` no Railway com healthcheck; Next.js no Vercel servindo uma página; `packages/ui` com tokens portados de `tokens.json`; `squad/` revisado e aprovado pelo Vic; solicitações de acesso Meta e Google abertas.
Critério: um usuário cria conta, cria workspace, e um teste automatizado prova que outro usuário não lê nada dele.

### Fase 1 — Núcleo vertical (semanas 2 a 4: 27/10 a 14/11)
Entregas: conversas e mensagens; projetos e trabalhos com máquina de estados; runtime do squad com Nexo + Otto (delivery 04.01 textos e legendas); memória camadas 1 e 2 (fatos com proveniência, sugestões "percebeu", confirmar/corrigir/descartar); ledger de créditos com reserva e captura (preços em tabela, valores provisórios marcados como tal); Realtime de progresso; faixa "Precisa de você"; auditoria; UI V4.6 integrada nos ambientes Início, Sala do Squad, Conteúdo/Otto e Memória da Marca.
Critério (teste do Documento Mestre, seção 16): pedido → trabalho → entrega → revisão → aprovação → histórico, com crédito debitado uma vez só e tudo visível na conversa e em Projetos.

### Fase 2 — Squad completo sem integração externa (semanas 5 a 7: 17/11 a 05/12)
Entregas: Bia 02.01 a 02.04 e 02.07 (com API de busca web escolhida); Kaia 03.01 a 03.03 (com motor de imagem homologado na bancada); Otto 04.02 e 04.03; Kiwi 05.01 e 05.02 (planejamento, sem conta conectada); Max 06.01 a 06.03 (importação CSV com consentimento); Íris 07.02 a 07.04 sobre dados importados; memória camada 3 (reflexão e aprendizados por cliente); colaboração entre agentes no mesmo trabalho; onboarding progressivo; Stripe (assinatura + SPOT); site público com SEO/GEO completo; e-mail transacional.
Critério: as sete personas entregam pelo menos uma delivery real cada, um projeto coordenado (Bia → Kaia → Otto) fecha com um único responsável por etapa, e o aprendizado de uma correção aparece na entrega seguinte.

### Fase 3 — Integrações onda 1 e Modo Autônomo (dezembro)
Entregas: Meta OAuth + Instagram e Pages (publicar e agendar com autorização, 04.04, 04.06); GA4 e Search Console (05.07, 07.01, 07.03); Google Business Profile (02.05, 02.06, 04.05) conforme aprovação; `responsibilities` + scheduler + runs (01.04, 04.02 recorrente, 07.05, 07.06); `external_actions` idempotentes; reconexão de tokens.
Critério: uma rotina real executa sem pedido manual, respeita pausa e permissão, falha de forma compreensível e se recupera.

### Fase 4 — Integrações onda 2, mídia paga e mobile (janeiro em diante)
Entregas: Meta Ads (leitura primeiro: 05.03, 05.04; escrita com teto: 05.05, 05.06) via Marketing API, com MCP só se a validação multi-tenant passar; WhatsApp Cloud e e-mail marketing (06.02, 06.04, 06.06); CMS/blog (04.07); e-commerce (10.03); vídeo (03.07); Expo iOS/Android com push.
Critério: nenhuma mudança de verba sem permissão com teto; app nas lojas com exclusão de conta funcionando.

---

## 3. Time e sequência (regra do Vic: fases sequenciais, nunca todos ao mesmo tempo)

| Agente | Responsabilidade neste projeto | Skill principal |
|---|---|---|
| **Stark** | Schema, RLS, API, runtime do squad, memória, ledger, filas | backend; `verification-before-completion` antes de "pronto" |
| **Aranha** | Design System em `packages/ui`, Next.js público (SEO/GEO) e app, integração da UI V4.6 | `frontend-vix` principal; `ui-ux-pro-max` apoio |
| **Jarvis** | Supabase (projetos, extensões, backups), Railway (serviços, autoscale, envs), Vercel, CI/CD, segredos, observabilidade | devops |
| **Nick Fury** | Revisão de domínio das skills dos 7 agentes, conteúdo SEO/GEO do site, `llms.txt`, FAQ | marketing |
| **Visão** | Bancada de homologação do motor de imagem (prompts de teste e critérios visuais) | imagem |
| **Hulk** | QA ao fim de cada fase: teste de aceite, RLS, idempotência, custo por entrega | QA |
| **Thor** | Triagem, briefing enriquecido, decisão de aceite, plano e handoff no repo | coordenação |

Modo de trabalho: fatias pequenas, commit por bloco, relatório em `docs/parciais/`, check de progresso a cada 10 minutos enquanto houver agente rodando. Antes do lançamento, sugiro revisão de segurança profunda (RLS, IDOR, escopo de tenant, injeção via conteúdo de cliente). Essa revisão é do Doutor Estranho e só entra se o Vic pedir.

---

## 4. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Revisões Meta/Google atrasam | Alta | Abrir na semana 1; MVP não depende delas; vídeo de demo gravado na Fase 1. |
| Fornecedor de imagem inconsistente com marca | Média | Bancada com 3 fornecedores antes de codar Kaia; adaptador troca fornecedor sem tocar nas deliveries. |
| Custo de LLM por entrega acima do preço em créditos | Média | Custo medido por run desde a Fase 1; preços só fecham com dado real; caching e Batch API. |
| Meta Ads MCP não serve para SaaS multi-tenant | Alta | Marketing API como caminho principal; MCP só como experimento. |
| Pix recorrente indisponível no Stripe | Certa | Decisão comercial: cartão recorrente + Pix avulso, ou trocar gateway. |
| Cota de IA do time de desenvolvimento acaba no meio de uma fatia | Média | Commit por bloco; retomar do disco; nunca re-disparar do zero. |
| Prompt injection via conteúdo do cliente (avaliações, comentários, CSV) | Média | Conteúdo externo entra como dado delimitado, nunca como instrução; ferramentas checam permissão no servidor. |

---

## 5. Definição de "pronto" por fase

Código em `main` com CI verde; migrations aplicadas em staging; teste de aceite da fase gravado em `docs/parciais/`; Hulk reportou e Thor decidiu; `docs/ESTADO_E_CONTINUIDADE.md` atualizado com onde paramos.

---

## 6. Próximos passos imediatos

1. **Vic:** aprovar ou ajustar a arquitetura e este plano; responder as 5 perguntas da seção 13 da arquitetura.
2. **Vic ou Diogo:** liberar acesso de escrita ao repositório `diogooribeirolab/ottodois` para o usuário GitHub `victorvixcard` (hoje o token recebe 404: repositório privado sem o colaborador).
3. **Vic:** revisar `squad/*/SOUL.md` e `agent.yaml`. São a alma do produto; quero o seu crivo antes de virarem prompt.
4. **Thor:** com o OK, abrir a Fase 0 com Jarvis (infra) e Stark (schema) em sequência, Aranha logo depois (tokens e Next.js).
