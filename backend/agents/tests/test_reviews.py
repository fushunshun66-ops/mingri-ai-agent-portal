"""Agent 评论接口测试"""

import pytest


class TestAgentReviews:
    """Agent 评论和评分"""

    async def test_create_review(self, async_client, test_user, auth_headers, test_agent):
        """提交评分"""
        agent_id = test_agent["id"]
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
            json={"rating": 5, "comment": "非常好用"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["rating"] == 5
        assert data["data"]["comment"] == "非常好用"

    async def test_create_review_duplicate(self, async_client, test_user, auth_headers, test_agent):
        """重复评论应报错"""
        agent_id = test_agent["id"]
        await async_client.post(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
            json={"rating": 4},
        )
        resp = await async_client.post(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
            json={"rating": 5},
        )
        assert resp.status_code == 409

    async def test_create_review_invalid_rating(self, async_client, test_user, auth_headers, test_agent):
        """无效评分（超出范围）"""
        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/reviews",
            headers=auth_headers,
            json={"rating": 6},
        )
        assert resp.status_code == 422

        resp = await async_client.post(
            f"/api/v1/agents/{test_agent['id']}/reviews",
            headers=auth_headers,
            json={"rating": 0},
        )
        assert resp.status_code == 422

    async def test_get_reviews(self, async_client, test_user, auth_headers, test_agent):
        """获取评论列表"""
        agent_id = test_agent["id"]
        await async_client.post(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
            json={"rating": 4, "comment": "不错"},
        )

        resp = await async_client.get(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1
        assert data["data"][0]["rating"] == 4

    async def test_rating_avg_updated(self, async_client, test_user, test_admin, auth_headers, admin_auth_headers, test_agent):
        """评分后 Agent 的平均分应更新"""
        agent_id = test_agent["id"]

        # 用户1评分 5
        await async_client.post(
            f"/api/v1/agents/{agent_id}/reviews",
            headers=auth_headers,
            json={"rating": 5},
        )

        # 检查 Agent 详情中的平均分
        resp = await async_client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers)
        assert resp.json()["data"]["rating_avg"] == 5.0
        assert resp.json()["data"]["review_count"] == 1
