"""Chat coordination service handling user messages and multi-provider AI routing."""

import logging
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai.router import ai_router
from app.services.computer import computer_intent_dispatcher
from app.services.browser import browser_intent_dispatcher

logger = logging.getLogger("mohib_ai.chat_service")


class ChatService:
    """Service orchestrating chat request validation, context handling, and router execution."""

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Process incoming chat request dynamically routing to Browser, Local Agent, Gemini, OpenAI, or Mock."""
        logger.info(
            f"Processing chat request. Mode: [{request.preferred_provider or 'auto'}], "
            f"Message length: {len(request.message)}, History turns: {len(request.history)}"
        )

        try:
            # 1. Evaluate if user issued a direct local computer control command
            agent_result = computer_intent_dispatcher.handle(request.message)
            if agent_result is not None:
                reply_text, provider_name, model_name = agent_result
                return ChatResponse(
                    reply=reply_text,
                    provider=provider_name,
                    model=model_name,
                    conversation_id=request.conversation_id,
                    routing_mode="local_agent",
                )

            # 2. Evaluate if user issued a browser automation command
            browser_result = await browser_intent_dispatcher.handle(request.message)
            if browser_result is not None:
                reply_text, provider_name, model_name = browser_result
                return ChatResponse(
                    reply=reply_text,
                    provider=provider_name,
                    model=model_name,
                    conversation_id=request.conversation_id,
                    routing_mode="browser_agent",
                )

            # 3. Otherwise delegate generation to intelligent AIRouter
            reply_text, provider_name, model_name = await ai_router.route_and_generate(
                message=request.message,
                history=request.history,
                requested_mode=request.preferred_provider,
            )

            return ChatResponse(
                reply=reply_text,
                provider=provider_name,
                model=model_name,
                conversation_id=request.conversation_id,
                routing_mode=request.preferred_provider or "auto",
            )
        except Exception as e:
            logger.error(f"Error during AI routing & generation: {str(e)}", exc_info=True)
            return ChatResponse(
                reply=(
                    "Friday encountered an unexpected error processing your request. "
                    "Please try again or check backend logs."
                ),
                provider="error",
                model="none",
                conversation_id=request.conversation_id,
                routing_mode=request.preferred_provider or "auto",
            )


chat_service = ChatService()
