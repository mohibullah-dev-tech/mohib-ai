"""Pydantic schemas for request and response models."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    """Health check endpoint response schema."""

    status: str = Field(default="healthy", description="Current health status")
    assistant: str = Field(default="Friday", description="Assistant name")
    version: str = Field(default="0.2.0", description="Backend API version")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current UTC timestamp",
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional health diagnostics or environment status",
    )


class AssistantInfoResponse(BaseModel):
    """Information about Friday assistant backend service."""

    name: str = "Mohib AI"
    assistant_name: str = "Friday"
    version: str = "0.2.0"
    status: str = "online"
    features: List[str] = [
        "health-monitoring",
        "zero-cost-first-architecture",
        "bangla-english-ready",
        "permission-safe-design",
        "ai-brain-chat",
    ]


class ChatMessage(BaseModel):
    """Individual message in a conversation."""

    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, max_length=4000)
    timestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ChatRequest(BaseModel):
    """Payload for POST /api/chat."""

    message: str = Field(..., min_length=1, max_length=4000, description="User prompt message")
    history: List[ChatMessage] = Field(
        default_factory=list,
        max_length=50,
        description="Previous conversation context messages",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional client conversation identifier",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_whitespace(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty or only whitespace")
        return cleaned


class ChatResponse(BaseModel):
    """Response returned by POST /api/chat."""

    reply: str = Field(..., description="Assistant reply content")
    provider: str = Field(..., description="Active AI provider (e.g. 'mock' or 'gemini')")
    model: str = Field(..., description="Model identifier used")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Response generation timestamp",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation identifier",
    )
