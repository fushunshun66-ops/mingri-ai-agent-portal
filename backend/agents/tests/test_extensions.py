"""Agent 市场扩展测试：收藏、推荐、最近使用、图标上传"""

import io

import pytest


class TestAgentFavorite:
    """Agent 收藏功能"""

    async def test_favorite_agent(self, async_client, test_user, auth_headers, test_agent):
        """安装后收藏 Agent"""
        agent_id = test_agent["id"]
        # 先安装
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)

        # 收藏
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/favorite",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    async def test_unfavorite_agent(self, async_client, test_user, auth_headers, test_agent):
        """取消收藏"""
        agent_id = test_agent["id"]
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)
        await async_client.post(f"/api/v1/agents/{agent_id}/favorite", headers=auth_headers)

        resp = await async_client.delete(
            f"/api/v1/agents/{agent_id}/favorite",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    async def test_favorite_not_installed(self, async_client, test_user, auth_headers, test_agent):
        """未安装时收藏应提示先安装"""
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/favorite",
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_get_favorites(self, async_client, test_user, auth_headers, test_agent):
        """获取收藏列表"""
        agent_id = test_agent["id"]
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)
        await async_client.post(f"/api/v1/agents/{agent_id}/favorite", headers=auth_headers)

        resp = await async_client.get("/api/v1/agents/favorites", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1


class TestAgentRecommended:
    """首页推荐"""

    async def test_get_recommended(self, async_client, test_user, auth_headers, test_agent):
        """获取推荐 Agent 列表"""
        # 创建几个不同的 Agent 来模拟不同热度
        # 已有的 test_agent 有 install_count=0
        resp = await async_client.get("/api/v1/agents/recommended", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # 至少显示已发布的 Agent
        assert isinstance(data["data"], list)

    async def test_recommended_excludes_installed(self, async_client, test_user, auth_headers, test_agent):
        """推荐列表排除已安装的 Agent（可选功能，至少不报错）"""
        agent_id = test_agent["id"]
        # 安装
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)

        resp = await async_client.get("/api/v1/agents/recommended", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # 已安装的不应在推荐列表中
        installed_ids = {a["id"] for a in data["data"]}
        assert agent_id not in installed_ids


class TestAgentRecent:
    """最近使用的 Agent"""

    async def test_get_recent(self, async_client, test_user, auth_headers, test_agent):
        """最近使用的 Agent 列表"""
        # 先创建会话和消息来产生使用记录
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["data"]["id"]

        await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "测试使用"},
        )

        resp = await async_client.get("/api/v1/agents/recent", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    async def test_recent_empty(self, async_client, test_user, auth_headers):
        """无使用记录时返回空列表"""
        resp = await async_client.get("/api/v1/agents/recent", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []


class TestAgentIconUpload:
    """Agent 图标上传"""

    async def test_upload_icon_not_owner(self, async_client, test_user, auth_headers, test_agent):
        """非所有者上传图标（当前不限制，同一租户无权限管控）"""
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\nfake png data")
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/icon",
            headers=auth_headers,
            files={"file": ("icon.png", fake_image, "image/png")},
        )
        assert resp.status_code == 200

    async def test_upload_icon_as_admin(self, async_client, test_admin, admin_auth_headers, test_agent):
        """Agent 所有者上传图标"""
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\nfake png data for icon upload")
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/icon",
            headers=admin_auth_headers,
            files={"file": ("agent-icon.png", fake_image, "image/png")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "icon_url" in data["data"]

    async def test_upload_icon_invalid_type(self, async_client, test_admin, admin_auth_headers, test_agent):
        """上传非图片文件应被拒绝"""
        fake_file = io.BytesIO(b"this is a text file, not an image")
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/icon",
            headers=admin_auth_headers,
            files={"file": ("document.txt", fake_file, "text/plain")},
        )
        assert resp.status_code == 400

    async def test_upload_icon_too_large(self, async_client, test_admin, admin_auth_headers, test_agent):
        """超 2MB 文件应被拒绝"""
        large_data = b"\x89PNG\r\n\x1a\n" + b"x" * (3 * 1024 * 1024)
        fake_image = io.BytesIO(large_data)
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/icon",
            headers=admin_auth_headers,
            files={"file": ("large.png", fake_image, "image/png")},
        )
        assert resp.status_code == 400
