"""agents 服务业务逻辑层"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agents.models import Agent, AgentInstallation, AgentReview, Category
from agents.schemas import AgentCreateRequest, AgentListQuery, AgentUpdateRequest
from common.exceptions import ConflictException, ForbiddenException, NotFoundException
from sqlalchemy.exc import IntegrityError


def _to_uuid(v: uuid.UUID | str) -> uuid.UUID:
    if isinstance(v, str):
        return uuid.UUID(v)
    return v


# ── 分类 ──
async def get_categories(db: AsyncSession, tenant_id: uuid.UUID | str | None = None) -> list[Category]:
    tid = _to_uuid(tenant_id) if tenant_id else None
    query = select(Category).where(
        (Category.tenant_id == tid) | (Category.tenant_id.is_(None))
    ).order_by(Category.sort_order)
    result = await db.execute(query)
    return result.scalars().all()


async def seed_default_categories(db: AsyncSession):
    """初始化系统预置分类"""
    defaults = [
        ("客户服务", "customer-service", "headset", 10),
        ("数据分析", "data-analysis", "chart", 20),
        ("内容创作", "content-creation", "edit", 30),
        ("办公效率", "office-productivity", "briefcase", 40),
        ("开发工具", "dev-tools", "code", 50),
        ("其他", "others", "more", 99),
    ]
    for name, slug, icon, order in defaults:
        existing = await db.execute(select(Category).where(Category.slug == slug))
        if not existing.scalar_one_or_none():
            db.add(Category(name=name, slug=slug, icon=icon, sort_order=order))
    await db.flush()


# ── Agent CRUD ──
async def create_agent(
    db: AsyncSession, tenant_id: uuid.UUID | str, owner_id: uuid.UUID | str, req: AgentCreateRequest
) -> Agent:
    agent = Agent(
        tenant_id=_to_uuid(tenant_id),
        owner_id=_to_uuid(owner_id),
        **req.model_dump(exclude_unset=True),
    )
    db.add(agent)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise ConflictException(message="Agent 名称已存在")
    await db.refresh(agent)
    return agent


async def get_agent(db: AsyncSession, agent_id: uuid.UUID | str, tenant_id: uuid.UUID | str) -> Agent:
    aid = _to_uuid(agent_id)
    tid = _to_uuid(tenant_id)
    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .where(Agent.id == aid, Agent.tenant_id == tid)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise NotFoundException(resource="Agent", identifier=str(agent_id))
    return agent


async def list_agents(
    db: AsyncSession, tenant_id: uuid.UUID | str, query: AgentListQuery
) -> tuple[list[Agent], int]:
    """分页查询 Agent 列表（支持搜索、筛选）"""
    tid = _to_uuid(tenant_id)
    conditions = [Agent.tenant_id == tid]

    if query.search:
        search_term = f"%{query.search}%"
        conditions.append(
            or_(
                Agent.name.ilike(search_term),
                Agent.description.ilike(search_term),
            )
        )

    if query.status:
        conditions.append(Agent.status == query.status)

    if query.category_id:
        conditions.append(Agent.category_id == _to_uuid(query.category_id))

    if query.platform_type:
        conditions.append(Agent.platform_type == query.platform_type)

    if query.tags:
        tag_names = [t.strip() for t in query.tags.split(",")]
        for tag in tag_names:
            conditions.append(Agent.tags.cast(str).contains(tag))

    where = and_(*conditions)

    count_result = await db.execute(select(func.count(Agent.id)).where(where))
    total = count_result.scalar() or 0

    sort_col = getattr(Agent, query.sort_by, Agent.created_at)
    if query.sort_order == "asc":
        order = sort_col.asc()
    else:
        order = sort_col.desc()

    offset = (query.page - 1) * query.page_size
    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .where(where)
        .order_by(order)
        .offset(offset)
        .limit(query.page_size)
    )
    agents = result.scalars().all()

    return agents, total


async def update_agent(
    db: AsyncSession, agent_id: uuid.UUID | str, tenant_id: uuid.UUID | str, req: AgentUpdateRequest
) -> Agent:
    agent = await get_agent(db, agent_id, tenant_id)
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)
    await db.flush()
    await db.refresh(agent)
    return agent


async def delete_agent(db: AsyncSession, agent_id: uuid.UUID | str, tenant_id: uuid.UUID | str) -> None:
    agent = await get_agent(db, agent_id, tenant_id)
    agent.status = "archived"
    await db.flush()


# ── 安装 ──
async def install_agent(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str, agent_id: uuid.UUID | str
) -> AgentInstallation:
    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)
    aid = _to_uuid(agent_id)
    agent = await get_agent(db, aid, tid)
    if agent.status != "published":
        raise ConflictException(message="只能安装已发布的 Agent")

    existing = await db.execute(
        select(AgentInstallation).where(
            AgentInstallation.user_id == uid,
            AgentInstallation.agent_id == aid,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException(message="已安装该 Agent")

    install = AgentInstallation(
        tenant_id=tid,
        user_id=uid,
        agent_id=aid,
        installed_at=datetime.now(timezone.utc),
    )
    db.add(install)
    agent.install_count = (agent.install_count or 0) + 1
    await db.flush()
    await db.refresh(install)
    return install


async def uninstall_agent(
    db: AsyncSession, user_id: uuid.UUID | str, agent_id: uuid.UUID | str
) -> None:
    uid = _to_uuid(user_id)
    aid = _to_uuid(agent_id)
    result = await db.execute(
        select(AgentInstallation).where(
            AgentInstallation.user_id == uid,
            AgentInstallation.agent_id == aid,
        )
    )
    install = result.scalar_one_or_none()
    if not install:
        raise NotFoundException(resource="安装记录")
    await db.delete(install)

    agent_result = await db.execute(select(Agent).where(Agent.id == aid))
    agent = agent_result.scalar_one_or_none()
    if agent and agent.install_count > 0:
        agent.install_count -= 1
    await db.flush()


async def get_my_agents(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str, page: int, page_size: int
) -> tuple[list[Agent], int]:
    """获取我安装的 Agent 列表"""
    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)
    subquery = (
        select(AgentInstallation.agent_id)
        .where(AgentInstallation.user_id == uid)
        .subquery()
    )
    where = and_(Agent.tenant_id == tid, Agent.id.in_(subquery))

    count_result = await db.execute(select(func.count(Agent.id)).where(where))
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .where(where)
        .order_by(Agent.install_count.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


# ── 评论 ──
async def create_review(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str,
    agent_id: uuid.UUID | str, rating: int, comment: str | None,
) -> AgentReview:
    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)
    aid = _to_uuid(agent_id)
    agent = await get_agent(db, aid, tid)

    existing = await db.execute(
        select(AgentReview).where(
            AgentReview.user_id == uid,
            AgentReview.agent_id == aid,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException(message="您已评价过该 Agent")

    review = AgentReview(
        tenant_id=tid,
        agent_id=aid,
        user_id=uid,
        rating=rating,
        comment=comment,
    )
    db.add(review)

    stats = await db.execute(
        select(
            func.avg(AgentReview.rating).label("avg"),
            func.count(AgentReview.id).label("cnt"),
        ).where(AgentReview.agent_id == aid)
    )
    row = stats.one()
    agent.rating_avg = round(float(row.avg or 0), 1)
    agent.review_count = row.cnt

    await db.flush()
    await db.refresh(review)
    return review


async def get_reviews(
    db: AsyncSession, agent_id: uuid.UUID | str, page: int, page_size: int
) -> tuple[list[AgentReview], int]:
    aid = _to_uuid(agent_id)
    where = AgentReview.agent_id == aid

    count_result = await db.execute(select(func.count(AgentReview.id)).where(where))
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(AgentReview)
        .where(where)
        .order_by(AgentReview.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


# ── 收藏 ──
async def toggle_favorite(
    db: AsyncSession, user_id: uuid.UUID | str, agent_id: uuid.UUID | str, favorited: bool
) -> AgentInstallation:
    """收藏 / 取消收藏 Agent"""
    uid = _to_uuid(user_id)
    aid = _to_uuid(agent_id)
    result = await db.execute(
        select(AgentInstallation).where(
            AgentInstallation.user_id == uid,
            AgentInstallation.agent_id == aid,
        )
    )
    install = result.scalar_one_or_none()
    if not install:
        from common.exceptions import ConflictException
        raise ConflictException(message="请先安装该 Agent 再收藏")
    install.is_favorited = favorited
    await db.flush()
    await db.refresh(install)
    return install


async def get_favorites(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str
) -> list[Agent]:
    """获取收藏的 Agent 列表"""
    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)
    subquery = (
        select(AgentInstallation.agent_id)
        .where(
            AgentInstallation.user_id == uid,
            AgentInstallation.is_favorited == True,
        )
        .subquery()
    )
    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .where(Agent.tenant_id == tid, Agent.id.in_(select(subquery.c.agent_id)))
        .order_by(Agent.install_count.desc())
    )
    return result.scalars().all()


# ── 推荐 ──
async def get_recommended(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str, limit: int = 20
) -> list[Agent]:
    """获取推荐 Agent 列表（热度排序，排除已安装）"""
    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)

    # 获取已安装的 agent_id
    installed_query = select(AgentInstallation.agent_id).where(
        AgentInstallation.user_id == uid
    )
    installed_result = await db.execute(installed_query)
    installed_ids = {row[0] for row in installed_result.fetchall()}

    # 热度排序：install_count * 0.4 + rating_avg * 0.4 + review_count * 0.2
    score_expr = (
        Agent.install_count * 0.4
        + func.coalesce(Agent.rating_avg, 0) * 0.4
        + Agent.review_count * 0.2
    )

    conditions = [Agent.tenant_id == tid, Agent.status == "published"]
    if installed_ids:
        conditions.append(Agent.id.not_in(installed_ids))

    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .where(and_(*conditions))
        .order_by(score_expr.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ── 最近使用 ──
async def get_recent(
    db: AsyncSession, tenant_id: uuid.UUID | str, user_id: uuid.UUID | str, limit: int = 10
) -> list[Agent]:
    """获取最近使用的 Agent（基于 chat_sessions last_message_at）"""
    from common.shared_models import ChatSession

    tid = _to_uuid(tenant_id)
    uid = _to_uuid(user_id)

    # 子查询：获取用户最近活跃的 agent_id
    recent_query = (
        select(
            ChatSession.agent_id,
            func.max(ChatSession.last_message_at).label("latest"),
        )
        .where(
            ChatSession.tenant_id == tid,
            ChatSession.user_id == uid,
            ChatSession.last_message_at.isnot(None),
        )
        .group_by(ChatSession.agent_id)
        .order_by(func.max(ChatSession.last_message_at).desc())
        .limit(limit)
        .subquery()
    )

    result = await db.execute(
        select(Agent)
        .options(selectinload(Agent.category))
        .join(recent_query, Agent.id == recent_query.c.agent_id)
        .order_by(recent_query.c.latest.desc())
    )
    return result.scalars().all()


# ── 图标上传 ──
async def upload_agent_icon(
    db: AsyncSession,
    agent_id: uuid.UUID | str,
    tenant_id: uuid.UUID | str,
    file_data: bytes,
    filename: str,
    content_type: str,
) -> Agent:
    """上传 Agent 图标到 MinIO 并更新 icon_url"""
    import os

    from common.exceptions import AppException
    from common.storage import ALLOWED_CONTENT_TYPES, ALLOWED_IMAGE_EXTENSIONS, MAX_UPLOAD_SIZE, get_storage

    # 校验文件大小
    if len(file_data) > MAX_UPLOAD_SIZE:
        raise AppException(code=400, message="文件大小不能超过 2MB", error_code="FILE_TOO_LARGE")

    # 校验文件类型（扩展名）
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise AppException(
            code=400,
            message=f"不支持的图片格式，支持: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            error_code="INVALID_FILE_TYPE",
        )

    # 校验 MIME 类型（防止伪造）
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppException(
            code=400,
            message=f"不支持的图片类型，支持: {', '.join(ALLOWED_CONTENT_TYPES)}",
            error_code="INVALID_CONTENT_TYPE",
        )

    agent = await get_agent(db, agent_id, tenant_id)

    # 上传到 MinIO
    object_name = f"icons/agents/{agent.id}{ext}"
    storage = get_storage()
    await storage.upload(file_data, object_name, content_type)

    # 存储 object_name，读取时通过 get_url 动态生成预签名 URL
    agent.icon_url = object_name
    await db.flush()
    await db.refresh(agent)
    return agent


async def resolve_icon_urls(agents: Agent | list[Agent]) -> None:
    """将 Agent 的 icon_url 从 object_name 解析为预签名 URL。

    原地修改 Agent 对象的 icon_url 字段。
    对于没有图标的 Agent，跳过处理。
    对于已经是完整 URL 的（以 http 开头），不重复生成。
    """
    from common.storage import get_storage

    if isinstance(agents, Agent):
        agents = [agents]

    storage = get_storage()
    for agent in agents:
        if agent.icon_url and not agent.icon_url.startswith("http"):
            agent.icon_url = await storage.get_url(agent.icon_url)
