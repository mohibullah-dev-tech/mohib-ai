"""API routes for AI Providers status and benchmark results."""

import logging
from fastapi import APIRouter
from app.models.schemas import ProviderStatusResponse
from app.services.ai.health_service import provider_health_service
from app.services.ai.benchmark import benchmark_runner

logger = logging.getLogger("mohib_ai.api.providers")

router = APIRouter(prefix="/providers", tags=["AI Providers"])


@router.get("/status", response_model=ProviderStatusResponse)
async def get_provider_status() -> ProviderStatusResponse:
    """Retrieve connection status, models, and active mode of Gemini and OpenAI providers."""
    data = await provider_health_service.get_all_provider_statuses()
    return ProviderStatusResponse(**data)


@router.get("/benchmark")
async def run_provider_benchmark():
    """Run comparative benchmark suite evaluating latency, quality, and cost for Gemini vs OpenAI."""
    return await benchmark_runner.run_benchmark()
