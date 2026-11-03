"""API routes for Safe Browser Automation Agent (Playwright)."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import (
    BrowserNavigateRequest,
    BrowserClickRequest,
    BrowserFillRequest,
    BrowserScrollRequest,
    BrowserInspectRequest,
)
from app.services.browser import (
    playwright_browser,
    website_inspector,
    browser_safety_guard,
    BrowserSecurityError,
)

logger = logging.getLogger("mohib_ai.api.browser")

router = APIRouter(prefix="/browser", tags=["Browser Automation"])


@router.get("/status")
def get_browser_status():
    """Get status overview of active browser automation session."""
    return playwright_browser.get_status()


@router.post("/launch")
async def launch_browser(headless: bool = Query(default=True)):
    """Start or restart a controlled browser session."""
    try:
        return await playwright_browser.start_session(headless=headless)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/close")
async def close_browser():
    """Close active browser session and release memory."""
    try:
        return await playwright_browser.close_session()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/navigate")
async def navigate_to(payload: BrowserNavigateRequest):
    """Navigate to a sanitized webpage URL."""
    try:
        return await playwright_browser.navigate_to(payload.url)
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/content")
async def get_page_content(max_length: int = Query(default=8000)):
    """Read visible text content and structure from the active page."""
    try:
        return await playwright_browser.get_page_content(max_length=max_length)
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/elements")
async def get_interactive_elements():
    """Extract interactive buttons, navigation links, and inputs."""
    try:
        return await playwright_browser.extract_interactive_elements()
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/screenshot")
async def capture_screenshot(full_page: bool = Query(default=False)):
    """Capture live page screenshot and return base64 encoded image."""
    try:
        return await playwright_browser.capture_screenshot(full_page=full_page)
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/click")
async def click_element(payload: BrowserClickRequest):
    """Click an element. If high risk (e.g. submit/purchase), generates approval request."""
    try:
        return await playwright_browser.click_element(
            selector=payload.selector,
            description=payload.description or "",
            force_approval=payload.force_approval or False,
        )
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/fill")
async def fill_input(payload: BrowserFillRequest):
    """Fill text into an input field (credentials strictly rejected)."""
    try:
        return await playwright_browser.fill_input(
            selector=payload.selector,
            text=payload.text,
        )
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/scroll")
async def scroll_page(payload: BrowserScrollRequest):
    """Scroll active page in specified direction."""
    try:
        return await playwright_browser.scroll_page(
            direction=payload.direction or "down",
            amount=payload.amount or 500,
        )
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/stop")
def stop_automation():
    """Immediately halt ongoing browser actions."""
    return playwright_browser.stop_automation()


@router.post("/inspect")
async def inspect_website(payload: Optional[BrowserInspectRequest] = None):
    """Perform responsive multi-viewport analysis and accessibility audit."""
    target_url = payload.url if payload else None
    try:
        return await website_inspector.inspect_website(target_url=target_url)
    except BrowserSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/history")
def get_browser_history():
    """Get audit trail of recent browser actions."""
    return playwright_browser.get_action_history()
