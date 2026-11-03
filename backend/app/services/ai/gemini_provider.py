"""Google Gemini API Provider implementation via lightweight async HTTP."""

import logging
from typing import List, Dict, Any
import httpx
from app.services.ai.base import BaseAIProvider
from app.models.schemas import ChatMessage
from app.core.config import get_fresh_settings

logger = logging.getLogger("mohib_ai.gemini")


class GeminiAIProvider(BaseAIProvider):
    """Production cloud provider utilizing Google Gemini Generative Language API."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        # Normalize model name
        clean_model = model_name.strip()
        if clean_model.startswith("models/"):
            clean_model = clean_model.replace("models/", "")

        super().__init__(provider_name="gemini", model_name=clean_model)
        self.api_key = api_key.strip()
        self.endpoint_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent"
        )

    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Send chat payload to Google Gemini and return the generated text."""
        current_settings = get_fresh_settings()

        # Build contents structure ensuring strictly alternating user/model turns
        raw_turns: List[Dict[str, Any]] = []

        # Trim history
        trimmed_history = history[-current_settings.MAX_HISTORY_MESSAGES :]

        for msg in trimmed_history:
            role = "user" if msg.role == "user" else "model"
            content_text = msg.content.strip()
            if not content_text:
                continue

            # If previous turn had the same role, combine to satisfy Gemini alternating constraint
            if raw_turns and raw_turns[-1]["role"] == role:
                raw_turns[-1]["parts"][0]["text"] += f"\n\n{content_text}"
            else:
                raw_turns.append({
                    "role": role,
                    "parts": [{"text": content_text}],
                })

        # Append current user prompt
        user_prompt = message.strip()
        if raw_turns and raw_turns[-1]["role"] == "user":
            raw_turns[-1]["parts"][0]["text"] += f"\n\n{user_prompt}"
        else:
            raw_turns.append({
                "role": "user",
                "parts": [{"text": user_prompt}],
            })

        # Ensure first turn is from 'user'
        while raw_turns and raw_turns[0]["role"] != "user":
            raw_turns.pop(0)

        payload = {
            "system_instruction": {
                "parts": [{"text": current_settings.FRIDAY_SYSTEM_PROMPT}],
            },
            "contents": raw_turns,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
            },
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint_url,
                    json=payload,
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                    return "Friday received an empty response from Gemini."

                # Detailed error diagnostics without leaking key
                status_code = response.status_code
                error_json = {}
                try:
                    error_json = response.json().get("error", {})
                except Exception:
                    pass

                error_message = error_json.get("message", response.text[:200])

                if status_code in (401, 403):
                    logger.error(f"Gemini authentication failed: {error_message}")
                    return (
                        "⚠️ **[Friday Gemini Authentication Error]**\n\n"
                        "আপনার `GEMINI_API_KEY` টি সঠিক নয় বা মেয়াদোত্তীর্ণ হয়েছে।\n"
                        "দয়া করে [Google AI Studio](https://aistudio.google.com/) থেকে একটি সঠিক ও ফ্রি API Key সংগ্রহ করে "
                        "আপনার `.env` ফাইলে আপডেট করুন।"
                    )
                elif status_code == 429:
                    logger.warning(f"Gemini quota/rate limit: {error_message}")
                    return (
                        "⏳ **[Friday Gemini Rate Limit]**\n\n"
                        "Gemini API-এর রিকোয়েস্ট কোটা পূর্ণ হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।"
                    )
                else:
                    logger.error(f"Gemini API error ({status_code}): {error_message}")
                    return (
                        f"⚠️ **[Friday Gemini Error - Status {status_code}]**\n\n"
                        f"{error_message}"
                    )

        except httpx.TimeoutException:
            logger.error("Gemini API request timed out.")
            return "Friday request to Gemini timed out. Please check your internet connection and try again."
        except Exception as e:
            logger.error(f"Unexpected error communicating with Gemini API: {str(e)}", exc_info=True)
            return f"Friday encountered an unexpected error while contacting Gemini API: {str(e)}"
