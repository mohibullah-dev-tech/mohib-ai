"""Mock/Demo AI Provider for offline, zero-cost, and testable development."""

import re
from typing import List
from app.services.ai.base import BaseAIProvider
from app.models.schemas import ChatMessage


def is_bangla_script(text: str) -> bool:
    """Check if the string contains Bengali Unicode characters."""
    return bool(re.search(r"[\u0980-\u09FF]", text))


def is_banglish_or_bangla(text: str) -> bool:
    """Detect if input is Bengali script or Romanized Banglish."""
    if is_bangla_script(text):
        return True
    lower = text.lower()
    banglish_signals = [
        "tumi", "amake", "ceno", "cheno", "chino", "amar", "naam", "nam", "ki",
        "kemon", "acho", "achhen", "koro", "korbo", "chai", "shekhao", "shikhao",
        "banabo", "toiri", "bhalo", "valo", "shuncho", "bolo", "rekhechi", "rekhecho",
        "korte", "parbo", "pari"
    ]
    words = re.findall(r"\b\w+\b", lower)
    match_count = sum(1 for w in words if w in banglish_signals)
    return match_count >= 1


class MockAIProvider(BaseAIProvider):
    """Zero-cost mock AI engine implementing Friday's core personality and logic.

    Designed to handle Bengali script, Banglish, and English with rich context-aware answers.
    """

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
        is_bangla = is_banglish_or_bangla(user_msg)

        # -------------------------------------------------------------
        # 1. Identity & Recognition: "তুমি কি আমাকে চিনতে পারো?", "আমি তোমার নাম কী রেখেছি?"
        # -------------------------------------------------------------
        if any(w in lower_msg for w in ["chinte", "ceno", "cheno", "chino", "recognize", "know me", "চিনতে", "চেনো", "চিনো", "আমাকে চেন"]):
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "হ্যাঁ মহিব! আমি অবশ্যই আপনাকে চিনতে পারছি। আপনি আমার নির্মাতা ও ডেভেলপার—**মোঃ মহিবুল্লাহ (Mohibullah)**।\n\n"
                "আমি আপনার ব্যক্তিগত ডেস্কটপ এআই অ্যাসিস্ট্যান্ট **ফ্রাইডে (Friday)**। "
                "আমি আপনার ভয়েস ও টেক্সট কমান্ড শুনে কোডিং, ডিবাগিং, সফটওয়্যার আর্কিটেকচার এবং প্রতিদিনের কাজে সাহায্য করতে সদা প্রস্তুত!"
            )

        if any(w in lower_msg for w in ["tomar naam", "amar naam", "your name", "named you", "নাম কী", "নাম কি", "নাম রেখেছি"]):
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "আপনি আমার নাম রেখেছেন **ফ্রাইডে (Friday)**! "
                "মার্ভেলের আয়রন ম্যানের বিখ্যাত এআই সহকারীর মতো আমিও সর্বদা আপনার পাশে থেকে সাহায্য করার লক্ষ্য নিয়ে তৈরি। "
                "আর আপনার নাম **মহিবুল্লাহ (Mohib)**।"
            )

        if any(w in lower_msg for w in ["who are you", "what are you", "তুমি কে", "কে তুমি"]):
            if is_bangla:
                return (
                    "**[Friday Demo Mode — Offline Brain]**\n\n"
                    "আমি **ফ্রাইডে (Friday)**, আপনার ব্যক্তিগত এআই ডেস্কটপ অ্যাসিস্ট্যান্ট!\n"
                    "মহিবুল্লার জন্য বিশেষ সুরক্ষাবিধি এবং বাংলা ও ইংরেজি উভয় ভাষার বোধগম্যতা নিয়ে আমাকে তৈরি করা হয়েছে। "
                    "আমি কোডিং, সিস্টেম ডিজাইন ও নানা কাজে আপনাকে সাহায্য করি।"
                )
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "I am **Friday**, your personal AI desktop assistant! "
                "I am built specifically for Mohib with strict local security, bilingual (Bangla & English) understanding, "
                "and full-stack engineering assistance."
            )

        # -------------------------------------------------------------
        # 2. JavaScript Teaching: "আজকে আমাকে JavaScript শেখাও"
        # -------------------------------------------------------------
        if ("javascript" in lower_msg or "জাভাস্ক্রিপ্ট" in lower_msg or "js" in lower_msg.split()) and any(
            w in lower_msg for w in ["shekhao", "shikhao", "learn", "teach", "শেখাও", "শিখাও", "কী", "কি", "জানাও", "সম্পর্কে", "code", "শুরু"]
        ):
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "নিশ্চয়ই মহিব! চলুন আজ আমরা **JavaScript (JS)**-এর মূল ভিত্তিগুলো এক নজরে শিখে ফেলি:\n\n"
                "### ১. ভ্যারিয়েবল ডিক্লেয়ারেশন (Variables)\n"
                "আধুনিক জাভাস্ক্রিপ্টে ডেটা সংরক্ষণ করতে `const` এবং `let` ব্যবহার করা হয়:\n"
                "```javascript\n"
                "const assistantName = 'Friday'; // মান অপরিবর্তনীয়\n"
                "let activeUsers = 1;             // মান পরিবর্তনশীল\n"
                "```\n\n"
                "### ২. ফাংশন (Functions)\n"
                "যেকোনো কাজ পুনরায় ব্যবহারযোগ্য করতে ফাংশন লিখি:\n"
                "```javascript\n"
                "function greet(name) {\n"
                "  return `হ্যালো ${name}, ফ্রাইডে প্রস্তুত!`;\n"
                "}\n"
                "console.log(greet('মহিব'));\n"
                "```\n\n"
                "### ৩. অ্যারে এবং অবজেক্ট (Data Structures)\n"
                "```javascript\n"
                "const stack = ['Next.js', 'FastAPI', 'Tailwind'];\n"
                "const assistant = { name: 'Friday', version: '0.2' };\n"
                "```\n\n"
                "**অনুশীলনী:** আপনি কি কোনো নির্দিষ্ট টপিক (যেমন DOM Manipulation, Async/Await, বা React) দেখতে চান?"
            )

        # -------------------------------------------------------------
        # 3. Website Creation Roadmap: "আমি একটা ওয়েবসাইট তৈরি করতে চাই"
        # -------------------------------------------------------------
        if any(w in lower_msg for w in ["website", "ওয়েবসাইট", "ওয়েবসাইট", "সাইট"]) and any(
            w in lower_msg for w in ["toiri", "banabo", "build", "create", "make", "তৈরি", "বানাতে", "বানাবো", "চাই"]
        ):
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "একটি আধুনিক ও প্রফেশনাল ওয়েবসাইট তৈরি করতে মূলত ৩টি ধাপ অনুসরণ করতে হয়:\n\n"
                "### ধাপ ১: ফ্রন্টএন্ড (Frontend — যা ইউজাররা দেখে)\n"
                "- **টেকনোলজি:** HTML5, CSS3/Tailwind CSS, JavaScript (React / Next.js)।\n"
                "- আমাদের প্রজেক্টে আমরা ইতিমধ্যে **Next.js 16 + Tailwind CSS** ব্যবহার করছি, যা অত্যন্ত দ্রুত ও রেসপনসিভ।\n\n"
                "### ধাপ ২: ব্যাকএন্ড (Backend — সার্ভার ও বিজনেস লজিক)\n"
                "- **টেকনোলজি:** Python (FastAPI) অথবা Node.js (Express)।\n"
                "- আমাদের প্রজেক্টের ব্যাকএন্ড **FastAPI**-তে তৈরি, যা টাইপ-নিরাপদ এবং এআই সার্ভিসের জন্য আদর্শ।\n\n"
                "### ধাপ ৩: ডাটাবেস ও হোস্টিং\n"
                "- **ডাটাবেস:** SQLite (শুরুর জন্য), PostgreSQL বা Supabase।\n"
                "- **ফ্রি ডিপ্লয়মেন্ট:** Vercel (Next.js ফ্রন্টএন্ডের জন্য) এবং Render / Railway (FastAPI ব্যাকএন্ডের জন্য)।\n\n"
                "আপনি কোন ধরনের ওয়েবসাইট তৈরি করতে চান—ব্যক্তিগত পোর্টফোলিও, ই-কমার্স, নাকি কোনো এআই অ্যাপ?"
            )

        # -------------------------------------------------------------
        # 4. Frontend vs Backend: "What is the difference between frontend and backend?"
        # -------------------------------------------------------------
        if "frontend" in lower_msg and "backend" in lower_msg and any(w in lower_msg for w in ["difference", "parthokko", "vs", "compare", "পার্থক্য"]):
            if is_bangla:
                return (
                    "**[Friday Demo Mode — Offline Brain]**\n\n"
                    "### ফ্রন্টএন্ড (Frontend) বনাম ব্যাকএন্ড (Backend)-এর পার্থক্য:\n\n"
                    "| বৈশিষ্ট্য | ফ্রন্টএন্ড (Client-Side) | ব্যাকএন্ড (Server-Side) |\n"
                    "| :--- | :--- | :--- |\n"
                    "| **সংজ্ঞা** | ওয়েবসাইটের যে অংশটি ব্যবহারকারী সরাসরি দেখতে ও স্পর্শ করতে পারে। | পেছনের অদৃশ্য অংশ, যা ডেটা প্রসেসিং ও নিরাপত্তা নিশ্চিত করে। |\n"
                    "| **কোথায় চলে?** | ইউজারের ওয়েব ব্রাউজারে (Chrome, Edge ইত্যাদি)। | দূরবর্তী সার্ভারে বা লোকাল হোস্টে (`127.0.0.1`)। |\n"
                    "| **প্রধান টেকনোলজি** | HTML, CSS, JavaScript, React, Next.js, Tailwind। | Python (FastAPI), Node.js, Go, Databases (SQL/NoSQL)। |\n"
                    "| **আমাদের প্রজেক্টে** | `frontend/` ফোল্ডারে থাকা Next.js চ্যাট ও ভয়েস UI। | `backend/` ফোল্ডারে থাকা FastAPI ও এআই সার্ভিস। |\n\n"
                    "সহজ কথায়: ফ্রন্টএন্ড হলো রেস্তোরাঁর **ডাইনিং টেবিল ও মেনু**, আর ব্যাকএন্ড হলো ভেতরের **রান্নাঘর (Kitchen)**!"
                )
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "### Key Differences Between Frontend and Backend:\n\n"
                "| Aspect | Frontend (Client-Side) | Backend (Server-Side) |\n"
                "| :--- | :--- | :--- |\n"
                "| **Role** | The user-facing presentation layer that users see and interact with. | The engine room handling data processing, business logic, authentication, and security. |\n"
                "| **Runs on** | The user's web browser. | The server or local machine (`127.0.0.1:8000`). |\n"
                "| **Primary Stack** | HTML, CSS, JavaScript, TypeScript, Next.js, React, Tailwind CSS. | Python (FastAPI), Node.js, Go, PostgreSQL, SQLite. |\n"
                "| **In Mohib AI** | `frontend/` (Next.js dark UI, speech recognition & synthesis). | `backend/` (FastAPI AI brain, route validation, health endpoints). |\n\n"
                "**Analogy:** If a web application is a car, the frontend is the steering wheel and dashboard, while the backend is the engine and transmission."
            )

        # -------------------------------------------------------------
        # 5. Follow-up Context Handling (Checking Prior Conversation)
        # -------------------------------------------------------------
        if history:
            last_assistant_msg = next((m.content.lower() for m in reversed(history) if m.role == "assistant"), "")
            last_user_msg = next((m.content.lower() for m in reversed(history) if m.role == "user"), "")

            # If prior discussion was about JavaScript
            if "javascript" in last_assistant_msg or "javascript" in last_user_msg or "জাভাস্ক্রিপ্ট" in last_user_msg:
                if any(w in lower_msg for w in ["more", "aro", "kibhabe", "how", "example", "আরও", "উদাহরণ", "বিস্তারিত"]):
                    return (
                        "**[Friday Demo Mode — Offline Brain]**\n\n"
                        "জাভাস্ক্রিপ্টের ধারাবাহিকতায় চলুন **Async/Await** এবং API কল দেখে নিই:\n\n"
                        "```javascript\n"
                        "async function fetchFridayStatus() {\n"
                        "  try {\n"
                        "    const res = await fetch('http://127.0.0.1:8000/api/health');\n"
                        "    const data = await res.json();\n"
                        "    console.log('Friday Status:', data.status);\n"
                        "  } catch (error) {\n"
                        "    console.error('Connection failed:', error);\n"
                        "  }\n"
                        "}\n"
                        "```\n"
                        "এটি ব্যাকএন্ড থেকে ডেটা আনতে সবচেয়ে জনপ্রিয় আধুনিক উপায়।"
                    )

            # If prior discussion was about website
            if "website" in last_assistant_msg or "ওয়েবসাইট" in last_assistant_msg or "ওয়েবসাইট" in last_assistant_msg:
                if any(w in lower_msg for w in ["step", "first", "suru", "how", "শুরু", "কীভাবে"]):
                    return (
                        "**[Friday Demo Mode — Offline Brain]**\n\n"
                        "ওয়েবসাইট তৈরির প্রথম পদক্ষেপ হিসেবে:\n"
                        "1. আপনার কম্পিউটারে VS Code খুলুন।\n"
                        "2. একটি নতুন ফোল্ডার তৈরি করুন।\n"
                        "3. `index.html` ফাইল তৈরি করে আপনার প্রথম পেইজটি লিখে ব্রাউজারে ওপেন করুন!\n"
                        "প্রয়োজনে আমি আপনাকে সম্পূর্ণ কোড লিখে দিচ্ছি।"
                    )

        # -------------------------------------------------------------
        # 6. Greetings & General Fallback (Intelligent, Non-Echoing)
        # -------------------------------------------------------------
        if any(w in lower_msg for w in ["hi", "hello", "hey", "salam", "assalamu alaikum", "হাই", "হ্যালো", "সালাম", "কেমন আছো", "কেমন আছেন"]):
            if is_bangla:
                return (
                    "**[Friday Demo Mode — Offline Brain]**\n\n"
                    "হ্যালো মহিব! ওয়ালাইকুমুস সালাম / কেমন আছেন? ফ্রাইডে আপনার সেবায় প্রস্তুত। "
                    "আজ আমরা কি নিয়ে কাজ করব—পাইথন ব্যাকএন্ড, নেক্সট.জেএস ফ্রন্টএন্ড, নাকি কোনো নতুন কোডিং প্রশ্ন?"
                )
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                "Hello Mohib! Friday is online and ready. "
                "How can I assist you with your coding, debugging, or full-stack project today?"
            )

        # Natural intelligent response for any other query
        if is_bangla:
            return (
                "**[Friday Demo Mode — Offline Brain]**\n\n"
                f"মহিব, আপনার বার্তাটি পেয়েছি: *\"{user_msg}\"*।\n\n"
                "আমি ফ্রাইডে—আপনার ব্যক্তিগত সহকারী। বর্তমানে আমি অফলাইন ডেমো ইঞ্জিনে চলছি। "
                "সীমাহীন কৃত্রিম বুদ্ধিমত্তা সক্রিয় করতে `.env` ফাইলে আপনার ফ্রি `GEMINI_API_KEY` যুক্ত করতে পারেন!\n"
                "আপনি চাইলে আমাকে JavaScript, Python, ওয়েবসাইট তৈরি বা ফ্রন্টএন্ড/ব্যাকএন্ড সম্পর্কে জিজ্ঞাসা করতে পারেন।"
            )

        return (
            "**[Friday Demo Mode — Offline Brain]**\n\n"
            f"Mohib, I received your query: *\"{user_msg}\"*.\n\n"
            "As Friday, I am currently operating on the offline Demo Engine. "
            "To unlock full cloud AI intelligence, configure `GEMINI_API_KEY` in your `.env` file.\n"
            "You can ask me technical questions regarding JavaScript, Python, Next.js, FastAPI, or system architecture!"
        )
