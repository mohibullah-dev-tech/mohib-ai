"""AI service provider and intelligence router package for Friday."""

from app.services.ai.base import AIProviderInterface, BaseAIProvider
from app.services.ai.gemini_provider import GeminiAIProvider, GeminiProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.router import AIRouter, ai_router
from app.services.ai.health_service import ProviderHealthService, provider_health_service
from app.services.ai.factory import get_ai_provider

__all__ = [
    "AIProviderInterface",
    "BaseAIProvider",
    "GeminiAIProvider",
    "GeminiProvider",
    "OpenAIProvider",
    "MockAIProvider",
    "AIRouter",
    "ai_router",
    "ProviderHealthService",
    "provider_health_service",
    "get_ai_provider",
]
