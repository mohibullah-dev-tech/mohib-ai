"""Tests for Multi-Provider AI Router, Health Service, and Fallback logic."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_providers_status_endpoint():
    """Verify GET /api/providers/status reports status for all providers."""
    response = client.get("/api/providers/status")
    assert response.status_code == 200
    data = response.json()
    assert "active_mode" in data
    assert "providers" in data
    assert "gemini" in data["providers"]
    assert "openai" in data["providers"]
    assert "mock" in data["providers"]
    assert data["providers"]["mock"]["status"] == "ready"


def test_providers_benchmark_endpoint():
    """Verify GET /api/providers/benchmark returns structured benchmark metrics."""
    response = client.get("/api/providers/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "prompts_tested" in data
    assert "routing_guidelines" in data
    assert "providers_evaluated" in data
    assert "mock" in data["providers_evaluated"]
    assert data["providers_evaluated"]["mock"]["average_latency_ms"] >= 0


def test_router_auto_mode():
    """Verify POST /api/chat with preferred_provider='auto' routes without error."""
    payload = {
        "message": "Hello Friday, test auto router",
        "history": [],
        "preferred_provider": "auto",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["routing_mode"] == "auto"


def test_router_explicit_gemini_without_key():
    """Verify strict GEMINI mode never silently switches to OpenAI when key missing."""
    payload = {
        "message": "Hello",
        "history": [],
        "preferred_provider": "gemini",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "gemini-unconfigured" in data["provider"] or "gemini" in data["provider"]
    assert "GEMINI_API_KEY" in data["reply"]


def test_router_explicit_openai_without_key():
    """Verify strict OPENAI mode never silently switches to Gemini when key missing."""
    payload = {
        "message": "Hello",
        "history": [],
        "preferred_provider": "openai",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "openai-unconfigured" in data["provider"] or "openai" in data["provider"]
    assert "OPENAI_API_KEY" in data["reply"]
