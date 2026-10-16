from collections.abc import AsyncIterator, Callable

import httpx
import psycopg
import pytest

from hellosquad.config import Settings, get_settings

# Senha só local dos usuários fictícios (docs/DADOS_FICTICIOS.md).
SEED_PASSWORD = "Senha!Teste123"


@pytest.fixture(autouse=True)
def test_settings(monkeypatch: pytest.MonkeyPatch):
    """Isola os testes do `.env` local: ambiente fixo em `test` e cache de configuração limpo."""
    monkeypatch.setenv("APP_ENV", "test")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(scope="session")
def access_token() -> Callable[[str], str]:
    """Login real na Auth local com os usuários do seed; um login por usuário por sessão."""
    settings = Settings()
    if not settings.supabase_publishable_key:
        pytest.fail("SUPABASE_PUBLISHABLE_KEY vazio no .env (pnpm exec supabase status -o env).")
    tokens: dict[str, str] = {}

    def login(email: str) -> str:
        if email not in tokens:
            try:
                response = httpx.post(
                    f"{settings.supabase_url}/auth/v1/token",
                    params={"grant_type": "password"},
                    headers={"apikey": settings.supabase_publishable_key},
                    json={"email": email, "password": SEED_PASSWORD},
                    timeout=10,
                )
            except httpx.ConnectError:
                pytest.fail("Supabase local fora do ar: make up && make seed.")
            assert response.status_code == 200, f"login de {email}: {response.status_code}"
            tokens[email] = response.json()["access_token"]
        return tokens[email]

    return login


@pytest.fixture
async def api() -> AsyncIterator[httpx.AsyncClient]:
    """Cliente da API em processo, com o lifespan de verdade (pool do hellosquad_api e JWKS)."""
    from hellosquad.api.main import app

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        yield client


@pytest.fixture
async def admin_db() -> AsyncIterator[psycopg.AsyncConnection]:
    """Conexão postgres do Supabase local, só para preparar e conferir o estado nos testes."""
    settings = get_settings()
    if settings.database_url is None:
        pytest.fail("DATABASE_URL vazio no .env.")
    async with await psycopg.AsyncConnection.connect(
        settings.database_url.get_secret_value(), autocommit=True
    ) as conn:
        yield conn
