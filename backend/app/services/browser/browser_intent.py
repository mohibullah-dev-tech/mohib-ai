"""Browser Natural Language & Voice Commands Dispatcher.

Handles:
- Open YouTube / Google / Portfolios / Public URLs
- Search Google for topics (e.g. React tutorials)
- Take page screenshots
- Inspect website design & responsive layouts
- Close or stop browser sessions
"""

import re
import urllib.parse
from typing import Optional, Tuple
from app.services.browser.playwright_service import playwright_browser
from app.services.browser.website_inspector import website_inspector
from app.services.browser.safety_guard import browser_safety_guard, BrowserSecurityError


class BrowserIntentDispatcher:
    """Parses user prompts for browser automation tasks."""

    def is_bangla(self, text: str) -> bool:
        """Detect Bangla characters or Banglish keywords."""
        bangla_chars = any("\u0980" <= ch <= "\u09FF" for ch in text)
        if bangla_chars:
            return True
        banglish_tokens = {"open", "koro", "dekhao", "browser", "khulo", "chalao", "bondho"}
        words = set(re.findall(r"\w+", text.lower()))
        return len(words.intersection(banglish_tokens)) >= 2

    async def handle(self, message: str) -> Optional[Tuple[str, str, str]]:
        """Evaluate message for browser automation intents.

        Returns (reply_text, provider_name, model_name) or None if not an intent.
        """
        msg = message.strip()
        msg_lower = msg.lower()
        bangla_lang = self.is_bangla(msg)

        # 1. Close / Stop Browser
        if (
            ("close browser" in msg_lower or "stop browser" in msg_lower or "ব্রাউজার বন্ধ করো" in msg)
            or ("browser" in msg_lower and ("close" in msg_lower or "stop" in msg_lower or "bondho" in msg_lower))
        ):
            await playwright_browser.close_session()
            if bangla_lang:
                return "🌐 ব্রাউজার সেশন সফলভাবে বন্ধ এবং রিসোর্স মুক্ত করা হয়েছে।", "browser-agent", "playwright-v1"
            return "🌐 Browser session closed successfully.", "browser-agent", "playwright-v1"

        # 2. Inspect Website
        inspect_keywords = [
            "inspect website", "inspect this website", "website inspection",
            "ওয়েবসাইট ইন্সপেক্ট", "ওয়েবসাইটের ডিজাইন ব্যাখ্যা", "analyze website",
            "website design", "inspect page"
        ]
        if any(k in msg_lower for k in inspect_keywords):
            return await self._handle_inspect_website(bangla_lang)

        # 3. Take Screenshot
        screenshot_keywords = [
            "take a screenshot", "take screenshot", "capture screenshot", "screenshot of this page",
            "স্ক্রিনশট নাও", "ওয়েবসাইটের স্ক্রিনশট", "পেজ স্ক্রিনশট", "screenshot nao"
        ]
        if any(k in msg_lower for k in screenshot_keywords):
            return await self._handle_screenshot(bangla_lang)

        # 4. Search Google for [query]
        google_search_match = re.search(
            r"(?:search google for|search on google|google search|গুগলে সার্চ করো|google এ সার্চ করো)\s+(.+)",
            msg,
            re.IGNORECASE,
        )
        if google_search_match:
            search_query = google_search_match.group(1).strip()
            return await self._handle_google_search(search_query, bangla_lang)

        # 5. Open YouTube
        if "open youtube" in msg_lower or "ইউটিউব ওপেন করো" in msg or "youtube open" in msg_lower:
            return await self._handle_open_url("https://www.youtube.com", "YouTube", bangla_lang)

        # 6. Open Specific URL or Website
        url_match = re.search(r"(?:open|visit|go to|ব্রাউজ করো|ওপেন করো)\s+(?:website\s+|site\s+)?(https?://[^\s]+|[a-zA-Z0-9_\-\.]+\.(?:com|org|net|dev|io|tech|app|bd|edu|co)[^\s]*)", msg, re.IGNORECASE)
        if url_match:
            raw_url = url_match.group(1).strip()
            return await self._handle_open_url(raw_url, raw_url, bangla_lang)

        # 7. Open Portfolio
        if "portfolio" in msg_lower and ("open" in msg_lower or "dekhao" in msg_lower or "ওপেন" in msg):
            portfolio_url = "https://github.com/mohibullah-dev-tech"
            return await self._handle_open_url(portfolio_url, "Mohibullah Portfolio / GitHub", bangla_lang)

        return None

    async def _handle_open_url(self, target_url: str, name: str, bangla: bool) -> Tuple[str, str, str]:
        """Navigate to URL safely."""
        try:
            res = await playwright_browser.navigate_to(target_url)
            if bangla:
                reply = (
                    f"🌐 **{name} সফলভাবে ব্রাউজারে ওপেন করা হয়েছে!**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **পেজের শিরোনাম:** `{res.get('title')}`\n"
                    f"- **স্ট্যাটাস কোড:** `{res.get('status_code')}`\n\n"
                    "আপনি চাইলে এখন পেজের কন্টেন্ট পড়তে, স্ক্রিনশট নিতে বা পেজ ইন্সপেক্ট করতে বলতে পারেন।"
                )
            else:
                reply = (
                    f"🌐 **{name} opened successfully in browser!**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **Page Title:** `{res.get('title')}`\n"
                    f"- **HTTP Status:** `{res.get('status_code')}`\n\n"
                    "You can now ask me to read content, take a screenshot, or inspect responsive design!"
                )
            return reply, "browser-agent", "playwright-v1"
        except BrowserSecurityError as e:
            return f"🛡️ **নিরাপত্তা বিধিনিষেধ:** {e}" if bangla else f"🛡️ **Security Restriction:** {e}", "browser-agent", "security"
        except Exception as e:
            return f"❌ ব্রাউজার এরর: {e}" if bangla else f"❌ Browser Navigation Error: {e}", "browser-agent", "error"

    async def _handle_google_search(self, query: str, bangla: bool) -> Tuple[str, str, str]:
        """Execute Google search via browser automation."""
        encoded = urllib.parse.quote_plus(query)
        search_url = f"https://www.google.com/search?q={encoded}"
        return await self._handle_open_url(search_url, f"Google Search for '{query}'", bangla)

    async def _handle_screenshot(self, bangla: bool) -> Tuple[str, str, str]:
        """Capture live screenshot of active browser page."""
        try:
            res = await playwright_browser.capture_screenshot()
            if bangla:
                reply = (
                    f"📸 **স্ক্রিনশট সফলভাবে ক্যাপচার করা হয়েছে!**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **শিরোনাম:** `{res.get('title')}`\n\n"
                    "স্ক্রিনশটটি Friday ড্যাশবোর্ডের **Browser Control** প্যানেলে লাইভ প্রিভিউ আকারে উপলব্ধ।"
                )
            else:
                reply = (
                    f"📸 **Screenshot captured successfully!**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **Page Title:** `{res.get('title')}`\n\n"
                    "The live preview is available in Friday's **Browser Control** dashboard."
                )
            return reply, "browser-agent", "playwright-v1"
        except Exception as e:
            return f"❌ স্ক্রিনশট ক্যাপচার ব্যর্থ: {e}" if bangla else f"❌ Screenshot capture failed: {e}", "browser-agent", "error"

    async def _handle_inspect_website(self, bangla: bool) -> Tuple[str, str, str]:
        """Perform responsive & accessibility inspection."""
        try:
            res = await website_inspector.inspect_website()
            structure = res.get("structure", {})
            headings = structure.get("headings", {})

            if bangla:
                reply = (
                    f"🔍 **ওয়েবসাইট রেসপনসিভ ও ডিজাইন ইন্সপেকশন (`{res.get('title')}`):**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **প্রধান হেডিং (H1):** `{headings.get('h1', ['কোনো H1 নেই'])[0] if headings.get('h1') else 'নেই'}`\n"
                    f"- **মোট বাটন:** {structure.get('buttonsCount')}টি | **লিংক:** {structure.get('linksCount')}টি | **ফর্ম:** {structure.get('formsCount')}টি\n"
                    f"- **রেসপনসিভ ভিউপোর্ট:** Desktop (1280x800), Tablet (768x1024), Mobile (375x667) পরীক্ষা করা হয়েছে।\n\n"
                    f"📌 **পর্যবেক্ষণ ও পরামর্শ:**\n"
                )
                for sug in res.get("suggestions_bn", [])[:4]:
                    reply += f"• {sug}\n"
            else:
                reply = (
                    f"🔍 **Website Responsive & UI Inspection (`{res.get('title')}`):**\n\n"
                    f"- **URL:** `{res.get('url')}`\n"
                    f"- **H1 Heading:** `{headings.get('h1', ['None'])[0] if headings.get('h1') else 'None'}`\n"
                    f"- **Total Buttons:** {structure.get('buttonsCount')} | **Links:** {structure.get('linksCount')} | **Forms:** {structure.get('formsCount')}\n"
                    f"- **Responsive Viewports:** Desktop (1280x800), Tablet (768x1024), Mobile (375x667) audited.\n\n"
                    f"📌 **Suggestions & Findings:**\n"
                )
                for sug in res.get("suggestions_en", [])[:4]:
                    reply += f"• {sug}\n"

            return reply, "browser-agent", "playwright-v1"
        except Exception as e:
            return f"❌ ওয়েবসাইট ইন্সপেকশন ত্রুটি: {e}" if bangla else f"❌ Website inspection error: {e}", "browser-agent", "error"


browser_intent_dispatcher = BrowserIntentDispatcher()

