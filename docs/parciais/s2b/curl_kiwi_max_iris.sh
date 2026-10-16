#!/usr/bin/env bash
# S2b: importação de CSV, base, métricas e as 8 deliveries de Kiwi, Max e Íris por curl contra a API local
# (8100), com o worker simulado. Uso (na raiz do repositório, com a API no ar e o seed aplicado):
#   bash docs/parciais/s2b/curl_kiwi_max_iris.sh
# Nenhuma chave é impressa: a chave publicável sai do .env só para o login (dados fictícios). No fim, make seed
# devolve o banco local ao estado do seed.
set -euo pipefail

PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
login() { curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'; }
API=http://127.0.0.1:8100; JSON='Content-Type: application/json'
AUTH="Authorization: Bearer $(login marina@miolo.example)"
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
WS=$(curl -s $API/workspaces -H "$AUTH" | field items.0.id)                             # Miolo
docker exec supabase_db_hellosquad psql -U postgres -qtAc \
  "select remaining from app.grant_credits('$WS', 100, 'bonus', 'demo:s2b:$(date +%s)', p_note => 'Demonstração local da S2b')" \
  | sed 's/^/bônus local concedido: /'

pedir() {  # agente, delivery, título, pedido
  local conv msg
  conv=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
    -d "{\"kind\":\"agent_direct\",\"primary_agent_id\":\"$1\"}" | field id)
  msg=$(curl -s -X POST $API/conversations/$conv/messages -H "$AUTH" -H "$JSON" -d "{\"body\":\"$4\"}" | field id)
  curl -s -X POST $API/messages/$msg/work-items -H "$AUTH" -H "$JSON" \
    -d "{\"delivery_type\":\"$2\",\"title\":\"$3\"}" | field id
}
worker() { (cd apps/backend && LLM_PROVIDER=simulated WORKER_WORKSPACE_CAP=8 uv run hellosquad-worker --drain 2>&1 \
  | grep -E 'concluído|falhou' | sed -E 's/run [0-9a-f-]+/run …/'); }
aprovar() { local ap; ap=$(curl -s $API/work-items/$1 -H "$AUTH" | field pending_approval.id)
  curl -s -X POST $API/approvals/$ap/decision -H "$AUTH" -H "$JSON" -d '{"decision":"approved"}' | field status; }
conteudo() { curl -s $API/work-items/$1 -H "$AUTH" | python3 -c 'import json, sys
w = json.load(sys.stdin); d = w["deliveries"][0]; v = d["versions"][-1]; c = v["content"]
print(" ", w["delivery_type"], "|", w["status"], "|", w["status_label"], "|", d["kind"], "v%d" % v["version_no"])
for k in sys.argv[1:]:
    x = c
    for p in k.split("."): x = x[int(p)] if p.isdigit() else x[p]
    print("     ", k, "=", json.dumps(x, ensure_ascii=False))' "${@:2}"; }

echo "== 1. Importação de CSV (Max): linha sem consentimento, duplicata e e-mail fora de .example recusados"
CSV=$'nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;ultima_compra;compras\n'
CSV+=$'Bia Nova;nova01@contatos.example;+55 11 99999-0101;sim;sim;2026-10-01;2026-09-20;2\n'
CSV+=$'Sem Consentimento;nova02@contatos.example;;não;não;;;\n'
CSV+=$'Já na Base;cliente01@contatos.example;;sim;não;2026-10-01;;\n'
CSV+=$'Fora do Domínio;pessoa@exemplo.test;;sim;não;2026-10-01;;'
python3 -c 'import json, sys; print(json.dumps({"file_name": "clientes-teste.csv", "source": "Planilha de teste do balcão", "csv": sys.argv[1]}))' "$CSV" \
  | curl -s -X POST $API/workspaces/$WS/contacts/imports -H "$AUTH" -H "$JSON" -d @- \
  | python3 -c 'import json, sys; d = json.load(sys.stdin); print("  total", d["total_rows"], "aceitas", d["accepted_rows"], "recusadas", d["refused"])'
curl -s $API/workspaces/$WS/contacts/summary -H "$AUTH" | python3 -c 'import json, sys; d = json.load(sys.stdin); d.pop("last_import_at"); print("  base:", json.dumps(d, ensure_ascii=False))'

echo "== 2. Primeira rodada: 05.01, 06.03, 07.02, 07.03"
K1=$(pedir kiwi 05.01 "Plano de mídia do Natal" "Kiwi, quanto investir em anúncios no Natal? Quero mais encomendas pelo site e tenho até R\$ 1.500 por mês.")
M3=$(pedir max 06.03 "Segmentos da base" "Max, organize minha base de clientes em segmentos.")
I2=$(pedir iris 07.02 "Análise do mês" "Íris, analise meus últimos resultados.")
I3=$(pedir iris 07.03 "Relatório do mês" "Íris, compare o último mês com o anterior e monte o relatório.")
worker
conteudo $K1 execucao orcamento.teto_informado orcamento.teto_proposto orcamento.distribuicao
conteudo $M3 base.total base.com_consentimento base.sem_consentimento segmentos.0.id segmentos.0.tamanho segmentos.0.elegiveis
conteudo $I2 dados.periodo_atual dados.lacunas.0 evidencias.0.variacao_pct evidencias.0.dias_com_dado leituras.0.tipo leituras.0.evidencias
conteudo $I3 dados.atualizado_ate evidencias.2.metrica evidencias.2.variacao_pct relatorio_anterior

echo "== 3. Aprovação da dona da conta; segunda rodada: 05.02, 06.01, 07.04"
for w in $K1 $M3 $I2 $I3; do echo "  $(aprovar $w)"; done
K2=$(pedir kiwi 05.02 "Teste de anúncios do Natal" "Kiwi, quero testar dois anúncios das encomendas de Natal no Instagram.")
M1=$(pedir max 06.01 "Reativação de Natal" "Max, quero reativar os clientes que sumiram, com uma oferta para as encomendas de Natal.")
I4=$(pedir iris 07.04 "Prioridades a partir dos números" "Íris, o que devemos fazer primeiro a partir dos números?")
worker
conteudo $K2 execucao plano_de_midia testes.0.variacoes testes.0.verba
conteudo $M1 segmento envio
conteudo $I4 analises recomendacoes.0.base recomendacoes.0.evidencias recomendacoes.0.discutir_com
echo "  $(aprovar $M1)"

echo "== 4. Terceira rodada: 06.02 segue a campanha aprovada; nada é enviado"
M2=$(pedir max 06.02 "Sequência da reativação" "Max, escreva a sequência de e-mails e mensagens da reativação.")
worker
conteudo $M2 envio campanha publico etapas.0.canal etapas.0.descadastro

echo "== 5. Métricas, conversa sobre a série e idioma do negócio"
FROM=$(date -d '-90 day' +%F); TO=$(date -d '-1 day' +%F)
curl -s "$API/workspaces/$WS/metrics?from=$FROM&to=$TO&channel=site" -H "$AUTH" | python3 -c 'import json, sys
s = json.load(sys.stdin)["items"][0]; print("  ", s["channel"], s["metric"], s["unit"], s["sources"], len(s["points"]), "pontos; sem dado:", s["missing_days"])'
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"object","context":{"type":"metric","key":"site.sessions","title":"Sessões no site"}}' \
  | python3 -c 'import json, sys; d = json.load(sys.stdin); print("  conversa:", d["primary_agent_id"], json.dumps(d.get("context"), ensure_ascii=False))'
curl -s -X PATCH $API/workspaces/$WS -H "$AUTH" -H "$JSON" -d '{"locale":"en"}' | python3 -c 'import json, sys; d = json.load(sys.stdin); print("  idioma do negócio:", d["slug"], d["locale"])'
curl -s $API/me -H "$AUTH" | python3 -c 'import json, sys; d = json.load(sys.stdin); print("  /me:", d["user"]["locale"], [m["workspace"]["locale"] for m in d["memberships"]])'
curl -s -X PATCH $API/workspaces/$WS -H "$AUTH" -H "$JSON" -d '{"locale":"pt-BR"}' > /dev/null

echo "== 6. Trilha (primeiro acesso, sem números): a Íris pede conexão, sem cobrar"
AUTH="Authorization: Bearer $(login juliana@trilha.example)"
WS=$(curl -s $API/workspaces -H "$AUTH" | field items.0.id)
T2=$(pedir iris 07.02 "Análise" "Íris, analise meus últimos resultados.")
worker
curl -s $API/work-items/$T2 -H "$AUTH" | python3 -c 'import json, sys; w = json.load(sys.stdin); print("  ", w["delivery_type"], w["status"], "|", w["status_label"], "| entregas:", len(w["deliveries"]))'
docker exec supabase_db_hellosquad psql -U postgres -qtAc \
  "select '   ' || m.body from public.messages m join public.work_items w on w.conversation_id = m.conversation_id where w.id = '$T2' and m.author_type = 'agent'"

make --no-print-directory seed > /dev/null && echo "== seed reaplicado"
