"""用户接口测试：个人信息、密码修改"""

import pytest


class TestUserProfile:
    """用户个人信息接口"""

    async def test_get_me_authenticated(self, async_client, test_user, auth_headers):
        """认证用户获取个人信息"""
        resp = await async_client.get("/api/v1/users/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["username"] == "testuser"
        assert data["data"]["email"] == "test@test.com"
        assert "roles" in data["data"]

    async def test_get_me_unauthenticated(self, async_client):
        """未认证用户访问"""
        resp = await async_client.get("/api/v1/users/me")
        assert resp.status_code == 401

    async def test_get_me_invalid_token(self, async_client):
        """无效 Token"""
        resp = await async_client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert resp.status_code == 401

    async def test_update_me(self, async_client, test_user, auth_headers):
        """更新个人信息"""
        resp = await async_client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"display_name": "新名称"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["display_name"] == "新名称"

    async def test_update_me_no_field(self, async_client, test_user, auth_headers):
        """更新空字段"""
        resp = await async_client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={},
        )
        assert resp.status_code == 200

    async def test_update_me_invalid_email(self, async_client, test_user, auth_headers):
        """更新为无效邮箱"""
        resp = await async_client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"email": "not-an-email"},
        )
        assert resp.status_code == 422


class TestPasswordChange:
    """密码修改接口"""

    async def test_change_password_success(self, async_client, test_user, auth_headers):
        """成功修改密码"""
        resp = await async_client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={"old_password": "Test123456", "new_password": "NewPass789"},
        )
        assert resp.status_code == 200

        # 用新密码登录
        login_resp = await async_client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "NewPass789",
            "tenant_slug": "test-company",
        })
        assert login_resp.status_code == 200

    async def test_change_password_wrong_old(self, async_client, test_user, auth_headers):
        """原密码错误"""
        resp = await async_client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={"old_password": "WrongOld123", "new_password": "NewPass789"},
        )
        assert resp.status_code == 409

    async def test_change_password_too_short(self, async_client, test_user, auth_headers):
        """新密码太短"""
        resp = await async_client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={"old_password": "Test123456", "new_password": "123"},
        )
        assert resp.status_code == 422
