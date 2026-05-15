from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AIProviderConfig(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    default_model: str
    timeout: int = 120
    max_retries: int = 3


class AICompletionRequest(BaseModel):
    model: str
    prompt: str
    system: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 500
    stream: bool = False


class AICompletionResponse(BaseModel):
    text: str
    model: str
    usage: Optional[Dict[str, int]] = None
    done: bool = True


class AIProvider(ABC):
    @abstractmethod
    async def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        pass

    @abstractmethod
    async def list_models(self) -> List[str]:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass