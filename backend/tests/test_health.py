"""Unit and integration tests for backend health check endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that the root endpoint responds with a greeting and valid links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["assistant"] == "Friday"
    assert "/api/health" in data["health_check"]


def test_health_endpoint():
    """Verify health endpoint returns status healthy and expected metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["assistant"] == "Friday"
    assert "version" in data
    assert "timestamp" in data
    assert "details" in data
    assert "python_version" in data["details"]


def test_info_endpoint():
    """Verify info endpoint returns Friday metadata."""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Mohib AI"
    assert data["assistant_name"] == "Friday"
    assert data["status"] == "online"
    assert isinstance(data["features"], list)

