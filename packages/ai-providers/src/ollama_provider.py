from typing import Optional, List, Dict, Any
import ollama
from .base import AIProvider, AIProviderConfig, AICompletionRequest, AICompletionResponse


class OllamaProvider(AIProvider):
    def __init__(self, config: AIProviderConfig):
        self.config = config
        self.client = ollama.Client(host=config.base_url)
        self.default_model = config.default_model

    async def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        try:
            response = self.client.generate(
                model=request.model or self.default_model,
                prompt=request.prompt,
                system=request.system,
                options={
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens,
                },
                stream=False,
            )
            return AICompletionResponse(
                text=response["response"],
                model=request.model or self.default_model,
                usage=None,
                done=True,
            )
        except Exception as e:
            return AICompletionResponse(
                text="",
                model=request.model or self.default_model,
                usage=None,
                done=True,
            )

    async def list_models(self) -> List[str]:
        try:
            models = self.client.list()
            return [m["name"] for m in models.get("models", [])]
        except Exception:
            return [self.default_model]

    async def health_check(self) -> bool:
        try:
            self.client.list()
            return True
        except Exception:
            return False

    async def pull_model(self, model: str) -> bool:
        try:
            self.client.pull(model)
            return True
        except Exception:
            return False


class OllamaProviderFactory:
    @staticmethod
    def create(base_url: str = "http://localhost:11434", default_model: str = "llama3.2") -> OllamaProvider:
        config = AIProviderConfig(
            base_url=base_url,
            default_model=default_model,
            timeout=120,
            max_retries=3,
        )
        return OllamaProvider(config)