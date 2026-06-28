"""Chat 对话服务全量测试"""

import json

import pytest


class TestChatSessionCreate:
    """会话创建"""

    async def test_create_session(self, async_client, test_user, auth_headers, test_agent):
        """创建对话会话"""
        resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={
                "agent_id": test_agent["id"],
                "title": "测试会话",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["title"] == "测试会话"
        assert data["data"]["status"] == "active"
        assert data["data"]["agent_id"] == test_agent["id"]

    async def test_create_session_no_title(self, async_client, test_user, auth_headers, test_agent):
        """创建会话不提供标题（应默认为 None）"""
        resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    async def test_create_session_invalid_agent(self, async_client, test_user, auth_headers):
        """不存在的 Agent"""
        resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code == 404


class TestChatSessionQuery:
    """会话查询"""

    async def test_list_sessions_empty(self, async_client, test_user, auth_headers):
        """空会话列表"""
        resp = await async_client.get("/api/v1/chat/sessions", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_list_sessions(self, async_client, test_user, auth_headers, test_agent):
        """会话列表"""
        # 先创建会话
        await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"], "title": "会话1"},
        )
        await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"], "title": "会话2"},
        )

        resp = await async_client.get("/api/v1/chat/sessions", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 2

    async def test_get_session_detail(self, async_client, test_user, auth_headers, test_agent):
        """会话详情"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"], "title": "详情会话"},
        )
        session_id = create_resp.json()["data"]["id"]

        resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}", headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["title"] == "详情会话"

    async def test_get_session_not_found(self, async_client, test_user, auth_headers):
        """不存在的会话"""
        resp = await async_client.get(
            "/api/v1/chat/sessions/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestChatSessionUpdate:
    """会话更新"""

    async def test_update_session_title(self, async_client, test_user, auth_headers, test_agent):
        """修改会话标题"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"], "title": "原始标题"},
        )
        session_id = create_resp.json()["data"]["id"]

        resp = await async_client.put(
            f"/api/v1/chat/sessions/{session_id}",
            headers=auth_headers,
            json={"title": "新标题"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["title"] == "新标题"

    async def test_archive_session(self, async_client, test_user, auth_headers, test_agent):
        """归档会话"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        # 归档
        resp = await async_client.delete(
            f"/api/v1/chat/sessions/{session_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # 确认状态
        get_resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}",
            headers=auth_headers,
        )
        assert get_resp.json()["data"]["status"] == "archived"


class TestChatMessage:
    """消息发送与查询"""

    async def test_send_message(self, async_client, test_user, auth_headers, test_agent):
        """发送消息"""
        # 创建会话
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        resp = await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "你好，请帮我分析数据"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["user_message"]["role"] == "user"
        assert data["data"]["user_message"]["content"] == "你好，请帮我分析数据"
        assert data["data"]["assistant_message"]["role"] == "assistant"
        assert len(data["data"]["assistant_message"]["content"]) > 0

    async def test_get_messages(self, async_client, test_user, auth_headers, test_agent):
        """获取消息历史"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        # 发送消息
        await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "消息1"},
        )
        await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "消息2"},
        )

        resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        # 每条用户消息产生 1 user + 1 assistant = 2 条，两条消息 = 4 条
        assert len(data["data"]) >= 2
        assert data["pagination"]["total"] >= 2

    async def test_messages_pagination(self, async_client, test_user, auth_headers, test_agent):
        """消息分页"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "msg"},
        )

        resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            params={"page": 1, "page_size": 2},
        )
        assert resp.status_code == 200
        assert resp.json()["pagination"]["page_size"] == 2

    async def test_session_message_count_updates(self, async_client, test_user, auth_headers, test_agent):
        """发消息后 session 的 message_count 和 last_message_at 应更新"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "第一条消息"},
        )

        # 获取 session 详情确认
        get_resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}",
            headers=auth_headers,
        )
        session = get_resp.json()["data"]
        assert session["message_count"] >= 1
        assert session["last_message_at"] is not None


class TestChatFeedback:
    """消息反馈（like/dislike）"""

    async def test_like_message(self, async_client, test_user, auth_headers, test_agent):
        """点赞消息"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        send_resp = await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "测试"},
        )
        msg_id = send_resp.json()["data"]["assistant_message"]["id"]

        resp = await async_client.post(
            f"/api/v1/chat/messages/{msg_id}/feedback",
            headers=auth_headers,
            json={"feedback": "like"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["feedback"] == "like"

    async def test_dislike_message(self, async_client, test_user, auth_headers, test_agent):
        """点踩消息"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        send_resp = await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "测试"},
        )
        msg_id = send_resp.json()["data"]["assistant_message"]["id"]

        resp = await async_client.post(
            f"/api/v1/chat/messages/{msg_id}/feedback",
            headers=auth_headers,
            json={"feedback": "dislike"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["feedback"] == "dislike"

    async def test_feedback_invalid(self, async_client, test_user, auth_headers, test_agent):
        """无效的反馈类型"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        send_resp = await async_client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "测试"},
        )
        msg_id = send_resp.json()["data"]["assistant_message"]["id"]

        resp = await async_client.post(
            f"/api/v1/chat/messages/{msg_id}/feedback",
            headers=auth_headers,
            json={"feedback": "invalid"},
        )
        assert resp.status_code == 422


class TestChatStream:
    """SSE 流式输出测试"""

    async def test_stream_endpoint(self, async_client, test_user, auth_headers, test_agent):
        """SSE 流式端点返回 text/event-stream"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        import httpx
        async with httpx.AsyncClient(
            transport=async_client._transport, base_url="http://test"
        ) as stream_client:
            async with stream_client.stream(
                "GET",
                f"/api/v1/chat/sessions/{session_id}/stream",
                headers={**auth_headers, "Accept": "text/event-stream"},
                params={"message": "你好"},
            ) as response:
                assert response.status_code == 200
                assert "text/event-stream" in response.headers.get("content-type", "")

    async def test_stream_contains_done(self, async_client, test_user, auth_headers, test_agent):
        """SSE 流应以 [DONE] 结束"""
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"]},
        )
        session_id = create_resp.json()["data"]["id"]

        import httpx
        async with httpx.AsyncClient(
            transport=async_client._transport, base_url="http://test"
        ) as stream_client:
            async with stream_client.stream(
                "GET",
                f"/api/v1/chat/sessions/{session_id}/stream",
                headers={**auth_headers, "Accept": "text/event-stream"},
                params={"message": "测试流式输出"},
            ) as response:
                body = await response.aread()
                text = body.decode()
                assert "[DONE]" in text


class TestMultiTenantIsolation:
    """多租户隔离"""

    async def test_tenant_isolation_sessions(
        self, async_client, test_user, auth_headers, test_agent, test_tenant_b
    ):
        """A 租户的会话对 B 租户不可见"""
        from common.security import create_access_token

        # A 租户创建会话
        create_resp = await async_client.post(
            "/api/v1/chat/sessions",
            headers=auth_headers,
            json={"agent_id": test_agent["id"], "title": "A的会话"},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["data"]["id"]

        # B 租户的 token
        b_user = test_tenant_b["user"]
        b_tenant = test_tenant_b["tenant"]
        token = create_access_token(
            sub=str(b_user.id), tenant_id=str(b_tenant.id), roles=["user"]
        )
        b_headers = {"Authorization": f"Bearer {token}"}

        # B 租户看不到 A 租户的会话
        list_resp = await async_client.get("/api/v1/chat/sessions", headers=b_headers)
        assert list_resp.json()["data"] == []

        # B 租户直接访问 A 的会话应 404
        get_resp = await async_client.get(
            f"/api/v1/chat/sessions/{session_id}", headers=b_headers
        )
        assert get_resp.status_code == 404
