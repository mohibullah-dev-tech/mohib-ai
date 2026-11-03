"""Abstract base interface for AI model providers."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models.schemas import ChatMessage


class AIProviderInterface(ABC):
    """Standard interface defining required behavior for any AI backend."""

    def __init__(
        self,
        provider_name: str,
        model_name: str,
        input_cost_per_m: float = 0.0,
        output_cost_per_m: float = 0.0,
    ):
        self.provider_name = provider_name
        self.model_name = model_name
        self.input_cost_per_m = input_cost_per_m
        self.output_cost_per_m = output_cost_per_m

    @abstractmethod
    async def generate_reply(
        self,
        message: str,
        history: List[ChatMessage],
    ) -> str:
        """Generate a response given user input and prior conversation history."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Perform a quick lightweight health/connectivity check."""
        pass


# Backward compatibility alias
BaseAIProvider = AIProviderInterface
