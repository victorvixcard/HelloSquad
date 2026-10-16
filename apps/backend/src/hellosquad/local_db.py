"""Ferramentas do banco LOCAL: senha do papel da API e seed fictício (`hellosquad-local-db`).

Recusam rodar fora de APP_ENV local/test ou contra um Postgres que não esteja nesta máquina: o seed
cria usuários com senha conhecida e nunca pode tocar um banco de verdade.
"""

import argparse
import sys
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict
from pydantic import SecretStr

from hellosquad.config import Settings, get_settings

API_ROLE = "hellosquad_api"
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


class LocalDbError(Exception):
    pass


def secret_value(value: SecretStr | None) -> str:
    return value.get_secret_value() if value is not None else ""


def missing_urls(settings: Settings) -> list[str]:
    urls = {"DATABASE_URL": settings.database_url, "API_DATABASE_URL": settings.api_database_url}
    return [name for name, value in urls.items() if not secret_value(value)]


def admin_conninfo(settings: Settings) -> str:
    if settings.app_env not in ("local", "test"):
        raise LocalDbError(f"APP_ENV={settings.app_env}: estas ferramentas só rodam em local/test.")
    conninfo = secret_value(settings.database_url)
    if not conninfo:
        raise LocalDbError("DATABASE_URL vazio no .env (usuário postgres do Supabase local).")
    host = conninfo_to_dict(conninfo).get("host")
    if host not in LOCAL_HOSTS:
        raise LocalDbError(f"DATABASE_URL aponta para {host!r}; só vale banco nesta máquina.")
    return conninfo


def api_role_credentials(settings: Settings) -> tuple[str, str]:
    conninfo = secret_value(settings.api_database_url)
    if not conninfo:
        raise LocalDbError(
            f"API_DATABASE_URL vazio no .env (papel {API_ROLE}; ver docs/SETUP_LOCAL.md)."
        )
    params = conninfo_to_dict(conninfo)
    user, password = params.get("user"), params.get("password")
    if user != API_ROLE:
        raise LocalDbError(f"API_DATABASE_URL precisa usar o papel {API_ROLE}, não {user!r}.")
    if not password:
        raise LocalDbError("API_DATABASE_URL sem senha.")
    return user, password


ROTATION_REFUSED = (
    "o papel {role} já tem outra senha (outro checkout nesta máquina?). Trocar derruba a API "
    "de quem usa a senha atual. Copie o API_DATABASE_URL do .env do outro checkout para este, "
    "ou troque de propósito com: cd apps/backend && uv run hellosquad-local-db roles --rotate"
)


def password_works(api_conninfo: str) -> bool:
    try:
        with psycopg.connect(api_conninfo, connect_timeout=5):
            return True
    except psycopg.OperationalError:
        return False


def has_password(conn: psycopg.Connection, user: str) -> bool:
    row = conn.execute(
        "select rolpassword is not null from pg_authid where rolname = %s", (user,)
    ).fetchone()
    return bool(row and row[0])


def check_api_role_password(
    conn: psycopg.Connection, settings: Settings, *, rotate: bool = False
) -> bool:
    """True se a senha de API_DATABASE_URL já vale; se o papel tem outra, recusa sem --rotate."""
    user, _ = api_role_credentials(settings)
    if password_works(secret_value(settings.api_database_url)):
        return True
    if has_password(conn, user) and not rotate:
        raise LocalDbError(ROTATION_REFUSED.format(role=API_ROLE))
    return False


def sync_api_role_password(
    conn: psycopg.Connection, settings: Settings, *, rotate: bool = False
) -> str:
    """Grava a senha só quando falta: a que já vale fica; trocar outra exige --rotate."""
    if check_api_role_password(conn, settings, rotate=rotate):
        return f"senha do papel {API_ROLE} já confere com API_DATABASE_URL; nada gravado"
    user, password = api_role_credentials(settings)
    set_api_role_password(conn, user, password)
    return f"senha do papel {API_ROLE} definida a partir de API_DATABASE_URL"


def set_api_role_password(conn: psycopg.Connection, user: str, password: str) -> None:
    """Grava a senha de API_DATABASE_URL no papel hellosquad_api, com o hash SCRAM feito aqui."""
    verifier = conn.pgconn.encrypt_password(password.encode(), user.encode(), b"scram-sha-256")
    conn.execute(
        sql.SQL("alter role {} password {}").format(
            sql.Identifier(user), sql.Literal(verifier.decode())
        )
    )


SEED_SUMMARY = """
select u.email, coalesce(w.slug, '-') as slug, coalesce(m.role::text, 'sem membership') as role
from auth.users u
left join public.memberships m on m.user_id = u.id
left join public.workspaces w on w.id = m.workspace_id
where u.email like '%.example'
order by w.slug nulls last, u.email
"""


def seed(conn: psycopg.Connection, seed_file: Path) -> list[tuple[str, str, str]]:
    conn.execute(seed_file.read_text(encoding="utf-8"))
    return conn.execute(SEED_SUMMARY).fetchall()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hellosquad-local-db", description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    roles_cmd = commands.add_parser(
        "roles", help=f"grava a senha do {API_ROLE} a partir de API_DATABASE_URL"
    )
    roles_cmd.add_argument(
        "--optional",
        action="store_true",
        help="para o make up: sem .env ou com as URLs vazias, só avisa e sai 0",
    )
    roles_cmd.add_argument(
        "--rotate",
        action="store_true",
        help=f"troca a senha do {API_ROLE} mesmo que outra já valha (derruba a API que a usa)",
    )
    seed_cmd = commands.add_parser("seed", help=f"aplica o seed e grava a senha do {API_ROLE}")
    seed_cmd.add_argument("seed_file", type=Path)
    args = parser.parse_args(argv)

    settings = get_settings()
    missing = missing_urls(settings)
    if args.command == "roles" and args.optional and missing:
        print(
            f"aviso: .env ausente ou sem {' e '.join(missing)}; a senha do {API_ROLE} não foi "
            "gravada. Preencha o .env (docs/SETUP_LOCAL.md) e rode make migrate.",
            file=sys.stderr,
        )
        return 0
    try:
        conninfo = admin_conninfo(settings)
        api_role_credentials(settings)
        rotate = getattr(args, "rotate", False)
        with psycopg.connect(conninfo, autocommit=True) as conn:
            if args.command == "seed":
                # A senha é conferida antes: recusada, o seed não entra no banco.
                check_api_role_password(conn, settings, rotate=rotate)
                for email, slug, role in seed(conn, args.seed_file):
                    print(f"  {slug:<8} {role:<15} {email}")
                print(f"seed aplicado: {args.seed_file}")
            print(sync_api_role_password(conn, settings, rotate=rotate))
    except (LocalDbError, psycopg.Error, OSError) as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 1
    return 0


def run() -> None:
    sys.exit(main())
