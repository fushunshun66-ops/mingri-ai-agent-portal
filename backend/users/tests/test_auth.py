"""认证接口测试：注册、登录、Token 刷新"""

import pytest


class TestAuthRegister:
    """注册接口测试"""

    async def test_register_success(self, async_client):
        """成功注册新用户"""
        resp = await async_client.post("/api/v1/auth/register", json={
            "username": "newuser1",
            "email": "new1@test.com",
            "password": "NewUser123",
            "display_name": "新用户",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["username"] == "newuser1"
        assert data["data"]["email"] == "new1@test.com"
        assert "id" in data["data"]
        assert "tenant_id" in data["data"]

    async def test_register_duplicate_username(self, async_client):
        """同一租户内重复用户名应报错"""
        # 第一次注册
        resp1 = await async_client.post("/api/v1/auth/register", json={
            "username": "dupuser",
            "email": "dup@test.com",
            "password": "DupUser123",
            "tenant_slug": "dup-tenant",
        })
        assert resp1.status_code == 200

        # 登录获取 access token
        login = await async_client.post("/api/v1/auth/login", json={
            "username": "dupuser",
            "password": "DupUser123",
            "tenant_slug": "dup-tenant",
        })
        token = login.json()["data"]["access_token"]

        # 用同一租户注册重名用户
        # 由于没有提供 tenant_id，会创建新租户，不会冲突
        # 但同一租户内应检测
        resp2 = await async_client.post("/api/v1/auth/register", json={
            "username": "dupuser",
            "email": "dup2@test.com",
            "password": "DupUser456",
            "tenant_slug": "dup-tenant",
        })
        # 同一租户 slug 应意味着同一租户，检测应该捕获
        assert resp2.status_code == 409

    async def test_register_weak_password(self, async_client):
        """弱密码应被拒绝"""
        resp = await async_client.post("/api/v1/auth/register", json={
            "username": "weakuser",
            "email": "weak@test.com",
            "password": "12345678",
        })
        assert resp.status_code == 422

    async def test_register_missing_fields(self, async_client):
        """缺少必填字段"""
        resp = await async_client.post("/api/v1/auth/register", json={
            "username": "incomplete",
        })
        assert resp.status_code == 422


class TestAuthLogin:
    """登录接口测试"""

    async def test_login_success(self, async_client, test_user):
        """使用正确凭据登录"""
        resp = await async_client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "Test123456",
            "tenant_slug": "test-company",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["token_type"] == "bearer"

    async def test_login_wrong_password(self, async_client, test_user):
        """错误密码"""
        resp = await async_client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "WrongPass123",
            "tenant_slug": "test-company",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, async_client):
        """不存在的用户"""
        resp = await async_client.post("/api/v1/auth/login", json={
            "username": "nobody",
            "password": "Nobody123",
            "tenant_slug": "test-company",
        })
        assert resp.status_code == 401

    async def test_login_invalid_json(self, async_client):
        """无效的请求格式"""
        resp = await async_client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422


class TestAuthRefresh:
    """Token 刷新接口测试"""

    async def test_refresh_success(self, async_client, test_user):
        """用 refresh token 获取新的 access token"""
        # 先登录获取 refresh token
        login_resp = await async_client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "Test123456",
            "tenant_slug": "test-company",
        })
        refresh_token = login_resp.json()["data"]["refresh_token"]

        # 用 refresh token 刷新
        resp = await async_client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "access_token" in data["data"]

    async def test_refresh_invalid_token(self, async_client):
        """无效的 refresh token"""
        resp = await async_client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token",
        })
        assert resp.status_code == 401


class TestAuthEdgeCases:
    """边界情况"""

    async def test_login_empty_body(self, async_client):
        """空请求体"""
        resp = await async_client.post("/api/v1/auth/login", content=b"")
        assert resp.status_code == 422
