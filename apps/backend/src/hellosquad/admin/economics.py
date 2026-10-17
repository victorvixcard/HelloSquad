"""Leituras econômicas do Consumo por cliente (SA4a): IA por crédito, margem bruta estimada e tendência
do custo por turno, comparadas com as faixas de economic_alert_rules (proposta até o Vic decidir).
Alerta só avisa: nada aqui grava nem muda conta, plano, crédito ou estado."""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from hellosquad.admin.schemas import (
    AlertRule,
    EconomicAlert,
    EconomicReadings,
    QualityRates,
    QualityRow,
)

CENTS = Decimal("0.0001")
MICRO = Decimal("0.000001")
METRIC_ORDER = ["ai_cost_per_credit_brl", "gross_margin", "cost_per_turn_trend"]

RULES = """
select distinct on (r.metric)
       r.metric, r.comparison, r.threshold, r.credit_reference_brl, r.window_days, r.proposal,
       r.source, r.valid_from
from public.economic_alert_rules r
where r.valid_from <= now()
order by r.metric, r.valid_from desc
"""


def sorted_rules(rows: list[dict]) -> list[AlertRule]:
    return sorted((AlertRule(**r) for r in rows), key=lambda r: METRIC_ORDER.index(r.metric))


def trend_window(rules: list[AlertRule]) -> int:
    return next((r.window_days for r in rules if r.window_days), 7)


def trend_dates(until: date, days: int) -> tuple[date, date]:
    """(primeiro dia dos N dias anteriores, primeiro dia dos últimos N dias); os dois terminam em until."""
    recent = until - timedelta(days=days - 1)
    return recent - timedelta(days=days), recent


@dataclass
class Sums:
    credits_charged: Decimal
    ai_cost_usd: Decimal
    turns: int
    turn_cost_usd: Decimal
    recent_turns: int = 0
    recent_turn_cost_usd: Decimal = Decimal(0)
    previous_turns: int = 0
    previous_turn_cost_usd: Decimal = Decimal(0)


def cost_brl(cost_usd: Decimal, usd_brl: Decimal | None) -> Decimal | None:
    return (cost_usd * usd_brl).quantize(CENTS) if usd_brl is not None else None


def per_credit(brl: Decimal | None, credits: Decimal) -> Decimal | None:
    return (brl / credits).quantize(CENTS) if brl is not None and credits else None


def margin(brl: Decimal | None, credits: Decimal, rule: AlertRule | None) -> Decimal | None:
    if brl is None or not credits or rule is None or rule.credit_reference_brl is None:
        return None
    return (1 - brl / (credits * rule.credit_reference_brl)).quantize(CENTS)


def per_turn(cost: Decimal, turns: int) -> Decimal | None:
    return (cost / turns).quantize(MICRO) if turns else None


def outside(rule: AlertRule, value: Decimal) -> bool:
    return value > rule.threshold if rule.comparison == "max" else value < rule.threshold


def readings(s: Sums, usd_brl: Decimal | None, rules: list[AlertRule]) -> EconomicReadings:
    by_metric = {r.metric: r for r in rules}
    brl = cost_brl(s.ai_cost_usd, usd_brl)
    trend = None
    if s.recent_turns and s.previous_turns and s.previous_turn_cost_usd:
        recent = s.recent_turn_cost_usd / s.recent_turns
        previous = s.previous_turn_cost_usd / s.previous_turns
        trend = (recent / previous - 1).quantize(CENTS)
    values = {
        "ai_cost_per_credit_brl": per_credit(brl, s.credits_charged),
        "gross_margin": margin(brl, s.credits_charged, by_metric.get("gross_margin")),
        "cost_per_turn_trend": trend,
    }
    alerts = [
        EconomicAlert(
            metric=r.metric,
            value=values[r.metric],
            threshold=r.threshold,
            comparison=r.comparison,
            proposal=r.proposal,
        )
        for r in rules
        if values[r.metric] is not None and outside(r, values[r.metric])
    ]
    return EconomicReadings(
        **values, cost_per_turn_usd=per_turn(s.turn_cost_usd, s.turns), alerts=alerts
    )


def rate(part: int | Decimal, whole: int, scale: int = 1) -> Decimal | None:
    return (Decimal(part) * scale / whole).quantize(CENTS) if whole else None


def quality_rates(row: QualityRow) -> QualityRates:
    """Contagens viram taxa para comparar períodos de volumes diferentes (como o protótipo)."""
    d = row.deliveries
    return QualityRates(
        approved_first_rate=rate(row.approved_first_time, d),
        adjustments_per_delivery=rate(row.adjustments, d),
        not_approved_rate=rate(row.not_approved, d),
        ai_cost_per_approved_usd=row.ai_cost_per_approved_usd,
        agent_errors_per_100=rate(row.agent_errors, d, 100),
        failed_calls_per_100=rate(row.failed_steps, d, 100),
    )


def rates_delta(a: QualityRates, b: QualityRates) -> QualityRates:
    return QualityRates(
        **{
            f: (getattr(b, f) - getattr(a, f))
            if getattr(a, f) is not None and getattr(b, f) is not None
            else None
            for f in QualityRates.model_fields
        }
    )
