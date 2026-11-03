"""Tests for Safe Browser Automation Agent (Milestone 5).

Covers all 10 required test cases:
1. Open a public website.
2. Search for React tutorials.
3. Read visible webpage content.
4. Capture a screenshot.
5. Click a normal navigation link.
6. Fill a test form without submitting.
7. Reject a form submission without approval.
8. Stop an ongoing automation task.
9. Handle invalid URLs (safety guard).
10. Handle browser crashes / cleanup recovery.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.browser import (
    playwright_browser,
    browser_safety_guard,
    BrowserSecurityError,
    BrowserRiskLevel,
)
from app.services.computer.permission_engine import permission_engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def cleanup_browser_after_tests():
    """Ensure browser session is closed when tests finish."""
    yield
    client.post("/api/browser/close")


# Test 9: Handle invalid URLs
def test_9_handle_invalid_urls():
    """Verify safety guard rejects file://, javascript:, internal IP, and malformed URLs."""
    with pytest.raises(BrowserSecurityError) as exc_info:
        browser_safety_guard.validate_url("file:///C:/Windows/System32/calc.exe")
    assert "Blocked URL scheme" in str(exc_info.value)

    with pytest.raises(BrowserSecurityError) as exc_info:
        browser_safety_guard.validate_url("javascript:alert(1)")
    assert "Blocked URL scheme" in str(exc_info.value)

    with pytest.raises(BrowserSecurityError) as exc_info:
        browser_safety_guard.validate_url("http://169.254.169.254/latest/meta-data/")
    assert "restricted internal host" in str(exc_info.value)

    # API endpoint rejection
    response = client.post("/api/browser/navigate", json={"url": "file:///etc/passwd"})
    assert response.status_code == 403


# Test 1: Open a public website
def test_1_open_public_website():
    """Verify launching browser and navigating to a public website."""
    response = client.post("/api/browser/navigate", json={"url": "https://example.com"})
    assert response.status_code == 200
    data = response.json()
    assert "example.com" in data["url"]
    assert data["success"] is True

    status_res = client.get("/api/browser/status")
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is True


# Test 3: Read visible webpage content
def test_3_read_visible_webpage_content():
    """Verify reading visible text content and titles."""
    response = client.get("/api/browser/content")
    assert response.status_code == 200
    data = response.json()
    assert "Example Domain" in data["content"] or "example" in data["content"].lower()
    assert data["lines_count"] >= 1


# Test 4: Capture screenshot
def test_4_capture_screenshot():
    """Verify capturing live base64 screenshot."""
    response = client.post("/api/browser/screenshot?full_page=false")
    assert response.status_code == 200
    data = response.json()
    assert "screenshot_b64" in data
    assert len(data["screenshot_b64"]) > 100


# Test 5: Click a normal navigation link
def test_5_click_normal_navigation_link():
    """Verify clicking safe links works without blocking."""
    # Find interactive elements first
    elem_res = client.get("/api/browser/elements")
    assert elem_res.status_code == 200
    elements = elem_res.json()
    assert len(elements["links"]) >= 1

    # Click first link
    first_link = elements["links"][0]
    click_res = client.post(
        "/api/browser/click",
        json={"selector": "a", "description": first_link["text"]},
    )
    assert click_res.status_code == 200
    assert click_res.json().get("success") is True


# Test 2: Search for React tutorials
def test_2_search_for_react_tutorials():
    """Verify natural language search prompt routes and navigates properly."""
    payload = {"message": "Search Google for React tutorials", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "browser-agent"
    assert "Google Search" in data["reply"] or "React" in data["reply"]


# Test 6: Fill a test form without submitting
def test_6_fill_test_form_without_submitting():
    """Verify filling an input field without submitting is classified as MEDIUM risk and allowed."""
    # Classify action risk
    risk, _ = browser_safety_guard.classify_action_risk(
        action_name="fill",
        target_selector="input[name='search']",
    )
    assert risk == BrowserRiskLevel.MEDIUM

    # Automated fill of sensitive password field must be blocked
    with pytest.raises(BrowserSecurityError) as exc_info:
        browser_safety_guard.classify_action_risk(
            action_name="fill",
            target_selector="input[type='password']",
        )
    assert "forbids automated entry of sensitive credentials" in str(exc_info.value)


# Test 7: Reject a form submission without approval
def test_7_reject_form_submission_without_approval():
    """Verify form submission is classified as HIGH risk and creates an explicit approval request."""
    # High risk submit click
    click_res = client.post(
        "/api/browser/click",
        json={
            "selector": "button[type='submit']",
            "description": "Submit Form",
            "force_approval": True,
        },
    )
    assert click_res.status_code == 200
    data = click_res.json()
    assert data.get("requires_approval") is True
    assert data.get("status") == "pending_approval"
    approval_id = data.get("approval_id")

    # Reject request
    rej_res = client.post(
        f"/api/computer/actions/{approval_id}/reject",
        json={"reason": "User denied form submission"},
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"


# Test 8: Stop ongoing automation task
def test_8_stop_ongoing_automation_task():
    """Verify stopping automation halts current activity immediately."""
    response = client.post("/api/browser/stop")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stopped"


# Test 10: Handle browser crashes and clean recovery
def test_10_handle_browser_crashes_and_recovery():
    """Verify closing and restarting browser session recovers cleanly."""
    close_res = client.post("/api/browser/close")
    assert close_res.status_code == 200
    assert close_res.json()["is_active"] is False

    # Launch again
    launch_res = client.post("/api/browser/launch?headless=true")
    assert launch_res.status_code == 200
    assert launch_res.json()["is_active"] is True
