from httpx import ASGITransport, AsyncClient

from hellosquad import __version__
from hellosquad.api.main import app


async def test_health_returns_version_and_environment() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__, "environment": "test"}


async def test_cors_allows_only_the_local_web_origin() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        allowed = await client.options(
            "/me",
            headers={"Origin": "http://127.0.0.1:3100", "Access-Control-Request-Method": "GET"},
        )
        other = await client.options(
            "/me",
            headers={"Origin": "http://outro-site.example", "Access-Control-Request-Method": "GET"},
        )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:3100"
    assert "access-control-allow-origin" not in other.headers
