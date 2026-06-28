"""monitor 服务 Pydantic Schema——请求/响应模型"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── 仪表盘 ──

class PlatformDistribution(BaseModel):
    platform: str
    count: int


class TopAgentItem(BaseModel):
    id: str
    name: str
    icon_url: Optional[str] = None
    sessions: int
    rating: float


class DashboardResponse(BaseModel):
    total_agents: int
    published_agents: int
    active_users: int
    total_sessions: int
    today_sessions: int
    total_messages: int
    total_tokens: int
    avg_satisfaction: Optional[float] = None
    platform_distribution: list[PlatformDistribution]
    top_agents: list[TopAgentItem]


# ── Agent 使用统计 ──

class AgentStatsItem(BaseModel):
    agent_id: str
    agent_name: str
    platform_type: Optional[str] = None
    icon_url: Optional[str] = None
    sessions: int = 0
    messages: int = 0
    tokens: int = 0
    installations: int = 0
    avg_rating: float = 0.0


# ── 用户活跃统计 ──

class UserStatsItem(BaseModel):
    user_id: str
    username: str
    display_name: Optional[str] = None
    sessions: int = 0
    messages: int = 0
    tokens: int = 0
    last_active: Optional[str] = None


# ── 时间线概览 ──

class DailyStats(BaseModel):
    date: str
    sessions: int
    messages: int
    tokens: int


class TimelineResponse(BaseModel):
    daily: list[DailyStats]


# ── 审计日志 ──

class AuditLogItem(BaseModel):
    id: int
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    detail: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    result: str
    created_at: str

    model_config = {"from_attributes": True}
