"""Abstract base interface for AI model providers."""

from abc import ABC, abstractmethod
from typing import List
from app.models.schemas import ChatMessage


class BaseAIProvider(ABC):
    """Abstract interface defining required behavior for any AI backend."""

    def __init__(self, provider_name: str, model_name: str):
        self.provider_name = provider_name
        self.model_name = model_name

    @abstractmethod
    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Generate a response given user input and prior conversation history.

        Args:
            message: Current user query string.
            history: List of previous conversation turns.

        Returns:
            The assistant's generated textual reply.
        """
        pass

