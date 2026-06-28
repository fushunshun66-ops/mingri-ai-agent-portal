"""全局配置，基于 pydantic-settings 从环境变量 /.env 加载"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── 应用 ──
    app_name: str = "agent-portal"
    app_env: str = "development"
    app_debug: bool = True
    app_secret_key: str = "change-me-to-a-random-secret-key-at-least-32-chars"
    app_timezone: str = "Asia/Shanghai"
    api_port: int = 8000

    # ── 数据库 ──
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "agent_portal"
    postgres_user: str = "portal"
    postgres_password: str = "change_me_in_prod"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    test_database_url: str = (
        "postgresql+asyncpg://portal:change_me_in_prod@localhost:5432/agent_portal_test"
    )

    # ── Redis ──
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = "change_me_in_prod"

    @property
    def redis_url(self) -> str:
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"

    # ── JWT ──
    jwt_algorithm: str = "HS256"
    jwt_secret_key: str = "dev-secret-key-change-in-production-min-32-chars"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # ── 加密 ──
    encryption_key: str = "0123456789abcdef0123456789abcdef"

    # ── 限流 ──
    rate_limit_enabled: bool = False
    rate_limit_per_minute: int = 60

    # ── 日志 ──
    log_level: str = "INFO"
    log_format: str = "text"

    # ── MinIO ──
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "agent-portal"
    minio_secure: bool = False

    # ── CORS ──
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @field_validator("app_secret_key")
    @classmethod
    def validate_app_secret_key(cls, v: str, info) -> str:
        if info.data.get("app_env") == "production" and v == "change-me-to-a-random-secret-key-at-least-32-chars":
            raise ValueError("生产环境必须设置 APP_SECRET_KEY，不得使用默认值")
        return v

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret_key(cls, v: str, info) -> str:
        if info.data.get("app_env") == "production" and "dev-secret" in v.lower():
            raise ValueError("生产环境必须设置强 JWT_SECRET_KEY，不得使用开发默认值")
        return v

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key(cls, v: str, info) -> str:
        if info.data.get("app_env") == "production" and v == "0123456789abcdef0123456789abcdef":
            raise ValueError("生产环境必须设置强 ENCRYPTION_KEY，不得使用默认值")
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()
