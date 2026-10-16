"""hellosquad-local-db: no `make up` tolera .env incompleto; chamado direto, exige as duas URLs."""

from pathlib import Path

import psycopg
import pytest
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from hellosquad import local_db
from hellosquad.config import get_settings

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


def api_role_verifier() -> str:
    """Hash SCRAM da senha: regravar muda o sal, então hash igual quer dizer nada gravado."""
    settings = get_settings()
    assert settings.database_url is not None
    with psycopg.connect(settings.database_url.get_secret_value()) as conn:
        row = conn.execute(
            "select rolpassword from pg_authid where rolname = %s", (local_db.API_ROLE,)
        ).fetchone()
    assert row is not None
    return row[0]


@pytest.mark.integration
def test_roles_keeps_the_password_that_already_works(capsys):
    before = api_role_verifier()

    assert local_db.main(["roles"]) == 0
    assert "já confere com API_DATABASE_URL; nada gravado" in capsys.readouterr().out
    assert api_role_verifier() == before


@pytest.fixture
def another_checkout_password(monkeypatch: pytest.MonkeyPatch) -> None:
    """API_DATABASE_URL com outra senha, como num segundo checkout que gerou a dele."""
    api_url = get_settings().api_database_url
    assert api_url is not None
    params = conninfo_to_dict(api_url.get_secret_value())
    monkeypatch.setenv("API_DATABASE_URL", make_conninfo(**{**params, "password": "outra-senha"}))
    get_settings.cache_clear()


@pytest.mark.integration
def test_roles_refuses_to_rotate_the_password_another_checkout_uses(
    another_checkout_password, capsys
):
    before = api_role_verifier()

    assert local_db.main(["roles"]) == 1
    assert "já tem outra senha (outro checkout nesta máquina?)" in capsys.readouterr().err
    assert api_role_verifier() == before


@pytest.mark.integration
def test_seed_refuses_another_checkout_password_before_applying(
    another_checkout_password, capsys, tmp_path
):
    """Antes o seed entrava no banco e só depois a senha era recusada (C-02 da H2)."""
    seed_file = tmp_path / "seed.sql"
    seed_file.write_text("do $$ begin raise exception 'o seed rodou'; end $$;", encoding="utf-8")
    before = api_role_verifier()

    assert local_db.main(["seed", str(seed_file)]) == 1
    out, err = capsys.readouterr()
    assert "já tem outra senha (outro checkout nesta máquina?)" in err
    assert "o seed rodou" not in err and "seed aplicado" not in out
    assert api_role_verifier() == before
