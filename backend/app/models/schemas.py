"""Pydantic schemas for request and response models."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    """Health check endpoint response schema."""

    status: str = Field(default="healthy", description="Current health status")
    assistant: str = Field(default="Friday", description="Assistant name")
    version: str = Field(default="0.3.5", description="Backend API version")
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
    version: str = "0.3.5"
    status: str = "online"
    features: List[str] = [
        "health-monitoring",
        "zero-cost-first-architecture",
        "bangla-english-ready",
        "permission-safe-design",
        "multi-provider-ai-router",
        "gemini-and-openai-support",
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
    preferred_provider: Optional[str] = Field(
        default=None,
        description="Explicit provider override: 'auto', 'gemini', or 'openai'",
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
    provider: str = Field(..., description="Active AI provider used (e.g. 'gemini', 'openai', 'mock')")
    model: str = Field(..., description="Model identifier used")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Response generation timestamp",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation identifier",
    )
    routing_mode: Optional[str] = Field(
        default="auto",
        description="Routing mode used ('auto', 'gemini', 'openai', 'mock')",
    )


class ProviderInfo(BaseModel):
    """Metadata for an individual provider."""

    provider: str
    configured: bool
    model: str
    status: str
    tier: str
    cost_estimate: str


class ProviderStatusResponse(BaseModel):
    """Status summary of all AI providers."""

    active_mode: str
    providers: Dict[str, ProviderInfo]
