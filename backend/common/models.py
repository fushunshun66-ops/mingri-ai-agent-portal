"""SQLAlchemy 声明式基类及 Mixin"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _utcnow():
    return datetime.now(timezone.utc)


class UUIDMixin:
    """UUID 主键 Mixin"""
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    """创建/更新时间戳 Mixin"""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class TenantMixin:
    """多租户 tenant_id Mixin"""
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tenants.id"), index=True
    )
