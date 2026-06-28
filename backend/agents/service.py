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
