"""GA4: Data API v1beta (`properties/{id}:runReport`) e Admin API (`accountSummaries`).

As sessões do site saem da mesma função do `metrics_daily` do seed (sessões no site da Miolo e da
Vitta, com o buraco de 3 dias da Miolo); os outros números derivam das sessões com pesos fixos.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from . import auth, errors, fixtures

router = APIRouter(tags=["ga4"])

DATA_HOST = "analyticsdata.googleapis.com"
ADMIN_HOST = "analyticsadmin.googleapis.com"
READ_SCOPES = (
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics",
)
SCHEMA = "https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema"
DIMENSIONS = {"date", "sessionDefaultChannelGroup", "pagePath"}
METRICS = {
    "sessions": "TYPE_INTEGER",
    "activeUsers": "TYPE_INTEGER",
    "totalUsers": "TYPE_INTEGER",
    "newUsers": "TYPE_INTEGER",
    "screenPageViews": "TYPE_INTEGER",
    "keyEvents": "TYPE_INTEGER",
    "engagementRate": "TYPE_FLOAT",
}
MAX_HISTORY_DAYS = 400


def _account(property_id: str) -> fixtures.GoogleAccount | None:
    return next(
        (
            g
            for g in fixtures.GOOGLE_ACCOUNTS.values()
            if g.ga_property == f"properties/{property_id}"
        ),
        None,
    )


def _parse_date(value: str, today: date) -> date:
    if value == "today":
        return today
    if value == "yesterday":
        return today - timedelta(days=1)
    match = re.fullmatch(r"(\d+)daysAgo", value or "")
    if match:
        return today - timedelta(days=int(match.group(1)))
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise errors.google_error(
            400, f"Invalid date: '{value}'. Use YYYY-MM-DD, today, yesterday or NdaysAgo."
        ) from exc


def _day_metrics(slug: str, days_ago: int) -> dict[str, float] | None:
    if days_ago < 0 or days_ago > MAX_HISTORY_DAYS or not fixtures.GA4_HAS_DATA[slug]:
        return None
    sessions = fixtures.seed_value(slug, "sessions", days_ago)
    if sessions is None:
        return None
    active = round(sessions * 0.78)
    return {
        "sessions": sessions,
        "activeUsers": active,
        "totalUsers": active,
        "newUsers": round(active * 0.42),
        "screenPageViews": round(sessions * 2.3),
        "keyEvents": round(sessions * 0.03),
        "engagementRate": round(0.55 + 0.1 * fixtures.noise01(slug, "eng", days_ago), 4),
    }


def _rows_for_day(slug: str, day: date, days_ago: int, dims: list[str]) -> list[tuple[dict, dict]]:
    values = _day_metrics(slug, days_ago)
    if values is None:
        return []
    groups: list[tuple[dict, float]] = [({}, 1.0)]
    if "sessionDefaultChannelGroup" in dims:
        groups = [
            ({**k, "sessionDefaultChannelGroup": c}, w * cw)
            for k, w in groups
            for c, cw in fixtures.GA4_CHANNELS
        ]
    if "pagePath" in dims:
        groups = [
            ({**k, "pagePath": p}, w * pw) for k, w in groups for p, pw in fixtures.GA4_PAGES[slug]
        ]
    shares = [(str(i), w) for i, (_k, w) in enumerate(groups)]
    split = {
        metric: dict(fixtures.split(int(values[metric]), shares))
        for metric, kind in METRICS.items()
        if kind == "TYPE_INTEGER"
    }
    rows = []
    for i, (keys, _w) in enumerate(groups):
        if "date" in dims:
            keys = {**keys, "date": day.strftime("%Y%m%d")}
        metrics = {m: split[m][str(i)] for m in split}
        metrics["engagementRate"] = values["engagementRate"]
        rows.append((keys, metrics))
    return rows


def _aggregate(rows: list[tuple[dict, dict]], dims: list[str]) -> dict[tuple, dict]:
    result: dict[tuple, dict] = {}
    for keys, metrics in rows:
        key = tuple(keys.get(d, "") for d in dims)
        bucket = result.setdefault(key, {m: 0 for m in METRICS} | {"_eng": 0.0})
        for metric, value in metrics.items():
            if metric == "engagementRate":
                bucket["_eng"] += value * metrics["sessions"]
            else:
                bucket[metric] += value
    for bucket in result.values():
        sessions = bucket["sessions"] or 0
        bucket["engagementRate"] = round(bucket.pop("_eng") / sessions, 4) if sessions else 0.0
    return result


def _format(metric: str, value: float) -> str:
    if METRICS[metric] == "TYPE_FLOAT":
        return f"{value:.4f}".rstrip("0").rstrip(".") if value else "0"
    return str(int(value))


@router.post("/google/analyticsdata/v1beta/properties/{property_id}:runReport")
async def run_report(property_id: str, request: Request) -> JSONResponse:
    method = "google.analytics.data.v1beta.BetaAnalyticsData.RunReport"
    token = auth.google_token(request, DATA_HOST, method, READ_SCOPES)
    account = _account(property_id)
    user = auth.user_of(token)
    if account is None or account.workspace != user.workspace:
        raise errors.google_error(
            403,
            "User does not have sufficient permissions for this property. To learn more about "
            "Property ID, see https://developers.google.com/analytics/devguides/reporting/data/v1/property-id.",
        )
    try:
        body = await request.json()
    except ValueError as exc:
        raise errors.google_error(400, "Invalid JSON payload received.") from exc
    dims = [d.get("name") for d in body.get("dimensions", [])]
    metrics = [m.get("name") for m in body.get("metrics", [])]
    for name in dims:
        if name not in DIMENSIONS:
            raise errors.google_error(
                400,
                f"Field {name} is not a valid dimension. For a list of valid dimensions and "
                f"metrics, see {SCHEMA}",
            )
    for name in metrics:
        if name not in METRICS:
            raise errors.google_error(
                400,
                f"Field {name} is not a valid metric. For a list of valid dimensions and "
                f"metrics, see {SCHEMA}",
            )
    if not metrics and not dims:
        raise errors.google_error(400, "Requests must have at least one dimension or metric.")
    ranges = body.get("dateRanges") or [{"startDate": "28daysAgo", "endDate": "yesterday"}]
    if len(ranges) > 4:
        raise errors.google_error(400, "Requests are limited to 4 dateRanges.")
    today = fixtures.today()
    out_dims = list(dims)
    if len(ranges) > 1 and "dateRange" not in out_dims:
        out_dims.append("dateRange")
    rows: list[tuple[dict, dict]] = []
    for index, date_range in enumerate(ranges):
        start = _parse_date(date_range.get("startDate", ""), today)
        end = _parse_date(date_range.get("endDate", ""), today)
        if start > end:
            raise errors.google_error(
                400, "The start date must be before or equal to the end date."
            )
        name = date_range.get("name") or f"date_range_{index}"
        day = start
        while day <= end:
            for keys, values in _rows_for_day(account.workspace, day, (today - day).days, dims):
                if len(ranges) > 1:
                    keys = {**keys, "dateRange": name}
                rows.append((keys, values))
            day += timedelta(days=1)
    aggregated = _aggregate(rows, out_dims)
    ordered = sorted(aggregated.items(), key=lambda kv: kv[0])
    order_bys = body.get("orderBys") or []
    if order_bys:
        for order in reversed(order_bys):
            desc = bool(order.get("desc"))
            if "metric" in order:
                metric = order["metric"].get("metricName")
                ordered.sort(key=lambda kv, m=metric: kv[1].get(m, 0), reverse=desc)
            elif "dimension" in order:
                dim = order["dimension"].get("dimensionName")
                idx = out_dims.index(dim) if dim in out_dims else 0
                ordered.sort(key=lambda kv, i=idx: kv[0][i], reverse=desc)
    elif "date" not in out_dims and metrics:
        ordered.sort(key=lambda kv: kv[1][metrics[0]], reverse=True)
    offset = int(body.get("offset", 0) or 0)
    limit = min(int(body.get("limit", 10000) or 10000), 250000)
    page = ordered[offset : offset + limit]
    response: dict = {
        "dimensionHeaders": [{"name": d} for d in out_dims],
        "metricHeaders": [{"name": m, "type": METRICS[m]} for m in metrics],
    }
    if page:
        response["rows"] = [
            {
                "dimensionValues": [{"value": v} for v in key],
                "metricValues": [{"value": _format(m, vals[m])} for m in metrics],
            }
            for key, vals in page
        ]
        response["rowCount"] = len(ordered)
    aggregations = body.get("metricAggregations") or []
    if "TOTAL" in aggregations and ordered:
        total = _aggregate([({}, v) for _k, v in ordered], [])[()]
        response["totals"] = [
            {
                "dimensionValues": [{"value": "RESERVED_TOTAL"} for _ in out_dims],
                "metricValues": [{"value": _format(m, total[m])} for m in metrics],
            }
        ]
    response["metadata"] = {"currencyCode": "BRL", "timeZone": "America/Sao_Paulo"}
    if body.get("returnPropertyQuota"):
        response["propertyQuota"] = {
            "tokensPerDay": {"consumed": 12, "remaining": 199988},
            "tokensPerHour": {"consumed": 12, "remaining": 39988},
            "concurrentRequests": {"consumed": 0, "remaining": 10},
            "serverErrorsPerProjectPerHour": {"consumed": 0, "remaining": 10},
            "potentiallyThresholdedRequestsPerHour": {"consumed": 0, "remaining": 120},
            "tokensPerProjectPerHour": {"consumed": 12, "remaining": 13988},
        }
    response["kind"] = "analyticsData#runReport"
    return JSONResponse(response)


@router.get("/google/analyticsadmin/v1beta/accountSummaries")
def account_summaries(request: Request) -> JSONResponse:
    method = "google.analytics.admin.v1beta.AnalyticsAdminService.ListAccountSummaries"
    token = auth.google_token(request, ADMIN_HOST, method, READ_SCOPES)
    user = auth.user_of(token)
    account = fixtures.GOOGLE_ACCOUNTS[user.workspace]
    number = account.ga_account.split("/")[1]
    return JSONResponse(
        {
            "accountSummaries": [
                {
                    "name": f"accountSummaries/{number}",
                    "account": account.ga_account,
                    "displayName": account.ga_account_name,
                    "propertySummaries": [
                        {
                            "property": account.ga_property,
                            "displayName": account.ga_property_name,
                            "propertyType": "PROPERTY_TYPE_ORDINARY",
                            "parent": account.ga_account,
                        }
                    ],
                }
            ]
        }
    )
