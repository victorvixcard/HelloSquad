"""Fixtures dos testes dos mocks: app em processo (sem socket) e atalhos de OAuth.

A guarda de rede é instalada também neste processo: se qualquer teste ou o próprio mock tentar
falar com um host fora do loopback, a chamada falha antes de sair.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from hellosquad_mocks import netguard
from hellosquad_mocks.app import create_app
from hellosquad_mocks.state import STATE

netguard.install()

GRAPH = "/meta/graph/v26.0"
META_APP = "999000000000001"
GOOGLE_CLIENT = "000000000000-hellosquadlocal.apps.googleusercontent.com"
REDIRECT = "http://127.0.0.1:3100/oauth/callback"
META_ALL = (
    "instagram_basic,instagram_content_publish,instagram_manage_comments,"
    "instagram_manage_insights,pages_show_list,pages_read_engagement,pages_manage_posts"
)
G = "https://www.googleapis.com/auth/"
GOOGLE_ALL = f"{G}analytics.readonly {G}webmasters.readonly {G}business.manage"
MIOLO_IG = "17841400000000101"
MIOLO_PAGE = "100000000000101"
MIOLO_PROPERTY = "400000001"
MIOLO_SITE = "sc-domain:miolo.example"
MIOLO_LOCATION = "accounts/1000000000000000001/locations/2000000000000000001"


@pytest.fixture
def client():
    STATE.reset()
    with TestClient(create_app(), base_url="http://127.0.0.1:8300") as test_client:
        yield test_client
    STATE.reset()


def query_of(location: str) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(urlparse(location).query).items()}


def meta_login(client, *, scope: str = META_ALL, user: str = "marina", **extra) -> dict:
    """Diálogo → code → token curto. Devolve o JSON do token."""
    params = {
        "client_id": META_APP,
        "redirect_uri": REDIRECT,
        "state": "s1",
        "scope": scope,
        "mock_user": user,
        **extra,
    }
    response = client.get("/meta/www/v26.0/dialog/oauth", params=params, follow_redirects=False)
    assert response.status_code == 302, response.text
    code = query_of(response.headers["location"])["code"]
    token = client.get(
        f"{GRAPH}/oauth/access_token",
        params={
            "client_id": META_APP,
            "client_secret": "qualquer",
            "redirect_uri": REDIRECT,
            "code": code,
        },
    )
    assert token.status_code == 200, token.text
    return token.json()


def google_login(
    client, *, scope: str = GOOGLE_ALL, user: str = "marina", offline: bool = True, **extra
) -> dict:
    params = {
        "client_id": GOOGLE_CLIENT,
        "redirect_uri": REDIRECT,
        "response_type": "code",
        "scope": scope,
        "state": "g1",
        "mock_user": user,
        **extra,
    }
    if offline:
        params["access_type"] = "offline"
    response = client.get(
        "/google/accounts/o/oauth2/v2/auth", params=params, follow_redirects=False
    )
    assert response.status_code == 302, response.text
    code = query_of(response.headers["location"])["code"]
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT,
        "client_secret": "qualquer",
        "redirect_uri": REDIRECT,
        "grant_type": "authorization_code",
    }
    data.update({k: v for k, v in extra.items() if k == "code_verifier"})
    token = client.post("/google/oauth2/token", data=data)
    assert token.status_code == 200, token.text
    return token.json()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
