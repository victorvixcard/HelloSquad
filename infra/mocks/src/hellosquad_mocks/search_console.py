"""Search Console API (webmasters v3): `sites` e `searchAnalytics/query`.

Como o real: dado final só até 3 dias atrás (dataState=all inclui até ontem), `rows` some quando
não há dado e as linhas vêm ordenadas por cliques.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from . import auth, errors, fixtures

router = APIRouter(tags=["search-console"])

HOST = "searchconsole.googleapis.com"
BASE = "/google/searchconsole/webmasters/v3"
READ_SCOPES = (
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/webmasters",
)
DIMENSIONS = {"query", "page", "date", "country", "device"}


def _site_for(token, site_url: str) -> fixtures.GoogleAccount:
    user = auth.user_of(token)
    account = fixtures.GOOGLE_ACCOUNTS[user.workspace]
    if account.site_url != site_url:
        raise errors.google_error(
            403,
            f"User does not have sufficient permission for site '{site_url}'. See also: "
            "https://support.google.com/webmasters/answer/2451999.",
        )
    return account


@router.get(BASE + "/sites")
def list_sites(request: Request) -> JSONResponse:
    token = auth.google_token(request, HOST, "webmasters.sites.list", READ_SCOPES)
    account = fixtures.GOOGLE_ACCOUNTS[auth.user_of(token).workspace]
    return JSONResponse(
        {"siteEntry": [{"siteUrl": account.site_url, "permissionLevel": account.site_permission}]}
    )


@router.get(BASE + "/sites/{site_url:path}")
def get_site(site_url: str, request: Request) -> JSONResponse:
    if site_url.endswith("/searchAnalytics/query"):
        raise errors.google_error(404, "Method not found.")
    token = auth.google_token(request, HOST, "webmasters.sites.get", READ_SCOPES)
    account = _site_for(token, site_url)
    return JSONResponse({"siteUrl": account.site_url, "permissionLevel": account.site_permission})


def _parse(value: str | None, field: str) -> date:
    try:
        return date.fromisoformat(value or "")
    except ValueError as exc:
        raise errors.google_error(400, f"Invalid value at '{field}': '{value}'") from exc


@router.post(BASE + "/sites/{site_url:path}/searchAnalytics/query")
async def query(site_url: str, request: Request) -> JSONResponse:
    token = auth.google_token(request, HOST, "webmasters.searchanalytics.query", READ_SCOPES)
    account = _site_for(token, site_url)
    try:
        body = await request.json()
    except ValueError as exc:
        raise errors.google_error(400, "Invalid JSON payload received.") from exc
    if not body.get("startDate") or not body.get("endDate"):
        raise errors.google_error(400, "startDate and endDate are required.")
    start = _parse(body.get("startDate"), "start_date")
    end = _parse(body.get("endDate"), "end_date")
    if start > end:
        raise errors.google_error(400, "startDate must be earlier than or equal to endDate.")
    dims = body.get("dimensions") or []
    for dim in dims:
        if dim not in DIMENSIONS:
            raise errors.google_error(400, f"Invalid value at 'dimensions': \"{dim}\"")
    today = fixtures.today()
    lag = 1 if body.get("dataState") in ("all", "hourly_all") else 3
    last = min(end, today - timedelta(days=lag))
    first = max(start, today - timedelta(days=16 * 30))
    buckets: dict[tuple, list[float]] = {}
    day = first
    while day <= last:
        days_ago = (today - day).days
        for query_text, page, clicks, impressions, position in account.queries:
            jitter = fixtures.noise01(account.workspace, query_text, days_ago)
            imp = round(impressions * (0.75 + 0.5 * jitter))
            clk = min(imp, round(clicks * (0.6 + 0.8 * fixtures.noise01(query_text, days_ago))))
            if imp == 0:
                continue
            pos = max(1.0, position + (jitter - 0.5) * 1.2)
            values = {
                "query": query_text,
                "page": page,
                "date": day.isoformat(),
                "country": "bra",
                "device": "MOBILE" if jitter < 0.68 else "DESKTOP",
            }
            key = tuple(values[d] for d in dims)
            bucket = buckets.setdefault(key, [0, 0, 0.0])
            bucket[0] += clk
            bucket[1] += imp
            bucket[2] += pos * imp
        day += timedelta(days=1)
    rows = [
        {
            "keys": list(key),
            "clicks": clk,
            "impressions": imp,
            "ctr": round(clk / imp, 6) if imp else 0.0,
            "position": round(weighted / imp, 2) if imp else 0.0,
        }
        for key, (clk, imp, weighted) in buckets.items()
    ]
    if dims == ["date"]:
        rows.sort(key=lambda r: r["keys"][0])
    else:
        rows.sort(key=lambda r: (-r["clicks"], -r["impressions"], r["keys"]))
    start_row = int(body.get("startRow", 0) or 0)
    row_limit = min(int(body.get("rowLimit", 1000) or 1000), 25000)
    page_rows = rows[start_row : start_row + row_limit]
    response: dict = {}
    if page_rows:
        response["rows"] = page_rows
    response["responseAggregationType"] = "byPage" if "page" in dims else "byProperty"
    return JSONResponse(response)
