"""Catálogo do backend nos três idiomas (ADR-0010, H2-05): mesmas chaves, mesmos placeholders e
nada copiado do pt-BR sem tradução, salvo as exceções listadas abaixo."""

import string

import pytest

from hellosquad.i18n import DEFAULT_LOCALE, catalog

LOCALES = ("en", "es")

AGENT_NAMES = {
    f"agent.{agent}.name" for agent in ("nexo", "bia", "kaia", "otto", "kiwi", "max", "iris")
}
# Iguais ao pt-BR de propósito: nomes próprios (agentes e Pix) e formatos sem palavra.
SAME_EVERYWHERE = AGENT_NAMES | {
    "email.payment_method.pix",
    "status.label",
    "work.status.doing",
    "autonomy.connection.instagram",
}
SAME_AS_PT_BR = {
    "en": SAME_EVERYWHERE,
    # No espanhol, também o que se escreve igual nas duas línguas.
    "es": SAME_EVERYWHERE
    | {
        "admin.quality.how_to_read.adjustments.title",  # Ajustes por entrega
        "admin.quality.how_to_read.rates.title",  # Comparar períodos
        "date.day",  # {weekday}, {day}/{month}
        "date.weekday.5",  # sáb
        "date.weekday.6",  # dom
        "memory.objective_topic",  # Objetivos
        "memory.fact_state.confirmed",  # Confirmado
        "memory.fact_state.observed",  # Observado
        "memory.fact_state.suggested",  # Sugerido
        "memory.fact_state.discarded",  # Descartado
        "memory.source_state.connected",  # Conectada
        "memory.suggestion_state.seen",  # visto
        "work.step_label",  # etapa {seq} de {total}
        "work.next.step",  # {agent} entrega: {title}
        "work.next.respond",  # Responder {agent_to}
        "work.next.decide",  # Decidir
        "history.step.blocked",  # Etapa {seq} · {title} bloqueada: {reason}
        "history.mark.automatic",  # automático
        "project.owner_responsibility",  # decide cada entrega
        "email.role.owner",  # Titular
        "autonomy.action.identify_opportunities",  # Identificar oportunidades
    },
}


def placeholders(template: str) -> set[str]:
    return {name for _, name, _, _ in string.Formatter().parse(template) if name is not None}


@pytest.mark.parametrize("locale", LOCALES)
def test_catalog_has_exactly_the_pt_br_keys(locale: str) -> None:
    reference, translated = set(catalog(DEFAULT_LOCALE)), set(catalog(locale))
    missing, extra = sorted(reference - translated), sorted(translated - reference)
    assert not missing and not extra, f"{locale}: faltam {missing}; sobram {extra}"


@pytest.mark.parametrize("locale", LOCALES)
def test_placeholders_match_pt_br(locale: str) -> None:
    reference, translated = catalog(DEFAULT_LOCALE), catalog(locale)
    different = {
        key: (sorted(placeholders(value)), sorted(placeholders(translated[key])))
        for key, value in reference.items()
        if key in translated and placeholders(value) != placeholders(translated[key])
    }
    assert not different, f"{locale}: placeholders diferentes (pt-BR, {locale}): {different}"


@pytest.mark.parametrize("locale", LOCALES)
def test_values_are_translated(locale: str) -> None:
    reference, translated = catalog(DEFAULT_LOCALE), catalog(locale)
    same = {key for key, value in reference.items() if translated.get(key) == value}
    untranslated = sorted(same - SAME_AS_PT_BR[locale])
    stale = sorted(SAME_AS_PT_BR[locale] - same)
    assert not untranslated, f"{locale}: iguais ao pt-BR sem estar nas exceções: {untranslated}"
    assert not stale, f"{locale}: exceções que já não são iguais ao pt-BR: {stale}"
