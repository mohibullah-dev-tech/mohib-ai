"""Mohib AI (Friday) - FastAPI Main Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router
from app.api.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("mohib_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for backend startup and shutdown."""
    logger.info("Initializing Friday AI backend...")
    logger.info(f"Host: {settings.BACKEND_HOST}, Port: {settings.BACKEND_PORT}")
    logger.info(f"Active AI Provider: {settings.AI_PROVIDER}")
    logger.info(f"Allowed CORS Origins: {settings.cors_origins}")
    yield
    logger.info("Shutting down Friday AI backend gracefully.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API services for Mohib AI personal assistant (Friday).",
    lifespan=lifespan,
)

# Configure CORS for local development with Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    """Welcome endpoint for Mohib AI Friday backend."""
    return {
        "message": "Welcome to Mohib AI! Friday backend is running.",
        "assistant": "Friday",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "chat_endpoint": "/api/chat",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
