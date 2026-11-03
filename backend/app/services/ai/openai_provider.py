"""OpenAI API Provider implementation via lightweight async HTTP."""

import logging
from typing import List, Dict, Any
import httpx
from app.services.ai.base import AIProviderInterface
from app.models.schemas import ChatMessage
from app.core.config import get_fresh_settings

logger = logging.getLogger("mohib_ai.openai")


class OpenAIProvider(AIProviderInterface):
    """Production cloud provider utilizing OpenAI Chat Completions API."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        clean_model = model_name.strip()
        # Cost reference for gpt-4o-mini: $0.15 / 1M input, $0.60 / 1M output
        super().__init__(
            provider_name="openai",
            model_name=clean_model,
            input_cost_per_m=0.15 if "mini" in clean_model else 2.50,
            output_cost_per_m=0.60 if "mini" in clean_model else 10.00,
        )
        self.api_key = api_key.strip()
        self.endpoint_url = "https://api.openai.com/v1/chat/completions"

    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Send chat payload to OpenAI and return assistant content."""
        current_settings = get_fresh_settings()

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": current_settings.FRIDAY_SYSTEM_PROMPT}
        ]

        # Limit history
        trimmed_history = history[-current_settings.MAX_HISTORY_MESSAGES :]

        for msg in trimmed_history:
            role = "user" if msg.role == "user" else "assistant"
            content_text = msg.content.strip()
            if content_text:
                messages.append({"role": role, "content": content_text})

        # Append current user prompt
        messages.append({"role": "user", "content": message.strip()})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
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
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"].get("content", "").strip()
                    return "Friday received an empty response from OpenAI."

                status_code = response.status_code
                error_body = response.text
                logger.error(f"OpenAI API error ({status_code}): {error_body[:200]}")

                if status_code in (401, 403):
                    return (
                        "⚠️ **[Friday OpenAI Authentication Error]**\n\n"
                        "আপনার `OPENAI_API_KEY` টি সঠিক নয় বা অবৈধ।\n"
                        "দয়া করে [OpenAI Platform](https://platform.openai.com/api-keys) থেকে একটি বৈধ API Key নিয়ে "
                        "আপনার `.env` ফাইলে আপডেট করুন।"
                    )
                elif status_code == 429:
                    return (
                        "⏳ **[Friday OpenAI Rate Limit / Quota]**\n\n"
                        "OpenAI API-এর রিকোয়েস্ট কোটা শেষ হয়েছে বা রেট লিমিট অতিক্রম করেছে। "
                        "দয়া করে কিছুক্ষণ অপেক্ষা করুন বা আপনার OpenAI অ্যাকাউন্টের ব্যালেন্স চেক করুন।"
                    )
                else:
                    return f"⚠️ **[Friday OpenAI Error - Status {status_code}]**\n\n{error_body[:200]}"

        except httpx.TimeoutException:
            logger.error("OpenAI API request timed out.")
            raise TimeoutError("OpenAI request timed out after 30 seconds.")
        except Exception as e:
            logger.error(f"Unexpected error communicating with OpenAI: {str(e)}", exc_info=True)
            raise e

    async def check_health(self) -> Dict[str, Any]:
        """Check if OpenAI API key is valid and endpoint is reachable."""
        if not self.api_key:
            return {"status": "missing_key", "model": self.model_name, "available": False}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                # Lightweight call to list models or test a tiny ping
                res = await client.get("https://api.openai.com/v1/models", headers=headers)
                if res.status_code == 200:
                    return {"status": "ready", "model": self.model_name, "available": True}
                elif res.status_code in (401, 403):
                    return {"status": "invalid_key", "model": self.model_name, "available": False}
                else:
                    return {"status": f"http_{res.status_code}", "model": self.model_name, "available": False}
        except Exception as e:
            return {"status": "unreachable", "model": self.model_name, "available": False, "error": str(e)}
