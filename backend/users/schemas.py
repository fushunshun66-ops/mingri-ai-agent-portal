"""users 服务 Pydantic 请求/响应 Schema"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── 认证 ──
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=200)
    tenant_name: Optional[str] = Field(default=None, max_length=200)
    tenant_slug: Optional[str] = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("密码必须包含至少一个大写字母")
        if not any(c.islower() for c in v):
            raise ValueError("密码必须包含至少一个小写字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含至少一个数字")
        return v


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    tenant_slug: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


# ── 用户响应 ──
class UserResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str
    roles: list[str] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = Field(default=None, max_length=1000)
    email: Optional[EmailStr] = None


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ── 角色 ──
class RoleResponse(BaseModel):
    id: UUID
    tenant_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    is_system: bool = False

    model_config = {"from_attributes": True}
