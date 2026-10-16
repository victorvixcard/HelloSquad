# Diretrizes do dono — HelloSquad

**PASSO 0 de todo briefing.** Qualquer agente (Stark, Aranha, Jarvis, Hulk, Nick Fury, Visão) lê este arquivo antes de tocar no repositório. Decisão do Vic registrada aqui vale mais do que qualquer premissa anterior.

## Decisões do Vic

| Data | Decisão | Consequência prática |
|---|---|---|
| 15/10/2026 | **Tudo é testado localmente primeiro.** Só publicamos (Supabase cloud, Railway, Vercel) depois de todos os testes validados. | Nenhum agente cria projeto em nuvem, configura domínio ou faz deploy. Ambiente local = Supabase CLI em Docker + FastAPI + Next.js na máquina do Vic. A publicação é a Fase 5 e só abre com go do Vic. |
| 15/10/2026 | **Todo dado de teste é fictício.** Clientes, usuários, contatos, métricas e marcas de teste nunca são reais. | Seeds e testes usam só o que está em `docs/DADOS_FICTICIOS.md`. Nenhum CPF, CNPJ, telefone, e-mail ou marca real de terceiro entra no repo ou no banco local. E-mails fictícios usam o TLD reservado `.example`. |
| 15/10/2026 | **Infra aprovada:** Vercel (web) + Railway (api, worker, scheduler) + Supabase (Auth, Postgres+RLS, pgvector, pgmq, cron, Storage, Realtime). | Código nasce já compatível com esse destino (Supabase CLI local é o mesmo Postgres e a mesma Auth), mas roda local até a Fase 5. Ver `docs/ARQUITETURA_PROPOSTA.md`. |
| 15/10/2026 | **Kiwi é Growth Marketing em todo o fluxo.** Tratamento: "a Kiwi". | Rótulos, SOUL, skills e UI usam Growth Marketing. "Mídia" da V4.6 é legado. |
| 15/10/2026 | **Repositório oficial:** `github.com/victorvixcard/HelloSquad`, público. | Nenhum segredo, chave, token ou `.env` entra no repo. Commits pequenos e frequentes em `main`. O Diogo (design) receberá acesso. |
| 15/10/2026 | Sete agentes com nomes, cores e papéis do handoff; definição em `squad/`. | `squad/<agente>/agent.yaml` e `SOUL.md` são a fonte dos prompts. Mudança neles gera versão nova, nunca edição silenciosa. |

## Regras herdadas do Documento Mestre (valem como decisão do dono)

1. Decisão comercial pendente (preço, créditos, planos, paywall) **não vira regra hardcoded**. Vai para tabela configurável com valor provisório marcado como provisório.
2. Aprovar conteúdo **não** autoriza publicar, enviar, investir ou alterar campanha. Cada ação externa tem autorização própria verificada no backend.
3. Nada vira regra da Memória da Marca sem confirmação do usuário.
4. Dados isolados por workspace em banco (RLS), storage e ferramentas. Teste automatizado de isolamento é obrigatório.
5. Não inventar dado, métrica ou resultado. Estado vazio honesto.

## Protocolo de trabalho dos agentes

- **Idioma:** português do Brasil em UI, docs, comentários e mensagens de commit. Código (identificadores) em inglês.
- **Commit em até 10 minutos após começar e a cada item verde.** Nunca acumular para o fim. Mensagem curta no imperativo.
- **Relatório em arquivo:** cada fatia escreve `docs/parciais/<fatia>-progresso.md` durante o trabalho e `docs/parciais/<fatia>-relatorio.md` ao fechar, ambos commitados. Saída longa de comando vai para `/tmp` e só o `tail` é lido.
- **Nunca ler arquivo gigante inteiro** (os `.dc.html` do handoff têm até 1,4 MB). Ler faixas de até 200 linhas ou extrair com script.
- **Nada de nuvem, nada de deploy, nada de segredo.** Se precisar de uma chave (por exemplo, API da Anthropic), parar e registrar a pendência no relatório. O Vic fornece via `.env` local.
- **Dúvida de regra de produto:** não adivinhar. Registrar a pergunta no relatório e seguir com o que não depende dela.
- **Antes de dizer "pronto":** rodar o comando de verificação, colar o resultado no relatório. Evidência antes de afirmação.
