# S1f — Progresso (Stark)

**Fatia:** S1f, conversa completa (Fase 1): conversa em grupo com um especialista por vez, contexto de objeto
para todos os tipos do protótipo, tópico da Sala, não lidas por pessoa, cartão estruturado na mensagem do
agente, texto de status por etapa, ações da Memória que faltaram na S1d.
**Início:** 16/10/2026 11:47. **Especificação:** briefing do Thor (`briefings/FASE1_PROXIMAS_FATIAS.md`),
`FLUXOS_DA_V46.md` §4, §5, §10.1, §10.3 e §11, `x1/cartoes_da_conversa.txt`, `x1/notas_conversa_pendencias.md`
§A7–§A9, S1b §1, S1c §1–§2, S1d §1 e §7, S1e §1, A1a.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 11:51 | PASSO 0 lido (diretrizes, FLUXOS §4/§5/§10.1/§10.3/§11, 24 cartões, plano e respostas do Vic, S1b §1, S1c §1–§2, S1d §1/§7, S1e §1, A1a inteiro); protótipo conferido por linha: `GKEYS` (L5876–5884), `_groupThread` e `_groupSpeaker` (L7128–7145) | ✅ | este |

## Notas do levantamento

- Grupo no protótipo (L7130): uma conversa por conjunto de especialistas (`g-<ids na ORDER>`), reaberta se o
  mesmo conjunto for escolhido de novo; quem está à frente é o Nexo se participa, senão o primeiro na ordem.
- Quem responde (L7141): conta as ocorrências das palavras de cada especialista (`GKEYS`) no texto; vence a
  maior contagem (empate: o primeiro na ordem); nenhuma: o Nexo se participa, senão o primeiro. O protótipo não
  interpreta `@Nome` ("Chamar" só escreve no campo); o briefing pede que direcione (pergunta 8 da §11).
- O web (A1a) só cria trabalho para pedido de legenda/texto (`deliveryForRequest`) e decide `answered` na
  pergunta pendente; mensagem comum não gera run. Não quebrar: cartão "Material · vN" relê `GET /runs/{id}` +
  `GET /work-items/{id}`; ordem dos eventos `delivery.created` → `message.created` → `approval.requested`.
- Créditos (S1e): reserva no `begin()`, captura no `deliver()` antes do `succeeded`, liberação pela trigger.
