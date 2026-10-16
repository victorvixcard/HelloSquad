from httpx import ASGITransport, AsyncClient

from hellosquad import __version__
from hellosquad.api.main import app


async def test_health_returns_version_and_environment() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__, "environment": "test"}
