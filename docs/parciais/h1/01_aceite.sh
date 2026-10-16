#!/usr/bin/env bash
# H1 alvo 1 — aceite §16 pelo browser com o worker simulado, sob a trava do banco. Mede o crédito no banco
# antes e depois e confere: um run cobrado, uma captura no extrato, uma decisão, um evento de auditoria.
# Uso: flock -w 1800 /tmp/hellosquad-db.lock bash docs/parciais/h1/01_aceite.sh
set -uo pipefail
source /home/vitao/projetos/hellosquad/docs/parciais/h1/lib.sh
OUT="$H1_ROOT/docs/parciais/h1/aceite"; mkdir -p "$OUT"

echo "== antes"
B0=$(h1_psql -c "select app.credit_balance('$MIOLO')")
L0=$(h1_psql -c "select count(*) from credit_ledger where workspace_id='$MIOLO'")
echo "saldo Miolo=$B0 lançamentos=$L0"

h1_worker_start /tmp/h1_worker_aceite.log || exit 1
(cd "$H1_ROOT/apps/web" && H1_OUT="$OUT" node "$H1_ROOT/docs/parciais/h1/01_aceite_browser.mjs") >/tmp/h1_aceite_browser.log 2>&1
RC=$?
sleep 2
h1_worker_stop
echo "browser exit=$RC"; tail -n 14 /tmp/h1_aceite_browser.log

WI=$(python3 -c "import json;print(json.load(open('$OUT/resultado.json')).get('workItemId') or '')")
echo "== depois (trabalho $WI)"
B1=$(h1_psql -c "select app.credit_balance('$MIOLO')")
echo "saldo Miolo=$B1 (diferença $(python3 -c "print(round($B0-$B1,2))"))"
[ -z "$WI" ] && exit 1
h1_psql -c "select 'trabalho', status, delivery_type, primary_agent_id from work_items where id='$WI'"
h1_psql -c "select 'run', id, status, attempts, credits_charged from runs where work_item_id='$WI' order by created_at"
h1_psql -c "select 'reserva', h.state, h.estimate, h.captured from credit_holds h join runs r on r.id=h.run_id where r.work_item_id='$WI'"
h1_psql -c "select 'extrato', l.entry_type, sum(l.amount), sum(l.reserved_delta), count(*) from credit_ledger l join runs r on r.id=l.run_id where r.work_item_id='$WI' group by 2 order by 2"
h1_psql -c "select 'versoes', count(*), string_agg(v.status::text, ',') from delivery_versions v join deliveries d on d.id=v.delivery_id where d.work_item_id='$WI'"
h1_psql -c "select 'aprovacao', a.kind, a.status, a.decision from approvals a where a.work_item_id='$WI'"
h1_psql -c "select 'auditoria approval.decided', count(*) from audit_events e join approvals a on a.id::text=e.entity_id where a.work_item_id='$WI' and e.action='approval.decided'"
h1_psql -c "select 'estimativa', e.credits, e.revision from runs r, app.run_credit_estimate(r.id) e where r.work_item_id='$WI' order by r.created_at limit 1"
h1_psql -c "select 'contexto do run', count(*) from run_context_items c join runs r on r.id=c.run_id where r.work_item_id='$WI'"
grep -c 'concluído' /tmp/h1_worker_aceite.log | sed 's/^/runs concluídos no log do worker: /'
grep -E 'concluído|tentativa' /tmp/h1_worker_aceite.log | sed -E 's/^.{0,24}//' | cut -c1-220 | tail -n 4
exit $RC
