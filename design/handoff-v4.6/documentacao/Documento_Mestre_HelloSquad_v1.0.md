# HELLOSQUAD — DOCUMENTO-MESTRE DE PRODUTO E NEGÓCIO

**Versão de consolidação:** 1.0 · **Data:** 15 de outubro de 2026  
**Estado:** referência de produto para implementação, sujeita a refinamento de UI/UX e decisões técnicas/comerciais pendentes  
**Destinatários:** fundadores, produto, design, engenharia e parceiros autorizados  
**Fontes:** visão consolidada de produto (11/10/2026), decisões do projeto, Product UI V4.6, handoff do Claude e backlog de 46 deliveries / 23 integrações.

> **Aviso de governança:** o protótipo V4.6 é uma *baseline de experiência*, não um produto operacional. Onde este documento usa “previsto para o lançamento”, descreve a intenção de escopo, não prova de integração nem compromisso de funcionamento já homologado. Fornecedor específico, preços e implementação final só passam a regra aprovada quando definidos e registrados pelos responsáveis.

## 1. Resumo executivo

A **HelloSquad** é uma equipe de especialistas de marketing com inteligência artificial para pequenos e médios negócios. O empreendedor conversa com uma equipe que conhece sua marca, compreende objetivos, organiza trabalhos, produz entregas, envolve especialistas e assume responsabilidades recorrentes **com limites de autonomia e autorizações verificáveis**.

A proposta não é oferecer sete chatbots em paralelo nem um painel com dezenas de ferramentas. É transformar necessidades de marketing em **trabalhos acompanháveis, entregas profissionais e continuidade operacional**, com uma conversa como entrada principal e ambientes para acompanhar, revisar, corrigir e autorizar.

**Princípio central:** o usuário diz o que precisa; o Squad organiza quem cuida, entrega o resultado e informa o que merece sua atenção.

**Público:** empreendedores e PMEs que querem melhorar organização, qualidade, consistência, geração de demanda e relacionamento, sem depender de conhecimento profundo de ferramentas. O produto deve servir negócios com redes sociais e WhatsApp e empresas com site, campanhas pagas, CRM e histórico.

**Escopo de lançamento (intenção atual):** todos os itens do catálogo — 46 deliveries dos sete agentes e 23 integrações — estão mapeados para novembro de 2026; cortes, fases e adiamentos dependem de decisão explícita dos fundadores. Viabilidade técnica e homologação seguem pendentes item a item.

## 2. Problema, valor e fronteiras

### 2.1 Problema

A operação de marketing do pequeno negócio envolve estratégia, criação, conteúdo, aquisição, relacionamento, mensuração e coordenação. Soluções fragmentadas deixam a pessoa responsável por dividir as tarefas, escolher as ferramentas, lembrar o contexto e cobrar a execução.

### 2.2 Transformação pretendida

- De tarefas dispersas para um trabalho organizado com especialista responsável.
- De pedidos isolados para histórico, contexto e revisões persistentes.
- De ferramentas desconectadas para uma equipe que coordena o fluxo.
- De produção reativa para responsabilidades recorrentes delegadas com controle.
- De números isolados para interpretação e recomendações sustentadas em dados reais.

### 2.3 Fora de escopo

A HelloSquad **não** promete gerir atendimento comercial, negociar vendas, operar ERP, controlar estoque, processar compras, fazer contabilidade, gerir fornecedores, fabricar produtos ou administrar a empresa inteira. CRM significa **marketing de relacionamento, segmentação, jornadas e comunicações consentidas**, não um CRM corporativo completo de pipeline de vendas. Design de embalagem é uma entrega de comunicação visual, não fabricação ou engenharia.

A HelloSquad não promete aumento garantido de receita nem pode simular resultado ou ação externa não executada.

## 3. Princípios e regras inegociáveis

1. **Menos ferramenta, mais equipe:** a pessoa solicita objetivos, não precisa gerenciar prompts/agentes.
2. **Excelência antes de volume:** não considerar entrega concluída se for inutilizável ou genérica.
3. **Simplicidade sem superficialidade:** a operação é robusta nos bastidores e clara na interface.
4. **Coordenação sem pedágio:** Nexo organiza, mas o usuário pode falar diretamente com qualquer especialista.
5. **Especialização real:** cada personagem tem responsabilidade distinta; não duplicar competências artificiais.
6. **Contexto compartilhado:** marca, histórico e decisões relevantes acompanham os trabalhos sem rebriefing.
7. **Trabalho além do chat:** projetos, deliveries e responsabilidades têm identidade, estado, histórico e resultado.
8. **Autonomia controlada:** silêncio não aprova; permissões são explícitas, limitadas, revogáveis e auditáveis.
9. **Transparência:** distinguir ideia sugerida, material preparado, conteúdo aprovado, ação autorizada, execução confirmada e efeito mensurado.
10. **Proatividade com critério:** insights ou alertas surgem por evidências, necessidades ou rotinas, não por teatro de IA.
11. **Uma operação compartilhada:** o mesmo trabalho deve ser visível em chat, agente, Projetos, Biblioteca e Autonomia quando pertinente.
12. **Responsabilidade por custos e privacidade:** controlar gastos de IA, créditos, acessos, dados por negócio e consentimento.

## 4. Os sete agentes oficiais

Os personagens são **identidades de produto**; não exigem sete processos/modelos independentes. A arquitetura técnica pode compor especialistas dinamicamente e compartilhar serviços comuns. Uma entrega deve ter **um responsável principal**, além de colaboradores quando adicionam valor.

| Agente | Especialidade | Cor oficial | Responsabilidade e limites |
|---|---|---|---|
| **Nexo** | Projetos e coordenação | `#FF4D1F` | Qualifica pedidos, estrutura projetos/trabalhos, delega, acompanha estados, aprovações e exceções. Não substitui decisões técnicas dos especialistas. |
| **Bia** | Estratégia e inteligência | `#8A3BFF` | Diagnósticos, mercado, concorrentes, posicionamento, público e planos. Não lidera SEO operacional nem faz gestão de anúncios. |
| **Kaia** | Marca & Criação | `#FF2E9A` | Identidade, peças, carrosséis, edições, mockups, vídeo/motion e materiais promocionais. Não inventa engenharia/fabricação. |
| **Otto** | Conteúdo | `#FFE11A` | Tom de voz, textos, calendários, posts, roteiros, blog/SEO editorial e publicação autorizada. Não substitui Kiwi na estratégia SEO. |
| **Kiwi** | **Growth Marketing** | `#B6FF2E` | Aquisição orgânica e paga, SEO, campanhas, mídia, CRO, testes e otimização de crescimento. Gestão financeira exige autorização. |
| **Max** | CRM de marketing | `#00E5C3` | Base de clientes, leads, segmentação, relacionamento, jornadas, reativação, fidelização e e-mail/WhatsApp consentidos. Não assume negociação/vendas. |
| **Íris** | Resultados | `#1F5BFF` | Coleta, consolida, interpreta e compara métricas, faz relatórios e recomendações. Não inventa dados nem atribuição causal. |

**Identidade aprovada:** fundo Papel `#F7F7F5`, Tinta `#0F0D22`, silhuetas gráficas sem membros e olhos expressivos; cores por agente. Consultar `ds/hellosquad/tokens.json` e os arquivos do Design System do ZIP para os valores completos. A Home V3 aprovada permaneceu congelada no processo de refinamento. O restante da UI continua evoluindo.

## 5. Skills versus deliveries versus ferramentas

- **Skill (competência):** capacidade especializada reutilizável (ex.: diagnosticar concorrência, criar peça visual, estruturar segmento, interpretar dados).
- **Delivery:** resultado verificável entregue ao cliente (ex.: um carrossel revisável, plano de mídia aprovado, relatório comparativo). A lista fechada de planejamento está no Anexo A.
- **Trabalho:** instância persistente de um pedido, com briefing, execução, histórico, versão, custo, responsáveis, aprovação e resultado.
- **Projeto:** conjunto coordenado de trabalhos e entregas para um objetivo maior (ex.: campanha sazonal).
- **Responsabilidade recorrente:** delegação com frequência, ações permitidas e ciclos de execução identificáveis.
- **Motor/integração:** tecnologia que possibilita executar uma skill ou delivery (LLM, imagem, API social, CRM, dados etc.). Uma tecnologia não é uma entrega.

As skills podem ser compostas; o usuário não deve escolher manualmente cada skill interna. Organizar as entradas por necessidades reconhecíveis (criar, planejar, atrair, relacionar, analisar), não por nomes de APIs. Um pedido simples pode ser resolvido por um especialista; colaboração deve ser funcional, nunca teatral.

### 5.1 Modalidades de operação

1. **Entrega pontual:** começa e termina (uma arte, diagnóstico ou relatório).
2. **Projeto coordenado:** contém trabalhos e especialistas diversos, com milestones e aprovações.
3. **Responsabilidade contínua:** compromisso delegável que gera execuções e entregas em ciclos, com pausa/revogação.

### 5.2 Profundidades de uma capacidade

**Orientar** (analisar/recomendar) → **Produzir** (material utilizável) → **Executar** (agir em canal autorizado) → **Otimizar** (acompanhar e ajustar com evidência). Cada delivery só pode prometer a profundidade que efetivamente passou por teste de aceite.

## 6. Jornada principal do usuário

1. **Descoberta/landing:** compreende a equipe e seu propósito; inicia pedido ou cadastro.
2. **Cadastro e onboarding progressivo:** coleta contexto mínimo, marca e objetivos; conectores são opcionais conforme necessidade; não exige formulário extenso.
3. **Primeiro trabalho:** Nexo ou especialista qualifica a intenção e propõe escopo essencial, estimativa e aprovação quando houver.
4. **Produção:** especialistas executam e atualizam progresso; o usuário vê status e o que precisa dele.
5. **Revisão:** material protagonista; o usuário pode corrigir pontualmente, aprovar, pedir nova versão e ver histórico.
6. **Ação externa:** publicar, enviar comunicação, alterar campanha e investir requerem integração válida e autorização específica.
7. **Acompanhamento:** Íris e outros agentes analisam resultados reais e propõem próximos trabalhos.
8. **Delegação:** rotinas recorrentes passam a ser acompanhadas pelo Modo Autônomo.

**Regra transversal:** a jornada pode ocorrer inteira na conversa. As páginas organizam e controlam os mesmos objetos, não constituem etapas que o usuário precisa visitar.

## 7. Arquitetura da experiência (baseline V4.6)

- **Início:** Home conversacional com presença da equipe, pedidos, pendências e overview. *Layout aprovado/congelado neste ciclo.*
- **Sala do Squad:** conversa coletiva com participação contextual dos especialistas.
- **Projetos / Nexo:** roadmap, trabalhos, status, decisões, quadro, lista e biblioteca/entregas.
- **Estratégia / Bia:** diagnósticos, planos, oportunidades, pesquisas e decisões estratégicas.
- **Marca & Criação / Kaia:** estúdio, produção, revisões, galeria e materiais visuais.
- **Conteúdo / Otto:** calendário editorial, pauta, publicações, aprovações e canal.
- **Growth / Kiwi:** visão de aquisição, SEO, campanhas, testes e CRO sem copiar Ads Manager.
- **CRM / Max:** segmentos, jornadas, campanhas, importação e consentimento.
- **Resultados / Íris:** indicadores, gráficos, relatórios e insights com fontes/períodos.
- **Modo Autônomo:** responsabilidades, próximas execuções, limites, pausas e histórico.
- **Memória da Marca:** conhecimento confirmado, hipóteses, fontes, revisões e histórico.
- **Minha Equipe & Conversas:** perfis oficiais, conversas individuais e histórico.

**Chat contextual universal:** pode abrir a partir de qualquer objeto com tipo, ID, origem, negócio, agente responsável, participantes e período (quando necessário). Deve permitir ampliar/recolher, continuar o histórico e retornar ao trabalho; não pode atuar sobre item errado por perda de contexto.

**Linguagem compartilhada de UI:** “Precisa de você”, “Em andamento”, “<Agente> percebeu”, “Entregas”, “O que podemos fazer”. Esses são padrões, não seções obrigatórias idênticas. Cor e borda viva devem ter significado e respeitar movimento reduzido. Não animar tudo simultaneamente.

**Regra de estado vazio:** não inventar métricas, contatos nem trabalhos para uma conta sem conexão. Mostrar claramente o que depende de fonte ou cadastro.

## 8. Máquina de estados e aprovação

**Estados apresentados ao usuário:** A validar/rascunho quando o escopo não está confirmado; Em andamento; Precisa de você; Programado; Aprovado; Concluído; Pausado; Bloqueado/atenção necessária; Falha. Os estados internos devem ser mais granulares e suportar auditoria/retry.

- Pedido recebido não significa trabalho criado.
- Trabalho criado não significa execução iniciada.
- Material produzido não significa aprovado.
- Material aprovado não significa publicação/envio/investimento autorizado.
- Ação autorizada não significa execução confirmada.
- Execução confirmada não equivale a resultado positivo comprovado.
- **Concluído** significa o escopo da entrega executado e verificado, não resposta escrita dizendo que foi.

**Critério de conclusão de uma delivery:** aderência ao briefing + consistência de marca/contexto + qualidade profissional + aplicabilidade (formato, canal, arquivo). Preservar versões, decisões aprovadas e capacidade de ajuste localizado.

### 8.1 Segurança por tipo de ação

| Categoria | Pode ocorrer sem confirmação extra? | Condição |
|---|---|---|
| Ler dados autorizados | Conforme consentimento e permissões | registrar origem, data e escopo |
| Analisar/propor | Sim, dentro do contexto concedido | hipóteses identificadas, sem inventar dados |
| Preparar rascunhos/peças | Sim, dentro dos limites e créditos aplicáveis | custo, versão e rastreio |
| Aprovar conteúdo | Ação direta do usuário | não libera ações externas por consequência |
| Publicar/agendar em canal | Somente com permissão específica/escopo autorizado | token válido, controle de estado, confirmação da API |
| Enviar e-mail/WhatsApp | Somente com autorização e consentimento dos destinatários | opt-in/opt-out, janela/templates/políticas |
| Criar/alterar/ativar anúncio | Somente com autorização e teto de gasto | escopo, orçamento, auditoria, confirmação da API |
| Alterar memória relevante | Confirmar antes de torná-la regra | origem, versão e possibilidade de corrigir |

Permissões devem estar em banco/serviço de autorização, não apenas no prompt. Ações externas devem ter execução idempotente e log de resultado. Nunca tomar silêncio como aceite.

## 9. Memória da Marca: Brain compartilhado

O conhecimento da equipe abrange: **negócio**, marca e identidade, público, canais e objetivos, trabalhos e decisões, preferências/aprendizados e permissões. A memória deve combinar onboarding, conversas, correções, aprovações, arquivos, redes/site e sinais observados.

Cada fato ou hipótese precisa, quando aplicável, de **conteúdo, categoria, origem, momento da coleta, grau de confirmação, validade/atualização, versão e agente que o utiliza**.

- Separar **fato confirmado**, **decisão aprovada**, **observação com fonte** e **hipótese/sugestão da IA**.
- O que um agente percebe não vira regra da marca sem confirmação quando altera diretriz relevante.
- Permitir confirmar, corrigir, descartar, revisar fonte e resolver conflitos.
- Preferências podem ser permanentes ou temporárias; contexto obsoleto não pode continuar orientando o produto silenciosamente.
- Somente recuperar contexto útil à tarefa; não despejar o dossiê inteiro em todos os modelos.
- Informações pessoais e empresariais devem ser isoladas por workspace, com política de retenção/exclusão e consentimento.
- A mesma memória confirmada deve ser utilizada em trabalhos pontuais e delegações recorrentes.

**Exemplo de aceite:** corrigir preferência na Memória → marcar como confirmada → próxima peça e próxima rotina passam a usar a versão atual; histórico anterior é preservado; sugestões descartadas não influenciam o trabalho.

## 10. Modo Autônomo e rotinas

A autonomia é delegação de **responsabilidades** com objetivo, frequência, responsável, colaboradores, escopo, gatilhos, limites, próximas execuções, aprovações, custos e condições de parada. Não é uma configuração técnica de cron vista pelo cliente.

Níveis principais: **Analisar**, **Preparar** e **Executar** (ação externa controlada). “Contínua” é a modalidade temporal de ciclos, não uma permissão irrestrita.

**Fluxo:** usuário descreve delegação → agente esclarece escopo/frequência → apresenta combinado → usuário confirma → scheduler registra rotina → execução cria `run` e eventuais trabalhos → aprovações e exceções são comunicadas → histórico consultável. Permitir pausar, retomar, encerrar e editar sem apagar histórico.

Estados: programada, ativa, pausada, aguardando aprovação, bloqueada por conexão, falha, concluída/ciclo concluído, encerrada. Falhas devem ser compreensíveis e acionáveis.

O comando global **Ligado/Desligado** precisa de definição de efeito exato: interrompe quais novas execuções, trabalhos em andamento e publicações agendadas? **Pendente de regra formal** antes de implementação.

**Exemplo:** Otto planeja pautas às quintas, Kaia cria artes quando necessário; o usuário aprova conteúdo; publicar só ocorre conforme autorização própria. Nexo acompanha, e cada ciclo gera identificador próprio.

## 11. Comunicação, colaboração e qualidade

- Nexo faz roteamento e coordena conflitos, mas não cria conversa entre agentes sem necessidade.
- Especialistas podem deliberar dentro da mesma conversa, preservando contexto e o responsável principal.
- O usuário pode entrar diretamente pelo especialista ou usar a Sala do Squad.
- Quando uma recomendação exige outra especialidade, abrir ação contextual ou criar trabalho compartilhado; não criar cópias paralelas.
- Briefings fracos devem gerar perguntas objetivas, não respostas genéricas prontas.
- Apresentar limitações com clareza: falta dado, falta acesso, a API falhou, o conteúdo é um rascunho ou o insight é inferência.
- Toda delivery deve admitir revisão sem perder versões, autoria, proveniência e custo da execução.

## 12. Integrações, arquitetura técnica e dependências

A infraestrutura é **proposta de implementação** e precisa ser confirmada com Vic. O catálogo anexo explicita, por delivery, quais integrações ou motores estão previstos. Um conector não está “pronto” porque seu nome aparece na planilha.

**Componentes compartilhados propostos:** banco/identidade por workspace (Supabase Auth/Postgres/RLS ou equivalente); armazenamento e versionamento; gateway LLM com custo/latência/fallback; pipeline de imagem e vídeo; orquestração Nexo; jobs/filas/cron; motor de permissões; auditoria; billing; telemetria; webhooks, notificações e mecanismos de reconexão.

**Conexões externas mapeadas:** Instagram/Facebook Graph API, Google Business Profile, Google Analytics 4, Search Console, Meta Ads MCP e Marketing API, e-mail marketing, WhatsApp Business Cloud API, importação/CRM, e-commerce e CMS/blog, busca web, além de fornecedores de imagem/vídeo e analytics operacional.

**Meta Ads MCP:** está indicado como caminho de implementação para leitura e possível gestão de anúncios, mas **uso multi-tenant, escopos de escrita, OAuth, viabilidade e homologação da integração precisam ser validados**. Marketing API direta pode ser alternativa. Não assumir que instalar MCP em ferramenta de desenvolvimento habilita todos os clientes do SaaS.

**Fluxos de ingestão:** OAuth, autorização da conta correta, armazenamento seguro de tokens, atualização/expiração/revogação, reconexão, rate limits, logs, backoff, webhooks e consentimento. Não armazenar credenciais no cliente nem em logs.

**Estruturas conceituais sugeridas (não schema final):** `workspaces`, `users`, `memberships`, `brand_profiles`, `brand_facts`, `fact_sources`, `permissions`, `connected_accounts`, `conversations`, `messages`, `projects`, `work_items`, `deliveries`, `delivery_versions`, `approvals`, `autonomous_responsibilities`, `runs`, `external_actions`, `billing_accounts`, `credit_ledger`, `audit_events`. Os nomes e relacionamentos serão decididos pela engenharia.

**Observabilidade:** logs por ação e provedor, métricas de sucesso/falha, custo por entrega, retries, tokens, latência, limites e trace ID; sem expor PII desnecessária.

## 13. Comercial, créditos e cobrança — fronteira de decisões

A visão de produto inclui plano, catálogo, limites, uso de créditos/custo e assinatura; porém **a HelloSquad ainda não possui preços, quantidades de créditos, planos e paywall finais formalmente aprovados neste conjunto de decisões**. Não importar preços nem regras do projeto anterior HelloOtto.

**Regras de negócio a detalhar antes do desenvolvimento do billing:**

- Quais capacidades exigem assinatura e quais exigem créditos por execução.
- Separar conversa/ajuste leve de processamento pesado para evitar percepção de taxímetro.
- Calcular custo, apresentar orçamento/quote antes de gerar despesas variáveis relevantes e debitar com idempotência.
- Definir consumo em geração, revisão, falha do provedor, cancelamento e reexecução.
- Definir plano gratuito, assinatura, uso recorrente, validade/rollover, recargas e bloqueios somente após aprovação comercial.
- Definir limites de rotinas automáticas, gasto externo/Meta Ads (separado do custo de IA), volume e proteção contra abuso.
- Integrar pagamento via gateway escolhido com webhooks, conciliação, renovação, falha, chargeback e cancelamento.

**Status:** decisões comerciais pendentes; requisitos de controle de custo e autorização já pertencem à arquitetura.

## 14. Onboarding, canais e dados

O onboarding deve ser progressivo: nome e contexto do negócio, proposta e público, objetivos iniciais, links/site e canais opcionais, tom e identidade quando disponíveis. Uma fonte pode sugerir dados da marca, mas o usuário corrige/valida informações relevantes. Mesmo sem integração, o sistema deve permitir começar uma primeira entrega com briefing suficiente.

Canais conectados não conferem automaticamente permissão irrestrita de leitura, publicação, envio ou investimento. O usuário precisa ver fonte, conexão, escopo, data de sincronização, disponibilidade e ações necessárias. Estados vazios de Íris/Max/Kiwi devem pedir conexão ou importação, sem inventar resultados.

## 15. Segurança, privacidade, LGPD e governança

- Isolamento de dados por negócio/workspace em banco, arquivos e acessos a ferramentas.
- Consentimento específico e base legal para dados de contatos e disparos; opt-out operacional.
- Privilégios mínimos em OAuth/APIs e renovação segura de tokens.
- Políticas de remoção, correção, acesso, logs de alteração e retenção a definir.
- Permissões executáveis no backend, com validação e auditoria antes de ações sensíveis.
- Fluxos de aprovação com prazo, responsável e estado irreversível/compensável adequados.
- Proteção contra duplicação de post, campanha, disparo ou cobrança após retry.
- Separação entre ambientes demonstrativos, testes e produção; segredos só no servidor.

## 16. Métricas e critérios de aceite

**Qualidade por delivery:** aderência, consistência de marca, qualidade profissional e aplicabilidade. **Experiência:** taxa de primeira entrega utilizável, correções necessárias, tempo até primeira entrega, esforço de coordenação, aprovação e clareza da responsabilidade. **Operação:** taxa de execução válida, falhas de integração, jobs atrasados, custo por entrega, indisponibilidade, conversas retomadas e incidentes de autorização. **Marketing:** métricas reais por canal com período, fonte e limitações; não extrapolar causalidade.

A produção só está validada quando um teste executa **pedido → trabalho → entrega → revisão → aprovação → (se necessário) ação autorizada → confirmação → histórico**. A automação só está validada quando o sistema executa sem novo pedido manual, respeita pausa, permissão, falha e recuperação.

## 17. Estado da UI e do handoff para engenharia

O ZIP original do Claude contém a **Landing Page V1 / R32** e **Product UI V4.6** com recursos React/runtime locais. O protótipo tem navegação, roteiros simulados de conversa, estados de aprovação, memória e autonomia, mas **não tem IA real, persistência de produção, backend, auth real ou integrações externas**. Os dados da marca de exemplo Miolo e as simulações são ilustrativos. Consultar o README original (`../README.md`).

O desenvolvimento do backend pode avançar **em paralelo à V5**, que continuará refinando UI/UX página a página. A V4.6 é o contrato visual inicial, não um congelamento universal. A Home mantém aprovação anterior; futuras mudanças compartilhadas precisam testar regressões.

**Diretriz de engenharia:** começar por entidades/estados, autorização, orquestração, memória e execução; não confundir componentes demonstrativos com endpoints prontos. Planejar interfaces estáveis entre UI e backend para aceitar substituições incrementais.

## 18. Registro de decisões e pendências

| Tema | Situação | Direção vigente / próximo passo |
|---|---|---|
| Nome HelloSquad | **Definido** | Não reutilizar HelloOtto como nome deste negócio. |
| Equipe de sete especialistas | **Definido no produto** | Possível orquestração técnica híbrida; não exige sete LLMs independentes. |
| Kiwi / Growth Marketing | **Definido** | SEO, mídia, CRO, aquisição e experimentos sob Kiwi; Otto produz conteúdo SEO. |
| Conversa contextual e trabalhos persistentes | **Regra consolidada** | Mesmo objeto acessível de páginas diferentes. |
| Memória com confirmação e proveniência | **Regra consolidada** | Sugestões não se tornam orientações automaticamente. |
| Autonomia e permissões | **Regra consolidada** | Conteúdo aprovado ≠ publicação/envio/investimento autorizado. |
| 46 deliveries e 23 integrações | **Escopo mapeado para novembro** | Cada uma precisa validação técnica/QA individual. |
| Landing V1 R32 / UI V4.6 | **Baseline de design** | Próximas revisões V5; não confundir demo com produção. |
| Planos, preços, créditos e paywall | **Pendente de decisão** | Não herdar valores do HelloOtto. |
| Motor de LLM, imagem e vídeo | **Pendente de homologação** | Escolher por qualidade, latência, custo e licenças. |
| Meta Ads MCP / gestão de anúncios | **Pendente de validação técnica** | OAuth, multi-tenant, escrita e plano alternativo via Marketing API. |
| Formato do agendamento e fila | **Pendente de arquitetura** | Idempotência, retries, pausa, tolerância a falhas. |
| Semântica do botão global de autonomia | **Pendente de produto** | Definir exatamente que execuções interrompe. |
| Critérios de go/no-go | **Pendente de homologação** | Definir cobertura real, custo e segurança antes do lançamento. |

## 19. Fontes e rastreabilidade

1. `landing/` e `product-ui/`: arquivos originais e runtime exportados pelo Claude, baseline V4.6.
2. `README.md`: handoff original do Claude, instruções de execução e limitações.
3. `ds/hellosquad/tokens.json` e `bundle.*`: componentes e identidade técnica do Design System.
4. **Product Backlog Google Sheets**: https://docs.google.com/spreadsheets/d/1Fqa2A3w_FwEisuerd8U_fXh4HuAv5fC0elzVZM3GheY/edit — fonte viva de datas, prioridades, status e integrações.
5. `documentacao/catalogo_46_deliveries_23_integracoes.csv`: snapshot de leitura para implementação; não substitui o Google Sheets vivo.
6. Visão Consolidada de Produto, 11/10/2026 (documentação conceitual anterior).

**Regra de atualização:** revisão de UI/UX não altera automaticamente regras de negócio; mudança de escopo, preços, políticas e integrações requer aprovação e registro. Em conflitos, confirmar com os fundadores e atualizar as fontes de verdade explicitamente.


## ANEXO A — Catálogo completo de 46 deliveries dos agentes

Este anexo preserva o resultado esperado por item. O CSV contém ainda dono, status e integração detalhada; status operacionais devem ser conferidos no Google Sheets antes de executar.

### Nexo · Coordenação — 4 deliveries

**01.01 · Qualificar pedido e organizar briefing**  
*Resultado verificável:* Recebe objetivo, contexto e restrições; encaminha ao especialista certo sem perda de informação.  
*Integrações/dependências:* LLM API (escolher) + Supabase Auth/Postgres + Memória  
*Pré-requisitos:* Orquestração e memória compartilhada

**01.02 · Coordenar projeto com múltiplos agentes**  
*Resultado verificável:* Uma campanha vira projeto único, com etapas, responsáveis, decisões e entregas rastreáveis.  
*Integrações/dependências:* LLM/orquestração + Supabase Postgres + fila/execução  
*Pré-requisitos:* Projetos, estados e especialistas

**01.03 · Acompanhar entregas e pedir aprovações**  
*Resultado verificável:* Exibe andamento, próxima decisão, histórico e bloqueios; não executa ação sensível sem autorização.  
*Integrações/dependências:* Supabase Postgres/RLS + Storage + notificações  
*Pré-requisitos:* Motor de trabalhos e permissões

**01.04 · Delegar responsabilidade recorrente**  
*Resultado verificável:* Cria, pausa e acompanha ao menos uma rotina real, com registro por execução e falhas.  
*Integrações/dependências:* Supabase Cron/Edge Functions + fila de jobs + Postgres  
*Pré-requisitos:* Agendador, histórico e limites

### Bia · Estratégia — 7 deliveries

**02.01 · Diagnóstico inicial de marketing**  
*Resultado verificável:* Entrega avaliação objetiva do negócio com lacunas, oportunidades e premissas identificadas.  
*Integrações/dependências:* LLM API + Supabase memória + Google Business Profile/GA4 (quando conectados)  
*Pré-requisitos:* Onboarding e memória de marca

**02.02 · Posicionamento, público e objetivos**  
*Resultado verificável:* Gera direcionamento documentado, coerente com o negócio e ajustável em conversa.  
*Integrações/dependências:* LLM API + Supabase memória de marca  
*Pré-requisitos:* Contexto da marca

**02.03 · Plano de marketing com prioridades**  
*Resultado verificável:* Apresenta ações priorizadas, responsáveis sugeridos e horizonte de execução.  
*Integrações/dependências:* LLM API + Supabase memória e projetos  
*Pré-requisitos:* Diagnóstico e contexto

**02.04 · Estratégia para campanhas integradas**  
*Resultado verificável:* Cria conceito, público e prioridades que alimentam Kaia, Otto e Kiwi no mesmo projeto.  
*Integrações/dependências:* LLM API + orquestração Nexo + Supabase projetos  
*Pré-requisitos:* Orquestração Nexo

**02.05 · Diagnóstico de presença digital e reputação**  
*Resultado verificável:* Avalia site, presença digital, avaliações, canais e oportunidades de posicionamento; estratégias de SEO ficam com Kiwi.  
*Integrações/dependências:* Google Business Profile + GA4 + pesquisa web + insights do Kiwi (SEO)  
*Pré-requisitos:* Bia conduz diagnóstico estratégico; Kiwi lidera recomendações e execução de SEO.

**02.06 · Leitura de avaliações e voz do cliente**  
*Resultado verificável:* Agrupa temas recorrentes em avaliações e comentários, identifica percepções e sugere ações de marketing.  
*Integrações/dependências:* Google Business Profile API (reviews) + LLM + memória  
*Pré-requisitos:* Acesso autorizado; análise qualitativa sem garantir representatividade.

**02.07 · Pesquisa de concorrentes e tendências**  
*Resultado verificável:* Apresenta fontes, datas e hipóteses; distingue pesquisa real de sugestão sem validação.  
*Integrações/dependências:* API de busca web (Tavily/Brave/SerpAPI — escolher) + GBP + fonte de tendências  
*Pré-requisitos:* Pesquisa web/serviço de dados

### Kaia · Marca & Criação — 7 deliveries

**03.01 · Peça estática de marketing**  
*Resultado verificável:* Gera imagem e arquivo final no padrão da marca, com prévia, revisão e versão.  
*Integrações/dependências:* API de geração de imagem (escolher) + Supabase Storage  
*Pré-requisitos:* Motor de imagem e biblioteca

**03.02 · Carrossel para redes sociais**  
*Resultado verificável:* Gera conjunto de slides coerente; permite revisão do conjunto e exportação.  
*Integrações/dependências:* API de geração de imagem + editor/compositor + Storage  
*Pré-requisitos:* Motor de imagem e templates

**03.03 · Variações de formato e adaptações**  
*Resultado verificável:* Adapta peças aprovadas sem perder identidade, histórico ou consistência.  
*Integrações/dependências:* API de imagem/edição + Storage + versionamento  
*Pré-requisitos:* Motor visual, versões

**03.04 · Logo, identidade e brandbook**  
*Resultado verificável:* Fluxo completo com escolhas, aplicações e arquivo utilizável; só lançar após validação de qualidade.  
*Integrações/dependências:* API de imagem + gerador de PDF/brandbook + Storage  
*Pré-requisitos:* Motor visual e critérios de qualidade

**03.05 · Materiais promocionais e design de embalagens**  
*Resultado verificável:* Cria propostas visuais de materiais promocionais, rótulos e embalagens com mockup, revisão e arquivo exportável.  
*Integrações/dependências:* API de imagem/edição + mockups + PDF/arquivo final + Storage  
*Pré-requisitos:* Somente design de marketing; não inclui fabricação ou engenharia do produto.

**03.06 · Edição de fotos e criativos com referências da marca**  
*Resultado verificável:* Usa fotos do cliente e referências aprovadas para composições, variações e ajustes com versões preservadas.  
*Integrações/dependências:* API de edição de imagem + upload/Storage + memória de marca  
*Pré-requisitos:* Respeitar fidelidade a produtos, direito de imagem e aprovações.

**03.07 · Motion, vídeo e peças avançadas**  
*Resultado verificável:* Gera entregável audiovisual revisável e compatível com o canal; escopo/preço a validar.  
*Integrações/dependências:* API de geração de vídeo (escolher) + Storage/encoding  
*Pré-requisitos:* Motor de vídeo e custo

### Otto · Conteúdo — 7 deliveries

**04.01 · Textos e legendas de marketing**  
*Resultado verificável:* Produz copy revisável por canal, objetivo e tom de voz da marca.  
*Integrações/dependências:* LLM API + Supabase memória de marca  
*Pré-requisitos:* Modelo de texto e memória

**04.02 · Calendário editorial e pauta semanal**  
*Resultado verificável:* Organiza datas, canais, formatos, temas e responsáveis em um calendário persistente.  
*Integrações/dependências:* Supabase Postgres + Cron/Edge Functions + calendário  
*Pré-requisitos:* Motor de trabalhos e rotinas

**04.03 · Posts e roteiros multicanal**  
*Resultado verificável:* Cria roteiros e versões de conteúdo coerentes com a estratégia e com Kaia.  
*Integrações/dependências:* LLM API + motor visual da Kaia + Storage  
*Pré-requisitos:* Bia, Kaia e biblioteca

**04.04 · Agendar e publicar com autorização**  
*Resultado verificável:* Programa/publica apenas após conexão válida e aprovação; registra sucesso/falha.  
*Integrações/dependências:* Instagram Graph API + Facebook Pages API + Meta OAuth + Cron  
*Pré-requisitos:* Meta Graph API, OAuth, permissões

**04.05 · Conteúdo para Perfil da Empresa no Google**  
*Resultado verificável:* Produz posts e ofertas para perfil local; permite revisão, agendamento e publicação autorizada.  
*Integrações/dependências:* Google Business Profile API (posts/localPosts; validar disponibilidade) + OAuth  
*Pré-requisitos:* Testar permissões e suporte por tipo de perfil; não pressupor API liberada.

**04.06 · Rascunhos de respostas a comentários públicos**  
*Resultado verificável:* Lê comentários autorizados e sugere respostas da marca, com revisão e aprovação antes de publicar.  
*Integrações/dependências:* Facebook Pages Graph API (comments) + LLM + permissões  
*Pré-requisitos:* Somente interação pública de marketing; não assumir SAC nem atendimento de vendas.

**04.07 · Artigos e conteúdo otimizado para buscadores**  
*Resultado verificável:* Cria artigos e conteúdos com briefing, temas, palavras-chave e diretrizes SEO do Kiwi; revisão e exportação/publicação.  
*Integrações/dependências:* LLM API + Search Console via Kiwi + CMS/Blog API (WordPress/Shopify)  
*Pré-requisitos:* Kiwi lidera estratégia e performance SEO; Otto executa produção editorial.

### Kiwi · Growth Marketing — 9 deliveries

**05.01 · Plano de mídia e recomendação de orçamento**  
*Resultado verificável:* Define objetivos, canais, limites propostos e hipóteses sem executar investimento.  
*Integrações/dependências:* Meta Ads MCP oficial (leitura) + LLM API + memória  
*Pré-requisitos:* Estratégia da Bia

**05.02 · Públicos e testes de anúncios**  
*Resultado verificável:* Desenha segmentações, mensagens, variações e plano de testes para aprovação.  
*Integrações/dependências:* Meta Ads MCP/Marketing API (públicos) + Kaia  
*Pré-requisitos:* Bia e Kaia

**05.03 · Leitura e análise de campanhas existentes**  
*Resultado verificável:* Interpreta métricas reais autorizadas, com período, origem e limitações identificados.  
*Integrações/dependências:* Meta Ads MCP oficial (Insights) + Meta Marketing API  
*Pré-requisitos:* Meta Marketing API

**05.04 · Auditoria de campanhas e conta de anúncios**  
*Resultado verificável:* Analisa estrutura, segmentações, criativos e oportunidades de melhoria na conta conectada.  
*Integrações/dependências:* Meta Ads MCP (leitura) + Meta Marketing API + LLM  
*Pré-requisitos:* Validar escopos e acesso; diagnóstico não autoriza alteração.

**05.05 · Otimização contínua de campanhas autorizadas**  
*Resultado verificável:* Executa ciclos de análise, propõe ajustes e só altera orçamento/segmentação dentro de limites aprovados.  
*Integrações/dependências:* Meta Ads MCP (gestão a validar) + Marketing API + Cron + auditoria  
*Pré-requisitos:* Confirmar escopos financeiros e limites; nenhuma mudança sem política aprovada.

**05.06 · Criar, ativar ou alterar anúncios**  
*Resultado verificável:* Só aplica mudanças após permissão explícita, teto aprovado e trilha de auditoria.  
*Integrações/dependências:* Meta Ads MCP oficial (escrita) + Marketing API + autorizações/auditoria  
*Pré-requisitos:* Meta Ads, autorização financeira

**05.07 · Diagnóstico e estratégia SEO (site e SEO local)**  
*Resultado verificável:* Audita busca orgânica, aspectos técnicos/on-page, palavras-chave e oportunidades locais; entrega plano priorizado.  
*Integrações/dependências:* Google Search Console API + GA4 + Google Business Profile + pesquisa web; LLM  
*Pré-requisitos:* Acesso autorizado às propriedades; Kiwi lidera SEO, Otto produz o conteúdo orientado.

**05.08 · Otimização de conversão (CRO) e funil de aquisição**  
*Resultado verificável:* Analisa etapas de conversão, abandono, páginas e CTAs; prioriza melhorias mensuráveis e define testes.  
*Integrações/dependências:* GA4 Data API + eventos do site + dados de pedidos/leads + ferramentas de teste (a definir)  
*Pré-requisitos:* Não inventar taxas; acesso a eventos e configuração de metas/atribuição.

**05.09 · Experimentos de Growth multicanal**  
*Resultado verificável:* Estrutura hipóteses, testes de aquisição orgânica/paga, critérios de sucesso e rotina de otimização.  
*Integrações/dependências:* GA4 + Search Console + Meta Ads MCP/Marketing API + banco de experimentos e jobs  
*Pré-requisitos:* Kiwi coordena testes de crescimento, com produção via Kaia/Otto e leitura com Íris.

### Max · CRM — 6 deliveries

**06.01 · Planejar campanha de reativação/fidelização**  
*Resultado verificável:* Entrega objetivo, segmentação proposta, oferta e calendário revisáveis.  
*Integrações/dependências:* CRM/CSV + Supabase contatos + LLM API  
*Pré-requisitos:* Bia e contexto de negócio

**06.02 · Sequências de e-mail e mensagens**  
*Resultado verificável:* Cria textos e etapas de comunicação para revisão antes de qualquer envio.  
*Integrações/dependências:* LLM API + API de e-mail marketing + WhatsApp Cloud API (templates)  
*Pré-requisitos:* Otto e diretrizes de marca

**06.03 · Segmentação de base de clientes**  
*Resultado verificável:* Organiza segmentos com origem dos dados e verificação de consentimento.  
*Integrações/dependências:* Importação CSV / API CRM (RD/HubSpot a definir) + Supabase/RLS  
*Pré-requisitos:* Importação/CRM, LGPD

**06.04 · Jornadas de relacionamento multietapas**  
*Resultado verificável:* Desenha jornada e gatilhos; diferencia fluxo planejado de automação ativa.  
*Integrações/dependências:* Supabase Postgres + Cron/fila + e-mail/WhatsApp  
*Pré-requisitos:* Segmentos e estados

**06.05 · Captação de leads com consentimento e origem**  
*Resultado verificável:* Propõe formulários de captação e conecta contatos consentidos a segmentos com origem e opt-in.  
*Integrações/dependências:* Formulário/landing + webhook + Supabase/CRM + consentimento LGPD  
*Pré-requisitos:* Marketing de aquisição/relacionamento; não negociar nem gerir vendas.

**06.06 · Disparo efetivo via e-mail/WhatsApp**  
*Resultado verificável:* Envia apenas a contatos elegíveis, autorizados e com integração operacional.  
*Integrações/dependências:* WhatsApp Business Cloud API + e-mail marketing API + opt-in/opt-out  
*Pré-requisitos:* Plataforma de envio, WhatsApp, consentimento

### Íris · Resultados — 6 deliveries

**07.01 · Consolidar métricas disponíveis**  
*Resultado verificável:* Mostra indicadores com origem, período, unidade e ausência de dados quando aplicável.  
*Integrações/dependências:* GA4 Data API + Search Console + GBP Performance + Meta Ads MCP + Instagram Insights + pedidos/site  
*Pré-requisitos:* Fontes disponíveis/planilha

**07.02 · Análise qualitativa de desempenho**  
*Resultado verificável:* Explica variações sem afirmar causalidade sem evidência; gera leitura útil e contextual.  
*Integrações/dependências:* LLM API + métricas consolidadas em Supabase  
*Pré-requisitos:* Dados e modelo de análise

**07.03 · Comparação entre períodos e relatório**  
*Resultado verificável:* Cria relatório claro, revisável e vinculado ao histórico do negócio.  
*Integrações/dependências:* GA4/Meta Ads/Instagram/GBP + Supabase séries históricas  
*Pré-requisitos:* Séries temporais confiáveis

**07.04 · Recomendações priorizadas a partir dos dados**  
*Resultado verificável:* Transforma achados em ações discutíveis com Nexo/especialistas.  
*Integrações/dependências:* LLM API + Nexo/orquestração + Supabase projetos  
*Pré-requisitos:* Orquestração e insights

**07.05 · Relatório executivo recorrente do marketing**  
*Resultado verificável:* Entrega resumo semanal automático por canal, variações, hipóteses e decisões sugeridas, com dados de origem.  
*Integrações/dependências:* GA4 + Instagram Insights + Meta Ads MCP + GBP + LLM + agendador  
*Pré-requisitos:* Somente métricas conectadas; relatório não substitui evidências nem inventa dados.

**07.06 · Monitoramento proativo de indicadores**  
*Resultado verificável:* Executa leituras recorrentes e alertas apenas com dados atualizados e confiáveis.  
*Integrações/dependências:* Supabase Cron/jobs + APIs de dados + notificações  
*Pré-requisitos:* Integrações de dados + agendador


## ANEXO B — Catálogo completo de 23 integrações

As opções de fornecedor citadas são hipóteses de implementação até validação técnica e contratual. Cada integração tem seus próprios riscos de permissão, billing, compliance e disponibilidade.

### Infraestrutura compartilhada — 8 integrações

**08.01 · Supabase — Auth, Postgres e RLS**  
*Critério técnico:* Configurar contas/workspaces, políticas RLS, isolamento de dados e recuperação.  
*Serviços/APIs previstos:* Supabase Auth + Postgres + Row Level Security (RLS)  
*Bloqueios/validações:* Definir schema, ambientes, backups; não expor service role ao cliente.

**08.02 · LLM API + orquestração de agentes**  
*Critério técnico:* Selecionar fornecedor/modelos, chaves server-side, custo por operação, fallback e roteamento.  
*Serviços/APIs previstos:* LLM API (OpenAI/Anthropic/Gemini — escolher) + SDK de orquestração  
*Bloqueios/validações:* OpenAI/Anthropic/Gemini a comparar; SDK de agentes é camada interna.

**08.03 · Geração de imagem — API de modelo**  
*Critério técnico:* Escolher provedor, qualidade visual, edição, resolução, custos, limites e download.  
*Serviços/APIs previstos:* API de geração de imagem (modelo/fornecedor a decidir)  
*Bloqueios/validações:* Decidir fornecedor; validar licença comercial e consistência com a marca.

**08.04 · Supabase Storage — arquivos e versões**  
*Critério técnico:* Upload/exportação seguros com prévia, controle de acesso, versões e arquivos duráveis.  
*Serviços/APIs previstos:* Supabase Storage + URLs assinadas + Postgres  
*Bloqueios/validações:* URLs assinadas, políticas RLS e gerenciamento de versões.

**08.05 · Banco de memória / embeddings (se aplicável)**  
*Critério técnico:* Persistir fatos confirmados, histórico, fontes e busca contextual; validar necessidade de vetor.  
*Serviços/APIs previstos:* Supabase Postgres + pgvector/embeddings (se necessário)  
*Bloqueios/validações:* Supabase Postgres; pgvector/embeddings só se a arquitetura justificar.

**08.06 · Supabase Cron / Edge Functions / jobs**  
*Critério técnico:* Execuções recorrentes, retry, pausa, idempotência, logs e fila de tarefas.  
*Serviços/APIs previstos:* Supabase Cron + Edge Functions + fila de jobs (escolher)  
*Bloqueios/validações:* Escolher queue/worker para trabalhos longos; rastrear falhas.

**08.07 · Gateway de pagamento + webhooks**  
*Critério técnico:* Assinatura, recargas, cobrança, renovação, falha e cancelamento conciliados.  
*Serviços/APIs previstos:* Gateway assinatura (Stripe/Mercado Pago — escolher) + webhooks  
*Bloqueios/validações:* Stripe ou Mercado Pago: escolha pendente; chave/webhook e ambiente teste.

**08.08 · Analytics + monitoramento (PostHog/GA4 + Sentry)**  
*Critério técnico:* Acompanhar funil, erros, uso, latência e custos de agentes com alertas.  
*Serviços/APIs previstos:* PostHog/GA4 (produto) + Sentry (erros) + métricas de LLM  
*Bloqueios/validações:* Escolher ferramentas e configurar privacidade, eventos e dashboard.

### Canais externos — 8 integrações

**09.01 · Instagram Graph API — conexão e publicação**  
*Critério técnico:* Conectar conta profissional, obter permissões, publicar mídia aprovada e ler insights.  
*Serviços/APIs previstos:* Instagram Graph API + OAuth Meta + permissões de publicação  
*Bloqueios/validações:* OAuth Meta, papéis, revisão do app e reconexão dos tokens.

**09.02 · Google Business Profile APIs — avaliações e desempenho**  
*Critério técnico:* Ler/gerir informações e avaliações autorizadas por local, com fonte e data.  
*Serviços/APIs previstos:* Google Business Profile APIs + OAuth + aprovação de acesso  
*Bloqueios/validações:* Acesso de projeto Google exige solicitação/aprovação; OAuth por conta.

**09.03 · Google Analytics Data API (GA4)**  
*Critério técnico:* Consultar sessões, eventos e conversões por período/propriedade conectada.  
*Serviços/APIs previstos:* Google Analytics Data API (GA4) + OAuth Google  
*Bloqueios/validações:* OAuth Google e permissão à propriedade; comparar métricas coerentes.

**09.04 · Importação CSV + conector CRM (a definir)**  
*Critério técnico:* Importar contatos/segmentos com consentimento, deduplicação e controle de origem.  
*Serviços/APIs previstos:* CSV + API de CRM escolhido + Supabase + consentimento LGPD  
*Bloqueios/validações:* Escolher integração (RD Station/HubSpot etc.) conforme público.

**09.05 · Meta Ads MCP oficial — leitura e insights**  
*Critério técnico:* Consultar contas, campanhas, anúncios e métricas para Kiwi e Íris.  
*Serviços/APIs previstos:* Meta Ads MCP oficial: https://mcp.facebook.com/ads + Marketing API (read)  
*Bloqueios/validações:* https://mcp.facebook.com/ads — confirmar beta/rollout, OAuth, acesso e uso multi-tenant em SaaS.

**09.06 · E-mail marketing — API do provedor**  
*Critério técnico:* Enviar campanhas aprovadas, controlar opt-in/opt-out, relatórios e falhas.  
*Serviços/APIs previstos:* API e-mail marketing (Brevo/Mailchimp ou outro — escolher)  
*Bloqueios/validações:* Brevo/Mailchimp ou outro a definir; domínio, envio, reputação e webhooks.

**09.07 · WhatsApp Business Platform — Cloud API**  
*Critério técnico:* Enviar comunicações autorizadas com templates, consentimento e entrega rastreada.  
*Serviços/APIs previstos:* WhatsApp Business Platform / Cloud API + webhooks  
*Bloqueios/validações:* WABA/número Meta, opt-in, templates, webhooks, limites e política de mensagens.

**09.08 · Meta Ads MCP + Marketing API — gestão de anúncios**  
*Critério técnico:* Criar, editar, pausar campanhas e controlar orçamento após aprovação explícita.  
*Serviços/APIs previstos:* Meta Ads MCP oficial: https://mcp.facebook.com/ads + Marketing API (manage)  
*Bloqueios/validações:* MCP oficial: validar escrita/rollout e SaaS multi-tenant; fallback Marketing API OAuth + ads_management.

### Integrações complementares — 7 integrações

**10.01 · Google Search Console API — SEO e buscas**  
*Critério técnico:* Consultar termos, páginas, cliques e impressões autorizados para Bia, Otto e Íris.  
*Serviços/APIs previstos:* Google Search Console API + OAuth Google  
*Bloqueios/validações:* Propriedade verificada, permissão, períodos e amostragem.

**10.02 · Facebook Pages Graph API — conteúdo e página**  
*Critério técnico:* Publicar conteúdo aprovado em Páginas e obter métricas disponíveis.  
*Serviços/APIs previstos:* Facebook Graph API / Pages API + OAuth Meta  
*Bloqueios/validações:* Revisar escopos, papéis da Página, publicação e políticas.

**10.03 · Fonte de pedidos/e-commerce — loja ou CSV**  
*Critério técnico:* Ler encomendas e receita de loja conectada; origem rastreável e sem dados inventados.  
*Serviços/APIs previstos:* Shopify Admin API / WooCommerce REST API / CSV (conforme cliente)  
*Bloqueios/validações:* Escolher suporte inicial, mapear pedidos e permissões.

**10.04 · Pesquisa de mercado e tendências — busca web**  
*Critério técnico:* Buscar fontes externas recentes para Bia/Otto com links e data de coleta.  
*Serviços/APIs previstos:* Tavily / Brave Search API / SerpAPI (escolher um)  
*Bloqueios/validações:* Termos de uso, limite de pesquisa, cache e referências.

**10.05 · Motor de vídeo/motion — API do fornecedor**  
*Critério técnico:* Gerar e armazenar entregas audiovisuais com prévia, revisão e orçamento.  
*Serviços/APIs previstos:* API de geração de vídeo (fornecedor/modelo a decidir)  
*Bloqueios/validações:* Benchmark de qualidade, tempos, formato, custo e direitos de uso.

**10.06 · CMS/blog — publicação de artigos**  
*Critério técnico:* Ligar criação de blog/SEO a um CMS autorizado, com revisão prévia.  
*Serviços/APIs previstos:* WordPress REST API / Shopify Blog API (conforme plataforma)  
*Bloqueios/validações:* Validar CMS suportado, OAuth/chaves e aprovação editorial.

**10.07 · E-mail transacional e alertas da plataforma**  
*Critério técnico:* Notificar aprovação pendente, entrega, falha e ciclo de conta sem depender do chat aberto.  
*Serviços/APIs previstos:* Resend / Postmark / SendGrid (escolher) + webhooks  
*Bloqueios/validações:* Domínio e entregabilidade; diferenciar e-mail transacional de marketing.

