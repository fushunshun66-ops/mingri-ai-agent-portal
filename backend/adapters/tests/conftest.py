"""adapters 服务测试 fixtures"""

import pytest_asyncio


@pytest_asyncio.fixture
async def test_connection(async_client, test_admin, admin_auth_headers):
    """创建一个测试平台连接"""
    resp = await async_client.post(
        "/api/v1/connections",
        headers=admin_auth_headers,
        json={
            "name": "测试 Dify 连接",
            "platform_type": "dify",
            "config": {
                "base_url": "https://dify.example.com",
                "api_key": "app-secret-key-12345",
                "timeout": 30,
            },
        },
    )
    assert resp.status_code == 200
    return resp.json()["data"]


@pytest_asyncio.fixture
async def test_connection_2(async_client, test_admin, admin_auth_headers):
    """创建另一个测试平台连接"""
    resp = await async_client.post(
        "/api/v1/connections",
        headers=admin_auth_headers,
        json={
            "name": "N8N 工作流连接",
            "platform_type": "n8n",
            "config": {
                "base_url": "https://n8n.example.com",
                "api_key": "n8n-key-67890",
            },
        },
    )
    assert resp.status_code == 200
    return resp.json()["data"]
