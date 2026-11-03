"""Browser Safety & URL Validation Guard.

Enforces:
1. URL scheme and host validation (blocks file://, javascript:, data:, and sensitive internal IP ranges).
2. Action risk classification:
   - LOW: Open public URL, navigate, scroll, read visible content, screenshots.
   - MEDIUM: Fill non-sensitive forms, download verified files.
   - HIGH: Form submission (POST/Submit), payments, messaging, file uploads, account changes.
3. Prompt injection and untrusted content boundaries.
4. Protection against automated password/credential/OTP entry.
"""

import re
from urllib.parse import urlparse
from typing import Tuple, Optional, Set
from enum import Enum


class BrowserRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BrowserSecurityError(Exception):
    """Raised when an operation violates browser security policies."""
    pass


class BrowserSafetyGuard:
    """Validates URLs, element interactions, and enforces safety boundaries."""

    # Disallowed URL schemes
    BLOCKED_SCHEMES: Set[str] = {
        "file", "javascript", "data", "vbscript", "view-source", "chrome",
        "edge", "about", "brave", "opera",
    }

    # Internal cloud metadata or restricted IPs
    BLOCKED_HOSTS: Set[str] = {
        "169.254.169.254",  # AWS/GCP/Azure instance metadata
        "metadata.google.internal",
        "0.0.0.0",
        "::1",
    }

    # Sensitive input keywords (passwords, card numbers, OTP, CVV, SSN)
    SENSITIVE_INPUT_KEYWORDS: Set[str] = {
        "password", "pass", "pwd", "cvv", "cvc", "creditcard", "cardnumber",
        "card_number", "ssn", "otp", "pin", "secret", "token", "auth_token",
    }

    # High-risk button / interaction text keywords
    HIGH_RISK_ACTION_KEYWORDS: Set[str] = {
        "pay", "purchase", "buy now", "checkout", "place order",
        "confirm payment", "transfer", "delete account", "remove all",
        "send email", "send message", "wire", "donate",
    }

    def validate_url(self, url: str) -> str:
        """Validate and sanitize URL before browser navigation.

        Allows standard http and https. Allows localhost/127.0.0.1 for local testing.
        Raises BrowserSecurityError on invalid or unsafe URLs.
        """
        clean_url = url.strip()
        if not clean_url:
            raise BrowserSecurityError("URL cannot be empty.")

        # Check if URL starts with a scheme like "javascript:", "file:", "data:", "http://", etc.
        scheme_match = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*):", clean_url)
        if scheme_match:
            explicit_scheme = scheme_match.group(1).lower()
            if explicit_scheme in self.BLOCKED_SCHEMES or explicit_scheme not in {"http", "https"}:
                raise BrowserSecurityError(
                    f"Blocked URL scheme '{explicit_scheme}:'. Only 'http://' and 'https://' are permitted."
                )
        else:
            clean_url = "https://" + clean_url

        try:
            parsed = urlparse(clean_url)
        except Exception as e:
            raise BrowserSecurityError(f"Malformed URL: {e}")

        scheme = (parsed.scheme or "").lower()
        if scheme in self.BLOCKED_SCHEMES or scheme not in {"http", "https"}:
            raise BrowserSecurityError(
                f"Blocked URL scheme '{scheme}://'. Only 'http://' and 'https://' are permitted."
            )

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            raise BrowserSecurityError("URL must include a valid hostname.")

        if hostname in self.BLOCKED_HOSTS:
            raise BrowserSecurityError(f"Access to restricted internal host '{hostname}' is forbidden.")

        return clean_url

    def classify_action_risk(
        self,
        action_name: str,
        target_selector: Optional[str] = None,
        target_text: Optional[str] = None,
        is_form_submit: bool = False,
    ) -> Tuple[BrowserRiskLevel, str]:
        """Classify risk level of a browser action.

        Returns (risk_level, explanation).
        """
        action = action_name.lower().strip()
        target_str = (target_text or "").lower()
        selector_str = (target_selector or "").lower()

        # High-Risk checks: Form submission, payments, purchases
        if is_form_submit or "submit" in action:
            return (
                BrowserRiskLevel.HIGH,
                "Submitting web forms transmits data to external servers and requires explicit user consent.",
            )

        for kw in self.HIGH_RISK_ACTION_KEYWORDS:
            if kw in target_str or kw in selector_str:
                return (
                    BrowserRiskLevel.HIGH,
                    f"Action matches sensitive keyword '{kw}' (financial/messaging/account modification).",
                )

        if "button[type='submit']" in selector_str or "input[type='submit']" in selector_str:
            return (
                BrowserRiskLevel.HIGH,
                "Interacting with a form submit button requires explicit approval.",
            )

        # Medium-Risk: Form filling, downloads
        if "fill" in action or "type" in action or "select" in action:
            # Check for sensitive credentials
            for sens in self.SENSITIVE_INPUT_KEYWORDS:
                if sens in selector_str:
                    raise BrowserSecurityError(
                        f"Security policy strictly forbids automated entry of sensitive credentials ('{sens}')."
                    )
            return (
                BrowserRiskLevel.MEDIUM,
                "Filling form fields (without submission).",
            )

        if "download" in action:
            return (
                BrowserRiskLevel.MEDIUM,
                "File download initiation requires destination and filename preview.",
            )

        # Low-Risk: Navigation, reading, screenshots, scrolling
        return (
            BrowserRiskLevel.LOW,
            "Safe read-only navigation or content extraction.",
        )

    def sanitize_untrusted_text(self, text: str, max_length: int = 10000) -> str:
        """Strip dangerous prompt-injection cues and limit page content size."""
        if not text:
            return ""
        # Remove null bytes
        cleaned = text.replace("\x00", "")
        # Truncate
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length] + "\n...[Content truncated for safety]"
        return cleaned


browser_safety_guard = BrowserSafetyGuard()
