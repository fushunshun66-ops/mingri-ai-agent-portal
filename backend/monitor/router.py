"""monitor 服务 API 路由——管理后台端点

所有端点要求 tenant_admin 或 super_admin 角色。
"""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.dependencies import get_current_user, require_role
from common.schemas import ok, paginated_ok
from monitor.schemas import (
    AgentStatsItem,
    AuditLogItem,
    DashboardResponse,
    UserStatsItem,
)
from monitor.service import (
    get_agent_stats,
    get_audit_log,
    get_audit_logs_csv,
    get_dashboard,
    get_timeline_overview,
    get_user_stats,
    list_audit_logs,
)

router = APIRouter(prefix="/api/v1/admin", tags=["管理后台"])


# ── 仪表盘 ──

@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """管理仪表盘概览"""
    data = await get_dashboard(db, current_user["tenant_id"])
    return ok(data=data, message="查询成功")


# ── Agent 使用统计 ──

@router.get("/stats/agents")
async def stats_agents(
    start_date: str | None = Query(default=None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="结束日期 YYYY-MM-DD"),
    sort_by: str = Query(default="sessions", description="排序字段: sessions/messages/tokens/installations"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """Agent 使用统计列表"""
    items, total = await get_agent_stats(
        db,
        current_user["tenant_id"],
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return paginated_ok(data=items, total=total, page=page, page_size=page_size)


# ── 用户活跃统计 ──

@router.get("/stats/users")
async def stats_users(
    start_date: str | None = Query(default=None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="结束日期 YYYY-MM-DD"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """用户活跃统计列表"""
    items, total = await get_user_stats(
        db,
        current_user["tenant_id"],
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return paginated_ok(data=items, total=total, page=page, page_size=page_size)


# ── 时间线概览 ──

@router.get("/stats/overview")
async def stats_overview(
    days: int = Query(default=30, ge=1, le=365, description="统计天数"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """时间线概览——返回每日聚合数据用于图表"""
    daily = await get_timeline_overview(db, current_user["tenant_id"], days=days)
    return ok(data={"daily": daily}, message="查询成功")


# ── 审计日志 ──

@router.get("/audit-logs")
async def audit_logs_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None, description="CREATE/READ/UPDATE/DELETE/EXECUTE"),
    resource_type: str | None = Query(default=None, description="agent/connection/session/user"),
    start_date: str | None = Query(default=None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="结束日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """审计日志列表（分页 + 多条件筛选）"""
    items, total = await list_audit_logs(
        db,
        current_user["tenant_id"],
        page=page,
        page_size=page_size,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        start_date=start_date,
        end_date=end_date,
    )
    return paginated_ok(data=items, total=total, page=page, page_size=page_size)


@router.get("/audit-logs/export")
async def audit_logs_export(
    start_date: str | None = Query(default=None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="结束日期 YYYY-MM-DD"),
    format: str = Query(default="csv", description="导出格式（当前仅支持 csv）"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """导出审计日志为 CSV"""
    csv_content = await get_audit_logs_csv(
        db,
        current_user["tenant_id"],
        start_date=start_date,
        end_date=end_date,
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


@router.get("/audit-logs/{log_id}")
async def audit_logs_detail(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _admin: bool = require_role("tenant_admin", "super_admin"),
):
    """审计日志详情"""
    log = await get_audit_log(db, log_id, current_user["tenant_id"])
    return ok(data=log, message="查询成功")
