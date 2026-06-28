# 05 — API 设计

> 版本：v1.0 | 日期：2026-06-28 | 状态：设计阶段

---

## 1. 文档目的

本文档定义企业智能体统一门户平台的 API 设计规范，包括 RESTful 风格约定、统一响应格式、版本策略、关键端点列表，作为前后端开发的接口契约。

---

## 2. API 设计原则

| 原则 | 说明 |
|---|---|
| **RESTful 资源导向** | URL 表示资源，HTTP 方法表示操作 |
| **统一响应格式** | 所有接口返回相同信封结构 |
| **语义化 HTTP 状态码** | 正确使用 2xx/4xx/5xx |
| **分页与过滤** | 列表接口统一分页参数和过滤参数 |
| **版本化** | URL 路径前缀 `/api/v1/` |
| **类型安全** | 请求/响应使用 Pydantic Schema，自动生成 OpenAPI 文档 |

---

## 3. 统一响应格式

### 3.1 成功响应

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "meta": {
    "request_id": "req-uuid-v4",
    "timestamp": "2026-06-28T10:30:00Z"
  }
}
```

### 3.2 列表响应（含分页）

```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 156,
    "total_pages": 8
  },
  "meta": {
    "request_id": "req-uuid-v4",
    "timestamp": "2026-06-28T10:30:00Z"
  }
}
```

### 3.3 错误响应

```json
{
  "success": false,
  "code": 404,
  "message": "Agent 不存在",
  "error": {
    "type": "RESOURCE_NOT_FOUND",
    "detail": "Agent with id 'xxx' not found in tenant 'yyy'"
  },
  "meta": {
    "request_id": "req-uuid-v4",
    "timestamp": "2026-06-28T10:30:00Z"
  }
}
```

### 3.4 验证错误响应

```json
{
  "success": false,
  "code": 422,
  "message": "请求参数校验失败",
  "error": {
    "type": "VALIDATION_ERROR",
    "detail": [
      {
        "field": "name",
        "message": "Agent 名称不能为空",
        "code": "missing"
      },
      {
        "field": "platform_type",
        "message": "不支持该平台类型",
        "code": "invalid_choice"
      }
    ]
  },
  "meta": {
    "request_id": "req-uuid-v4",
    "timestamp": "2026-06-28T10:30:00Z"
  }
}
```

### 3.5 Pydantic Schema 定义

```python
from pydantic import BaseModel
from typing import Any, Optional, Generic, TypeVar
from datetime import datetime

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int

class RequestMeta(BaseModel):
    request_id: str
    timestamp: datetime

class APIResponse(BaseModel, Generic[T]):
    success: bool
    code: int
    message: str
    data: Optional[T] = None
    pagination: Optional[PaginationMeta] = None
    error: Optional[dict] = None
    meta: RequestMeta

class APIListResponse(APIResponse[list[T]]):
    """列表响应的便捷别名"""
    pass
```

---

## 4. 认证与鉴权

### 4.1 认证方式

所有需要认证的端点需在请求头中携带 JWT：

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 4.2 租户上下文

多租户环境下，租户 ID 从 JWT payload 中自动解析：

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "roles": ["user"],
  "exp": 1719563400
}
```

### 4.3 公开端点（无需认证）

| 端点 | 说明 |
|---|---|
| `POST /api/v1/auth/login` | 用户登录 |
| `POST /api/v1/auth/register` | 用户注册 |
| `POST /api/v1/auth/refresh` | 刷新 Token |
| `GET /api/v1/health` | 健康检查 |
| `GET /api/v1/docs` | OpenAPI 文档 |

---

## 5. 关键端点列表

### 5.1 认证相关 (Auth)

```
POST   /api/v1/auth/login              — 用户登录
POST   /api/v1/auth/register           — 用户注册（可选：需邀请码）
POST   /api/v1/auth/refresh            — 刷新 Access Token
POST   /api/v1/auth/logout             — 登出（Token 加入吊销列表）
GET    /api/v1/auth/me                 — 获取当前用户信息
PUT    /api/v1/auth/me                 — 更新个人信息
PUT    /api/v1/auth/me/password        — 修改密码
POST   /api/v1/auth/sso/{provider}     — SSO 登录回调
```

### 5.2 用户管理 (Users) — 管理端

```
GET    /api/v1/users                   — 用户列表（分页、搜索）
POST   /api/v1/users                   — 创建用户（管理员）
GET    /api/v1/users/{id}              — 用户详情
PUT    /api/v1/users/{id}              — 更新用户
DELETE /api/v1/users/{id}              — 删除用户
PUT    /api/v1/users/{id}/status       — 启用/禁用用户
PUT    /api/v1/users/{id}/roles        — 分配角色
```

### 5.3 角色与权限 (Roles)

```
GET    /api/v1/roles                   — 角色列表
POST   /api/v1/roles                   — 创建角色
GET    /api/v1/roles/{id}              — 角色详情
PUT    /api/v1/roles/{id}              — 更新角色
DELETE /api/v1/roles/{id}              — 删除角色（非系统角色）
PUT    /api/v1/roles/{id}/permissions  — 更新角色权限
```

### 5.4 Agent 管理 (Agents)

```
GET    /api/v1/agents                  — Agent 列表（管理后台）
POST   /api/v1/agents                  — 创建 Agent
GET    /api/v1/agents/{id}             — Agent 详情
PUT    /api/v1/agents/{id}             — 更新 Agent
DELETE /api/v1/agents/{id}             — 删除 Agent
PUT    /api/v1/agents/{id}/status      — 修改状态（发布/下线/归档）
POST   /api/v1/agents/{id}/sync        — 从平台同步 Agent 信息
POST   /api/v1/agents/{id}/clone       — 克隆 Agent
```

### 5.5 Agent 市场 (Marketplace)

```
GET    /api/v1/marketplace/agents      — 市场 Agent 列表（搜索、分类、排序）
GET    /api/v1/marketplace/agents/{id} — Agent 市场详情（含评分、安装数）
GET    /api/v1/marketplace/search      — 全文搜索 Agent
GET    /api/v1/marketplace/categories  — 分类列表
GET    /api/v1/marketplace/recommended — 推荐 Agent（基于用户行为）
POST   /api/v1/marketplace/agents/{id}/install    — 安装 Agent
DELETE /api/v1/marketplace/agents/{id}/install    — 卸载 Agent
POST   /api/v1/marketplace/agents/{id}/favorite   — 收藏 Agent
DELETE /api/v1/marketplace/agents/{id}/favorite   — 取消收藏
POST   /api/v1/marketplace/agents/{id}/reviews    — 提交评价
GET    /api/v1/marketplace/agents/{id}/reviews    — 获取评价列表
```

### 5.6 平台连接管理 (Connections)

```
GET    /api/v1/connections             — 平台连接列表
POST   /api/v1/connections             — 创建平台连接
GET    /api/v1/connections/{id}        — 连接详情
PUT    /api/v1/connections/{id}        — 更新连接配置
DELETE /api/v1/connections/{id}        — 删除连接
POST   /api/v1/connections/{id}/test   — 测试连接
GET    /api/v1/connections/platform-types — 获取支持的平台类型列表
POST   /api/v1/connections/{id}/sync-agents — 从平台同步 Agent 列表
```

### 5.7 对话会话 (Chat Sessions)

```
GET    /api/v1/sessions                — 我的会话列表
POST   /api/v1/sessions                — 创建新会话
GET    /api/v1/sessions/{id}           — 会话详情
PUT    /api/v1/sessions/{id}           — 更新会话（标题等）
DELETE /api/v1/sessions/{id}           — 删除会话
PUT    /api/v1/sessions/{id}/archive   — 归档会话
PUT    /api/v1/sessions/{id}/unarchive — 取消归档
```

### 5.8 对话消息 (Chat Messages)

```
GET    /api/v1/sessions/{id}/messages  — 获取会话消息历史
POST   /api/v1/sessions/{id}/messages  — 发送消息（非流式）
GET    /api/v1/sessions/{id}/stream    — 流式对话端点（SSE）
POST   /api/v1/sessions/{id}/stop      — 停止当前生成
POST   /api/v1/messages/{id}/feedback  — 提交消息反馈（like/dislike）
```

### 5.9 我的 Agent (My Agents)

```
GET    /api/v1/my/agents               — 我安装的 Agent 列表
GET    /api/v1/my/agents/recent        — 最近使用的 Agent
GET    /api/v1/my/agents/favorites     — 我收藏的 Agent
GET    /api/v1/my/sessions             — 我的对话列表（按 Agent 分组）
```

### 5.10 门户首页 (Portal Dashboard)

```
GET    /api/v1/portal/dashboard        — 首页聚合数据
  → 返回：
  {
    "recent_agents": [...],            // 最近使用的 5 个 Agent
    "recommended_agents": [...],       // 推荐 Agent
    "stats": {                         // 个人使用统计
      "total_conversations": 42,
      "total_messages": 1200,
      "this_month_messages": 300
    },
    "announcements": [...]             // 系统公告
  }
```

### 5.11 监控与统计 (Monitor)

```
GET    /api/v1/admin/stats/overview    — 管理后台统计概览
GET    /api/v1/admin/stats/agents      — Agent 使用统计（排行、趋势）
GET    /api/v1/admin/stats/users       — 用户活跃统计
GET    /api/v1/admin/audit-logs        — 审计日志查询（分页、过滤）
GET    /api/v1/admin/metrics           — Prometheus 指标（需鉴权）
```

### 5.12 内部端点 (Internal) — 服务间调用，不对外暴露

```
GET    /internal/users/verify          — 验证 JWT Token
GET    /internal/agents/{id}/public-info — 获取 Agent 公开信息
POST   /internal/adapters/chat         — 发起对话（chat → adapters）
POST   /internal/adapters/agent-info   — 获取 Agent 平台信息
```

---

## 6. 流式对话 (SSE) 端点详细设计

### 6.1 端点定义

```
GET /api/v1/sessions/{session_id}/stream
Headers:
  Authorization: Bearer {jwt}
  Accept: text/event-stream
Query Parameters:
  message: string (required) — 用户消息内容
  files: string (optional)    — JSON 序列化的文件列表
```

### 6.2 SSE 事件类型

| 事件名 | 说明 | data 内容 |
|---|---|---|
| `start` | 流式对话开始 | `{"session_id": "uuid", "agent_id": "uuid", "message_id": "uuid"}` |
| `chunk` | 消息内容块 | `{"content": "你", "index": 0}` |
| `tool_call` | Agent 调用工具 | `{"tool_name": "web_search", "input": {...}}` |
| `tool_result` | 工具调用结果 | `{"tool_name": "web_search", "output": "..."}` |
| `done` | 对话完成 | `{"conversation_id": "xxx", "tokens": {"prompt": 100, "completion": 200}}` |
| `error` | 对话出错 | `{"code": "PLATFORM_ERROR", "message": "..."}` |

### 6.3 SSE 流示例

```
event: start
data: {"session_id": "uuid", "agent_id": "uuid", "message_id": "uuid"}

event: chunk
data: {"content": "你好", "index": 0}

event: chunk
data: {"content": "！", "index": 1}

event: chunk
data: {"content": "有什么", "index": 2}

event: chunk
data: {"content": "可以帮你的？", "index": 3}

event: done
data: {"conversation_id": "dify-conv-123", "tokens": {"prompt": 50, "completion": 8}}
```

### 6.4 前端消费 SSE

```typescript
// composables/useChatStream.ts
async function* streamChat(sessionId: string, message: string) {
  const url = `/api/v1/sessions/${sessionId}/stream?message=${encodeURIComponent(message)}`;
  const eventSource = new EventSource(url, {
    // Note: EventSource 不支持自定义 Header，实际使用 fetch + ReadableStream
  });

  // 推荐使用 fetch + ReadableStream 方式（支持自定义 Header）
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 解析 SSE 事件...
  }
}
```

---

## 7. 错误码体系

### 7.1 HTTP 状态码使用

| 状态码 | 使用场景 |
|---|---|
| `200` | 请求成功 |
| `201` | 资源创建成功 |
| `204` | 删除成功（无响应体） |
| `400` | 请求参数错误（业务逻辑级别） |
| `401` | 未认证或 Token 过期 |
| `403` | 无权限访问 |
| `404` | 资源不存在 |
| `409` | 资源冲突（如重复名称） |
| `422` | 请求参数校验失败（Pydantic 验证） |
| `429` | 请求频率超限 |
| `500` | 服务器内部错误 |
| `502` | 上游平台不可用 |
| `503` | 服务暂时不可用 |
| `504` | 上游平台超时 |

### 7.2 业务错误类型 (error.type)

| 错误类型 | 说明 |
|---|---|
| `VALIDATION_ERROR` | 参数校验失败 |
| `RESOURCE_NOT_FOUND` | 资源不存在 |
| `RESOURCE_CONFLICT` | 资源冲突 |
| `FORBIDDEN` | 无权限 |
| `UNAUTHORIZED` | 未认证 |
| `RATE_LIMITED` | 频率限制 |
| `PLATFORM_UNAVAILABLE` | 外部平台不可用 |
| `PLATFORM_ERROR` | 外部平台业务错误 |
| `INTERNAL_ERROR` | 服务器内部错误 |
| `NOT_IMPLEMENTED` | 功能未实现 |
| `TENANT_QUOTA_EXCEEDED` | 租户配额超限 |

---

## 8. 分页与过滤规范

### 8.1 分页参数

所有列表端点统一使用以下查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `page` | integer | 1 | 页码（从 1 开始） |
| `page_size` | integer | 20 | 每页数量（最大 100） |
| `sort_by` | string | `created_at` | 排序字段 |
| `sort_order` | string | `desc` | `asc` / `desc` |

### 8.2 过滤参数

各端点可按需支持以下过滤：

| 参数 | 类型 | 示例 | 说明 |
|---|---|---|---|
| `search` | string | `?search=客服` | 全文搜索关键词 |
| `status` | string | `?status=published` | 状态筛选 |
| `category_id` | string | `?category_id=uuid` | 分类筛选 |
| `platform_type` | string | `?platform_type=dify` | 平台类型筛选 |
| `tags` | string | `?tags=客服,数据分析` | 标签筛选（逗号分隔） |
| `date_from` | ISO 8601 | `?date_from=2026-01-01` | 时间范围起 |
| `date_to` | ISO 8601 | `?date_to=2026-06-30` | 时间范围止 |

---

## 9. WebSocket 端点（可选）

除了 SSE 流式对话，可提供 WebSocket 作为备选方案：

```
WS /api/v1/ws/chat/{session_id}
```

### WebSocket 消息格式

```json
// 客户端 → 服务端
{
  "type": "send_message",
  "payload": {
    "content": "你好",
    "files": []
  }
}

// 服务端 → 客户端（流式）
{
  "type": "message_chunk",
  "payload": {
    "content": "你好",
    "index": 0
  }
}

// 服务端 → 客户端（完成）
{
  "type": "message_done",
  "payload": {
    "message_id": "uuid",
    "tokens": {"prompt": 50, "completion": 8}
  }
}

// 双向心跳
{ "type": "ping" }
{ "type": "pong" }
```

---

## 10. API 版本策略

### 10.1 版本号规则

- URL 路径前缀：`/api/v1/`、`/api/v2/`
- 大版本号变更（v1 → v2）表示 **不兼容** 的 API 变更
- 小版本通过 Header 传递：`X-API-Version: 1.2`

### 10.2 兼容性承诺

| 变更类型 | 是否需要大版本号升级 |
|---|---|
| 新增端点 | ❌ 不需要 |
| 新增可选字段 | ❌ 不需要 |
| 新增必填字段 | ✅ 需要 |
| 删除字段 | ✅ 需要 |
| 修改字段类型 | ✅ 需要 |
| 修改 URL 路径 | ✅ 需要 |
| 修改错误码含义 | ✅ 需要 |
