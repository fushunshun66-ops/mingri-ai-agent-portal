"""全局测试 fixtures - 使用 SQLite 进行本地测试"""

import asyncio
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# 在导入任何应用代码之前，先设置 SQLite 测试数据库
os.environ["POSTGRES_HOST"] = "localhost"
os.environ["POSTGRES_DB"] = ":memory:"

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# 强制覆盖 settings 中的 database_url
import common.config
common.config.settings.postgres_host = ""
common.config.settings.postgres_db = ""

# Monkey-patch settings.database_url
original_database_url = common.config.settings.__class__.database_url


def _test_database_url(self):
    return TEST_DATABASE_URL


common.config.settings.__class__.database_url = property(_test_database_url)

from common.models import Base
from users.models import Tenant, User, Role, RolePermission, UserRole
from agents.models import Agent, Category, AgentInstallation, AgentReview
from adapters.models import PlatformConnection
from common.shared_models import ChatSession, ChatMessage, AuditLog, UsageRecord


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """创建测试数据库引擎"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

    try:
        os.remove("./test.db")
    except OSError:
        pass


@pytest_asyncio.fixture
async def db_session(test_engine):
    """创建独立数据库会话"""
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def async_client(db_session):
    """创建 FastAPI 测试客户端"""
    from main import app
    from common.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_tenant(db_session: AsyncSession):
    """创建测试租户"""
    tenant = Tenant(name="测试企业", slug="test-company", status="active")
    db_session.add(tenant)
    await db_session.flush()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_tenant: Tenant):
    """创建测试用户（user 角色）"""
    from common.security import hash_password

    user = User(
        tenant_id=test_tenant.id,
        username="testuser",
        email="test@test.com",
        password_hash=hash_password("Test123456"),
        display_name="测试用户",
        status="active",
    )
    db_session.add(user)

    role = Role(
        tenant_id=test_tenant.id,
        name="user",
        description="普通用户",
        is_system=True,
    )
    db_session.add(role)
    await db_session.flush()

    user_role = UserRole(user_id=user.id, role_id=role.id)
    db_session.add(user_role)
    await db_session.flush()
    await db_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession, test_tenant: Tenant):
    """创建测试管理员"""
    from common.security import hash_password

    admin = User(
        tenant_id=test_tenant.id,
        username="admin",
        email="admin@test.com",
        password_hash=hash_password("Admin123456"),
        display_name="管理员",
        status="active",
    )
    db_session.add(admin)

    role = Role(
        tenant_id=test_tenant.id,
        name="tenant_admin",
        description="租户管理员",
        is_system=True,
    )
    db_session.add(role)
    await db_session.flush()

    user_role = UserRole(user_id=admin.id, role_id=role.id)
    db_session.add(user_role)
    await db_session.flush()
    await db_session.refresh(admin)

    return admin


@pytest_asyncio.fixture
def auth_headers(test_user):
    """生成带 JWT 的认证头"""
    from common.security import create_access_token

    token = create_access_token(
        sub=str(test_user.id),
        tenant_id=str(test_user.tenant_id),
        roles=["user"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
def admin_auth_headers(test_admin):
    """生成管理员认证头"""
    from common.security import create_access_token

    token = create_access_token(
        sub=str(test_admin.id),
        tenant_id=str(test_admin.tenant_id),
        roles=["tenant_admin"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_tenant_b(db_session: AsyncSession):
    """创建另一个测试租户（用于多租户隔离测试）"""
    from common.security import hash_password

    tenant = Tenant(name="隔离测试企业", slug="test-company-b", status="active")
    db_session.add(tenant)
    await db_session.flush()

    user = User(
        tenant_id=tenant.id,
        username="testuser_b",
        email="test_b@test.com",
        password_hash=hash_password("Test123456"),
        display_name="B租户用户",
        status="active",
    )
    db_session.add(user)
    await db_session.flush()

    role = Role(tenant_id=tenant.id, name="user", description="用户", is_system=True)
    db_session.add(role)
    await db_session.flush()

    db_session.add(UserRole(user_id=user.id, role_id=role.id))
    await db_session.flush()
    await db_session.refresh(tenant)

    return {"tenant": tenant, "user": user}
