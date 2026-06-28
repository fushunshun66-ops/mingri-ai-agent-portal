"""审计日志 API 测试

测试场景：
- 管理员可查询审计日志列表
- 支持分页
- 支持按 action、resource_type、user_id 筛选
- 支持日期范围筛选
- 可获取单条审计日志详情
- 可导出 CSV
- 普通用户被拒绝
"""


class TestAuditLogs:
    """审计日志查询端点"""

    async def test_admin_can_list_audit_logs(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """管理员应能列出审计日志"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert isinstance(body["data"], list)
        assert len(body["data"]) > 0
        assert body["pagination"] is not None
        assert body["pagination"]["total"] >= 8

    async def test_normal_user_forbidden(
        self, async_client, auth_headers, test_audit_logs
    ):
        """普通用户访问审计日志应被拒绝 403"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs",
            headers=auth_headers,
        )
        assert resp.status_code == 403

    async def test_audit_logs_pagination(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """审计日志分页查询"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs?page=1&page_size=3",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 3
        assert body["pagination"]["page"] == 1
        assert body["pagination"]["page_size"] == 3
        assert body["pagination"]["total"] >= 8
        assert body["pagination"]["total_pages"] >= 3

    async def test_audit_logs_filter_by_action(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """按 action 筛选审计日志"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs?action=CREATE",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        for log in body["data"]:
            assert log["action"] == "CREATE"

    async def test_audit_logs_filter_by_resource_type(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """按 resource_type 筛选审计日志"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs?resource_type=agent",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        for log in body["data"]:
            assert log["resource_type"] == "agent"

    async def test_audit_logs_filter_by_user_id(
        self, async_client, admin_auth_headers, test_audit_logs, test_user
    ):
        """按 user_id 筛选审计日志"""
        resp = await async_client.get(
            f"/api/v1/admin/audit-logs?user_id={test_user.id}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        for log in body["data"]:
            assert log["user_id"] == str(test_user.id)

    async def test_audit_log_detail(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """获取单条审计日志详情"""
        log_id = test_audit_logs[0]["id"]
        resp = await async_client.get(
            f"/api/v1/admin/audit-logs/{log_id}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["id"] == log_id
        assert "action" in body["data"]
        assert "resource_type" in body["data"]

    async def test_audit_log_detail_not_found(
        self, async_client, admin_auth_headers
    ):
        """不存在的审计日志应返回 404"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs/99999",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 404

    async def test_audit_log_export_csv(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """导出审计日志为 CSV"""
        resp = await async_client.get(
            "/api/v1/admin/audit-logs/export?format=csv",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")
        # 验证 CSV 有表头
        content = resp.text
        assert "id" in content or "action" in content

    async def test_audit_logs_date_filter(
        self, async_client, admin_auth_headers, test_audit_logs
    ):
        """按日期范围筛选审计日志"""
        from datetime import datetime, timezone, timedelta
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        resp = await async_client.get(
            f"/api/v1/admin/audit-logs?start_date={week_ago}&end_date={today}",
            headers=admin_auth_headers,
        )
        assert resp.status_code == 200
