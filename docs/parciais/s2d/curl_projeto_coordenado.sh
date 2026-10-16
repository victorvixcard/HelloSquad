#!/usr/bin/env bash
# S2d: critério da Fase 2 por curl contra a API local (8100) com o worker simulado em --drain. Marina pede uma
# campanha de Natal na Sala do Squad; o Nexo monta a equipe (Bia 02.04 → Kaia 03.01 → Otto 04.03) e delega só a
# primeira etapa; Marina aprova a estratégia; a Kaia aguarda o motor de imagem (sem cobrar) e o Otto entrega com a
# estratégia no contexto; Marina aprova os textos e o projeto fecha com um responsável por etapa. No fim, o
# Rafael (Vitta) recebe 404 no trabalho e no projeto da Miolo.
# Uso (na raiz do repositório, com a API no ar e o seed aplicado): bash docs/parciais/s2d/curl_projeto_coordenado.sh
# Nenhuma chave é impressa: a chave publicável sai do .env só para o login (dados fictícios). No fim, make seed.
set -euo pipefail

PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
login() { curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'; }
API=http://127.0.0.1:8100; JSON='Content-Type: application/json'
MARINA="Authorization: Bearer $(login marina@miolo.example)"
RAFAEL="Authorization: Bearer $(login rafael@vitta.example)"
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
sql() { docker exec supabase_db_hellosquad psql -U postgres -qtAc "$1"; }
worker() { (cd apps/backend && LLM_PROVIDER=simulated uv run hellosquad-worker --drain 2>&1 \
  | grep -E 'concluído|falhou' | sed -E 's/.*run [0-9a-f-]{36} [^:]*: /  run: /'); }
etapas() { curl -s $API/work-items/$1 -H "$MARINA" | python3 -c 'import json, sys
w = json.load(sys.stdin)
print("  trabalho: %s | %s | %s" % (w["status"], w.get("step_label"), w.get("status_label")))
for s in w["steps"]:
    print("  etapa %d · %s · %s (%s) · %s%s" % (s["seq"], s["title"], s["agent_id"], s["delivery_type"],
          s["status"], " · " + s["status_reason_label"] if s.get("status_reason_label") else ""))'; }
pendente() { curl -s $API/work-items/$1 -H "$MARINA" | field pending_approval.id; }
decidir() { curl -s -X POST $API/approvals/$1/decision -H "$MARINA" -H "$JSON" -d '{"decision":"approved"}' \
  | field status; }

MIOLO=$(curl -s $API/workspaces -H "$MARINA" | field items.0.id)
ROOM=$(curl -s -X POST $API/workspaces/$MIOLO/conversations -H "$MARINA" -H "$JSON" -d '{"kind":"squad_room"}' | field id)
MSG=$(curl -s -X POST $API/conversations/$ROOM/messages -H "$MARINA" -H "$JSON" \
  -d '{"body":"Quero uma campanha de Natal para vender mais panetones."}' | field id)
WORK=$(curl -s -X POST $API/messages/$MSG/work-items -H "$MARINA" -H "$JSON" \
  -d '{"delivery_type":"01.02","title":"Campanha de Natal"}' | field id)
echo "1. Marina pede a campanha na Sala do Squad (trabalho 01.02 do Nexo)"
worker
etapas $WORK
echo "  cartão do Nexo na conversa:"
curl -s "$API/conversations/$ROOM/messages?limit=20" -H "$MARINA" | python3 -c 'import json, sys
for m in json.load(sys.stdin)["items"]:
    c = m.get("card") or {}
    if c.get("type") == "team":
        print("   ", m["body"])
        for p in c["members"]: print("    -", p["agent_id"], "·", p["responsibility"])'
echo "  runs até aqui (um especialista por vez):"
sql "select '    ' || coalesce(s.seq::text, '-') || ' ' || r.agent_id || ' ' || r.status from public.runs r left join public.work_item_steps s on s.id = r.step_id where r.work_item_id = '$WORK' order by r.created_at"

echo "2. Marina aprova a estratégia da Bia"
echo "  decisão: $(decidir $(pendente $WORK))"
worker
etapas $WORK
echo "  handoff no contexto de cada etapa seguinte (run_context_items kind = step):"
sql "select '    run da ' || r.agent_id || ' recebeu ' || i.kind || ' · ' || i.reason || ' · etapa ' || s.seq || ' (' || s.agent_id || ') · versão ' || v.version_no from public.run_context_items i join public.runs r on r.id = i.run_id join public.work_item_steps s on s.id = i.step_id join public.delivery_versions v on v.id = i.delivery_version_id where i.kind = 'step' and r.work_item_id = '$WORK' order by r.created_at"
echo "  mensagem da Kaia:"
sql "select '    ' || body from public.messages where conversation_id = '$ROOM' and author_agent_id = 'kaia'"

echo "3. Marina aprova os textos do Otto"
echo "  decisão: $(decidir $(pendente $WORK))"
etapas $WORK
PROJECT=$(curl -s $API/work-items/$WORK -H "$MARINA" | field project_id)
curl -s $API/projects/$PROJECT -H "$MARINA" | python3 -c 'import json, sys
p = json.load(sys.stdin)
print("  projeto: %s | %s | dono: %s" % (p["name"], p["status"], p["owner"]["responsibility"]))
for m in p["milestones"]: print("    marco: %s · %s · %s" % (m["title"], m["agent_id"], "concluído" if m["done"] else "aberto"))'
echo "  créditos por etapa (reserva da delivery de cada uma):"
sql "select '    ' || coalesce(s.agent_id::text, r.agent_id::text) || ' ' || coalesce(s.delivery_type, '01.02') || ' ' || h.state || ' ' || coalesce(h.captured::text, '0') from public.credit_holds h join public.runs r on r.id = h.run_id left join public.work_item_steps s on s.id = r.step_id where r.work_item_id = '$WORK' order by r.created_at"
echo "  histórico:"
curl -s $API/work-items/$WORK -H "$MARINA" | python3 -c 'import json, sys
for h in json.load(sys.stdin)["history"]: print("    -", h["text"])'

echo "4. Isolamento: o Rafael (Vitta) pede o trabalho e o projeto da Miolo"
curl -s -o /dev/null -w "  trabalho: %{http_code}\n" $API/work-items/$WORK -H "$RAFAEL"
curl -s -o /dev/null -w "  projeto: %{http_code}\n" $API/projects/$PROJECT -H "$RAFAEL"

make -s seed >/dev/null && echo "seed reaplicado"
