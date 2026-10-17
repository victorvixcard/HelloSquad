"""Roteiro completo por provedor: OAuth → leitura → escrita → 429 → expiração → refresh → reset."""

from __future__ import annotations

from conftest import (
    GOOGLE_CLIENT,
    GRAPH,
    META_APP,
    MIOLO_IG,
    MIOLO_LOCATION,
    MIOLO_PAGE,
    MIOLO_PROPERTY,
    MIOLO_SITE,
    bearer,
    google_login,
    meta_login,
    query_of,
)


def test_meta_roteiro_completo(client):
    # OAuth: diálogo devolve code e state; code vira token curto; troca por token longo.
    short = meta_login(client)
    assert short["token_type"] == "bearer" and short["expires_in"] == 3600
    long = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": META_APP,
            "client_secret": "qualquer",
            "fb_exchange_token": short["access_token"],
        },
    ).json()
    assert long["expires_in"] == 5184000
    token = long["access_token"]

    # Leitura: páginas da conta, conta do Instagram, mídia com métricas, comentários, insights.
    pages = client.get(f"{GRAPH}/me/accounts", params={"access_token": token}).json()["data"]
    assert [p["name"] for p in pages] == ["Miolo"]
    page_token = pages[0]["access_token"]
    ig = client.get(
        f"{GRAPH}/{MIOLO_PAGE}",
        params={"fields": "instagram_business_account", "access_token": token},
    ).json()
    assert ig["instagram_business_account"]["id"] == MIOLO_IG
    profile = client.get(
        f"{GRAPH}/{MIOLO_IG}",
        params={"fields": "username,followers_count,media_count", "access_token": token},
    ).json()
    assert profile["username"] == "miolo.padaria" and profile["media_count"] == 6
    media = client.get(
        f"{GRAPH}/{MIOLO_IG}/media",
        params={"fields": "caption,like_count,comments_count,timestamp", "access_token": token},
    ).json()
    first = media["data"][0]
    assert "artesanal" not in " ".join(m["caption"].lower() for m in media["data"])
    insights = client.get(
        f"{GRAPH}/{first['id']}/insights",
        params={"metric": "reach,saved,likes", "access_token": token},
    ).json()
    assert {d["name"] for d in insights["data"]} == {"reach", "saved", "likes"}
    comments = client.get(f"{GRAPH}/{first['id']}/comments", params={"access_token": token})
    assert comments.status_code == 200 and len(comments.json()["data"]) == first["comments_count"]

    # Escrita: contêiner → media_publish; feed da Página com o token de Página.
    container = client.post(
        f"{GRAPH}/{MIOLO_IG}/media",
        data={
            "image_url": "https://cdn.example/fornada.jpg",
            "caption": "Fornada de sábado",
            "access_token": token,
        },
    ).json()["id"]
    published = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish", data={"creation_id": container, "access_token": token}
    )
    assert published.status_code == 200
    post = client.post(
        f"{GRAPH}/{MIOLO_PAGE}/feed",
        data={"message": "Fornada de sábado", "access_token": page_token},
    )
    assert post.json()["id"].startswith(f"{MIOLO_PAGE}_")

    # 429 com Retry-After e corpo da Meta (código 4).
    limited = client.get(
        f"{GRAPH}/me", params={"access_token": token}, headers={"X-Mock-Fail": "429"}
    )
    assert limited.status_code == 429 and limited.headers["retry-after"] == "30"
    assert limited.json()["error"]["code"] == 4

    # Expiração forçada por workspace: usuário e Página caem com o erro 190/463 da Meta.
    assert (
        client.post("/_mock/expire", json={"provider": "meta", "workspace": "miolo"}).json()[
            "expired"
        ]
        >= 2
    )
    expired = client.get(f"{GRAPH}/me", params={"access_token": token})
    assert expired.status_code == 400
    assert (
        expired.json()["error"]["code"] == 190 and expired.json()["error"]["error_subcode"] == 463
    )
    assert "invalid_token" in expired.headers["www-authenticate"]
    page_expired = client.post(
        f"{GRAPH}/{MIOLO_PAGE}/feed", data={"message": "x", "access_token": page_token}
    )
    assert page_expired.json()["error"]["code"] == 190

    # "Refresh" da Meta: não há refresh token; token vencido não se troca, só reconectando.
    refused = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": META_APP,
            "client_secret": "x",
            "fb_exchange_token": token,
        },
    )
    assert refused.json()["error"]["error_subcode"] == 463
    again = meta_login(client)["access_token"]
    assert client.get(f"{GRAPH}/me", params={"access_token": again}).status_code == 200

    # Reset: estado, chamadas e tokens voltam ao início.
    assert (
        client.get("/_mock/calls", params={"path_contains": "media_publish"}).json()["count"] == 1
    )
    client.post("/_mock/reset")
    assert client.get("/_mock/calls").json()["count"] == 0
    assert client.get(f"{GRAPH}/me", params={"access_token": again}).json()["error"]["code"] == 190


def test_google_roteiro_completo(client):
    token = google_login(client, prompt="consent")
    assert token["token_type"] == "Bearer" and token["expires_in"] == 3599
    assert token["refresh_token"].startswith("1//")
    access, refresh = token["access_token"], token["refresh_token"]

    report = client.post(
        f"/google/analyticsdata/v1beta/properties/{MIOLO_PROPERTY}:runReport",
        headers=bearer(access),
        json={
            "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}],
            "dimensions": [{"name": "date"}],
            "metrics": [{"name": "sessions"}],
        },
    ).json()
    assert report["rowCount"] == 7 and report["metadata"]["timeZone"] == "America/Sao_Paulo"
    gsc = client.post(
        f"/google/searchconsole/webmasters/v3/sites/{MIOLO_SITE}/searchAnalytics/query",
        headers=bearer(access),
        json={"startDate": "2026-01-01", "endDate": "2026-12-31", "dimensions": ["query"]},
    ).json()
    assert gsc["rows"][0]["clicks"] >= gsc["rows"][-1]["clicks"]
    reviews = client.get(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(access)
    ).json()
    assert reviews["totalReviewCount"] == 12

    review_id = reviews["reviews"][0]["reviewId"]
    reply = client.put(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews/{review_id}/reply",
        headers=bearer(access),
        json={"comment": "Obrigada pela visita!"},
    )
    assert reply.status_code == 200 and reply.json()["comment"] == "Obrigada pela visita!"
    created = client.post(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/localPosts",
        headers=bearer(access),
        json={"languageCode": "pt-BR", "summary": "Fornada às 8h.", "topicType": "STANDARD"},
    )
    assert created.json()["state"] == "LIVE"

    limited = client.get(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews",
        headers={**bearer(access), "X-Mock-Fail": "429"},
    )
    assert limited.status_code == 429 and limited.json()["error"]["status"] == "RESOURCE_EXHAUSTED"
    assert limited.headers["retry-after"]

    client.post("/_mock/expire", json={"provider": "google", "workspace": "miolo"})
    expired = client.get(f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(access))
    assert expired.status_code == 401
    assert expired.json()["error"]["details"][0]["reason"] == "ACCESS_TOKEN_EXPIRED"

    renewed = client.post(
        "/google/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh,
            "client_id": GOOGLE_CLIENT,
            "client_secret": "qualquer",
        },
    ).json()
    assert "refresh_token" not in renewed
    ok = client.get(
        f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(renewed["access_token"])
    )
    assert ok.status_code == 200

    # Grant expirado ("Google Perfil expirou"): o refresh falha com invalid_grant → reconectar.
    client.post("/_mock/expire", json={"provider": "google", "workspace": "miolo", "kind": "grant"})
    dead = client.post(
        "/google/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh,
            "client_id": GOOGLE_CLIENT,
            "client_secret": "qualquer",
        },
    )
    assert dead.status_code == 400 and dead.json()["error"] == "invalid_grant"

    client.post("/_mock/reset")
    assert client.get("/_mock/calls").json()["count"] == 0
    after = client.get(f"/google/mybusiness/v4/{MIOLO_LOCATION}/reviews", headers=bearer(access))
    assert after.status_code == 401


def test_authorize_redireciona_com_code_e_state(client):
    response = client.get(
        "/google/accounts/o/oauth2/v2/auth",
        follow_redirects=False,
        params={
            "client_id": GOOGLE_CLIENT,
            "redirect_uri": "http://127.0.0.1:3100/cb",
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/business.manage",
            "state": "abc",
        },
    )
    query = query_of(response.headers["location"])
    assert response.headers["location"].startswith("http://127.0.0.1:3100/cb?")
    assert query["state"] == "abc" and query["code"].startswith("4/")
    assert query["scope"] == "https://www.googleapis.com/auth/business.manage"
