"""Guarda de rede: o processo dos mocks nunca abre conexão nem resolve nome fora do loopback.

Usa um audit hook do Python (PEP 578), que roda antes da operação: a tentativa é registrada e
abortada com NetworkBlocked, então nenhum pacote sai da máquina. O hook vale para o processo
inteiro e não pode ser removido depois de instalado.
"""

from __future__ import annotations

import ipaddress
import socket
import sys
import time

_LOCAL_NAMES = {"localhost", "ip6-localhost", "ip6-loopback"}
_WATCHED = {
    "socket.connect",
    "socket.getaddrinfo",
    "socket.gethostbyname",
    "socket.gethostbyname_ex",
    "socket.gethostbyaddr",
    "socket.sendto",
    "socket.sendmsg",
}

blocked: list[dict] = []
_installed = False


class NetworkBlocked(RuntimeError):
    """Tentativa de rede fora do loopback dentro do processo dos mocks."""


def is_local(host: object) -> bool:
    if host is None:
        return True
    if isinstance(host, bytes):
        host = host.decode(errors="replace")
    name = str(host).strip("[]").lower()
    if name in _LOCAL_NAMES or name == "":
        return True
    try:
        address = ipaddress.ip_address(name.split("%")[0])
    except ValueError:
        return False
    return address.is_loopback or address.is_unspecified


def _host_of(event: str, args: tuple) -> object:
    if event in ("socket.connect", "socket.sendto", "socket.sendmsg"):
        address = args[1] if len(args) > 1 else None
        if isinstance(address, tuple) and address:
            return address[0]
        return None  # socket Unix (caminho) ou sem endereço: local
    return args[0] if args else None


def _hook(event: str, args: tuple) -> None:
    if event not in _WATCHED:
        return
    if event in ("socket.connect", "socket.sendto", "socket.sendmsg"):
        sock = args[0] if args else None
        family = getattr(sock, "family", None)
        if family not in (socket.AF_INET, socket.AF_INET6):
            return
    host = _host_of(event, args)
    if is_local(host):
        return
    blocked.append({"event": event, "host": str(host), "at": time.time()})
    raise NetworkBlocked(f"rede externa bloqueada nos mocks: {event} {host}")


def install() -> None:
    global _installed
    if not _installed:
        sys.addaudithook(_hook)
        _installed = True


def installed() -> bool:
    return _installed


def selftest() -> dict:
    """Tenta resolver um host real; a guarda precisa bloquear antes de qualquer consulta DNS."""
    try:
        socket.getaddrinfo("graph.facebook.com", 443)
    except NetworkBlocked as exc:
        return {"blocked": True, "detail": str(exc)}
    except OSError as exc:  # sem guarda e sem rede: não prova nada
        return {"blocked": False, "detail": f"sem guarda: {exc}"}
    return {"blocked": False, "detail": "a resolução passou: a guarda não está ativa"}
