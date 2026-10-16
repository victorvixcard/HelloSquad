# HelloSquad

Equipe de marketing com IA para pequenos e médios negócios. Sete especialistas (Nexo, Bia, Kaia, Otto, Kiwi, Max e Íris) que compartilham a memória da marca do cliente, organizam pedidos em trabalhos acompanháveis e entregam com limites de autonomia auditáveis.

SaaS multi-tenant, cobrado por assinatura mais créditos avulsos (SPOT). Projetado desde o início para acessos simultâneos, SEO/GEO e apps Android e iOS.

## Estado do repositório

| Área | Estado |
|---|---|
| `docs/ARQUITETURA_PROPOSTA.md` | Proposta de infra, multi-acesso, backend, memória, créditos, SEO/GEO e mobile. **Aguardando aprovação do Vic.** |
| `docs/PLANO_DE_DESENVOLVIMENTO.md` | Fases, critérios de aceite, time, riscos. Confronta o escopo "tudo em novembro". |
| `docs/adr/` | Decisões de arquitetura registradas (ADRs curtos). |
| `squad/` | Definição oficial dos 7 agentes: `agent.yaml` (contrato máquina) + `SOUL.md` (identidade e regras). Fonte de verdade dos prompts; versionada. |
| `design/handoff-v4.6/` | Handoff de design (Landing V1 R32 + Product UI V4.6 + Documento Mestre v1.0 + catálogo). Referência, não código de produção. |
| `apps/`, `packages/`, `supabase/`, `infra/` | Esqueleto do monorepo. Vazio até a Fase 0 ser aprovada. |

## Ordem de leitura

1. `design/handoff-v4.6/LEIA_PRIMEIRO_CONSOLIDADO.md` e `documentacao/Documento_Mestre_HelloSquad_v1.0.md` (regras de produto).
2. `docs/ARQUITETURA_PROPOSTA.md` (como vamos construir).
3. `docs/PLANO_DE_DESENVOLVIMENTO.md` (em que ordem e com quem).
4. `squad/README.md` (como uma definição de agente vira comportamento em produção).

## Regras que valem para todo o repositório

- Decisão pendente não vira regra hardcoded. Preço, créditos, planos e limites ficam em tabela configurável (`Registro_Decisoes_Pendencias.md`).
- Conteúdo aprovado não autoriza publicar, enviar ou investir. Cada ação externa tem autorização própria, verificada no backend.
- Nada vira regra da Memória da Marca sem confirmação do usuário. Sugestões ficam como sugestões.
- Segredos só no servidor. Nunca no cliente, nunca em log, nunca neste repositório.
- Dados isolados por workspace em banco (RLS), storage e ferramentas.
