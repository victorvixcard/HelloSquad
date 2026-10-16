"""hellosquad-local-db: no `make up` tolera .env incompleto; chamado direto, exige as duas URLs."""

from pathlib import Path

import psycopg
import pytest

from hellosquad import local_db

ADMIN_URL = "postgresql://postgres:postgres@127.0.0.1:56322/postgres"


@pytest.fixture
def without_env_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Roda de uma pasta sem .env acima (como num clone recém-feito) e sem as URLs no ambiente."""
    workdir = tmp_path / "apps" / "backend"
    workdir.mkdir(parents=True)
    monkeypatch.chdir(workdir)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("API_DATABASE_URL", raising=False)


@pytest.fixture
def no_connection(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(*args: object, **kwargs: object) -> None:
        raise AssertionError("não devia conectar ao banco")

    monkeypatch.setattr(psycopg, "connect", refuse)


def test_roles_optional_only_warns_without_env_file(without_env_file, no_connection, capsys):
    assert local_db.main(["roles", "--optional"]) == 0

    err = capsys.readouterr().err
    assert err.count("\n") == 1
    assert err.startswith("aviso: .env ausente ou sem DATABASE_URL e API_DATABASE_URL;")


def test_roles_optional_only_warns_with_empty_api_url(monkeypatch, no_connection, capsys):
    monkeypatch.setenv("DATABASE_URL", ADMIN_URL)
    monkeypatch.setenv("API_DATABASE_URL", "")

    assert local_db.main(["roles", "--optional"]) == 0
    assert capsys.readouterr().err.startswith("aviso: .env ausente ou sem API_DATABASE_URL;")


def test_explicit_roles_requires_database_url(without_env_file, no_connection, capsys):
    assert local_db.main(["roles"]) == 1
    assert capsys.readouterr().err.startswith("erro: DATABASE_URL vazio no .env")


@pytest.mark.parametrize("command", [["roles"], ["seed", "seed.sql"]], ids=["roles", "seed"])
def test_explicit_commands_require_api_url_before_connecting(
    monkeypatch, no_connection, capsys, command
):
    monkeypatch.setenv("DATABASE_URL", ADMIN_URL)
    monkeypatch.setenv("API_DATABASE_URL", "")

    assert local_db.main(command) == 1
    assert capsys.readouterr().err.startswith("erro: API_DATABASE_URL vazio no .env")
