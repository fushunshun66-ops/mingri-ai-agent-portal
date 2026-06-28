"""FastAPI 依赖注入：当前用户、当前租户、角色校验"""

import uuid
from typing import Optional

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.exceptions import ForbiddenException, UnauthorizedException


async def get_current_tenant_id(request: Request) -> Optional[str]:
    """从 JWT 中解析 tenant_id（由中间件注入到 request.state）"""
    tid = getattr(request.state, "tenant_id", None)
    if tid:
        return str(tid)
    return None


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """从 JWT 解析并加载当前用户"""
    user_id_str = getattr(request.state, "user_id", None)
    if not user_id_str:
        raise UnauthorizedException()

    # 转换为 UUID 对象
    try:
        user_id = uuid.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except (ValueError, AttributeError):
        raise UnauthorizedException()

    from users.models import User

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException(message="用户不存在或已被禁用")
    if user.status != "active":
        raise ForbiddenException(message="用户已被禁用")

    return {
        "id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "status": user.status,
        "roles": getattr(request.state, "roles", []),
    }


def require_role(*roles: str):
    """要求用户具有指定角色之一"""

    async def checker(request: Request) -> bool:
        user_roles = getattr(request.state, "roles", [])
        if not set(roles) & set(user_roles):
            raise ForbiddenException(message="需要更高权限")
        return True

    return Depends(checker)
