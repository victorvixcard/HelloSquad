"""Google Business Profile: contas (Account Management v1), locais (Business Information v1) e
`localPosts`/`reviews` (My Business v4).

O escopo é um só (`business.manage`): ler e agir não se distinguem pelo escopo no Google; quem
separa é a permissão da conexão no HelloSquad. A API não agenda post: agendar é do scheduler do
HelloSquad, que cria o post na hora (campo desconhecido no corpo dá 400, como no real).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from . import auth, errors, fixtures
from .state import STATE

router = APIRouter(tags=["google-business-profile"])

HOST = "mybusiness.googleapis.com"
SCOPES = (
    "https://www.googleapis.com/auth/business.manage",
    "https://www.googleapis.com/auth/plus.business.manage",
)
V4 = "/google/mybusiness/v4/accounts/{account_id}/locations/{location_id}"
STARS = {1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE"}
POST_FIELDS = {
    "languageCode",
    "summary",
    "callToAction",
    "media",
    "topicType",
    "event",
    "offer",
    "alertType",
}
TOPIC_TYPES = {"STANDARD", "EVENT", "OFFER", "ALERT"}
CTA_TYPES = {"BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP", "CALL"}


def _rfc3339(ts: float) -> str:
    return datetime.fromtimestamp(ts, UTC).strftime("%Y-%m-%dT%H:%M:%S.%fZ").replace("000Z", "Z")


def _token(request: Request, method: str):
    return auth.google_token(request, HOST, method, SCOPES)


def _location(token, account_id: str, location_id: str) -> tuple[fixtures.GoogleAccount, str]:
    account = fixtures.GOOGLE_ACCOUNTS[auth.user_of(token).workspace]
    if account.gbp_account != f"accounts/{account_id}" or account.gbp_location != (
        f"locations/{location_id}"
    ):
        raise errors.google_error(403, "The caller does not have permission")
    return account, f"accounts/{account_id}/locations/{location_id}"


@router.get("/google/mybusinessaccountmanagement/v1/accounts")
def accounts(request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.accountmanagement.v1.AccessControl.ListAccounts")
    account = fixtures.GOOGLE_ACCOUNTS[auth.user_of(token).workspace]
    return JSONResponse(
        {
            "accounts": [
                {
                    "name": account.gbp_account,
                    "accountName": account.gbp_account_name,
                    "type": "LOCATION_GROUP",
                    "role": "PRIMARY_OWNER",
                    "verificationState": "VERIFIED",
                    "vettedState": "NOT_VETTED",
                    "permissionLevel": "OWNER_LEVEL",
                }
            ]
        }
    )


@router.get("/google/mybusinessbusinessinformation/v1/accounts/{account_id}/locations")
def locations(account_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.businessinformation.v1.Locations.ListLocations")
    account = fixtures.GOOGLE_ACCOUNTS[auth.user_of(token).workspace]
    if account.gbp_account != f"accounts/{account_id}":
        raise errors.google_error(403, "The caller does not have permission")
    read_mask = request.query_params.get("readMask")
    if not read_mask:
        raise errors.google_error(
            400, "Request contains an invalid argument.", reason="INVALID_ARGUMENT", service=HOST
        )
    full = {
        "name": account.gbp_location,
        "title": account.gbp_title,
        "storefrontAddress": {
            "regionCode": "BR",
            "languageCode": "pt-BR",
            "administrativeArea": account.region,
            "locality": account.locality,
            "sublocality": account.sublocality,
            "addressLines": ["Rua do Exemplo, 100"],
        },
        "phoneNumbers": {"primaryPhone": account.phone},
        "websiteUri": account.site_url.replace("sc-domain:", "https://").rstrip("/") + "/",
        "categories": {
            "primaryCategory": {"name": account.category[0], "displayName": account.category[1]}
        },
        "metadata": {
            "hasVoiceOfMerchant": True,
            "mapsUri": f"{request.base_url}_mock/media/maps-{account.workspace}.svg",
        },
    }
    fields = {f.strip() for f in read_mask.split(",")}
    location = {k: v for k, v in full.items() if k in fields or k == "name"}
    return JSONResponse({"locations": [location], "totalSize": 1})


def _post_body(post: dict, location: str, request: Request) -> dict:
    body = {
        "name": f"{location}/localPosts/{post['id']}",
        "languageCode": post["languageCode"],
        "summary": post["summary"],
        "state": post["state"],
        "updateTime": _rfc3339(post["createTime"]),
        "createTime": _rfc3339(post["createTime"]),
        "searchUrl": f"{request.base_url}_mock/media/localpost-{post['id']}.svg",
        "topicType": post["topicType"],
    }
    for key in ("callToAction", "event", "offer"):
        if post.get(key):
            body[key] = post[key]
    if post.get("media"):
        body["media"] = post["media"]
    return body


@router.get(V4 + "/localPosts")
def list_posts(account_id: str, location_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.LocalPosts.ListLocalPosts")
    _account, location = _location(token, account_id, location_id)
    posts = sorted(STATE.gbp_posts.get(location, []), key=lambda p: p["createTime"], reverse=True)
    page_size = min(int(request.query_params.get("pageSize", 20)), 100)
    start = int(request.query_params.get("pageToken", 0) or 0)
    chunk = posts[start : start + page_size]
    body: dict = {}
    if chunk:
        body["localPosts"] = [_post_body(p, location, request) for p in chunk]
    if start + page_size < len(posts):
        body["nextPageToken"] = str(start + page_size)
    return JSONResponse(body)


@router.post(V4 + "/localPosts")
async def create_post(account_id: str, location_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.LocalPosts.CreateLocalPost")
    _account, location = _location(token, account_id, location_id)
    try:
        body = await request.json()
    except ValueError as exc:
        raise errors.google_error(400, "Invalid JSON payload received.") from exc
    unknown = sorted(set(body) - POST_FIELDS)
    if unknown:
        raise errors.google_error(
            400,
            f"Invalid JSON payload received. Unknown name \"{unknown[0]}\" at 'local_post': "
            "Cannot find field.",
        )
    topic = body.get("topicType", "STANDARD")
    if topic not in TOPIC_TYPES:
        raise errors.google_error(400, f"Invalid value at 'local_post.topic_type' ({topic})")
    summary = body.get("summary") or ""
    if topic == "STANDARD" and not summary:
        raise errors.google_error(
            400,
            "Request contains an invalid argument.",
            reason="INVALID_ARGUMENT",
            service=HOST,
            extra_metadata={"field": "summary"},
        )
    if len(summary) > 1500:
        raise errors.google_error(
            400,
            "Request contains an invalid argument.",
            reason="INVALID_ARGUMENT",
            service=HOST,
            extra_metadata={"field": "summary", "max": "1500"},
        )
    if topic in ("EVENT", "OFFER"):
        event = body.get("event") or {}
        if not event.get("title") or not (event.get("schedule") or {}).get("startDate"):
            raise errors.google_error(
                400,
                "Request contains an invalid argument.",
                reason="INVALID_ARGUMENT",
                service=HOST,
                extra_metadata={"field": "event"},
            )
    cta = body.get("callToAction")
    if cta and cta.get("actionType") not in CTA_TYPES:
        raise errors.google_error(400, "Invalid value at 'local_post.call_to_action.action_type'")
    post = {
        "id": STATE.next_id("2", 18),
        "summary": summary,
        "topicType": topic,
        "languageCode": body.get("languageCode", "pt-BR"),
        "createTime": STATE.now(),
        "state": "LIVE",
        "callToAction": cta,
        "media": body.get("media") or [],
        "event": body.get("event"),
        "offer": body.get("offer"),
    }
    STATE.gbp_posts.setdefault(location, []).append(post)
    return JSONResponse(_post_body(post, location, request))


@router.delete(V4 + "/localPosts/{post_id}")
def delete_post(account_id: str, location_id: str, post_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.LocalPosts.DeleteLocalPost")
    _account, location = _location(token, account_id, location_id)
    posts = STATE.gbp_posts.get(location, [])
    for post in posts:
        if post["id"] == post_id:
            posts.remove(post)
            return JSONResponse({})
    raise errors.google_error(404, "Requested entity was not found.")


def _review_body(review: dict, location: str) -> dict:
    body = {
        "name": f"{location}/reviews/{review['reviewId']}",
        "reviewId": review["reviewId"],
        "reviewer": {"displayName": review["reviewer"], "isAnonymous": False},
        "starRating": STARS[review["starRating"]],
        "comment": review["comment"],
        "createTime": _rfc3339(review["createTime"]),
        "updateTime": _rfc3339(review["updateTime"]),
    }
    if review.get("reply"):
        body["reviewReply"] = {
            "comment": review["reply"]["comment"],
            "updateTime": _rfc3339(review["reply"]["updateTime"]),
        }
    return body


@router.get(V4 + "/reviews")
def list_reviews(account_id: str, location_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.Reviews.ListReviews")
    _account, location = _location(token, account_id, location_id)
    reviews = list(STATE.gbp_reviews.get(location, []))
    order = request.query_params.get("orderBy", "updateTime desc")
    if order.startswith("rating"):
        reviews.sort(key=lambda r: r["starRating"], reverse=order.endswith("desc"))
    else:
        reviews.sort(key=lambda r: r["updateTime"], reverse=True)
    page_size = min(int(request.query_params.get("pageSize", 50)), 50)
    start = int(request.query_params.get("pageToken", 0) or 0)
    chunk = reviews[start : start + page_size]
    body: dict = {}
    if chunk:
        body["reviews"] = [_review_body(r, location) for r in chunk]
    if reviews:
        body["averageRating"] = round(sum(r["starRating"] for r in reviews) / len(reviews), 1)
    body["totalReviewCount"] = len(reviews)
    if start + page_size < len(reviews):
        body["nextPageToken"] = str(start + page_size)
    return JSONResponse(body)


def _find_review(location: str, review_id: str) -> dict:
    for review in STATE.gbp_reviews.get(location, []):
        if review["reviewId"] == review_id:
            return review
    raise errors.google_error(404, "Requested entity was not found.")


@router.get(V4 + "/reviews/{review_id}")
def get_review(account_id: str, location_id: str, review_id: str, request: Request) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.Reviews.GetReview")
    _account, location = _location(token, account_id, location_id)
    return JSONResponse(_review_body(_find_review(location, review_id), location))


@router.put(V4 + "/reviews/{review_id}/reply")
async def reply_review(
    account_id: str, location_id: str, review_id: str, request: Request
) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.Reviews.UpdateReply")
    _account, location = _location(token, account_id, location_id)
    review = _find_review(location, review_id)
    try:
        body = await request.json()
    except ValueError as exc:
        raise errors.google_error(400, "Invalid JSON payload received.") from exc
    comment = (body or {}).get("comment") or ""
    if not comment.strip() or len(comment.encode()) > 4096:
        raise errors.google_error(
            400,
            "Request contains an invalid argument.",
            reason="INVALID_ARGUMENT",
            service=HOST,
            extra_metadata={"field": "comment"},
        )
    review["reply"] = {"comment": comment, "updateTime": STATE.now()}
    return JSONResponse({"comment": comment, "updateTime": _rfc3339(review["reply"]["updateTime"])})


@router.delete(V4 + "/reviews/{review_id}/reply")
def delete_reply(
    account_id: str, location_id: str, review_id: str, request: Request
) -> JSONResponse:
    token = _token(request, "google.mybusiness.v4.Reviews.DeleteReply")
    _account, location = _location(token, account_id, location_id)
    review = _find_review(location, review_id)
    if not review.get("reply"):
        raise errors.google_error(404, "Requested entity was not found.")
    review["reply"] = None
    return JSONResponse({})
