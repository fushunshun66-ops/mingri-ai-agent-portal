"""chat 服务 Pydantic Schema"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── 请求 ──
class SessionCreateRequest(BaseModel):
    agent_id: UUID
    title: Optional[str] = Field(default=None, max_length=500)


class SessionUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = None


class MessageSendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class FeedbackRequest(BaseModel):
    feedback: str = Field(pattern="^(like|dislike)$")


# ── 响应 ──
class SessionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    agent_id: UUID
    title: Optional[str] = None
    status: str
    message_count: int = 0
    first_message_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    content_type: str = "text"
    feedback: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MessageSendResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
