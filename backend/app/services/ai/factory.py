"""Factory function to provide the active AI provider."""

import logging
from app.core.config import settings
from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.gemini_provider import GeminiAIProvider

logger = logging.getLogger("mohib_ai.factory")


def get_ai_provider() -> BaseAIProvider:
    """Resolve and return the configured AI provider based on settings."""
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
                "Gemini AI provider requested, but GEMINI_API_KEY is not set. Falling back to MockAIProvider."
            )
            return MockAIProvider(model_name="friday-demo-v1")

    # Default to mock/demo provider
    logger.info("Using Mock/Demo AI Provider (zero-cost, offline-ready).")
    return MockAIProvider(model_name="friday-demo-v1")

