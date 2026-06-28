"""adapters 服务数据模型：platform_connection"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from common.models import Base, TenantMixin, TimestampMixin, UUIDMixin


class PlatformConnection(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "platform_connections"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    platform_type: Mapped[str] = mapped_column(String(50), nullable=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
