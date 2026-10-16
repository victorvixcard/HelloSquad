# HelloSquad — Super Admin (plano)

**Versão:** 0.1 · **Data:** 16/10/2026 · **Autor:** Thor · **Pedido do Vic (16/10, 08:45):** "Neste painel iremos controlar tudo: pagamento, as contas de cada cliente, a estrutura de todos os agentes (SOUL, regras, etc., como no OpenClaw), as regras de negócio e as decisões lógicas escritas e exibidas, o motor de imagem visível para mudar em texto. Aproveitar o branding e o Design System do HelloSquad e as regras do HelloSquad."
**Referência visual de partida:** painel Super Admin do HelloOtto (12 capturas enviadas pelo Vic em 16/10). Adaptado aos sete agentes e às regras do HelloSquad; o visual segue o DS do Diogo.

---

## 1. Princípios

1. **Separado do produto.** O Super Admin é um papel de plataforma (`platform_admins`), não um papel de workspace. Mora em `/admin`, com login próprio e, antes de abrir ao público, **verificação em duas etapas obrigatória** (o painel avisa enquanto estiver desligada, como no HelloOtto).
2. **Tudo auditado, nada apagado.** Cada ação do Super Admin vira `audit_events` (inclusive "entrou no ambiente do cliente", com conta e motivo). A tela de Auditoria mostra tudo, com filtros Super Admin / Clientes / Sistema.
3. **Texto que o agente lê é editável aqui, versionado.** SOUL, skills, regras compartilhadas e os textos do motor de imagem são editados no painel; cada gravação vira uma versão nova em `agent_prompt_versions` e fica na auditoria; o painel mostra "o que o agente lê" montado, com tamanho em caracteres. Preços, planos e catálogo nunca entram no prompt: vêm do banco a cada conversa (regra do HelloOtto que vale aqui).
4. **Decisão pendente não vira regra.** Os documentos de regras de negócio carregam marcação por parágrafo: `[DECIDIDO]`, `[BASE ATUAL]`, `[PENDENTE]`, `[PROPOSTA]`. O que está `[PENDENTE]` aparece como tal, e o painel não o aplica.
5. **Custo visível.** Toda chamada de IA registra modelo, esforço, tokens (entrada, cache lido, saída) e custo pelo preço da época; o cliente nunca vê isso, só o Super Admin. Crédito do cliente é trabalho entregue, nunca token.
6. **Mesmo DS, mesmas regras.** Tipografia, cores, componentes e tom de voz do HelloSquad. Em pt-BR, com catálogo de mensagens (ADR-0010).

---

## 2. Mapa de telas

Barra lateral com dois grupos, como no HelloOtto: **Operação** e **Squad IA**.

### Operação
| Tela | O que mostra | O que faz |
|---|---|---|
| **Contas** | Quem usa o HelloSquad: negócio, tipo (PF/PJ), plano, saldo de créditos, desde quando, membros, idioma. Cartões: contas, planos ativos, free, créditos em saldo. | Buscar, filtrar, abrir a conta, **entrar no ambiente do cliente** (suporte, auditado), ajustar crédito com motivo, suspender. |
| **Catálogo** | As 46 deliveries dos sete agentes com: agente, nome, profundidade (orientar/produzir/executar/otimizar), preço em créditos, "à venda", "preço aprovado comercialmente", integrações necessárias e estado de homologação. | Editar preço e disponibilidade (versionado; **valores provisórios marcados até o Vic definir**). |
| **Planos e recargas** | Free e assinaturas (mensal/anual) com créditos por ciclo, bônus, validade, rollover; recargas avulsas (SPOT) com validade. | Editar com versão; checkbox "preço aprovado comercialmente" como trava de venda. |
| **Pagamentos** | Assinaturas, recargas, webhooks recebidos, conciliação, falhas, chargebacks, por provedor (**Asaas** e **Mercado Pago**). | Reprocessar webhook, marcar conciliação, ver histórico por conta. Fase 2. |
| **Auditoria** | Cobrança, extrato, acesso do suporte, memória confirmada, aprovações, configuração, prompts. Nada é apagado. | Filtrar por quem (Super Admin / Clientes / Sistema), conta, período, tipo. |

### Squad IA
| Tela | O que mostra | O que faz |
|---|---|---|
| **Squad** (lista dos 7) | Nexo, Bia, Kaia, Otto, Kiwi, Max, Íris com cor, forma, papel, modelo e esforço padrão, nº de deliveries, versão atual do prompt, custo médio por entrega. Como a lista de agentes do OpenClaw. | Abrir o agente. |
| **Agente › Alma** (SOUL) | Seções do `SOUL.md` (identidade, o que faz, como fala, limites, memória, o que nunca faz), cada uma com título, texto, versão, data, nº de palavras; "N de N seções entram no prompt, cerca de X mil caracteres". | Editar seção → versão nova + auditoria; comparar versões; voltar versão. |
| **Agente › Skills** | Uma aba por delivery do catálogo (ex.: Otto 04.01): procedimento, formato da entrega, critérios de aceite. | Editar com versão. |
| **Agente › Ferramentas e limites** | `agent.yaml`: ferramentas permitidas, colaboradores, autonomia máxima, modelo e esforço por etapa, escopos de memória. | Editar com versão (ferramenta fora da lista é recusada pelo runtime). |
| **Agente › O que ele lê** | O system prompt montado (SOUL + regras compartilhadas + skill + contexto de exemplo), só leitura, com contagem de tokens estimada. | Conferir antes de publicar. |
| **Regras de negócio** | Documentos de regras operacionais (precedência, limites de autonomia, aprovações, créditos, memória), com marcação `[DECIDIDO] [BASE ATUAL] [PENDENTE] [PROPOSTA]` e "entra no prompt" ou "referência interna". | Editar com versão; o que entra no prompt vai para `squad/README.md` (regras compartilhadas). |
| **Referências** | Repertório que os agentes consultam: brandbooks, fontes, moods (abas), cada um com lições e "a IA usa em". | Cadastrar, ativar, desativar. Fase 2+, com o motor de imagem. |
| **Motor de imagem** | Como o motor do Vic funciona, escrito em texto editável: etapas (briefing, orçamento e reserva, variações, aplicações, pacote final, ajuste e aprovação), quem faz cada uma (pessoa, IA, código), custo médio, preço em créditos. | Editar o texto de comportamento; o runtime lê daqui. Entra quando o Vic enviar o motor. |
| **Modelos e custos** | Abas: Custos (chamadas, custo total, por cliente: chamadas, entrada, cache lido, saída, custo), Regras por tarefa (qual modelo e esforço cada etapa usa), Preços e câmbio (tabela de preço por modelo e cotação do dólar, com data). | Editar regras por tarefa e tabela de preço (versionado). |
| **Consumo por cliente** | Por conta e período: solicitações, créditos cobrados, custo de IA em entregas e em conversa, IA por crédito; **alertas econômicos** (IA por crédito, margem bruta estimada, tendência de custo por turno) com faixas de referência. Conversa não cobra crédito, mas custa: aparece aqui. | Filtrar; nada muda automaticamente. |
| **Saúde das APIs** | Por provedor (Anthropic; motor de imagem; Asaas/Mercado Pago; Meta; Google…): funcionando ou não, gasto em 24 h / 7 dias / 30 dias / desde o início, chamadas e falhas, última recusa por saldo. Campo "saldo lido no painel do provedor" com alerta abaixo de X. | Informar saldo; ver custos por tarefa. |
| **Fila de trabalhos** | `runs` e filas pgmq: na fila, rodando, falharam; por trabalho: conta, estado, tentativas (1 de 3), criado, posse até, último erro. | Reenfileirar, cancelar, abrir o run (passos e eventos). |
| **Qualidade das entregas** | Por mês e por tipo: aprovadas de primeira, ajustes por entrega, não aprovadas, custo de IA por aprovada, erros do agente, chamadas com falha. "Como ler" explicando o que entra na conta. | Comparar períodos (mede se uma mudança de prompt ou modelo melhorou). |

---

## 3. Modelo de dados (acréscimos; o resto já existe)

| Tabela | Para quê |
|---|---|
| `platform_admins` (user_id, mfa_enforced, created_by) | Quem é Super Admin. Fora de `memberships`. |
| `support_access_log` (admin_id, workspace_id, reason, started_at, ended_at) | "Entrou no ambiente do cliente", também em `audit_events`. |
| `plans`, `plan_versions` | Free, Pro mensal/anual…, créditos por ciclo, bônus, rollover, "à venda", "preço aprovado". |
| `topups`, `topup_versions` | Recargas avulsas com validade. |
| `delivery_catalog` (46 itens) e `delivery_prices` (já previsto) | Catálogo com preço em créditos versionado e "à venda". |
| `agent_prompt_versions` (S1c) + `agent_prompt_sections` | SOUL por seção, skills, ferramentas; diff e rollback. |
| `business_rule_docs`, `business_rule_doc_versions` | Regras de negócio com marcação por parágrafo e flag "entra no prompt". |
| `reference_items` | Referências (brandbooks, fontes, moods) com lições e "a IA usa em". |
| `model_pricing` (modelo, preço entrada/saída/cache, câmbio, vigência) e `task_model_rules` (etapa → modelo, esforço) | Modelos e custos. |
| `provider_health` (provedor, último sucesso, última recusa, saldo informado, alerta) | Saúde das APIs. Gasto vem de `run_steps`. |
| Views: `v_consumo_por_cliente`, `v_qualidade_entregas`, `v_fila` | Consumo, qualidade e fila sem duplicar dado. |

Tudo com `audit_events` em escrita; leitura só pelo papel de Super Admin via API privilegiada (`/admin/*`), nunca pela Data API.

---

## 4. Segurança

- Rotas `/admin/*` exigem usuário em `platform_admins`; a API usa papel privilegiado **só nessas rotas**, com `workspace_id` explícito em toda consulta por cliente e registro em `audit_events`.
- 2FA (TOTP) obrigatória para Super Admin antes da Fase 5; o painel exibe o aviso enquanto estiver desligada.
- "Entrar no ambiente do cliente" abre uma sessão de suporte com motivo, tempo limitado e registro; nunca sem motivo.
- Segredos de provedores (chaves de API) nunca aparecem no painel: só "configurada" ou "ausente".

---

## 5. Fases (trilha SA, paralela às fases do produto; nunca à frente do núcleo)

| Fatia | Conteúdo | Quando |
|---|---|---|
| **SA0** | Este plano + **protótipo navegável** com o DS do HelloSquad (todas as telas acima, dados fictícios, pt-BR), para o Vic ajustar antes de codar. | Agora, em paralelo com S1c/A1f/X1, sem tocar em `apps/`. |
| **SA1** | Schema: `platform_admins`, planos, recargas, catálogo, regras de negócio, pricing, provider_health, views; API `/admin/*` de leitura; seed fictício (Vic como Super Admin local). | Depois de S1e (créditos), Fase 1. |
| **SA2** | UI em `apps/web/app/admin`: Contas, Catálogo, Planos, Auditoria, Fila de trabalhos, Modelos e custos (leitura). | Fim da Fase 1. |
| **SA3** | Squad: lista dos 7, Alma/Skills/Ferramentas com edição versionada, "o que ele lê", Regras de negócio. O runtime passa a ler as versões ativas do banco (com `squad/` como seed e exportação). | Fase 2. |
| **SA4** | Consumo por cliente com alertas econômicos, Qualidade das entregas, Saúde das APIs com saldo informado. | Fase 2. |
| **SA5** | Motor de imagem (texto de comportamento editável) e Referências. | Quando o motor do Vic chegar. |
| **SA6** | Pagamentos (Asaas/Mercado Pago), entrar no ambiente do cliente, 2FA. | Fase 2 (pagamentos) e Fase 5 (2FA). |

---

## 6. O que o protótipo SA0 precisa provar

Que todas as telas cabem no DS do HelloSquad sem inventar componente; que os sete agentes aparecem como "squad" (cor, forma, olhos) e não como lista genérica; que as marcações `[DECIDIDO]/[PENDENTE]` são legíveis; que o Vic consegue dizer "muda isso" olhando, antes de o Stark criar tabela.
