"""users 服务数据模型：tenant、user、role、role_permission、user_role"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.models import Base, TenantMixin, TimestampMixin, UUIDMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")

    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    agents: Mapped[list["Agent"]] = relationship(back_populates="tenant")  # noqa: F821


class User(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "username", name="uq_tenant_username"),
        UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),
    )

    username: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    roles: Mapped[list["UserRole"]] = relationship(back_populates="user")


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_tenant_role_name"),
    )

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")


class RolePermission(Base, UUIDMixin):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    permission: Mapped[str] = mapped_column(String(200), nullable=False)
    resource: Mapped[str | None] = mapped_column(String(200), nullable=True)

    role: Mapped["Role"] = relationship(back_populates="permissions")


class UserRole(Base, UUIDMixin):
    __tablename__ = "user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="roles")
    role: Mapped["Role"] = relationship()
