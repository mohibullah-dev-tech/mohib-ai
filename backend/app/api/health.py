"""Health check and status API routes."""

import sys
import platform
from fastapi import APIRouter
from app.models.schemas import HealthResponse, AssistantInfoResponse
from app.core.config import settings

router = APIRouter(tags=["Health & Status"])


@router.get("/health", response_model=HealthResponse)
async def check_health() -> HealthResponse:
    """Check health and operational status of the Friday backend service."""
    return HealthResponse(
        status="healthy",
        assistant="Friday",
        version=settings.APP_VERSION,
        details={
            "environment": settings.ENVIRONMENT,
            "python_version": sys.version.split(" ")[0],
            "os": platform.system(),
            "platform_release": platform.release(),
        },
    )


@router.get("/info", response_model=AssistantInfoResponse)
async def get_assistant_info() -> AssistantInfoResponse:
    """Retrieve metadata about the Friday AI assistant."""
    return AssistantInfoResponse(
        name="Mohib AI",
        assistant_name="Friday",
        version=settings.APP_VERSION,
        status="online",
    )

