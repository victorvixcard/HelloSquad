"""Configuração lida do ambiente e, em máquina local, do `.env` da raiz do monorepo."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from hellosquad.llm.pricing import DEFAULT_PRICES, ModelPrice

JwtAlgorithm = Literal["ES256", "RS256", "HS256"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # `make dev-api` roda de apps/backend; a raiz do monorepo fica dois níveis acima.
        # Variável de ambiente vale mais que o arquivo; arquivo ausente é ignorado.
        env_file=("../../.env", ".env"),
        extra="ignore",
    )

    app_env: Literal["local", "test", "staging", "production"] = "local"
    api_host: str = "127.0.0.1"
    api_port: int = 8100
    api_reload: bool = False
    # Origens do navegador que podem chamar a API (o web local). Valor no .env separado por vírgula.
    api_cors_origins: Annotated[list[str], NoDecode] = [
        "http://127.0.0.1:3100",
        "http://localhost:3100",
    ]
    log_level: str = "INFO"
    worker_idle_seconds: float = 30.0
    scheduler_tick_seconds: float = 60.0

    supabase_url: str = "http://127.0.0.1:56321"
    supabase_publishable_key: str | None = None
    supabase_secret_key: SecretStr | None = None

    # Algoritmos aceitos no JWT do usuário. ES256/RS256: chave pública do JWKS da Auth.
    # HS256: só como fallback, com SUPABASE_JWT_SECRET. Valor no .env separado por vírgula.
    auth_jwt_algorithms: Annotated[list[JwtAlgorithm], NoDecode] = ["ES256"]
    auth_jwks_url: str | None = None
    auth_jwt_issuer: str | None = None
    auth_jwt_audience: str = "authenticated"
    # Tolerância a relógio adiantado/atrasado entre a Auth e a API (exp, iat).
    auth_jwt_leeway_seconds: float = 5.0
    auth_jwks_cache_seconds: float = 300.0
    supabase_jwt_secret: SecretStr | None = None

    # Papel hellosquad_api (sem BYPASSRLS). A API só fala com o banco por aqui.
    api_database_url: SecretStr | None = None
    api_db_pool_min_size: int = 1
    api_db_pool_max_size: int = 10
    # Usuário postgres do Supabase local: ferramentas locais (seed, senha do papel, testes) e, até o
    # papel próprio do worker existir, o papel privilegiado do worker local.
    database_url: SecretStr | None = None

    # Papel privilegiado do worker (ignora a RLS; o worker filtra por workspace_id). Vazio em
    # local/test: usa DATABASE_URL.
    worker_database_url: SecretStr | None = None

    # LLM do runtime do squad. anthropic sem ANTHROPIC_API_KEY cai no simulado (com aviso no log).
    llm_provider: Literal["anthropic", "simulated"] = "anthropic"
    anthropic_api_key: SecretStr | None = None
    llm_timeout_seconds: float = 600.0
    llm_max_retries: int = 2
    # USD por milhão de tokens, por modelo. JSON no .env para trocar sem mudar código.
    llm_prices: dict[str, ModelPrice] = Field(default_factory=lambda: dict(DEFAULT_PRICES))
    # Pasta squad/ (agent.yaml, SOUL.md, skills/). Vazio: a do monorepo.
    squad_dir: Path | None = None
    # Busca web da Bia (02.07). Desligada por padrão: a entrega fica só com sugestões sem validação.
    # mock = resultados fictícios fixos (testes, demonstração); brave = busca real, com a chave.
    web_search_provider: Literal["disabled", "mock", "brave"] = "disabled"
    web_search_api_key: SecretStr | None = None
    web_search_timeout_seconds: float = Field(default=10.0, gt=0)

    # Worker: runs simultâneos no processo, teto por workspace (aplicado ao tirar da fila) e
    # tentativas.
    worker_concurrency: int = Field(default=4, ge=1)
    worker_workspace_cap: int = Field(default=3, ge=1)
    worker_visibility_timeout_seconds: int = Field(default=120, ge=10)
    worker_max_attempts: int = Field(default=3, ge=1)
    worker_retry_base_seconds: float = Field(default=5.0, ge=0)
    worker_poll_seconds: float = Field(default=1.0, gt=0)
    worker_shutdown_grace_seconds: float = Field(default=30.0, ge=0)
    worker_history_messages: int = Field(default=20, ge=1)
    # Orçamento (tokens estimados) da Memória da Marca no contexto de cada run (S1d).
    memory_context_tokens: int = Field(default=1500, ge=0)
    # Camada 3 (S2c): quantos aprendizados promovidos entram por run (dentro do mesmo orçamento),
    # depois de quantos dias sem "continua valendo" o aprendizado entra marcado para revisar, e as
    # regras de promoção automática: correção explícita com confiança mínima, ou a mesma lição em N
    # trabalhos diferentes (Arquitetura §5.3).
    learning_top_k: int = Field(default=5, ge=0)
    learning_review_days: int = Field(default=90, ge=1)
    learning_promotion_confidence: float = Field(default=0.7, ge=0, le=1)
    learning_promotion_repeats: int = Field(default=2, ge=2)
    # Embeddings da memória (ADR-0009): desligados até o dono escolher o fornecedor.
    embeddings_provider: Literal["disabled"] = "disabled"
    # Motor de imagem da Kaia: é do dono e ainda não chegou; só o stub "aguardando o motor".
    image_engine_provider: Literal["pending"] = "pending"

    @field_validator("auth_jwt_algorithms", "api_cors_origins", mode="before")
    @classmethod
    def split_comma_separated(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def require_secret_for_hs256(self) -> "Settings":
        if "HS256" in self.auth_jwt_algorithms and not self.supabase_jwt_secret:
            raise ValueError("AUTH_JWT_ALGORITHMS inclui HS256 e SUPABASE_JWT_SECRET está vazio.")
        if not self.auth_jwt_algorithms:
            raise ValueError("AUTH_JWT_ALGORITHMS não pode ser vazio.")
        return self

    @property
    def jwks_url(self) -> str:
        return self.auth_jwks_url or f"{self.jwt_issuer}/.well-known/jwks.json"

    @property
    def jwt_issuer(self) -> str:
        return self.auth_jwt_issuer or f"{self.supabase_url.rstrip('/')}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
