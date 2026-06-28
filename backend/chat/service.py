"""chat 服务业务逻辑层"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.exceptions import NotFoundException
from common.redis import cache_list_get, cache_list_push
from common.shared_models import ChatMessage, ChatSession


def _to_uuid(v: uuid.UUID | str) -> uuid.UUID:
    if isinstance(v, str):
        return uuid.UUID(v)
    return v


# ── 会话管理 ──
async def create_session(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    user_id: uuid.UUID | str,
    agent_id: uuid.UUID | str,
    title: str | None = None,
) -> ChatSession:
    """创建对话会话"""
    # 验证 agent 存在
    from agents.models import Agent
    agent_result = await db.execute(
        select(Agent).where(
            Agent.id == _to_uuid(agent_id),
            Agent.tenant_id == _to_uuid(tenant_id),
        )
    )
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise NotFoundException(resource="Agent", identifier=str(agent_id))

    session = ChatSession(
        tenant_id=_to_uuid(tenant_id),
        user_id=_to_uuid(user_id),
        agent_id=_to_uuid(agent_id),
        title=title,
        status="active",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_session(
    db: AsyncSession,
    session_id: uuid.UUID | str,
    tenant_id: uuid.UUID | str,
) -> ChatSession:
    """获取会话详情"""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == _to_uuid(session_id),
            ChatSession.tenant_id == _to_uuid(tenant_id),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundException(resource="会话", identifier=str(session_id))
    return session


async def list_sessions(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    user_id: uuid.UUID | str,
) -> list[ChatSession]:
    """获取当前用户的会话列表，按 last_message_at 倒序"""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.tenant_id == _to_uuid(tenant_id),
            ChatSession.user_id == _to_uuid(user_id),
        )
        .order_by(ChatSession.last_message_at.desc().nullslast(), ChatSession.created_at.desc())
    )
    return result.scalars().all()


async def update_session(
    db: AsyncSession,
    session_id: uuid.UUID | str,
    tenant_id: uuid.UUID | str,
    title: str | None = None,
    status: str | None = None,
) -> ChatSession:
    """更新会话（标题、状态）"""
    session = await get_session(db, session_id, tenant_id)
    if title is not None:
        session.title = title
    if status is not None:
        session.status = status
    await db.flush()
    await db.refresh(session)
    return session


async def archive_session(
    db: AsyncSession,
    session_id: uuid.UUID | str,
    tenant_id: uuid.UUID | str,
) -> ChatSession:
    """归档会话"""
    return await update_session(db, session_id, tenant_id, status="archived")


# ── 消息管理 ──
async def send_message(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    user_id: uuid.UUID | str,
    session_id: uuid.UUID | str,
    content: str,
) -> dict:
    """发送消息并生成 mock 助手回复"""
    session = await get_session(db, session_id, tenant_id)
    now = datetime.now(timezone.utc)

    # 1. 保存用户消息和助手回复（同一事务）
    user_msg = ChatMessage(
        tenant_id=_to_uuid(tenant_id),
        session_id=session.id,
        role="user",
        content=content,
        created_at=now,
    )

    # 2. 生成 mock 助手回复
    assistant_reply = _mock_assistant_reply(content)

    assistant_msg = ChatMessage(
        tenant_id=_to_uuid(tenant_id),
        session_id=session.id,
        role="assistant",
        content=assistant_reply,
        created_at=now,
    )
    db.add_all([user_msg, assistant_msg])

    # 4. 更新 session 计数和时间
    session.message_count = (session.message_count or 0) + 2
    if session.first_message_at is None:
        session.first_message_at = now
    session.last_message_at = now

    await db.flush()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    # 5. 写入 Redis 热缓存
    await _cache_message(session.id, user_msg)
    await _cache_message(session.id, assistant_msg)

    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
    }


async def get_messages(
    db: AsyncSession,
    tenant_id: uuid.UUID | str,
    session_id: uuid.UUID | str,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ChatMessage], int]:
    """获取消息历史（分页），优先 Redis 后回退 PostgreSQL"""
    session = await get_session(db, session_id, tenant_id)

    # 尝试从 Redis 读取
    cache_key = f"chat:session:{session.id}:messages"
    cached = await cache_list_get(cache_key)
    if cached:
        # 从缓存中恢复为 ChatMessage 对象列表
        messages = []
        for item in cached:
            msg = ChatMessage(
                id=_to_uuid(item["id"]),
                tenant_id=_to_uuid(item["tenant_id"]),
                session_id=_to_uuid(item["session_id"]),
                role=item["role"],
                content=item["content"],
                content_type=item.get("content_type", "text"),
                feedback=item.get("feedback"),
                created_at=datetime.fromisoformat(item["created_at"]) if item.get("created_at") else None,
            )
            messages.append(msg)
        # 按时间排序
        messages.sort(key=lambda m: m.created_at or datetime.min, reverse=True)
        total = len(messages)
        start = (page - 1) * page_size
        end = start + page_size
        return messages[start:end], total

    # 回退 PostgreSQL
    where = and_(
        ChatMessage.session_id == session.id,
        ChatMessage.tenant_id == _to_uuid(tenant_id),
    )
    count_result = await db.execute(select(func.count(ChatMessage.id)).where(where))
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(ChatMessage)
        .where(where)
        .order_by(ChatMessage.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


async def set_message_feedback(
    db: AsyncSession,
    message_id: uuid.UUID | str,
    tenant_id: uuid.UUID | str,
    feedback: str,
) -> ChatMessage:
    """给消息添加 like/dislike 反馈"""
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.id == _to_uuid(message_id),
            ChatMessage.tenant_id == _to_uuid(tenant_id),
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise NotFoundException(resource="消息", identifier=str(message_id))
    msg.feedback = feedback
    await db.flush()
    await db.refresh(msg)
    return msg


# ── 流式对话（mock） ──
async def generate_stream(
    session_id: uuid.UUID,
    message: str,
    db: AsyncSession | None = None,
    tenant_id: uuid.UUID | str | None = None,
    user_id: uuid.UUID | str | None = None,
):
    """生成 SSE 流式输出事件并持久化消息。

    Phase 2 mock 实现：逐字输出预设文本，模拟打字机效果。
    Phase 3 通过适配器框架替换为真实平台流式输出。

    当提供 db 参数时，会自动保存用户消息和助手回复到数据库。
    """
    import asyncio
    import json

    now = datetime.now(timezone.utc)

    # 持久化用户消息
    if db is not None and tenant_id is not None and user_id is not None:
        user_msg = ChatMessage(
            tenant_id=_to_uuid(tenant_id),
            session_id=session_id,
            role="user",
            content=message,
            created_at=now,
        )
        db.add(user_msg)
        await db.flush()

    reply = _mock_assistant_reply(message)

    # 更新 session 计数
    if db is not None:
        from sqlalchemy import select as _select
        from common.shared_models import ChatSession as _ChatSession
        session_result = await db.execute(
            _select(_ChatSession).where(_ChatSession.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        if session:
            session.message_count = (session.message_count or 0) + 2
            if session.first_message_at is None:
                session.first_message_at = now
            session.last_message_at = now

    for i, char in enumerate(reply):
        chunk = {
            "id": str(uuid.uuid4()),
            "object": "chat.completion.chunk",
            "created": int(datetime.now(timezone.utc).timestamp()),
            "choices": [{"index": 0, "delta": {"content": char}, "finish_reason": None}],
        }
        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.02)

    # 持久化助手回复
    if db is not None and tenant_id is not None and user_id is not None:
        assistant_msg = ChatMessage(
            tenant_id=_to_uuid(tenant_id),
            session_id=session_id,
            role="assistant",
            content=reply,
            created_at=now,
        )
        db.add(assistant_msg)
        await db.flush()

    yield "data: [DONE]\n\n"


# ── 内部辅助 ──
_MOCK_REPLIES = [
    "您好！我已经收到了您的消息，正在为您处理中。",
    "根据您的需求，我已经完成了分析。这是一份详细的回复，涵盖了您提到的所有要点。如果您还有任何疑问，请随时提出。",
    "感谢您的提问！关于这个问题，我的理解是：首先需要明确需求背景，然后逐步分解问题，最后给出针对性建议。",
    "好的，我来帮您解答。这个问题的关键在于理解核心逻辑，让我为您详细说明一下。",
    "明白了，让我为您整理一份完整的答案。以下是相关信息的汇总和分析。",
]


def _mock_assistant_reply(message: str) -> str:
    """根据消息长度选取 mock 回复"""
    # 简单规则选回复
    idx = len(message) % len(_MOCK_REPLIES)
    return _MOCK_REPLIES[idx]


async def _cache_message(session_id: uuid.UUID | str, msg: ChatMessage) -> None:
    """将消息写入 Redis 热缓存（失败时静默忽略）"""
    import logging
    logger = logging.getLogger(__name__)
    try:
        key = f"chat:session:{session_id}:messages"
        data = {
            "id": str(msg.id),
            "tenant_id": str(msg.tenant_id),
            "session_id": str(msg.session_id),
            "role": msg.role,
            "content": msg.content,
            "content_type": msg.content_type,
            "feedback": msg.feedback,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        await cache_list_push(key, data, max_len=50, ttl=86400)
    except Exception:
        logger.debug("Redis 缓存写入失败，消息已持久化到 PostgreSQL", exc_info=True)
