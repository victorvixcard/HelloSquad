"""Reflexão de um trabalho fechado (Memória camada 3, Arquitetura §5.3, S2c).

O worker consome a fila memory_reflect. Cada reflexão lê o fechamento (briefing, versões, correções
da pessoa e decisão), calcula o que mudou entre versões seguidas, pede ao agente que entregou os
aprendizados (modo simulado: fixture `<delivery>/<agente>.reflect.json`) e grava cada um por
app.record_learning. A evidência é conferida aqui, nunca aceita do modelo: rótulo que não existe
sai, aprendizado sem evidência não é gravado e "correção explícita" só vale citando uma correção da
pessoa com texto. A promoção acontece no banco (correção explícita com confiança mínima, ou a mesma
lição em N trabalhos); o resto fica candidato até o owner decidir.
"""

import difflib
import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, Field, ValidationError

from hellosquad.llm.base import CallTag, ChatMessage, LLMOutputError, Usage
from hellosquad.llm.pricing import cost_usd
from hellosquad.squad.prompt import RunContext, as_json, system_blocks, text

REFLECT_STEP = "reflect"
DIFF_LINES = 80


class ReflectedLearning(BaseModel):
    assunto: str = Field(min_length=1, max_length=80)
    aprendizado: str = Field(min_length=1, max_length=500)
    evidencias: list[str] = Field(min_length=1, max_length=10)
    confianca: float = Field(ge=0, le=1)
    origem: Literal["correcao_explicita", "observacao"]


class ReflectionOutput(BaseModel):
    aprendizados: list[ReflectedLearning] = Field(default_factory=list, max_length=5)
    resumo: str = Field(default="", max_length=2000)


@dataclass(frozen=True)
class PromotionRules:
    min_confidence: float
    repeats: int


@dataclass(frozen=True)
class ReflectionClaim:
    id: UUID
    attempts: int


def flatten(value: Any, path: str = "") -> list[str]:
    """Linhas legíveis de uma versão (`caminho: texto`), na ordem, para o diff."""
    if isinstance(value, dict):
        return [
            line for key in value for line in flatten(value[key], f"{path}.{key}" if path else key)
        ]
    if isinstance(value, list):
        return [line for i, item in enumerate(value) for line in flatten(item, f"{path}[{i}]")]
    if isinstance(value, str):
        return [f"{path}: {part}" for part in value.splitlines() or [""]]
    return [f"{path}: {json.dumps(value, ensure_ascii=False)}"]


def version_diff(before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    lines = difflib.unified_diff(flatten(before), flatten(after), lineterm="", n=0)
    changed = [line for line in lines if line[:1] in "+-" and line[:3] not in ("+++", "---")]
    return changed[:DIFF_LINES]


class Evidence:
    """Rótulos que o prompt mostra (C1…, V1…, D) e a referência gravada de cada um."""

    def __init__(self) -> None:
        self.refs: dict[str, dict[str, Any]] = {}
        self.corrections_with_note: set[str] = set()

    def add(self, label: str, ref: dict[str, Any], *, note: str | None = None) -> None:
        self.refs[label] = ref
        if note:
            self.corrections_with_note.add(label)

    def resolve(self, labels: list[str]) -> list[dict[str, Any]]:
        seen: dict[str, dict[str, Any]] = {}
        for label in labels:
            key = label.strip().upper()
            if key in self.refs:
                seen[key] = self.refs[key]
        return list(seen.values())

    def explicit(self, labels: list[str]) -> bool:
        return any(label.strip().upper() in self.corrections_with_note for label in labels)


class ReflectionStore:
    def __init__(self, pool: AsyncConnectionPool, *, workspace_id: UUID, reflection_id: UUID):
        self.pool = pool
        self.workspace_id = workspace_id
        self.reflection_id = reflection_id

    async def claim(self, max_attempts: int) -> tuple[str, ReflectionClaim | None]:
        async with self.pool.connection() as conn:
            row = await (
                await conn.execute(
                    """
                    update public.memory_reflections
                    set status = 'running', attempts = attempts + 1,
                        started_at = coalesce(started_at, now()), error = null
                    where id = %s and workspace_id = %s and status in ('queued', 'running')
                      and attempts < %s
                    returning id, attempts
                    """,
                    (self.reflection_id, self.workspace_id, max_attempts),
                )
            ).fetchone()
            if row is not None:
                return "claimed", ReflectionClaim(row["id"], row["attempts"])
            state = await (
                await conn.execute(
                    "select status::text from public.memory_reflections where id = %s",
                    (self.reflection_id,),
                )
            ).fetchone()
        if state is None:
            return "missing", None
        if state["status"] in ("succeeded", "failed"):
            return "finished", None
        return "exhausted", None

    async def load(self) -> dict[str, Any]:
        async with self.pool.connection() as conn:
            row = await (
                await conn.execute(
                    """
                    select r.id, r.work_item_id, r.agent_id::text, r.delivery_type,
                           r.outcome::text, r.refs, s.name as workspace_name, s.locale,
                           w.title, m.body as request
                    from public.memory_reflections r
                    join public.workspaces s on s.id = r.workspace_id
                    join public.work_items w
                      on w.id = r.work_item_id and w.workspace_id = r.workspace_id
                    left join public.messages m
                      on m.id = w.origin_message_id and m.workspace_id = r.workspace_id
                    where r.id = %s and r.workspace_id = %s
                    """,
                    (self.reflection_id, self.workspace_id),
                )
            ).fetchone()
            if row is None:
                raise LookupError(f"reflexão {self.reflection_id} sem trabalho")
            version_ids = [v["id"] for v in row["refs"].get("versions", [])]
            versions = await (
                await conn.execute(
                    """
                    select v.id, v.version_no, v.status::text, v.content
                    from public.delivery_versions v
                    where v.workspace_id = %s and v.id = any(%s::uuid[])
                    order by v.version_no
                    """,
                    (self.workspace_id, version_ids),
                )
            ).fetchall()
            current = await (
                await conn.execute(
                    """
                    select l.topic, l.learning, l.status::text
                    from public.agent_learnings l
                    where l.workspace_id = %s and l.agent_id = %s::public.agent_id
                      and l.delivery_type = %s and l.superseded_at is null
                      and l.status <> 'discarded'
                    order by l.created_at, l.id
                    """,
                    (self.workspace_id, row["agent_id"], row["delivery_type"]),
                )
            ).fetchall()
        return dict(row) | {"versions": versions, "current": current}

    async def succeed(
        self,
        claim: ReflectionClaim,
        *,
        learnings: list[tuple[ReflectedLearning, list[dict[str, Any]], bool]],
        rules: PromotionRules,
        diff: list[dict[str, Any]],
        summary: str,
        model: str,
        usage: Usage,
        cost: Decimal,
    ) -> list[dict[str, Any]]:
        recorded: list[dict[str, Any]] = []
        async with self.pool.connection() as conn, conn.transaction():
            fence = await (
                await conn.execute(
                    """
                    select 1 from public.memory_reflections
                    where id = %s and status = 'running' and attempts = %s
                    for update
                    """,
                    (claim.id, claim.attempts),
                )
            ).fetchone()
            if fence is None:
                return []
            for item, refs, explicit in learnings:
                row = await (
                    await conn.execute(
                        """
                        select l.id, l.topic, l.learning, l.status::text, l.promotion_rule,
                               l.version
                        from app.record_learning(
                          %s, %s::text, %s::text, %s::jsonb, %s::numeric, %s::boolean,
                          %s::numeric, %s::integer
                        ) l
                        """,
                        (
                            claim.id,
                            item.assunto,
                            item.aprendizado,
                            Jsonb(refs),
                            round(item.confianca, 2),
                            explicit,
                            rules.min_confidence,
                            rules.repeats,
                        ),
                    )
                ).fetchone()
                recorded.append(dict(row))
            await conn.execute(
                """
                update public.memory_reflections
                set status = 'succeeded', finished_at = now(), model = %s, input_tokens = %s,
                    output_tokens = %s, cost_usd = %s, diff = %s, summary = nullif(%s, ''),
                    learnings_count = %s
                where id = %s
                """,
                (
                    model,
                    usage.input_tokens,
                    usage.output_tokens,
                    cost,
                    Jsonb(diff),
                    summary,
                    len(recorded),
                    claim.id,
                ),
            )
        return recorded

    async def retry_later(self, error: dict[str, Any]) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(
                "update public.memory_reflections set status = 'queued', error = %s where id = %s",
                (Jsonb(error), self.reflection_id),
            )

    async def fail(self, error: dict[str, Any]) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(
                """
                update public.memory_reflections
                set status = 'failed', error = %s, finished_at = now()
                where id = %s and status <> 'succeeded'
                """,
                (Jsonb(error), self.reflection_id),
            )


def reflection_messages(data: dict[str, Any], evidence: Evidence) -> tuple[str, list[dict]]:
    refs = data["refs"]
    work_item_id = str(data["work_item_id"])
    parts = [
        f'<trabalho delivery="{text(data["delivery_type"])}">{text(data["title"])}</trabalho>',
        f"<pedido>{text(data['request'] or data['title'])}</pedido>",
        f"<briefing>{as_json(refs.get('work_item', {}).get('briefing', {}))}</briefing>",
    ]
    versions = data["versions"]
    lines = []
    for version in versions:
        label = f"V{version['version_no']}"
        evidence.add(
            label,
            {
                "type": "version",
                "delivery_version_id": str(version["id"]),
                "version_no": version["version_no"],
                "work_item_id": work_item_id,
            },
        )
        lines.append(
            f'<versao rotulo="{label}" estado="{text(version["status"])}">'
            f"{as_json(version['content'])}</versao>"
        )
    parts.append("<versoes>\n" + "\n".join(lines) + "\n</versoes>" if lines else "<versoes/>")

    by_version = {str(v["id"]): f"V{v['version_no']}" for v in versions}
    lines = []
    for i, correction in enumerate(refs.get("corrections", []), start=1):
        label = f"C{i}"
        note = (correction.get("note") or "").strip()
        evidence.add(
            label,
            {
                "type": "correction",
                "approval_id": correction["approval_id"],
                "decision": correction["decision"],
                **({"follow_up": correction["follow_up"]} if correction.get("follow_up") else {}),
                **({"note": note} if note else {}),
                **(
                    {"delivery_version_id": correction["delivery_version_id"]}
                    if correction.get("delivery_version_id")
                    else {}
                ),
                "work_item_id": work_item_id,
            },
            note=note,
        )
        target = by_version.get(str(correction.get("delivery_version_id")), "")
        lines.append(
            f'<correcao rotulo="{label}" decisao="{text(correction["decision"])}"'
            f' versao="{target}">{text(note)}</correcao>'
        )
    parts.append("<correcoes>\n" + "\n".join(lines) + "\n</correcoes>" if lines else "<correcoes/>")

    diff: list[dict] = []
    for before, after in zip(versions, versions[1:], strict=False):
        changed = version_diff(before["content"], after["content"])
        if changed:
            diff.append({"from": before["version_no"], "to": after["version_no"], "lines": changed})
    if diff:
        blocks = [
            f'<diff de="V{d["from"]}" para="V{d["to"]}">' + text("\n".join(d["lines"])) + "</diff>"
            for d in diff
        ]
        parts.append("<diferencas>\n" + "\n".join(blocks) + "\n</diferencas>")

    decision = refs.get("decision") or {}
    evidence.add(
        "D",
        {
            "type": "decision",
            "outcome": data["outcome"],
            **({"approval_id": decision["approval_id"]} if decision.get("approval_id") else {}),
            "work_item_id": work_item_id,
        },
    )
    parts.append(
        f'<decisao rotulo="D" desfecho="{text(data["outcome"])}">'
        f"{text((decision.get('note') or '').strip())}</decisao>"
    )
    current = "\n".join(
        f'<aprendizado assunto="{text(c["topic"])}" estado="{text(c["status"])}">'
        f"{text(c['learning'])}</aprendizado>"
        for c in data["current"]
    )
    parts.append(
        f"<aprendizados_atuais>\n{current}\n</aprendizados_atuais>"
        if current
        else "<aprendizados_atuais/>"
    )
    parts.append("<etapa>refletir</etapa>")
    return "\n".join(parts), diff


async def run_reflection(
    squad: Any, store: ReflectionStore, claim: ReflectionClaim, rules: PromotionRules
) -> dict[str, Any]:
    data = await store.load()
    prompt = squad.loader.reflect_prompt(data["agent_id"])
    evidence = Evidence()
    body, diff = reflection_messages(data, evidence)
    ctx = RunContext(
        locale=data["locale"],
        brand_name=data["workspace_name"],
        request="",
        work_title="",
        delivery_type=data["delivery_type"],
        briefing={},
    )
    model = prompt.agent.model["padrao"]
    completion = await squad.llm.complete(
        messages=[ChatMessage(role="user", content=body)],
        system=system_blocks(prompt, ctx),
        model=model,
        tag=CallTag(data["delivery_type"], f"{data['agent_id']}.{REFLECT_STEP}"),
        output_schema=ReflectionOutput.model_json_schema(),
        max_tokens=4000,
    )
    try:
        output = ReflectionOutput.model_validate(completion.json())
    except ValidationError as exc:
        raise LLMOutputError(
            "A resposta do modelo não segue o formato da reflexão.",
            details={"step": REFLECT_STEP, "errors": exc.error_count()},
        ) from exc
    accepted = []
    for item in output.aprendizados:
        refs = evidence.resolve(item.evidencias)
        if not refs:
            continue
        explicit = item.origem == "correcao_explicita" and evidence.explicit(item.evidencias)
        accepted.append((item, refs, explicit))
    recorded = await store.succeed(
        claim,
        learnings=accepted,
        rules=rules,
        diff=diff,
        summary=output.resumo,
        model=completion.model,
        usage=completion.usage,
        cost=cost_usd(completion.usage, completion.model, squad.prices),
    )
    return {
        "outcome": "reflected",
        "work_item_id": str(data["work_item_id"]),
        "learnings": recorded,
        "discarded": len(output.aprendizados) - len(accepted),
    }
