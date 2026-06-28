"""共享数据模型：chat_sessions, chat_messages, audit_logs, usage_records
Phase 1 仅建表，不实现业务逻辑"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from common.models import Base, TenantMixin, TimestampMixin, UUIDMixin


class ChatSession(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "chat_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    first_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ChatMessage(Base, UUIDMixin, TenantMixin):
    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), default="text")
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    result: Mapped[str] = mapped_column(String(20), default="success")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    agent_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    tokens_prompt: Mapped[int] = mapped_column(Integer, default=0)
    tokens_completion: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
