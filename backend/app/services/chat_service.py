"""Chat coordination service handling user messages and AI provider delegation."""

import logging
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai.factory import get_ai_provider

logger = logging.getLogger("mohib_ai.chat_service")


class ChatService:
    """Service orchestrating chat request validation, context handling, and generation."""

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Process incoming chat request dynamically resolving active AI provider."""
        # Resolve provider dynamically per request so .env changes are detected instantly
        provider = get_ai_provider()

        logger.info(
            f"Processing chat request with provider [{provider.provider_name}]. "
            f"Message length: {len(request.message)}, History turns: {len(request.history)}"
        )

        try:
            # Delegate generation to provider
            reply_text = await provider.generate_reply(
                message=request.message,
                history=request.history,
            )

            return ChatResponse(
                reply=reply_text,
                provider=provider.provider_name,
                model=provider.model_name,
                conversation_id=request.conversation_id,
            )
        except Exception as e:
            logger.error(f"Error during AI generation: {str(e)}", exc_info=True)
            return ChatResponse(
                reply=(
                    "Friday encountered an unexpected error processing your request. "
                    "Please try again or check backend logs."
                ),
                provider=provider.provider_name,
                model=provider.model_name,
                conversation_id=request.conversation_id,
            )


chat_service = ChatService()
