"""users 服务测试 fixtures"""

import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def register_user(async_client):
    """注册一个测试用户并返回认证头"""
    resp = await async_client.post("/api/v1/auth/register", json={
        "username": "testuser2",
        "email": "test2@test.com",
        "password": "Test123456",
        "display_name": "测试用户2",
        "tenant_name": "测试企业2",
        "tenant_slug": "test-company-2",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    return data["data"]
