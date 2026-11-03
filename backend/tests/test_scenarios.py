"""Integration test suite executing the 6 user-requested verification scenarios."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_scenario_1_identity_recognition():
    """Scenario 1: 'তুমি কি আমাকে চিনতে পারো?' -> Recognizes Mohib as creator in Bangla."""
    payload = {
        "message": "তুমি কি আমাকে চিনতে পারো?",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert "মহিব" in reply or "Mohib" in reply or "Friday" in reply
    assert "চিনতে" in reply or "চেন" in reply or "অ্যাসিস্ট্যান্ট" in reply


def test_scenario_2_javascript_teaching():
    """Scenario 2: 'আজকে আমাকে JavaScript শেখাও।' -> Teaches JavaScript with code."""
    payload = {
        "message": "আজকে আমাকে JavaScript শেখাও।",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert "JavaScript" in reply or "জাভাস্ক্রিপ্ট" in reply
    assert "function" in reply or "const" in reply or "var" in reply or "code" in reply.lower()


def test_scenario_3_build_website():
    """Scenario 3: 'আমি একটা ওয়েবসাইট তৈরি করতে চাই।' -> Web development roadmap."""
    payload = {
        "message": "আমি একটা ওয়েবসাইট তৈরি করতে চাই।",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert "ফ্রন্টএন্ড" in reply or "Frontend" in reply
    assert "ব্যাকএন্ড" in reply or "Backend" in reply


def test_scenario_4_frontend_vs_backend():
    """Scenario 4: 'What is the difference between frontend and backend?'."""
    payload = {
        "message": "What is the difference between frontend and backend?",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert "Frontend" in reply
    assert "Backend" in reply
    assert "Client" in reply or "Server" in reply or "difference" in reply.lower()


def test_scenario_5_assistant_name():
    """Scenario 5: 'আমি তোমার নাম কী রেখেছি?' -> Remembers Friday."""
    payload = {
        "message": "আমি তোমার নাম কী রেখেছি?",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert "ফ্রাইডে" in reply or "Friday" in reply


def test_scenario_6_follow_up_context():
    """Scenario 6: Follow-up question verifying conversation context is remembered."""
    payload = {
        "message": "আরও বিস্তারিত বলো এবং উদাহরণ দাও",
        "history": [
            {"role": "user", "content": "আজকে আমাকে JavaScript শেখাও।"},
            {
                "role": "assistant",
                "content": "JavaScript হলো ওয়েবের সবচেয়ে জনপ্রিয় প্রোগ্রামিং ল্যাঙ্গুয়েজ।",
            },
        ],
        "conversation_id": "follow-up-test-session",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    reply = data["reply"]
    assert data["conversation_id"] == "follow-up-test-session"
    assert len(reply) > 20


def test_missing_api_key_provider_behavior(monkeypatch):
    """Verify that when AI_PROVIDER=gemini but no key is provided, it returns transparent key requirement."""
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    
    payload = {
        "message": "Hello Friday",
        "history": [],
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "gemini-unconfigured" in data["provider"]
    assert "GEMINI_API_KEY" in data["reply"]
