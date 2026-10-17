"""Estado em memória dos mocks: tokens, códigos, chamadas gravadas, falhas, configuração e dados.

Tudo some no `POST /_mock/reset` (e ao reiniciar o processo). Nada vai para disco.
"""

from __future__ import annotations

import copy
import hashlib
import itertools
import os
import secrets
import time
from dataclasses import dataclass, field

from . import fixtures


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    return int(raw) if raw else default


def default_config() -> dict:
    """Configuração inicial; cada chave pode ser trocada em POST /_mock/config."""
    return {
        "meta": {
            "app_id": os.environ.get("MOCK_META_APP_ID", "999000000000001"),
            # Segredo só no modo estrito (vazio: aceita qualquer valor, como o .env.example).
            "app_secret": os.environ.get("MOCK_META_APP_SECRET", ""),
            "short_ttl": _env_int("MOCK_META_SHORT_TTL", 3600),
            "long_ttl": _env_int("MOCK_META_LONG_TTL", 5184000),
            "rate_limit_status": _env_int("MOCK_META_RATE_LIMIT_STATUS", 429),
            "ig_publish_quota": _env_int("MOCK_IG_PUBLISH_QUOTA", 100),
            # Quantas consultas de status um vídeo (REELS) fica IN_PROGRESS antes de FINISHED.
            "video_processing_polls": _env_int("MOCK_IG_VIDEO_POLLS", 1),
        },
        "google": {
            "client_id": os.environ.get(
                "MOCK_GOOGLE_CLIENT_ID", "000000000000-hellosquadlocal.apps.googleusercontent.com"
            ),
            "client_secret": os.environ.get("MOCK_GOOGLE_CLIENT_SECRET", ""),
            "access_ttl": _env_int("MOCK_GOOGLE_ACCESS_TTL", 3599),
            # None: o refresh token não expira sozinho (só por revogação ou /_mock/expire).
            "refresh_ttl": _env_int("MOCK_GOOGLE_REFRESH_TTL", 0) or None,
        },
        # Janela de rate limit por provedor: {"limit": N, "window_seconds": S}; None = desligado.
        "rate_limit": {"meta": None, "google": None},
        "timeout_seconds": float(os.environ.get("MOCK_TIMEOUT_SECONDS", "5")),
        # Quem "faz login" na tela de consentimento simulada, o que recusa e se cancela.
        "consent": {
            "meta": {"user": fixtures.DEFAULT_USER, "decline": [], "deny": False},
            "google": {"user": fixtures.DEFAULT_USER, "decline": [], "deny": False},
        },
        # Prefixos aceitos em redirect_uri: só endereços locais (nada redireciona para fora).
        "allowed_redirect_prefixes": [
            p.strip()
            for p in os.environ.get(
                "MOCK_ALLOWED_REDIRECT_PREFIXES", "http://127.0.0.1:,http://localhost:"
            ).split(",")
            if p.strip()
        ],
    }


@dataclass
class Token:
    value: str
    provider: str  # meta | google
    kind: str  # user | page | access | refresh
    user_key: str
    client_id: str
    scopes: list[str]
    issued_at: float
    expires_at: float | None
    parent: str | None = None  # page -> token do usuário; access -> refresh token do Google
    page_id: str | None = None
    revoked: bool = False
    expired_forced_at: float | None = None

    def state(self, now: float) -> str:
        if self.revoked:
            return "revoked"
        if self.expired_forced_at is not None:
            return "expired"
        if self.expires_at is not None and now >= self.expires_at:
            return "expired"
        return "valid"

    def expired_at(self, now: float) -> float:
        return self.expired_forced_at or self.expires_at or now


@dataclass
class AuthCode:
    code: str
    provider: str
    client_id: str
    redirect_uri: str
    user_key: str
    scopes: list[str]
    created_at: float
    access_type: str = "online"
    prompt: str = ""
    code_challenge: str | None = None
    code_challenge_method: str | None = None
    used: bool = False


@dataclass
class FailRule:
    mode: str  # 500 | 503 | 429 | timeout | expired
    provider: str | None = None
    path_contains: str | None = None
    method: str | None = None
    remaining: int = 1


@dataclass
class State:
    config: dict = field(default_factory=default_config)
    tokens: dict[str, Token] = field(default_factory=dict)
    codes: dict[str, AuthCode] = field(default_factory=dict)
    calls: list[dict] = field(default_factory=list)
    fail_rules: list[FailRule] = field(default_factory=list)
    rate_windows: dict[str, list[float]] = field(default_factory=dict)
    clock_offset: float = 0.0
    google_granted: set[tuple[str, str]] = field(default_factory=set)
    meta_declined: dict[str, set[str]] = field(default_factory=dict)
    # Dados mutáveis por provedor (copiados das fixtures no reset).
    ig_media: dict[str, list[dict]] = field(default_factory=dict)
    ig_containers: dict[str, dict] = field(default_factory=dict)
    ig_comments: dict[str, list[dict]] = field(default_factory=dict)
    ig_publish_log: dict[str, list[float]] = field(default_factory=dict)
    page_posts: dict[str, list[dict]] = field(default_factory=dict)
    gbp_reviews: dict[str, list[dict]] = field(default_factory=dict)
    gbp_posts: dict[str, list[dict]] = field(default_factory=dict)
    _ids: itertools.count = field(default_factory=lambda: itertools.count(1))
    _seq: itertools.count = field(default_factory=lambda: itertools.count(1))

    def now(self) -> float:
        return time.time() + self.clock_offset

    def next_id(self, prefix: str, width: int = 12) -> str:
        return f"{prefix}{next(self._ids):0{width}d}"

    def next_seq(self) -> int:
        return next(self._seq)

    # --- tokens -------------------------------------------------------------------------

    def issue(
        self,
        provider: str,
        kind: str,
        user_key: str,
        client_id: str,
        scopes: list[str],
        ttl: int | None,
        *,
        parent: str | None = None,
        page_id: str | None = None,
    ) -> Token:
        prefix = {"meta": "EAAMock", "google": "ya29.mock-"}[provider]
        if provider == "google" and kind == "refresh":
            prefix = "1//mock-"
        now = self.now()
        token = Token(
            value=prefix + secrets.token_urlsafe(24),
            provider=provider,
            kind=kind,
            user_key=user_key,
            client_id=client_id,
            scopes=list(scopes),
            issued_at=now,
            expires_at=(now + ttl) if ttl else None,
            parent=parent,
            page_id=page_id,
        )
        self.tokens[token.value] = token
        return token

    def family(self, token: Token) -> list[Token]:
        """O token raiz (refresh do Google ou usuário da Meta) e todos os derivados dele."""
        root = token
        if token.parent and token.parent in self.tokens:
            root = self.tokens[token.parent]
        members = [root] + [t for t in self.tokens.values() if t.parent == root.value]
        return members

    def expire_tokens(
        self,
        *,
        provider: str | None,
        user_key: str | None,
        token_value: str | None,
        kind: str,
    ) -> int:
        now = self.now()
        targets: list[Token] = []
        if token_value:
            token = self.tokens.get(token_value)
            if token is None:
                return 0
            targets = [token]
            if token.kind == "refresh" or (token.provider == "meta" and token.kind == "user"):
                targets = self.family(token)
        else:
            for token in self.tokens.values():
                if provider and token.provider != provider:
                    continue
                if user_key and token.user_key != user_key:
                    continue
                if kind == "access" and token.provider == "google" and token.kind == "refresh":
                    continue
                targets.append(token)
        count = 0
        for token in targets:
            if token.state(now) == "valid":
                token.expired_forced_at = now
                count += 1
        return count

    # --- dados --------------------------------------------------------------------------

    def seed_data(self) -> None:
        self.ig_media.clear()
        self.ig_comments.clear()
        self.page_posts.clear()
        self.gbp_reviews.clear()
        self.gbp_posts.clear()
        for slug, account in fixtures.META_ACCOUNTS.items():
            media = []
            for index, item in enumerate(account.media, start=1):
                media_id = f"1790000000{int(account.page_id[-3:]):03d}{index:04d}"
                when = fixtures.at_days_ago(item.days_ago)
                media.append(
                    {
                        "id": media_id,
                        "caption": item.caption,
                        "media_type": item.media_type,
                        "media_product_type": "FEED",
                        "timestamp": when.timestamp(),
                        "like_count": item.likes,
                        "reach": item.reach,
                        "saved": item.saved,
                        "shares": item.shares,
                        "creation_id": None,
                    }
                )
                self.ig_comments[media_id] = [
                    {
                        "id": f"1800000000{int(account.page_id[-3:]):03d}{index:02d}{n:02d}",
                        "username": username,
                        "text": text,
                        "timestamp": (when.timestamp() + 3600 * (n + 1)),
                        "like_count": n,
                        "replies": [],
                    }
                    for n, (username, text) in enumerate(item.comments, start=1)
                ]
            self.ig_media[account.ig_user_id] = media
            self.page_posts[account.page_id] = [
                {
                    "id": f"{account.page_id}_{9000000000 + n}",
                    "message": text,
                    "created_time": fixtures.at_days_ago(days, 10).timestamp(),
                    "scheduled_publish_time": None,
                    "link": None,
                }
                for n, (days, text) in enumerate(fixtures.PAGE_POSTS[slug], start=1)
            ]
        for slug, google in fixtures.GOOGLE_ACCOUNTS.items():
            location = f"{google.gbp_account}/{google.gbp_location}"
            reviews = []
            for n, (days, reviewer, stars, comment, reply) in enumerate(
                fixtures.REVIEWS[slug], start=1
            ):
                review_id = "AbFvOq" + hashlib.sha1(f"{slug}-{n}".encode()).hexdigest()[:18]
                created = fixtures.at_days_ago(days, 15).timestamp()
                reviews.append(
                    {
                        "reviewId": review_id,
                        "reviewer": reviewer,
                        "starRating": stars,
                        "comment": comment,
                        "createTime": created,
                        "updateTime": created,
                        "reply": (
                            {"comment": reply, "updateTime": created + 86400} if reply else None
                        ),
                    }
                )
            self.gbp_reviews[location] = reviews
            self.gbp_posts[location] = [
                {
                    "id": f"{1000000000000000000 + n}",
                    "summary": text,
                    "topicType": "STANDARD",
                    "languageCode": "pt-BR",
                    "createTime": fixtures.at_days_ago(days, 11).timestamp(),
                    "state": "LIVE",
                    "callToAction": None,
                    "media": [],
                    "event": None,
                    "offer": None,
                }
                for n, (days, text) in enumerate(fixtures.LOCAL_POSTS[slug], start=1)
            ]

    def reset(self) -> None:
        self.config = default_config()
        self.tokens.clear()
        self.codes.clear()
        self.calls.clear()
        self.fail_rules.clear()
        self.rate_windows.clear()
        self.clock_offset = 0.0
        self.google_granted.clear()
        self.meta_declined.clear()
        self.ig_containers.clear()
        self.ig_publish_log.clear()
        self._ids = itertools.count(1)
        self._seq = itertools.count(1)
        self.seed_data()


STATE = State()
STATE.reset()


def snapshot_config() -> dict:
    return copy.deepcopy(STATE.config)
