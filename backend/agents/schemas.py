"""agents 服务 Pydantic Schema"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── 分类 ──
class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: Optional[str] = None
    sort_order: int = 0
    tenant_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


# ── Agent ──
class AgentCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: Optional[list[dict]] = None
    platform_type: Optional[str] = None
    platform_config: Optional[dict] = None
    capability: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    visibility: str = "tenant_visible"
    status: str = "draft"
    version: str = "1.0.0"


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: Optional[list[dict]] = None
    platform_type: Optional[str] = None
    platform_config: Optional[dict] = None
    capability: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    version: Optional[str] = None


class AgentListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[UUID] = None
    platform_type: Optional[str] = None
    tags: Optional[str] = None  # 逗号分隔
    sort_by: str = "created_at"
    sort_order: str = "desc"


class AgentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category_id: Optional[UUID] = None
    category: Optional[CategoryResponse] = None
    tags: Optional[list[dict]] = None
    platform_type: Optional[str] = None
    platform_config: Optional[dict] = None
    capability: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    visibility: str
    status: str
    version: str
    owner_id: Optional[UUID] = None
    install_count: int = 0
    rating_avg: float = 0.0
    review_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── 评论 ──
class ReviewCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
