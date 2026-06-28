"""agents 服务数据模型：agent、category、agent_installation、agent_review"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Numeric, SmallInteger, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.models import Base, TenantMixin, TimestampMixin, UUIDMixin


class Category(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)

    agents: Mapped[list["Agent"]] = relationship(back_populates="category")


class Agent(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "agents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_tenant_agent_name"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    platform_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    platform_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    capability: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    input_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    output_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    visibility: Mapped[str] = mapped_column(String(30), default="tenant_visible")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    install_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_avg: Mapped[float] = mapped_column(Numeric(2, 1), default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    tenant: Mapped["Tenant"] = relationship(back_populates="agents")  # noqa: F821
    category: Mapped["Category | None"] = relationship(back_populates="agents")
    installations: Mapped[list["AgentInstallation"]] = relationship(back_populates="agent")
    reviews: Mapped[list["AgentReview"]] = relationship(back_populates="agent")


class AgentInstallation(Base, UUIDMixin, TenantMixin):
    __tablename__ = "agent_installations"
    __table_args__ = (
        UniqueConstraint("user_id", "agent_id", name="uq_user_agent_install"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), nullable=False)
    installed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    agent: Mapped["Agent"] = relationship(back_populates="installations")


class AgentReview(Base, UUIDMixin, TenantMixin):
    __tablename__ = "agent_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "agent_id", name="uq_user_agent_review"),
    )

    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    agent: Mapped["Agent"] = relationship(back_populates="reviews")
