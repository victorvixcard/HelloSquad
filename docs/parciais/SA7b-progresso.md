# SA7b — Correções da H-SA (web, fidelidade ao SA0) · progresso

Aranha, 17/10/2026, início 01:08. Área: `apps/web`, `packages/ui`, docs da fatia. Stark em paralelo na SA7a (`apps/backend`, `supabase/`).

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 01:12 | 1. H-SA-03: `pagamentos.desc` nos 3 catálogos sem "chegam na SA6" (texto do SA0 sem a fase); teste recusa código de fatia em texto do catálogo admin; varredura: só `nav.soon` ("em breve", Referências e Motor de imagem, ainda não entregues) e `common.editLater` (Modelos, edição não entregue) sobram, os dois verdadeiros | feito | este |
| 01:15 | 2. H-SA-04: Catálogo como o SA0: "Versão N" (1 + preços novos gravados em `delivery_prices`) e "Ver histórico" (Auditoria, Super Admin, configuração) no topo; linha de apoio nos 5 números ("Aguardando" = motor + integração); chips por agente com mini e contagem (links `?agente=`, `aria-current`); cabeçalho do agente com "N deliveries", resumo da homologação e "Abrir o agente" (`/admin/squad/<id>`); integrações em etiquetas pelas palavras-chave do SA0 (texto completo no `title`; sem palavra-chave, o texto fica). Vitest: 5 casos novos | feito | este |
| 01:20 | 3. H-SA-05: Pagamentos com o cartão do provedor do SA0 (sub "Assinaturas e recargas"; Conta no provedor, Chave da API, Webhook, Ambiente, Integração `PaymentProvider` (ADR-0008), A validar só nos provedores reais) e abas Assinaturas / Recargas / Webhooks (com a nota de idempotência do SA0) / Conciliação (Falhas), contador nas abas como o SA0 (`AdminTabs.badge`); chave `webhookSecret` sem uso removida. H-SA-06: "Exportar CSV" no topo da Auditoria, gerado no navegador a partir da página carregada (mesmas colunas, BOM, RFC 4180, fórmula neutralizada), aviso "N eventos desta página exportados em CSV, com os filtros atuais." Vitest: 5 casos novos | feito | este |
| | 4. ℹ️ de web; Vic sem negócio → `/admin` | a fazer | |
| | 5. `make test-web`, relatório | a fazer | |
