from typing import Dict, Optional
from .base import AIProvider, AIProviderConfig, AICompletionRequest, AICompletionResponse
from .ollama_provider import OllamaProvider


class AIManager:
    def __init__(self):
        self._providers: Dict[str, AIProvider] = {}

    def register_provider(self, name: str, provider: AIProvider) -> None:
        self._providers[name] = provider

    def get_provider(self, name: str = "ollama") -> Optional[AIProvider]:
        return self._providers.get(name)

    def get_default_provider(self) -> Optional[AIProvider]:
        if self._providers:
            return next(iter(self._providers.values()))
        return None

    async def complete(self, prompt: str, provider_name: str = "ollama", **kwargs) -> AICompletionResponse:
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Provider '{provider_name}' not found")
        request = AICompletionRequest(prompt=prompt, **kwargs)
        return await provider.complete(request)

    async def personalize(
        self,
        lead_data: Dict[str, Any],
        template: str,
        additional_context: Optional[str] = None,
    ) -> Dict[str, str]:
        provider = self.get_default_provider()
        if not provider:
            return {"subject": "", "body": template}

        variables = []
        for key in ["first_name", "last_name", "company_name", "job_title"]:
            if lead_data.get(key):
                variables.append(f"{key}:{lead_data[key]}")

        system_prompt = """You are an expert at personalizing cold outreach emails.
Analyze the lead data and template. Create a personalized email that:
1. Uses the lead's first name naturally
2. References their company or role when relevant
3. Keeps it concise and professional
4. Maintains the core message of the template

Return ONLY the personalized email body without any preamble."""

        context = f"Lead Data: {variables}\nTemplate: {template}"
        if additional_context:
            context += f"\n\nAdditional Context: {additional_context}"

        request = AICompletionRequest(
            prompt=context,
            system=system_prompt,
            temperature=0.7,
            max_tokens=500,
        )
        response = await provider.complete(request)
        return {"subject": f"Re: {lead_data.get('company_name', 'Your Company')}", "body": response.text}


ai_manager = AIManager()