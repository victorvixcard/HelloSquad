"""S2f — e-mail transacional: gatilho do domínio → email_messages + email_outbox → EmailProvider.

Os testes de integração enviam de verdade pelo SMTP do Mailpit local (127.0.0.1:56325) e conferem
pela API HTTP do Mailpit (127.0.0.1:56324): os e-mails chegam nos três idiomas para os três
negócios, sem citar outro negócio; falha passageira volta para a fila e sai na tentativa seguinte;
destinatário fora do TLD `.example` é recusado sem envio; a preferência da pessoa é respeitada; a
troca de senha pela Auth gera o aviso.
"""

import re
import secrets
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from hellosquad.config import Settings, get_settings
from hellosquad.email.factory import build_email_provider
from hellosquad.email.mock import MockEmailProvider
from hellosquad.email.outbox import EmailOutbox
from hellosquad.email.provider import EmailSendError
from hellosquad.email.templates import EmailRenderer
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

MAILPIT = "http://127.0.0.1:56324"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
JULIANA = "juliana@trilha.example"
REQUEST = (
    "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. "
    "Quero vender mais na loja."
)
TITLE = "Legenda do pão de abóbora"
MIOLO_PIX = "5eed0000-0000-4000-8000-0000000009d2"
NAMES = {"miolo": "Miolo", "vitta": "Vitta Estética", "trilha": "Trilha Urbana"}
MISSING_KEY = re.compile(r"\b(email|agent)\.[a-z]")


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def db() -> AsyncIterator[psycopg.AsyncConnection]:
    async with await psycopg.AsyncConnection.connect(
        get_settings().database_url.get_secret_value(), autocommit=True, row_factory=dict_row
    ) as conn:
        yield conn


@pytest.fixture
async def pool() -> AsyncIterator[AsyncConnectionPool]:
    pool = AsyncConnectionPool(
        get_settings().database_url.get_secret_value(),
        min_size=1,
        max_size=4,
        open=False,
        kwargs={"autocommit": True, "prepare_threshold": None, "row_factory": dict_row},
    )
    await pool.open(wait=True, timeout=10)
    try:
        yield pool
    finally:
        await pool.close()


@pytest.fixture
async def mailpit() -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(base_url=MAILPIT, timeout=10) as client:
        try:
            await client.get("/api/v1/info")
        except httpx.ConnectError:
            pytest.fail("Mailpit local fora do ar em :56324 (make up).")
        yield client


@pytest.fixture
async def clean_state(db) -> AsyncIterator[None]:
    """Fila vazia antes (o que outros testes enfileiraram não entra na conta) e seed reaplicado
    depois (idiomas, cobranças e convites voltam ao estado dos dados fictícios)."""
    started = datetime.now(UTC)
    await db.execute("select pgmq.purge_queue('email_outbox')")
    await db.execute(
        "delete from public.email_messages where idempotency_key like %s",
        (f"payment:{MIOLO_PIX}:%",),
    )
    yield
    await db.execute("delete from public.email_messages where created_at >= %s", (started,))
    await db.execute(
        "delete from public.email_preferences p using auth.users u "
        "where u.id = p.user_id and u.email like '%%.example'"
    )
    await db.execute("delete from public.invitations where email like '%%.s2f@%%'")
    await db.execute(
        "update public.workspaces set locale = 'pt-BR' where slug in ('vitta', 'trilha')"
    )
    await db.execute(SEED_FILE.read_text(encoding="utf-8"))


def outbox(pool: AsyncConnectionPool, provider=None, *, max_attempts: int = 3) -> EmailOutbox:
    return EmailOutbox(
        pool,
        provider or build_email_provider(get_settings()),
        app_env="test",
        max_attempts=max_attempts,
        retry_base_seconds=0,
        visibility_timeout_seconds=30,
    )


async def invite(db, slug: str, email: str, owner: str) -> None:
    await db.execute(
        """
        insert into public.invitations
          (workspace_id, email, role, token_hash, expires_at, invited_by)
        select w.id, %s, 'editor', %s, now() + interval '7 days', u.id
        from public.workspaces w, auth.users u
        where w.slug = %s and u.email = %s
        """,
        (email, secrets.token_hex(32), slug, owner),
    )


async def emails(db, *where: str, params: tuple = ()) -> list[dict[str, Any]]:
    clause = " and ".join(where) or "true"
    cur = await db.execute(
        "select m.*, m.template::text as template, m.status::text as status, w.slug "
        "from public.email_messages m left join public.workspaces w on w.id = m.workspace_id "
        f"where {clause} order by m.created_at, m.recipient_email",
        params,
    )
    return await cur.fetchall()


async def request_work(api, access_token, user: str, workspace_id: UUID) -> str:
    headers = bearer(access_token(user))
    conversation = await api.post(
        f"/workspaces/{workspace_id}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages",
        headers=headers,
        json={"body": REQUEST},
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": TITLE},
    )
    assert work.status_code == 201, work.text
    return work.json()["id"]


async def drain_runs() -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM()) as worker:
        return await worker.drain()


@pytest.mark.integration
async def test_events_reach_mailpit_in_three_languages_for_three_tenants(
    api, access_token, db, pool, mailpit, clean_state
) -> None:
    started = datetime.now(UTC)
    # Idioma do negócio: Miolo pt-BR, Vitta en, Trilha es. A Carla escolheu es para si: vale o dela.
    await db.execute("update public.workspaces set locale = 'en' where slug = 'vitta'")
    await db.execute("update public.workspaces set locale = 'es' where slug = 'trilha'")
    await db.execute(
        'update auth.users set raw_user_meta_data = raw_user_meta_data || \'{"locale": "es"}\' '
        "where email = %s",
        (CARLA,),
    )
    await invite(db, "miolo", "convite.s2f@miolo.example", MARINA)
    await invite(db, "vitta", "convite.s2f@vitta.example", RAFAEL)
    await invite(db, "trilha", "convite.s2f@trilha.example", JULIANA)
    vitta = (await (await db.execute("select id from workspaces where slug = 'vitta'")).fetchone())[
        "id"
    ]
    await request_work(api, access_token, CARLA, vitta)
    assert await drain_runs() == ["delivered"]
    # Pix da Miolo venceu sem pagamento (pending → overdue): aviso à Marina, owner.
    await db.execute("update public.payments set status = 'overdue' where id = %s", (MIOLO_PIX,))

    queued = await emails(db, "m.created_at >= %s", params=(started,))
    assert {(m["slug"], m["template"], m["recipient_email"], m["locale"]) for m in queued} == {
        ("miolo", "invitation", "convite.s2f@miolo.example", "pt-BR"),
        ("vitta", "invitation", "convite.s2f@vitta.example", "en"),
        ("trilha", "invitation", "convite.s2f@trilha.example", "es"),
        ("vitta", "approval_pending", RAFAEL, "en"),
        ("vitta", "delivery_ready", CARLA, "es"),
        ("miolo", "payment_problem", MARINA, "pt-BR"),
    }
    assert all(m["status"] == "queued" and m["attempts"] == 0 for m in queued)

    outcomes = await outbox(pool).drain()
    assert outcomes == ["sent"] * 6

    listed = (await mailpit.get("/api/v1/messages", params={"limit": 500})).json()
    listed_ids = {message["ID"] for message in listed["messages"]}
    sent = await emails(db, "m.created_at >= %s", params=(started,))
    expected_subjects = {
        "convite.s2f@miolo.example": "Marina Costa convidou você para Miolo no HelloSquad",
        "convite.s2f@vitta.example": "Rafael Nunes invited you to Vitta Estética on HelloSquad",
        "convite.s2f@trilha.example": "Juliana Prado te invitó a Trilha Urbana en HelloSquad",
        RAFAEL: f"Needs you: {TITLE}",
        CARLA: f"Entrega lista: {TITLE}",
        MARINA: "Pagamento com problema em Miolo",
    }
    for row in sent:
        assert row["status"] == "sent" and row["attempts"] == 1
        assert row["provider"] == "mailpit"
        assert row["provider_message_id"] in listed_ids
        message = (await mailpit.get(f"/api/v1/message/{row['provider_message_id']}")).json()
        assert [to["Address"] for to in message["To"]] == [row["recipient_email"]]
        assert message["Subject"] == expected_subjects[row["recipient_email"]]
        assert message["MessageID"] == f"{row['id']}@hellosquad.example"
        assert f'lang="{row["locale"]}"' in message["HTML"]
        assert "<img" not in message["HTML"]
        own = NAMES[row["slug"]]
        assert own in message["Text"]
        for slug, other in NAMES.items():
            if slug != row["slug"]:
                assert other not in message["Text"] and other not in message["HTML"], (
                    f"e-mail de {row['slug']} cita {other}"
                )

    by_recipient = {row["recipient_email"]: row for row in sent}
    rafael = (
        await mailpit.get(f"/api/v1/message/{by_recipient[RAFAEL]['provider_message_id']}")
    ).json()
    assert "Otto needs you in Vitta Estética to review a delivery." in rafael["Text"]
    assert f"{get_settings().email_app_url.rstrip('/')}/app/vitta" in rafael["Text"]
    carla = (
        await mailpit.get(f"/api/v1/message/{by_recipient[CARLA]['provider_message_id']}")
    ).json()
    assert f"Otto terminó la versión 1 de “{TITLE}” en Vitta Estética." in carla["Text"]
    marina = (
        await mailpit.get(f"/api/v1/message/{by_recipient[MARINA]['provider_message_id']}")
    ).json()
    assert (
        "Houve um problema com o pagamento da recarga de créditos de Miolo: a cobrança venceu "
        "sem pagamento." in marina["Text"]
    )
    assert "R$" not in marina["Text"] and "49" not in marina["Text"]

    # Repetir o evento não duplica o e-mail (chave de idempotência por evento e pessoa).
    await db.execute("update public.payments set status = 'pending' where id = %s", (MIOLO_PIX,))
    await db.execute("update public.payments set status = 'overdue' where id = %s", (MIOLO_PIX,))
    assert (
        len(
            await emails(
                db, "m.template = 'payment_problem'", "m.created_at >= %s", params=(started,)
            )
        )
        == 1
    )


@pytest.mark.integration
async def test_transient_failure_retries_and_then_reaches_mailpit(
    db, pool, mailpit, clean_state
) -> None:
    provider = build_email_provider(get_settings())
    real = provider.deliver
    calls: list[UUID] = []

    async def flaky(request, rendered):
        calls.append(request.message_id)
        if len(calls) == 1:
            raise EmailSendError("smtp_unavailable", transient=True, details={"simulated": True})
        return await real(request, rendered)

    provider.deliver = flaky
    await invite(db, "miolo", "retry.s2f@miolo.example", MARINA)
    assert await outbox(pool, provider).drain() == ["retry", "sent"]
    [row] = await emails(db, "m.recipient_email = 'retry.s2f@miolo.example'")
    assert row["status"] == "sent" and row["attempts"] == 2 and row["error"] is None
    assert calls == [row["id"], row["id"]]
    message = (await mailpit.get(f"/api/v1/message/{row['provider_message_id']}")).json()
    assert message["Subject"] == "Marina Costa convidou você para Miolo no HelloSquad"

    mock = MockEmailProvider(sender="nao-responda@hellosquad.example", renderer=provider.renderer)
    failure = EmailSendError("smtp_unavailable", transient=True)
    mock.fail_next(failure, failure, failure)
    await invite(db, "miolo", "esgota.s2f@miolo.example", MARINA)
    assert await outbox(pool, mock).drain() == ["retry", "retry", "failed"]
    [exhausted] = await emails(db, "m.recipient_email = 'esgota.s2f@miolo.example'")
    assert exhausted["status"] == "failed" and exhausted["attempts"] == 3
    assert exhausted["error"]["code"] == "smtp_unavailable"
    assert await (
        await db.execute(
            "select count(*) as n from pgmq.a_email_outbox where message->>'email_message_id' = %s",
            (str(exhausted["id"]),),
        )
    ).fetchone() == {"n": 1}


@pytest.mark.integration
async def test_unsendable_content_fails_once_with_the_reason(
    db, pool, mailpit, clean_state
) -> None:
    """H2-13: nome do negócio com quebra de linha (linha anterior à validação da API) não vira
    e-mail: falha definitiva na 1ª tentativa, com o motivo, sem voltar à fila nem injetar
    cabeçalho."""
    await db.execute(
        "update public.workspaces set name = %s where slug = 'miolo'",
        ("Miolo\r\nBcc: intruso@ataque.example",),
    )
    try:
        await invite(db, "miolo", "crlf.s2f@miolo.example", MARINA)
        assert await outbox(pool).drain() == ["failed"]
    finally:
        await db.execute("update public.workspaces set name = 'Miolo' where slug = 'miolo'")
    [row] = await emails(db, "m.recipient_email = 'crlf.s2f@miolo.example'")
    assert row["status"] == "failed" and row["attempts"] == 1
    assert row["error"]["code"] == "invalid_message"
    assert row["error"]["details"]["error_type"] == "ValueError"
    assert await (
        await db.execute(
            "select count(*) as n from pgmq.a_email_outbox where message->>'email_message_id' = %s",
            (str(row["id"]),),
        )
    ).fetchone() == {"n": 1}
    for query in ("to:crlf.s2f@miolo.example", "to:intruso@ataque.example"):
        found = (await mailpit.get("/api/v1/search", params={"query": query})).json()
        assert found["messages_count"] == 0, query


@pytest.mark.integration
async def test_recipient_outside_example_is_refused_without_sending(
    db, pool, mailpit, clean_state
) -> None:
    mock = MockEmailProvider(
        sender="nao-responda@hellosquad.example",
        renderer=EmailRenderer(app_url="http://127.0.0.1:3100"),
    )
    await invite(db, "miolo", "fora.s2f@miolo.test", MARINA)
    assert await outbox(pool, mock).drain() == ["refused"]
    [row] = await emails(db, "m.recipient_email = 'fora.s2f@miolo.test'")
    assert row["status"] == "refused" and row["provider_message_id"] is None
    assert row["error"] == {"code": "recipient_domain_not_allowed"}
    assert mock.sent == []
    found = (await mailpit.get("/api/v1/search", params={"query": "to:fora.s2f@miolo.test"})).json()
    assert found["messages_count"] == 0


@pytest.mark.integration
async def test_preference_turns_off_an_optional_email(api, access_token, db, clean_state) -> None:
    headers = bearer(access_token(MARINA))
    listed = await api.get("/me/email-preferences", headers=headers)
    assert listed.status_code == 200, listed.text
    assert {item["template"]: item["enabled"] for item in listed.json()["items"]} == {
        "approval_pending": True,
        "delivery_ready": True,
        "payment_confirmed": True,
        "payment_problem": True,
    }
    off = await api.put(
        "/me/email-preferences/payment_problem", headers=headers, json={"enabled": False}
    )
    assert off.status_code == 200 and off.json() == {
        "template": "payment_problem",
        "enabled": False,
    }
    refused = await api.put(
        "/me/email-preferences/password_changed", headers=headers, json={"enabled": False}
    )
    assert refused.status_code == 422

    started = datetime.now(UTC)
    await db.execute("update public.payments set status = 'overdue' where id = %s", (MIOLO_PIX,))
    assert await emails(db, "m.created_at >= %s", params=(started,)) == []

    # A preferência é só da Marina: o Rafael não enxerga nem muda a dela.
    rafael = await api.get("/me/email-preferences", headers=bearer(access_token(RAFAEL)))
    assert all(item["enabled"] for item in rafael.json()["items"])


@pytest.mark.integration
async def test_password_changed_by_auth_sends_the_notice(db, pool, mailpit, clean_state) -> None:
    settings = get_settings()
    key = settings.supabase_secret_key.get_secret_value()
    admin = {"apikey": key, "Authorization": f"Bearer {key}"}
    email = "senha.s2f@semconta.example"
    async with httpx.AsyncClient(base_url=f"{settings.supabase_url}/auth/v1", timeout=10) as auth:
        created = await auth.post(
            "/admin/users",
            headers=admin,
            json={"email": email, "password": "Senha!Antiga123", "email_confirm": True},
        )
        assert created.status_code == 200, created.text
        user_id = created.json()["id"]
        try:
            assert await emails(db, "m.recipient_email = %s", params=(email,)) == []
            changed = await auth.put(
                f"/admin/users/{user_id}", headers=admin, json={"password": "Senha!Nova12345"}
            )
            assert changed.status_code == 200, changed.text
            [row] = await emails(db, "m.recipient_email = %s", params=(email,))
            assert row["template"] == "password_changed" and row["workspace_id"] is None
            assert await outbox(pool).drain() == ["sent"]
            [row] = await emails(db, "m.recipient_email = %s", params=(email,))
            message = (await mailpit.get(f"/api/v1/message/{row['provider_message_id']}")).json()
            assert message["Subject"] == "Sua senha do HelloSquad foi alterada"
            assert f"A senha da sua conta ({email}) foi alterada em" in message["Text"]
        finally:
            await auth.delete(f"/admin/users/{user_id}", headers=admin)


def test_every_template_renders_in_the_three_languages_without_missing_keys() -> None:
    renderer = EmailRenderer(app_url="http://127.0.0.1:3100")
    variables = {
        "workspace_name": "Miolo",
        "workspace_slug": "miolo",
        "recipient_name": "Marina Costa",
        "recipient_email": MARINA,
        "inviter_name": "Marina Costa",
        "role": "editor",
        "expires_at": "2026-10-23T18:00:00+00:00",
        "agent_id": "iris",
        "kind": "respond",
        "work_item_title": "Relatório <do mês>",
        "version_no": 2,
        "payment_kind": "subscription_cycle",
        "method": "card",
        "status": "charged_back",
        "changed_at": "2026-10-16T21:30:00+00:00",
    }
    templates = [
        "invitation",
        "approval_pending",
        "delivery_ready",
        "payment_confirmed",
        "payment_problem",
        "password_changed",
    ]
    for locale in ("pt-BR", "en", "es"):
        subjects = set()
        for template in templates:
            rendered = renderer.render(template, locale, variables)
            subjects.add(rendered.subject)
            for part in (rendered.subject, rendered.text, rendered.html):
                assert not MISSING_KEY.search(part) and "{" not in part, (
                    locale,
                    template,
                    part[:200],
                )
            assert "Relatório <do mês>" not in rendered.html
            assert "Relatório &lt;do mês&gt;" in rendered.html or template not in (
                "approval_pending",
                "delivery_ready",
            )
        assert len(subjects) == len(templates)
    assert "18:30 (UTC-03:00)" in renderer.render("password_changed", "pt-BR", variables).text
    assert "10/23/2026" in renderer.render("invitation", "en", variables).text
    assert "Íris" in renderer.render("approval_pending", "es", variables).text
