"""Montagem do prompt de um run: prefixo estável (regras + SOUL + skill, cacheado) e contexto.

Ordem do system: regras compartilhadas e SOUL → skill da delivery (cache) → workspace: idioma,
marca e os conhecimentos essenciais da Memória da Marca (cache). O que muda a cada run ou chamada
(memória achada pela busca, histórico, pedido, etapa) vai na mensagem do usuário, depois do último
breakpoint. Texto de pessoas ou do modelo entra escapado.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from html import escape
from typing import Any

from hellosquad.llm.base import ChatMessage, SystemBlock
from hellosquad.squad.loader import Skill, SquadPrompt
from hellosquad.squad.memory import AgentLearning, MemoryFact, render_fact, render_learning

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
    # Memória da Marca recuperada para o run: essenciais (system) e achados pela busca (usuário).
    memory: list[MemoryFact] = field(default_factory=list)
    # Última decisão da pessoa que devolveu o trabalho ao squad (ajuste, nova proposta, resposta).
    feedback: dict[str, Any] | None = None
    # Aprendizados promovidos deste cliente com o agente (camada 3), já dentro do orçamento.
    learnings: list[AgentLearning] = field(default_factory=list)


def text(value: str) -> str:
    return escape(value, quote=False)


def as_json(value: Any) -> str:
    return text(json.dumps(value, ensure_ascii=False, sort_keys=True))


def facts_block(ctx: RunContext, reason: str) -> str:
    return "\n".join(
        render_fact(ctx.locale, f.state, f.topic, f.key, f.content)
        for f in ctx.memory
        if f.reason == reason
    )


def system_blocks(prompt: SquadPrompt, ctx: RunContext) -> list[SystemBlock]:
    soul = prompt.agent.soul.replace(BRAND_NAME_PLACEHOLDER, ctx.brand_name)
    facts = facts_block(ctx, "essential")
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
    relevant = facts_block(ctx, "search")
    learned = "\n".join(render_learning(item) for item in ctx.learnings)
    return [
        f"<trabalho{delivery}>{text(ctx.work_title)}</trabalho>",
        *([f"<aprendizados>\n{learned}\n</aprendizados>"] if learned else []),
        *([f"<memoria_relevante>\n{relevant}\n</memoria_relevante>"] if relevant else []),
        history_block(ctx),
        f"<pedido>{text(ctx.request)}</pedido>",
        *feedback_block(ctx),
    ]


def user_message(parts: list[str]) -> list[ChatMessage]:
    return [ChatMessage(role="user", content="\n".join(parts))]


def reply_messages(ctx: RunContext) -> list[ChatMessage]:
    relevant = facts_block(ctx, "search")
    return user_message(
        [
            *([f"<memoria_relevante>\n{relevant}\n</memoria_relevante>"] if relevant else []),
            history_block(ctx),
            f"<mensagem_da_pessoa>{text(ctx.request)}</mensagem_da_pessoa>",
            "<etapa>resposta</etapa>",
        ]
    )


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
    ctx: RunContext, briefing: dict[str, Any], handoff: str, extra: Sequence[str] = ()
) -> list[ChatMessage]:
    """`extra`: contexto que o fluxo juntou para a delivery (busca web, calendário, documentos
    aprovados, data de hoje), já montado e escapado."""
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            f"<resumo_do_nexo>{text(handoff)}</resumo_do_nexo>",
            *extra,
            "<etapa>produzir</etapa>",
        ]
    )


def check_messages(
    ctx: RunContext, briefing: dict[str, Any], delivery: dict[str, Any], extra: Sequence[str] = ()
) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            *extra,
            f"<versao>{as_json(delivery)}</versao>",
            "<etapa>autoverificar</etapa>",
        ]
    )


def revision_messages(
    ctx: RunContext,
    briefing: dict[str, Any],
    delivery: dict[str, Any],
    review: dict[str, Any],
    extra: Sequence[str] = (),
) -> list[ChatMessage]:
    return user_message(
        [
            *context_block(ctx),
            f"<briefing>{as_json(briefing)}</briefing>",
            *extra,
            f"<versao>{as_json(delivery)}</versao>",
            f"<parecer>{as_json(review)}</parecer>",
            "<etapa>revisar</etapa>",
        ]
    )
