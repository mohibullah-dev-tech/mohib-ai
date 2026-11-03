"""Chat coordination service handling user messages and AI provider delegation."""

import logging
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai.factory import get_ai_provider

logger = logging.getLogger("mohib_ai.chat_service")


class ChatService:
    """Service orchestrating chat request validation, context handling, and generation."""

    def __init__(self):
        self.provider = get_ai_provider()

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Process incoming chat request and return formatted ChatResponse."""
        logger.info(
            f"Processing chat request. Message length: {len(request.message)}, "
            f"History turns: {len(request.history)}"
        )

        try:
            # Delegate generation to provider
            reply_text = await self.provider.generate_reply(
                message=request.message,
                history=request.history,
            )

            return ChatResponse(
                reply=reply_text,
                provider=self.provider.provider_name,
                model=self.provider.model_name,
                conversation_id=request.conversation_id,
            )
        except Exception as e:
            logger.error(f"Error during AI generation: {str(e)}", exc_info=True)
            return ChatResponse(
                reply=(
                    "Friday encountered an unexpected error processing your request. "
                    "Please try again or check backend logs."
                ),
                provider=self.provider.provider_name,
                model=self.provider.model_name,
                conversation_id=request.conversation_id,
            )


chat_service = ChatService()
