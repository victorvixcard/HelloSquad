"""Memória da Marca no contexto do run (Arquitetura §5.4, S1d).

Regra da V4.6 (KST5, coluna "O squad usa?"): "Confirmado" e "Decisão sua" orientam; "Da fonte" é
usado sem confirmação, "Observado" só como contexto e "Desatualizado" com aviso; "Sugerido",
"Em conflito", "Descartado" e "Não usado" nunca entram. Cada fato leva o rótulo do estado no prompt.
Entram em duas partes:
1. essenciais, sempre: decisões e o que está confirmado em Minha marca e Meu público (tom, público,
   canais); vão no bloco do workspace, cacheado;
2. achados pela busca textual com o texto do pedido, do trabalho, do briefing e da delivery, até
   completar o orçamento de tokens (MEMORY_CONTEXT_TOKENS); vão no turno do usuário.
Tudo que entra é registrado em run_context_items.

S2c (Arquitetura §5.4): no run de uma delivery, entre os essenciais e a busca de fatos entram os
aprendizados promovidos deste cliente com o agente (camada 3): primeiro os da mesma delivery, depois
os de outras deliveries do agente que a busca acha, até LEARNING_TOP_K e dentro do mesmo orçamento.
Candidatos e descartados nunca entram. Aprendizado sem reafirmação há LEARNING_REVIEW_DAYS entra
marcado para o agente avisar.
"""

import math
from dataclasses import dataclass, replace
from html import escape
from typing import Any
from uuid import UUID

from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.i18n import t

SEARCH_CANDIDATES = 50

ESSENTIAL_FACTS = """
select f.id, f.state::text, f.area::text, f.topic, f.key, f.content
from public.brand_facts f
where f.workspace_id = %(workspace_id)s
  and f.superseded_at is null
  and f.state in ('confirmed', 'decision')
  and (f.state = 'decision' or f.area in ('brand', 'audience'))
  and (f.valid_until is null or f.valid_until > now())
order by f.state desc, f.area, f.created_at, f.id
"""

# Busca "qualquer palavra": os radicais do texto do pedido viram uma consulta OR, ordenada pela
# relevância. Os radicais já saem normalizados pela configuração do idioma do workspace; a consulta
# usa 'simple' para não normalizar de novo.
SEARCH_FACTS = r"""
with query as (
  select to_tsquery(
           'pg_catalog.simple',
           string_agg('''' || replace(replace(lexeme, '\', '\\'), '''', '''''') || '''', ' | ')
         ) as q
  from unnest(
    tsvector_to_array(to_tsvector(app.memory_search_config(%(locale)s), %(text)s))
  ) as lexeme
)
select f.id, f.state::text, f.area::text, f.topic, f.key, f.content,
       ts_rank_cd(f.search_vector, query.q) as rank
from public.brand_facts f, query
where f.workspace_id = %(workspace_id)s
  and f.superseded_at is null
  and f.state in ('confirmed', 'decision', 'from_source', 'observed', 'outdated')
  and (f.valid_until is null or f.valid_until > now())
  and query.q is not null
  and f.search_vector @@ query.q
  and not (f.id = any(%(exclude)s))
order by rank desc, f.created_at, f.id
limit %(limit)s
"""


SEARCH_LEARNINGS = r"""
with query as (
  select to_tsquery(
           'pg_catalog.simple',
           string_agg('''' || replace(replace(lexeme, '\', '\\'), '''', '''''') || '''', ' | ')
         ) as q
  from unnest(
    tsvector_to_array(to_tsvector(app.memory_search_config(%(locale)s), %(text)s))
  ) as lexeme
)
select l.id, l.agent_id::text, l.delivery_type, l.topic, l.learning,
       l.delivery_type = %(delivery_type)s as same_delivery,
       coalesce(ts_rank_cd(l.search_vector, query.q), 0) as rank,
       coalesce(l.reviewed_at, l.decided_at, l.created_at)
         < now() - make_interval(days => %(review_days)s) as stale
from public.agent_learnings l, query
where l.workspace_id = %(workspace_id)s
  and l.agent_id = %(agent_id)s::public.agent_id
  and l.superseded_at is null
  and l.status = 'promoted'
  and (l.delivery_type = %(delivery_type)s or (query.q is not null and l.search_vector @@ query.q))
order by same_delivery desc, rank desc, l.created_at desc, l.id
limit %(limit)s
"""


@dataclass(frozen=True)
class LearningQuery:
    agent_id: str
    delivery_type: str
    top_k: int
    review_days: int


@dataclass(frozen=True)
class AgentLearning:
    learning_id: UUID
    agent_id: str
    delivery_type: str
    topic: str
    learning: str
    reason: str
    rank: float | None
    stale: bool
    tokens: int


def render_learning(item: AgentLearning) -> str:
    stale = ' revisar="sim"' if item.stale else ""
    return (
        f'<aprendizado agente="{escape(item.agent_id)}" delivery="{escape(item.delivery_type)}"'
        f' assunto="{escape(item.topic)}"{stale}>{escape(item.learning, quote=False)}</aprendizado>'
    )


def to_learning(row: dict[str, Any]) -> AgentLearning:
    item = AgentLearning(
        learning_id=row["id"],
        agent_id=row["agent_id"],
        delivery_type=row["delivery_type"],
        topic=row["topic"],
        learning=row["learning"],
        reason="delivery" if row["same_delivery"] else "search",
        rank=float(row["rank"]) if row["rank"] else None,
        stale=bool(row["stale"]),
        tokens=0,
    )
    return replace(item, tokens=estimate_tokens(render_learning(item)))


@dataclass(frozen=True)
class MemoryFact:
    fact_id: UUID
    state: str
    area: str
    topic: str
    key: str
    content: str
    reason: str
    rank: float | None
    tokens: int


def estimate_tokens(value: str) -> int:
    """Estimativa conservadora (3 caracteres por token); o custo real vem do uso do modelo."""
    return max(1, math.ceil(len(value) / 3))


def render_fact(locale: str, state: str, topic: str, key: str, content: str) -> str:
    label = t(locale, f"memory.fact_state.{state}")
    body = escape(f"{key}: {content}", quote=False)
    return f'<fato estado="{escape(label)}" assunto="{escape(topic)}">{body}</fato>'


def to_fact(locale: str, row: dict[str, Any], reason: str) -> MemoryFact:
    rank = row.get("rank")
    return MemoryFact(
        fact_id=row["id"],
        state=row["state"],
        area=row["area"],
        topic=row["topic"],
        key=row["key"],
        content=row["content"],
        reason=reason,
        rank=float(rank) if rank is not None else None,
        tokens=estimate_tokens(
            render_fact(locale, row["state"], row["topic"], row["key"], row["content"])
        ),
    )


def search_text(
    request: str, work_title: str, briefing: dict[str, Any], delivery_title: str | None
) -> str:
    values: list[str] = [request, work_title, delivery_title or ""]
    for value in briefing.values():
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, list):
            values.extend(str(item) for item in value if isinstance(item, str))
    return "\n".join(v for v in values if v)


async def select_memory(
    conn: AsyncConnection[DictRow],
    *,
    workspace_id: UUID,
    locale: str,
    text: str,
    budget: int,
    learnings: LearningQuery | None = None,
) -> tuple[list[MemoryFact], list[AgentLearning]]:
    """Essenciais sempre; depois os aprendizados promovidos do agente (com `learnings`, até o
    top_k); depois os fatos mais relevantes da busca, enquanto couberem no orçamento."""
    rows = await (await conn.execute(ESSENTIAL_FACTS, {"workspace_id": workspace_id})).fetchall()
    chosen = [to_fact(locale, row, "essential") for row in rows]
    used = sum(fact.tokens for fact in chosen)
    taken: list[AgentLearning] = []
    if learnings is not None and learnings.top_k > 0:
        found = await (
            await conn.execute(
                SEARCH_LEARNINGS,
                {
                    "workspace_id": workspace_id,
                    "agent_id": learnings.agent_id,
                    "delivery_type": learnings.delivery_type,
                    "locale": locale,
                    "text": text,
                    "review_days": learnings.review_days,
                    "limit": SEARCH_CANDIDATES,
                },
            )
        ).fetchall()
        for row in found:
            item = to_learning(row)
            if used + item.tokens > budget:
                continue
            taken.append(item)
            used += item.tokens
            if len(taken) >= learnings.top_k:
                break
    found = await (
        await conn.execute(
            SEARCH_FACTS,
            {
                "workspace_id": workspace_id,
                "locale": locale,
                "text": text,
                "exclude": [fact.fact_id for fact in chosen],
                "limit": SEARCH_CANDIDATES,
            },
        )
    ).fetchall()
    for row in found:
        fact = to_fact(locale, row, "search")
        if used + fact.tokens > budget:
            continue
        chosen.append(fact)
        used += fact.tokens
    return chosen, taken
