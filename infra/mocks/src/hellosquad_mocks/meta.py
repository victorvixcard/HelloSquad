"""Meta: Login do Facebook (OAuth), Graph API das Páginas e Instagram com Login do Facebook.

Espelha https://www.facebook.com/{versão}/dialog/oauth e https://graph.facebook.com/{versão}/...
A Meta não emite refresh token: o token curto do code vira token longo (60 dias) por
`grant_type=fb_exchange_token`; vencido o longo, só reconectando. Tokens de Página saem de
`/me/accounts` e morrem junto com o token do usuário que os gerou.
"""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from . import auth, errors, fixtures
from .state import STATE, AuthCode, Token

router = APIRouter(tags=["meta"])

GRAPH = "/meta/graph/{version}"
KNOWN_SCOPES = {
    "public_profile",
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "read_insights",
    "business_management",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
}
CODE_TTL = 600
CONTAINER_TTL = 24 * 3600
IG_USER_INSIGHTS = {"reach", "follower_count", "profile_views"}
IG_MEDIA_INSIGHTS = ["reach", "likes", "comments", "saved", "shares", "views", "total_interactions"]


# --- utilidades ------------------------------------------------------------------------------


def _check_version(version: str) -> None:
    if not re.fullmatch(r"v\d+\.\d+", version):
        raise errors.meta_error(f"Unknown path components: /{version}", 2500)


async def _params(request: Request) -> dict:
    params = dict(request.query_params)
    if request.method in ("POST", "PUT", "DELETE"):
        content_type = request.headers.get("content-type", "")
        raw = await request.body()
        if raw and "json" in content_type:
            try:
                body = json.loads(raw)
            except ValueError:
                body = {}
            if isinstance(body, dict):
                params.update(
                    {k: v if isinstance(v, str) else json.dumps(v) for k, v in body.items()}
                )
        elif raw:
            params.update(await auth.form_data(request))
    return params


def _fields(params: dict, default: list[str]) -> list[str]:
    raw = params.get("fields")
    if not raw:
        return default
    # Campos aninhados ("instagram_business_account{id,username}") contam pelo nome de fora.
    raw = re.sub(r"\{[^}]*\}", "", raw)
    names = [f.strip() for f in raw.split(",") if f.strip()]
    return names if "id" in names else ["id", *names]


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, UTC).strftime("%Y-%m-%dT%H:%M:%S+0000")


def _base(request: Request) -> str:
    return str(request.base_url)


def _account_by_ig(ig_user_id: str) -> fixtures.MetaAccount | None:
    return next((a for a in fixtures.META_ACCOUNTS.values() if a.ig_user_id == ig_user_id), None)


def _account_by_page(page_id: str) -> fixtures.MetaAccount | None:
    return next((a for a in fixtures.META_ACCOUNTS.values() if a.page_id == page_id), None)


def _owns(token: Token, account: fixtures.MetaAccount) -> bool:
    return fixtures.USERS[token.user_key].workspace == account.workspace


def _page(items: list[dict], params: dict, request: Request) -> dict:
    limit = max(1, min(int(params.get("limit", 25)), 100))
    start = int(params.get("after", "0") or 0) if str(params.get("after", "0")).isdigit() else 0
    chunk = items[start : start + limit]
    result: dict = {"data": chunk}
    if items:
        cursors = {"before": str(start), "after": str(start + len(chunk))}
        result["paging"] = {"cursors": cursors}
        if start + limit < len(items):
            query = {k: v for k, v in params.items() if k != "after"}
            query["after"] = str(start + limit)
            result["paging"]["next"] = f"{str(request.url).split('?')[0]}?{urlencode(query)}"
    return result


def _select(node: dict, fields: list[str]) -> dict:
    return {f: node[f] for f in fields if f in node and node[f] is not None}


# --- OAuth -----------------------------------------------------------------------------------


@router.get("/meta/www/{version}/dialog/oauth")
def oauth_dialog(version: str, request: Request) -> Response:
    _check_version(version)
    q = request.query_params
    config = STATE.config["meta"]
    consent = STATE.config["consent"]["meta"]
    if q.get("client_id") != config["app_id"]:
        return JSONResponse(
            {"error": {"message": "Invalid App ID", "type": "OAuthException", "code": 101}}, 400
        )
    redirect_uri = q.get("redirect_uri", "")
    if not any(redirect_uri.startswith(p) for p in STATE.config["allowed_redirect_prefixes"]):
        return JSONResponse(
            {
                "error": {
                    "message": "URL Blocked: This redirect failed because the redirect URI is not "
                    "whitelisted in the app's Client OAuth Settings.",
                    "type": "OAuthException",
                    "code": 191,
                }
            },
            400,
        )
    scopes = [s for s in re.split(r"[,\s]+", q.get("scope", "")) if s] or ["public_profile"]
    unknown = [s for s in scopes if s not in KNOWN_SCOPES]
    if unknown:
        return JSONResponse(
            {
                "error": {
                    "message": f"Invalid Scopes: {', '.join(unknown)}.",
                    "type": "OAuthException",
                    "code": 100,
                }
            },
            400,
        )
    state = q.get("state")
    deny = q.get("mock_deny", "") in ("1", "true") or bool(consent.get("deny"))
    if deny:
        query = {
            "error_reason": "user_denied",
            "error": "access_denied",
            "error_description": "Permissions error.",
        }
        if state:
            query["state"] = state
        return RedirectResponse(f"{redirect_uri}?{urlencode(query)}", status_code=302)
    user = fixtures.find_user(q.get("mock_user") or consent.get("user")) or fixtures.USERS["marina"]
    declined = {s for s in (q.get("mock_decline") or "").split(",") if s} | set(
        consent.get("decline") or []
    )
    granted = [s for s in scopes if s not in declined]
    if "public_profile" not in granted:
        granted.insert(0, "public_profile")
    STATE.meta_declined[user.key] = {s for s in scopes if s in declined}
    code = "AQMock" + secrets.token_urlsafe(32)
    STATE.codes[code] = AuthCode(
        code=code,
        provider="meta",
        client_id=config["app_id"],
        redirect_uri=redirect_uri,
        user_key=user.key,
        scopes=granted,
        created_at=STATE.now(),
    )
    query = {"code": code}
    if state:
        query["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(query)}", status_code=302)


def _check_client(params: dict) -> None:
    config = STATE.config["meta"]
    if params.get("client_id") != config["app_id"]:
        raise errors.meta_error("Error validating application. Invalid application ID.", 101)
    if config["app_secret"] and params.get("client_secret") != config["app_secret"]:
        raise errors.meta_error("Error validating client secret.", 1)


@router.api_route(GRAPH + "/oauth/access_token", methods=["GET", "POST"])
async def oauth_access_token(version: str, request: Request) -> Response:
    _check_version(version)
    params = await _params(request)
    _check_client(params)
    config = STATE.config["meta"]
    if params.get("grant_type") == "fb_exchange_token":
        current = STATE.tokens.get(params.get("fb_exchange_token", ""))
        if current is None or current.provider != "meta" or current.kind != "user":
            raise errors.meta_token_invalid()
        now = STATE.now()
        if current.state(now) == "expired":
            raise errors.meta_token_expired(current.expired_at(now), now)
        if current.state(now) == "revoked":
            raise errors.meta_token_revoked(config["app_id"])
        token = STATE.issue(
            "meta", "user", current.user_key, config["app_id"], current.scopes, config["long_ttl"]
        )
        return JSONResponse(
            {"access_token": token.value, "token_type": "bearer", "expires_in": config["long_ttl"]}
        )
    code_value = params.get("code")
    if not code_value:
        raise errors.meta_param("Missing authorization code")
    if not params.get("redirect_uri"):
        raise errors.meta_error("Missing redirect_uri parameter.", 191)
    code = STATE.codes.get(code_value)
    if code is None or code.provider != "meta":
        raise errors.meta_param("Invalid verification code format.")
    if code.used:
        raise errors.meta_param("This authorization code has been used.", subcode=36009)
    if STATE.now() - code.created_at > CODE_TTL:
        raise errors.meta_param("This authorization code has expired.", subcode=36007)
    if params.get("redirect_uri") != code.redirect_uri:
        raise errors.meta_param(
            "Error validating verification code. Please make sure your redirect_uri is identical "
            "to the one you used in the OAuth dialog request",
            subcode=36008,
        )
    code.used = True
    token = STATE.issue(
        "meta", "user", code.user_key, code.client_id, code.scopes, config["short_ttl"]
    )
    return JSONResponse(
        {"access_token": token.value, "token_type": "bearer", "expires_in": config["short_ttl"]}
    )


@router.get(GRAPH + "/debug_token")
def debug_token(version: str, request: Request) -> Response:
    _check_version(version)
    if not request.query_params.get("access_token"):
        raise errors.meta_token_missing()
    value = request.query_params.get("input_token", "")
    token = STATE.tokens.get(value)
    app_id = STATE.config["meta"]["app_id"]
    if token is None or token.provider != "meta":
        return JSONResponse(
            {
                "data": {
                    "is_valid": False,
                    "error": {"code": 190, "message": "Invalid OAuth access token."},
                    "scopes": [],
                }
            }
        )
    now = STATE.now()
    state = token.state(now)
    user = fixtures.USERS[token.user_key]
    data: dict = {
        "app_id": app_id,
        "type": "PAGE" if token.kind == "page" else "USER",
        "application": "HelloSquad (mock local)",
        "data_access_expires_at": int(token.issued_at + 90 * 86400),
        "expires_at": int(token.expires_at) if token.expires_at else 0,
        "is_valid": state == "valid",
        "issued_at": int(token.issued_at),
        "scopes": token.scopes,
        "granular_scopes": [{"scope": s} for s in token.scopes],
        "user_id": user.meta_user_id,
    }
    if token.page_id:
        data["profile_id"] = token.page_id
    if state == "expired":
        data["error"] = {
            "code": 190,
            "message": "Error validating access token: Session has expired.",
            "subcode": 463,
        }
    elif state == "revoked":
        data["error"] = {
            "code": 190,
            "message": "Error validating access token: The user has not authorized "
            f"application {app_id}.",
            "subcode": 458,
        }
    return JSONResponse({"data": data})


# --- /me ------------------------------------------------------------------------------------


@router.get(GRAPH + "/me")
async def me(version: str, request: Request) -> Response:
    _check_version(version)
    token = auth.meta_token(request)
    params = await _params(request)
    if token.kind == "page":
        return await node(version, token.page_id or "", request)
    user = fixtures.USERS[token.user_key]
    data = {"id": user.meta_user_id, "name": user.name}
    if "email" in token.scopes:
        data["email"] = user.email
    return JSONResponse(_select(data, _fields(params, ["id", "name"])))


@router.get(GRAPH + "/me/accounts")
async def me_accounts(version: str, request: Request) -> Response:
    _check_version(version)
    token = auth.meta_token(request)
    if token.kind != "user":
        raise errors.meta_error("(#100) Tried accessing nonexisting field (accounts)", 100)
    auth.meta_require(token, "pages_show_list")
    params = await _params(request)
    user = fixtures.USERS[token.user_key]
    account = fixtures.META_ACCOUNTS[user.workspace]
    page_token = next(
        (
            t
            for t in STATE.tokens.values()
            if t.parent == token.value and t.page_id == account.page_id
        ),
        None,
    )
    if page_token is None:
        short = token.expires_at is not None and (
            token.expires_at - token.issued_at <= STATE.config["meta"]["short_ttl"]
        )
        page_token = STATE.issue(
            "meta",
            "page",
            token.user_key,
            token.client_id,
            token.scopes,
            int(token.expires_at - STATE.now()) if short and token.expires_at else None,
            parent=token.value,
            page_id=account.page_id,
        )
    entry = {
        "access_token": page_token.value,
        "category": account.page_category,
        "category_list": [{"id": "2200", "name": account.page_category}],
        "name": account.page_name,
        "id": account.page_id,
        "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT", "MANAGE"],
        "instagram_business_account": {"id": account.ig_user_id},
    }
    default = ["access_token", "category", "category_list", "name", "id", "tasks"]
    return JSONResponse(_page([_select(entry, _fields(params, default))], params, request))


def _permissions_data(token: Token) -> list[dict]:
    declined = STATE.meta_declined.get(token.user_key, set())
    data = [{"permission": s, "status": "granted"} for s in token.scopes]
    data += [
        {"permission": s, "status": "declined"} for s in sorted(declined) if s not in token.scopes
    ]
    return data


@router.get(GRAPH + "/me/permissions")
def me_permissions(version: str, request: Request) -> Response:
    _check_version(version)
    token = auth.meta_token(request)
    return JSONResponse({"data": _permissions_data(token)})


@router.delete(GRAPH + "/me/permissions")
@router.delete(GRAPH + "/me/permissions/{permission}")
def revoke_permissions(version: str, request: Request, permission: str | None = None) -> Response:
    _check_version(version)
    token = auth.meta_token(request)
    for other in STATE.tokens.values():
        if other.provider != "meta" or other.user_key != token.user_key:
            continue
        if permission:
            other.scopes = [s for s in other.scopes if s != permission]
        else:
            other.revoked = True
    if permission:
        STATE.meta_declined.setdefault(token.user_key, set()).add(permission)
    return JSONResponse({"success": True})


# --- nós e arestas genéricos -------------------------------------------------------------------


def _ig_user_node(account: fixtures.MetaAccount, request: Request) -> dict:
    followers = fixtures.seed_value(account.workspace, "followers", 0) or 0
    return {
        "id": account.ig_user_id,
        "ig_id": int(account.ig_user_id[-9:]),
        "username": account.ig_username,
        "name": account.ig_name,
        "biography": account.biography,
        "website": account.website,
        "followers_count": followers,
        "follows_count": account.follows_count,
        "media_count": len(_feed_media(account.ig_user_id)),
        "profile_picture_url": f"{_base(request)}_mock/media/{account.ig_username}.svg",
    }


def _feed_media(ig_user_id: str) -> list[dict]:
    media = [m for m in STATE.ig_media.get(ig_user_id, []) if m["media_product_type"] != "STORY"]
    return sorted(media, key=lambda m: m["timestamp"], reverse=True)


def _find_media(media_id: str) -> tuple[fixtures.MetaAccount, dict] | None:
    for ig_user_id, items in STATE.ig_media.items():
        for item in items:
            if item["id"] == media_id:
                account = _account_by_ig(ig_user_id)
                if account:
                    return account, item
    return None


def _find_comment(comment_id: str) -> tuple[str, dict] | None:
    for media_id, comments in STATE.ig_comments.items():
        for comment in comments:
            if comment["id"] == comment_id:
                return media_id, comment
            for reply in comment["replies"]:
                if reply["id"] == comment_id:
                    return media_id, reply
    return None


def _media_node(account: fixtures.MetaAccount, item: dict, request: Request) -> dict:
    shortcode = hashlib.sha1(item["id"].encode()).hexdigest()[:11]
    return {
        "id": item["id"],
        "caption": item["caption"],
        "media_type": item["media_type"],
        "media_product_type": item["media_product_type"],
        "media_url": f"{_base(request)}_mock/media/{item['id']}.svg",
        "permalink": f"{_base(request)}_mock/media/p-{shortcode}.svg",
        "shortcode": shortcode,
        "timestamp": _iso(item["timestamp"]),
        "like_count": item["like_count"],
        "comments_count": len(STATE.ig_comments.get(item["id"], [])),
        "username": account.ig_username,
        "is_comment_enabled": True,
        "owner": {"id": account.ig_user_id},
    }


def _comment_node(comment: dict) -> dict:
    return {
        "id": comment["id"],
        "text": comment["text"],
        "timestamp": _iso(comment["timestamp"]),
        "username": comment["username"],
        "like_count": comment["like_count"],
        "replies": {
            "data": [{"id": r["id"], "text": r["text"]} for r in comment.get("replies", [])]
        },
    }


def _container_status(container: dict) -> tuple[str, str]:
    if container.get("published_media_id"):
        return "PUBLISHED", "Published: Media has been published."
    if STATE.now() - container["created_at"] > CONTAINER_TTL:
        return "EXPIRED", "Expired: The container was not published within 24 hours."
    if container["polls_left"] > 0:
        container["polls_left"] -= 1
        return "IN_PROGRESS", "In Progress: Media is still being processed."
    return "FINISHED", "Finished: Media has been uploaded and it is complete."


def _page_posts(account: fixtures.MetaAccount, *, scheduled: bool) -> list[dict]:
    now = STATE.now()
    posts = []
    for post in STATE.page_posts.get(account.page_id, []):
        when = post.get("scheduled_publish_time")
        is_scheduled = when is not None and when > now
        if not post.get("published", True) and when is None:
            continue
        if is_scheduled == scheduled:
            posts.append(post)
    return sorted(
        posts, key=lambda p: p.get("scheduled_publish_time") or p["created_time"], reverse=True
    )


def _post_node(post: dict, request: Request) -> dict:
    created = post.get("scheduled_publish_time") or post["created_time"]
    return {
        "id": post["id"],
        "message": post["message"],
        "created_time": _iso(created),
        "is_published": not (post.get("scheduled_publish_time") or 0) > STATE.now(),
        "scheduled_publish_time": int(post["scheduled_publish_time"])
        if post.get("scheduled_publish_time")
        else None,
        "permalink_url": f"{_base(request)}_mock/media/{post['id']}.svg",
        "link": post.get("link"),
    }


@router.get(GRAPH + "/{node_id}")
async def node(version: str, node_id: str, request: Request) -> Response:
    _check_version(version)
    token = auth.meta_token(request)
    params = await _params(request)
    page_account = _account_by_page(node_id)
    if page_account and _owns(token, page_account):
        if token.kind == "user":
            auth.meta_require(token, "pages_show_list")
        followers = fixtures.seed_value(page_account.workspace, "followers", 0) or 0
        data = {
            "id": page_account.page_id,
            "name": page_account.page_name,
            "category": page_account.page_category,
            "instagram_business_account": {"id": page_account.ig_user_id},
            "link": f"{_base(request)}_mock/media/page-{page_account.page_id}.svg",
            "fan_count": followers // 3,
            "followers_count": followers // 3,
            "website": page_account.website,
        }
        return JSONResponse(_select(data, _fields(params, ["id", "name"])))
    ig_account = _account_by_ig(node_id)
    if ig_account and _owns(token, ig_account):
        auth.meta_require(token, "instagram_basic")
        return JSONResponse(_select(_ig_user_node(ig_account, request), _fields(params, ["id"])))
    found = _find_media(node_id)
    if found and _owns(token, found[0]):
        auth.meta_require(token, "instagram_basic")
        return JSONResponse(
            _select(_media_node(found[0], found[1], request), _fields(params, ["id"]))
        )
    container = STATE.ig_containers.get(node_id)
    if container:
        account = _account_by_ig(container["ig_user_id"])
        if account and _owns(token, account):
            code, text = _container_status(container)
            data = {"id": node_id, "status_code": code, "status": text}
            return JSONResponse(_select(data, _fields(params, ["id"])))
    comment = _find_comment(node_id)
    if comment:
        media = _find_media(comment[0])
        if media and _owns(token, media[0]):
            auth.meta_require(token, "instagram_basic")
            default = ["id", "text", "timestamp"]
            return JSONResponse(_select(_comment_node(comment[1]), _fields(params, default)))
    raise errors.meta_object_not_found(node_id)


@router.api_route(GRAPH + "/{node_id}/{edge}", methods=["GET", "POST", "DELETE"])
async def node_edge(version: str, node_id: str, edge: str, request: Request) -> Response:
    _check_version(version)
    params = await _params(request)
    token = auth.meta_token(request, params)
    if edge == "permissions":
        user = fixtures.USERS[token.user_key]
        if node_id != user.meta_user_id:
            raise errors.meta_object_not_found(node_id, edge)
        if request.method == "DELETE":
            return revoke_permissions(version, request)
        return JSONResponse({"data": _permissions_data(token)})
    page_account = _account_by_page(node_id)
    if page_account and _owns(token, page_account):
        return _page_edge(page_account, edge, token, params, request)
    ig_account = _account_by_ig(node_id)
    if ig_account and _owns(token, ig_account):
        return _ig_user_edge(ig_account, edge, token, params, request)
    found = _find_media(node_id)
    if found and _owns(token, found[0]):
        return _media_edge(found[0], found[1], edge, token, params, request)
    comment = _find_comment(node_id)
    if comment and edge == "replies":
        media = _find_media(comment[0])
        if media and _owns(token, media[0]):
            return _replies(comment[1], token, params, request)
    raise errors.meta_object_not_found(node_id, edge)


def _page_edge(
    account: fixtures.MetaAccount, edge: str, token: Token, params: dict, request: Request
) -> Response:
    if edge in ("feed", "published_posts", "scheduled_posts") and request.method == "GET":
        if token.kind == "user":
            auth.meta_require(token, "pages_read_engagement")
        posts = _page_posts(account, scheduled=edge == "scheduled_posts")
        default = ["id", "message", "created_time"]
        if edge == "scheduled_posts":
            default.append("scheduled_publish_time")
        items = [_select(_post_node(p, request), _fields(params, default)) for p in posts]
        return JSONResponse(_page(items, params, request))
    if edge == "feed" and request.method == "POST":
        if token.kind != "page" or not {"pages_manage_posts", "pages_read_engagement"} <= set(
            token.scopes
        ):
            raise errors.meta_error(
                "(#200) If posting to a page, requires both pages_read_engagement and "
                "pages_manage_posts as an admin with sufficient administrative permission",
                200,
                status=403,
            )
        message = params.get("message")
        link = params.get("link")
        if not message and not link:
            raise errors.meta_param("(#100) Missing message or attachment")
        published = str(params.get("published", "true")).lower() not in ("false", "0")
        scheduled = params.get("scheduled_publish_time")
        when: float | None = None
        if scheduled:
            if published:
                raise errors.meta_param(
                    "(#100) You cannot specify a scheduled publish time on a published post"
                )
            try:
                when = (
                    float(scheduled)
                    if str(scheduled).isdigit()
                    else datetime.fromisoformat(str(scheduled)).timestamp()
                )
            except ValueError as exc:
                raise errors.meta_param(
                    "(#100) The specified scheduled publish time is invalid."
                ) from exc
            delta = when - STATE.now()
            if delta < 600 or delta > 30 * 86400:
                raise errors.meta_param("(#100) The specified scheduled publish time is invalid.")
        post_id = f"{account.page_id}_{STATE.next_id('9100', 8)}"
        STATE.page_posts.setdefault(account.page_id, []).append(
            {
                "id": post_id,
                "message": message or "",
                "link": link,
                "created_time": STATE.now(),
                "scheduled_publish_time": when,
                "published": published or when is not None,
            }
        )
        return JSONResponse({"id": post_id})
    raise errors.meta_object_not_found(account.page_id, edge)


def _ig_user_edge(
    account: fixtures.MetaAccount, edge: str, token: Token, params: dict, request: Request
) -> Response:
    method = request.method
    if edge == "media" and method == "GET":
        auth.meta_require(token, "instagram_basic")
        items = [
            _select(_media_node(account, m, request), _fields(params, ["id"]))
            for m in _feed_media(account.ig_user_id)
        ]
        return JSONResponse(_page(items, params, request))
    if edge == "media" and method == "POST":
        auth.meta_require(token, "instagram_basic", "instagram_content_publish")
        return _create_container(account, params)
    if edge == "media_publish" and method == "POST":
        auth.meta_require(token, "instagram_basic", "instagram_content_publish")
        return _publish(account, params)
    if edge == "content_publishing_limit" and method == "GET":
        auth.meta_require(token, "instagram_basic", "instagram_content_publish")
        quota = STATE.config["meta"]["ig_publish_quota"]
        return JSONResponse(
            {
                "data": [
                    {
                        "config": {"quota_total": quota, "quota_duration": 86400},
                        "quota_usage": len(_recent_publishes(account.ig_user_id)),
                    }
                ]
            }
        )
    if edge == "insights" and method == "GET":
        auth.meta_require(token, "instagram_basic", "instagram_manage_insights")
        return _user_insights(account, params)
    raise errors.meta_object_not_found(account.ig_user_id, edge)


def _recent_publishes(ig_user_id: str) -> list[float]:
    now = STATE.now()
    log = [t for t in STATE.ig_publish_log.get(ig_user_id, []) if now - t < 86400]
    STATE.ig_publish_log[ig_user_id] = log
    return log


def _create_container(account: fixtures.MetaAccount, params: dict) -> Response:
    media_type = (params.get("media_type") or "IMAGE").upper()
    if media_type == "VIDEO":
        raise errors.meta_param(
            "(#100) The VIDEO media type is no longer supported for feed. Use REELS instead.",
            subcode=2207023,
        )
    if media_type not in ("IMAGE", "REELS", "STORIES", "CAROUSEL"):
        raise errors.meta_param("(#100) Param media_type must be one of {CAROUSEL, REELS, STORIES}")
    caption = params.get("caption") or ""
    if len(caption) > 2200:
        raise errors.meta_param("(#100) Param caption must be at most 2200 characters long.")
    children: list[str] = []
    is_video = False
    if media_type == "CAROUSEL":
        children = [c for c in (params.get("children") or "").split(",") if c]
        if not 2 <= len(children) <= 10:
            raise errors.meta_param("(#100) The carousel must have between 2 and 10 children.")
        for child in children:
            item = STATE.ig_containers.get(child)
            if not item or item["ig_user_id"] != account.ig_user_id or not item["is_carousel_item"]:
                raise errors.meta_object_not_found(child)
    elif params.get("video_url"):
        is_video = True
    elif media_type == "REELS":
        raise errors.meta_param("(#100) The parameter video_url is required.")
    elif not params.get("image_url"):
        raise errors.meta_param("(#100) The parameter image_url is required.")
    for key in ("image_url", "video_url"):
        url = params.get(key)
        if url and not re.match(r"^https?://", url):
            raise errors.meta_param(f"(#100) Param {key} must be a valid URL")
    container_id = STATE.next_id("1790001", 10)
    STATE.ig_containers[container_id] = {
        "id": container_id,
        "ig_user_id": account.ig_user_id,
        "media_type": media_type,
        "caption": caption,
        "image_url": params.get("image_url"),
        "video_url": params.get("video_url"),
        "children": children,
        "is_carousel_item": str(params.get("is_carousel_item", "")).lower() == "true",
        "created_at": STATE.now(),
        "polls_left": STATE.config["meta"]["video_processing_polls"] if is_video else 0,
        "published_media_id": None,
    }
    return JSONResponse({"id": container_id})


def stable_media_id(creation_id: str) -> str:
    """Id da mídia publicada derivado do creation_id: o mesmo contêiner dá sempre o mesmo id."""
    digest = int(hashlib.sha256(creation_id.encode()).hexdigest()[:12], 16)
    return str(17900000000000000 + digest % 10**14)


def _publish(account: fixtures.MetaAccount, params: dict) -> Response:
    creation_id = params.get("creation_id")
    if not creation_id:
        raise errors.meta_param("(#100) The parameter creation_id is required.")
    container = STATE.ig_containers.get(creation_id)
    if not container or container["ig_user_id"] != account.ig_user_id:
        raise errors.meta_object_not_found(creation_id)
    if container["is_carousel_item"]:
        raise errors.meta_param("(#100) Carousel items cannot be published on their own.")
    if container.get("published_media_id"):
        raise errors.meta_error(
            f"(#9007) The media container {creation_id} has already been published.", 9007
        )
    code, _text = _container_status(container)
    if code == "EXPIRED":
        raise errors.meta_error(
            "The media you are trying to access has expired. Please try to generate a new "
            "container ID.",
            9007,
            subcode=2207020,
        )
    if code == "IN_PROGRESS":
        raise errors.meta_error(
            "Media ID is not available: the media is not ready for publishing, please wait for "
            "a moment.",
            9007,
            subcode=2207027,
        )
    if len(_recent_publishes(account.ig_user_id)) >= STATE.config["meta"]["ig_publish_quota"]:
        raise errors.meta_error(
            "You reached maximum number of posts that is allowed to be published by Content "
            "Publish API.",
            9,
            subcode=2207042,
        )
    media_id = stable_media_id(creation_id)
    media_type = {"IMAGE": "IMAGE", "REELS": "VIDEO", "CAROUSEL": "CAROUSEL_ALBUM"}.get(
        container["media_type"], "IMAGE"
    )
    product = {"REELS": "REELS", "STORIES": "STORY"}.get(container["media_type"], "FEED")
    STATE.ig_media.setdefault(account.ig_user_id, []).append(
        {
            "id": media_id,
            "caption": container["caption"],
            "media_type": media_type,
            "media_product_type": product,
            "timestamp": STATE.now(),
            "like_count": 0,
            "reach": 0,
            "saved": 0,
            "shares": 0,
            "creation_id": creation_id,
        }
    )
    STATE.ig_comments.setdefault(media_id, [])
    container["published_media_id"] = media_id
    STATE.ig_publish_log.setdefault(account.ig_user_id, []).append(STATE.now())
    return JSONResponse({"id": media_id})


def _day_range(params: dict, *, max_days: int = 30) -> list[int]:
    """Dias atrás cobertos por since/until (timestamps Unix); padrão: os dois últimos dias."""
    today = fixtures.today()

    def to_days(raw: str | None, default: int) -> int:
        if not raw:
            return default
        moment = datetime.fromtimestamp(float(raw), fixtures.TZ).date()
        return (today - moment).days

    start = to_days(params.get("since"), 2)
    end = max(to_days(params.get("until"), 0), 1)
    if start - end + 1 > max_days:
        raise errors.meta_param(
            f"(#100) There cannot be more than {max_days} days between since and until"
        )
    return list(range(start, end - 1, -1))


def _user_insights(account: fixtures.MetaAccount, params: dict) -> Response:
    metrics = [m.strip() for m in (params.get("metric") or "").split(",") if m.strip()]
    if not metrics:
        raise errors.meta_param("(#100) The parameter metric is required.")
    for index, metric in enumerate(metrics):
        if metric not in IG_USER_INSIGHTS:
            allowed = ", ".join(sorted(IG_USER_INSIGHTS))
            raise errors.meta_param(
                f"(#100) metric[{index}] must be one of the following values: {allowed}"
            )
    if params.get("period", "day") != "day":
        raise errors.meta_param("(#100) Incompatible period for the requested metrics: use day")
    days = _day_range(params)
    total = params.get("metric_type") == "total_value"
    data = []
    for metric in metrics:
        values = []
        for days_ago in days:
            value = _user_metric(account.workspace, metric, days_ago)
            end = datetime.combine(
                fixtures.today() - timedelta(days=days_ago - 1), datetime.min.time()
            )
            values.append({"value": value, "end_time": end.strftime("%Y-%m-%dT07:00:00+0000")})
        entry: dict = {
            "name": metric,
            "period": "day",
            "title": {
                "reach": "Reach",
                "follower_count": "Follower Count",
                "profile_views": "Profile Views",
            }[metric],
            "description": "Dado fictício do mock local (fonte_de_teste).",
            "id": f"{account.ig_user_id}/insights/{metric}/day",
        }
        if total:
            entry["total_value"] = {"value": sum(v["value"] for v in values)}
        else:
            entry["values"] = values
        data.append(entry)
    return JSONResponse({"data": data})


def _user_metric(workspace: str, metric: str, days_ago: int) -> int:
    if metric == "reach":
        return fixtures.seed_value(workspace, "reach", days_ago) or 0
    if metric == "follower_count":  # seguidores ganhos no dia (diferença do estoque do seed)
        current = fixtures.seed_value(workspace, "followers", days_ago)
        previous = fixtures.seed_value(workspace, "followers", days_ago + 1)
        if current is None or previous is None:
            return 0
        return max(current - previous, 0)
    reach = fixtures.seed_value(workspace, "reach", days_ago) or 0
    return round(reach * 0.06)


def _media_edge(
    account: fixtures.MetaAccount,
    item: dict,
    edge: str,
    token: Token,
    params: dict,
    request: Request,
) -> Response:
    if edge == "insights" and request.method == "GET":
        auth.meta_require(token, "instagram_basic", "instagram_manage_insights")
        metrics = [m.strip() for m in (params.get("metric") or "").split(",") if m.strip()]
        if "impressions" in metrics:
            raise errors.meta_param(
                "(#100) Starting from version v22.0 and above, the impressions metric is no "
                "longer supported for media. Use views instead."
            )
        for index, metric in enumerate(metrics):
            if metric not in IG_MEDIA_INSIGHTS:
                allowed = ", ".join(IG_MEDIA_INSIGHTS)
                raise errors.meta_param(
                    f"(#100) metric[{index}] must be one of the following values: {allowed}"
                )
        comments = len(STATE.ig_comments.get(item["id"], []))
        values = {
            "reach": item["reach"],
            "likes": item["like_count"],
            "comments": comments,
            "saved": item["saved"],
            "shares": item["shares"],
            "views": round(item["reach"] * 1.6),
        }
        values["total_interactions"] = (
            values["likes"] + values["comments"] + values["saved"] + values["shares"]
        )
        data = [
            {
                "name": metric,
                "period": "lifetime",
                "values": [{"value": values[metric]}],
                "title": metric.replace("_", " ").title(),
                "id": f"{item['id']}/insights/{metric}/lifetime",
            }
            for metric in (metrics or ["reach"])
        ]
        return JSONResponse({"data": data})
    if edge == "comments" and request.method == "GET":
        auth.meta_require(token, "instagram_basic")
        comments = sorted(
            STATE.ig_comments.get(item["id"], []), key=lambda c: c["timestamp"], reverse=True
        )
        default = ["id", "text", "timestamp"]
        items = [_select(_comment_node(c), _fields(params, default)) for c in comments]
        return JSONResponse(_page(items, params, request))
    if edge == "comments" and request.method == "POST":
        auth.meta_require(token, "instagram_basic", "instagram_manage_comments")
        message = params.get("message")
        if not message:
            raise errors.meta_param("(#100) The parameter message is required.")
        comment_id = STATE.next_id("1800009", 10)
        STATE.ig_comments.setdefault(item["id"], []).append(
            {
                "id": comment_id,
                "username": account.ig_username,
                "text": message,
                "timestamp": STATE.now(),
                "like_count": 0,
                "replies": [],
            }
        )
        return JSONResponse({"id": comment_id})
    raise errors.meta_object_not_found(item["id"], edge)


def _replies(comment: dict, token: Token, params: dict, request: Request) -> Response:
    if request.method == "GET":
        auth.meta_require(token, "instagram_basic")
        items = [
            _select(_comment_node(r), _fields(params, ["id", "text", "timestamp"]))
            for r in comment.get("replies", [])
        ]
        return JSONResponse(_page(items, params, request))
    if request.method != "POST":
        raise errors.meta_object_not_found(comment["id"], "replies")
    auth.meta_require(token, "instagram_basic", "instagram_manage_comments")
    message = params.get("message")
    if not message:
        raise errors.meta_param("(#100) The parameter message is required.")
    user = fixtures.USERS[token.user_key]
    account = fixtures.META_ACCOUNTS[user.workspace]
    reply_id = STATE.next_id("1800008", 10)
    comment.setdefault("replies", []).append(
        {
            "id": reply_id,
            "username": account.ig_username,
            "text": message,
            "timestamp": STATE.now(),
            "like_count": 0,
            "replies": [],
        }
    )
    return JSONResponse({"id": reply_id})
