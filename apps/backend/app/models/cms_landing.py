from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class PageStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SCHEDULED = "scheduled"


class BlockType(str, Enum):
    HERO = "hero"
    PRICING = "pricing"
    FEATURES = "features"
    TESTIMONIALS = "testimonials"
    FAQ = "faq"
    INTEGRATIONS = "integrations"
    CTA = "cta"
    NAVBAR = "navbar"
    FOOTER = "footer"
    LOGO_CAROUSEL = "logo_carousel"
    STATS = "stats"
    VIDEO = "video"
    BLOG = "blog"
    CONTACT = "contact"
    TEAM = "team"


class LandingPage(BaseModel):
    id: str = Field(default=None, alias="_id")
    slug: str
    name: str
    description: Optional[str] = None
    status: PageStatus = PageStatus.DRAFT
    blocks: List[Dict] = []
    published_blocks: List[Dict] = []
    version: int = 1
    scheduled_publish: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None


class LandingBlock(BaseModel):
    id: str = Field(default=None, alias="_id")
    page_id: str
    block_type: BlockType
    order: int
    data: Dict = {}
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LandingVersion(BaseModel):
    id: str = Field(default=None, alias="_id")
    page_id: str
    version: int
    blocks: List[Dict]
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None


class SeoConfig(BaseModel):
    id: str = Field(default=None, alias="_id")
    page_id: str
    title: str
    description: Optional[str] = None
    keywords: List[str] = []
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    no_index: bool = False
    og_type: str = "website"
    twitter_card: str = "summary_large_image"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BlockTemplate(BaseModel):
    type: BlockType
    name: str
    description: str
    default_data: Dict
    fields: List[Dict]


class PageCreateRequest(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class PageUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    blocks: Optional[List[Dict]] = None


class BlockUpdateRequest(BaseModel):
    block_type: Optional[BlockType] = None
    data: Optional[Dict] = None
    order: Optional[int] = None
    is_enabled: Optional[bool] = None


class SeoUpdateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    no_index: Optional[bool] = None


DEFAULT_BLOCK_TEMPLATES = [
    {
        "type": BlockType.NAVBAR,
        "name": "Navigation Bar",
        "description": "Top navigation with logo and links",
        "default_data": {
            "logo": "/logo.svg",
            "logo_text": "Outflo",
            "links": [
                {"text": "Features", "href": "#features"},
                {"text": "Pricing", "href": "#pricing"},
                {"text": "About", "href": "#about"},
                {"text": "Contact", "href": "#contact"}
            ],
            "cta_text": "Get Started",
            "cta_link": "/signup"
        },
        "fields": ["logo", "logo_text", "links", "cta_text", "cta_link"]
    },
    {
        "type": BlockType.HERO,
        "name": "Hero Section",
        "description": "Main hero with headline and CTA",
        "default_data": {
            "headline": "Transform Your Outreach",
            "subheadline": "Automate your sales pipeline with AI-powered campaigns that convert.",
            "cta_primary": "Start Free Trial",
            "cta_secondary": "Watch Demo",
            "cta_primary_link": "/signup",
            "cta_secondary_link": "/demo",
            "background_image": None,
            "background_video": None
        },
        "fields": ["headline", "subheadline", "cta_primary", "cta_secondary", "cta_primary_link", "cta_secondary_link", "background_image"]
    },
    {
        "type": BlockType.FEATURES,
        "name": "Features Grid",
        "description": "Showcase your product features",
        "default_data": {
            "title": "Powerful Features",
            "subtitle": "Everything you need to scale your outreach",
            "features": [
                {"icon": "zap", "title": "AI Automation", "description": "Automate repetitive tasks"},
                {"icon": "target", "title": "Smart Targeting", "description": "Find your perfect audience"},
                {"icon": "mail", "title": "Email Sequences", "description": "Automated follow-ups"},
                {"icon": "chart", "title": "Analytics", "description": "Track your success"}
            ],
            "columns": 4
        },
        "fields": ["title", "subtitle", "features", "columns"]
    },
    {
        "type": BlockType.PRICING,
        "name": "Pricing Plans",
        "description": "Subscription pricing options",
        "default_data": {
            "title": "Simple Pricing",
            "subtitle": "Choose the plan that fits you",
            "plans": [
                {"name": "Starter", "price": "29", "period": "month", "features": ["5,000 leads", "100 AI credits", "Email support"], "popular": False},
                {"name": "Pro", "price": "79", "period": "month", "features": ["25,000 leads", "500 AI credits", "Priority support", "Analytics"], "popular": True},
                {"name": "Enterprise", "price": "199", "period": "month", "features": ["Unlimited leads", "Unlimited AI", "24/7 support", "Custom integrations"], "popular": False}
            ]
        },
        "fields": ["title", "subtitle", "plans"]
    },
    {
        "type": BlockType.TESTIMONIALS,
        "name": "Customer Testimonials",
        "description": "Social proof from customers",
        "default_data": {
            "title": "Loved by Teams",
            "testimonials": [
                {"name": "Sarah Johnson", "role": "CEO at TechCorp", "avatar": None, "quote": "Outflo transformed our sales process. Highly recommended!"},
                {"name": "Mike Chen", "role": "VP Sales at StartupX", "avatar": None, "quote": "The AI features are game-changing for our team."},
                {"name": "Emily Davis", "role": "Marketing Director", "avatar": None, "quote": "We've seen 3x more leads since switching to Outflo."}
            ]
        },
        "fields": ["title", "testimonials"]
    },
    {
        "type": BlockType.FAQ,
        "name": "FAQ Section",
        "description": "Frequently asked questions",
        "default_data": {
            "title": "Frequently Asked Questions",
            "faqs": [
                {"question": "How does the free trial work?", "answer": "Start with 14 days of full access. No credit card required."},
                {"question": "Can I cancel anytime?", "answer": "Yes, you can cancel your subscription at any time."},
                {"question": "Is my data secure?", "answer": "We use bank-level encryption and are SOC 2 compliant."}
            ]
        },
        "fields": ["title", "faqs"]
    },
    {
        "type": BlockType.INTEGRATIONS,
        "name": "Integrations",
        "description": "Connect with your favorite tools",
        "default_data": {
            "title": "Integrates with Your Stack",
            "integrations": [
                {"name": "Salesforce", "logo": "/integrations/salesforce.svg"},
                {"name": "HubSpot", "logo": "/integrations/hubspot.svg"},
                {"name": "Slack", "logo": "/integrations/slack.svg"},
                {"name": "Zapier", "logo": "/integrations/zapier.svg"}
            ]
        },
        "fields": ["title", "integrations"]
    },
    {
        "type": BlockType.CTA,
        "name": "Call to Action",
        "description": "Banner to drive conversions",
        "default_data": {
            "headline": "Ready to Get Started?",
            "subheadline": "Join thousands of teams already using Outflo",
            "cta_text": "Start Your Free Trial",
            "cta_link": "/signup",
            "background_color": "#7c3aed"
        },
        "fields": ["headline", "subheadline", "cta_text", "cta_link", "background_color"]
    },
    {
        "type": BlockType.FOOTER,
        "name": "Footer",
        "description": "Site footer with links",
        "default_data": {
            "logo": "/logo.svg",
            "logo_text": "Outflo",
            "description": "AI-powered sales automation platform",
            "columns": [
                {"title": "Product", "links": [{"text": "Features", "href": "/features"}, {"text": "Pricing", "href": "/pricing"}, {"text": "Integrations", "href": "/integrations"}]},
                {"title": "Company", "links": [{"text": "About", "href": "/about"}, {"text": "Blog", "href": "/blog"}, {"text": "Careers", "href": "/careers"}]},
                {"title": "Support", "links": [{"text": "Help Center", "href": "/help"}, {"text": "Contact", "href": "/contact"}, {"text": "Status", "href": "/status"}]}
            ],
            "social_links": [
                {"platform": "twitter", "url": "https://twitter.com/outflo"},
                {"platform": "linkedin", "url": "https://linkedin.com/company/outflo"},
                {"platform": "github", "url": "https://github.com/outflo"}
            ],
            "copyright": "2024 Outflo. All rights reserved."
        },
        "fields": ["logo", "logo_text", "description", "columns", "social_links", "copyright"]
    },
    {
        "type": BlockType.LOGO_CAROUSEL,
        "name": "Logo Carousel",
        "description": "Client logos carousel",
        "default_data": {
            "title": "Trusted by Industry Leaders",
            "logos": [
                {"name": "Acme Corp", "url": "/logos/acme.svg"},
                {"name": "TechStart", "url": "/logos/techstart.svg"},
                {"name": "Global Inc", "url": "/logos/global.svg"},
                {"name": "InnovateCo", "url": "/logos/innovate.svg"}
            ]
        },
        "fields": ["title", "logos"]
    },
    {
        "type": BlockType.STATS,
        "name": "Statistics",
        "description": "Show key metrics",
        "default_data": {
            "stats": [
                {"value": "10K+", "label": "Happy Customers"},
                {"value": "50M+", "label": "Emails Sent"},
                {"value": "99.9%", "label": "Uptime"},
                {"value": "24/7", "label": "Support"}
            ]
        },
        "fields": ["stats"]
    },
    {
        "type": BlockType.CONTACT,
        "name": "Contact Form",
        "description": "Contact form section",
        "default_data": {
            "title": "Get in Touch",
            "subtitle": "Have questions? We'd love to hear from you.",
            "email": "hello@outflo.com",
            "phone": "+1 (555) 123-4567",
            "address": "123 Street, San Francisco, CA",
            "form_enabled": True
        },
        "fields": ["title", "subtitle", "email", "phone", "address", "form_enabled"]
    }
]