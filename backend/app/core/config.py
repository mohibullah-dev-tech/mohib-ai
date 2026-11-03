"""Application configuration using Pydantic Settings."""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for Mohib AI backend."""

    APP_NAME: str = "Mohib AI (Friday) Backend"
    APP_VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000

    # CORS origins allowed to communicate with this backend
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # AI Brain & Provider Configuration
    AI_PROVIDER: str = "mock"  # "mock" or "gemini"
    GEMINI_API_KEY: Optional[str] = None
    AI_MODEL_NAME: str = "gemini-1.5-flash"
    MAX_REQUEST_LENGTH: int = 4000
    MAX_HISTORY_MESSAGES: int = 20

    FRIDAY_SYSTEM_PROMPT: str = (
        "You are Friday, the personal AI assistant created for Mohibullah (Mohib). "
        "You are friendly, highly intelligent, concise, and technically proficient in software engineering, "
        "debugging, system design, and web development. "
        "You understand both Bangla and English fluently. Always reply in the language the user speaks to you: "
        "if Mohib speaks or writes in Bangla, reply in natural, polite Bangla; if English, reply in crisp English. "
        "When explaining complex concepts, use beginner-friendly Bangla where helpful. "
        "Never pretend you have performed actions, modified files, or run commands unless explicitly requested and confirmed. "
        "Always maintain security and privacy."
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origins into a list of cleaned strings."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
