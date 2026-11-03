"""ProviderHealthService monitoring configuration, latency, and status of AI providers."""

import logging
from typing import Dict, Any
from app.core.config import get_fresh_settings
from app.services.ai.gemini_provider import GeminiAIProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.mock_provider import MockAIProvider

logger = logging.getLogger("mohib_ai.provider_health")


class ProviderHealthService:
    """Service auditing and reporting status of configured AI providers."""

    async def get_all_provider_statuses(self) -> Dict[str, Any]:
        """Audit current status of all supported AI providers without leaking keys."""
        settings = get_fresh_settings()
        gemini_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
        openai_configured = bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())

        gemini_model = settings.GEMINI_MODEL or "gemini-1.5-flash"
        openai_model = settings.OPENAI_MODEL or "gpt-4o-mini"

        # Determine Gemini Status
        gemini_status = "ready" if gemini_configured else "missing_key"
        # Determine OpenAI Status
        openai_status = "ready" if openai_configured else "missing_key"

        return {
            "active_mode": settings.AI_PROVIDER.lower(),
            "providers": {
                "gemini": {
                    "provider": "gemini",
                    "configured": gemini_configured,
                    "model": gemini_model,
                    "status": gemini_status,
                    "tier": "Free / Low Cost",
                    "cost_estimate": "$0.075 / 1M input",
                },
                "openai": {
                    "provider": "openai",
                    "configured": openai_configured,
                    "model": openai_model,
                    "status": openai_status,
                    "tier": "Pay as you go",
                    "cost_estimate": "$0.15 / 1M input",
                },
                "mock": {
                    "provider": "mock",
                    "configured": True,
                    "model": "friday-demo-v1",
                    "status": "ready",
                    "tier": "Offline Demo",
                    "cost_estimate": "$0.00 (Free)",
                },
            },
        }


provider_health_service = ProviderHealthService()

