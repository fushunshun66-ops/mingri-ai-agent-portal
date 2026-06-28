"""users 服务 API 路由"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.dependencies import get_current_user
from common.schemas import ok
from users.schemas import (
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)
from users.service import (
    change_password,
    get_user,
    get_user_roles,
    login,
    refresh_access_token,
    register,
    update_user,
)

router = APIRouter(prefix="/api/v1", tags=["认证 & 用户"])


# ── 认证端点 ──
@router.post("/auth/register")
async def auth_register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await register(db, req)
    user = result["user"]
    return ok(
        data={
            "id": str(user.id),
            "tenant_id": str(user.tenant_id),
            "username": user.username,
            "email": user.email,
        },
        message="注册成功",
    )


@router.post("/auth/login")
async def auth_login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await login(db, req.username, req.password, req.tenant_slug)
    return ok(data=token.model_dump(), message="登录成功")


@router.post("/auth/refresh")
async def auth_refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token = await refresh_access_token(db, req.refresh_token)
    return ok(data=token.model_dump(), message="Token 刷新成功")


# ── 用户端点 ──
@router.get("/users/me")
async def users_me(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = await get_user(db, current_user["id"])
    roles = await get_user_roles(db, user.id)
    return ok(
        data=UserResponse(
            id=user.id,
            tenant_id=user.tenant_id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            status=user.status,
            roles=roles,
            created_at=user.created_at,
        ).model_dump(mode="json"),
        message="查询成功",
    )


@router.put("/users/me")
async def users_update_me(
    req: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = await update_user(db, current_user["id"], req)
    return ok(
        data=UserResponse(
            id=user.id,
            tenant_id=user.tenant_id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            status=user.status,
            created_at=user.created_at,
        ).model_dump(mode="json"),
        message="更新成功",
    )


@router.put("/users/me/password")
async def users_change_password(
    req: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await change_password(db, current_user["id"], req.old_password, req.new_password)
    return ok(message="密码修改成功")
