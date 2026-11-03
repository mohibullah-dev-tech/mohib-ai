"""Factory function to provide the active AI provider."""

import logging
from app.core.config import get_fresh_settings
from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.gemini_provider import GeminiAIProvider
from app.services.ai.missing_key_provider import MissingApiKeyProvider

logger = logging.getLogger("mohib_ai.factory")


def get_ai_provider() -> BaseAIProvider:
    """Resolve and return the configured AI provider based on fresh environment settings.

    Never silently falls back to Mock provider when a real cloud provider is configured.
    """
    settings = get_fresh_settings()
    provider_type = (settings.AI_PROVIDER or "mock").strip().lower()

    if provider_type == "gemini":
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            logger.info(f"Using Google Gemini AI provider with model: {settings.AI_MODEL_NAME}")
            return GeminiAIProvider(
                api_key=settings.GEMINI_API_KEY.strip(),
                model_name=settings.AI_MODEL_NAME,
            )
        else:
            logger.warning(
                "Gemini AI provider is selected in .env, but GEMINI_API_KEY is missing. "
                "Returning MissingApiKeyProvider."
            )
            return MissingApiKeyProvider(provider_target="gemini")

    # Explicit Demo Mode
    logger.info("Using Mock/Demo AI Provider (offline fallback).")
    return MockAIProvider(model_name="friday-demo-v1")
