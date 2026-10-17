"""Falhas injetáveis (cabeçalho e fila), timeout, janela de rate limit e gravação das chamadas."""

from __future__ import annotations

import time

from conftest import GRAPH, MIOLO_LOCATION, bearer, google_login, meta_login

REVIEWS = f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews"


def test_cabecalho_500_503_e_expired(client):
    token = google_login(client)["access_token"]
    for mode, status, text in (("500", 500, "INTERNAL"), ("503", 503, "UNAVAILABLE")):
        response = client.get(REVIEWS, headers={**bearer(token), "X-Mock-Fail": mode})
        assert response.status_code == status and response.json()["error"]["status"] == text
    expired = client.get(REVIEWS, headers={**bearer(token), "X-Mock-Fail": "expired"})
    assert expired.status_code == 401
    assert client.get(REVIEWS, headers=bearer(token)).status_code == 200  # só aquela chamada
    meta = meta_login(client)["access_token"]
    failed = client.get(
        f"{GRAPH}/me", params={"access_token": meta}, headers={"X-Mock-Fail": "500"}
    )
    assert failed.status_code == 500 and failed.json()["error"]["is_transient"] is True


def test_timeout_simulado_espera_e_responde_504(client):
    token = google_login(client)["access_token"]
    started = time.perf_counter()
    response = client.get(
        REVIEWS,
        headers={**bearer(token), "X-Mock-Fail": "timeout", "X-Mock-Timeout-Seconds": "0.3"},
    )
    assert time.perf_counter() - started >= 0.3
    assert response.status_code == 504 and response.json()["error"]["status"] == "DEADLINE_EXCEEDED"


def test_fila_de_falhas_por_caminho_e_contagem(client):
    token = google_login(client)["access_token"]
    queued = client.post(
        "/_mock/fail",
        json={"provider": "google", "mode": "503", "path_contains": "/reviews", "count": 2},
    )
    assert queued.json()["pending"] == 1
    statuses = [client.get(REVIEWS, headers=bearer(token)).status_code for _ in range(3)]
    assert statuses == [503, 503, 200]
    client.post("/_mock/fail", json={"mode": "expired", "path_contains": "/oauth2/token"})
    refresh = client.post(
        "/google/oauth2/token",
        data={"grant_type": "refresh_token", "refresh_token": "1//x", "client_id": "y"},
    )
    assert refresh.json() == {
        "error": "invalid_grant",
        "error_description": "Token has been expired or revoked.",
    }
    assert client.post("/_mock/fail", json={"mode": "rede"}).status_code == 400


def test_janela_de_rate_limit_com_retry_after_e_recuperacao(client):
    token = google_login(client)["access_token"]
    client.post(
        "/_mock/config", json={"rate_limit": {"google": {"limit": 2, "window_seconds": 60}}}
    )
    assert [client.get(REVIEWS, headers=bearer(token)).status_code for _ in range(2)] == [200, 200]
    limited = client.get(REVIEWS, headers=bearer(token))
    assert limited.status_code == 429 and 1 <= int(limited.headers["retry-after"]) <= 60
    assert limited.json()["error"]["details"][0]["reason"] == "RATE_LIMIT_EXCEEDED"
    # OAuth fica fora da janela (o login não é barrado pelo limite da API).
    assert google_login(client)["access_token"]
    client.post("/_mock/clock", json={"advance_seconds": 61})
    fresh = google_login(client)["access_token"]
    assert client.get(REVIEWS, headers=bearer(fresh)).status_code == 200

    meta = meta_login(client)["access_token"]
    client.post(
        "/_mock/config",
        json={
            "meta": {"rate_limit_status": 400},
            "rate_limit": {"meta": {"limit": 1, "window_seconds": 30}},
        },
    )
    client.get(f"{GRAPH}/me", params={"access_token": meta})
    real_like = client.get(f"{GRAPH}/me", params={"access_token": meta})
    assert real_like.status_code == 400 and real_like.json()["error"]["code"] == 4
    assert "call_count" in real_like.headers["x-app-usage"]


def test_gravacao_das_chamadas_com_filtros_e_segredo_mascarado(client):
    token = google_login(client)["access_token"]
    client.get(REVIEWS, headers=bearer(token))
    client.post(
        "/google/analyticsdata/v1beta/properties/400000001:runReport",
        headers=bearer(token),
        json={"metrics": [{"name": "sessions"}]},
    )
    calls = client.get("/_mock/calls", params={"service": "gbp"}).json()
    assert calls["count"] == 1
    call = calls["calls"][0]
    assert call["workspace"] == "miolo" and call["status"] == 200 and call["method"] == "GET"
    token_call = client.get("/_mock/calls", params={"path_contains": "/oauth2/token"}).json()
    assert token_call["calls"][0]["body"]["client_secret"] == "***"
    report = client.get("/_mock/calls", params={"service": "ga4"}).json()["calls"][0]
    assert report["body"] == {"metrics": [{"name": "sessions"}]}
    last = report["seq"]
    assert client.get("/_mock/calls", params={"since_seq": last}).json()["count"] == 0
    client.delete("/_mock/calls")
    assert client.get("/_mock/calls").json()["count"] == 0


def test_health_por_provedor(client):
    health = client.get("/_mock/health").json()
    assert set(health["providers"]) == {"meta", "google_oauth", "ga4", "search_console", "gbp"}
    for provider in health["providers"]:
        assert client.get(f"/_mock/health/{provider}").json()["status"] == "ok"
    assert client.get("/_mock/health/whatsapp").status_code == 404
