"""H-SA — devolve o banco ao seed depois do 03 com a mesma limpeza que o pytest da SA6a usa no `finally`
(test_admin_writes.py:447-459): versões de preço, plano e recarga criadas no bloco saem; a versão 2 das "Diretrizes do
dono" (com o parágrafo [PENDENTE]) sai como no test_squad_versions.py:81; runs e evento de webhook fictícios saem.
A auditoria do bloco fica (nada da auditoria é apagado). Sem isso, o `make test` quebra: test_admin_writes espera o
plano squad na versão 2 depois de gravar uma vez e o pgTAP 28 espera só parágrafos [DECIDIDO] nas diretrizes.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/03b_limpeza.py
"""
import sys

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import MIOLO, sql, sql1  # noqa: E402

T0 = "2026-10-17 03:29:00+00"  # início do 03 (00:29 de Brasília); só a H-SA escreveu no banco desde então
seed_price = sql1("select md5('seed:price:04.01')::uuid")
steps = [
    f"delete from public.delivery_prices where delivery_type = '04.01' and id <> '{seed_price}' and created_at >= '{T0}'",
    "update public.delivery_catalog set for_sale = false, homologation_status = 'in_homologation' where delivery_type = '04.01'",
    f"delete from public.plan_prices where created_at >= '{T0}'",
    f"delete from public.plan_versions where created_at >= '{T0}'",
    f"delete from public.topup_packs where created_at >= '{T0}'",
    "update public.plans set for_sale = false",
    "update public.topups set for_sale = false",
    f"delete from public.business_rule_doc_versions where created_at >= '{T0}'",
    f"delete from public.payment_reconciliations where payment_event_id in (select id from public.payment_events where event_id like 'evt-hsa-%')",
    "delete from public.payment_events where event_id like 'evt-hsa-%'",
]
for q in steps:
    try:
        sql(q)
        print("ok  ", q[:110])
    except RuntimeError as e:
        print("ERRO", q[:80], "->", str(e).splitlines()[0][:120])
runs = sql(f"select id, status from runs where workspace_id='{MIOLO}' and idempotency_key like 'hsa-%'")
for rid, st in runs:
    for qn in ("runs_interactive", "runs_scheduled"):
        sql(f"select pgmq.delete('{qn}', msg_id) from pgmq.q_{qn} where message->>'run_id' = '{rid}'")
    sql(f"delete from public.runs where id = '{rid}'")
print("runs fictícios removidos (com a mensagem da fila):", runs)
print("conferência: plano squad", sql("select v.version, v.credits from plan_versions v join plans p on p.id=v.plan_id where p.slug='squad' order by 1"),
      "| recarga", sql("select credits, amount from topup_packs order by created_at"),
      "| 04.01", sql("select credits, provisional, approved_commercially from delivery_prices where delivery_type='04.01'"),
      "| diretrizes", sql("select version, jsonb_array_length(paragraphs) from business_rule_doc_versions order by version"),
      "| squad_versions criadas desde T0", sql1(f"select count(*) from squad_versions where created_at >= '{T0}'"))
