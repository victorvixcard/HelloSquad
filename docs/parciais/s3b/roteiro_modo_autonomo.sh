#!/usr/bin/env bash
# S3b: critério da Fase 3 (Modo Autônomo) ponta a ponta com os processos de verdade: a API local (8100), o
# hellosquad-scheduler (--once, com --force-due para não esperar a quinta) e o worker simulado em --drain.
# Conta em uso da Miolo como o protótipo; o scheduler dispara o plano sem pedido manual, o Otto entrega,
# "Aguarda sua aprovação", Marina aprova ("Aprovada por você"), a Kaia aguarda o motor; pausada não executa;
# delegar é conversa e só o dono confirma (Vitta); outro negócio não vê nada.
# Uso (na raiz, com a API no ar e o seed aplicado): bash docs/parciais/s3b/roteiro_modo_autonomo.sh
# Nenhuma chave é impressa: a chave publicável sai do .env só para o login (dados fictícios). No fim, make seed.
set -euo pipefail

PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
login() { curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'; }
API=http://127.0.0.1:8100; JSON='Content-Type: application/json'
MARINA="Authorization: Bearer $(login marina@miolo.example)"
RAFAEL="Authorization: Bearer $(login rafael@vitta.example)"
CARLA="Authorization: Bearer $(login carla@vitta.example)"
PLAN=5eed0000-0000-4000-8000-000000000a01
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
sql() { docker exec supabase_db_hellosquad psql -U postgres -qtAc "$1"; }
scheduler() { (cd apps/backend && uv run hellosquad-scheduler --once "$@" 2>&1 | grep 'modo autônomo' \
  | sed -E 's/^.*modo autônomo/  scheduler: modo autônomo/'); }
worker() { (cd apps/backend && LLM_PROVIDER=simulated uv run hellosquad-worker --drain 2>&1 \
  | grep -E 'concluído|falhou' | sed -E 's/.*run [0-9a-f-]{36} [^:]*: /  worker: /'); }
runs() { curl -s "$API/workspaces/$1/autonomy/runs?limit=${2:-5}" -H "$3" | python3 -c 'import json, sys
for r in json.load(sys.stdin)["items"]:
    print("  %s · %s · %s · %s" % (r["code"], r["title"], r["status_label"], r["message"]))'; }

MIOLO=$(curl -s $API/workspaces -H "$MARINA" | field items.0.id)
VITTA=$(curl -s $API/workspaces -H "$RAFAEL" | field items.0.id)

echo "== 1. Modo Autônomo da Miolo (conta em uso)"
curl -s $API/workspaces/$MIOLO/autonomy -H "$MARINA" | python3 -c 'import json, sys
o = json.load(sys.stdin)
print("  interruptor:", o["switch"]["label"], "| contagem:", json.dumps(o["counts"]))
for r in o["responsibilities"]:
    print("  %s · %s · %s" % (r["title"], r["status_label"], r["say"]))
print("  próximas:", " | ".join("%s %s (%s)" % (u["at_label"], u["title"], u["state_label"]) for u in o["upcoming"]))'
echo "  histórico:"; runs $MIOLO 5 "$MARINA"

echo "== 2. O scheduler dispara o plano sem pedido manual (forçado para agora; o ritmo é toda quinta, 9h)"
scheduler --force-due $PLAN
CODE=$(sql "select code from public.responsibility_runs where responsibility_id = '$PLAN' order by created_at desc limit 1")
WORK=$(sql "select work_item_id from public.responsibility_runs where code = '$CODE' and workspace_id = '$MIOLO'")
echo "  execução $CODE: $(sql "select status from public.responsibility_runs where code = '$CODE' and workspace_id = '$MIOLO'")"
echo "  trabalho: $(sql "select origin_type || ' ' || origin_ref || ' · ' || title || ' · ' || status from public.work_items where id = '$WORK'")"
echo "  run na fila runs_scheduled: $(sql "select count(*) from pgmq.q_runs_scheduled q join public.runs r on r.id = (q.message ->> 'run_id')::uuid where r.work_item_id = '$WORK'")"
echo "  etapas: $(sql "select string_agg(seq || ' ' || agent_id || ' ' || delivery_type || ' ' || status, ' → ' order by seq) from public.work_item_steps where work_item_id = '$WORK'")"
worker
runs $MIOLO 1 "$MARINA"

echo "== 3. Marina aprova o plano; a Kaia fica aguardando o motor de imagem"
APPROVAL=$(sql "select id from public.approvals where work_item_id = '$WORK' and status = 'pending'")
curl -s -X POST $API/approvals/$APPROVAL/decision -H "$MARINA" -H "$JSON" -d '{"decision":"approved"}' \
  | python3 -c 'import json, sys; a = json.load(sys.stdin); print("  decisão:", a["status"], a["decision"])'
worker
runs $MIOLO 1 "$MARINA"
echo "  etapas: $(sql "select string_agg(seq || ' ' || agent_id || ' ' || status || coalesce(' (' || status_reason || ')', ''), ' → ' order by seq) from public.work_item_steps where work_item_id = '$WORK'")"
echo "  memória usada: $(sql "select jsonb_array_length(memory_used) from public.responsibility_runs where code = '$CODE' and workspace_id = '$MIOLO'") orientações"

echo "== 4. Pausada não executa"
curl -s -X POST $API/workspaces/$MIOLO/autonomy/responsibilities/$PLAN/pause -H "$MARINA" \
  | python3 -c 'import json, sys; r = json.load(sys.stdin); print("  %s · %s · %s" % (r["status_label"], r["say"], r["idle"]))'
BEFORE=$(sql "select count(*) from public.responsibility_runs where responsibility_id = '$PLAN'")
scheduler --force-due $PLAN
echo "  execuções do plano: antes $BEFORE, depois $(sql "select count(*) from public.responsibility_runs where responsibility_id = '$PLAN'")"
curl -s -X POST $API/workspaces/$MIOLO/autonomy/responsibilities/$PLAN/resume -H "$MARINA" \
  | python3 -c 'import json, sys; r = json.load(sys.stdin); print("  retomada: %s · %s" % (r["status_label"], r["say"]))'

echo "== 5. Delegar é conversa: o Nexo apresenta o combinado e só o dono confirma (Vitta)"
CONV=$(sql "insert into public.conversations (workspace_id, kind, primary_agent_id, title) values ('$VITTA', 'agent_direct', 'nexo', 'Nova responsabilidade') returning id" | head -1)
P=$(curl -s -X POST $API/workspaces/$VITTA/autonomy/proposals -H "$CARLA" -H "$JSON" \
  -d "{\"template\":\"plan\",\"options\":{\"obj\":\"site_orders\",\"day\":\"fri\",\"vol\":\"posts3\"},\"conversation_id\":\"$CONV\"}")
echo "  Nexo: $(sql "select body from public.messages where conversation_id = '$CONV' order by created_at limit 1")"
echo "  cartão: $(echo "$P" | field agreement)"
echo "  primeira execução: $(echo "$P" | field first_run_label)"
A=$(echo "$P" | field approval_id)
echo "  Carla (editora) confirma: HTTP $(curl -s -o /dev/null -w '%{http_code}' -X POST $API/approvals/$A/decision -H "$CARLA" -H "$JSON" -d '{"decision":"approved"}')"
echo "  Rafael (dono) confirma: HTTP $(curl -s -o /dev/null -w '%{http_code}' -X POST $API/approvals/$A/decision -H "$RAFAEL" -H "$JSON" -d '{"decision":"approved"}')"
echo "  Nexo: $(sql "select body from public.messages where conversation_id = '$CONV' and card is null order by created_at desc limit 1")"
curl -s $API/workspaces/$VITTA/autonomy -H "$RAFAEL" | python3 -c 'import json, sys
o = json.load(sys.stdin)
for r in o["responsibilities"]:
    print("  %s · %s · %s" % (r["title"], r["status_label"], r["say"]))'

echo "== 6. Outro negócio não vê nada"
echo "  Rafael no Modo Autônomo da Miolo: HTTP $(curl -s -o /dev/null -w '%{http_code}' $API/workspaces/$MIOLO/autonomy -H "$RAFAEL")"
echo "  Rafael pausando o plano da Miolo: HTTP $(curl -s -o /dev/null -w '%{http_code}' -X POST $API/workspaces/$VITTA/autonomy/responsibilities/$PLAN/pause -H "$RAFAEL")"

make seed > /dev/null 2>&1 && echo "== seed reaplicado"
