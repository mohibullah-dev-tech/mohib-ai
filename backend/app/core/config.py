"""Application configuration using Pydantic Settings."""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for Mohib AI backend."""

    APP_NAME: str = "Mohib AI (Friday) Backend"
    APP_VERSION: str = "0.4.0"
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000

    # CORS origins allowed to communicate with this backend
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Multi-Provider AI Intelligence Configuration
    # Options: "auto" (default intelligent routing), "gemini", "openai", "mock"
    AI_PROVIDER: str = "auto"

    # Google Gemini Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # OpenAI Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Safe Local Windows Computer Agent Settings (Milestone 4)
    LOCAL_AGENT_ENABLED: bool = True
    # Comma-separated list of permitted base directories.
    # Empty string defaults to current project workspace directory only.
    ALLOWED_DIRECTORIES: str = ""
    # Optional shared local auth token for computer control endpoints
    LOCAL_AGENT_TOKEN: Optional[str] = None
    # Maximum file read size in bytes (2MB default)
    MAX_FILE_READ_BYTES: int = 2 * 1024 * 1024

    # Legacy alias support
    AI_MODEL_NAME: str = "gemini-1.5-flash"

    MAX_REQUEST_LENGTH: int = 4000
    MAX_HISTORY_MESSAGES: int = 20

    FRIDAY_SYSTEM_PROMPT: str = (
        "You are Friday, the highly capable, friendly, and loyal personal AI assistant created for Mohibullah (Mohib). "
        "You have deep expertise in software engineering, full-stack web development, Python, JavaScript, TypeScript, "
        "Next.js, FastAPI, and system architecture.\n\n"
        "Bilingual Instructions:\n"
        "1. You are completely fluent in both Bangla (Bengali) and English.\n"
        "2. If Mohib writes or speaks to you in Bangla (either in Bengali script or Romanized Banglish), reply in natural, polite, and fluent Bangla.\n"
        "3. If Mohib writes or speaks in English, reply in crisp, professional English.\n"
        "4. When explaining programming or technical concepts, use clear, beginner-friendly explanations with structured examples.\n"
        "5. Maintain conversation context and remember prior messages in the conversation.\n"
        "6. Never claim to have performed external actions (e.g. deleting files, running commands, moving hardware) unless actually executed.\n"
        "7. Always respect security, privacy, and local safety rules."
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

    def get_allowed_directories_list(self) -> List[str]:
        """Return list of canonical absolute allowed directory paths."""
        if not self.ALLOWED_DIRECTORIES.strip():
            # Default to the root workspace directory
            return [os.path.abspath(os.getcwd())]
        dirs = []
        for d in self.ALLOWED_DIRECTORIES.split(","):
            cleaned = d.strip()
            if cleaned:
                dirs.append(os.path.abspath(cleaned))
        return dirs or [os.path.abspath(os.getcwd())]


def get_fresh_settings() -> Settings:
    """Read fresh settings from .env and environment variables."""
    return Settings()


settings = get_fresh_settings()
