"""使用统计 API 测试

测试场景：
- 管理员可访问 Agent 使用统计
- 按会话数/消息数/Token 消耗排序
- 日期过滤、分页
- 用户活跃统计
- 时间线概览
- 普通用户被拒绝
"""


class TestAgentStats:
    """Agent 使用统计端点 GET /api/v1/admin/stats/agents"""

    async def test_admin_can_access_agent_stats(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records, test_installations
    ):
        """管理员应能访问 Agent 使用统计"""
        resp = await async_client.get(
            "/api/v1/admin/stats/agents",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert isinstance(body["data"], list)
        assert body["pagination"] is not None

    async def test_normal_user_forbidden(
        self, async_client, auth_headers
    ):
        """普通用户访问统计应被拒绝 403"""
        resp = await async_client.get(
            "/api/v1/admin/stats/agents",
            headers=auth_headers,
        )
        assert resp.status_code == 403

    async def test_agent_stats_sort_by_sessions(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records, test_installations
    ):
        """按会话数排序"""
        resp = await async_client.get(
            "/api/v1/admin/stats/agents?sort_by=sessions",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        # 验证排序：sessions 递减
        sessions_counts = [item["sessions"] for item in data]
        assert sessions_counts == sorted(sessions_counts, reverse=True), f"应为降序，实际: {sessions_counts}"

    async def test_agent_stats_sort_by_tokens(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records, test_installations
    ):
        """按 Token 消耗排序"""
        resp = await async_client.get(
            "/api/v1/admin/stats/agents?sort_by=tokens",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        tokens_list = [item.get("tokens", 0) for item in data]
        assert tokens_list == sorted(tokens_list, reverse=True)

    async def test_agent_stats_pagination(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records, test_installations
    ):
        """Agent 统计分页"""
        resp = await async_client.get(
            "/api/v1/admin/stats/agents?page=1&page_size=1",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["pagination"]["page_size"] == 1

    async def test_agent_stats_date_filter(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records, test_installations
    ):
        """Agent 统计日期过滤"""
        from datetime import datetime, timezone, timedelta
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        resp = await async_client.get(
            f"/api/v1/admin/stats/agents?start_date={week_ago}&end_date={today}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200


class TestUserStats:
    """用户活跃统计端点 GET /api/v1/admin/stats/users"""

    async def test_admin_can_access_user_stats(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records
    ):
        """管理员应能访问用户统计"""
        resp = await async_client.get(
            "/api/v1/admin/stats/users",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert isinstance(body["data"], list)
        assert body["pagination"] is not None

    async def test_user_stats_contains_expected_fields(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records
    ):
        """用户统计应包含预期字段"""
        resp = await async_client.get(
            "/api/v1/admin/stats/users",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        if data:
            user = data[0]
            assert "username" in user
            assert "sessions" in user
            assert "messages" in user
            assert "tokens" in user


class TestTimeline:
    """时间线概览端点 GET /api/v1/admin/stats/overview"""

    async def test_timeline_overview_basic(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records
    ):
        """时间线概览应返回每日数据"""
        resp = await async_client.get(
            "/api/v1/admin/stats/overview",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert "daily" in data
        assert isinstance(data["daily"], list)
        for day in data["daily"]:
            assert "date" in day
            assert "sessions" in day
            assert "messages" in day
            assert "tokens" in day

    async def test_timeline_overview_custom_days(
        self, async_client, admin_auth_headers, test_chat_session, test_messages, test_usage_records
    ):
        """自定义天数范围"""
        resp = await async_client.get(
            "/api/v1/admin/stats/overview?days=7",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data["daily"]) <= 7

    async def test_timeline_overview_normal_user_forbidden(
        self, async_client, auth_headers
    ):
        """普通用户访问时间线应被拒绝"""
        resp = await async_client.get(
            "/api/v1/admin/stats/overview",
            headers=auth_headers,
        )
        assert resp.status_code == 403
