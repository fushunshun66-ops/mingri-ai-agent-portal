"""agents 服务 API 路由"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from agents.schemas import (
    AgentCreateRequest,
    AgentListQuery,
    AgentResponse,
    AgentUpdateRequest,
    CategoryResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from agents.service import (
    create_agent,
    create_review,
    delete_agent,
    get_agent,
    get_categories,
    get_favorites,
    get_my_agents,
    get_recent,
    get_recommended,
    get_reviews,
    install_agent,
    list_agents,
    resolve_icon_urls,
    seed_default_categories,
    toggle_favorite,
    uninstall_agent,
    update_agent,
    upload_agent_icon,
)
from common.database import get_db
from common.dependencies import get_current_user
from common.schemas import ok, paginated_ok

router = APIRouter(prefix="/api/v1", tags=["Agent 管理 & 市场"])


# ── 分类 ──
@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    await seed_default_categories(db)
    cats = await get_categories(db)
    return ok(data=[CategoryResponse.model_validate(c).model_dump(mode="json") for c in cats])


# ── Agent CRUD ──
@router.post("/agents")
async def create_agent_endpoint(
    req: AgentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await seed_default_categories(db)
    agent = await create_agent(db, current_user["tenant_id"], current_user["id"], req)
    await resolve_icon_urls(agent)
    return ok(
        data=AgentResponse.model_validate(agent).model_dump(mode="json"),
        message="Agent 创建成功",
    )


@router.get("/agents")
async def list_agents_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    category_id: UUID | None = None,
    platform_type: str | None = None,
    tags: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = AgentListQuery(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        category_id=category_id,
        platform_type=platform_type,
        tags=tags,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    agents, total = await list_agents(db, current_user["tenant_id"], query)
    await resolve_icon_urls(agents)
    return paginated_ok(
        data=[AgentResponse.model_validate(a).model_dump(mode="json") for a in agents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/agents/my")
async def my_agents_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agents, total = await get_my_agents(
        db, current_user["tenant_id"], current_user["id"], page, page_size
    )
    await resolve_icon_urls(agents)
    return paginated_ok(
        data=[AgentResponse.model_validate(a).model_dump(mode="json") for a in agents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/agents/favorites")
async def get_favorites_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agents = await get_favorites(db, current_user["tenant_id"], current_user["id"])
    await resolve_icon_urls(agents)
    return ok(
        data=[AgentResponse.model_validate(a).model_dump(mode="json") for a in agents],
    )


@router.get("/agents/recommended")
async def recommended_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agents = await get_recommended(db, current_user["tenant_id"], current_user["id"])
    await resolve_icon_urls(agents)
    return ok(
        data=[AgentResponse.model_validate(a).model_dump(mode="json") for a in agents],
    )


@router.get("/agents/recent")
async def recent_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agents = await get_recent(db, current_user["tenant_id"], current_user["id"])
    await resolve_icon_urls(agents)
    return ok(
        data=[AgentResponse.model_validate(a).model_dump(mode="json") for a in agents],
    )


@router.get("/agents/{agent_id}")
async def get_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agent = await get_agent(db, agent_id, current_user["tenant_id"])
    await resolve_icon_urls(agent)
    return ok(data=AgentResponse.model_validate(agent).model_dump(mode="json"))


@router.put("/agents/{agent_id}")
async def update_agent_endpoint(
    agent_id: UUID,
    req: AgentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    agent = await update_agent(db, agent_id, current_user["tenant_id"], req)
    await resolve_icon_urls(agent)
    return ok(
        data=AgentResponse.model_validate(agent).model_dump(mode="json"),
        message="Agent 更新成功",
    )


@router.delete("/agents/{agent_id}")
async def delete_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await delete_agent(db, agent_id, current_user["tenant_id"])
    return ok(message="Agent 已归档")


# ── 安装/卸载 ──
@router.post("/agents/{agent_id}/install")
async def install_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    install = await install_agent(
        db, current_user["tenant_id"], current_user["id"], agent_id
    )
    return ok(
        data={"id": str(install.id), "agent_id": str(install.agent_id), "installed_at": install.installed_at.isoformat() if install.installed_at else None},
        message="安装成功",
    )


@router.delete("/agents/{agent_id}/install")
async def uninstall_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await uninstall_agent(db, current_user["id"], agent_id)
    return ok(message="卸载成功")


# ── 评论 ──
@router.post("/agents/{agent_id}/reviews")
async def create_review_endpoint(
    agent_id: UUID,
    req: ReviewCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    review = await create_review(
        db, current_user["tenant_id"], current_user["id"],
        agent_id, req.rating, req.comment,
    )
    return ok(
        data=ReviewResponse.model_validate(review).model_dump(mode="json"),
        message="评价成功",
    )


@router.get("/agents/{agent_id}/reviews")
async def get_reviews_endpoint(
    agent_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    reviews, total = await get_reviews(db, agent_id, page, page_size)
    return paginated_ok(
        data=[ReviewResponse.model_validate(r).model_dump(mode="json") for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── 收藏 ──
@router.post("/agents/{agent_id}/favorite")
async def favorite_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    install = await toggle_favorite(db, current_user["id"], agent_id, True)
    return ok(
        data={"id": str(install.id), "agent_id": str(install.agent_id), "is_favorited": install.is_favorited},
        message="收藏成功",
    )


@router.delete("/agents/{agent_id}/favorite")
async def unfavorite_agent_endpoint(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    install = await toggle_favorite(db, current_user["id"], agent_id, False)
    return ok(
        data={"id": str(install.id), "agent_id": str(install.agent_id), "is_favorited": install.is_favorited},
        message="已取消收藏",
    )


# ── 图标上传 ──
@router.post("/agents/{agent_id}/icon")
async def upload_icon_endpoint(
    agent_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file_data = await file.read()
    agent = await upload_agent_icon(
        db, agent_id, current_user["tenant_id"],
        file_data, file.filename or "icon.png", file.content_type or "image/png",
    )
    await resolve_icon_urls(agent)
    return ok(
        data=AgentResponse.model_validate(agent).model_dump(mode="json"),
        message="图标上传成功",
    )
