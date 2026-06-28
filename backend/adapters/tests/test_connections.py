"""平台连接管理接口测试"""

import pytest


class TestConnectionCreate:
    """创建平台连接"""

    async def test_create_connection_success(self, async_client, admin_auth_headers):
        """创建连接"""
        resp = await async_client.post(
            "/api/v1/connections",
            headers=admin_auth_headers,
            json={
                "name": "生产 Dify",
                "platform_type": "dify",
                "config": {"base_url": "https://dify.prod.com", "api_key": "sk-12345"},
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["name"] == "生产 Dify"

    async def test_create_connection_api_key_encrypted(self, async_client, admin_auth_headers):
        """API Key 应被加密存储，响应中不包含明文"""
        resp = await async_client.post(
            "/api/v1/connections",
            headers=admin_auth_headers,
            json={
                "name": "测试加密",
                "platform_type": "coze",
                "config": {
                    "base_url": "https://coze.com",
                    "api_key": "my-secret-api-key-123",
                    "webhook_secret": "wh-secret-456",
                },
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        config = data["data"].get("config", {})
        # 响应中不应包含明文 API Key
        assert "api_key" not in config
        assert "api_key_encrypted" not in config  # 加密字段不应暴露
        assert "webhook_secret" not in config

    async def test_create_connection_empty_name(self, async_client, admin_auth_headers):
        """连接名称为空"""
        resp = await async_client.post(
            "/api/v1/connections",
            headers=admin_auth_headers,
            json={"name": "", "platform_type": "dify"},
        )
        assert resp.status_code == 422


class TestConnectionQuery:
    """查询连接"""

    async def test_list_connections(self, async_client, admin_auth_headers, test_connection):
        """连接列表"""
        resp = await async_client.get("/api/v1/connections", headers=admin_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1

    async def test_get_connection_detail(self, async_client, admin_auth_headers, test_connection):
        """连接详情"""
        conn_id = test_connection["id"]
        resp = await async_client.get(f"/api/v1/connections/{conn_id}", headers=admin_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == conn_id

    async def test_get_connection_not_found(self, async_client, admin_auth_headers):
        """不存在的连接"""
        resp = await async_client.get(
            "/api/v1/connections/00000000-0000-0000-0000-000000000000",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 404

    async def test_list_connections_empty(self, async_client, test_user, auth_headers):
        """空连接列表"""
        resp = await async_client.get("/api/v1/connections", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []


class TestConnectionUpdate:
    """更新连接"""

    async def test_update_connection(self, async_client, admin_auth_headers, test_connection):
        """更新连接名称和配置"""
        conn_id = test_connection["id"]
        resp = await async_client.put(
            f"/api/v1/connections/{conn_id}",
            headers=admin_auth_headers,
            json={"name": "更新后的连接名"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "更新后的连接名"

    async def test_update_connection_config(self, async_client, admin_auth_headers, test_connection):
        """更新连接配置（含 API Key）"""
        conn_id = test_connection["id"]
        resp = await async_client.put(
            f"/api/v1/connections/{conn_id}",
            headers=admin_auth_headers,
            json={
                "config": {
                    "base_url": "https://new.example.com",
                    "api_key": "new-secret-key",
                },
            },
        )
        assert resp.status_code == 200
        config = resp.json()["data"].get("config", {})
        assert "api_key" not in config


class TestConnectionDelete:
    """删除连接（禁用）"""

    async def test_delete_connection(self, async_client, admin_auth_headers, test_connection):
        """删除（禁用）连接"""
        conn_id = test_connection["id"]
        resp = await async_client.delete(
            f"/api/v1/connections/{conn_id}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200

        # 确认状态变为 disabled
        get_resp = await async_client.get(
            f"/api/v1/connections/{conn_id}",
            headers=admin_auth_headers,
        )
        assert get_resp.json()["data"]["status"] == "disabled"


class TestMultiTenantIsolation:
    """多租户隔离"""

    async def test_tenant_isolation_connections(
        self, async_client, test_admin, admin_auth_headers, test_tenant_b
    ):
        """A 租户的连接对 B 租户不可见"""
        from common.security import create_access_token

        # 先以 A 租户创建连接
        await async_client.post(
            "/api/v1/connections",
            headers=admin_auth_headers,
            json={
                "name": "A租户的连接",
                "platform_type": "dify",
                "config": {"base_url": "https://a.dify.com"},
            },
        )

        # 用 B 租户的 token 访问
        b_user = test_tenant_b["user"]
        b_tenant = test_tenant_b["tenant"]
        token = create_access_token(
            sub=str(b_user.id), tenant_id=str(b_tenant.id), roles=["user"]
        )
        b_headers = {"Authorization": f"Bearer {token}"}

        # B 租户看不到 A 租户的连接
        resp = await async_client.get("/api/v1/connections", headers=b_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []
