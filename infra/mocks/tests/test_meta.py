"""Meta: escopos ler × agir, idempotência por creation_id, agendamento na Página e erros reais."""

from __future__ import annotations

from conftest import GRAPH, META_APP, MIOLO_IG, MIOLO_PAGE, REDIRECT, meta_login, query_of

from hellosquad_mocks.meta import stable_media_id
from hellosquad_mocks.state import STATE

READ_ONLY = "instagram_basic,pages_show_list,pages_read_engagement"


def _container(client, token: str, **data) -> str:
    data = {"image_url": "https://cdn.example/p.jpg", "caption": "Teste", **data}
    response = client.post(f"{GRAPH}/{MIOLO_IG}/media", data={**data, "access_token": token})
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_conectar_nao_autoriza_publicar(client):
    token = meta_login(client, scope=READ_ONLY)["access_token"]
    assert (
        client.get(f"{GRAPH}/{MIOLO_IG}/media", params={"access_token": token}).status_code == 200
    )
    denied = client.post(
        f"{GRAPH}/{MIOLO_IG}/media",
        data={"image_url": "https://cdn.example/p.jpg", "access_token": token},
    )
    assert denied.status_code == 403 and denied.json()["error"]["code"] == 10
    perms = client.get(f"{GRAPH}/me/permissions", params={"access_token": token}).json()["data"]
    assert {"permission": "instagram_content_publish", "status": "granted"} not in perms


def test_permissao_recusada_aparece_como_declined(client):
    token = meta_login(client, mock_decline="instagram_content_publish")["access_token"]
    perms = client.get(f"{GRAPH}/me/permissions", params={"access_token": token}).json()["data"]
    assert {"permission": "instagram_content_publish", "status": "declined"} in perms
    debug = client.get(
        f"{GRAPH}/debug_token", params={"input_token": token, "access_token": f"{META_APP}|x"}
    ).json()
    assert debug["data"]["is_valid"] and "instagram_content_publish" not in debug["data"]["scopes"]


def test_id_estavel_por_creation_id_e_sem_publicar_duas_vezes(client):
    token = meta_login(client)["access_token"]
    creation_id = _container(client, token)
    first = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish",
        data={"creation_id": creation_id, "access_token": token},
    )
    assert first.json()["id"] == stable_media_id(creation_id)
    again = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish",
        data={"creation_id": creation_id, "access_token": token},
    )
    assert again.status_code == 400 and again.json()["error"]["code"] == 9007
    status = client.get(
        f"{GRAPH}/{creation_id}", params={"fields": "status_code", "access_token": token}
    ).json()
    assert status["status_code"] == "PUBLISHED"
    media = client.get(f"{GRAPH}/{MIOLO_IG}/media", params={"access_token": token}).json()["data"]
    assert [m["id"] for m in media].count(first.json()["id"]) == 1
    # O id não depende de ordem nem de reset: o mesmo creation_id dá o mesmo id.
    STATE.reset()
    assert stable_media_id(creation_id) == first.json()["id"]


def test_conteiner_de_video_em_processamento_e_cota(client):
    token = meta_login(client)["access_token"]
    reel = _container(client, token, media_type="REELS", video_url="https://cdn.example/v.mp4")
    not_ready = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish", data={"creation_id": reel, "access_token": token}
    )
    assert not_ready.json()["error"]["error_subcode"] == 2207027
    status = client.get(f"{GRAPH}/{reel}", params={"fields": "status_code", "access_token": token})
    assert status.json()["status_code"] == "FINISHED"
    assert (
        client.post(
            f"{GRAPH}/{MIOLO_IG}/media_publish", data={"creation_id": reel, "access_token": token}
        ).status_code
        == 200
    )

    client.post("/_mock/config", json={"meta": {"ig_publish_quota": 1}})
    blocked = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish",
        data={"creation_id": _container(client, token), "access_token": token},
    )
    assert blocked.json()["error"]["error_subcode"] == 2207042
    limit = client.get(
        f"{GRAPH}/{MIOLO_IG}/content_publishing_limit", params={"access_token": token}
    ).json()["data"][0]
    assert limit == {"config": {"quota_total": 1, "quota_duration": 86400}, "quota_usage": 1}


def test_conteiner_expira_em_24_horas(client):
    token = meta_login(client)["access_token"]
    creation_id = _container(client, token)
    client.post("/_mock/clock", json={"advance_seconds": 25 * 3600})
    long = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": META_APP,
            "client_secret": "x",
            "fb_exchange_token": token,
        },
    )
    assert long.json()["error"]["error_subcode"] == 463  # o token curto (1 h) também venceu
    fresh = meta_login(client)["access_token"]
    expired = client.post(
        f"{GRAPH}/{MIOLO_IG}/media_publish",
        data={"creation_id": creation_id, "access_token": fresh},
    )
    assert expired.json()["error"]["error_subcode"] == 2207020


def test_feed_da_pagina_exige_token_de_pagina_e_agenda(client):
    token = meta_login(client)["access_token"]
    as_user = client.post(
        f"{GRAPH}/{MIOLO_PAGE}/feed", data={"message": "x", "access_token": token}
    )
    assert as_user.status_code == 403 and as_user.json()["error"]["code"] == 200
    page_token = client.get(f"{GRAPH}/me/accounts", params={"access_token": token}).json()["data"][
        0
    ]["access_token"]
    when = int(STATE.now()) + 3600
    scheduled = client.post(
        f"{GRAPH}/{MIOLO_PAGE}/feed",
        data={
            "message": "Panetone",
            "published": "false",
            "scheduled_publish_time": str(when),
            "access_token": page_token,
        },
    )
    assert scheduled.status_code == 200
    too_soon = client.post(
        f"{GRAPH}/{MIOLO_PAGE}/feed",
        data={
            "message": "x",
            "published": "false",
            "scheduled_publish_time": str(int(STATE.now()) + 60),
            "access_token": page_token,
        },
    )
    assert too_soon.json()["error"]["code"] == 100
    queue = client.get(
        f"{GRAPH}/{MIOLO_PAGE}/scheduled_posts", params={"access_token": page_token}
    ).json()["data"]
    assert [p["id"] for p in queue] == [scheduled.json()["id"]]
    client.post("/_mock/clock", json={"advance_seconds": 3700})
    page_token = client.get(
        f"{GRAPH}/me/accounts", params={"access_token": meta_login(client)["access_token"]}
    ).json()["data"][0]["access_token"]
    feed = client.get(f"{GRAPH}/{MIOLO_PAGE}/feed", params={"access_token": page_token}).json()
    assert scheduled.json()["id"] in [p["id"] for p in feed["data"]]


def test_isolamento_entre_contas(client):
    rafael = meta_login(client, user="rafael")["access_token"]
    other = client.get(f"{GRAPH}/{MIOLO_IG}", params={"access_token": rafael})
    assert other.status_code == 400 and other.json()["error"]["error_subcode"] == 33
    trilha = meta_login(client, user="juliana")["access_token"]
    pages = client.get(f"{GRAPH}/me/accounts", params={"access_token": trilha}).json()["data"]
    ig_id = client.get(
        f"{GRAPH}/{pages[0]['id']}",
        params={"fields": "instagram_business_account", "access_token": trilha},
    ).json()["instagram_business_account"]["id"]
    media = client.get(f"{GRAPH}/{ig_id}/media", params={"access_token": trilha}).json()
    assert media == {"data": []}  # primeiro acesso: estado vazio honesto


def test_oauth_erros_do_dialogo_e_do_code(client):
    blocked = client.get(
        "/meta/www/v26.0/dialog/oauth",
        params={
            "client_id": META_APP,
            "redirect_uri": "https://site-externo.example/cb",
            "scope": "email",
        },
    )
    assert blocked.status_code == 400 and blocked.json()["error"]["code"] == 191
    denied = client.get(
        "/meta/www/v26.0/dialog/oauth",
        follow_redirects=False,
        params={
            "client_id": META_APP,
            "redirect_uri": REDIRECT,
            "scope": "email",
            "state": "s",
            "mock_deny": "1",
        },
    )
    assert query_of(denied.headers["location"]) == {
        "error_reason": "user_denied",
        "error": "access_denied",
        "error_description": "Permissions error.",
        "state": "s",
    }
    ok = client.get(
        "/meta/www/v26.0/dialog/oauth",
        follow_redirects=False,
        params={"client_id": META_APP, "redirect_uri": REDIRECT, "scope": "email"},
    )
    code = query_of(ok.headers["location"])["code"]
    params = {"client_id": META_APP, "client_secret": "x", "redirect_uri": REDIRECT, "code": code}
    mismatch = client.get(
        f"{GRAPH}/oauth/access_token", params={**params, "redirect_uri": REDIRECT + "/outro"}
    )
    assert mismatch.json()["error"]["error_subcode"] == 36008
    assert client.get(f"{GRAPH}/oauth/access_token", params=params).status_code == 200
    reused = client.get(f"{GRAPH}/oauth/access_token", params=params)
    assert reused.json()["error"]["error_subcode"] == 36009


def test_segredo_estrito_e_revogacao(client):
    client.post("/_mock/config", json={"meta": {"app_secret": "segredo-local"}})
    ok = client.get(
        "/meta/www/v26.0/dialog/oauth",
        follow_redirects=False,
        params={"client_id": META_APP, "redirect_uri": REDIRECT, "scope": "instagram_basic"},
    )
    code = query_of(ok.headers["location"])["code"]
    wrong = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "client_id": META_APP,
            "client_secret": "errado",
            "redirect_uri": REDIRECT,
            "code": code,
        },
    )
    assert wrong.json()["error"] == {**wrong.json()["error"], "code": 1}
    token = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "client_id": META_APP,
            "client_secret": "segredo-local",
            "redirect_uri": REDIRECT,
            "code": code,
        },
    ).json()["access_token"]
    assert client.delete(f"{GRAPH}/me/permissions", params={"access_token": token}).json() == {
        "success": True
    }
    revoked = client.get(f"{GRAPH}/me", params={"access_token": token}).json()["error"]
    assert revoked["code"] == 190 and revoked["error_subcode"] == 458
