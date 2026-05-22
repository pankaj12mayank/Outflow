from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import relationship, declarative_base

# Legacy SQLAlchemy models (unused at runtime; MongoDB is canonical for CMS)
Base = declarative_base()


class LandingPageSection(Base):
    __tablename__ = "landing_page_sections"

    id = Column(Integer, primary_key=True, index=True)
    page = Column(String(50), default="landing")
    section_key = Column(String(100), nullable=False)
    section_name = Column(String(200), nullable=False)

    title = Column(String(255), nullable=True)
    subtitle = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    content = Column(JSON, default=dict)
    media = Column(JSON, default=dict)

    is_visible = Column(Boolean, default=True)
    is_editable = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PricingPlan(Base):
    __tablename__ = "pricing_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_key = Column(String(100), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    monthly_price = Column(Float, default=0.0)
    yearly_price = Column(Float, default=0.0)

    features = Column(JSON, default=list)
    limitations = Column(JSON, default=list)

    is_active = Column(Boolean, default=True)
    is_highlighted = Column(Boolean, default=False)
    highlight_label = Column(String(50), nullable=True)

    cta_text = Column(String(100), default="Get Started")
    cta_url = Column(String(500), nullable=True)

    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    is_visible = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    author_name = Column(String(200), nullable=False)
    author_title = Column(String(200), nullable=True)
    author_company = Column(String(200), nullable=True)
    author_avatar = Column(String(500), nullable=True)
    author_logo = Column(String(500), nullable=True)

    quote = Column(Text, nullable=False)
    rating = Column(Integer, default=5)

    is_visible = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    integration_key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)

    icon = Column(String(255), nullable=True)
    logo = Column(String(500), nullable=True)

    features = Column(JSON, default=list)

    setup_instructions = Column(Text, nullable=True)
    documentation_url = Column(String(500), nullable=True)

    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NavigationItem(Base):
    __tablename__ = "navigation_items"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String(50), default="header")
    parent_id = Column(Integer, ForeignKey("navigation_items.id"), nullable=True)

    label = Column(String(200), nullable=False)
    url = Column(String(500), nullable=True)
    target = Column(String(20), default="_self")

    icon = Column(String(50), nullable=True)
    badge = Column(String(50), nullable=True)

    is_visible = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    sort_order = Column(Integer, default=0)

    children = relationship("NavigationItem", backref="parent", remote_side=[id])

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SEOConfig(Base):
    __tablename__ = "seo_configs"

    id = Column(Integer, primary_key=True, index=True)
    page = Column(String(100), nullable=False, index=True)

    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)

    og_title = Column(String(255), nullable=True)
    og_description = Column(Text, nullable=True)
    og_image = Column(String(500), nullable=True)

    canonical_url = Column(String(500), nullable=True)

    robots = Column(String(255), default="index,follow")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FooterConfig(Base):
    __tablename__ = "footer_configs"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String(50), default="footer")

    column = Column(Integer, default=1)
    section = Column(String(100), nullable=True)

    title = Column(String(200), nullable=True)
    content = Column(JSON, default=list)

    is_visible = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)