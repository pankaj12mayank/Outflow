from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import json


def parse_list(value: str) -> list[str]:
    if isinstance(value, list):
        return value
    try:
        return json.loads(value)
    except Exception:
        return [v.strip() for v in value.split(",") if v.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    app_env: str = "development"
    app_name: str = "Outflo"
    app_version: str = "1.0.0"
    debug: bool = True
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    database_url: str = ""
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_echo: bool = False

    mongo_url: str = "mongodb://localhost:27017"
    mongo_database: str = "outflo"
    mongo_min_pool_size: int = 10
    mongo_max_pool_size: int = 100

    cors_origins: list[str] = ["http://localhost:3000"]
    cors_credentials: bool = True

    # AI — set AI_PROVIDER=openai|anthropic|ollama (paid API recommended for cloud deploy)
    ai_provider: str = "ollama"
    ai_default_model: str = "llama3.2"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3.2"
    ollama_timeout: int = 120
    ollama_max_retries: int = 3

    playwright_browsers_path: str = "./browsers"
    playwright_headless: bool = True
    playwright_timeout: int = 30000

    scrape_delay_ms: int = 2000
    scrape_max_concurrent: int = 5
    scrape_retry_attempts: int = 3

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True

    email_daily_limit: int = 500
    email_rate_limit_ms: int = 3000
    email_bounce_threshold: int = 3

    storage_path: str = "./storage"
    upload_max_size_mb: int = 10

    sentry_dsn: str = ""
    metrics_enabled: bool = True

    polling_campaigns: int = 30000
    polling_leads: int = 15000
    polling_emails: int = 10000
    polling_tasks: int = 5000

    enable_startup_cache: bool = True
    cache_ttl_seconds: int = 300

    system_owner_email: str = "admin@outflo.com"
    system_owner_password: str = ""
    system_owner_jwt_secret: str = ""
    app_url: str = "http://localhost:3000"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.cors_origins and isinstance(self.cors_origins, str):
            self.cors_origins = parse_list(self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()