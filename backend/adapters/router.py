"""adapters 服务 API 路由"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.schemas import (
    ConnectionCreateRequest,
    ConnectionResponse,
    ConnectionUpdateRequest,
)
from adapters.service import (
    create_connection,
    delete_connection,
    get_connection,
    list_connections,
    sanitize_config_for_response,
    update_connection,
)
from common.database import get_db
from common.dependencies import get_current_user
from common.schemas import ok, paginated_ok

router = APIRouter(prefix="/api/v1", tags=["平台连接"])


@router.post("/connections")
async def create_connection_endpoint(
    req: ConnectionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    conn = await create_connection(db, current_user["tenant_id"], req)
    data = ConnectionResponse.model_validate(conn).model_dump(mode="json")
    data["config"] = sanitize_config_for_response(conn.config)
    return ok(data=data, message="连接创建成功")


@router.get("/connections")
async def list_connections_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    conns, total = await list_connections(db, current_user["tenant_id"], page, page_size)
    return paginated_ok(
        data=[
            {**ConnectionResponse.model_validate(c).model_dump(mode="json"), "config": sanitize_config_for_response(c.config)}
            for c in conns
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/connections/{conn_id}")
async def get_connection_endpoint(
    conn_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    conn = await get_connection(db, conn_id, current_user["tenant_id"])
    data = ConnectionResponse.model_validate(conn).model_dump(mode="json")
    data["config"] = sanitize_config_for_response(conn.config)
    return ok(data=data)


@router.put("/connections/{conn_id}")
async def update_connection_endpoint(
    conn_id: UUID,
    req: ConnectionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    conn = await update_connection(db, conn_id, current_user["tenant_id"], req)
    data = ConnectionResponse.model_validate(conn).model_dump(mode="json")
    data["config"] = sanitize_config_for_response(conn.config)
    return ok(data=data, message="连接更新成功")


@router.delete("/connections/{conn_id}")
async def delete_connection_endpoint(
    conn_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await delete_connection(db, conn_id, current_user["tenant_id"])
    return ok(message="连接已禁用")
