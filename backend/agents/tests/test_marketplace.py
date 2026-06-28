"""Agent 市场和安装接口测试"""

import pytest


class TestAgentMarketplace:
    """Agent 市场相关：安装、卸载、我的Agent"""

    async def test_install_agent(self, async_client, test_user, auth_headers, test_agent):
        """安装已发布的 Agent"""
        agent_id = test_agent["id"]
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/install",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["agent_id"] == agent_id

    async def test_install_duplicate(self, async_client, test_user, auth_headers, test_agent):
        """重复安装同一个 Agent"""
        agent_id = test_agent["id"]
        # 第一次安装
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)
        # 第二次安装应报错
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/install",
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_install_draft_agent(self, async_client, test_user, auth_headers, test_draft_agent):
        """安装草稿状态的 Agent 应失败"""
        agent_id = test_draft_agent["id"]
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/install",
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_uninstall_agent(self, async_client, test_user, auth_headers, test_agent):
        """卸载已安装的 Agent"""
        agent_id = test_agent["id"]
        # 先安装
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)
        # 再卸载
        resp = await async_client.delete(
            f"/api/v1/agents/{agent_id}/install",
            headers=auth_headers,
        )
        assert resp.status_code == 200

    async def test_uninstall_not_installed(self, async_client, test_user, auth_headers, test_agent):
        """卸载未安装的 Agent"""
        resp = await async_client.delete(
            f"/api/v1/agents/{test_agent['id']}/install",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_my_agents(self, async_client, test_user, auth_headers, test_agent):
        """获取我已安装的 Agent 列表"""
        agent_id = test_agent["id"]
        await async_client.post(f"/api/v1/agents/{agent_id}/install", headers=auth_headers)

        resp = await async_client.get("/api/v1/agents/my", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1
        assert any(a["id"] == agent_id for a in data["data"])

    async def test_categories(self, async_client, test_user, auth_headers):
        """获取分类列表"""
        resp = await async_client.get("/api/v1/categories", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # 预置分类应已创建
        assert len(data["data"]) >= 5
