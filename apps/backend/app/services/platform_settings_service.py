"""Platform-wide settings stored in MongoDB (SMTP secrets, AI keys)."""

from datetime import datetime
from typing import Any, Dict, Optional

from app.db.mongodb import MongoDB

_QUERY = {"type": "main"}


class PlatformSettingsService:
    @staticmethod
    async def get_settings() -> Dict[str, Any]:
        doc = await MongoDB.get_collection("platform_settings").find_one(_QUERY)
        if not doc:
            return {"ai": {}, "branding": {}, "updated_at": None}
        return {
            "ai": doc.get("ai", {}),
            "branding": doc.get("branding", {}),
            "updated_at": doc.get("updated_at"),
        }

    @staticmethod
    async def update_ai_settings(data: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {
            "ai_provider",
            "openai_api_key",
            "anthropic_api_key",
            "ollama_base_url",
            "ollama_model",
        }
        ai_patch = {k: v for k, v in data.items() if k in allowed}

        await MongoDB.get_collection("platform_settings").update_one(
            _QUERY,
            {
                "$set": {
                    "type": "main",
                    "ai": ai_patch,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        return await PlatformSettingsService.get_settings()

    @staticmethod
    async def update_branding(data: Dict[str, Any]) -> Dict[str, Any]:
        await MongoDB.get_collection("platform_settings").update_one(
            _QUERY,
            {
                "$set": {
                    "type": "main",
                    "branding": data,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        return await PlatformSettingsService.get_settings()

    @staticmethod
    async def get_ai_for_runtime() -> Dict[str, Optional[str]]:
        """Merge DB settings with process env (DB wins when set)."""
        import os

        settings = await PlatformSettingsService.get_settings()
        ai = settings.get("ai") or settings
        return {
            "ai_provider": ai.get("ai_provider") or os.getenv("AI_PROVIDER", "ollama"),
            "openai_api_key": ai.get("openai_api_key") or os.getenv("OPENAI_API_KEY"),
            "anthropic_api_key": ai.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY"),
            "ollama_base_url": ai.get("ollama_base_url") or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            "ollama_model": ai.get("ollama_model") or os.getenv("OLLAMA_MODEL", "llama3.2"),
        }
