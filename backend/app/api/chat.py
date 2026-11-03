"""API endpoint for Friday AI Chat."""

import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

logger = logging.getLogger("mohib_ai.api.chat")

router = APIRouter(prefix="/chat", tags=["Friday Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Send message to Friday AI and receive a response",
)
async def send_chat_message(request: ChatRequest) -> ChatResponse:
    """Send a user message with optional conversation history to Friday AI.

    - **message**: User query text (1 to 4000 characters).
    - **history**: Prior conversation messages for context continuity.
    - **conversation_id**: Optional identifier.
    """
    try:
        response = await chat_service.process_chat(request)
        return response
    except ValueError as ve:
        logger.warning(f"Validation error in chat request: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Unexpected error in /api/chat: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Friday internal server error during chat processing.",
        )
