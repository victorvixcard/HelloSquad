"""S2g — consentimento revogável (H2-17) e fórmula de planilha neutralizada (H2-18).

Revogar é uma linha nova `revoked` em public.consents (somente inserção): pela rota, owner ou admin
acha o contato pelo e-mail ou telefone, com evento de auditoria sem dado pessoal; pela reimportação,
o contato que já está na base com "não" explícito e nenhum "sim" revoga em vez de ser recusado.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
CSV_HEADER = "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def workspace(admin_db, slug: str) -> str:
    [row] = await rows(admin_db, "select id from public.workspaces where slug = %s", slug)
    return str(row["id"])


async def consent_history(admin_db, email: str) -> list[tuple[str, str]]:
    found = await rows(
        admin_db,
        """
        select s.channel::text, s.status::text
        from public.consents s join public.contacts c on c.id = s.contact_id
        where c.email = %s
        order by s.recorded_at, s.id
        """,
        email,
    )
    return [(r["channel"], r["status"]) for r in found]


async def current_state(admin_db, email: str) -> dict[str, str]:
    found = await rows(
        admin_db,
        """
        select s.channel::text, s.status::text
        from public.contact_consent_state s join public.contacts c on c.id = s.contact_id
        where c.email = %s
        """,
        email,
    )
    return {r["channel"]: r["status"] for r in found}


async def test_owner_revokes_consent_with_audit_and_history(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    email = "cliente01@contatos.example"
    before = await current_state(admin_db, email)
    assert before["email"] == "granted"
    summary = await api.get(
        f"/workspaces/{miolo}/contacts/summary", headers=bearer(access_token(MARINA))
    )
    emails_before = summary.json()["consented"]["email"]

    response = await api.post(
        f"/workspaces/{miolo}/contacts/consents/revocations",
        headers=bearer(access_token(MARINA)),
        json={"email": email.upper(), "source": "Pedido da cliente no balcão"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["revoked"] == sorted(before)
    assert {c["channel"]: c["status"] for c in body["consents"]} == dict.fromkeys(before, "revoked")
    # Somente inserção: o histórico guarda o consentimento e a revogação.
    history = await consent_history(admin_db, email)
    assert sorted(h for h in history if h[1] == "granted") == [(ch, "granted") for ch in before]
    assert sorted(history[-len(before) :]) == [(ch, "revoked") for ch in sorted(before)]
    [audit] = await rows(
        admin_db,
        """
        select actor_type::text, action, entity_type, entity_id, payload
        from public.audit_events
        where workspace_id = %s and action = 'contacts.consent_revoked'
        """,
        miolo,
    )
    assert audit["entity_id"] == body["contact_id"] and audit["entity_type"] == "contact"
    assert audit["payload"] == {
        "requested": "all",
        "revoked": sorted(before),
        "source": "Pedido da cliente no balcão",
    }
    assert "@" not in str(audit["payload"])
    summary = await api.get(
        f"/workspaces/{miolo}/contacts/summary", headers=bearer(access_token(MARINA))
    )
    assert summary.json()["consented"]["email"] == emails_before - 1

    again = await api.post(
        f"/workspaces/{miolo}/contacts/consents/revocations",
        headers=bearer(access_token(MARINA)),
        json={"email": email, "channel": "email", "source": "Pedido repetido"},
    )
    assert again.status_code == 200, again.text
    assert again.json()["revoked"] == []
    assert len(await consent_history(admin_db, email)) == len(history)


async def test_revocation_by_phone_and_refusals(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")
    url = f"/workspaces/{miolo}/contacts/consents/revocations"
    by_phone = await api.post(
        url,
        headers=bearer(access_token(MARINA)),
        json={"phone": "(11) 99999-0001", "channel": "whatsapp", "source": "Ligação"},
    )
    assert by_phone.status_code == 200, by_phone.text
    assert await current_state(admin_db, "cliente01@contatos.example") == {
        "email": "granted",
        "whatsapp": "revoked",
    }

    missing = await api.post(
        url,
        headers=bearer(access_token(MARINA)),
        json={"email": "ninguem@contatos.example", "source": "Teste"},
    )
    assert missing.status_code == 404
    assert missing.json()["error"]["message"] == "Contato não encontrado."
    no_address = await api.post(url, headers=bearer(access_token(MARINA)), json={"source": "Teste"})
    assert no_address.status_code == 422
    assert no_address.json()["error"]["code"] == "missing_address"
    # Editora não revoga; outro negócio não enxerga a Miolo.
    editor = await api.post(
        f"/workspaces/{vitta}/contacts/consents/revocations",
        headers=bearer(access_token(CARLA)),
        json={"email": "cliente01@contatos.example", "source": "Teste"},
    )
    assert editor.status_code == 403
    other = await api.post(
        url,
        headers=bearer(access_token(RAFAEL)),
        json={"email": "cliente01@contatos.example", "source": "Teste"},
    )
    assert other.status_code == 404
    assert await current_state(admin_db, "cliente01@contatos.example") == {
        "email": "granted",
        "whatsapp": "revoked",
    }


async def test_reimport_with_explicit_no_revokes_instead_of_refusing(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    lines = [
        CSV_HEADER,
        "Cliente 02;cliente02@contatos.example;;não;não;2026-10-10",
        "Pessoa Nova;nova.s2g@contatos.example;;não;não;",
        "Cliente 03 em Branco;cliente03@contatos.example;;;;",
        "Cliente 15 sem Consentimento;cliente15@contatos.example;;não;;",
    ]
    response = await api.post(
        f"/workspaces/{miolo}/contacts/imports",
        headers=bearer(access_token(MARINA)),
        json={
            "file_name": "revogacoes.csv",
            "source": "Pedidos do balcão",
            "csv": "\n".join(lines),
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert (
        body["total_rows"],
        body["accepted_rows"],
        body["revoked_rows"],
        body["refused_rows"],
    ) == (4, 0, 1, 3)
    assert body["refused"] == [
        {"line": 3, "reason": "no_consent"},
        {"line": 4, "reason": "no_consent"},
        {"line": 5, "reason": "duplicate_existing"},
    ]
    assert set((await current_state(admin_db, "cliente02@contatos.example")).values()) == {
        "revoked"
    }
    assert set((await current_state(admin_db, "cliente03@contatos.example")).values()) == {
        "granted"
    }
    [audit] = await rows(
        admin_db,
        "select payload from public.audit_events where action = 'contacts.imported' "
        "and entity_id = %s",
        body["id"],
    )
    assert audit["payload"] == {"total": 4, "accepted": 0, "refused": 3, "revoked": 1}


async def test_spreadsheet_formula_is_neutralized_on_import(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    formula = '=HYPERLINK("http://golpe.example","clique aqui")'
    lines = [
        CSV_HEADER,
        f"{formula};formula01@contatos.example;;sim;não;2026-10-01",
        "+5511999990099;formula02@contatos.example;;sim;não;2026-10-01",
        "-1+2;formula03@contatos.example;;sim;não;2026-10-01",
        "@SOMA(A1);formula04@contatos.example;;sim;não;2026-10-01",
        "Ana Lima;formula05@contatos.example;;sim;não;2026-10-01",
    ]
    response = await api.post(
        f"/workspaces/{miolo}/contacts/imports",
        headers=bearer(access_token(MARINA)),
        json={"file_name": "formulas.csv", "source": "=origem", "csv": "\n".join(lines)},
    )
    assert response.status_code == 201, response.text
    assert response.json()["accepted_rows"] == 5
    stored = await rows(
        admin_db,
        "select email, full_name, source from public.contacts where email like 'formula0%%' "
        "order by email",
    )
    assert [(r["full_name"], r["source"]) for r in stored] == [
        (f"'{formula}", "'=origem"),
        ("'+5511999990099", "'=origem"),
        ("'-1+2", "'=origem"),
        ("'@SOMA(A1)", "'=origem"),
        ("Ana Lima", "'=origem"),
    ]
