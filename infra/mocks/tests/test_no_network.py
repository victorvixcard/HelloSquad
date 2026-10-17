"""Prova de que nada sai para a internet: código sem cliente HTTP, guarda ativa no processo real
dos mocks e nenhuma tentativa bloqueada depois de um roteiro inteiro por sockets de verdade."""

from __future__ import annotations

import ast
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest
from conftest import GOOGLE_ALL, GOOGLE_CLIENT, GRAPH, META_ALL, META_APP, REDIRECT, query_of

from hellosquad_mocks import netguard

SRC = Path(__file__).resolve().parents[1] / "src" / "hellosquad_mocks"
FORBIDDEN = {
    "httpx",
    "requests",
    "urllib.request",
    "aiohttp",
    "http.client",
    "urllib3",
    "smtplib",
    "ftplib",
}


def test_codigo_dos_mocks_nao_importa_cliente_de_rede():
    found = []
    for path in SRC.glob("*.py"):
        for node in ast.walk(ast.parse(path.read_text())):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            found += [
                f"{path.name}: {n}"
                for n in names
                if n in FORBIDDEN or n.split(".")[0] in {"requests", "aiohttp", "urllib3"}
            ]
    assert found == []


def test_guarda_bloqueia_conexao_externa_neste_processo():
    assert netguard.installed()
    with pytest.raises(netguard.NetworkBlocked):
        socket.create_connection(("192.0.2.10", 443), timeout=0.2)  # TEST-NET-1, nunca roteado
    with pytest.raises(netguard.NetworkBlocked):
        socket.getaddrinfo("oauth2.googleapis.com", 443)
    netguard.blocked.clear()


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture
def live_server():
    port = _free_port()
    env = {**os.environ, "MOCKS_PORT": str(port)}
    env.pop("MOCKS_NETWORK_GUARD", None)
    process = subprocess.Popen(
        [sys.executable, "-m", "hellosquad_mocks.main"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                if httpx.get(f"{base}/_mock/health", timeout=0.5).status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.1)
        else:
            pytest.fail("o processo dos mocks não subiu")
        yield base
    finally:
        process.terminate()
        process.wait(timeout=10)


def test_processo_real_roda_roteiro_sem_nenhuma_tentativa_externa(live_server):
    base = live_server
    with httpx.Client(base_url=base, timeout=5) as http:
        assert http.get("/_mock/network").json() == {"guard": True, "blocked": []}
        dialog = http.get(
            "/meta/www/v26.0/dialog/oauth",
            params={"client_id": META_APP, "redirect_uri": REDIRECT, "scope": META_ALL},
        )
        code = query_of(dialog.headers["location"])["code"]
        meta = http.get(
            f"{GRAPH}/oauth/access_token",
            params={
                "client_id": META_APP,
                "client_secret": "x",
                "redirect_uri": REDIRECT,
                "code": code,
            },
        ).json()["access_token"]
        container = http.post(
            f"{GRAPH}/17841400000000101/media",
            data={"image_url": "https://cdn.example/p.jpg", "access_token": meta},
        ).json()["id"]
        assert (
            http.post(
                f"{GRAPH}/17841400000000101/media_publish",
                data={"creation_id": container, "access_token": meta},
            ).status_code
            == 200
        )
        auth = http.get(
            "/google/accounts/o/oauth2/v2/auth",
            params={
                "client_id": GOOGLE_CLIENT,
                "redirect_uri": REDIRECT,
                "response_type": "code",
                "scope": GOOGLE_ALL,
            },
        )
        google = http.post(
            "/google/oauth2/token",
            data={
                "code": query_of(auth.headers["location"])["code"],
                "client_id": GOOGLE_CLIENT,
                "redirect_uri": REDIRECT,
                "grant_type": "authorization_code",
            },
        ).json()["access_token"]
        report = http.post(
            "/google/analyticsdata/v1beta/properties/400000001:runReport",
            headers={"Authorization": f"Bearer {google}"},
            json={"metrics": [{"name": "sessions"}]},
        )
        assert report.status_code == 200
        assert http.get("/_mock/network").json() == {"guard": True, "blocked": []}
        assert http.post("/_mock/network/selftest").json()["blocked"] is True


def test_publicacoes_concorrentes_do_mesmo_conteiner_dao_um_post_so(live_server):
    from concurrent.futures import ThreadPoolExecutor

    with httpx.Client(base_url=live_server, timeout=5) as http:
        dialog = http.get(
            "/meta/www/v26.0/dialog/oauth",
            params={"client_id": META_APP, "redirect_uri": REDIRECT, "scope": META_ALL},
        )
        token = http.get(
            f"{GRAPH}/oauth/access_token",
            params={
                "client_id": META_APP,
                "client_secret": "x",
                "redirect_uri": REDIRECT,
                "code": query_of(dialog.headers["location"])["code"],
            },
        ).json()["access_token"]
        container = http.post(
            f"{GRAPH}/17841400000000101/media",
            data={"image_url": "https://cdn.example/p.jpg", "access_token": token},
        ).json()["id"]

        def publish(_n: int) -> int:
            return http.post(
                f"{GRAPH}/17841400000000101/media_publish",
                data={"creation_id": container, "access_token": token},
            ).status_code

        with ThreadPoolExecutor(max_workers=10) as pool:
            statuses = sorted(pool.map(publish, range(20)))
        assert statuses == [200] + [400] * 19
        media = http.get(f"{GRAPH}/17841400000000101/media", params={"access_token": token})
        assert len(media.json()["data"]) == 7  # 6 do seed + 1 publicado, nunca 2
