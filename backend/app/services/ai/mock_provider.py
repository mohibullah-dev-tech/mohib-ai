"""Mock/Demo AI Provider for offline, zero-cost, and testable development."""

import re
from typing import List
from app.services.ai.base import BaseAIProvider
from app.models.schemas import ChatMessage


def is_bangla_text(text: str) -> bool:
    """Check if the string contains Bengali Unicode characters."""
    return bool(re.search(r"[\u0980-\u09FF]", text))


class MockAIProvider(BaseAIProvider):
    """Zero-cost mock AI engine implementing Friday's core personality and logic."""

    def __init__(self, model_name: str = "friday-demo-v1"):
        super().__init__(provider_name="mock", model_name=model_name)

    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Return a helpful, personality-aligned response in Bangla or English."""
        user_msg = message.strip()
        lower_msg = user_msg.lower()
        bangla_detected = is_bangla_text(user_msg)

        # 1. Identity & Who are you
        if any(w in lower_msg for w in ["who are you", "your name", "what are you"]) or any(
            w in user_msg for w in ["তুমি কে", "তোমার নাম", "কে তুমি"]
        ):
            if bangla_detected:
                return (
                    "**[Friday Demo Brain]**\n\n"
                    "আমি **ফ্রাইডে (Friday)**, আপনার ব্যক্তিগত এআই ডেস্কটপ অ্যাসিস্ট্যান্ট! "
                    "মহিবুল্লার জন্য বিশেষ সুরক্ষাবিধি এবং বাংলা-ইংরেজি উভয় ভাষা সমর্থনের সাথে আমাকে তৈরি করা হয়েছে।\n\n"
                    "আমি আপনাকে কোডিং, ওয়েব ডেভেলপমেন্ট, বাগ ফিক্সিং এবং নিত্যদিনের নানা কাজে সাহায্য করতে পারি।"
                )
            return (
                "**[Friday Demo Brain]**\n\n"
                "I am **Friday**, your personal AI desktop assistant! "
                "I am built specifically for Mohib with strict local security, bilingual (Bangla & English) understanding, "
                "and assistance for software development, debugging, and everyday tasks."
            )

        # 2. Greetings
        if any(w in lower_msg for w in ["hi", "hello", "hey", "good morning", "good evening", "assalamu alaikum", "salam"]) or any(
            w in user_msg for w in ["হাই", "হ্যালো", "কেমন আছো", "সালাম", "কেমন আছেন"]
        ):
            if bangla_detected:
                return (
                    "**[Friday Demo Brain]**\n\n"
                    "হ্যালো মহিব! ওয়ালাইকুমুস সালাম / কেমন আছেন? ফ্রাইডে আপনার সেবায় প্রস্তুত। "
                    "আজ আমরা কি নিয়ে কাজ করব—পাইথন ব্যাকএন্ড, নেক্সট.জেএস ফ্রন্টএন্ড, নাকি কোনো নতুন ফিচার?"
                )
            return (
                "**[Friday Demo Brain]**\n\n"
                "Hello Mohib! Friday is online and ready. "
                "What would you like to build or discuss today? I'm ready to assist with coding, debugging, or planning!"
            )

        # 3. Capabilities / What can you do
        if any(w in lower_msg for w in ["what can you do", "features", "capabilities", "help me"]) or any(
            w in user_msg for w in ["তুমি কি করতে পার", "কি সাহায্য", "ফিচার"]
        ):
            if bangla_detected:
                return (
                    "**[Friday Demo Brain]**\n\n"
                    "আমি যেসব কাজে সাহায্য করতে পারি:\n"
                    "1. **কোডিং ও ডেভেলপমেন্ট:** Python, FastAPI, Next.js, React, TypeScript কোড লেখা ও পর্যালোচনা।\n"
                    "2. **বাগ ও ডিবাগিং:** কোডের ভুল ত্রুটি খুঁজে সমাধান বের করা।\n"
                    "3. **দ্বিভাষিক কথোপকথন:** বাংলা ও ইংরেজি উভয় ভাষায় সহজ ও প্রাঞ্জল আলোচনা।\n"
                    "4. **নিরাপদ স্থাপত্য:** অনুমতি ছাড়া আমি কোনো ফাইল এডিট বা টার্মিনাল কমান্ড চালাই না।\n\n"
                    "*(নোট: সম্পূর্ণ ক্লাউড এলএলএম যুক্ত করতে `.env` ফাইলে আপনার API কি কনফিগার করতে পারেন)*"
                )
            return (
                "**[Friday Demo Brain]**\n\n"
                "Here is what I can help you with:\n"
                "- **Software Development:** Full-stack guidance across Python, FastAPI, Next.js, TypeScript, and Tailwind CSS.\n"
                "- **Debugging:** Finding errors, fixing syntax issues, and performance optimizations.\n"
                "- **Bilingual Communication:** Fluent responses in Bangla and English.\n"
                "- **Security Guardrails:** I never execute commands or alter files without explicit approval.\n\n"
                "*(Note: You can configure a cloud model like Gemini in `.env` whenever you wish)*"
            )

        # 4. Coding / Technical queries
        if any(w in lower_msg for w in ["fastapi", "nextjs", "next.js", "python", "react", "code", "typescript", "bug", "git"]):
            if bangla_detected:
                return (
                    f"**[Friday Demo Brain]**\n\n"
                    f"আপনার টেকনিক্যাল প্রশ্নটি পেয়েছি: `{user_msg}`।\n\n"
                    f"আমাদের বর্তমান স্ট্যাক:\n"
                    f"- **Backend:** FastAPI (Python 3.13) — দ্রুত এবং টাইপ-নিরাপদ API।\n"
                    f"- **Frontend:** Next.js (App Router, Tailwind CSS, TypeScript) — আধুনিক ও রেসপনসিভ UI।\n\n"
                    f"এ বিষয়ে আপনি নির্দিষ্ট কোনো কোড বা সমাধান দেখতে চাইলে আমাকে বলুন!"
                )
            return (
                f"**[Friday Demo Brain]**\n\n"
                f"I received your technical query: `{user_msg}`.\n\n"
                f"In our current Mohib AI architecture:\n"
                f"- **Backend:** FastAPI with modular Pydantic models and strict local binding (`127.0.0.1:8000`).\n"
                f"- **Frontend:** Next.js with React 19, TypeScript, and modern dark UI.\n\n"
                f"Let me know if you would like me to draft a specific code snippet or review a bug!"
            )

        # 5. Default Contextual Reply
        turn_count = len(history)
        if bangla_detected:
            return (
                f"**[Friday Demo Brain]**\n\n"
                f"আমি আপনার বার্তাটি পেয়েছি: *\"{user_msg}\"*। "
                f"(কথোপকথনের মোট ধাপ: {turn_count})\n\n"
                f"আমি ফ্রাইডে—আপনার ব্যক্তিগত অ্যাসিস্ট্যান্ট। ডেমো মোডে আমি নির্দিষ্ট প্যাটার্ন অনুযায়ী উত্তর দিই। "
                f"আপনি চাইলে `.env` ফাইলে `GEMINI_API_KEY` যুক্ত করে সরাসরি লাইভ ক্লাউড মডেল সক্রিয় করতে পারেন!"
            )
        return (
            f"**[Friday Demo Brain]**\n\n"
            f"I have received your message: *\"{user_msg}\"* (Conversation turn: {turn_count}).\n\n"
            f"As your personal assistant Friday, I am currently running on the local Demo Brain. "
            f"You can add a `GEMINI_API_KEY` in `.env` anytime to connect live cloud intelligence."
        )

