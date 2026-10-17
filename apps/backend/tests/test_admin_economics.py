"""Leituras econômicas da SA4a sem banco: limites das faixas (no limite é OK, como no protótipo),
margem com o crédito de referência e tendência do conjunto ponderada pelo custo."""

from datetime import date, datetime
from decimal import Decimal

from hellosquad.admin import economics
from hellosquad.admin.schemas import AlertRule

RULES = [
    AlertRule(
        metric="ai_cost_per_credit_brl",
        comparison="max",
        threshold=Decimal("0.15"),
        credit_reference_brl=None,
        window_days=None,
        proposal=True,
        source="teste",
        valid_from=datetime(2026, 10, 16),
    ),
    AlertRule(
        metric="gross_margin",
        comparison="min",
        threshold=Decimal("0.65"),
        credit_reference_brl=Decimal("0.50"),
        window_days=None,
        proposal=True,
        source="teste",
        valid_from=datetime(2026, 10, 16),
    ),
    AlertRule(
        metric="cost_per_turn_trend",
        comparison="max",
        threshold=Decimal("0.10"),
        credit_reference_brl=None,
        window_days=7,
        proposal=True,
        source="teste",
        valid_from=datetime(2026, 10, 16),
    ),
]
FX = Decimal("5.40")


def sums(cost: str, credits: str, recent: str = "0.11", previous: str = "0.10") -> economics.Sums:
    return economics.Sums(
        credits_charged=Decimal(credits),
        ai_cost_usd=Decimal(cost),
        turns=2,
        turn_cost_usd=Decimal(cost),
        recent_turns=1,
        recent_turn_cost_usd=Decimal(recent),
        previous_turns=1,
        previous_turn_cost_usd=Decimal(previous),
    )


def test_exactly_on_the_threshold_is_inside_the_band() -> None:
    # US$ 0,25 × 5,40 = R$ 1,35 ÷ 9 créditos = R$ 0,15 por crédito; custo por turno +10%.
    reading = economics.readings(sums("0.25", "9"), FX, RULES)
    assert reading.ai_cost_per_credit_brl == Decimal("0.15")
    assert reading.cost_per_turn_trend == Decimal("0.10")
    assert reading.alerts == []


def test_margin_uses_the_reference_credit_and_alerts_below_the_band() -> None:
    reading = economics.readings(sums("0.35", "5"), FX, RULES)
    # R$ 1,89 de IA ÷ (5 créditos × R$ 0,50) → margem 24,4%.
    assert reading.gross_margin == Decimal("0.244")
    assert {a.metric for a in reading.alerts} == {"ai_cost_per_credit_brl", "gross_margin"}


def test_no_credit_or_no_previous_turn_means_not_evaluable() -> None:
    reading = economics.readings(sums("0.35", "0", previous="0"), FX, RULES)
    assert reading.ai_cost_per_credit_brl is None
    assert reading.gross_margin is None
    assert reading.cost_per_turn_trend is None
    assert reading.alerts == []
    assert economics.readings(sums("0.35", "5"), None, RULES).gross_margin is None


def test_set_trend_is_the_cost_weighted_mean_of_the_accounts() -> None:
    trend, accounts = economics.weighted_trend(
        [
            (Decimal("0.50"), Decimal("0.30")),
            (Decimal("-0.10"), Decimal("0.10")),
            (None, Decimal("5")),
            (Decimal("9"), Decimal("0")),
        ]
    )
    assert (trend, accounts) == (Decimal("0.35"), 2)
    assert economics.weighted_trend([(None, Decimal("1"))]) == (None, 0)


def test_trend_windows_end_on_the_last_day() -> None:
    assert economics.trend_dates(date(2026, 10, 16), 7) == (date(2026, 10, 3), date(2026, 10, 10))
