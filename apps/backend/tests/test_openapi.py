from pathlib import Path

from hellosquad.api.openapi import render

CONTRACT = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "openapi.json"


def test_committed_contract_matches_the_api() -> None:
    assert CONTRACT.read_text(encoding="utf-8") == render(), "contrato defasado: rode make openapi"
