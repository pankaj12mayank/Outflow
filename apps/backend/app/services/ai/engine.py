from typing import Optional, Any
from dataclasses import dataclass, field
import logging
import json
from datetime import datetime

from .providers import AIProvider, AIResponse, AIRequest, OllamaProvider, get_provider_manager
from .prompts import get_prompt, render_prompt, PromptType
from app.core.logging import ai_logger

logger = logging.getLogger(__name__)


@dataclass
class AIUsage:
    timestamp: datetime
    model: str
    feature: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    cost: float
    success: bool
    error: Optional[str] = None


@dataclass
class PersonalizationData:
    company_name: str = ""
    industry: str = ""
    product_description: str = ""
    key_value_props: list[str] = field(default_factory=list)
    recent_news: str = ""
    pain_points: list[str] = field(default_factory=list)
    tone: str = "professional"
    personalization_angles: list[str] = field(default_factory=list)
    website_url: str = ""
    raw_content: str = ""


@dataclass
class GeneratedEmail:
    opener: str = ""
    body: str = ""
    subject: str = ""
    cta: str = ""
    full_email: str = ""
    personalization_data: Optional[PersonalizationData] = None


@dataclass
class ReplyClassification:
    category: str
    confidence: float
    reasoning: str
    sentiment: str
    action_required: Optional[str] = None


class AIEngine:
    def __init__(self):
        self.provider = get_provider_manager()

    async def _generate(
        self,
        prompt: str,
        model: str = "llama3.2",
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500,
        feature: str = "unknown",
        max_retries: int = 3,
    ) -> tuple[str, AIUsage]:
        provider = self.provider.get_active() or OllamaProvider()
        request = AIRequest(
            prompt=prompt,
            system=system,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        last_error = None
        for attempt in range(max_retries):
            try:
                response = await provider.generate(request)
                usage = AIUsage(
                    timestamp=datetime.utcnow(),
                    model=model,
                    feature=feature,
                    prompt_tokens=response.prompt_tokens,
                    completion_tokens=response.completion_tokens,
                    total_tokens=response.usage_tokens,
                    latency_ms=response.latency_ms,
                    cost=response.cost,
                    success=True,
                )
                ai_logger.log_ai(
                    feature=feature,
                    model=model,
                    success=True,
                    tokens_used=response.usage_tokens,
                    latency_ms=response.latency_ms,
                    attempt=attempt + 1,
                )
                return response.content, usage
            except Exception as e:
                last_error = e
                ai_logger.log_ai(
                    feature=feature,
                    model=model,
                    success=False,
                    error=str(e),
                    attempt=attempt + 1,
                )
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(1 * (attempt + 1))

        usage = AIUsage(
            timestamp=datetime.utcnow(),
            model=model,
            feature=feature,
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            latency_ms=0,
            cost=0,
            success=False,
            error=str(last_error),
        )
        ai_logger.log_ai(
            feature=feature,
            model=model,
            success=False,
            error=str(last_error),
            all_retries_failed=True,
        )
        return f"AI service unavailable after {max_retries} attempts. Please try again later.", usage

    async def _chat(
        self,
        messages: list[dict],
        model: str = "llama3.2",
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500,
        feature: str = "unknown",
    ) -> tuple[str, AIUsage]:
        provider = self.provider.get_active() or OllamaProvider()

        try:
            response = await provider.chat(
                messages=messages,
                model=model,
                system=system,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            usage = AIUsage(
                timestamp=datetime.utcnow(),
                model=model,
                feature=feature,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                total_tokens=response.usage_tokens,
                latency_ms=response.latency_ms,
                cost=response.cost,
                success=True,
            )
            return response.content, usage
        except Exception as e:
            logger.error(f"AI chat failed: {e}")
            usage = AIUsage(
                timestamp=datetime.utcnow(),
                model=model,
                feature=feature,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                latency_ms=0,
                cost=0,
                success=False,
                error=str(e),
            )
            return f"Error: {str(e)}", usage

    async def analyze_website(self, website_content: str, website_url: str = "") -> tuple[PersonalizationData, AIUsage]:
        prompt = render_prompt(
            "personalization_analyze",
            website_content=website_content[:4000],
        )

        model_config = self.provider.get_model_config("llama3.2") or {}
        model = "llama3.2"
        system = get_prompt("personalization_analyze")["prompt"].split("\n\nWebsite Content")[0]

        content, usage = await self._generate(
            prompt=prompt,
            model=model,
            system=system,
            temperature=0.3,
            max_tokens=500,
            feature="website_analysis",
        )

        try:
            json_str = content.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            data = json.loads(json_str)

            personalization = PersonalizationData(
                company_name=data.get("company_name", ""),
                industry=data.get("industry", ""),
                product_description=data.get("product_description", ""),
                key_value_props=data.get("key_value_props", []),
                recent_news=data.get("recent_news", ""),
                pain_points=data.get("pain_points", []),
                tone=data.get("tone", "professional"),
                personalization_angles=data.get("personalization_angles", []),
                website_url=website_url,
                raw_content=website_content[:2000],
            )
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse personalization data: {e}")
            personalization = PersonalizationData(
                company_name="",
                industry="",
                product_description=website_content[:500],
                website_url=website_url,
                raw_content=website_content[:2000],
            )

        return personalization, usage

    async def generate_personalized_email(
        self,
        personalization_data: PersonalizationData,
        sender_context: str = "",
        goal: str = "book_demo",
    ) -> tuple[GeneratedEmail, AIUsage]:
        pain_points_str = "\n".join([f"- {p}" for p in personalization_data.pain_points[:3]])
        value_props_str = "\n".join([f"- {v}" for v in personalization_data.key_value_props[:3]])
        angles_str = "\n".join([f"- {a}" for a in personalization_data.personalization_angles[:3]])

        opener_prompt = render_prompt(
            "personalized_opener",
            company_name=personalization_data.company_name,
            industry=personalization_data.industry,
            recent_news=personalization_data.recent_news or "None noted",
            pain_points=pain_points_str,
            tone=personalization_data.tone or "professional",
        )

        opener, opener_usage = await self._generate(
            prompt=opener_prompt,
            temperature=0.8,
            max_tokens=100,
            feature="opener_generation",
        )

        email_prompt = render_prompt(
            "full_email_generation",
            company_name=personalization_data.company_name,
            industry=personalization_data.industry,
            product_description=personalization_data.product_description,
            key_value_props=value_props_str,
            pain_points=pain_points_str,
            personalization_angle=angles_str or "general B2B value proposition",
            tone=personalization_data.tone or "professional",
            sender_context=sender_context or "SaaS platform helping businesses improve outreach",
            opener=opener,
        )

        body, email_usage = await self._generate(
            prompt=email_prompt,
            temperature=0.7,
            max_tokens=400,
            feature="email_generation",
        )

        total_usage = AIUsage(
            timestamp=datetime.utcnow(),
            model="llama3.2",
            feature="full_personalization",
            prompt_tokens=opener_usage.prompt_tokens + email_usage.prompt_tokens,
            completion_tokens=opener_usage.completion_tokens + email_usage.completion_tokens,
            total_tokens=opener_usage.total_tokens + email_usage.total_tokens,
            latency_ms=opener_usage.latency_ms + email_usage.latency_ms,
            cost=0,
            success=True,
        )

        generated = GeneratedEmail(
            opener=opener.strip(),
            body=body.strip(),
            full_email=f"{opener.strip()}\n\n{body.strip()}",
            personalization_data=personalization_data,
        )

        return generated, total_usage

    async def generate_subject_lines(
        self,
        recipient_name: str,
        company_name: str,
        industry: str,
        topic: str,
        target: str = "book_demo",
        count: int = 3,
    ) -> tuple[list[str], AIUsage]:
        prompt = render_prompt(
            "subject_line",
            count=count,
            recipient_name=recipient_name,
            company_name=company_name,
            industry=industry,
            topic=topic,
            target=target,
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.9,
            max_tokens=200,
            feature="subject_generation",
        )

        subjects = []
        for line in content.strip().split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-") or line.startswith("*")):
                cleaned = line.lstrip("0123456789.-* ")
                if cleaned:
                    subjects.append(cleaned)

        return subjects[:count], usage

    async def generate_ctas(
        self,
        goal: str = "book_demo",
        recipient_level: str = "Manager",
        industry: str = "B2B",
        count: int = 3,
    ) -> tuple[list[str], AIUsage]:
        prompt = render_prompt(
            "cta_generation",
            count=count,
            goal=goal,
            recipient_level=recipient_level,
            industry=industry,
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.8,
            max_tokens=200,
            feature="cta_generation",
        )

        ctas = []
        for line in content.strip().split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-") or line.startswith("*")):
                cleaned = line.lstrip("0123456789.-* ")
                if cleaned:
                    ctas.append(cleaned)

        return ctas[:count], usage

    async def generate_openers(
        self,
        recipient_name: str,
        company_name: str,
        industry: str,
        product: str = "our platform",
        count: int = 3,
    ) -> tuple[list[str], AIUsage]:
        prompt = render_prompt(
            "opener_generation",
            count=count,
            recipient_name=recipient_name,
            company_name=company_name,
            industry=industry,
            product=product,
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.85,
            max_tokens=300,
            feature="opener_generation",
        )

        openers = []
        for line in content.strip().split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-") or line.startswith("*")):
                cleaned = line.lstrip("0123456789.-* ")
                if cleaned:
                    openers.append(cleaned)

        return openers[:count], usage

    async def improve_readability(self, email_body: str) -> tuple[str, AIUsage]:
        prompt = render_prompt(
            "readability_improvement",
            email_body=email_body,
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.5,
            max_tokens=400,
            feature="readability_improvement",
        )

        return content.strip(), usage

    async def optimize_outreach(self, email_body: str) -> tuple[dict, AIUsage]:
        prompt = render_prompt(
            "outreach_optimization",
            email_body=email_body,
        )

        model_config = self.provider.get_model_config("llama3.2") or {}
        model = "llama3.2"

        messages = [
            {"role": "user", "content": prompt}
        ]

        content, usage = await self._chat(
            messages=messages,
            model=model,
            temperature=0.6,
            max_tokens=500,
            feature="outreach_optimization",
        )

        try:
            json_str = content.strip()
            if "```" in json_str:
                parts = json_str.split("```")
                for part in parts:
                    if part.strip().startswith("json") or part.strip().startswith("{"):
                        json_str = part.strip().lstrip("json").strip()
                        break

            result = json.loads(json_str)
            return result, usage
        except json.JSONDecodeError:
            return {
                "score": 5,
                "working": ["Message is clear"],
                "not_working": ["Unable to parse full analysis"],
                "suggestions": ["Review the original email for improvement opportunities"],
                "rewritten": email_body,
            }, usage

    async def classify_reply(
        self,
        sender: str,
        subject: str,
        body: str,
    ) -> tuple[ReplyClassification, AIUsage]:
        prompt = render_prompt(
            "reply_classification",
            sender=sender,
            subject=subject,
            body=body[:2000],
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.3,
            max_tokens=200,
            feature="reply_classification",
        )

        try:
            json_str = content.strip()
            if "```" in json_str:
                parts = json_str.split("```")
                for part in parts:
                    if part.strip().startswith("json") or part.strip().startswith("{"):
                        json_str = part.strip().lstrip("json").strip()
                        break

            data = json.loads(json_str)
            classification = ReplyClassification(
                category=data.get("category", "unknown"),
                confidence=data.get("confidence", 0.5),
                reasoning=data.get("reasoning", ""),
                sentiment=data.get("sentiment", "neutral"),
                action_required=data.get("action_required"),
            )
        except json.JSONDecodeError:
            classification = ReplyClassification(
                category="unknown",
                confidence=0.0,
                reasoning="Failed to parse classification response",
                sentiment="neutral",
            )

        return classification, usage

    async def analyze_company(
        self,
        company_name: str,
        website_url: str = "",
        industry: str = "",
        context: str = "",
    ) -> tuple[dict, AIUsage]:
        prompt = render_prompt(
            "company_analysis",
            company_name=company_name,
            website_url=website_url or "N/A",
            industry=industry or "B2B",
            context=context or "General outreach",
        )

        content, usage = await self._generate(
            prompt=prompt,
            temperature=0.4,
            max_tokens=600,
            feature="company_analysis",
        )

        return {"analysis": content.strip()}, usage

    async def detect_pain_points(
        self,
        url: str,
        content: str,
    ) -> tuple[list[str], AIUsage]:
        prompt = render_prompt(
            "pain_point_detection",
            url=url,
            content=content[:3000],
        )

        content_result, usage = await self._generate(
            prompt=prompt,
            temperature=0.5,
            max_tokens=400,
            feature="pain_point_detection",
        )

        pain_points = []
        for line in content_result.strip().split("\n"):
            line = line.strip()
            if line and (line.startswith("-") or line.startswith("*") or line[0].isdigit()):
                cleaned = line.lstrip("0123456789.-* ")
                if cleaned and len(cleaned) > 10:
                    pain_points.append(cleaned)

        return pain_points[:5], usage

    async def generate_with_custom_prompt(
        self,
        prompt_text: str,
        system: Optional[str] = None,
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 500,
        feature: str = "custom",
    ) -> tuple[str, AIUsage]:
        return await self._generate(
            prompt=prompt_text,
            model=model,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens,
            feature=feature,
        )


_ai_engine: Optional[AIEngine] = None


def get_ai_engine() -> AIEngine:
    global _ai_engine
    if _ai_engine is None:
        _ai_engine = AIEngine()
    return _ai_engine