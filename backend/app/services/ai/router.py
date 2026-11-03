"""AIRouter: Intelligent Multi-Provider Router with Task-Based Selection and Safe Fallbacks."""

import logging
import re
from typing import Tuple, List, Optional
from app.core.config import get_fresh_settings
from app.models.schemas import ChatMessage
from app.services.ai.base import AIProviderInterface
from app.services.ai.gemini_provider import GeminiAIProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.missing_key_provider import MissingApiKeyProvider

logger = logging.getLogger("mohib_ai.router")


def classify_task_type(message: str) -> str:
    """Classify the incoming prompt to guide intelligent routing."""
    lower = message.lower()

    # Coding / Complex Reasoning signals
    complex_coding_signals = [
        "debug", "algorithm", "refactor", "regex", "sql", "architecture",
        "solve", "error", "traceback", "stack trace", "complexity", "big o",
        "optimize", "performance", "class diagram", "database schema"
    ]
    if any(sig in lower for sig in complex_coding_signals):
        return "coding_complex"

    return "general_conversational"


class AIRouter:
    """Intelligent Router selecting the optimal provider based on task, latency, and cost."""

    def __init__(self):
        pass

    def get_configured_providers(self) -> Tuple[Optional[GeminiAIProvider], Optional[OpenAIProvider]]:
        """Instantiate available cloud providers based on fresh settings."""
        settings = get_fresh_settings()
        gemini_provider = None
        openai_provider = None

        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            gemini_provider = GeminiAIProvider(
                api_key=settings.GEMINI_API_KEY.strip(),
                model_name=settings.GEMINI_MODEL or "gemini-1.5-flash",
            )

        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
            openai_provider = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY.strip(),
                model_name=settings.OPENAI_MODEL or "gpt-4o-mini",
            )

        return gemini_provider, openai_provider

    async def route_and_generate(
        self,
        message: str,
        history: List[ChatMessage],
        requested_mode: Optional[str] = None,
    ) -> Tuple[str, str, str]:
        """Route prompt according to mode and execute with safe fallback rules.

        Returns:
            Tuple[reply_text, provider_name, model_name]
        """
        settings = get_fresh_settings()
        mode = (requested_mode or settings.AI_PROVIDER or "auto").strip().lower()

        gemini_p, openai_p = self.get_configured_providers()

        # -------------------------------------------------------------
        # Mode 1: Strict GEMINI Mode
        # -------------------------------------------------------------
        if mode == "gemini":
            if not gemini_p:
                missing_p = MissingApiKeyProvider("gemini")
                reply = await missing_p.generate_reply(message, history)
                return reply, missing_p.provider_name, missing_p.model_name
            # Never fallback silently when user explicitly chose Gemini
            logger.info("Executing strictly via Gemini Provider (user selected).")
            reply = await gemini_p.generate_reply(message, history)
            return reply, gemini_p.provider_name, gemini_p.model_name

        # -------------------------------------------------------------
        # Mode 2: Strict OPENAI Mode
        # -------------------------------------------------------------
        if mode == "openai":
            if not openai_p:
                missing_p = MissingApiKeyProvider("openai")
                reply = await missing_p.generate_reply(message, history)
                return reply, missing_p.provider_name, missing_p.model_name
            # Never fallback silently when user explicitly chose OpenAI
            logger.info("Executing strictly via OpenAI Provider (user selected).")
            reply = await openai_p.generate_reply(message, history)
            return reply, openai_p.provider_name, openai_p.model_name

        # -------------------------------------------------------------
        # Mode 3: Explicit MOCK Mode
        # -------------------------------------------------------------
        if mode == "mock":
            mock_p = MockAIProvider(model_name="friday-demo-v1")
            reply = await mock_p.generate_reply(message, history)
            return reply, mock_p.provider_name, mock_p.model_name

        # -------------------------------------------------------------
        # Mode 4: Intelligent AUTO Mode
        # -------------------------------------------------------------
        task_type = classify_task_type(message)
        logger.info(f"AIRouter AUTO mode triggered. Task classified as: [{task_type}]")

        # Routing Preference Strategy:
        # 1. Complex coding/debugging: Prefer OpenAI if configured (benchmark strength)
        # 2. General conversation / Bangla / Fast queries: Prefer Gemini (low cost, free tier, fast)
        primary_provider: Optional[AIProviderInterface] = None
        fallback_provider: Optional[AIProviderInterface] = None

        if task_type == "coding_complex":
            if openai_p:
                primary_provider = openai_p
                fallback_provider = gemini_p
            else:
                primary_provider = gemini_p
                fallback_provider = None
        else:
            if gemini_p:
                primary_provider = gemini_p
                fallback_provider = openai_p
            else:
                primary_provider = openai_p
                fallback_provider = None

        # If neither cloud provider has API credentials, use MockAIProvider
        if not primary_provider:
            logger.info("Neither Gemini nor OpenAI is configured. AUTO mode falling back to MockAIProvider.")
            mock_p = MockAIProvider(model_name="friday-demo-v1")
            reply = await mock_p.generate_reply(message, history)
            return reply, mock_p.provider_name, mock_p.model_name

        # Execute primary with safe fallback to secondary provider
        try:
            logger.info(f"AUTO mode dispatching to primary provider: [{primary_provider.provider_name}].")
            reply = await primary_provider.generate_reply(message, history)
            return reply, primary_provider.provider_name, primary_provider.model_name

        except (TimeoutError, RuntimeError) as recoverable_err:
            logger.warning(
                f"Primary provider [{primary_provider.provider_name}] failed: {str(recoverable_err)}. "
                f"Checking fallback availability."
            )
            if fallback_provider:
                logger.info(
                    f"AUTO mode successfully triggering fallback to: [{fallback_provider.provider_name}]."
                )
                try:
                    fallback_reply = await fallback_provider.generate_reply(message, history)
                    return fallback_reply, f"{fallback_provider.provider_name} (fallback)", fallback_provider.model_name
                except Exception as fb_err:
                    logger.error(f"Fallback provider [{fallback_provider.provider_name}] also failed: {fb_err}")

            # If no fallback or fallback failed, return friendly error
            return (
                f"⚠️ **[Friday Router Alert]**\n\n"
                f"প্রাইমারি এআই প্রোভাইডারে সাময়িক সংযোগ বা রেট লিমিট সমস্যা হয়েছে ({str(recoverable_err)})। "
                f"অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
            ), primary_provider.provider_name, primary_provider.model_name

        except Exception as unhandled_err:
            logger.error(f"Unexpected error in primary provider: {str(unhandled_err)}", exc_info=True)
            if fallback_provider:
                logger.info(f"Attempting fallback to [{fallback_provider.provider_name}] after unexpected error.")
                try:
                    fallback_reply = await fallback_provider.generate_reply(message, history)
                    return fallback_reply, f"{fallback_provider.provider_name} (fallback)", fallback_provider.model_name
                except Exception:
                    pass

            return (
                f"Friday encountered an unexpected issue with {primary_provider.provider_name}: {str(unhandled_err)}"
            ), primary_provider.provider_name, primary_provider.model_name


ai_router = AIRouter()

