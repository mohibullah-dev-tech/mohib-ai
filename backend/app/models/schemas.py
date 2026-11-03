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


# --- Safe Windows Computer Control Schemas (Milestone 4) ---

class AddAllowedDirRequest(BaseModel):
    """Request to add a permitted directory."""

    path: str = Field(..., description="Absolute path of directory to allow")


class ActionRequestPayload(BaseModel):
    """Request to initiate a protected computer action requiring approval."""

    action_name: str = Field(..., description="'create_file', 'modify_file', 'delete_path', 'execute_command'")
    target: str = Field(..., description="Target file path or command string")
    content: Optional[str] = Field(default=None, description="Content for file write/modify operations")
    command: Optional[str] = Field(default=None, description="Command to execute")
    cwd: Optional[str] = Field(default=None, description="Working directory for command execution")
    explanation: Optional[str] = Field(default=None, description="Human-readable explanation of why action is needed")


class ActionDecisionPayload(BaseModel):
    """Decision response when rejecting an approval request."""

    reason: Optional[str] = Field(default="Rejected by user", description="Reason for rejection")


class InspectProjectPayload(BaseModel):
    """Request payload to inspect a project directory."""

    project_path: Optional[str] = Field(default=None, description="Project path to inspect (defaults to primary allowed dir)")


# --- Safe Browser Automation Agent Schemas (Milestone 5) ---

class BrowserNavigateRequest(BaseModel):
    """Request payload to navigate browser to a URL."""

    url: str = Field(..., description="Target webpage URL to visit")


class BrowserClickRequest(BaseModel):
    """Request payload to click an interactive element."""

    selector: str = Field(..., description="CSS or text selector of element to click")
    description: Optional[str] = Field(default="", description="Descriptive text of target element")
    force_approval: Optional[bool] = Field(default=False, description="Require user approval before clicking")


class BrowserFillRequest(BaseModel):
    """Request payload to fill a text field."""

    selector: str = Field(..., description="Selector of input field")
    text: str = Field(..., description="Text content to enter")


class BrowserScrollRequest(BaseModel):
    """Request payload to scroll the active page."""

    direction: Optional[str] = Field(default="down", description="'down' or 'up'")
    amount: Optional[int] = Field(default=500, description="Pixel amount to scroll")


class BrowserInspectRequest(BaseModel):
    """Request payload to run website inspection."""

    url: Optional[str] = Field(default=None, description="Optional target URL (defaults to active page)")
