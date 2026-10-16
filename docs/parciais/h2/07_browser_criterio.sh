#!/usr/bin/env bash
# H2 alvo 1 (browser) — orquestra o 07_browser_criterio.mjs sob a trava: bônus local na Miolo, worker do produto em
# modo simulado (h2_worker_custom.py, sem atraso), browser, e a conferência no banco dos trabalhos criados pela tela.
# Uso: flock -o -w 900 /tmp/hellosquad-db.lock bash docs/parciais/h2/07_browser_criterio.sh
set -uo pipefail
ROOT=/home/vitao/projetos/hellosquad; MIOLO=6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2
q() { docker exec -i supabase_db_hellosquad psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt -F'|' -c "$1"; }
q "select 'bônus', remaining from app.grant_credits('$MIOLO', 200, 'bonus', 'h2:07:$(date +%s)', p_note => 'H2 QA')"
T0=$(q "select now()")
(cd "$ROOT/apps/backend" && setsid bash -c 'echo $$ >/tmp/h2_w7.pid; exec env LLM_PROVIDER=simulated uv run python '"$ROOT"'/docs/parciais/h2/h2_worker_custom.py' >/tmp/h2_w7.log 2>&1 3>&- &)
for _ in $(seq 1 120); do grep -q "worker no ar" /tmp/h2_w7.log 2>/dev/null && break; sleep 0.5; done
(cd "$ROOT/apps/web" && node "$ROOT/docs/parciais/h2/07_browser_criterio.mjs") >/tmp/h2_07_browser.log 2>&1; RC=$?
sleep 3; kill -TERM -- "-$(cat /tmp/h2_w7.pid)" 2>/dev/null; sleep 3
echo "browser exit=$RC"; tail -n 8 /tmp/h2_07_browser.log | cut -c1-400
echo "== trabalhos criados pela tela desde $T0"
q "select w.delivery_type, w.primary_agent_id, w.status, (select count(*) from deliveries d join delivery_versions v on v.delivery_id=d.id where d.work_item_id=w.id and v.status='approved'), (select string_agg(h.state||':'||coalesce(h.captured::text,'-'), ',') from credit_holds h join runs r on r.id=h.run_id where r.work_item_id=w.id), (select count(*) from audit_events e join approvals a on a.id::text=e.entity_id where a.work_item_id=w.id and e.action='approval.decided') from work_items w where w.workspace_id='$MIOLO' and w.created_at > '$T0' order by w.created_at"
echo "== mensagens da Sala depois do pedido"
q "select m.author_type, coalesce(m.author_agent_id::text,'-'), left(m.body, 120) from messages m join conversations c on c.id=m.conversation_id where c.workspace_id='$MIOLO' and c.kind='squad_room' and m.created_at > '$T0' order by m.created_at"
echo "concluídos no worker: $(grep -c 'concluído' /tmp/h2_w7.log)"
