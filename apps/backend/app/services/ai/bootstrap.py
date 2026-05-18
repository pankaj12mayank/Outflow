"""Initialize AI providers from environment (OpenAI / Anthropic / Ollama)."""

from typing import Optional

from app.core.config import settings
from app.services.ai.providers import configure_providers, get_provider_manager, AIRequest

_configured = False


def bootstrap_ai_providers() -> str:
    global _configured
    if _configured:
        return get_provider_manager()._active_provider or "none"

    provider = (settings.ai_provider or "ollama").strip().lower()
    default_model = settings.ai_default_model or settings.ollama_default_model
    config: dict = {}

    if settings.openai_api_key:
        config["openai"] = {
            "api_key": settings.openai_api_key,
            "base_url": settings.openai_base_url or "https://api.openai.com/v1",
            "default": provider == "openai",
            "models": {default_model: {"enabled": True}},
        }

    if settings.anthropic_api_key:
        config["anthropic"] = {
            "api_key": settings.anthropic_api_key,
            "default": provider == "anthropic",
            "models": {default_model: {"enabled": True}},
        }

    if provider == "ollama" or not (settings.openai_api_key or settings.anthropic_api_key):
        config["ollama"] = {
            "enabled": True,
            "url": settings.ollama_base_url,
            "default": provider == "ollama" or not (settings.openai_api_key or settings.anthropic_api_key),
            "models": {settings.ollama_default_model: {"enabled": True}},
        }

    configure_providers(config)
    _configured = True
    return get_provider_manager()._active_provider or "none"


async def ai_runtime_status() -> dict:
    bootstrap_ai_providers()
    manager = get_provider_manager()
    active_name = manager._active_provider
    provider = manager.get_active()
    healthy = False
    if provider:
        try:
            healthy = await provider.health_check()
        except Exception:
            healthy = False

    return {
        "provider": active_name or "none",
        "model": settings.ai_default_model,
        "status": "available" if healthy else "offline",
        "healthy": healthy,
        "providers": manager.list_providers(),
        "openai_configured": bool(settings.openai_api_key),
        "anthropic_configured": bool(settings.anthropic_api_key),
    }


async def generate_text(
    prompt: str,
    *,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 800,
) -> tuple[Optional[str], Optional[str]]:
    bootstrap_ai_providers()
    provider = get_provider_manager().get_active()
    if not provider:
        return None, "No AI provider configured. Set OPENAI_API_KEY and AI_PROVIDER=openai on Render."

    use_model = model or settings.ai_default_model
    try:
        response = await provider.generate(
            AIRequest(
                prompt=prompt,
                system=system,
                model=use_model,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=settings.ollama_timeout,
            )
        )
        return response.content, None
    except Exception as e:
        return None, str(e)
