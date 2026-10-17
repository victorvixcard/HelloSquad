"""Ponto de entrada: `hellosquad-mocks` sobe os quatro provedores num processo só, em 127.0.0.1."""

from __future__ import annotations

import os

from . import netguard


def run() -> None:
    # A guarda entra antes de qualquer import de rede. MOCKS_NETWORK_GUARD=0 desliga (só depuração).
    if os.environ.get("MOCKS_NETWORK_GUARD", "1") != "0":
        netguard.install()
    import uvicorn

    from .app import create_app

    host = os.environ.get("MOCKS_HOST", "127.0.0.1")
    port = int(os.environ.get("MOCKS_PORT", "8300"))
    uvicorn.run(create_app(), host=host, port=port, log_level="info", access_log=True)


if __name__ == "__main__":
    run()
