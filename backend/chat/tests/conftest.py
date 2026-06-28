"""chat 服务测试 fixtures"""

import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock


@pytest_asyncio.fixture(autouse=True)
async def mock_redis(monkeypatch):
    """自动 mock Redis，所有 chat 测试使用模拟 Redis"""
    mock_client = MagicMock()
    mock_client.get = AsyncMock(return_value=None)
    mock_client.set = AsyncMock()
    mock_client.setex = AsyncMock()
    mock_client.delete = AsyncMock()
    mock_client.rpush = AsyncMock()
    mock_client.lrange = AsyncMock(return_value=[])
    mock_client.ltrim = AsyncMock()
    mock_client.expire = AsyncMock()
    mock_client.pipeline = MagicMock()

    mock_pipe = MagicMock()
    mock_pipe.rpush = MagicMock(return_value=mock_pipe)
    mock_pipe.ltrim = MagicMock(return_value=mock_pipe)
    mock_pipe.expire = MagicMock(return_value=mock_pipe)
    mock_pipe.execute = AsyncMock()
    mock_client.pipeline.return_value = mock_pipe

    import common.redis as redis_module
    redis_module.set_redis_client(mock_client)
    yield mock_client
    redis_module.set_redis_client(None)


@pytest_asyncio.fixture
async def test_agent(async_client, test_admin, admin_auth_headers):
    """创建一个测试 Agent（复用 agents/tests/conftest 中的逻辑）"""
    resp = await async_client.post(
        "/api/v1/agents",
        headers=admin_auth_headers,
        json={
            "name": "测试智能助手",
            "description": "这是一个测试用的 Agent",
            "platform_type": "dify",
            "platform_config": {"app_id": "test-app-123"},
            "capability": {"type": "chat", "streaming": True},
            "tags": [{"id": "1", "name": "客服"}, {"id": "2", "name": "智能"}],
            "status": "published",
            "visibility": "tenant_visible",
        },
    )
    assert resp.status_code == 200
    return resp.json()["data"]
