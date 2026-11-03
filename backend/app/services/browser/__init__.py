"""Browser Automation Package."""

from app.services.browser.safety_guard import (
    browser_safety_guard,
    BrowserRiskLevel,
    BrowserSecurityError,
)
from app.services.browser.playwright_service import (
    playwright_browser,
    PlaywrightBrowserService,
)
from app.services.browser.website_inspector import (
    website_inspector,
    WebsiteInspector,
)
from app.services.browser.browser_intent import (
    browser_intent_dispatcher,
    BrowserIntentDispatcher,
)

__all__ = [
    "browser_safety_guard",
    "BrowserRiskLevel",
    "BrowserSecurityError",
    "playwright_browser",
    "PlaywrightBrowserService",
    "website_inspector",
    "WebsiteInspector",
    "browser_intent_dispatcher",
    "BrowserIntentDispatcher",
]

