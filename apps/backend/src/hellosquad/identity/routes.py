"""Rotas de identidade. Tudo roda como o usuário do JWT: a RLS decide o que ele enxerga."""

from uuid import UUID

from fastapi import APIRouter, Response, status
from psycopg import errors

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.credits.schemas import CreditBalance
from hellosquad.i18n import t
from hellosquad.identity.schemas import (
    Me,
    Membership,
    User,
    Workspace,
    WorkspaceCreate,
    WorkspaceList,
    WorkspaceRole,
    WorkspaceSummary,
    WorkspaceUpdate,
)

router = APIRouter(tags=["identity"])

# Créditos de cada workspace para a barra "Plano Squad · créditos do mês" (FLUXOS_DA_V46.md §1.1):
# saldo pelo extrato; reservado e ciclo pelos grants válidos agora.
MY_MEMBERSHIPS = """
select w.id, w.slug, w.name, w.locale, m.role,
       pl.name as plan, coalesce(v.provisional, true) as provisional,
       app.credit_balance(w.id) as balance,
       c.reserved, c.cycle_credits, c.cycle_used, c.cycle_ends_at
from public.memberships m
join public.workspaces w on w.id = m.workspace_id
left join public.credit_accounts a on a.workspace_id = w.id
left join public.plan_versions v on v.id = a.plan_version_id
left join public.plans pl on pl.id = v.plan_id
cross join lateral (
  select coalesce(sum(g.reserved), 0) as reserved,
         coalesce(sum(g.amount) filter (where g.origin = 'plan_cycle'), 0) as cycle_credits,
         coalesce(sum(g.amount - g.remaining) filter (where g.origin = 'plan_cycle'), 0)
           as cycle_used,
         max(g.expires_at) filter (where g.origin = 'plan_cycle') as cycle_ends_at
  from public.credit_grants g
  where g.workspace_id = w.id and g.starts_at <= now()
    and (g.expires_at is null or g.expires_at > now())
) c
where m.user_id = %s
order by w.name, w.id
"""

MY_WORKSPACES = """
select w.id, w.slug, w.name, w.locale, w.created_at, m.role
from public.workspaces w
join public.memberships m on m.workspace_id = w.id and m.user_id = %s
order by w.name, w.id
"""

MY_WORKSPACE = """
select w.id, w.slug, w.name, w.locale, w.created_at, m.role
from public.workspaces w
join public.memberships m on m.workspace_id = w.id and m.user_id = %s
where w.id = %s
"""

CREATE_WORKSPACE = "select id, slug, name, locale, created_at from app.create_workspace(%s, %s)"
SET_LOCALE = "select id from app.set_workspace_locale(%s, %s)"


@router.get(
    "/me",
    summary="Usuário autenticado e os workspaces dele, com o saldo de créditos de cada um",
    responses=error_responses(401, 503),
)
async def get_me(principal: CurrentPrincipal, db: DatabaseDep) -> Me:
    async with db.transaction_as(principal) as conn:
        rows = await (await conn.execute(MY_MEMBERSHIPS, (principal.user_id,))).fetchall()
    return Me(
        user=User(
            id=principal.user_id,
            email=principal.email,
            full_name=principal.full_name,
            locale=principal.locale,
        ),
        memberships=[
            Membership(
                workspace=WorkspaceSummary(
                    id=row["id"], slug=row["slug"], name=row["name"], locale=row["locale"]
                ),
                role=row["role"],
                credits=CreditBalance(
                    plan=row["plan"],
                    provisional=row["provisional"],
                    balance=row["balance"],
                    reserved=row["reserved"],
                    available=row["balance"] - row["reserved"],
                    cycle_credits=row["cycle_credits"],
                    cycle_used=row["cycle_used"],
                    cycle_ends_at=row["cycle_ends_at"],
                ),
            )
            for row in rows
        ],
    )


@router.get(
    "/workspaces",
    summary="Workspaces de que o usuário participa",
    responses=error_responses(401, 503),
)
async def list_workspaces(principal: CurrentPrincipal, db: DatabaseDep) -> WorkspaceList:
    async with db.transaction_as(principal) as conn:
        rows = await (await conn.execute(MY_WORKSPACES, (principal.user_id,))).fetchall()
    return WorkspaceList(items=[Workspace(**row) for row in rows])


async def start_welcome(conn, workspace: dict, full_name: str | None) -> None:
    """Primeira fala do Nexo no negócio novo (V4.6 "Boas-vindas"), no idioma do negócio, pelo
    catálogo do backend; o banco grava como mensagem do Nexo na conversa direta com ele."""
    locale, brand = workspace["locale"], workspace["name"]
    first_name = (full_name or "").split()[0] if (full_name or "").strip() else None
    body = (
        t(locale, "welcome.nexo", name=first_name, brand=brand)
        if first_name
        else t(locale, "welcome.nexo_anonymous", brand=brand)
    )
    await conn.execute(
        "select id from app.start_welcome(%s, %s, %s)",
        (workspace["id"], t(locale, "welcome.title"), body),
    )


@router.post(
    "/workspaces",
    status_code=status.HTTP_201_CREATED,
    summary="Cria um workspace; quem cria vira owner e recebe as boas-vindas do Nexo",
    description=(
        "Na mesma transação: o negócio, o idioma (`locale`, opcional) e a conversa direta "
        '"Boas-vindas" com a primeira fala do Nexo e a pergunta do objetivo, no idioma do negócio.'
    ),
    responses=error_responses(401, 409, 422, 503),
)
async def create_workspace(
    payload: WorkspaceCreate, principal: CurrentPrincipal, db: DatabaseDep, response: Response
) -> Workspace:
    try:
        async with db.transaction_as(principal) as conn:
            cursor = await conn.execute(CREATE_WORKSPACE, (payload.name, payload.slug))
            row = await cursor.fetchone()
            if payload.locale is not None and payload.locale != row["locale"]:
                await conn.execute(
                    "select app.set_workspace_locale(%s, %s)", (row["id"], payload.locale)
                )
                row = {**row, "locale": payload.locale}
            await start_welcome(conn, row, principal.full_name)
    except errors.UniqueViolation as exc:
        if exc.diag.constraint_name == "workspaces_slug_key":
            raise ApiError(
                409, "slug_taken", "Já existe um workspace com esse endereço (slug)."
            ) from exc
        raise
    except errors.CheckViolation as exc:
        # A lista de reservados fica só no banco (app.reserved_workspace_slugs).
        if exc.diag.constraint_name == "workspaces_slug_not_reserved":
            raise ApiError(
                422, "slug_reserved", "Esse endereço é reservado. Escolha outro."
            ) from exc
        raise
    response.headers["Location"] = f"/workspaces/{row['id']}"
    return Workspace(**row, role=WorkspaceRole.owner)


@router.get(
    "/workspaces/{workspace_id}",
    summary="Um workspace de que o usuário participa",
    responses=error_responses(401, 404, 422, 503),
)
async def get_workspace(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> Workspace:
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(MY_WORKSPACE, (principal.user_id, workspace_id))).fetchone()
    if row is None:
        # Inexistente e alheio respondem igual: não revela que o workspace existe.
        raise ApiError(404, "workspace_not_found", "Workspace não encontrado.")
    return Workspace(**row)


@router.patch(
    "/workspaces/{workspace_id}",
    summary="Muda o idioma do negócio (owner ou admin)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def update_workspace(
    workspace_id: UUID, payload: WorkspaceUpdate, principal: CurrentPrincipal, db: DatabaseDep
) -> Workspace:
    async with db.transaction_as(principal) as conn:
        await conn.execute(SET_LOCALE, (workspace_id, payload.locale))
        row = await (await conn.execute(MY_WORKSPACE, (principal.user_id, workspace_id))).fetchone()
    return Workspace(**row)
