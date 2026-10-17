"""Squad IA do Super Admin (SA3a): versões da SOUL por seção, skills, agent.yaml e regras
compartilhadas no banco, com rascunho, publicar, descartar, voltar versão, diff e "o que ele lê".

Leitura e escrita só para platform_admins (papel hellosquad_admin com o JWT do Super Admin); toda
escrita passa pelas funções app.admin_squad_* / app.admin_rule_doc_save, que gravam audit_events.
"""

import difflib
import math
import re
from collections.abc import Iterable, Mapping
from typing import Annotated, Any
from uuid import UUID

import yaml
from fastapi import APIRouter, Query
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.admin.routes import AdminTx, fetchall, fetchone
from hellosquad.admin.squad_schemas import (
    AgentDetail,
    ConfigEdit,
    ConfigFields,
    ConfigVersion,
    ContentEdit,
    DiffLine,
    PromptBlock,
    PromptPreview,
    RestoreRequest,
    RuleDocDetail,
    RuleDocEdit,
    RuleDocList,
    RuleDocSummary,
    RuleParagraph,
    RuleSaveResult,
    RuleVersion,
    SectionEdit,
    SectionKey,
    SharedDetail,
    SharedDoc,
    SharedUnit,
    SkillDetail,
    SkillSection,
    SkillSummary,
    SkillVersion,
    SoulSection,
    SoulVersion,
    SquadAgentSummary,
    SquadOverview,
    VersionContent,
    VersionDiff,
    VersionList,
    VersionRef,
)
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.domain import AgentId
from hellosquad.squad.loader import (
    FRONT_MATTER,
    HEADING,
    OUT_OF_PROMPT,
    REFLECT_SKILL,
    REPLY_SKILL,
    SHARED_RULES_HEADING,
    SquadDefinitionError,
    SquadLoader,
    parse_skill,
    parse_soul,
    render_soul,
)
from hellosquad.squad.loader import (
    SoulSection as SoulSectionData,
)
from hellosquad.squad.prompt import (
    RunContext,
    production_messages,
    reply_messages,
    system_blocks,
)
from hellosquad.squad.versions import (
    ACTIVE_FINGERPRINT,
    ACTIVE_SECTIONS,
    ACTIVE_VERSIONS,
    SHARED_FILES,
    Unit,
    build_snapshot,
)

router = APIRouter(prefix="/admin", tags=["admin"])

CHARS_PER_TOKEN = 4
TOKEN_ESTIMATE_METHOD = "caracteres/4 (estimativa; a contagem real vem do usage de cada run)"
PROMPT_MARKS = ("decided", "current_base")
RULES_BLOCK = "### Regras de negócio"
EXAMPLE_CONTEXT = {
    "locale": "pt-BR",
    "brand_name": "Miolo",
    "work_title": "Trabalho de exemplo",
    "request": "Pedido de exemplo para conferir o que o agente lê.",
}
READ_ERRORS = error_responses(401, 403, 404, 422, 503)
WRITE_ERRORS = error_responses(401, 403, 404, 409, 422, 503)

VERSION_ROWS = """
select v.id, v.kind, v.agent_id::text as agent_id, v.key, v.version, v.status, v.author, v.note,
       v.created_at, v.published_at, v.body, r.version as restored_from_version
from public.squad_versions v
left join public.squad_versions r on r.id = v.restored_from_id
"""
SECTION_ROWS = """
select s.version_id, s.section, s.position, s.heading, s.body, s.in_prompt
from public.agent_prompt_sections s
where s.version_id = any(%s)
order by s.version_id, s.position
"""


# ------------------------------------------------------------------------------------------------
# Leitura das versões
# ------------------------------------------------------------------------------------------------


def ref(row: Mapping[str, Any]) -> VersionRef:
    return VersionRef(
        id=row["id"],
        kind=row["kind"],
        agent_id=row["agent_id"],
        key=row["key"],
        version=row["version"],
        status=row["status"],
        author=row["author"],
        note=row["note"],
        created_at=row["created_at"],
        published_at=row["published_at"],
        restored_from_version=row["restored_from_version"],
    )


async def unit_rows(
    conn: AsyncConnection[DictRow], unit: Unit, statuses: Iterable[str] | None = None
) -> list[dict]:
    sql = VERSION_ROWS + (
        " where v.kind = %s and v.agent_id is not distinct from %s::public.agent_id and v.key = %s"
    )
    params: list[Any] = [unit.kind, unit.agent_id, unit.key]
    if statuses is not None:
        sql += " and v.status = any(%s)"
        params.append(list(statuses))
    return await fetchall(conn, sql + " order by v.version", params)


def pick(rows: list[dict], status: str) -> dict | None:
    return next((r for r in rows if r["status"] == status), None)


async def version_row(conn: AsyncConnection[DictRow], version_id: UUID) -> dict:
    row = await fetchone(conn, VERSION_ROWS + " where v.id = %s", (version_id,))
    if row is None:
        raise ApiError(404, "not_found", "error.not_found")
    return row


async def sections_by_version(
    conn: AsyncConnection[DictRow], version_ids: list[UUID]
) -> dict[UUID, list[SoulSectionData]]:
    found: dict[UUID, list[SoulSectionData]] = {}
    for row in await fetchall(conn, SECTION_ROWS, (version_ids,)):
        found.setdefault(row["version_id"], []).append(
            SoulSectionData(
                section=row["section"],
                position=row["position"],
                heading=row["heading"],
                body=row["body"],
                in_prompt=row["in_prompt"],
            )
        )
    return found


async def content_of(conn: AsyncConnection[DictRow], row: Mapping[str, Any]) -> str:
    if row["kind"] != "soul":
        return row["body"]
    sections = await sections_by_version(conn, [row["id"]])
    return render_soul(sections.get(row["id"], []))


def words(text: str) -> int:
    return len(text.split())


def soul_version(
    row: Mapping[str, Any], sections: list[SoulSectionData], changed: Mapping[str, int]
) -> SoulVersion:
    ordered = sorted(sections, key=lambda s: s.position)
    in_prompt = [s for s in ordered if s.in_prompt]
    title = next((s.heading for s in ordered if s.section == "identidade"), "")
    return SoulVersion(
        ref=ref(row),
        title=title,
        sections=[
            SoulSection(
                section=s.section,
                position=s.position,
                heading=s.heading,
                body=s.body,
                in_prompt=s.in_prompt,
                words=words(s.body),
                chars=len(s.body),
                changed_in_version=changed.get(s.section, row["version"]),
            )
            for s in ordered
        ],
        sections_in_prompt=len(in_prompt),
        chars_in_prompt=len(render_soul(ordered, prompt_only=True).strip()),
    )


def section_signature(s: SoulSectionData) -> tuple[str, str, bool]:
    return (s.heading, s.body, s.in_prompt)


def changed_versions(
    rows: list[dict], sections: Mapping[UUID, list[SoulSectionData]]
) -> dict[UUID, dict[str, int]]:
    """Por versão da SOUL: em que versão cada seção mudou por último (publicadas em ordem; o
    rascunho compara com a ativa)."""
    result: dict[UUID, dict[str, int]] = {}
    previous: dict[str, tuple[tuple[str, str, bool], int]] = {}
    active: dict[str, tuple[tuple[str, str, bool], int]] = {}
    for row in sorted(rows, key=lambda r: r["version"]):
        if row["status"] not in ("active", "superseded"):
            continue
        current = {}
        for s in sections.get(row["id"], []):
            signature = section_signature(s)
            before = previous.get(s.section)
            current[s.section] = (
                (signature, before[1])
                if before and before[0] == signature
                else (signature, row["version"])
            )
        previous = current
        result[row["id"]] = {k: v[1] for k, v in current.items()}
        if row["status"] == "active":
            active = current
    for row in rows:
        if row["status"] != "draft":
            continue
        marks = {}
        for s in sections.get(row["id"], []):
            before = active.get(s.section)
            same = before is not None and before[0] == section_signature(s)
            marks[s.section] = before[1] if same and before else row["version"]
        result[row["id"]] = marks
    return result


async def soul_versions(
    conn: AsyncConnection[DictRow], agent_id: str
) -> tuple[SoulVersion | None, SoulVersion | None]:
    rows = await unit_rows(conn, Unit("soul", agent_id, "SOUL.md"))
    sections = await sections_by_version(conn, [r["id"] for r in rows])
    changed = changed_versions(rows, sections)
    active, draft = pick(rows, "active"), pick(rows, "draft")
    return (
        soul_version(active, sections[active["id"]], changed[active["id"]]) if active else None,
        soul_version(draft, sections[draft["id"]], changed[draft["id"]]) if draft else None,
    )


TOOL_LINE = re.compile(r"^  - ([^\s#]+)\s*(?:#\s*(.*))?$")


def config_fields(text: str) -> ConfigFields:
    config = yaml.safe_load(text) or {}
    notes: dict[str, str] = {}
    inside = False
    for line in text.splitlines():
        if line.startswith("ferramentas:"):
            inside = True
            continue
        if inside:
            match = TOOL_LINE.match(line)
            if not match:
                inside = False
                continue
            if match.group(2):
                notes[match.group(1)] = match.group(2).strip()
    return ConfigFields(
        tools=list(config.get("ferramentas") or []),
        tool_notes=notes,
        collaborators=list(config.get("colabora_com") or []),
        max_autonomy=config.get("autonomia_maxima"),
        model=dict(config.get("modelo") or {}),
        memory=dict(config.get("memoria") or {}),
        deliveries=[str(d) for d in config.get("deliveries") or []],
    )


def config_version(row: Mapping[str, Any] | None) -> ConfigVersion | None:
    if row is None:
        return None
    return ConfigVersion(ref=ref(row), yaml=row["body"], fields=config_fields(row["body"]))


def skill_version(row: Mapping[str, Any] | None) -> SkillVersion | None:
    if row is None:
        return None
    skill = parse_skill(row["key"], row["body"])
    titles = list(HEADING.finditer(skill.body))
    sections = []
    for index, match in enumerate(titles):
        if match.group(1) != "##":
            continue
        end = titles[index + 1].start() if index + 1 < len(titles) else len(skill.body)
        sections.append(
            SkillSection(title=match.group(2).strip(), body=skill.body[match.end() : end].strip())
        )
    return SkillVersion(
        ref=ref(row),
        content=row["body"],
        meta=skill.meta,
        title=skill.meta.get("titulo"),
        sections=sections,
        chars=len(row["body"]),
    )


async def active_snapshot(conn: AsyncConnection[DictRow]):
    versions = await fetchall(conn, ACTIVE_VERSIONS)
    sections = await fetchall(conn, ACTIVE_SECTIONS)
    return build_snapshot(versions, sections)


async def agent_summaries(conn: AsyncConnection[DictRow]) -> list[SquadAgentSummary]:
    rows = await fetchall(
        conn,
        VERSION_ROWS + " where v.agent_id is not null and v.status in ('active', 'draft')",
    )
    usage = {
        r["agent_id"]: r
        for r in await fetchall(
            conn,
            """
            select r.agent_id::text as agent_id, count(*)::int as runs,
                   avg(r.cost_usd)::float as avg_cost
            from public.runs r
            where r.status = 'succeeded' and r.created_at > now() - interval '30 days'
            group by r.agent_id
            """,
        )
    }
    prompts = {
        r["agent_id"]: r["content_hash"]
        for r in await fetchall(
            conn,
            """
            select distinct on (p.agent_id) p.agent_id::text as agent_id, p.content_hash
            from public.agent_prompt_versions p
            order by p.agent_id, p.created_at desc
            """,
        )
    }
    summaries = []
    for agent in AgentId:
        mine = [r for r in rows if r["agent_id"] == agent.value]
        config_row = next(
            (r for r in mine if r["kind"] == "config" and r["status"] == "active"), None
        )
        config = yaml.safe_load(config_row["body"]) if config_row else {}
        soul_row = next((r for r in mine if r["kind"] == "soul" and r["status"] == "active"), None)
        model = config.get("modelo") or {}
        used = usage.get(agent.value)
        summaries.append(
            SquadAgentSummary(
                id=agent.value,
                name=config.get("name", agent.value),
                article=config.get("artigo"),
                role=config.get("papel"),
                role_full=config.get("papel_completo"),
                color=config.get("cor"),
                shape=config.get("forma"),
                default_model=model.get("padrao"),
                effort=model.get("effort"),
                deliveries=len(config.get("deliveries") or []),
                skills_written=sum(
                    1 for r in mine if r["kind"] == "skill" and r["status"] == "active"
                ),
                soul_version=soul_row["version"] if soul_row else None,
                config_version=config_row["version"] if config_row else None,
                pending_drafts=sum(1 for r in mine if r["status"] == "draft"),
                last_prompt_hash=prompts.get(agent.value),
                runs_30d=used["runs"] if used else 0,
                avg_cost_usd_30d=used["avg_cost"] if used else None,
            )
        )
    return summaries


async def shared_units(conn: AsyncConnection[DictRow]) -> list[SharedUnit]:
    units = []
    for doc in SHARED_FILES:
        rows = await unit_rows(conn, Unit("shared", None, doc), ("active", "draft"))
        active, draft = pick(rows, "active"), pick(rows, "draft")
        units.append(
            SharedUnit(
                doc=doc,
                active=ref(active) if active else None,
                draft=ref(draft) if draft else None,
            )
        )
    return units


def require_agent(agent_id: str) -> str:
    try:
        return AgentId(agent_id).value
    except ValueError as exc:
        raise ApiError(404, "not_found", "error.not_found") from exc


@router.get(
    "/squad",
    response_model=SquadOverview,
    summary="Squad: os sete com versão da Alma e do agent.yaml, rascunhos e custo médio",
    responses=READ_ERRORS,
)
async def get_squad(tx: AdminTx) -> SquadOverview:
    async with tx() as conn:
        fingerprint = await fetchone(conn, ACTIVE_FINGERPRINT)
        return SquadOverview(
            agents=await agent_summaries(conn),
            shared=await shared_units(conn),
            fingerprint=fingerprint["fingerprint"] if fingerprint else None,
        )


@router.get(
    "/squad/agents/{agent_id}",
    response_model=AgentDetail,
    summary="Agente: Alma por seção, agent.yaml e skills (ativa e rascunho)",
    responses=READ_ERRORS,
)
async def get_agent(agent_id: str, tx: AdminTx) -> AgentDetail:
    agent_id = require_agent(agent_id)
    async with tx() as conn:
        summary = next(a for a in await agent_summaries(conn) if a.id == agent_id)
        soul, soul_draft = await soul_versions(conn, agent_id)
        config_rows = await unit_rows(
            conn, Unit("config", agent_id, "agent.yaml"), ("active", "draft")
        )
        config = config_version(pick(config_rows, "active"))
        skill_rows = await fetchall(
            conn,
            VERSION_ROWS
            + " where v.kind = 'skill' and v.agent_id = %s::public.agent_id"
            + " and v.status in ('active', 'draft') order by v.key, v.version",
            (agent_id,),
        )
    deliveries = config.fields.deliveries if config else []
    keys = sorted(set(deliveries) | {r["key"] for r in skill_rows})
    skills = []
    for key in keys:
        mine = [r for r in skill_rows if r["key"] == key]
        active, draft = pick(mine, "active"), pick(mine, "draft")
        meta = parse_skill(key, active["body"]).meta if active else {}
        skills.append(
            SkillSummary(
                delivery_type=key,
                title=meta.get("titulo"),
                active=ref(active) if active else None,
                draft=ref(draft) if draft else None,
                chars=len(active["body"]) if active else None,
            )
        )
    return AgentDetail(
        agent=summary,
        soul=soul,
        soul_draft=soul_draft,
        config=config,
        config_draft=config_version(pick(config_rows, "draft")),
        skills=skills,
    )


@router.get(
    "/squad/agents/{agent_id}/skills/{delivery_type}",
    response_model=SkillDetail,
    summary="Skill de uma delivery: procedimento, formato e critérios (ativa e rascunho)",
    responses=READ_ERRORS,
)
async def get_skill(agent_id: str, delivery_type: str, tx: AdminTx) -> SkillDetail:
    agent_id = require_agent(agent_id)
    async with tx() as conn:
        rows = await unit_rows(conn, Unit("skill", agent_id, delivery_type), ("active", "draft"))
    if not rows and not re.fullmatch(r"[0-9]{2}\.[0-9]{2}", delivery_type):
        raise ApiError(404, "not_found", "error.not_found")
    return SkillDetail(
        agent_id=agent_id,
        delivery_type=delivery_type,
        active=skill_version(pick(rows, "active")),
        draft=skill_version(pick(rows, "draft")),
    )


@router.get(
    "/squad/shared/{doc}",
    response_model=SharedDetail,
    summary="Regras compartilhadas (README.md), conversa.md ou reflexao.md (ativa e rascunho)",
    responses=READ_ERRORS,
)
async def get_shared(doc: SharedDoc, tx: AdminTx) -> SharedDetail:
    async with tx() as conn:
        rows = await unit_rows(conn, Unit("shared", None, doc), ("active", "draft"))
    active, draft = pick(rows, "active"), pick(rows, "draft")
    rules = None
    if doc == "README.md" and active:
        rules = SquadLoader(files={"README.md": active["body"].encode("utf-8")}).shared_rules()
    return SharedDetail(
        doc=doc,
        active=ref(active) if active else None,
        active_content=active["body"] if active else None,
        shared_rules=rules,
        draft=ref(draft) if draft else None,
        draft_content=draft["body"] if draft else None,
    )


@router.get(
    "/squad/versions",
    response_model=VersionList,
    summary="Histórico de versões de uma unidade (SOUL, skill, agent.yaml ou regra compartilhada)",
    responses=READ_ERRORS,
)
async def list_versions(
    tx: AdminTx,
    kind: str = Query(pattern="^(soul|skill|config|shared)$"),
    agent_id: str | None = Query(default=None),
    key: str | None = Query(default=None, max_length=40),
) -> VersionList:
    if kind != "shared":
        agent_id = require_agent(agent_id or "")
    unit = Unit(
        kind,
        agent_id if kind != "shared" else None,
        {"soul": "SOUL.md", "config": "agent.yaml"}.get(kind, key or ""),
    )
    async with tx() as conn:
        rows = await unit_rows(conn, unit)
    return VersionList(items=[ref(r) for r in reversed(rows)])


def unit_path(row: Mapping[str, Any]) -> str:
    return Unit(row["kind"], row["agent_id"], row["key"]).path


@router.get(
    "/squad/versions/{version_id}",
    response_model=VersionContent,
    summary="Conteúdo de uma versão, como o export grava o arquivo",
    responses=READ_ERRORS,
)
async def get_version(version_id: UUID, tx: AdminTx) -> VersionContent:
    async with tx() as conn:
        row = await version_row(conn, version_id)
        content = await content_of(conn, row)
    return VersionContent(ref=ref(row), path=unit_path(row), content=content)


def diff_lines(before: str, after: str) -> list[DiffLine]:
    a, b = before.splitlines(), after.splitlines()
    lines: list[DiffLine] = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            lines += [DiffLine(op=" ", text=t) for t in a[i1:i2]]
            continue
        lines += [DiffLine(op="-", text=t) for t in a[i1:i2]]
        lines += [DiffLine(op="+", text=t) for t in b[j1:j2]]
    return lines


@router.get(
    "/squad/diff",
    response_model=VersionDiff,
    summary="Comparar duas versões da mesma unidade",
    responses=READ_ERRORS,
)
async def diff_versions(
    tx: AdminTx,
    from_id: Annotated[UUID, Query(alias="from")],
    to_id: Annotated[UUID, Query(alias="to")],
) -> VersionDiff:
    async with tx() as conn:
        a, b = await version_row(conn, from_id), await version_row(conn, to_id)
        if (a["kind"], a["agent_id"], a["key"]) != (b["kind"], b["agent_id"], b["key"]):
            raise ApiError(422, "invalid_parameter", "error.squad_diff_units")
        before, after = await content_of(conn, a), await content_of(conn, b)
        changed: list[str] = []
        if a["kind"] == "soul":
            sections = await sections_by_version(conn, [a["id"], b["id"]])
            old = {s.section: section_signature(s) for s in sections.get(a["id"], [])}
            new = {s.section: section_signature(s) for s in sections.get(b["id"], [])}
            changed = [k for k in new if old.get(k) != new[k]]
    path = unit_path(a)
    unified = "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"{path} (versão {a['version']})",
            tofile=f"{path} (versão {b['version']})",
        )
    )
    return VersionDiff(
        path=path,
        from_version=ref(a),
        to_version=ref(b),
        unified=unified,
        lines=diff_lines(before, after),
        changed_sections=changed,
    )


def estimate_tokens(text: str) -> int:
    return math.ceil(len(text) / CHARS_PER_TOKEN)


@router.get(
    "/squad/agents/{agent_id}/prompt",
    response_model=PromptPreview,
    summary="O que ele lê: system prompt montado com contexto de exemplo e tokens estimados",
    responses=READ_ERRORS,
)
async def get_prompt(
    agent_id: str,
    tx: AdminTx,
    route: str = Query(
        description="Delivery (ex.: 04.01), conversa ou reflexao.",
        pattern=r"^([0-9]{2}\.[0-9]{2}|conversa|reflexao)$",
    ),
    draft: bool = Query(default=False, description="Montar com os rascunhos pendentes."),
) -> PromptPreview:
    agent_id = require_agent(agent_id)
    async with tx() as conn:
        snapshot = await active_snapshot(conn)
        if draft:
            drafts = await fetchall(
                conn,
                VERSION_ROWS
                + " where v.status = 'draft'"
                + " and (v.agent_id = %s::public.agent_id or v.agent_id is null)",
                (agent_id,),
            )
            for row in drafts:
                path = unit_path(row)
                snapshot.files[path] = (await content_of(conn, row)).encode("utf-8")
                snapshot.sources[path] = [
                    {
                        "id": str(row["id"]),
                        "kind": row["kind"],
                        "key": row["key"],
                        "version": row["version"],
                        "status": "draft",
                    }
                ]
    if not snapshot.files:
        raise ApiError(404, "not_found", "error.squad_not_seeded")
    loader = SquadLoader(files=snapshot.files, sources=snapshot.sources)
    try:
        if route == REPLY_SKILL:
            prompt = loader.reply_prompt(agent_id)
        elif route == REFLECT_SKILL:
            prompt = loader.reflect_prompt(agent_id)
        else:
            if not loader.has_skill(agent_id, route):
                raise ApiError(404, "not_found", "error.squad_skill_missing")
            prompt = loader.prompt(agent_id, route)
    except SquadDefinitionError as exc:
        raise ApiError(
            422, "invalid_parameter", "error.squad_invalid_content", detail=str(exc)
        ) from exc
    ctx = RunContext(
        locale=EXAMPLE_CONTEXT["locale"],
        brand_name=EXAMPLE_CONTEXT["brand_name"],
        request=EXAMPLE_CONTEXT["request"],
        work_title=EXAMPLE_CONTEXT["work_title"],
        delivery_type=route if route not in (REPLY_SKILL, REFLECT_SKILL) else None,
        briefing={},
    )
    parts = ["rules_and_soul", "skill", "workspace"]
    blocks = [
        PromptBlock(
            part=part,
            text=block.text,
            cached=block.cache,
            chars=len(block.text),
            tokens_estimated=estimate_tokens(block.text),
        )
        for part, block in zip(parts, system_blocks(prompt, ctx), strict=True)
    ]
    messages = []
    if route == REPLY_SKILL:
        messages = reply_messages(ctx)
    elif route != REFLECT_SKILL:
        messages = production_messages(ctx, {}, "Resumo de exemplo do Nexo.")
    for message in messages:
        blocks.append(
            PromptBlock(
                part="message",
                text=message.content,
                cached=False,
                chars=len(message.content),
                tokens_estimated=estimate_tokens(message.content),
            )
        )
    return PromptPreview(
        agent_id=agent_id,
        route=route,
        draft=draft,
        origin=prompt.origin,
        content_hash=prompt.content_hash,
        sources=prompt.sources,
        example_context=EXAMPLE_CONTEXT,
        blocks=blocks,
        chars=sum(b.chars for b in blocks),
        tokens_estimated=sum(b.tokens_estimated for b in blocks),
        token_estimate_method=TOKEN_ESTIMATE_METHOD,
    )


# ------------------------------------------------------------------------------------------------
# Escrita: rascunho, publicar, descartar, voltar versão
# ------------------------------------------------------------------------------------------------


def invalid(detail: str) -> ApiError:
    return ApiError(422, "invalid_parameter", "error.squad_invalid_content", detail=detail)


async def save_draft(
    conn: AsyncConnection[DictRow],
    unit: Unit,
    body: str | None,
    sections: list[SoulSectionData] | None,
    note: str | None,
) -> VersionRef:
    row = await fetchone(
        conn,
        "select app.admin_squad_save_draft(%s, %s::public.agent_id, %s, %s, %s, %s) as id",
        (
            unit.kind,
            unit.agent_id,
            unit.key,
            body,
            Jsonb([s.as_json() for s in sections]) if sections is not None else None,
            note,
        ),
    )
    return ref(await version_row(conn, row["id"]))


async def working_rows(
    conn: AsyncConnection[DictRow], unit: Unit
) -> tuple[dict | None, dict | None]:
    rows = await unit_rows(conn, unit, ("active", "draft"))
    return pick(rows, "active"), pick(rows, "draft")


@router.put(
    "/squad/agents/{agent_id}/soul/sections/{section}",
    response_model=VersionRef,
    summary="Editar uma seção da Alma: grava no rascunho (versão nova, não ativa até publicar)",
    responses=WRITE_ERRORS,
)
async def edit_soul_section(
    agent_id: str, section: SectionKey, payload: SectionEdit, tx: AdminTx
) -> VersionRef:
    agent_id = require_agent(agent_id)
    unit = Unit("soul", agent_id, "SOUL.md")
    async with tx() as conn:
        active, draft = await working_rows(conn, unit)
        base = draft or active
        if base is None:
            raise ApiError(404, "not_found", "error.squad_not_seeded")
        current = (await sections_by_version(conn, [base["id"]]))[base["id"]]
        edited = []
        for s in current:
            if s.section != section:
                edited.append(s)
                continue
            body = s.body if payload.body is None else payload.body.strip("\n")
            heading = s.heading if payload.heading is None else payload.heading.strip()
            in_prompt = s.in_prompt if payload.in_prompt is None else payload.in_prompt
            if not body.strip():
                raise invalid("Seção sem texto.")
            if HEADING.search(body) or body.startswith(OUT_OF_PROMPT):
                raise invalid("O texto da seção não pode ter título # ou ## nem o marcador.")
            if section == "identidade" and not in_prompt:
                raise invalid("A identidade sempre entra no prompt.")
            edited.append(
                SoulSectionData(
                    section=s.section,
                    position=s.position,
                    heading=heading,
                    body=body,
                    in_prompt=in_prompt,
                )
            )
        rendered = render_soul(edited)
        if [section_signature(s) for s in parse_soul(rendered)] != [
            section_signature(s) for s in sorted(edited, key=lambda s: s.position)
        ]:
            raise invalid("A seção editada não volta igual do SOUL.md montado.")
        return await save_draft(conn, unit, None, edited, payload.note)


def known_tools(configs: Iterable[str]) -> set[str]:
    tools: set[str] = set()
    for text in configs:
        tools |= set((yaml.safe_load(text) or {}).get("ferramentas") or [])
    return tools


def edit_config_text(text: str, tools: list[str] | None, autonomy: str | None) -> str:
    """Troca ferramentas e autonomia no agent.yaml mantendo o resto e os comentários."""
    lines = text.split("\n")
    if tools is not None:
        start = next((i for i, line in enumerate(lines) if line.startswith("ferramentas:")), None)
        if start is None:
            raise invalid("agent.yaml sem a lista ferramentas.")
        end = start + 1
        existing = {}
        while end < len(lines) and TOOL_LINE.match(lines[end]):
            existing[TOOL_LINE.match(lines[end]).group(1)] = lines[end]
            end += 1
        lines[start + 1 : end] = [existing.get(tool, f"  - {tool}") for tool in tools]
    if autonomy is not None:
        for i, line in enumerate(lines):
            match = re.match(r"^autonomia_maxima:(\s*)(\S+)(.*)$", line)
            if match:
                lines[i] = f"autonomia_maxima:{match.group(1)}{autonomy}{match.group(3)}"
                break
        else:
            raise invalid("agent.yaml sem autonomia_maxima.")
    return "\n".join(lines)


def validate_config(agent_id: str, text: str, allowed: set[str]) -> None:
    try:
        config = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise invalid(f"agent.yaml inválido: {exc}") from exc
    if not isinstance(config, dict) or config.get("id") != agent_id:
        raise invalid(f"agent.yaml precisa de id: {agent_id}.")
    tools = config.get("ferramentas")
    if not isinstance(tools, list) or not all(isinstance(t, str) for t in tools):
        raise invalid("ferramentas precisa ser uma lista de nomes.")
    unknown = sorted(set(tools) - allowed)
    if unknown:
        raise ApiError(422, "unknown_tool", "error.squad_unknown_tool", tools=", ".join(unknown))
    agents = {a.value for a in AgentId}
    if not set(config.get("colabora_com") or []) <= agents:
        raise invalid("colabora_com só aceita os sete agentes.")
    if config.get("autonomia_maxima") not in ("analisar", "preparar", "executar"):
        raise invalid("autonomia_maxima: analisar, preparar ou executar.")


@router.put(
    "/squad/agents/{agent_id}/config",
    response_model=VersionRef,
    summary="Editar ferramentas e limites (agent.yaml): grava no rascunho",
    responses=WRITE_ERRORS,
)
async def edit_config(agent_id: str, payload: ConfigEdit, tx: AdminTx) -> VersionRef:
    agent_id = require_agent(agent_id)
    if payload.yaml is None and payload.tools is None and payload.max_autonomy is None:
        raise invalid("Envie yaml, tools ou max_autonomy.")
    unit = Unit("config", agent_id, "agent.yaml")
    async with tx() as conn:
        active, draft = await working_rows(conn, unit)
        base = draft or active
        if base is None:
            raise ApiError(404, "not_found", "error.squad_not_seeded")
        configs = await fetchall(
            conn,
            "select body from public.squad_versions where kind = 'config' and status = 'active'",
        )
        text = payload.yaml if payload.yaml is not None else base["body"]
        text = edit_config_text(text, payload.tools, payload.max_autonomy)
        validate_config(agent_id, text, known_tools(r["body"] for r in configs))
        return await save_draft(conn, unit, text, None, payload.note)


@router.put(
    "/squad/agents/{agent_id}/skills/{delivery_type}",
    response_model=VersionRef,
    summary="Editar a skill de uma delivery (arquivo inteiro, com front matter): grava no rascunho",
    responses=WRITE_ERRORS,
)
async def edit_skill(
    agent_id: str, delivery_type: str, payload: ContentEdit, tx: AdminTx
) -> VersionRef:
    agent_id = require_agent(agent_id)
    if not re.fullmatch(r"[0-9]{2}\.[0-9]{2}", delivery_type):
        raise ApiError(404, "not_found", "error.not_found")
    content = payload.content if payload.content.endswith("\n") else payload.content + "\n"
    match = FRONT_MATTER.match(content)
    try:
        meta = (yaml.safe_load(match.group(1)) or {}) if match else {}
    except yaml.YAMLError as exc:
        raise invalid(f"Front matter inválido: {exc}") from exc
    if not isinstance(meta, dict) or str(meta.get("delivery", delivery_type)) != delivery_type:
        raise invalid(f"O front matter precisa ser da delivery {delivery_type}.")
    if not parse_skill(delivery_type, content).body:
        raise invalid("Skill sem corpo.")
    unit = Unit("skill", agent_id, delivery_type)
    async with tx() as conn:
        config = await fetchone(
            conn,
            "select body from public.squad_versions"
            " where kind = 'config' and agent_id = %s::public.agent_id and status = 'active'",
            (agent_id,),
        )
        deliveries = config_fields(config["body"]).deliveries if config else []
        if delivery_type not in deliveries:
            raise invalid(f"A delivery {delivery_type} não é do agente {agent_id}.")
        return await save_draft(conn, unit, content, None, payload.note)


@router.put(
    "/squad/shared/{doc}",
    response_model=VersionRef,
    summary="Editar README.md (regras compartilhadas), conversa.md ou reflexao.md: grava rascunho",
    responses=WRITE_ERRORS,
)
async def edit_shared(doc: SharedDoc, payload: ContentEdit, tx: AdminTx) -> VersionRef:
    content = payload.content if payload.content.endswith("\n") else payload.content + "\n"
    if doc == "README.md":
        try:
            SquadLoader(files={"README.md": content.encode("utf-8")}).shared_rules()
        except SquadDefinitionError as exc:
            raise invalid(str(exc)) from exc
    async with tx() as conn:
        return await save_draft(conn, Unit("shared", None, doc), content, None, payload.note)


@router.post(
    "/squad/versions/{version_id}/publish",
    response_model=VersionRef,
    summary="Publicar o rascunho: vira a versão ativa; o próximo run usa",
    responses=WRITE_ERRORS,
)
async def publish_version(version_id: UUID, tx: AdminTx) -> VersionRef:
    async with tx() as conn:
        await fetchone(conn, "select app.admin_squad_publish(%s)", (version_id,))
        return ref(await version_row(conn, version_id))


@router.post(
    "/squad/versions/{version_id}/discard",
    response_model=VersionRef,
    summary="Descartar o rascunho (fica no histórico como descartado)",
    responses=WRITE_ERRORS,
)
async def discard_version(version_id: UUID, tx: AdminTx) -> VersionRef:
    async with tx() as conn:
        await fetchone(conn, "select app.admin_squad_discard(%s)", (version_id,))
        return ref(await version_row(conn, version_id))


@router.post(
    "/squad/versions/{version_id}/restore",
    response_model=VersionRef,
    summary="Voltar versão: cria uma versão nova, já ativa, com o conteúdo desta",
    responses=WRITE_ERRORS,
)
async def restore_version(
    version_id: UUID, tx: AdminTx, payload: RestoreRequest | None = None
) -> VersionRef:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select app.admin_squad_restore(%s, %s) as id",
            (version_id, payload.note if payload else None),
        )
        return ref(await version_row(conn, row["id"]))


# ------------------------------------------------------------------------------------------------
# Regras de negócio
# ------------------------------------------------------------------------------------------------

RULE_DOCS = """
select d.id, d.slug, d.title, d.in_prompt, v.version, v.created_at as updated_at, v.author,
       v.paragraphs
from public.business_rule_docs d
left join lateral (
  select * from public.business_rule_doc_versions x where x.doc_id = d.id
  order by x.version desc limit 1
) v on true
"""


def paragraphs(raw: Any) -> list[RuleParagraph]:
    return [
        RuleParagraph(mark=p["mark"], text=p["text"], source=p.get("source")) for p in raw or []
    ]


def rule_summary(row: Mapping[str, Any]) -> RuleDocSummary:
    marks = {m: 0 for m in ("decided", "current_base", "pending", "proposal")}
    for p in row["paragraphs"] or []:
        marks[p["mark"]] = marks.get(p["mark"], 0) + 1
    return RuleDocSummary(
        id=row["id"],
        slug=row["slug"],
        title=row["title"],
        in_prompt=row["in_prompt"],
        version=row["version"],
        updated_at=row["updated_at"],
        author=row["author"],
        marks=marks,
    )


def prompt_paragraphs(row: Mapping[str, Any]) -> list[RuleParagraph]:
    if not row["in_prompt"]:
        return []
    return [p for p in paragraphs(row["paragraphs"]) if p.mark in PROMPT_MARKS]


def with_business_rules(readme: str, docs: list[Mapping[str, Any]]) -> str:
    """README.md com o bloco "Regras de negócio" de cada documento que entra no prompt, no fim da
    seção de regras compartilhadas (só [DECIDIDO] e [BASE ATUAL]; o bloco anterior é refeito)."""
    start = readme.find(SHARED_RULES_HEADING)
    if start < 0:
        raise invalid("README.md sem a seção de regras compartilhadas.")
    end = readme.find("\n## ", start + len(SHARED_RULES_HEADING))
    section, tail = (readme[start:end], readme[end:]) if end >= 0 else (readme[start:], "")
    cut = section.find(f"\n\n{RULES_BLOCK}")
    base = (section[:cut] if cut >= 0 else section).rstrip("\n")
    blocks = []
    for doc in sorted(docs, key=lambda d: d["title"]):
        applicable = prompt_paragraphs(doc)
        if applicable:
            items = "\n".join(f"- {p.text}" for p in applicable)
            blocks.append(f"{RULES_BLOCK}: {doc['title']} (versão {doc['version']})\n\n{items}")
    new_section = base + ("\n\n" + "\n\n".join(blocks) if blocks else "") + "\n"
    return readme[:start] + new_section + tail


async def rule_versions(conn: AsyncConnection[DictRow], doc_id: UUID) -> list[RuleVersion]:
    rows = await fetchall(
        conn,
        """
        select id, version, author, change_note, created_at, paragraphs
        from public.business_rule_doc_versions where doc_id = %s order by version desc
        """,
        (doc_id,),
    )
    return [
        RuleVersion(
            id=r["id"],
            version=r["version"],
            author=r["author"],
            change_note=r["change_note"],
            created_at=r["created_at"],
            paragraphs=paragraphs(r["paragraphs"]),
        )
        for r in rows
    ]


@router.get(
    "/rules",
    response_model=RuleDocList,
    summary="Regras de negócio: documentos, versão atual, marcações e se entram no prompt",
    responses=READ_ERRORS,
)
async def list_rules(tx: AdminTx) -> RuleDocList:
    async with tx() as conn:
        rows = await fetchall(conn, RULE_DOCS + " order by d.title")
        _, draft = await working_rows(conn, Unit("shared", None, "README.md"))
    return RuleDocList(
        items=[rule_summary(r) for r in rows], shared_rules_draft=ref(draft) if draft else None
    )


@router.get(
    "/rules/{doc_id}",
    response_model=RuleDocDetail,
    summary="Documento de regras: parágrafos marcados, versões e o que entra no prompt",
    responses=READ_ERRORS,
)
async def get_rule_doc(doc_id: UUID, tx: AdminTx) -> RuleDocDetail:
    async with tx() as conn:
        row = await fetchone(conn, RULE_DOCS + " where d.id = %s", (doc_id,))
        if row is None:
            raise ApiError(404, "not_found", "error.not_found")
        versions = await rule_versions(conn, doc_id)
    return RuleDocDetail(
        doc=rule_summary(row),
        current=versions[0] if versions else None,
        versions=versions,
        prompt_paragraphs=prompt_paragraphs(row),
    )


@router.post(
    "/rules/{doc_id}/versions",
    response_model=RuleSaveResult,
    status_code=201,
    summary="Gravar versão nova das regras; o que entra no prompt vira rascunho do README.md",
    responses=WRITE_ERRORS,
)
async def save_rule_doc(doc_id: UUID, payload: RuleDocEdit, tx: AdminTx) -> RuleSaveResult:
    async with tx() as conn:
        await fetchone(
            conn,
            "select app.admin_rule_doc_save(%s, %s, %s, %s)",
            (
                doc_id,
                Jsonb([p.model_dump(exclude_none=True) for p in payload.paragraphs]),
                payload.in_prompt,
                payload.note,
            ),
        )
        docs = await fetchall(conn, RULE_DOCS + " order by d.title")
        active, draft = await working_rows(conn, Unit("shared", None, "README.md"))
        shared_draft = None
        base = draft or active
        if base is not None:
            updated = with_business_rules(base["body"], docs)
            if updated != base["body"]:
                shared_draft = await save_draft(
                    conn,
                    Unit("shared", None, "README.md"),
                    updated,
                    None,
                    "Regras de negócio que entram no prompt (gerado ao gravar as regras).",
                )
        row = next(d for d in docs if d["id"] == doc_id)
        versions = await rule_versions(conn, doc_id)
    return RuleSaveResult(
        doc=rule_summary(row), version=versions[0], shared_rules_draft=shared_draft
    )
