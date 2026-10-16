"""Preferência mínima de e-mail da pessoa: receber ou não cada aviso opcional (S2f).

Convite e aviso de senha trocada não entram: não são opcionais. Sem linha gravada, a pessoa recebe.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep
from hellosquad.api.errors import error_responses

router = APIRouter(tags=["email"])

OptionalEmailTemplate = Literal[
    "approval_pending", "delivery_ready", "payment_confirmed", "payment_problem"
]
OPTIONAL_ORDER: tuple[OptionalEmailTemplate, ...] = (
    "approval_pending",
    "delivery_ready",
    "payment_confirmed",
    "payment_problem",
)

SELECT_PREFERENCES = """
select template::text as template, enabled
from public.email_preferences
where user_id = %s
"""
UPSERT_PREFERENCE = """
insert into public.email_preferences (user_id, template, enabled)
values (%s, %s, %s)
on conflict (user_id, template) do update set enabled = excluded.enabled
"""


class EmailPreference(BaseModel):
    template: OptionalEmailTemplate
    enabled: bool


class EmailPreferenceList(BaseModel):
    items: list[EmailPreference]


class EmailPreferenceUpdate(BaseModel):
    enabled: bool


@router.get(
    "/me/email-preferences",
    summary="Avisos por e-mail que a pessoa recebe (os opcionais; sem escolha gravada, recebe)",
    responses=error_responses(401, 503),
)
async def list_email_preferences(
    principal: CurrentPrincipal, db: DatabaseDep
) -> EmailPreferenceList:
    async with db.transaction_as(principal) as conn:
        rows = await (await conn.execute(SELECT_PREFERENCES, (principal.user_id,))).fetchall()
    stored = {row["template"]: row["enabled"] for row in rows}
    return EmailPreferenceList(
        items=[
            EmailPreference(template=template, enabled=stored.get(template, True))
            for template in OPTIONAL_ORDER
        ]
    )


@router.put(
    "/me/email-preferences/{template}",
    summary="Liga ou desliga um aviso opcional por e-mail da própria pessoa",
    responses=error_responses(401, 422, 503),
)
async def set_email_preference(
    template: OptionalEmailTemplate,
    body: EmailPreferenceUpdate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> EmailPreference:
    async with db.transaction_as(principal) as conn:
        await conn.execute(UPSERT_PREFERENCE, (principal.user_id, template, body.enabled))
    return EmailPreference(template=template, enabled=body.enabled)
