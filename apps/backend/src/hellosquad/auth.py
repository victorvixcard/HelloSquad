"""Validação do JWT de acesso emitido pela Auth do Supabase.

Caminho principal: chave pública do JWKS da Auth (ES256/RS256). Fallback HS256 com segredo
compartilhado só quando AUTH_JWT_ALGORITHMS o inclui. A família do algoritmo decide a origem da
chave, então um token HS256 nunca é conferido contra uma chave do JWKS (confusão de algoritmo).
"""

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from jwt import PyJWKClient

from hellosquad.config import Settings

ASYMMETRIC_ALGORITHMS = frozenset({"ES256", "RS256"})
REQUIRED_CLAIMS = ["exp", "iat", "sub", "aud", "iss", "role"]


class InvalidTokenError(Exception):
    pass


class AuthUnavailableError(Exception):
    """O JWKS da Auth não respondeu: não dá para dizer se o token é válido."""


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    claims: dict[str, Any]

    @property
    def email(self) -> str | None:
        return self.claims.get("email") or None

    @property
    def full_name(self) -> str | None:
        metadata = self.claims.get("user_metadata") or {}
        return metadata.get("full_name") or metadata.get("name") or None


class TokenVerifier:
    def __init__(
        self,
        *,
        algorithms: frozenset[str],
        issuer: str,
        audience: str,
        leeway_seconds: float = 0,
        jwks_client: PyJWKClient | None = None,
        hs256_secret: str | None = None,
    ) -> None:
        if algorithms & ASYMMETRIC_ALGORITHMS and jwks_client is None:
            raise ValueError("algoritmo assimétrico aceito sem cliente JWKS")
        if "HS256" in algorithms and not hs256_secret:
            raise ValueError("HS256 aceito sem segredo")
        self._algorithms = algorithms
        self._issuer = issuer
        self._audience = audience
        self._leeway = leeway_seconds
        self._jwks_client = jwks_client
        self._hs256_secret = hs256_secret

    @classmethod
    def from_settings(cls, settings: Settings) -> "TokenVerifier":
        algorithms = frozenset(settings.auth_jwt_algorithms)
        jwks_client = None
        if algorithms & ASYMMETRIC_ALGORITHMS:
            jwks_client = PyJWKClient(
                settings.jwks_url, lifespan=settings.auth_jwks_cache_seconds, timeout=5
            )
        secret = settings.supabase_jwt_secret
        return cls(
            algorithms=algorithms,
            issuer=settings.jwt_issuer,
            audience=settings.auth_jwt_audience,
            leeway_seconds=settings.auth_jwt_leeway_seconds,
            jwks_client=jwks_client,
            hs256_secret=secret.get_secret_value() if secret and "HS256" in algorithms else None,
        )

    def verify(self, token: str) -> Principal:
        try:
            algorithm = jwt.get_unverified_header(token).get("alg")
            if algorithm not in self._algorithms:
                raise InvalidTokenError(f"algoritmo não aceito: {algorithm!r}")
            claims = jwt.decode(
                token,
                self._key_for(token, algorithm),
                algorithms=[algorithm],
                audience=self._audience,
                issuer=self._issuer,
                leeway=self._leeway,
                options={"require": REQUIRED_CLAIMS},
            )
        except jwt.PyJWKClientConnectionError as exc:
            raise AuthUnavailableError(str(exc)) from exc
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(str(exc)) from exc

        if claims.get("role") != "authenticated":
            raise InvalidTokenError("o token não é de usuário autenticado")
        try:
            user_id = UUID(str(claims["sub"]))
        except ValueError as exc:
            raise InvalidTokenError("sub não é um UUID") from exc
        return Principal(user_id=user_id, claims=claims)

    def _key_for(self, token: str, algorithm: str) -> Any:
        if algorithm == "HS256":
            return self._hs256_secret
        signing_key = self._jwks_client.get_signing_key_from_jwt(token)
        if signing_key.algorithm_name != algorithm:
            raise InvalidTokenError("algoritmo do token diferente do da chave no JWKS")
        return signing_key.key
