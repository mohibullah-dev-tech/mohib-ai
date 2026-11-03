"""Google Gemini API Provider implementation via lightweight async HTTP."""

import logging
from typing import List, Dict, Any
import httpx
from app.services.ai.base import AIProviderInterface
from app.models.schemas import ChatMessage
from app.core.config import get_fresh_settings

logger = logging.getLogger("mohib_ai.gemini")


class GeminiAIProvider(AIProviderInterface):
    """Production cloud provider utilizing Google Gemini Generative Language API."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        clean_model = model_name.strip()
        if clean_model.startswith("models/"):
            clean_model = clean_model.replace("models/", "")

        # Gemini 1.5 Flash cost: $0.075 / 1M input, $0.30 / 1M output (Free tier available)
        super().__init__(
            provider_name="gemini",
            model_name=clean_model,
            input_cost_per_m=0.075,
            output_cost_per_m=0.30,
        )
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

        raw_turns: List[Dict[str, Any]] = []
        trimmed_history = history[-current_settings.MAX_HISTORY_MESSAGES :]

        for msg in trimmed_history:
            role = "user" if msg.role == "user" else "model"
            content_text = msg.content.strip()
            if not content_text:
                continue

            if raw_turns and raw_turns[-1]["role"] == role:
                raw_turns[-1]["parts"][0]["text"] += f"\n\n{content_text}"
            else:
                raw_turns.append({
                    "role": role,
                    "parts": [{"text": content_text}],
                })

        user_prompt = message.strip()
        if raw_turns and raw_turns[-1]["role"] == "user":
            raw_turns[-1]["parts"][0]["text"] += f"\n\n{user_prompt}"
        else:
            raw_turns.append({
                "role": "user",
                "parts": [{"text": user_prompt}],
            })

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
                        "আপনার `GEMINI_API_KEY` টি সঠিক নয় বা অবৈধ।\n"
                        "দয়া করে [Google AI Studio](https://aistudio.google.com/) থেকে একটি সঠিক ও ফ্রি API Key নিয়ে "
                        "আপনার `.env` ফাইলে আপডেট করুন।"
                    )
                elif status_code == 429:
                    logger.warning(f"Gemini quota/rate limit: {error_message}")
                    raise RuntimeError("Gemini quota/rate limit exceeded.")
                else:
                    logger.error(f"Gemini API error ({status_code}): {error_message}")
                    return f"⚠️ **[Friday Gemini Error - Status {status_code}]**\n\n{error_message}"

        except httpx.TimeoutException:
            logger.error("Gemini API request timed out.")
            raise TimeoutError("Gemini request timed out after 30 seconds.")
        except Exception as e:
            logger.error(f"Unexpected error communicating with Gemini API: {str(e)}", exc_info=True)
            raise e

    async def check_health(self) -> Dict[str, Any]:
        """Check if Gemini API key is valid and model endpoint exists."""
        if not self.api_key:
            return {"status": "missing_key", "model": self.model_name, "available": False}

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}?key={self.api_key}"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return {"status": "ready", "model": self.model_name, "available": True}
                elif res.status_code in (400, 401, 403):
                    return {"status": "invalid_key", "model": self.model_name, "available": False}
                else:
                    return {"status": f"http_{res.status_code}", "model": self.model_name, "available": False}
        except Exception as e:
            return {"status": "unreachable", "model": self.model_name, "available": False, "error": str(e)}


# Alias as requested
GeminiProvider = GeminiAIProvider
