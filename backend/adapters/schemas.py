"""adapters 服务 Pydantic Schema"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ConnectionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    platform_type: str = Field(min_length=1, max_length=50)
    config: Optional[dict] = None
    status: str = "active"


class ConnectionUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    config: Optional[dict] = None
    status: Optional[str] = None


class ConnectionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    platform_type: str
    config: Optional[dict] = None
    status: str
    last_checked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
