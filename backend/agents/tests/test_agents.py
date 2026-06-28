"""Agent CRUD 接口测试"""

import pytest


class TestAgentCreate:
    """Agent 创建"""

    async def test_create_agent_success(self, async_client, admin_auth_headers):
        """管理员创建 Agent"""
        resp = await async_client.post(
            "/api/v1/agents",
            headers=admin_auth_headers,
            json={
                "name": "智能客服",
                "description": "24小时在线的智能客服",
                "platform_type": "dify",
                "tags": [{"id": "1", "name": "客服"}],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["name"] == "智能客服"
        assert data["data"]["status"] == "draft"
        assert data["data"]["visibility"] == "tenant_visible"

    async def test_create_agent_empty_name(self, async_client, admin_auth_headers):
        """Agent 名称为空"""
        resp = await async_client.post(
            "/api/v1/agents",
            headers=admin_auth_headers,
            json={"name": "", "description": "test"},
        )
        assert resp.status_code == 422

    async def test_create_agent_duplicate_name(self, async_client, admin_auth_headers, test_agent):
        """同名 Agent 应报冲突"""
        resp = await async_client.post(
            "/api/v1/agents",
            headers=admin_auth_headers,
            json={"name": "测试智能助手", "description": "重复名称"},
        )
        assert resp.status_code == 409


class TestAgentQuery:
    """Agent 查询"""

    async def test_list_agents(self, async_client, test_user, auth_headers, test_agent):
        """获取 Agent 列表"""
        resp = await async_client.get("/api/v1/agents", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
        assert data["pagination"]["total"] >= 1

    async def test_list_agents_with_search(self, async_client, test_user, auth_headers, test_agent):
        """搜索 Agent"""
        resp = await async_client.get(
            "/api/v1/agents",
            headers=auth_headers,
            params={"search": "测试智能"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1

    async def test_list_agents_search_no_match(self, async_client, test_user, auth_headers):
        """搜索无匹配"""
        resp = await async_client.get(
            "/api/v1/agents",
            headers=auth_headers,
            params={"search": "zzzzzzz_nonexistent"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 0

    async def test_list_agents_status_filter(self, async_client, test_user, auth_headers, test_agent):
        """按状态筛选"""
        resp = await async_client.get(
            "/api/v1/agents",
            headers=auth_headers,
            params={"status": "published"},
        )
        assert resp.status_code == 200
        for agent in resp.json()["data"]:
            assert agent["status"] == "published"

    async def test_get_agent_detail(self, async_client, test_user, auth_headers, test_agent):
        """获取 Agent 详情"""
        agent_id = test_agent["id"]
        resp = await async_client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == agent_id

    async def test_get_agent_not_found(self, async_client, test_user, auth_headers):
        """获取不存在的 Agent"""
        resp = await async_client.get(
            "/api/v1/agents/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_list_agents_pagination(self, async_client, test_user, auth_headers):
        """分页测试"""
        resp = await async_client.get(
            "/api/v1/agents",
            headers=auth_headers,
            params={"page": 1, "page_size": 5},
        )
        assert resp.status_code == 200
        assert resp.json()["pagination"]["page"] == 1
        assert resp.json()["pagination"]["page_size"] == 5


class TestAgentUpdate:
    """Agent 更新"""

    async def test_update_agent(self, async_client, admin_auth_headers, test_agent):
        """更新 Agent"""
        agent_id = test_agent["id"]
        resp = await async_client.put(
            f"/api/v1/agents/{agent_id}",
            headers=admin_auth_headers,
            json={"description": "更新后的描述", "version": "1.1.0"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["description"] == "更新后的描述"

    async def test_update_agent_status(self, async_client, admin_auth_headers, test_draft_agent):
        """更新 Agent 状态（发布）"""
        agent_id = test_draft_agent["id"]
        resp = await async_client.put(
            f"/api/v1/agents/{agent_id}",
            headers=admin_auth_headers,
            json={"status": "published"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "published"


class TestAgentDelete:
    """Agent 删除（软删除/归档）"""

    async def test_delete_agent(self, async_client, admin_auth_headers, test_draft_agent):
        """删除（归档）Agent"""
        agent_id = test_draft_agent["id"]
        resp = await async_client.delete(
            f"/api/v1/agents/{agent_id}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200

        # 确认状态变为 archived
        get_resp = await async_client.get(
            f"/api/v1/agents/{agent_id}",
            headers=admin_auth_headers,
        )
        assert get_resp.json()["data"]["status"] == "archived"
