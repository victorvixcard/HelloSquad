"""Exporta o contrato OpenAPI da API (`make openapi` → packages/contracts/openapi.json)."""

import json
import sys
from pathlib import Path

from hellosquad.api.main import app


def render() -> str:
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n"


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("uso: hellosquad-openapi <arquivo de saída>", file=sys.stderr)
        return 2
    target = Path(argv[0])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render(), encoding="utf-8")
    print(f"OpenAPI {app.openapi()['openapi']} escrito em {target}")
    return 0


def run() -> None:
    sys.exit(main(sys.argv[1:]))
