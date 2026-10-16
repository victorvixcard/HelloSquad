"""Montagem do prompt de um run: prefixo estável (regras + SOUL + skill, cacheado) e contexto.

Ordem do system: regras compartilhadas e SOUL → skill da delivery (cache) → workspace: idioma,
marca e fatos confirmados (cache). O que muda a cada chamada (histórico, pedido, etapa) vai na
mensagem do usuário, depois do último breakpoint. Texto de pessoas ou do modelo entra escapado.
"""

import json
from dataclasses import dataclass, field
from html import escape
from typing import Any

from hellosquad.llm.base import ChatMessage, SystemBlock
from hellosquad.squad.loader import Skill, SquadPrompt

BRAND_NAME_PLACEHOLDER = "{{marca.nome}}"


@dataclass(frozen=True)
class HistoryMessage:
    author_type: str
    author_agent_id: str | None
    body: str


@dataclass(frozen=True)
class RunContext:
    locale: str
    brand_name: str
    request: str
    work_title: str
    delivery_type: str | None
    briefing: dict[str, Any]
    history: list[HistoryMessage] = field(default_factory=list)
    brand_facts: list[str] = field(default_factory=list)
    # Última decisão da pessoa que devolveu o trabalho ao squad (ajuste, nova proposta, resposta).
    feedback: dict[str, Any] | None = None


def text(value: str) -> str:
    return escape(value, quote=False)


def as_json(value: Any) -> str:
    return text(json.dumps(value, ensure_ascii=False, sort_keys=True))


def system_blocks(prompt: SquadPrompt, ctx: RunContext) -> list[SystemBlock]:
    soul = prompt.agent.soul.replace(BRAND_NAME_PLACEHOLDER, ctx.brand_name)
    facts = "\n".join(f"<fato>{text(fact)}</fato>" for fact in ctx.brand_facts)
    workspace = "\n".join(
        [
            f"<idioma>{text(ctx.locale)}</idioma>",
            f"<marca>{text(ctx.brand_name)}</marca>",
            f"<fatos_da_marca>{facts}</fatos_da_marca>" if facts else "<fatos_da_marca/>",
        ]
    )
    return [
        SystemBlock(text=f"{prompt.shared_rules}\n\n{soul}"),
        SystemBlock(text=prompt.skill.body, cache=True),
        SystemBlock(text=workspace, cache=True),
    ]


def author_label(message: HistoryMessage) -> str:
    if message.author_type == "agent" and message.author_agent_id:
        return message.author_agent_id
    return "pessoa" if message.author_type == "user" else "sistema"


def history_block(ctx: RunContext) -> str:
    lines = [
        f'<mensagem autor="{escape(author_label(m))}">{text(m.body)}</mensagem>'
        for m in ctx.history
    ]
    return "<historico>\n" + "\n".join(lines) + "\n</historico>" if lines else "<historico/>"


def feedback_block(ctx: RunContext) -> list[str]:
    if not ctx.feedback:
        return []
    feedback = ctx.feedback
    attrs = f' decisao="{escape(feedback["decisao"])}"'
    if feedback.get("saida"):
        attrs += f' saida="{escape(feedback["saida"])}"'
    note = text(feedback.get("observacao") or "")
    parts = [f"<retorno_da_pessoa{attrs}>{note}</retorno_da_pessoa>"]
    if feedback.get("versao") is not None:
        parts.append(
            f'<versao_anterior numero="{feedback["versao_no"]}">{as_json(feedback["versao"])}'
            "</versao_anterior>"
        )
    return parts


def context_block(ctx: RunContext) -> list[str]:
    delivery = f' delivery="{escape(ctx.delivery_type)}"' if ctx.delivery_type else ""
    return [
        f"<trabalho{delivery}>{text(ctx.work_title)}</trabalho>",
        history_block(ctx),
        f"<pedido>{text(ctx.request)}</pedido>",
        *feedback_block(ctx),
    ]


def user_message(parts: list[str]) -> list[ChatMessage]:
    return [ChatMessage(role="user", content="\n".join(parts))]


def triage_messages(ctx: RunContext, target: Skill) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(ctx.briefing)}</briefing>",
            f"<essenciais>{text(', '.join(target.essentials))}</essenciais>",
            "<etapa>triagem</etapa>",
        ]
    )


def production_messages(
    ctx: RunContext, briefing: dict[str, Any], handoff: str
) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            f"<resumo_do_nexo>{text(handoff)}</resumo_do_nexo>",
            "<etapa>produzir</etapa>",
        ]
    )


def check_messages(
    ctx: RunContext, briefing: dict[str, Any], delivery: dict[str, Any]
) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            f"<versao>{as_json(delivery)}</versao>",
            "<etapa>autoverificar</etapa>",
        ]
    )


def revision_messages(
    ctx: RunContext, briefing: dict[str, Any], delivery: dict[str, Any], review: dict[str, Any]
) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            f"<versao>{as_json(delivery)}</versao>",
            f"<parecer>{as_json(review)}</parecer>",
            "<etapa>revisar</etapa>",
        ]
    )
