# H-SA — progresso da QA adversária da trilha Super Admin (Hulk)

Início 17/10/2026 00:14. Método: tentar refutar SA1, SA2, SA3a, SA3b, SA4a, SA4b, SA6a e SA6b lendo o código real e
atacando o ambiente local (API 8100, web 3100 com `/admin`, Supabase `hellosquad`, Mailpit 56324). Nenhum código de
produto é alterado; roteiros e provas em `docs/parciais/hsa/`; saídas longas em `/tmp/hsa_*`. Toda operação que muda
o banco roda dentro da trava `flock -o /tmp/hellosquad-db.lock` (lição da H2 §f).

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | PASSO 0: diretrizes, plano SA (8 perguntas e leitura conservadora), SUPER_ADMIN §1–§4, relatórios SA1–SA6b, H2 (formato), SETUP_LOCAL (Vic fictício) | ✅ 00:16 |
| 1 | (1) escalonamento: Marina, Carla, Pedro, anon, authenticated sem papel, token forjado, Data API | ✅ API 00:21 (48 operações × 4 personas = 403; sem token, chaves publicável/anon/service_role legadas e 4 forjados = 401; user_metadata de Super Admin = 403; banco sem mudança; Data API 401/403 em 23 de 24 tabelas, `delivery_prices` lida por qualquer autenticado: ver bloco 3). Web `/admin` no bloco 6 |
| 2 | (2) papel privilegiado não vaza; sessão de suporte (expirada, encerrada, só leitura) | ✅ 00:26 (sem sessão: 0 dado da Miolo/Vitta; com sessão: 24 de 30 GET, Vitta fechada, owner-only 403, 18 escritas com corpo válido recusadas e Miolo intacta; encerrar e expirar = 403 na hora; 6 aberturas paralelas = 1; achado: negócio criado pelo Vic quebra o `make seed`, `02c`) |
| 3 | (3) auditoria de cada escrita; (5) cobrança e créditos; (6) valores e segredos | ✅ 00:33 (16 tipos de escrita com evento, autor e motivo; recusas sem evento; DELETE em audit_events negado; créditos: chave repetida e 5 paralelos sem duplicar, 5 débitos paralelos = 1, nunca negativo; suspender pausa renovação e rotina (HS423) sem cancelar; à venda só com homologação + preço aprovado; 46/46 provisórios; 0 segredo em 28 respostas; achado: motivo interno do Super Admin legível pela Data API em `delivery_prices.note` e `workspaces.suspension_reason`; limpeza `03b` como o pytest da SA6a) |
| 4 | (4) versões do squad × runtime; `make squad-export` | ✅ 00:34 (worker simulado: rascunho fora do prompt e do run; publicar → run com hash novo e a versão em `sources`; voltar → hash da v1; ferramenta desconhecida 422; sem `entregas.criar_versao` → run `failed tool_not_allowed`, 0 versão de entrega; `squad-export` vazio sem mudança, só a seção com a v2; limpeza como a SA3a) |
| 5 | (8) consumo/qualidade/saúde; (9) e-mail da sessão de suporte no Mailpit | em andamento |
| 6 | (7) web `/admin`: noindex, 2FA, 403, i18n, lado a lado com o SA0 | — |
| 7 | (10) clone limpo em `/tmp` | — |
| 8 | Relatório `H-SA-relatorio.md`, banco no seed | — |
