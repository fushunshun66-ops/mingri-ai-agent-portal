"""users 服务业务逻辑层"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from common.exceptions import ConflictException, ForbiddenException, NotFoundException, UnauthorizedException
from common.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from users.models import Role, RolePermission, Tenant, User, UserRole
from users.schemas import RegisterRequest, TokenResponse, UserUpdateRequest


# ── 认证 ──
async def register(db: AsyncSession, req: RegisterRequest) -> dict:
    """用户注册：获取或创建租户 → 创建用户 → 分配默认角色"""
    slug = req.tenant_slug or req.username

    # 获取或创建租户
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()

    if not tenant:
        tenant = Tenant(
            name=req.tenant_name or f"{req.username}的企业",
            slug=slug,
            status="active",
        )
        db.add(tenant)
        await db.flush()

    # 检查用户名和邮箱在租户内的唯一性
    existing = await db.execute(
        select(User).where(
            User.tenant_id == tenant.id,
            (User.username == req.username) | (User.email == req.email),
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException(message="用户名或邮箱已存在")

    # 创建用户
    user = User(
        tenant_id=tenant.id,
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
        display_name=req.display_name or req.username,
        status="active",
    )
    db.add(user)
    await db.flush()

    # 创建默认角色
    role = await _ensure_role(db, tenant.id, "user", "普通用户", True)
    db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.flush()

    return {
        "user": user,
        "tenant": tenant,
    }


async def login(db: AsyncSession, username: str, password: str, tenant_slug: str) -> TokenResponse:
    """用户登录——在指定租户范围内查询用户"""
    # 先查租户
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise UnauthorizedException(message="用户名或密码错误")

    # 在租户范围内查用户
    result = await db.execute(
        select(User).where(
            User.tenant_id == tenant.id,
            User.username == username,
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise UnauthorizedException(message="用户名或密码错误")

    if user.status != "active":
        raise ForbiddenException(message="用户已被禁用")

    # 更新最后登录时间
    user.last_login_at = datetime.now(timezone.utc)

    # 获取用户角色
    role_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r for r in role_result.scalars().all()]

    access_token = create_access_token(
        sub=str(user.id), tenant_id=str(user.tenant_id), roles=roles
    )
    refresh_token = create_refresh_token(
        sub=str(user.id), tenant_id=str(user.tenant_id)
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=1800,
    )


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> TokenResponse:
    """刷新 Access Token"""
    try:
        payload = decode_token(refresh_token_str, expected_type="refresh")
        if payload.get("type") != "refresh":
            raise ValueError("无效的刷新令牌类型")
    except Exception:
        raise UnauthorizedException(message="刷新令牌无效或已过期")

    user_id_str = payload["sub"]
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
    user = result.scalar_one_or_none()
    if not user or user.status != "active":
        raise NotFoundException(resource="用户")

    role_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r for r in role_result.scalars().all()]

    new_access = create_access_token(
        sub=str(user.id), tenant_id=str(user.tenant_id), roles=roles
    )
    new_refresh = create_refresh_token(
        sub=str(user.id), tenant_id=str(user.tenant_id)
    )

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=1800,
    )


# ── 用户管理 ──
async def get_user(db: AsyncSession, user_id: uuid.UUID | str) -> User:
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(resource="用户", identifier=str(user_id))
    return user


async def update_user(db: AsyncSession, user_id: uuid.UUID | str, req: UserUpdateRequest) -> User:
    user = await get_user(db, user_id)
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession, user_id: uuid.UUID | str, old_password: str, new_password: str
) -> None:
    user = await get_user(db, user_id)
    if not verify_password(old_password, user.password_hash):
        raise ConflictException(message="原密码不正确")
    user.password_hash = hash_password(new_password)
    await db.flush()


async def get_user_roles(db: AsyncSession, user_id: uuid.UUID | str) -> list[str]:
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return [r for r in result.scalars().all()]


# ── 角色 ──
async def _ensure_role(
    db: AsyncSession, tenant_id: uuid.UUID, name: str, description: str, is_system: bool
) -> Role:
    result = await db.execute(
        select(Role).where(Role.tenant_id == tenant_id, Role.name == name)
    )
    role = result.scalar_one_or_none()
    if not role:
        role = Role(
            tenant_id=tenant_id,
            name=name,
            description=description,
            is_system=is_system,
        )
        db.add(role)
        await db.flush()
    return role


async def get_all_roles(db: AsyncSession, tenant_id: uuid.UUID) -> list[Role]:
    result = await db.execute(
        select(Role).where(
            (Role.tenant_id == tenant_id) | (Role.tenant_id.is_(None))
        )
    )
    return result.scalars().all()
