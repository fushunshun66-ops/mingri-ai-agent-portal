"""agents 服务测试 fixtures"""

import pytest_asyncio


@pytest_asyncio.fixture
async def test_agent(async_client, test_admin, admin_auth_headers):
    """创建一个测试 Agent"""
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


@pytest_asyncio.fixture
async def test_draft_agent(async_client, test_admin, admin_auth_headers):
    """创建一个草稿状态的 Agent"""
    resp = await async_client.post(
        "/api/v1/agents",
        headers=admin_auth_headers,
        json={
            "name": "草稿Agent",
            "description": "未发布",
            "status": "draft",
        },
    )
    assert resp.status_code == 200
    return resp.json()["data"]
