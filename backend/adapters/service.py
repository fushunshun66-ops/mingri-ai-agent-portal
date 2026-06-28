"""adapters 服务业务逻辑层"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.models import PlatformConnection
from adapters.schemas import ConnectionCreateRequest, ConnectionUpdateRequest
from common.exceptions import NotFoundException
from common.security import decrypt_api_key, encrypt_api_key


def _to_uuid(v: uuid.UUID | str) -> uuid.UUID:
    if isinstance(v, str):
        return uuid.UUID(v)
    return v


async def create_connection(
    db: AsyncSession, tenant_id: uuid.UUID | str, req: ConnectionCreateRequest
) -> PlatformConnection:
    config = req.config or {}
    if "api_key" in config and config["api_key"]:
        config["api_key_encrypted"] = encrypt_api_key(config.pop("api_key"))
    if "webhook_secret" in config and config.get("webhook_secret"):
        config["webhook_secret_encrypted"] = encrypt_api_key(config.pop("webhook_secret"))

    conn = PlatformConnection(
        tenant_id=_to_uuid(tenant_id),
        name=req.name,
        platform_type=req.platform_type,
        config=config,
        status=req.status,
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn


async def get_connection(
    db: AsyncSession, conn_id: uuid.UUID | str, tenant_id: uuid.UUID | str
) -> PlatformConnection:
    result = await db.execute(
        select(PlatformConnection).where(
            PlatformConnection.id == _to_uuid(conn_id),
            PlatformConnection.tenant_id == _to_uuid(tenant_id),
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise NotFoundException(resource="平台连接", identifier=str(conn_id))
    return conn


async def list_connections(
    db: AsyncSession, tenant_id: uuid.UUID | str, page: int, page_size: int
) -> tuple[list[PlatformConnection], int]:
    tid = _to_uuid(tenant_id)
    where = PlatformConnection.tenant_id == tid

    count_result = await db.execute(
        select(func.count(PlatformConnection.id)).where(where)
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(PlatformConnection)
        .where(where)
        .order_by(PlatformConnection.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


async def update_connection(
    db: AsyncSession, conn_id: uuid.UUID | str, tenant_id: uuid.UUID | str, req: ConnectionUpdateRequest
) -> PlatformConnection:
    conn = await get_connection(db, conn_id, tenant_id)

    if req.name is not None:
        conn.name = req.name
    if req.status is not None:
        conn.status = req.status
    if req.config is not None:
        config = req.config
        if "api_key" in config and config["api_key"]:
            config["api_key_encrypted"] = encrypt_api_key(config.pop("api_key"))
        if "webhook_secret" in config and config.get("webhook_secret"):
            config["webhook_secret_encrypted"] = encrypt_api_key(config.pop("webhook_secret"))
        existing_config = conn.config or {}
        existing_config.update(config)
        conn.config = existing_config

    await db.flush()
    await db.refresh(conn)
    return conn


async def delete_connection(
    db: AsyncSession, conn_id: uuid.UUID | str, tenant_id: uuid.UUID | str
) -> None:
    conn = await get_connection(db, conn_id, tenant_id)
    conn.status = "disabled"
    await db.flush()


def sanitize_config_for_response(config: dict | None) -> dict | None:
    """移除加密字段，返回安全的配置"""
    if not config:
        return config
    safe = dict(config)
    safe.pop("api_key_encrypted", None)
    safe.pop("webhook_secret_encrypted", None)
    return safe
