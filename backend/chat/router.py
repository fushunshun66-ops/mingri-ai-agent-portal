"""chat 服务 API 路由"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from chat.schemas import (
    FeedbackRequest,
    MessageResponse,
    MessageSendRequest,
    MessageSendResponse,
    SessionCreateRequest,
    SessionResponse,
    SessionUpdateRequest,
)
from chat.service import (
    archive_session,
    create_session,
    generate_stream,
    get_messages,
    get_session,
    list_sessions,
    send_message,
    set_message_feedback,
    update_session,
)
from common.database import get_db
from common.dependencies import get_current_user
from common.schemas import ok, paginated_ok

router = APIRouter(prefix="/api/v1", tags=["对话"])


# ── 会话端点 ──
@router.post("/chat/sessions")
async def create_session_endpoint(
    req: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    session = await create_session(
        db, current_user["tenant_id"], current_user["id"], req.agent_id, req.title
    )
    return ok(
        data=SessionResponse.model_validate(session).model_dump(mode="json"),
        message="会话创建成功",
    )


@router.get("/chat/sessions")
async def list_sessions_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    sessions = await list_sessions(db, current_user["tenant_id"], current_user["id"])
    return ok(
        data=[SessionResponse.model_validate(s).model_dump(mode="json") for s in sessions],
    )


@router.get("/chat/sessions/{session_id}")
async def get_session_endpoint(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    session = await get_session(db, session_id, current_user["tenant_id"])
    return ok(data=SessionResponse.model_validate(session).model_dump(mode="json"))


@router.put("/chat/sessions/{session_id}")
async def update_session_endpoint(
    session_id: UUID,
    req: SessionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    session = await update_session(
        db, session_id, current_user["tenant_id"], req.title, req.status
    )
    return ok(
        data=SessionResponse.model_validate(session).model_dump(mode="json"),
        message="会话更新成功",
    )


@router.delete("/chat/sessions/{session_id}")
async def archive_session_endpoint(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    session = await archive_session(db, session_id, current_user["tenant_id"])
    return ok(
        data=SessionResponse.model_validate(session).model_dump(mode="json"),
        message="会话已归档",
    )


# ── 消息端点 ──
@router.post("/chat/sessions/{session_id}/messages")
async def send_message_endpoint(
    session_id: UUID,
    req: MessageSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await send_message(
        db, current_user["tenant_id"], current_user["id"], session_id, req.content
    )
    user_msg = MessageResponse.model_validate(result["user_message"])
    assistant_msg = MessageResponse.model_validate(result["assistant_message"])
    return ok(
        data=MessageSendResponse(
            user_message=user_msg,
            assistant_message=assistant_msg,
        ).model_dump(mode="json"),
        message="发送成功",
    )


@router.get("/chat/sessions/{session_id}/messages")
async def get_messages_endpoint(
    session_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    messages, total = await get_messages(
        db, current_user["tenant_id"], session_id, page, page_size
    )
    return paginated_ok(
        data=[MessageResponse.model_validate(m).model_dump(mode="json") for m in messages],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/chat/messages/{message_id}/feedback")
async def feedback_endpoint(
    message_id: UUID,
    req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msg = await set_message_feedback(
        db, message_id, current_user["tenant_id"], req.feedback
    )
    return ok(
        data=MessageResponse.model_validate(msg).model_dump(mode="json"),
        message="反馈已记录",
    )


# ── SSE 流式端点 ──
@router.get("/chat/sessions/{session_id}/stream")
async def stream_endpoint(
    session_id: UUID,
    message: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """SSE 流式对话。Phase 2 mock 实现，phase 3 对接真实适配器。"""
    # 验证会话存在
    await get_session(db, session_id, current_user["tenant_id"])

    return StreamingResponse(
        generate_stream(
            session_id,
            message,
            db=db,
            tenant_id=current_user["tenant_id"],
            user_id=current_user["id"],
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
