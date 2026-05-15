from enum import Enum
from typing import Optional, List, Dict, Any


class PromptCategory(str, Enum):
    SYSTEM = "system"
    CAMPAIGN = "campaign"
    TEMPLATE = "template"
    PERSONALIZATION = "personalization"
    CLASSIFICATION = "classification"


class PromptType(str, Enum):
    EMAIL_GENERATION = "email_generation"
    PERSONALIZATION = "personalization"
    SUBJECT_LINE = "subject_line"
    CTA_GENERATION = "cta_generation"
    OPENER_GENERATION = "opener_generation"
    READABILITY_IMPROVEMENT = "readability_improvement"
    OUTREACH_OPTIMIZATION = "outreach_optimization"
    REPLY_CLASSIFICATION = "reply_classification"
    PAIN_POINT_DETECTION = "pain_point_detection"
    COMPANY_ANALYSIS = "company_analysis"


_DEFAULT_PROMPTS: dict[str, dict] = {
    "system_email": {
        "category": PromptCategory.SYSTEM,
        "type": PromptType.EMAIL_GENERATION,
        "description": "Default system prompt for email generation",
        "prompt": """You are an expert cold email copywriter for B2B sales. You write emails that are:
- Concise and personalized
- Value-driven, not pitchy
- Professional but human
- Focused on one clear CTA
- Under 150 words for first emails
- Free of spam trigger words

Always include a clear call-to-action and sign-off.""",
        "model": "llama3.2",
        "temperature": 0.7,
        "max_tokens": 300,
        "version": 1,
    },
    "personalization_analyze": {
        "category": PromptCategory.PERSONALIZATION,
        "type": PromptType.PERSONALIZATION,
        "description": "Analyze company website to extract personalization data",
        "prompt": """Analyze this website content and extract key information for personalization:

Website Content:
{website_content}

Extract and return a JSON object with:
- company_name: The company name
- industry: Industry/niche
- product_description: What they sell/offer
- key_value_props: Top 3 value propositions
- recent_news: Any recent updates or news
- pain_points: Potential challenges for this type of business
- tone: Recommended email tone (formal/casual/professional)
- personalization_angles: Specific angles for personalization (recent achievements, mutual connections, specific pain points, relevant content)

Return ONLY valid JSON, no markdown formatting.""",
        "model": "llama3.2",
        "temperature": 0.3,
        "max_tokens": 500,
        "version": 1,
    },
    "pain_point_detection": {
        "category": PromptCategory.PERSONALIZATION,
        "type": PromptType.PAIN_POINT_DETECTION,
        "description": "Detect pain points from website content",
        "prompt": """Analyze this website and identify potential pain points for a cold email:

Website: {url}
Content: {content}

Identify 3-5 specific pain points this company likely faces. For each pain point:
- Name it specifically
- Explain why it's a challenge
- Suggest how our solution addresses it

Format as a bulleted list.""",
        "model": "llama3.2",
        "temperature": 0.5,
        "max_tokens": 400,
        "version": 1,
    },
    "personalized_opener": {
        "category": PromptCategory.PERSONALIZATION,
        "type": PromptType.OPENER_GENERATION,
        "description": "Generate personalized email opening line",
        "prompt": """Based on the following company information, write ONE personalized opening line for a cold email:

Company: {company_name}
Industry: {industry}
Recent News: {recent_news}
Pain Points: {pain_points}
Tone: {tone}

Write a single opening line (max 40 words) that:
- References something specific about them
- Creates curiosity or shows understanding
- Leads into the email body
- Does NOT use generic openers like "I noticed your company"

Return ONLY the opening line, no explanation.""",
        "model": "llama3.2",
        "temperature": 0.8,
        "max_tokens": 100,
        "version": 1,
    },
    "full_email_generation": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.EMAIL_GENERATION,
        "description": "Generate complete personalized cold email",
        "prompt": """Write a personalized cold email based on the following information:

Company: {company_name}
Industry: {industry}
Product/Service: {product_description}
Key Value Props: {key_value_props}
Pain Points: {pain_points}
Personalization Angle: {personalization_angle}
Tone: {tone}
Sender Context: {sender_context}

Requirements:
- Opening line: {opener}
- Include 1-2 specific personalization details
- Focus on their pain points and how we help
- Single clear CTA at the end
- Sign-off with first name
- Max 150 words total
- Professional but human tone

Return the complete email body.""",
        "model": "llama3.2",
        "temperature": 0.7,
        "max_tokens": 400,
        "version": 1,
    },
    "subject_line": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.SUBJECT_LINE,
        "description": "Generate email subject lines",
        "prompt": """Generate {count} email subject lines for a cold email campaign:

Recipient: {recipient_name} at {company_name}
Industry: {industry}
Email Topic: {topic}
Target: {target}

Requirements:
- Under 50 characters each
- Create curiosity or show value
- Personalized where possible
- Avoid spam triggers
- Vary the approach (question, statement, curiosity, mutual connection)

Return a numbered list of subject lines.""",
        "model": "llama3.2",
        "temperature": 0.9,
        "max_tokens": 200,
        "version": 1,
    },
    "cta_generation": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.CTA_GENERATION,
        "description": "Generate call-to-action options",
        "prompt": """Generate {count} call-to-action options for a cold email:

Email Goal: {goal}
Recipient Level: {recipient_level} (C-suite/VP/Director/Manager/IC)
Industry: {industry}

Requirements:
- Specific and actionable
- Low-commitment for early emails
- Higher commitment for follow-ups
- Varied complexity (simple click vs meeting request)

Return a numbered list of CTA options, each max 15 words.""",
        "model": "llama3.2",
        "temperature": 0.8,
        "max_tokens": 200,
        "version": 1,
    },
    "opener_generation": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.OPENER_GENERATION,
        "description": "Generate non-personalized opening lines",
        "prompt": """Generate {count} email opening lines for a cold email:

Recipient: {recipient_name}
Company: {company_name}
Industry: {industry}
Product: {product}

Requirements:
- Create curiosity or grab attention
- Different approaches (question, stat, observation, bold statement)
- Do NOT mention specific personal details (no personalization)
- Max 25 words each

Return a numbered list of opening lines.""",
        "model": "llama3.2",
        "temperature": 0.85,
        "max_tokens": 300,
        "version": 1,
    },
    "readability_improvement": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.READABILITY_IMPROVEMENT,
        "description": "Improve email readability",
        "prompt": """Improve the readability of this email:

{email_body}

Make these improvements:
- Shorten long sentences
- Break up paragraphs (max 3 sentences each)
- Use bullet points where appropriate
- Replace jargon with simple words
- Highlight the CTA
- Keep the core message intact

Return the improved email with changes noted.""",
        "model": "llama3.2",
        "temperature": 0.5,
        "max_tokens": 400,
        "version": 1,
    },
    "outreach_optimization": {
        "category": PromptCategory.CAMPAIGN,
        "type": PromptType.OUTREACH_OPTIMIZATION,
        "description": "Optimize outreach email for better response",
        "prompt": """Analyze and optimize this outreach email:

{email_body}

Provide:
1. Overall score (1-10) with brief explanation
2. What's working well (1-3 points)
3. What's not working (1-3 points)
4. Specific improvement suggestions
5. Rewritten version with improvements applied

Be specific and actionable in feedback.""",
        "model": "llama3.2",
        "temperature": 0.6,
        "max_tokens": 500,
        "version": 1,
    },
    "reply_classification": {
        "category": PromptCategory.SYSTEM,
        "type": PromptType.REPLY_CLASSIFICATION,
        "description": "Classify email replies into categories",
        "prompt": """Classify this email reply into one of the following categories:

Reply Categories:
- interested: Positive response, wants to learn more
- not_interested: Explicit rejection or unsubscribe request
- maybe_later: Needs more info, not the right time
- pricing_inquiry: Specific question about pricing
- meeting_request: Wants to schedule a call/meeting
- out_of_office: Auto-reply or vacation message
- wrong_person: Not the right recipient
- question: Has a specific question
- spam: Clearly spam or irrelevant

Email:
From: {sender}
Subject: {subject}
Body: {body}

Return ONLY a JSON object:
{{"category": "category_name", "confidence": 0.95, "reasoning": "brief explanation", "sentiment": "positive/negative/neutral", "action_required": "specific action if any"}}""",
        "model": "llama3.2",
        "temperature": 0.3,
        "max_tokens": 200,
        "version": 1,
    },
    "company_analysis": {
        "category": PromptCategory.PERSONALIZATION,
        "type": PromptType.COMPANY_ANALYSIS,
        "description": "Deep analysis of company for outreach",
        "prompt": """Provide a comprehensive analysis of this company for B2B outreach:

Company: {company_name}
Website: {website_url}
Industry: {industry}
Additional Context: {context}

Analyze:
1. Company overview (size, stage, market position)
2. Recent developments (funding, leadership, expansion, awards)
3. Potential challenges (market pressures, competition, scaling issues)
4. Best personalization angles (specific to this company)
5. Recommended email approach (tone, length, focus)
6. Red flags (recent layoffs, negative news)

Be thorough but concise. Return structured analysis.""",
        "model": "llama3.2",
        "temperature": 0.4,
        "max_tokens": 600,
        "version": 1,
    },
}


def get_default_prompts() -> dict[str, dict]:
    return _DEFAULT_PROMPTS.copy()


def get_prompt(key: str) -> Optional[dict]:
    return _DEFAULT_PROMPTS.get(key)


def render_prompt(key: str, **kwargs) -> str:
    prompt_data = _DEFAULT_PROMPTS.get(key)
    if not prompt_data:
        raise ValueError(f"Prompt '{key}' not found")

    template = prompt_data["prompt"]
    try:
        return template.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing template variable: {e}")