"""monitor 服务业务逻辑层——聚合统计与审计日志查询

所有统计查询使用 PostgreSQL 聚合函数，不拉全量数据到 Python 层计算。
"""

import csv
import io
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.models import Agent, AgentInstallation, AgentReview
from common.shared_models import AuditLog, ChatMessage, ChatSession, UsageRecord
from common.exceptions import NotFoundException
from users.models import User


def _to_uuid(v: uuid.UUID | str) -> uuid.UUID:
    if isinstance(v, str):
        return uuid.UUID(v)
    return v


# ── 仪表盘 ──

async def get_dashboard(db: AsyncSession, tenant_id: uuid.UUID | str) -> dict:
    """返回管理仪表盘概览数据"""
    tid = _to_uuid(tenant_id)
    today = date.today()
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # 基础计数
    total_agents = await db.scalar(
        select(func.count(Agent.id)).where(Agent.tenant_id == tid)
    )
    published_agents = await db.scalar(
        select(func.count(Agent.id)).where(
            Agent.tenant_id == tid, Agent.status == "published"
        )
    )

    # 活跃用户（30 天内有会话的唯一用户数）
    active_users = await db.scalar(
        select(func.count(func.distinct(ChatSession.user_id))).where(
            ChatSession.tenant_id == tid,
            ChatSession.created_at >= thirty_days_ago,
        )
    )

    # 会话统计
    total_sessions = await db.scalar(
        select(func.count(ChatSession.id)).where(ChatSession.tenant_id == tid)
    )
    today_sessions = await db.scalar(
        select(func.count(ChatSession.id)).where(
            ChatSession.tenant_id == tid,
            func.date(ChatSession.created_at) == today,
        )
    )

    # 消息 / Token 统计
    total_messages = await db.scalar(
        select(func.count(ChatMessage.id)).where(ChatMessage.tenant_id == tid)
    )
    total_tokens = await db.scalar(
        select(
            func.coalesce(
                func.sum(UsageRecord.tokens_prompt + UsageRecord.tokens_completion), 0
            )
        ).where(UsageRecord.tenant_id == tid)
    )

    # 平均满意度（基于 AgentReview 评分）
    avg_rating = await db.scalar(
        select(func.avg(AgentReview.rating)).where(AgentReview.tenant_id == tid)
    )
    avg_satisfaction = round(float(avg_rating), 1) if avg_rating is not None else None

    # 平台分布
    platform_rows = (
        await db.execute(
            select(
                func.coalesce(Agent.platform_type, "unknown").label("platform"),
                func.count(Agent.id).label("cnt"),
            )
            .where(Agent.tenant_id == tid)
            .group_by(func.coalesce(Agent.platform_type, "unknown"))
        )
    ).all()
    platform_distribution = [
        {"platform": row.platform, "count": row.cnt} for row in platform_rows
    ]

    # 热门 Agent Top 10（按会话数排序）
    top_rows = (
        await db.execute(
            select(
                Agent.id,
                Agent.name,
                Agent.icon_url,
                func.count(ChatSession.id).label("sessions"),
                Agent.rating_avg,
            )
            .outerjoin(ChatSession, ChatSession.agent_id == Agent.id)
            .where(
                Agent.tenant_id == tid,
                Agent.status == "published",
            )
            .group_by(Agent.id)
            .order_by(func.count(ChatSession.id).desc())
            .limit(10)
        )
    ).all()
    top_agents = [
        {
            "id": str(row.id),
            "name": row.name,
            "icon_url": row.icon_url,
            "sessions": row.sessions,
            "rating": float(row.rating_avg or 0),
        }
        for row in top_rows
    ]

    return {
        "total_agents": total_agents or 0,
        "published_agents": published_agents or 0,
        "active_users": active_users or 0,
        "total_sessions": total_sessions or 0,
        "today_sessions": today_sessions or 0,
        "total_messages": total_messages or 0,
        "total_tokens": total_tokens or 0,
        "avg_satisfaction": avg_satisfaction,
        "platform_distribution": platform_distribution,
        "top_agents": top_agents,
    }


# ── Agent 使用统计 ──

async def get_agent_stats(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    sort_by: str = "sessions",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """返回每个 Agent 的使用统计数据（分页）"""
    tid = _to_uuid(tenant_id)

    # 子查询：每个 Agent 的会话数和消息数
    session_sub = (
        select(
            ChatSession.agent_id,
            func.count(ChatSession.id).label("sessions"),
            func.count(ChatMessage.id).label("messages"),
        )
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.tenant_id == tid)
        .group_by(ChatSession.agent_id)
    ).subquery("session_sub")

    # 子查询：每个 Agent 的 Token 消耗
    usage_sub = (
        select(
            UsageRecord.agent_id,
            func.coalesce(
                func.sum(UsageRecord.tokens_prompt + UsageRecord.tokens_completion), 0
            ).label("tokens"),
        )
        .where(UsageRecord.tenant_id == tid)
        .group_by(UsageRecord.agent_id)
    ).subquery("usage_sub")

    # 子查询：每个 Agent 的安装数
    install_sub = (
        select(
            AgentInstallation.agent_id,
            func.count(AgentInstallation.id).label("installations"),
        )
        .where(AgentInstallation.tenant_id == tid)
        .group_by(AgentInstallation.agent_id)
    ).subquery("install_sub")

    # 日期过滤条件（仅在需要时应用）
    date_conditions = []
    if start_date:
        date_conditions.append(func.date(ChatSession.created_at) >= start_date)
    if end_date:
        date_conditions.append(func.date(ChatSession.created_at) <= end_date)

    # 如果指定了日期范围，重新计算带有日期过滤的会话/消息子查询
    if date_conditions:
        session_sub_date = (
            select(
                ChatSession.agent_id,
                func.count(ChatSession.id).label("sessions"),
                func.count(ChatMessage.id).label("messages"),
            )
            .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .where(ChatSession.tenant_id == tid, and_(*date_conditions))
            .group_by(ChatSession.agent_id)
        ).subquery("session_sub_date")
        session_sub = session_sub_date

    # 排序映射
    sort_map = {
        "sessions": session_sub.c.sessions,
        "messages": session_sub.c.messages,
        "tokens": usage_sub.c.tokens,
        "installations": install_sub.c.installations,
    }
    order_col = sort_map.get(sort_by, session_sub.c.sessions)
    order = order_col.desc()

    # 总数
    count_query = select(func.count(Agent.id)).where(Agent.tenant_id == tid)
    total = (await db.scalar(count_query)) or 0

    # 主查询
    main_query = (
        select(
            Agent.id.label("agent_id"),
            Agent.name.label("agent_name"),
            Agent.platform_type,
            Agent.icon_url,
            func.coalesce(session_sub.c.sessions, 0).label("sessions"),
            func.coalesce(session_sub.c.messages, 0).label("messages"),
            func.coalesce(usage_sub.c.tokens, 0).label("tokens"),
            func.coalesce(install_sub.c.installations, 0).label("installations"),
            func.coalesce(Agent.rating_avg, 0).label("avg_rating"),
        )
        .outerjoin(session_sub, Agent.id == session_sub.c.agent_id)
        .outerjoin(usage_sub, Agent.id == usage_sub.c.agent_id)
        .outerjoin(install_sub, Agent.id == install_sub.c.agent_id)
        .where(Agent.tenant_id == tid)
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(main_query)).all()

    items = []
    for row in rows:
        items.append(
            {
                "agent_id": str(row.agent_id),
                "agent_name": row.agent_name,
                "platform_type": row.platform_type,
                "icon_url": row.icon_url,
                "sessions": row.sessions,
                "messages": row.messages,
                "tokens": row.tokens,
                "installations": row.installations,
                "avg_rating": float(row.avg_rating or 0),
            }
        )

    return items, total


# ── 用户活跃统计 ──

async def get_user_stats(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """返回每个用户的使用统计数据（分页）"""
    tid = _to_uuid(tenant_id)

    date_conditions = []
    if start_date:
        date_conditions.append(func.date(ChatSession.created_at) >= start_date)
    if end_date:
        date_conditions.append(func.date(ChatSession.created_at) <= end_date)

    # 子查询：每个用户的会话数和消息数
    session_sub = (
        select(
            ChatSession.user_id,
            func.count(ChatSession.id).label("sessions"),
            func.count(ChatMessage.id).label("messages"),
            func.max(ChatSession.last_message_at).label("last_active"),
        )
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.tenant_id == tid, *([and_(*date_conditions)] if date_conditions else []))
        .group_by(ChatSession.user_id)
    ).subquery("user_session_sub")

    # 子查询：每个用户的 Token 消耗
    usage_sub = (
        select(
            UsageRecord.user_id,
            func.coalesce(
                func.sum(UsageRecord.tokens_prompt + UsageRecord.tokens_completion), 0
            ).label("tokens"),
        )
        .where(UsageRecord.tenant_id == tid)
        .group_by(UsageRecord.user_id)
    ).subquery("user_usage_sub")

    # 总数
    count_query = select(func.count(User.id)).where(User.tenant_id == tid)
    total = (await db.scalar(count_query)) or 0

    # 主查询
    main_query = (
        select(
            User.id.label("user_id"),
            User.username,
            User.display_name,
            func.coalesce(session_sub.c.sessions, 0).label("sessions"),
            func.coalesce(session_sub.c.messages, 0).label("messages"),
            func.coalesce(usage_sub.c.tokens, 0).label("tokens"),
            session_sub.c.last_active,
        )
        .outerjoin(session_sub, User.id == session_sub.c.user_id)
        .outerjoin(usage_sub, User.id == usage_sub.c.user_id)
        .where(User.tenant_id == tid)
        .order_by(session_sub.c.sessions.desc().nulls_last())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(main_query)).all()

    items = []
    for row in rows:
        items.append(
            {
                "user_id": str(row.user_id),
                "username": row.username,
                "display_name": row.display_name,
                "sessions": row.sessions,
                "messages": row.messages,
                "tokens": row.tokens,
                "last_active": row.last_active.isoformat() if row.last_active else None,
            }
        )

    return items, total


# ── 时间线概览 ──

async def get_timeline_overview(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    days: int = 30,
) -> list[dict]:
    """返回指定天数内的每日聚合统计"""
    tid = _to_uuid(tenant_id)
    since = date.today() - timedelta(days=days)

    # 每日会话数
    session_daily = (
        select(
            func.date(ChatSession.created_at).label("date"),
            func.count(ChatSession.id).label("sessions"),
        )
        .where(
            ChatSession.tenant_id == tid,
            func.date(ChatSession.created_at) >= since,
        )
        .group_by(func.date(ChatSession.created_at))
    ).subquery("session_daily")

    # 每日消息数
    message_daily = (
        select(
            func.date(ChatMessage.created_at).label("date"),
            func.count(ChatMessage.id).label("messages"),
        )
        .where(
            ChatMessage.tenant_id == tid,
            func.date(ChatMessage.created_at) >= since,
        )
        .group_by(func.date(ChatMessage.created_at))
    ).subquery("message_daily")

    # 每日 Token 消耗
    token_daily = (
        select(
            func.date(UsageRecord.created_at).label("date"),
            func.coalesce(
                func.sum(UsageRecord.tokens_prompt + UsageRecord.tokens_completion), 0
            ).label("tokens"),
        )
        .where(
            UsageRecord.tenant_id == tid,
            func.date(UsageRecord.created_at) >= since,
        )
        .group_by(func.date(UsageRecord.created_at))
    ).subquery("token_daily")

    # 合并
    result = await db.execute(
        select(
            session_daily.c.date,
            func.coalesce(session_daily.c.sessions, 0).label("sessions"),
            func.coalesce(message_daily.c.messages, 0).label("messages"),
            func.coalesce(token_daily.c.tokens, 0).label("tokens"),
        )
        .outerjoin(message_daily, session_daily.c.date == message_daily.c.date)
        .outerjoin(token_daily, session_daily.c.date == token_daily.c.date)
        .order_by(session_daily.c.date.asc())
    )
    rows = result.all()

    return [
        {"date": str(row.date), "sessions": row.sessions, "messages": row.messages, "tokens": row.tokens}
        for row in rows
    ]


# ── 审计日志 ──

async def list_audit_logs(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    *,
    page: int = 1,
    page_size: int = 20,
    user_id: str | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> tuple[list[dict], int]:
    """分页查询审计日志，支持多条件筛选"""
    tid = _to_uuid(tenant_id)
    conditions = [AuditLog.tenant_id == tid]

    if user_id:
        conditions.append(AuditLog.user_id == _to_uuid(user_id))
    if action:
        conditions.append(AuditLog.action == action)
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if start_date:
        conditions.append(func.date(AuditLog.created_at) >= start_date)
    if end_date:
        conditions.append(func.date(AuditLog.created_at) <= end_date)

    where = and_(*conditions)

    count_result = await db.scalar(select(func.count(AuditLog.id)).where(where))
    total = count_result or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(AuditLog)
        .where(where)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    logs = result.scalars().all()

    items = [
        {
            "id": log.id,
            "tenant_id": str(log.tenant_id) if log.tenant_id else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": str(log.resource_id) if log.resource_id else None,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "result": log.result,
            "created_at": log.created_at.isoformat() if log.created_at else "",
        }
        for log in logs
    ]

    return items, total


async def get_audit_log(db: AsyncSession, log_id: int, tenant_id: uuid.UUID | str) -> dict:
    """获取单条审计日志详情（租户隔离）"""
    tid = _to_uuid(tenant_id)
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id, AuditLog.tenant_id == tid)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise NotFoundException(resource="审计日志", identifier=str(log_id))

    return {
        "id": log.id,
        "tenant_id": str(log.tenant_id) if log.tenant_id else None,
        "user_id": str(log.user_id) if log.user_id else None,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": str(log.resource_id) if log.resource_id else None,
        "detail": log.detail,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "result": log.result,
        "created_at": log.created_at.isoformat() if log.created_at else "",
    }


async def get_audit_logs_csv(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> str:
    """导出审计日志为 CSV 格式，返回 CSV 字符串"""
    tid = _to_uuid(tenant_id)
    conditions = [AuditLog.tenant_id == tid]

    if start_date:
        conditions.append(func.date(AuditLog.created_at) >= start_date)
    if end_date:
        conditions.append(func.date(AuditLog.created_at) <= end_date)

    result = await db.execute(
        select(AuditLog)
        .where(and_(*conditions))
        .order_by(AuditLog.created_at.desc())
    )
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "tenant_id", "user_id", "action", "resource_type",
        "resource_id", "detail", "ip_address", "user_agent", "result", "created_at",
    ])
    for log in logs:
        writer.writerow([
            log.id,
            str(log.tenant_id) if log.tenant_id else "",
            str(log.user_id) if log.user_id else "",
            log.action,
            log.resource_type,
            str(log.resource_id) if log.resource_id else "",
            log.detail,
            log.ip_address or "",
            log.user_agent or "",
            log.result,
            log.created_at.isoformat() if log.created_at else "",
        ])

    return output.getvalue()
