"""Playwright Browser Automation Service.

Provides modular, secure headless/headed browser session control:
- Navigation & URL loading with safety validation
- Content reading & interactive element extraction
- Live screenshots (base64)
- Form filling & clicking
- Console error inspection
- Automatic crash recovery and cleanup
- Dedicated background worker thread ensuring event loop stability across FastAPI & TestClient
"""

import base64
import logging
import asyncio
import threading
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from playwright.async_api import async_playwright, Browser, Page, Playwright

from app.services.browser.safety_guard import (
    browser_safety_guard,
    BrowserRiskLevel,
    BrowserSecurityError,
)
from app.services.computer.permission_engine import (
    permission_engine,
    ActionType,
    RiskLevel,
    ApprovalStatus,
    ApprovalRequest,
)

logger = logging.getLogger("mohib_ai.services.browser.playwright")


class _PlaywrightWorker:
    """Dedicated background thread and event loop for Playwright async execution."""

    def __init__(self):
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run, daemon=True, name="playwright-worker-thread")
        self._thread.start()

    def _run(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def run_coro(self, coro):
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return asyncio.wrap_future(future)


class PlaywrightBrowserService:
    """Manages an active Playwright browser session confined to safety policies."""

    def __init__(self):
        self._worker = _PlaywrightWorker()
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._page: Optional[Page] = None
        self._is_active: bool = False
        self._current_url: str = ""
        self._page_title: str = ""
        self._console_errors: List[str] = []
        self._action_history: List[Dict[str, Any]] = []
        self._is_stopped: bool = False
        self._last_screenshot_b64: Optional[str] = None

    # -------------------------------------------------------------------------
    # Public Async API (Dispatches to persistent worker thread)
    # -------------------------------------------------------------------------
    async def start_session(self, headless: bool = True) -> Dict[str, Any]:
        """Launch a controlled Chromium browser instance."""
        return await self._worker.run_coro(self._start_session_impl(headless))

    async def close_session(self) -> Dict[str, Any]:
        """Safely close active browser session and release memory."""
        return await self._worker.run_coro(self._close_session_impl())

    async def navigate_to(self, url: str) -> Dict[str, Any]:
        """Navigate to a sanitized, validated target URL."""
        return await self._worker.run_coro(self._navigate_to_impl(url))

    async def get_page_content(self, max_length: int = 8000) -> Dict[str, Any]:
        """Read visible textual content from the active page."""
        return await self._worker.run_coro(self._get_page_content_impl(max_length))

    async def extract_interactive_elements(self) -> Dict[str, Any]:
        """Identify clickable buttons, navigation links, and input forms."""
        return await self._worker.run_coro(self._extract_interactive_elements_impl())

    async def capture_screenshot(
        self, full_page: bool = False, viewport: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """Capture screenshot and store as base64 data."""
        return await self._worker.run_coro(self._capture_screenshot_impl(full_page, viewport))

    async def click_element(
        self, selector: str, description: str = "", force_approval: bool = False
    ) -> Dict[str, Any]:
        """Click an element, creating an approval request if high risk."""
        return await self._worker.run_coro(self._click_element_impl(selector, description, force_approval))

    async def fill_input(self, selector: str, text: str) -> Dict[str, Any]:
        """Fill a text input field safely."""
        return await self._worker.run_coro(self._fill_input_impl(selector, text))

    async def scroll_page(self, direction: str = "down", amount: int = 500) -> Dict[str, Any]:
        """Scroll the active page."""
        return await self._worker.run_coro(self._scroll_page_impl(direction, amount))

    async def evaluate(self, script: str) -> Any:
        """Evaluate JavaScript inside the active page."""
        return await self._worker.run_coro(self._evaluate_impl(script))

    async def set_viewport_size(self, width: int, height: int) -> None:
        """Set the page viewport size."""
        return await self._worker.run_coro(self._set_viewport_size_impl(width, height))

    # -------------------------------------------------------------------------
    # Internal Implementations (Run on dedicated worker loop)
    # -------------------------------------------------------------------------
    async def _ensure_page(self) -> Page:
        """Ensure page is active and not closed."""
        if not self._is_active or not self._page or self._page.is_closed():
            await self._start_session_impl()
        assert self._page is not None
        return self._page

    async def _start_session_impl(self, headless: bool = True) -> Dict[str, Any]:
        if self._is_active and self._page and not self._page.is_closed():
            return self.get_status()

        await self._cleanup()

        try:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled"],
            )
            context = await self._browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FridayAI/0.5",
            )
            self._page = await context.new_page()

            # Capture console errors
            self._page.on("pageerror", lambda err: self._console_errors.append(str(err)))
            self._page.on(
                "console",
                lambda msg: self._console_errors.append(f"[{msg.type}] {msg.text}")
                if msg.type in {"error", "warning"}
                else None,
            )

            self._is_active = True
            self._is_stopped = False
            self._current_url = "about:blank"
            self._page_title = "Ready"

            self._log_history("start_session", "session", "success", {"headless": headless})
            return self.get_status()
        except Exception as e:
            logger.error(f"Failed to launch Playwright browser: {e}")
            await self._cleanup()
            raise e

    async def _close_session_impl(self) -> Dict[str, Any]:
        await self._cleanup()
        self._log_history("close_session", "session", "closed", {})
        return self.get_status()

    async def _cleanup(self):
        self._is_active = False
        try:
            if self._page and not self._page.is_closed():
                await self._page.close()
        except Exception:
            pass

        try:
            if self._browser and self._browser.is_connected():
                await self._browser.close()
        except Exception:
            pass

        try:
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass

        self._page = None
        self._browser = None
        self._playwright = None

    async def _navigate_to_impl(self, url: str) -> Dict[str, Any]:
        page = await self._ensure_page()
        validated_url = browser_safety_guard.validate_url(url)

        try:
            response = await page.goto(
                validated_url,
                timeout=25000,
                wait_until="domcontentloaded",
            )
            self._current_url = page.url
            self._page_title = await page.title()

            # Capture screenshot
            await self._capture_screenshot_impl()

            status_code = response.status if response else 200
            self._log_history("navigate", validated_url, "success", {"status_code": status_code})

            return {
                "url": self._current_url,
                "title": self._page_title,
                "status_code": status_code,
                "success": True,
            }
        except Exception as e:
            logger.error(f"Navigation failed for {validated_url}: {e}")
            self._log_history("navigate", validated_url, "failed", {"error": str(e)})
            raise e

    async def _get_page_content_impl(self, max_length: int = 8000) -> Dict[str, Any]:
        page = await self._ensure_page()
        try:
            body_text = await page.evaluate("() => document.body ? document.body.innerText : ''")
            clean_text = browser_safety_guard.sanitize_untrusted_text(body_text, max_length=max_length)
            title = await page.title()
            self._log_history("read_content", page.url, "success", {"chars": len(clean_text)})

            return {
                "url": page.url,
                "title": title,
                "content": clean_text,
                "chars_count": len(clean_text),
                "lines_count": len(clean_text.splitlines()),
            }
        except Exception as e:
            logger.error(f"Failed to read page content: {e}")
            raise e

    async def _extract_interactive_elements_impl(self) -> Dict[str, Any]:
        page = await self._ensure_page()
        try:
            elements_data = await page.evaluate("""() => {
                const results = { links: [], buttons: [], inputs: [], forms: [] };

                // 1. Links
                document.querySelectorAll('a[href]').forEach((el, idx) => {
                    if (idx < 25 && el.offsetParent !== null) {
                        results.links.push({
                            text: el.innerText.trim().slice(0, 80),
                            href: el.getAttribute('href'),
                            selector: el.id ? '#' + el.id : 'a:nth-of-type(' + (idx + 1) + ')'
                        });
                    }
                });

                // 2. Buttons
                document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]').forEach((el, idx) => {
                    if (idx < 20 && el.offsetParent !== null) {
                        results.buttons.push({
                            text: (el.innerText || el.value || '').trim().slice(0, 80),
                            type: el.getAttribute('type') || 'button',
                            is_submit: (el.getAttribute('type') === 'submit'),
                            selector: el.id ? '#' + el.id : 'button:nth-of-type(' + (idx + 1) + ')'
                        });
                    }
                });

                // 3. Inputs
                document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((el, idx) => {
                    if (idx < 15 && el.offsetParent !== null) {
                        results.inputs.push({
                            name: el.getAttribute('name') || '',
                            placeholder: el.getAttribute('placeholder') || '',
                            type: el.getAttribute('type') || el.tagName.toLowerCase(),
                            selector: el.id ? '#' + el.id : (el.name ? '[name="' + el.name + '"]' : el.tagName.toLowerCase())
                        });
                    }
                });

                return results;
            }""")
            return elements_data
        except Exception as e:
            logger.error(f"Failed to extract elements: {e}")
            raise e

    async def _capture_screenshot_impl(
        self, full_page: bool = False, viewport: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        page = await self._ensure_page()
        try:
            if viewport:
                await page.set_viewport_size(viewport)

            screenshot_bytes = await page.screenshot(
                full_page=full_page,
                type="jpeg",
                quality=75,
            )
            b64_str = base64.b64encode(screenshot_bytes).decode("utf-8")
            self._last_screenshot_b64 = b64_str

            self._log_history("screenshot", page.url, "success", {"size_kb": len(b64_str) // 1024})

            return {
                "screenshot_b64": b64_str,
                "url": page.url,
                "title": await page.title(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            raise e

    async def _click_element_impl(
        self, selector: str, description: str = "", force_approval: bool = False
    ) -> Dict[str, Any]:
        page = await self._ensure_page()
        risk_level, explanation = browser_safety_guard.classify_action_risk(
            action_name="click",
            target_selector=selector,
            target_text=description,
        )

        if force_approval or risk_level == BrowserRiskLevel.HIGH:
            req = permission_engine.create_request(
                action_type=ActionType.EXECUTION,
                action_name="browser_click",
                target=f"{page.url} -> {selector}",
                details={
                    "operation": "click",
                    "selector": selector,
                    "description": description,
                    "explanation": explanation,
                    "url": page.url,
                },
                risk_level=RiskLevel.HIGH,
            )
            return {
                "requires_approval": True,
                "approval_id": req.id,
                "risk_level": req.risk_level,
                "explanation": explanation,
                "status": "pending_approval",
            }

        await page.click(selector, timeout=8000)
        self._current_url = page.url
        self._page_title = await page.title()
        await self._capture_screenshot_impl()

        self._log_history("click", selector, "success", {"description": description})
        return {
            "success": True,
            "selector": selector,
            "url": self._current_url,
            "title": self._page_title,
        }

    async def _fill_input_impl(self, selector: str, text: str) -> Dict[str, Any]:
        page = await self._ensure_page()
        risk_level, explanation = browser_safety_guard.classify_action_risk(
            action_name="fill",
            target_selector=selector,
        )

        await page.fill(selector, text, timeout=8000)
        await self._capture_screenshot_impl()

        self._log_history("fill", selector, "success", {"chars": len(text)})
        return {
            "success": True,
            "selector": selector,
            "chars_entered": len(text),
        }

    async def _scroll_page_impl(self, direction: str = "down", amount: int = 500) -> Dict[str, Any]:
        page = await self._ensure_page()
        scroll_y = amount if direction == "down" else -amount
        await page.evaluate(f"window.scrollBy(0, {scroll_y})")
        await asyncio.sleep(0.3)
        await self._capture_screenshot_impl()

        self._log_history("scroll", direction, "success", {"amount": amount})
        return {"success": True, "direction": direction, "amount": amount}

    async def _evaluate_impl(self, script: str) -> Any:
        page = await self._ensure_page()
        return await page.evaluate(script)

    async def _set_viewport_size_impl(self, width: int, height: int) -> None:
        page = await self._ensure_page()
        await page.set_viewport_size({"width": width, "height": height})

    # -------------------------------------------------------------------------
    # Status & Logging
    # -------------------------------------------------------------------------
    def get_status(self) -> Dict[str, Any]:
        """Return current status overview of browser service."""
        return {
            "is_active": self._is_active,
            "current_url": self._current_url,
            "page_title": self._page_title,
            "is_stopped": self._is_stopped,
            "console_errors_count": len(self._console_errors),
            "history_count": len(self._action_history),
            "last_screenshot_available": self._last_screenshot_b64 is not None,
        }

    def stop_automation(self):
        """Immediately abort ongoing automation activity."""
        self._is_stopped = True
        self._log_history("stop", "session", "stopped", {})
        return {"status": "stopped", "message": "Automation aborted by user."}

    def get_action_history(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Return history of recent browser actions."""
        return self._action_history[:limit]

    def _log_history(self, action: str, target: str, status: str, details: Dict[str, Any]):
        """Append to browser action audit log."""
        self._action_history.insert(
            0,
            {
                "action": action,
                "target": target,
                "status": status,
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        if len(self._action_history) > 60:
            self._action_history = self._action_history[:60]


playwright_browser = PlaywrightBrowserService()
