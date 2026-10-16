"""H1 alvos 3, 4 e 5: isolamento das tabelas novas (Data API e API), owner-only (aprovações e memória) com
editor, admin e viewer, e memória que respeita confirmação (run_context_items).

Rafael (owner da Vitta) ataca objetos da Miolo; Carla entra na Miolo como editor, admin e viewer (membership
inserida pelo postgres só para o teste; o seed do fim remove). Começa e termina reaplicando o seed.
Uso: flock -o -w 1800 /tmp/hellosquad-db.lock bash -c 'cd apps/backend && uv run python ../../docs/parciais/h1/03_isolamento_papeis_memoria.py'
"""

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

import httpx

spec = importlib.util.spec_from_file_location("h1", Path(__file__).with_name("02_idempotencia_creditos_worker.py"))
# Reaproveita Ctx, drain e report do 02 sem rodar o main dele.
src = Path(__file__).with_name("02_idempotencia_creditos_worker.py").read_text()
src = src[: src.index("async def grant(")]
mod: dict = {"__name__": "h1lib"}
exec(compile(src, "h1lib", "exec"), mod)  # noqa: S102
Ctx, drain, report, RESULTS, SUPA, PK = (mod[k] for k in ("Ctx", "drain", "report", "RESULTS", "SUPA", "PK"))

TABLES = ("agent_prompt_versions approvals brand_facts brand_profiles conversation_participants conversation_reads "
          "conversations credit_accounts credit_grants credit_holds credit_ledger deliveries delivery_files "
          "delivery_prices delivery_versions fact_sources memory_conflicts memory_suggestions messages plan_versions "
          "plans project_milestones project_participants projects run_context_items run_events run_steps runs "
          "work_item_history work_item_steps work_items").split()


async def rest(x, email, method, path, body=None):
    headers = {"apikey": PK, "Content-Type": "application/json", "Prefer": "return=representation"}
    if email:
        headers["Authorization"] = f"Bearer {await x.token(email)}"
    r = await x.http.request(method, f"{SUPA}/rest/v1/{path}", headers=headers, json=body)
    return r.status_code, r.text


async def a3_data_api(x) -> None:
    mi, vi = await x.ws("miolo"), await x.ws("vitta")
    leaks, ctrl, denied, open_ = [], {}, [], []
    for t in TABLES:
        has_ws = await x.v("select count(*) from information_schema.columns where table_schema = 'public' and table_name = %s and column_name = 'workspace_id'", t)
        for who in ("rafael@vitta.example", "pedro@semconta.example", "marina@miolo.example", None):
            c, body = await rest(x, who, "GET", f"{t}?select=*&limit=2000")
            if c != 200:
                if who == "marina@miolo.example":
                    denied.append(f"{t}:{c}")
                continue
            rows = json.loads(body)
            if who == "marina@miolo.example":
                ctrl[t] = len(rows)
            elif has_ws and any(r.get("workspace_id") == mi for r in rows):
                leaks.append(f"{who or 'anon'} lê {t} da Miolo")
            elif who is None and rows:
                open_.append(f"anon lê {t} ({len(rows)})")
        if has_ws:
            c, body = await rest(x, "rafael@vitta.example", "POST", t, {"workspace_id": mi})
            if c in (200, 201):
                leaks.append(f"Rafael INSERE em {t} da Miolo")
            c, body = await rest(x, "rafael@vitta.example", "PATCH", f"{t}?workspace_id=eq.{mi}", {"workspace_id": vi})
            if c in (200, 204) and body not in ("", "[]"):
                leaks.append(f"Rafael ALTERA {t} da Miolo: {body[:80]}")
            c, body = await rest(x, "rafael@vitta.example", "DELETE", f"{t}?workspace_id=eq.{mi}")
            if c in (200, 204) and body not in ("", "[]"):
                leaks.append(f"Rafael APAGA {t} da Miolo")
    c, body = await rest(x, "rafael@vitta.example", "GET", f"messages?select=*,conversations(*)&conversation_id=not.is.null")
    emb = c == 200 and mi in body
    report("A3 Data API: 31 tabelas novas x Rafael/Pedro/anon (ler, inserir, alterar, apagar)", not leaks and not emb and not open_,
           f"vazamentos={leaks or 0}; embed={emb}; anon com linhas={open_ or 0}; Marina (controle) vê linhas em {sum(1 for v in ctrl.values() if v)} tabelas; Marina recusada em {denied or 'nenhuma'}")


async def a3_api_routes(x) -> None:
    mi = await x.ws("miolo")
    ids = {}
    for k, sql in {
        "conv": "select id from conversations where workspace_id = %s limit 1",
        "msg": "select id from messages where workspace_id = %s limit 1",
        "work": "select id from work_items where workspace_id = %s limit 1",
        "proj": "select id from projects where workspace_id = %s limit 1",
        "mile": "select id from project_milestones where workspace_id = %s limit 1",
        "appr": "select id from approvals where workspace_id = %s limit 1",
        "run": "select id from runs where workspace_id = %s limit 1",
        "sugg": "select id from memory_suggestions where workspace_id = %s limit 1",
        "fact": "select id from brand_facts where workspace_id = %s limit 1",
        "confl": "select id from memory_conflicts where workspace_id = %s limit 1",
    }.items():
        ids[k] = str(await x.v(sql, mi) or "00000000-0000-0000-0000-000000000000")
    calls = [
        ("GET", f"/workspaces/{mi}", None), ("GET", f"/workspaces/{mi}/conversations", None),
        ("POST", f"/workspaces/{mi}/conversations", {"kind": "agent_direct", "primary_agent_id": "otto"}),
        ("GET", f"/workspaces/{mi}/conversations/unread", None), ("POST", f"/conversations/{ids['conv']}/read", {}),
        ("GET", f"/conversations/{ids['conv']}", None), ("GET", f"/conversations/{ids['conv']}/messages", None),
        ("POST", f"/conversations/{ids['conv']}/messages", {"body": "oi"}), ("POST", f"/messages/{ids['msg']}/reply", {}),
        ("GET", f"/workspaces/{mi}/projects", None), ("POST", f"/workspaces/{mi}/projects", {"name": "X"}),
        ("POST", f"/messages/{ids['msg']}/work-items", {"delivery_type": "04.01", "title": "X"}),
        ("GET", f"/workspaces/{mi}/work-items", None), ("GET", f"/work-items/{ids['work']}", None),
        ("GET", f"/projects/{ids['proj']}", None), ("PATCH", f"/projects/{ids['proj']}", {"name": "X"}),
        ("PUT", f"/projects/{ids['proj']}/participants", {"participants": []}),
        ("POST", f"/projects/{ids['proj']}/milestones", {"title": "X"}), ("PATCH", f"/milestones/{ids['mile']}", {"title": "X"}),
        ("GET", f"/workspaces/{mi}/milestones", None), ("GET", f"/workspaces/{mi}/needs", None),
        ("GET", f"/workspaces/{mi}/squad/status", None), ("GET", f"/workspaces/{mi}/approvals", None),
        ("POST", f"/approvals/{ids['appr']}/decision", {"decision": "approved"}), ("POST", f"/approvals/{ids['appr']}/defer", {}),
        ("POST", f"/approvals/{ids['appr']}/resume", {}), ("GET", f"/runs/{ids['run']}", None), ("GET", f"/runs/{ids['run']}/events", None),
        ("GET", f"/workspaces/{mi}/memory", None), ("GET", f"/workspaces/{mi}/memory/suggestions", None),
        ("POST", f"/memory/suggestions/{ids['sugg']}/decision", {"decision": "discard"}),
        ("POST", f"/memory/facts/{ids['fact']}/correct", {"content": "X"}), ("GET", f"/memory/facts/{ids['fact']}/history", None),
        ("GET", f"/workspaces/{mi}/memory/search?q=pao", None), ("GET", f"/workspaces/{mi}/memory/sources", None),
        ("GET", f"/workspaces/{mi}/memory/conflicts", None), ("POST", f"/memory/conflicts/{ids['confl']}/resolve", {"keep": "a"}),
        ("POST", f"/memory/facts/{ids['fact']}/state", {"action": "stop_using"}),
        ("POST", f"/workspaces/{mi}/memory/facts", {"content": "X", "area": "brand"}),
        ("POST", f"/memory/suggestions/{ids['sugg']}/seen", {}), ("PUT", f"/workspaces/{mi}/memory/profile", {"description": "X"}),
        ("POST", "/credits/estimate", {"workspace_id": mi, "delivery_type": "04.01"}),
    ]
    bad = []
    codes = {}
    for m, p, b in calls:
        c, body = await x.api(m, p, "rafael@vitta.example", b)
        codes[c] = codes.get(c, 0) + 1
        text = json.dumps(body, ensure_ascii=False)
        if c == 422:
            bad422 = f"{m} {p}: {text[:120]}"
            print("422:", bad422)
        if c < 400 or any(v in text for v in ids.values() if not v.startswith("0000")) or "Miolo" in text:
            bad.append(f"{m} {p.split('/')[1]}…: {c} {text[:100]}")
    report(f"A3 API: {len(calls)} rotas com ids da Miolo usadas pelo Rafael", not bad, f"códigos={codes}; vazamentos/aceites={bad or 0}")


async def a4_roles(x) -> None:
    mi = await x.ws("miolo")
    carla = await x.v("select id::text from auth.users where email = 'carla@vitta.example'")
    w = await x.request_work("marina@miolo.example", "miolo")
    await drain()
    ap = await x.pending(w["work"])
    sugg = await x.v("select id::text from memory_suggestions where workspace_id = %s and state = 'open' limit 1", mi)
    fact = await x.v("select id::text from brand_facts where workspace_id = %s and state = 'confirmed' limit 1", mi)
    out = {}
    await x.q("insert into memberships (workspace_id, user_id, role) values (%s, %s, 'editor')", mi, carla)
    for role in ("editor", "admin", "viewer"):
        await x.q("update memberships set role = %s where workspace_id = %s and user_id = %s", role, mi, carla)
        r = {}
        r["decidir"] = (await x.api("POST", f"/approvals/{ap}/decision", "carla@vitta.example", {"decision": "approved"}))[0]
        r["sugestão"] = (await x.api("POST", f"/memory/suggestions/{sugg}/decision", "carla@vitta.example", {"decision": "confirm"}))[0]
        r["corrigir"] = (await x.api("POST", f"/memory/facts/{fact}/correct", "carla@vitta.example", {"content": "Tom de voz: teste H1."}))[0]
        r["não usar"] = (await x.api("POST", f"/memory/facts/{fact}/state", "carla@vitta.example", {"action": "stop_using"}))[0]
        r["perfil"] = (await x.api("PUT", f"/workspaces/{mi}/memory/profile", "carla@vitta.example", {"description": "teste"}))[0]
        r["ler memória"] = (await x.api("GET", f"/workspaces/{mi}/memory", "carla@vitta.example"))[0]
        c, conv = await x.api("POST", f"/workspaces/{mi}/conversations", "carla@vitta.example", {"kind": "agent_direct", "primary_agent_id": "otto"})
        r["abrir conversa"] = c
        cid = conv.get("id") if isinstance(conv, dict) else None
        cid = cid or w["conv"]
        r["enviar"] = (await x.api("POST", f"/conversations/{cid}/messages", "carla@vitta.example", {"body": "Pedido da Carla."}))[0]
        out[role] = r
    st = (await x.q("select status::text, decision::text from approvals where id = %s", ap))[0]
    fs = (await x.q("select state::text from brand_facts where id = %s", fact))[0]
    ss = (await x.q("select state::text from memory_suggestions where id = %s", sugg))[0]
    ok = all(out[r][k] in (403,) for r in out for k in ("decidir", "sugestão", "corrigir", "não usar", "perfil")) \
        and st["status"] == "pending" and out["viewer"]["enviar"] == 403 and out["viewer"]["ler memória"] == 200
    report("A4 owner-only: Carla como editor, admin e viewer na Miolo", ok, f"{out}; aprovação={st}; fato={fs}; sugestão={ss}")


async def a5_memory(x) -> None:
    mi = await x.ws("miolo")
    sugg = (await x.q("select id::text, content from memory_suggestions where workspace_id = %s and state = 'open' limit 1", mi))[0]
    c1, _ = await x.api("POST", f"/memory/suggestions/{sugg['id']}/decision", "marina@miolo.example", {"decision": "discard"})
    fact = (await x.q("select id::text, content from brand_facts where workspace_id = %s and state = 'confirmed' and topic = %s and key = %s limit 1", mi, "Tom de voz", "Tom de voz"))[0]
    c2, nf = await x.api("POST", f"/memory/facts/{fact['id']}/correct", "marina@miolo.example", {"content": "Acolhedor, direto e bem-humorado, sem gíria"})
    new_id = (nf.get("id") if isinstance(nf, dict) else None) or await x.v("select id::text from brand_facts where supersedes_id = %s", fact["id"])
    hyp = await x.v("insert into brand_facts (workspace_id, area, content, status, origin) select workspace_id, area, 'H1 hipótese: pão de centeio vende mais no sábado', 'hypothesis', origin from brand_facts where id = %s returning id::text", fact["id"]) if False else None
    w = await x.request_work("marina@miolo.example", "miolo", "Otto, legenda para o Instagram sobre o tom de voz da Miolo e os bastidores do forno no sábado.")
    seen: list[str] = []
    SimulatedLLM = mod["SimulatedLLM"]

    class RecordingLLM(SimulatedLLM):
        async def complete(self, *args, **kwargs):  # type: ignore[override]
            seen.append(repr(args) + repr(kwargs))
            return await super().complete(*args, **kwargs)

    o = await drain(RecordingLLM())
    prompt = "\n".join(seen)
    items = await x.q("select c.kind::text, c.fact_id::text, c.suggestion_id::text, f.state::text st, f.content from run_context_items c left join brand_facts f on f.id = c.fact_id where c.run_id = %s", w["run"])
    uses_old = any(i["fact_id"] == fact["id"] for i in items)
    uses_new = any(i["fact_id"] == new_id for i in items)
    uses_sugg = any((i["suggestion_id"] == sugg["id"]) or (i["content"] and sugg["content"][:30].lower() in (i["content"] or "").lower()) for i in items)
    not_conf = [i["st"] for i in items if i["st"] not in ("confirmed", "decision")]
    prompt_has = sugg["content"][:25].lower() in prompt.lower()
    old_in_prompt = "Acolhedor, direto, sem gíria" in prompt
    new_in_prompt = "bem-humorado" in prompt
    ok = c1 == 200 and c2 in (200, 201) and not uses_old and uses_new and not uses_sugg and not not_conf and not prompt_has and not old_in_prompt and new_in_prompt
    back = await x.q("select state::text, left(content, 60) c, run_id is not null from_run from memory_suggestions where workspace_id = %s and created_at > now() - interval '5 minutes' and id <> %s", mi, sugg["id"])
    report("A5b sugestão descartada não volta (o run desta entrega sugere de novo?)", not any("bastidores" in r["c"].lower() and r["state"] == "open" for r in back),
           f"sugestões novas do run={back or 0}")
    report("A5 memória: sugestão descartada fora do contexto; correção vira versão nova no próximo run", ok,
           f"descartar={c1}; corrigir={c2} nova={new_id}; run={o}; itens={len(items)} (estados {sorted({i['st'] for i in items})}); usa antiga={uses_old}; usa nova={uses_new}; usa sugestão={uses_sugg}; não confirmados={not_conf or 0}; sugestão no prompt={prompt_has}; tom antigo no prompt={old_in_prompt}; tom novo no prompt={new_in_prompt}; chamadas ao LLM={len(seen)}")


async def main() -> None:
    x = Ctx()
    await x.open()
    await x.seed()
    await x.q("select app.grant_credits((select id from workspaces where slug = 'miolo'), 100, 'bonus', 'h1-03')")
    for t in [f for f in (a3_data_api, a3_api_routes, a4_roles, a5_memory) if not sys.argv[1:] or f.__name__ in sys.argv[1:]]:
        try:
            await t(x)
        except Exception as e:  # noqa: BLE001
            report(t.__name__, False, f"exceção {e!r}"[:500])
    await x.seed()
    print(f"RESUMO: {sum(ok for _, ok, _ in RESULTS)} de {len(RESULTS)} OK", flush=True)


asyncio.run(main())
