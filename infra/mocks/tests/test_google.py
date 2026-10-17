"""Google: dados coerentes com o seed, OAuth fiel (refresh, PKCE, revogação, escopo) e GBP."""

from __future__ import annotations

import base64
import hashlib

from conftest import (
    GOOGLE_CLIENT,
    MIOLO_LOCATION,
    MIOLO_PROPERTY,
    MIOLO_SITE,
    REDIRECT,
    G,
    bearer,
    google_login,
    query_of,
)

from hellosquad_mocks import fixtures

REPORT = "/google/analyticsdata/v1beta/properties/{}:runReport"


def _report(client, token, prop=MIOLO_PROPERTY, **body):
    return client.post(REPORT.format(prop), headers=bearer(token), json=body)


def test_ga4_bate_com_o_metrics_daily_do_seed_e_tem_o_buraco(client):
    token = google_login(client)["access_token"]
    rows = _report(
        client,
        token,
        dateRanges=[{"startDate": "60daysAgo", "endDate": "yesterday"}],
        dimensions=[{"name": "date"}],
        metrics=[{"name": "sessions"}],
    ).json()["rows"]
    today = fixtures.today()
    by_day = {r["dimensionValues"][0]["value"]: int(r["metricValues"][0]["value"]) for r in rows}
    for days_ago in (1, 7, 30, 31, 59):
        day = (today - fixtures.timedelta(days=days_ago)).strftime("%Y%m%d")
        assert by_day[day] == fixtures.seed_value("miolo", "sessions", days_ago)
    gap = [(today - fixtures.timedelta(days=n)).strftime("%Y%m%d") for n in (43, 44, 45)]
    assert not set(gap) & set(by_day)  # o buraco de 3 dias do seed também falta no GA4
    assert len(rows) == 57


def test_seed_value_reproduz_o_sql():
    # Valores conferidos contra o banco local em 17/10/2026 (seed aplicado no mesmo dia).
    assert [fixtures.seed_value("miolo", "sessions", n) for n in range(1, 8)] == [
        118,
        120,
        124,
        103,
        126,
        117,
        137,
    ]


def test_ga4_quebra_por_canal_soma_o_total_e_trilha_vem_vazia(client):
    token = google_login(client)["access_token"]
    dates = [{"startDate": "28daysAgo", "endDate": "yesterday"}]
    total = _report(client, token, dateRanges=dates, metrics=[{"name": "sessions"}]).json()
    channels = _report(
        client,
        token,
        dateRanges=dates,
        metrics=[{"name": "sessions"}],
        dimensions=[{"name": "sessionDefaultChannelGroup"}],
    ).json()
    assert sum(int(r["metricValues"][0]["value"]) for r in channels["rows"]) == int(
        total["rows"][0]["metricValues"][0]["value"]
    )
    juliana = google_login(client, user="juliana")["access_token"]
    empty = _report(
        client, juliana, prop="400000003", dateRanges=dates, metrics=[{"name": "sessions"}]
    ).json()
    assert "rows" not in empty and "rowCount" not in empty
    bad = _report(client, token, dateRanges=dates, metrics=[{"name": "conversions"}])
    assert bad.status_code == 400 and "is not a valid metric" in bad.json()["error"]["message"]
    other = _report(client, juliana, dateRanges=dates, metrics=[{"name": "sessions"}])
    assert other.status_code == 403


def test_escopo_insuficiente_e_isolamento(client):
    token = google_login(client, scope=f"{G}analytics.readonly")["access_token"]
    response = client.get(f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(token))
    assert response.status_code == 403
    assert response.json()["error"]["details"][0]["reason"] == "ACCESS_TOKEN_SCOPE_INSUFFICIENT"
    rafael = google_login(client, user="rafael")["access_token"]
    gsc = client.post(
        f"/google/searchconsole/webmasters/v3/sites/{MIOLO_SITE}/searchAnalytics/query",
        headers=bearer(rafael),
        json={"startDate": "2026-01-01", "endDate": "2026-12-31"},
    )
    assert gsc.status_code == 403 and "sufficient permission" in gsc.json()["error"]["message"]


def test_search_console_atraso_e_ordem(client):
    token = google_login(client)["access_token"]
    today = fixtures.today()
    body = {
        "startDate": (today - fixtures.timedelta(days=10)).isoformat(),
        "endDate": today.isoformat(),
        "dimensions": ["date"],
    }
    url = f"/google/searchconsole/webmasters/v3/sites/{MIOLO_SITE}/searchAnalytics/query"
    final = client.post(url, headers=bearer(token), json=body).json()["rows"]
    assert final[-1]["keys"][0] == (today - fixtures.timedelta(days=3)).isoformat()
    fresh = client.post(url, headers=bearer(token), json={**body, "dataState": "all"}).json()
    assert fresh["rows"][-1]["keys"][0] == (today - fixtures.timedelta(days=1)).isoformat()
    juliana = google_login(client, user="juliana")["access_token"]
    empty = client.post(
        "/google/searchconsole/webmasters/v3/sites/sc-domain:trilha.example/searchAnalytics/query",
        headers=bearer(juliana),
        json=body,
    ).json()
    assert empty == {"responseAggregationType": "byProperty"}


def test_refresh_so_no_primeiro_consentimento_ou_com_prompt_consent(client):
    first = google_login(client)
    assert "refresh_token" in first
    again = google_login(client)
    assert "refresh_token" not in again  # reconectar sem prompt=consent não traz refresh novo
    forced = google_login(client, prompt="consent")
    assert "refresh_token" in forced
    online = google_login(client, offline=False, prompt="consent")
    assert "refresh_token" not in online


def test_pkce_s256(client):
    verifier = "v" * 64
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=")
    response = client.get(
        "/google/accounts/o/oauth2/v2/auth",
        follow_redirects=False,
        params={
            "client_id": GOOGLE_CLIENT,
            "redirect_uri": REDIRECT,
            "response_type": "code",
            "scope": f"{G}business.manage",
            "code_challenge": challenge.decode(),
            "code_challenge_method": "S256",
        },
    )
    code = query_of(response.headers["location"])["code"]
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT,
        "redirect_uri": REDIRECT,
        "grant_type": "authorization_code",
    }
    wrong = client.post("/google/oauth2/token", data={**data, "code_verifier": "errado"})
    assert wrong.json() == {"error": "invalid_grant", "error_description": "Invalid code verifier."}


def test_revogar_access_derruba_o_grant(client):
    token = google_login(client, prompt="consent")
    assert client.post("/google/oauth2/revoke", data={"token": token["access_token"]}).json() == {}
    refresh = client.post(
        "/google/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": token["refresh_token"],
            "client_id": GOOGLE_CLIENT,
        },
    )
    assert refresh.json()["error"] == "invalid_grant"
    info = client.get("/google/oauth2/tokeninfo", params={"access_token": token["access_token"]})
    assert info.status_code == 400


def test_gbp_respostas_posts_e_campos(client):
    token = google_login(client)["access_token"]
    reviews = client.get(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(token)
    ).json()
    pending = [r for r in reviews["reviews"] if "reviewReply" not in r]
    assert len(pending) == 3 and reviews["averageRating"] == 4.3  # 52 estrelas em 12
    url = f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews/{pending[0]['reviewId']}/reply"
    for _ in range(2):  # PUT é idempotente: responder de novo substitui a resposta
        assert (
            client.put(url, headers=bearer(token), json={"comment": "Obrigada!"}).status_code == 200
        )
    review = client.get(url.rsplit("/", 1)[0], headers=bearer(token)).json()
    assert review["reviewReply"]["comment"] == "Obrigada!"
    unknown = client.post(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/localPosts",
        headers=bearer(token),
        json={"summary": "x", "scheduleTime": "amanhã"},
    )
    assert unknown.status_code == 400 and "Unknown name" in unknown.json()["error"]["message"]
    locations = client.get(
        "/google/mybusinessbusinessinformation/v1/accounts/1000000000000000001/locations",
        headers=bearer(token),
        params={"readMask": "name,title"},
    ).json()
    assert locations["locations"] == [
        {"name": "locations/2000000000000000001", "title": "Miolo · Pinheiros"}
    ]
    no_mask = client.get(
        "/google/mybusinessbusinessinformation/v1/accounts/1000000000000000001/locations",
        headers=bearer(token),
    )
    assert no_mask.status_code == 400
