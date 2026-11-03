"""Unit and integration tests for Friday AI Chat API endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_endpoint_basic():
    """Verify standard POST /api/chat returns a valid response."""
    payload = {
        "message": "Hello Friday, can you hear me?",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Friday" in data["reply"]
    assert data["provider"] in ["mock", "gemini"]
    assert "model" in data
    assert "timestamp" in data


def test_chat_endpoint_bangla():
    """Verify POST /api/chat handles Bangla text and replies in Bangla."""
    payload = {
        "message": "তুমি কে?",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ফ্রাইডে" in data["reply"] or "Friday" in data["reply"]


def test_chat_endpoint_conversation_history():
    """Verify POST /api/chat accepts conversation context history."""
    payload = {
        "message": "Can you elaborate more?",
        "history": [
            {"role": "user", "content": "Tell me about Next.js"},
            {"role": "assistant", "content": "Next.js is a React framework for building full-stack web applications."},
        ],
        "conversation_id": "test-session-123",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == "test-session-123"
    assert "reply" in data


def test_chat_endpoint_validation_empty_message():
    """Verify empty message triggers 422 unprocessable entity."""
    payload = {
        "message": "   ",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 422


def test_chat_endpoint_validation_message_too_long():
    """Verify payload exceeding 4000 characters is rejected with 422."""
    payload = {
        "message": "a" * 4001,
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 422


def test_root_includes_chat_endpoint():
    """Verify that the root endpoint advertises the chat endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("chat_endpoint") == "/api/chat"
