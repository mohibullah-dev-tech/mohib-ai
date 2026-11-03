"""Google Gemini API Provider implementation via lightweight async HTTP."""

import logging
from typing import List, Dict, Any
import httpx
from app.services.ai.base import BaseAIProvider
from app.models.schemas import ChatMessage
from app.core.config import settings

logger = logging.getLogger("mohib_ai.gemini")


class GeminiAIProvider(BaseAIProvider):
    """Zero-cost cloud provider utilizing Google Gemini Generative Language API."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        super().__init__(provider_name="gemini", model_name=model_name)
        self.api_key = api_key
        self.endpoint_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            f"?key={self.api_key}"
        )

    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Send chat payload to Google Gemini and return the generated text."""
        # Convert ChatMessage history to Gemini contents structure
        contents: List[Dict[str, Any]] = []

        # Limit history to MAX_HISTORY_MESSAGES
        trimmed_history = history[-settings.MAX_HISTORY_MESSAGES :]

        for msg in trimmed_history:
            role = "user" if msg.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}],
            })

        # Append current user prompt
        contents.append({
            "role": "user",
            "parts": [{"text": message}],
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": settings.FRIDAY_SYSTEM_PROMPT}],
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                    return "Friday received an empty response from Gemini."

                # Error handling without leaking API key
                error_body = response.text
                logger.error(
                    f"Gemini API returned status {response.status_code}: {error_body[:200]}"
                )
                return (
                    f"**[Friday Gemini Error]**\n\n"
                    f"Gemini API error (Status {response.status_code}). Please verify your `GEMINI_API_KEY`."
                )

        except httpx.TimeoutException:
            logger.error("Gemini API request timed out.")
            return "Friday request to Gemini timed out. Please check your internet connection and try again."
        except Exception as e:
            logger.error(f"Unexpected error communicating with Gemini API: {str(e)}")
            return f"Friday encountered an unexpected error while contacting Gemini API: {str(e)}"

