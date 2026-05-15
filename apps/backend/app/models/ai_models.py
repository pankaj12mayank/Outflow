"""
AI Models (MongoDB)
Simplified models for MongoDB
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AIProvider(BaseModel):
    id: Optional[str] = None
    name: str
    display_name: str
    enabled: bool = True
    is_default: bool = False
    config: Dict[str, Any] = {}


class AIModel(BaseModel):
    id: Optional[str] = None
    provider: str
    name: str
    model_id: str
    display_name: str
    description: Optional[str] = None
    max_tokens: int = 4096
    supports_functions: bool = False
    supports_vision: bool = False
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    is_active: bool = True


class AISettings(BaseModel):
    id: Optional[str] = None
    organization_id: str
    default_model: Optional[str] = None
    default_temperature: float = 0.7
    max_tokens: int = 1000
    personalization_enabled: bool = True
    auto_enrich_enabled: bool = True
    settings: Dict[str, Any] = {}


class AIGeneration(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: str
    feature: str
    model: str
    prompt: str
    response: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    success: bool = True
    error: Optional[str] = None


class AIUsageLog(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: str
    feature: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    cost: float = 0.0
    success: bool = True
    error: Optional[str] = None