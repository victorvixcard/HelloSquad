"""Validação do JWT sem rede: chave EC gerada aqui e JWKS falso, como a Auth publicaria."""

import time
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm
from pydantic import ValidationError

from hellosquad.auth import AuthUnavailableError, InvalidTokenError, TokenVerifier
from hellosquad.config import Settings

ISSUER = "http://auth.test/auth/v1"
KID = "chave-de-teste"
HS256_SECRET = "segredo-local-de-teste-com-mais-de-32-caracteres"


@pytest.fixture(scope="module")
def signing_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def jwks_client(signing_key: ec.EllipticCurvePrivateKey) -> jwt.PyJWKClient:
    public_jwk = ECAlgorithm.to_jwk(signing_key.public_key(), as_dict=True)
    client = jwt.PyJWKClient(f"{ISSUER}/.well-known/jwks.json")
    client.fetch_data = lambda: {"keys": [{**public_jwk, "kid": KID, "alg": "ES256", "use": "sig"}]}
    return client


def make_claims(**overrides: object) -> dict[str, object]:
    now = int(time.time())
    claims: dict[str, object] = {
        "sub": str(uuid4()),
        "aud": "authenticated",
        "iss": ISSUER,
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "email": "teste@exemplo.example",
        "user_metadata": {"full_name": "Pessoa de Teste"},
    }
    claims.update(overrides)
    return {key: value for key, value in claims.items() if value is not None}


def es256_token(key: ec.EllipticCurvePrivateKey, kid: str = KID, **overrides: object) -> str:
    return jwt.encode(make_claims(**overrides), key, algorithm="ES256", headers={"kid": kid})


def make_verifier(
    jwks_client: jwt.PyJWKClient | None = None,
    *,
    algorithms: tuple[str, ...] = ("ES256",),
    secret: str | None = None,
) -> TokenVerifier:
    return TokenVerifier(
        algorithms=frozenset(algorithms),
        issuer=ISSUER,
        audience="authenticated",
        jwks_client=jwks_client,
        hs256_secret=secret,
    )


def test_es256_token_checked_against_jwks_is_accepted(signing_key, jwks_client) -> None:
    sub = str(uuid4())

    principal = make_verifier(jwks_client).verify(es256_token(signing_key, sub=sub))

    assert str(principal.user_id) == sub
    assert principal.email == "teste@exemplo.example"
    assert principal.full_name == "Pessoa de Teste"


@pytest.mark.parametrize(
    "overrides",
    [
        {"exp": int(time.time()) - 60},
        {"aud": "outro-publico"},
        {"iss": "http://outra-auth.test/auth/v1"},
        {"role": "anon"},
        {"sub": "nao-e-uuid"},
        {"sub": None},
        {"exp": None},
    ],
    ids=["expirado", "audience", "issuer", "papel-anon", "sub-invalido", "sem-sub", "sem-exp"],
)
def test_token_with_wrong_claims_is_rejected(signing_key, jwks_client, overrides) -> None:
    with pytest.raises(InvalidTokenError):
        make_verifier(jwks_client).verify(es256_token(signing_key, **overrides))


def test_token_signed_by_another_key_is_rejected(jwks_client) -> None:
    forged = es256_token(ec.generate_private_key(ec.SECP256R1()))

    with pytest.raises(InvalidTokenError):
        make_verifier(jwks_client).verify(forged)


def test_token_with_unknown_kid_is_rejected(signing_key, jwks_client) -> None:
    with pytest.raises(InvalidTokenError):
        make_verifier(jwks_client).verify(es256_token(signing_key, kid="outra-chave"))


def test_hs256_token_is_rejected_when_only_jwks_algorithms_are_accepted(jwks_client) -> None:
    token = jwt.encode(make_claims(), HS256_SECRET, algorithm="HS256")

    with pytest.raises(InvalidTokenError, match="algoritmo"):
        make_verifier(jwks_client).verify(token)


def test_unsigned_token_is_rejected(jwks_client) -> None:
    token = jwt.encode(make_claims(), None, algorithm="none")

    with pytest.raises(InvalidTokenError):
        make_verifier(jwks_client).verify(token)


def test_garbage_is_rejected(jwks_client) -> None:
    with pytest.raises(InvalidTokenError):
        make_verifier(jwks_client).verify("isto não é um jwt")


def test_hs256_fallback_accepts_token_signed_with_configured_secret() -> None:
    sub = str(uuid4())
    token = jwt.encode(make_claims(sub=sub), HS256_SECRET, algorithm="HS256")

    principal = make_verifier(algorithms=("HS256",), secret=HS256_SECRET).verify(token)

    assert str(principal.user_id) == sub


def test_hs256_fallback_rejects_other_secret() -> None:
    token = jwt.encode(make_claims(), "outro-segredo-com-32-caracteres-ou-mais", algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        make_verifier(algorithms=("HS256",), secret=HS256_SECRET).verify(token)


def test_es256_token_is_rejected_when_only_hs256_is_accepted(signing_key) -> None:
    with pytest.raises(InvalidTokenError, match="algoritmo"):
        make_verifier(algorithms=("HS256",), secret=HS256_SECRET).verify(es256_token(signing_key))


def test_unreachable_jwks_is_unavailable_not_invalid(signing_key) -> None:
    client = jwt.PyJWKClient("http://127.0.0.1:9/auth/v1/.well-known/jwks.json", timeout=1)

    with pytest.raises(AuthUnavailableError):
        make_verifier(client).verify(es256_token(signing_key))


def test_settings_read_algorithms_as_comma_separated_list(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_JWT_ALGORITHMS", "ES256, RS256")

    settings = Settings(_env_file=None)

    assert settings.auth_jwt_algorithms == ["ES256", "RS256"]


def test_settings_refuse_hs256_without_secret(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_JWT_ALGORITHMS", "HS256")
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_derive_issuer_and_jwks_from_supabase_url() -> None:
    settings = Settings(_env_file=None, supabase_url="http://127.0.0.1:56321/")

    assert settings.jwt_issuer == "http://127.0.0.1:56321/auth/v1"
    assert settings.jwks_url == "http://127.0.0.1:56321/auth/v1/.well-known/jwks.json"
