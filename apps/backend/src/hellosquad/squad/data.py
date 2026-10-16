"""Dados do workspace que o fluxo lê antes de produzir: a base do Max e as métricas da Íris.

Os números das entregas saem daqui, nunca do modelo: o modelo recebe o resumo calculado (com ids) e
escreve a leitura; o fluxo põe os números na versão. Correlação não é causa: leitura `causa` só fica
com um teste controlado citado (ids T…), que a plataforma ainda não tem; sem ele, vira `hipotese`.
"""

from collections import Counter
from collections.abc import Callable, Iterable, Mapping
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from hellosquad.squad.deliveries import Reading, Recommendation
from hellosquad.squad.prompt import as_json, text

Contact = Mapping[str, Any]

# Segmentos possíveis da base (06.03 e 06.01), por critério fechado: recência e frequência.
SEGMENT_RULES: dict[str, Callable[[Contact, date], bool]] = {
    "todos": lambda c, today: True,
    "ativos_30": lambda c, today: _days_since(c, today) is not None and _days_since(c, today) <= 30,
    "esfriando_31_90": lambda c, today: (
        _days_since(c, today) is not None and 31 <= _days_since(c, today) <= 90
    ),
    "inativos_90": lambda c, today: (
        _days_since(c, today) is not None and _days_since(c, today) > 90
    ),
    "sem_compra": lambda c, today: c["last_purchase_on"] is None,
    "recorrentes": lambda c, today: (c["purchases_count"] or 0) >= 3,
}
CHANNELS = ("email", "whatsapp")

# Séries conhecidas, na ordem das evidências (E1, E2…); seguidores é estoque, o resto soma.
SERIES_ORDER = [
    ("site", "sessions"),
    ("instagram", "followers"),
    ("instagram", "reach"),
    ("store", "orders"),
]
STOCK_METRICS = {"followers"}
PERIOD_WORDS = (("trimestre", 90), ("semana", 7), ("mês", 30), ("mes", 30))
DEFAULT_PERIOD_DAYS = 30


def _days_since(contact: Contact, today: date) -> int | None:
    last = contact["last_purchase_on"]
    return None if last is None else (today - last).days


def _eligible(contacts: Iterable[Contact]) -> dict[str, int]:
    rows = list(contacts)
    return {ch: sum(1 for c in rows if c[f"{ch}_ok"]) for ch in CHANNELS}


def contact_base(contacts: list[Contact], today: date) -> dict[str, Any]:
    """Resumo da base com consentimento vigente por canal e o tamanho de cada segmento possível."""
    eligible = _eligible(contacts)
    with_any = sum(1 for c in contacts if any(c[f"{ch}_ok"] for ch in CHANNELS))
    sources = Counter(c["source"] for c in contacts)
    segments = {}
    for segment_id, rule in SEGMENT_RULES.items():
        members = [c for c in contacts if rule(c, today)]
        segments[segment_id] = {"tamanho": len(members), "elegiveis": _eligible(members)}
    return {
        "total": len(contacts),
        "com_consentimento": {**eligible, "algum": with_any},
        "sem_consentimento": len(contacts) - with_any,
        "origens": [{"origem": s, "contatos": n} for s, n in sorted(sources.items())],
        "calculado_em": today.isoformat(),
        "segmentos": segments,
    }


def contact_block(base: dict[str, Any]) -> str:
    return f"<base_de_contatos>{as_json(base)}</base_de_contatos>"


def base_summary(base: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in base.items() if k != "segmentos"}


def segment_numbers(base: dict[str, Any], segment_id: str | None) -> dict[str, Any] | None:
    if segment_id is None:
        return None
    return base["segmentos"][segment_id]


def period_days(*texts: str | None) -> int:
    """Período da comparação pelo pedido: semana (7), mês (30) ou trimestre (90); sem pista, 30."""
    joined = " ".join(t for t in texts if t).lower()
    return next((days for word, days in PERIOD_WORDS if word in joined), DEFAULT_PERIOD_DAYS)


def _number(value: Decimal | float | None) -> int | float | None:
    if value is None:
        return None
    value = Decimal(value).quantize(Decimal("0.01"))
    return int(value) if value == value.to_integral_value() else float(value)


def _variation(current: Decimal | None, previous: Decimal | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return float(((current - previous) * 100 / previous).quantize(Decimal("0.1")))


def _gaps(days: set[date], start: date, end: date) -> list[tuple[date, date]]:
    gaps, opened = [], None
    day = start
    while day <= end:
        if day not in days and opened is None:
            opened = day
        if day in days and opened is not None:
            gaps.append((opened, day - timedelta(days=1)))
            opened = None
        day += timedelta(days=1)
    if opened is not None:
        gaps.append((opened, end))
    return gaps


def metrics_evidence(rows: list[Mapping[str, Any]], last_day: date, days: int) -> dict[str, Any]:
    """Compara o período atual (até o último dia com dado) com o anterior de mesmo tamanho.

    Métrica de fluxo: soma do período e variação pela média diária dos dias com dado (dia sem dado
    não vira zero); estoque (seguidores): último valor de cada período. Cada série vira uma
    evidência com id (E1, E2…), na ordem de SERIES_ORDER.
    """
    current_start = last_day - timedelta(days=days - 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    series: dict[tuple[str, str], list[Mapping[str, Any]]] = {}
    for row in rows:
        series.setdefault((row["channel"], row["metric"]), []).append(row)
    known = [k for k in SERIES_ORDER if k in series]
    keys = known + sorted(k for k in series if k not in SERIES_ORDER)

    evidence, gaps, sources = [], [], set()
    for n, key in enumerate(keys, start=1):
        points = sorted(series[key], key=lambda r: r["day"])
        current = [p for p in points if current_start <= p["day"] <= last_day]
        previous = [p for p in points if previous_start <= p["day"] <= previous_end]
        stock = key[1] in STOCK_METRICS
        if stock:
            now = current[-1]["value"] if current else None
            before = previous[-1]["value"] if previous else None
            variation = _variation(now, before)
            averages = {}
        else:
            now = sum((p["value"] for p in current), Decimal(0)) if current else None
            before = sum((p["value"] for p in previous), Decimal(0)) if previous else None
            avg_now = now / len(current) if current else None
            avg_before = before / len(previous) if previous else None
            variation = _variation(avg_now, avg_before)
            averages = {
                "media_diaria_atual": _number(avg_now),
                "media_diaria_anterior": _number(avg_before),
            }
        sources |= {p["source"] for p in points}
        evidence.append(
            {
                "id": f"E{n}",
                "tipo": "metrica",
                "canal": key[0],
                "metrica": key[1],
                "unidade": points[0]["unit"],
                "agregacao": "ultimo" if stock else "soma",
                "atual": _number(now),
                "anterior": _number(before),
                **averages,
                "variacao_pct": variation,
                "base_da_variacao": "ultimo_valor" if stock else "media_diaria",
                "dias_com_dado": {"atual": len(current), "anterior": len(previous)},
                "dias_no_periodo": days,
                "origem": sorted({p["source"] for p in points}),
            }
        )
        present = {p["day"] for p in points}
        gaps += [
            {"canal": key[0], "metrica": key[1], "de": a.isoformat(), "ate": b.isoformat()}
            for a, b in _gaps(present, previous_start, last_day)
        ]
    return {
        "periodo_atual": {"inicio": current_start.isoformat(), "fim": last_day.isoformat()},
        "periodo_anterior": {"inicio": previous_start.isoformat(), "fim": previous_end.isoformat()},
        "atualizado_ate": last_day.isoformat(),
        "fontes": sorted(sources),
        "lacunas": gaps,
        "evidencias": evidence,
    }


def metrics_block(data: dict[str, Any]) -> str:
    current, previous = data["periodo_atual"], data["periodo_anterior"]
    lines = [
        "<evidencia "
        + " ".join(
            f'{k}="{text(str(v))}"'
            for k, v in (
                ("id", e["id"]),
                ("canal", e["canal"]),
                ("metrica", e["metrica"]),
                ("unidade", e["unidade"]),
                ("agregacao", e["agregacao"]),
                ("atual", e["atual"]),
                ("anterior", e["anterior"]),
                ("variacao_pct", e["variacao_pct"]),
                ("base_da_variacao", e["base_da_variacao"]),
                ("dias_com_dado_atual", e["dias_com_dado"]["atual"]),
                ("dias_com_dado_anterior", e["dias_com_dado"]["anterior"]),
                ("origem", ",".join(e["origem"])),
            )
        )
        + "/>"
        for e in data["evidencias"]
    ]
    return (
        f'<metricas periodo_atual="{current["inicio"]}/{current["fim"]}" '
        f'periodo_anterior="{previous["inicio"]}/{previous["fim"]}" '
        f'atualizado_ate="{data["atualizado_ate"]}">\n'
        + "\n".join(lines)
        + f"\n<lacunas>{as_json(data['lacunas'])}</lacunas>\n</metricas>"
    )


def metrics_summary(data: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in data.items() if k != "evidencias"}


def ground_reading(reading: Reading, evidence_ids: set[str], test_ids: set[str]) -> dict[str, Any]:
    """Fato sem evidência citada e causa sem teste controlado citado viram hipótese."""
    cited = [e for e in reading.evidencias if e in evidence_ids or e in test_ids]
    kind = reading.tipo
    if kind == "causa" and not any(e in test_ids for e in cited):
        kind = "hipotese"
    if kind == "fato" and not any(e in evidence_ids for e in cited):
        kind = "hipotese"
    return reading.model_dump(mode="json") | {"tipo": kind, "evidencias": cited}


def ground_recommendation(item: Recommendation, evidence_ids: set[str]) -> dict[str, Any]:
    cited = [e for e in item.evidencias if e in evidence_ids]
    base = item.base if item.base == "hipotese" or cited else "hipotese"
    return item.model_dump(mode="json") | {"base": base, "evidencias": cited}
