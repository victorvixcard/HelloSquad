import pytest

from hellosquad.config import get_settings


@pytest.fixture(autouse=True)
def test_settings(monkeypatch: pytest.MonkeyPatch):
    """Isola os testes do `.env` local: ambiente fixo em `test` e cache de configuração limpo."""
    monkeypatch.setenv("APP_ENV", "test")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
