"""Pydantic schemas for request and response models."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check endpoint response schema."""

    status: str = Field(default="healthy", description="Current health status")
    assistant: str = Field(default="Friday", description="Assistant name")
    version: str = Field(default="0.1.0", description="Backend API version")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current UTC timestamp"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional health diagnostics or environment status"
    )


class AssistantInfoResponse(BaseModel):
    """Information about Friday assistant backend service."""

    name: str = "Mohib AI"
    assistant_name: str = "Friday"
    version: str = "0.1.0"
    status: str = "online"
    features: list[str] = [
        "health-monitoring",
        "zero-cost-first-architecture",
        "bangla-english-ready",
        "permission-safe-design"
    ]

