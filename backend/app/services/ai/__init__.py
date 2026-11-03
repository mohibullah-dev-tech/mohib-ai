"""AI service provider package for Friday."""

from app.services.ai.base import BaseAIProvider
from app.services.ai.factory import get_ai_provider

__all__ = ["BaseAIProvider", "get_ai_provider"]

