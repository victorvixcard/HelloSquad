# HelloSquad — Handoff consolidado para Vic

Este é o **ZIP final consolidado**. Os arquivos da Landing Page e Product UI V4.6, o README original e as dependências permanecem **sem modificações**. Acrescentamos a pasta `documentacao/`.

## Ordem de leitura (sugerida)

1. **`documentacao/Documento_Mestre_HelloSquad_v1.0.docx`** — regras, propósito, sete agentes, skills, memória, autonomia, segurança, jornadas, critérios, catálogo completo de 46 deliveries e 23 integrações. Alternativa: `.md`.
2. **`documentacao/Registro_Decisoes_Pendencias.md`** — lacunas comerciais/técnicas; não tratar como regras fechadas.
3. **`README.md`** — handoff original do Claude: como rodar a landing e Product UI, funcionamento, limitações do protótipo, Design System e estrutura dos `.dc.html`.
4. **`documentacao/catalogo_46_deliveries_23_integracoes.csv`** — tabela operacional de consulta (snapshot do backlog anexado).
5. **Google Sheets (fonte viva):** https://docs.google.com/spreadsheets/d/1Fqa2A3w_FwEisuerd8U_fXh4HuAv5fC0elzVZM3GheY/edit. Status e datas podem evoluir após a geração deste pacote.

## Como visualizar

Na pasta `HelloSquad_Handoff_V4.6/`: `python3 -m http.server 8000`. Landing: `/landing/LandingPageV1.dc.html`; Product UI: `/product-ui/ProductUIV4.dc.html`.

## Critérios de integridade

- Os arquivos do ZIP original do Claude **não foram editados**. O `CHECKSUMS.sha256` original foi preservado.
- `CHECKSUMS_CONSOLIDADO.sha256` contém hashes SHA-256 de todos os arquivos do pacote final (exceto ele próprio).
- **46 deliveries / 23 integrações** previstos no escopo do lançamento, sujeitos a homologação.
- Nada de API/LLM/produção está ligado nos HTMLs. A interface é demo.
- **Não herdar** preços e créditos do antigo HelloOtto; modelo comercial HelloSquad segue pendente.
- Kiwi: **Growth Marketing**, inclusive SEO, aquisição, CRO, testes e mídia; Otto responde pela produção editorial SEO.
- O design continuará sendo refinado em paralelo ao backend; baseline UI = V4.6.
