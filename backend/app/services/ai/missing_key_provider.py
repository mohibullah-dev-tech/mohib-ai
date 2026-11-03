"""Provider returned when a real AI provider is configured but missing required credentials."""

from typing import List
from app.services.ai.base import BaseAIProvider
from app.models.schemas import ChatMessage


class MissingApiKeyProvider(BaseAIProvider):
    """Explains to the user that credentials are required for the selected provider."""

    def __init__(self, provider_target: str = "gemini"):
        super().__init__(
            provider_name=f"{provider_target}-unconfigured",
            model_name="none",
        )
        self.provider_target = provider_target

    async def check_health(self) -> dict:
        return {
            "status": "missing_key",
            "model": self.model_name,
            "available": False,
            "provider_target": self.provider_target,
        }

    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        if self.provider_target == "openai":
            return (
                "⚠️ **[Friday AI — Real AI Provider Connection Required]**\n\n"
                "আপনি ক্লাউড এআই প্রোভাইডার হিসেবে **OpenAI** নির্বাচন করেছেন (`preferred_provider=openai`), "
                "কিন্তু আপনার `.env` ফাইলে এখনও কোনো `OPENAI_API_KEY` দেওয়া হয়নি।\n\n"
                "### 🔑 রিয়েল OpenAI সক্রিয় করার সহজ ৩টি ধাপ:\n"
                "1. **এপিআই কি নিন:** [OpenAI Platform (platform.openai.com/api-keys)](https://platform.openai.com/api-keys) এ গিয়ে নতুন API Key তৈরি করুন।\n"
                "2. **`.env` ফাইল খুলুন:** আপনার প্রজেক্টের রুট ফোল্ডারে থাকা `.env` ফাইলে নিচের লাইনটি লিখুন:\n"
                "   ```env\n"
                "   OPENAI_API_KEY=sk-...\n"
                "   OPENAI_MODEL=gpt-4o-mini\n"
                "   ```\n"
                "3. **সেভ করুন:** ফাইলটি সেভ করার সাথে সাথে ফ্রাইডে স্বয়ংক্রিয়ভাবে OpenAI মডেলের মাধ্যমে উত্তর দেবে।\n\n"
                "*(নোট: আপনি Google Gemini ব্যবহার করতে চাইলে `preferred_provider=gemini` এবং `GEMINI_API_KEY` ব্যবহার করতে পারেন, অথবা অফলাইনের জন্য `AI_PROVIDER=mock`)*"
            )
        return (
            "⚠️ **[Friday AI — Real AI Provider Connection Required]**\n\n"
            "আপনি ক্লাউড এআই প্রোভাইডার হিসেবে **Google Gemini** নির্বাচন করেছেন (`AI_PROVIDER=gemini`), "
            "কিন্তু আপনার `.env` ফাইলে এখনও কোনো `GEMINI_API_KEY` দেওয়া হয়নি।\n\n"
            "### 🔑 রিয়েল এআই সক্রিয় করার সহজ ৩টি ধাপ:\n"
            "1. **ফ্রি কি নিন:** [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/) এ গিয়ে **Get API Key** ক্লিক করুন (সম্পূর্ণ ফ্রি)।\n"
            "2. **`.env` ফাইল খুলুন:** আপনার প্রজেক্টের রুট ফোল্ডারে থাকা `.env` ফাইলে নিচের লাইনটি লিখুন:\n"
            "   ```env\n"
            "   AI_PROVIDER=gemini\n"
            "   GEMINI_API_KEY=your_actual_key_here\n"
            "   ```\n"
            "3. **সেভ করুন:** ফাইলটি সেভ করার সাথে সাথে ফ্রাইডে স্বয়ংক্রিয়ভাবে লাইভ জেমিনাই ক্লাউড মডেলের মাধ্যমে বুদ্ধিদীপ্ত উত্তর দেবে।\n\n"
            "*(নোট: আপনি যদি ইন্টারনেট বা এপিআই কি ছাড়া অফলাইনে চালাতে চান, তবে `.env` ফাইলে `AI_PROVIDER=mock` দিয়ে রাখতে পারেন)*"
        )
