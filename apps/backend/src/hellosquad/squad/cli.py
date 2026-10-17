"""hellosquad-squad: squad/ ↔ banco local (SA3a).

  seed                 grava como versão 1 ativa cada arquivo de squad/ que ainda não tem unidade no
                       banco; unidade existente com conteúdo diferente só é listada (o banco vale)
  seed --import-changes  além disso, cria versão nova ativa com o conteúdo do arquivo divergente
  export               regrava squad/ a partir das versões ativas (nada muda quando nada mudou)

Usa DATABASE_URL (usuário postgres do Supabase local), como hellosquad-local-db.
"""

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path

import psycopg
import yaml
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from hellosquad.config import get_settings
from hellosquad.local_db import LocalDbError, admin_conninfo
from hellosquad.squad.loader import REPO_SQUAD_DIR, SquadDefinitionError, parse_skill, parse_soul
from hellosquad.squad.versions import (
    ACTIVE_SECTIONS,
    ACTIVE_VERSIONS,
    Unit,
    build_snapshot,
    squad_files,
    unit_for_path,
)

SEED_AUTHOR = "squad/ (seed)"
IMPORT_AUTHOR = "squad/ (importação)"


@dataclass
class SeedReport:
    created: list[str] = field(default_factory=list)
    imported: list[str] = field(default_factory=list)
    diverged: list[str] = field(default_factory=list)


def validate(unit: Unit, text: str) -> None:
    if unit.kind == "soul":
        parse_soul(text)
    elif unit.kind == "config":
        config = yaml.safe_load(text) or {}
        if config.get("id") != unit.agent_id:
            raise SquadDefinitionError(f"{unit.path} com id {config.get('id')!r}.")
    elif unit.kind == "skill":
        parse_skill(unit.key, text)


def active_files(conn: psycopg.Connection) -> dict[str, bytes]:
    versions = conn.execute(ACTIVE_VERSIONS).fetchall()
    sections = conn.execute(ACTIVE_SECTIONS).fetchall()
    return build_snapshot(versions, sections).files


def insert_active_version(
    conn: psycopg.Connection, unit: Unit, text: str, author: str, note: str
) -> None:
    """Rascunho → seções (SOUL) → ativa, como o painel publica (a ativa anterior vira superseded)."""
    row = conn.execute(
        """
        insert into public.squad_versions (kind, agent_id, key, version, status, body, author, note)
        select %(kind)s, %(agent_id)s::public.agent_id, %(key)s, coalesce(max(v.version), 0) + 1,
               'draft', %(body)s, %(author)s, %(note)s
        from public.squad_versions v
        where v.kind = %(kind)s and v.agent_id is not distinct from %(agent_id)s::public.agent_id
          and v.key = %(key)s
        returning id
        """,
        {
            "kind": unit.kind,
            "agent_id": unit.agent_id,
            "key": unit.key,
            "body": None if unit.kind == "soul" else text,
            "author": author,
            "note": note,
        },
    ).fetchone()
    if unit.kind == "soul":
        conn.execute(
            """
            insert into public.agent_prompt_sections
              (version_id, agent_id, section, position, heading, body, in_prompt)
            select %s, %s::public.agent_id, s.section, s.position, s.heading, s.body, s.in_prompt
            from jsonb_to_recordset(%s) as s (
              section text, position smallint, heading text, body text, in_prompt boolean
            )
            """,
            (row["id"], unit.agent_id, Jsonb([s.as_json() for s in parse_soul(text)])),
        )
    conn.execute("select app.squad_activate(%s, null)", (row["id"],))


def seed(conn: psycopg.Connection, squad_dir: Path, import_changes: bool = False) -> SeedReport:
    report = SeedReport()
    files = squad_files(squad_dir)
    existing = {
        Unit(r["kind"], r["agent_id"], r["key"])
        for r in conn.execute(
            "select distinct kind, agent_id::text as agent_id, key from public.squad_versions"
        ).fetchall()
    }
    active = active_files(conn)
    for relative, text in files.items():
        unit = unit_for_path(relative)
        assert unit is not None
        validate(unit, text)
        if unit not in existing:
            note = f"Versão inicial a partir de squad/{relative}."
            insert_active_version(conn, unit, text, SEED_AUTHOR, note)
            report.created.append(relative)
        elif active.get(relative) != text.encode("utf-8"):
            if import_changes:
                note = f"Importada de squad/{relative} (make squad-seed com --import-changes)."
                insert_active_version(conn, unit, text, IMPORT_AUTHOR, note)
                report.imported.append(relative)
            else:
                report.diverged.append(relative)
    if report.created or report.imported:
        conn.execute(
            """
            insert into public.audit_events (actor_type, action, entity_type, payload)
            values ('system', 'squad.seeded', 'squad_version', %s)
            """,
            (Jsonb({"created": report.created, "imported": report.imported}),),
        )
    return report


def export(conn: psycopg.Connection, squad_dir: Path) -> tuple[list[str], list[str]]:
    """Regrava os arquivos das versões ativas; devolve (alterados, arquivos sem unidade no banco)."""
    changed = []
    active = active_files(conn)
    for relative, data in sorted(active.items()):
        path = squad_dir / relative
        if path.is_file() and path.read_bytes() == data:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        changed.append(relative)
    missing = [relative for relative in squad_files(squad_dir) if relative not in active]
    return changed, missing


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hellosquad-squad", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    seed_cmd = sub.add_parser("seed", help="squad/ → banco (só unidades novas)")
    seed_cmd.add_argument("--import-changes", action="store_true")
    sub.add_parser("export", help="banco → squad/ (versões ativas)")
    parser.add_argument("--dir", type=Path, default=None, help="pasta squad/ (padrão: a do repo)")
    args = parser.parse_args(argv)
    squad_dir = args.dir or get_settings().squad_dir or REPO_SQUAD_DIR
    try:
        conninfo = admin_conninfo(get_settings())
    except LocalDbError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2
    try:
        with psycopg.connect(conninfo, row_factory=dict_row) as conn:
            if args.command == "seed":
                report = seed(conn, squad_dir, args.import_changes)
                print(
                    f"squad seed: {len(report.created)} unidade(s) nova(s), "
                    f"{len(report.imported)} importada(s), {len(report.diverged)} divergente(s)"
                )
                for relative in report.diverged:
                    print(
                        f"  difere da versão ativa no banco (o banco vale): squad/{relative}; "
                        "make squad-export traz o banco para os arquivos"
                    )
            else:
                changed, missing = export(conn, squad_dir)
                print(f"squad export: {len(changed)} arquivo(s) regravado(s)")
                for relative in changed:
                    print(f"  regravado: squad/{relative}")
                for relative in missing:
                    print(f"  sem unidade no banco (rode make squad-seed): squad/{relative}")
    except SquadDefinitionError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 1
    return 0


def run() -> None:
    raise SystemExit(main())
