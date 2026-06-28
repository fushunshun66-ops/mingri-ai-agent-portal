"""monitor 服务测试 fixtures——准备测试数据"""

from datetime import datetime, timedelta, timezone

import pytest_asyncio
from sqlalchemy import insert

from common.shared_models import AuditLog, ChatMessage, ChatSession, UsageRecord
from agents.models import Agent, AgentInstallation


def _now():
    return datetime.now(timezone.utc)


@pytest_asyncio.fixture
async def test_chat_session(db_session, test_tenant, test_user, test_admin, admin_auth_headers, async_client):
    """创建测试 Agent 和会话数据"""
    agent = Agent(
        tenant_id=test_tenant.id,
        owner_id=test_admin.id,
        name="测试智能助手",
        description="用于统计测试",
        platform_type="dify",
        status="published",
        install_count=3,
        rating_avg=4.5,
        review_count=2,
    )
    db_session.add(agent)
    await db_session.flush()

    agent2 = Agent(
        tenant_id=test_tenant.id,
        owner_id=test_admin.id,
        name="数据分析 Agent",
        description="数据分析用",
        platform_type="n8n",
        status="published",
        install_count=5,
        rating_avg=4.2,
        review_count=3,
    )
    db_session.add(agent2)

    agent3 = Agent(
        tenant_id=test_tenant.id,
        owner_id=test_admin.id,
        name="Draft Agent",
        description="草稿中的 Agent",
        platform_type="builtin",
        status="draft",
        install_count=0,
        rating_avg=0.0,
        review_count=0,
    )
    db_session.add(agent3)
    await db_session.flush()

    sessions = []
    for i in range(5):
        session = ChatSession(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            agent_id=agent.id if i < 3 else agent2.id,
            title=f"会话 {i+1}",
            status="active",
            message_count=3,
            first_message_at=_now() - timedelta(days=i),
            last_message_at=_now() - timedelta(hours=i),
        )
        db_session.add(session)
        sessions.append(session)

    await db_session.flush()
    return {
        "agent": agent,
        "agent2": agent2,
        "agent3": agent3,
        "sessions": sessions,
    }


@pytest_asyncio.fixture
async def test_messages(db_session, test_chat_session):
    """创建测试消息数据"""
    sessions = test_chat_session["sessions"]
    messages = []
    for session in sessions:
        for j in range(3):
            msg = ChatMessage(
                tenant_id=session.tenant_id,
                session_id=session.id,
                role="user" if j % 2 == 0 else "assistant",
                content=f"消息内容 {j+1}",
                content_type="text",
                feedback="like" if j == 0 else None,
                created_at=session.first_message_at + timedelta(minutes=j),
            )
            db_session.add(msg)
            messages.append(msg)
    await db_session.flush()
    return messages


@pytest_asyncio.fixture
async def test_usage_records(db_session, test_chat_session):
    """创建使用记录数据（手动分配 ID，因 SQLite 不支持 BigInteger autoincrement）"""
    data = test_chat_session
    agent = data["agent"]
    agent2 = data["agent2"]
    sessions = data["sessions"]
    records = []
    for i, session in enumerate(sessions):
        aid = agent.id if i < 3 else agent2.id
        values = {
            "id": i + 1,
            "tenant_id": session.tenant_id,
            "user_id": session.user_id,
            "agent_id": aid,
            "session_id": session.id,
            "action": "chat",
            "tokens_prompt": 100 + i * 20,
            "tokens_completion": 200 + i * 30,
            "duration_ms": 1000 + i * 100,
            "created_at": session.first_message_at,
        }
        stmt = insert(UsageRecord).values(**values)
        await db_session.execute(stmt)
        records.append(values)
    await db_session.flush()
    return records


@pytest_asyncio.fixture
async def test_audit_logs(db_session, test_chat_session, test_user, test_admin):
    """创建审计日志数据（手动分配 ID，因 SQLite 不支持 BigInteger autoincrement）"""
    data = test_chat_session
    agent = data["agent"]
    logs = []
    for i in range(8):
        values = {
            "id": i + 1,
            "tenant_id": agent.tenant_id,
            "user_id": test_user.id if i < 6 else test_admin.id,
            "action": "CREATE" if i < 3 else "READ" if i < 5 else "UPDATE" if i < 7 else "DELETE",
            "resource_type": "agent" if i < 4 else "session" if i < 6 else "connection",
            "resource_id": agent.id if i < 4 else data["sessions"][0].id,
            "detail": {"ip": "192.168.1.1"} if i < 3 else None,
            "ip_address": "192.168.1.1" if i < 3 else "10.0.0.1",
            "user_agent": "Mozilla/5.0" if i < 5 else "curl/7.68.0",
            "result": "success" if i < 7 else "failure",
            "created_at": _now() - timedelta(days=i),
        }
        stmt = insert(AuditLog).values(**values)
        await db_session.execute(stmt)
        logs.append(values)
    await db_session.flush()
    return logs


@pytest_asyncio.fixture
async def test_installations(db_session, test_chat_session, test_user):
    """创建安装记录"""
    data = test_chat_session
    installs = []
    for agent in [data["agent"], data["agent2"]]:
        install = AgentInstallation(
            tenant_id=agent.tenant_id,
            user_id=test_user.id,
            agent_id=agent.id,
        )
        db_session.add(install)
        installs.append(install)
    await db_session.flush()
    return installs
