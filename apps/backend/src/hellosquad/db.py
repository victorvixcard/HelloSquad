"""Pool de conexões da API (papel hellosquad_api) e transação com a identidade do usuário."""

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

from hellosquad.auth import Principal

ROLE_CHECK = """
select rolsuper,
       rolbypassrls,
       pg_has_role(current_user, 'authenticated', 'SET') as can_set_authenticated
from pg_catalog.pg_roles
where rolname = current_user
"""

# set_config(..., true) é o SET LOCAL parametrizável (o PostgREST faz o mesmo): vale só até o fim da
# transação, então nada da identidade de um usuário sobra na conexão devolvida ao pool.
SET_USER_CONTEXT = """
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', %s, true),
       set_config('request.jwt.claim.sub', %s, true)
"""


IS_PLATFORM_ADMIN = "select app.is_platform_admin() as ok"


class UnsafeDatabaseRoleError(RuntimeError):
    pass


class NotPlatformAdminError(PermissionError):
    pass


class Database:
    def __init__(self, conninfo: str, *, min_size: int, max_size: int) -> None:
        self._pool = AsyncConnectionPool(
            conninfo,
            min_size=min_size,
            max_size=max_size,
            open=False,
            # Sem prepared statements: compatível com o pooler do Supabase em modo transação.
            kwargs={"autocommit": True, "prepare_threshold": None, "row_factory": dict_row},
            check=AsyncConnectionPool.check_connection,
            name="hellosquad-api",
        )

    async def open(self) -> None:
        await self._pool.open(wait=True, timeout=10)
        async with self._pool.connection() as conn:
            role = await (await conn.execute(ROLE_CHECK)).fetchone()
        if role is None or role["rolsuper"] or role["rolbypassrls"]:
            await self._pool.close()
            raise UnsafeDatabaseRoleError(
                "API_DATABASE_URL usa papel que ignora a RLS; a API conecta só como hellosquad_api."
            )
        if not role["can_set_authenticated"]:
            await self._pool.close()
            raise UnsafeDatabaseRoleError("o papel da API não consegue assumir authenticated.")

    async def close(self) -> None:
        await self._pool.close()

    @asynccontextmanager
    async def transaction_as_billing(self) -> AsyncIterator[AsyncConnection[DictRow]]:
        """Transação do webhook de pagamento (não há usuário): papel hellosquad_billing, que só
        executa app.billing_apply_event e não lê tabela nenhuma."""
        async with self._pool.connection() as conn, conn.transaction():
            await conn.execute("select set_config('role', 'hellosquad_billing', true)")
            yield conn

    @asynccontextmanager
    async def transaction_as_admin(
        self, principal: Principal
    ) -> AsyncIterator[AsyncConnection[DictRow]]:
        """Transação de uma rota /admin/*: confere platform_admins como authenticated e só então assume
        hellosquad_admin (sem BYPASSRLS; as políticas dele exigem o JWT de um Super Admin)."""
        async with self._pool.connection() as conn, conn.transaction():
            await conn.execute(
                SET_USER_CONTEXT, (json.dumps(principal.claims), str(principal.user_id))
            )
            row = await (await conn.execute(IS_PLATFORM_ADMIN)).fetchone()
            if row is None or not row["ok"]:
                raise NotPlatformAdminError(str(principal.user_id))
            await conn.execute("select set_config('role', 'hellosquad_admin', true)")
            yield conn

    @asynccontextmanager
    async def transaction_as(self, principal: Principal) -> AsyncIterator[AsyncConnection[DictRow]]:
        """Transação em que o banco enxerga o usuário do JWT: papel authenticated, RLS valendo."""
        async with self._pool.connection() as conn, conn.transaction():
            await conn.execute(
                SET_USER_CONTEXT, (json.dumps(principal.claims), str(principal.user_id))
            )
            yield conn
