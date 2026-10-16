"""Memória da Marca: dossiê, "<Agente> percebeu", correção com versão, busca, fontes e conflitos.

Leitura pela RLS do usuário; decisões só por funções app.* (owner, idempotentes).
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.domain import MemoryConflictState, MemorySuggestionState
from hellosquad.i18n import t
from hellosquad.memory.schemas import (
    BrandFact,
    BrandFactCorrection,
    BrandFactCreate,
    BrandFactHistory,
    BrandFactStateChange,
    BrandProfile,
    BrandProfileUpdate,
    FactSource,
    FactSourceList,
    MemoryAreaGroup,
    MemoryConflict,
    MemoryConflictList,
    MemoryConflictResolve,
    MemoryDossier,
    MemoryPending,
    MemorySearchHit,
    MemorySearchResult,
    MemorySuggestion,
    MemorySuggestionDecided,
    MemorySuggestionDecisionCreate,
    MemorySuggestionList,
    MemoryTopic,
)

router = APIRouter(tags=["memory"])

FACT_COLUMNS = """
f.id, f.workspace_id, f.area::text, f.topic, f.key, f.content, f.content_json, f.state::text,
f.source_type::text, f.source_id, f.origin, f.used_by_agents, f.perceived_by_agent_id::text,
f.confidence, f.valid_from, f.valid_until, f.version, f.supersedes_id, f.superseded_at,
f.confirmed_by, f.confirmed_at, f.created_at, f.updated_at, f.unused_from::text
"""

SUGGESTION_SELECT = """
select s.id, s.workspace_id, s.agent_id::text, s.title, s.explanation, s.question, s.origin,
       s.area::text, s.topic, s.key, s.content, s.used_by_agents, s.source_id, s.run_id,
       s.state::text, s.decision::text, s.decided_by, s.decided_at, s.resulting_fact_id,
       s.created_at, s.updated_at
from public.memory_suggestions s
"""

CURRENT_FACTS = f"""
select {FACT_COLUMNS}
from public.brand_facts f
where f.workspace_id = %s and f.superseded_at is null
order by f.area, min(f.created_at) over (partition by f.area, f.topic), f.topic, f.created_at, f.id
"""

WORKSPACE_SUMMARY = """
select w.name,
       (select count(*) from public.brand_facts f
         where f.workspace_id = w.id and f.superseded_at is null
           and f.state in ('confirmed', 'decision')) as confirmed_count,
       (select count(*) from public.memory_suggestions s
         where s.workspace_id = w.id and s.state <> 'done') as suggestions,
       (select count(*) from public.memory_conflicts c
         where c.workspace_id = w.id and c.state = 'open') as conflicts,
       (select count(*) from public.brand_facts f
         where f.workspace_id = w.id and f.superseded_at is null
           and f.state = 'outdated') as outdated
from public.workspaces w
where w.id = %s
"""

LIST_SOURCES = """
select s.id, s.kind::text, s.name, s.state::text, s.permissions, s.last_sync_at, s.created_at,
       s.updated_at,
       (select count(*) from public.brand_facts f
         where f.source_id = s.id and f.superseded_at is null) as fact_count
from public.fact_sources s
where s.workspace_id = %s
order by s.created_at, s.name
"""

LIST_SUGGESTIONS = f"""
{SUGGESTION_SELECT}
where s.workspace_id = %(workspace_id)s
  and (%(state)s::public.memory_suggestion_state is null
       or s.state = %(state)s::public.memory_suggestion_state)
order by s.created_at desc, s.id desc
limit %(limit)s
"""

GET_SUGGESTION = f"""
{SUGGESTION_SELECT}
where s.id = %s and s.workspace_id in (select app.current_user_workspace_ids())
"""

GET_FACT = f"""
select {FACT_COLUMNS}
from public.brand_facts f
where f.id = %s and f.workspace_id in (select app.current_user_workspace_ids())
"""

FACT_LINEAGE = f"""
with recursive older as (
  select f.id, f.supersedes_id from public.brand_facts f where f.id = %(id)s
  union all
  select p.id, p.supersedes_id from public.brand_facts p join older o on p.id = o.supersedes_id
), newer as (
  select f.id from public.brand_facts f where f.id = %(id)s
  union all
  select c.id from public.brand_facts c join newer n on c.supersedes_id = n.id
)
select {FACT_COLUMNS}
from public.brand_facts f
where f.id in (select id from older union select id from newer)
order by f.version desc
"""

SEARCH_FACTS = f"""
select {FACT_COLUMNS}, ts_rank_cd(f.search_vector, q.query) as rank
from public.brand_facts f
cross join (
  select websearch_to_tsquery(app.memory_search_config(w.locale), %(q)s) as query
  from public.workspaces w
  where w.id = %(workspace_id)s
) q
where f.workspace_id = %(workspace_id)s
  and f.superseded_at is null
  and f.search_vector @@ q.query
order by rank desc, f.created_at, f.id
limit %(limit)s
"""

LIST_CONFLICTS = """
select c.id, c.workspace_id, c.state::text, c.resolution::text, c.resulting_fact_id,
       c.resolved_by, c.resolved_at, c.created_at, c.updated_at, c.fact_a_id, c.fact_b_id
from public.memory_conflicts c
where c.workspace_id = %(workspace_id)s
  and (%(state)s::public.memory_conflict_state is null
       or c.state = %(state)s::public.memory_conflict_state)
order by c.created_at desc, c.id desc
"""

GET_CONFLICT = """
select c.id, c.workspace_id, c.state::text, c.resolution::text, c.resulting_fact_id,
       c.resolved_by, c.resolved_at, c.created_at, c.updated_at, c.fact_a_id, c.fact_b_id
from public.memory_conflicts c
where c.id = %s and c.workspace_id in (select app.current_user_workspace_ids())
"""

FACTS_BY_ID = f"select {FACT_COLUMNS} from public.brand_facts f where f.id = any(%s)"

DECIDE_SUGGESTION = {
    "confirm": "select id from app.confirm_suggestion(%(id)s)",
    "correct": "select id from app.correct_suggestion(%(id)s, %(content)s)",
    "discard": "select id from app.discard_suggestion(%(id)s)",
}


FACT_STATE_CHANGES = {
    "stop_using": "select id from app.stop_using_fact(%s)",
    "resume_using": "select id from app.resume_using_fact(%s)",
    "confirm": "select id from app.confirm_fact(%s)",
    "keep": "select id from app.keep_fact(%s)",
}

PROFILE = """
select p.description, p.squad_summary, p.summary_agent_id::text, p.summary_updated_at
from public.brand_profiles p
where p.workspace_id = %s
"""


async def fetchall(
    conn: AsyncConnection[DictRow], query: str, params: object = None
) -> list[DictRow]:
    return await (await conn.execute(query, params)).fetchall()


async def load_suggestion(conn: AsyncConnection[DictRow], suggestion_id: UUID) -> MemorySuggestion:
    row = await (await conn.execute(GET_SUGGESTION, (suggestion_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Sugestão não encontrada.")
    return MemorySuggestion(**row)


async def load_fact(conn: AsyncConnection[DictRow], fact_id: UUID) -> BrandFact:
    row = await (await conn.execute(GET_FACT, (fact_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Conhecimento não encontrado.")
    return BrandFact(**row)


async def conflicts_from_rows(
    conn: AsyncConnection[DictRow], rows: list[DictRow]
) -> list[MemoryConflict]:
    ids = [row[column] for row in rows for column in ("fact_a_id", "fact_b_id")]
    facts = {row["id"]: BrandFact(**row) for row in await fetchall(conn, FACTS_BY_ID, (ids,))}
    return [
        MemoryConflict(
            **{k: v for k, v in row.items() if k not in ("fact_a_id", "fact_b_id")},
            fact_a=facts[row["fact_a_id"]],
            fact_b=facts[row["fact_b_id"]],
        )
        for row in rows
    ]


def group_facts(facts: list[BrandFact]) -> list[MemoryAreaGroup]:
    areas: list[MemoryAreaGroup] = []
    for fact in facts:
        if not areas or areas[-1].area != fact.area:
            areas.append(MemoryAreaGroup(area=fact.area, topics=[]))
        topics = areas[-1].topics
        if not topics or topics[-1].topic != fact.topic:
            topics.append(MemoryTopic(topic=fact.topic, facts=[]))
        topics[-1].facts.append(fact)
    return areas


@router.get(
    "/workspaces/{workspace_id}/memory",
    summary="Dossiê da Memória da Marca: por área e assunto, com estado, fonte e quem usa",
    responses=error_responses(401, 404, 422, 503),
)
async def get_memory(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> MemoryDossier:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        summary = await (await conn.execute(WORKSPACE_SUMMARY, (workspace_id,))).fetchone()
        facts = [BrandFact(**row) for row in await fetchall(conn, CURRENT_FACTS, (workspace_id,))]
        sources = await fetchall(conn, LIST_SOURCES, (workspace_id,))
        suggestions = await fetchall(
            conn,
            LIST_SUGGESTIONS,
            {"workspace_id": workspace_id, "state": MemorySuggestionState.open, "limit": 100},
        )
        profile = await (await conn.execute(PROFILE, (workspace_id,))).fetchone()
    return MemoryDossier(
        workspace_id=workspace_id,
        brand_name=summary["name"],
        profile=BrandProfile(**profile) if profile else None,
        confirmed_count=summary["confirmed_count"],
        pending=MemoryPending(
            suggestions=summary["suggestions"],
            conflicts=summary["conflicts"],
            outdated=summary["outdated"],
        ),
        sources=[FactSource(**row) for row in sources],
        areas=group_facts(facts),
        suggestions=[MemorySuggestion(**row) for row in suggestions],
    )


@router.get(
    "/workspaces/{workspace_id}/memory/suggestions",
    summary='"<Agente> percebeu": sugestões do squad, mais recente primeiro',
    responses=error_responses(401, 404, 422, 503),
)
async def list_suggestions(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    state: Annotated[
        MemorySuggestionState | None,
        Query(description="`open` aberto, `seen` visto, `done` feito."),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MemorySuggestionList:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await fetchall(
            conn, LIST_SUGGESTIONS, {"workspace_id": workspace_id, "state": state, "limit": limit}
        )
    return MemorySuggestionList(items=[MemorySuggestion(**row) for row in rows])


@router.post(
    "/memory/suggestions/{suggestion_id}/decision",
    summary="Confirmar, corrigir ou descartar uma sugestão (idempotente; só o owner)",
    description=(
        "A primeira decisão vale; repetir (clique duplo, retry) responde 200 com o mesmo "
        "estado, sem efeito novo. `confirm` e `correct` criam o conhecimento Confirmado (se o "
        "mesmo assunto e chave já existem, viram a versão nova dele); `discard` não cria "
        "conhecimento e a mesma sugestão não volta. Só o owner decide."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def decide_suggestion(
    suggestion_id: UUID,
    payload: MemorySuggestionDecisionCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> MemorySuggestionDecided:
    async with db.transaction_as(principal) as conn:
        await conn.execute(
            DECIDE_SUGGESTION[payload.decision],
            {"id": suggestion_id, "content": payload.content},
        )
        suggestion = await load_suggestion(conn, suggestion_id)
        fact = (
            await load_fact(conn, suggestion.resulting_fact_id)
            if suggestion.resulting_fact_id
            else None
        )
    return MemorySuggestionDecided(**suggestion.model_dump(), resulting_fact=fact)


@router.post(
    "/memory/facts/{fact_id}/correct",
    summary="Corrigir um conhecimento: versão nova, Confirmado; a anterior fica no histórico",
    description=(
        "Nunca edita: a versão corrigida sai de uso (`superseded_at`) e a nova passa a valer "
        "para o squad no próximo run. Repetir o mesmo texto sobre a versão antiga devolve a "
        "nova. Descartado não se corrige; em conflito, a correção é pelo conflito. Só o owner "
        "corrige."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def correct_fact(
    fact_id: UUID,
    payload: BrandFactCorrection,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> BrandFact:
    async with db.transaction_as(principal) as conn:
        row = await (
            await conn.execute(
                "select id from app.correct_fact(%s, %s)", (fact_id, payload.content)
            )
        ).fetchone()
        return await load_fact(conn, row["id"])


@router.get(
    "/memory/facts/{fact_id}/history",
    summary="Versões de um conhecimento e as sugestões que o originaram",
    responses=error_responses(401, 404, 422, 503),
)
async def fact_history(
    fact_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> BrandFactHistory:
    async with db.transaction_as(principal) as conn:
        versions = [BrandFact(**row) for row in await fetchall(conn, FACT_LINEAGE, {"id": fact_id})]
        if not versions:
            raise ApiError(404, "not_found", "Conhecimento não encontrado.")
        suggestions = await fetchall(
            conn,
            f"{SUGGESTION_SELECT} where s.resulting_fact_id = any(%s) order by s.created_at desc",
            ([version.id for version in versions],),
        )
    return BrandFactHistory(
        fact_id=fact_id,
        versions=versions,
        suggestions=[MemorySuggestion(**row) for row in suggestions],
    )


@router.get(
    "/workspaces/{workspace_id}/memory/search",
    summary="Busca textual nos conhecimentos atuais (chave, valor e assunto)",
    description=(
        "Busca do Postgres na configuração do idioma do workspace (ADR-0009): palavras em qualquer "
        'ordem, com radical ("palavras" acha "palavra"); aspas para frase exata e `or` para '
        "alternativas. Traz todos os estados; Descartado e Não usado vêm marcados pelo estado."
    ),
    responses=error_responses(401, 404, 422, 503),
)
async def search_memory(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    q: Annotated[str, Query(min_length=1, max_length=200, description="Texto da busca.")],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> MemorySearchResult:
    query = q.strip()
    if not query:
        raise ApiError(422, "validation_error", "Escreva o que quer buscar.")
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await fetchall(
            conn, SEARCH_FACTS, {"workspace_id": workspace_id, "q": query, "limit": limit}
        )
    return MemorySearchResult(query=query, items=[MemorySearchHit(**row) for row in rows])


@router.get(
    "/workspaces/{workspace_id}/memory/sources",
    summary='"De onde vem": fontes da memória com estado e permissões',
    responses=error_responses(401, 404, 422, 503),
)
async def list_sources(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> FactSourceList:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await fetchall(conn, LIST_SOURCES, (workspace_id,))
    return FactSourceList(items=[FactSource(**row) for row in rows])


@router.get(
    "/workspaces/{workspace_id}/memory/conflicts",
    summary="Conflitos: duas versões em uso que dizem coisas diferentes",
    responses=error_responses(401, 404, 422, 503),
)
async def list_conflicts(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    state: Annotated[MemoryConflictState | None, Query(description="`open` ou `resolved`.")] = None,
) -> MemoryConflictList:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await fetchall(conn, LIST_CONFLICTS, {"workspace_id": workspace_id, "state": state})
        return MemoryConflictList(items=await conflicts_from_rows(conn, rows))


@router.post(
    "/memory/conflicts/{conflict_id}/resolve",
    summary='Resolver um conflito: "Vale este" ou "Nenhum dos dois: corrigir" (só o owner)',
    description=(
        "`keep_fact_id` confirma a versão escolhida; `content` cria uma versão nova Confirmado. "
        "A outra sai da memória como Descartado (o registro fica). Repetir devolve o conflito "
        "já resolvido."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def resolve_conflict(
    conflict_id: UUID,
    payload: MemoryConflictResolve,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> MemoryConflict:
    async with db.transaction_as(principal) as conn:
        await conn.execute(
            "select id from app.resolve_conflict(%s, %s, %s)",
            (conflict_id, payload.keep_fact_id, payload.content),
        )
        row = await (await conn.execute(GET_CONFLICT, (conflict_id,))).fetchone()
        if row is None:
            raise ApiError(404, "not_found", "Conflito não encontrado.")
        return (await conflicts_from_rows(conn, [row]))[0]


@router.post(
    "/memory/facts/{fact_id}/state",
    summary='Não usar mais, voltar a usar, confirmar ou "continua valendo" (só o owner)',
    description=(
        "Muda o estado sem criar versão: `stop_using` guarda o estado de antes e põe Não usado; "
        "`resume_using` devolve esse estado; `confirm` vale para Da fonte e Observado; `keep` "
        "devolve o Desatualizado a Da fonte. Repetir responde 200 com o mesmo estado; ação que "
        "não cabe no estado atual responde 409. Só o owner decide."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def change_fact_state(
    fact_id: UUID,
    payload: BrandFactStateChange,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> BrandFact:
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(FACT_STATE_CHANGES[payload.action], (fact_id,))).fetchone()
        return await load_fact(conn, row["id"])


@router.post(
    "/workspaces/{workspace_id}/memory/facts",
    status_code=201,
    summary="Adicionar conhecimento: declarado por você, já confirmado (só o owner)",
    description=(
        'Entra como Confirmado na fonte "Declarado por você" e todo o squad passa a usar. Sem '
        'assunto, vai para o primeiro assunto da área; sem chave, "Contado por você" (no '
        "idioma do workspace)."
    ),
    responses=error_responses(401, 403, 404, 422, 503),
)
async def add_fact(
    workspace_id: UUID,
    payload: BrandFactCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> BrandFact:
    async with db.transaction_as(principal) as conn:
        locale = await ensure_workspace_locale(conn, workspace_id)
        row = await (
            await conn.execute(
                "select id from app.add_fact(%s, %s::public.memory_area, %s, %s, %s)",
                (
                    workspace_id,
                    payload.area,
                    payload.topic or t(locale, f"memory.default_topic.{payload.area}"),
                    payload.key or t(locale, "memory.added_key"),
                    payload.content,
                ),
            )
        ).fetchone()
        return await load_fact(conn, row["id"])


@router.post(
    "/memory/suggestions/{suggestion_id}/seen",
    summary='Marca "<Agente> percebeu" como visto (aberto → visto; só o owner)',
    responses=error_responses(401, 403, 404, 422, 503),
)
async def mark_suggestion_seen(
    suggestion_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> MemorySuggestion:
    async with db.transaction_as(principal) as conn:
        await conn.execute("select id from app.mark_suggestion_seen(%s)", (suggestion_id,))
        return await load_suggestion(conn, suggestion_id)


@router.put(
    "/workspaces/{workspace_id}/memory/profile",
    summary="Descrição do negócio no dossiê (só o owner); a síntese é do squad",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def update_profile(
    workspace_id: UUID,
    payload: BrandProfileUpdate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> BrandProfile:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        await conn.execute(
            "select app.set_brand_description(%s, %s)", (workspace_id, payload.description)
        )
        row = await (await conn.execute(PROFILE, (workspace_id,))).fetchone()
    return BrandProfile(**row)


async def ensure_workspace_locale(conn: AsyncConnection[DictRow], workspace_id: UUID) -> str:
    await ensure_workspace(conn, workspace_id)
    row = await (
        await conn.execute("select locale from public.workspaces where id = %s", (workspace_id,))
    ).fetchone()
    return row["locale"]
