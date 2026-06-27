# 统一智能体对话窗口（POC）

面向明日控股的统一前端对话交互窗口：单一入口接入自研「智能体中台」，由中台自动路由到不同流程（多智能体），并对返回结果做**结构化优化展示**（Markdown / 表格 / 卡片 / 文件 / 原始 JSON），同时**统一存储**会话、消息与执行 Trace。

## 架构

```
┌──────────────┐     /api/*      ┌──────────────────┐   X-API-TOKEN   ┌────────────────┐
│  chat-portal │  ───────────▶   │     gateway      │ ─────────────▶  │   智能体中台     │
│ React + Vite │  ◀───────────   │  Express (BFF)   │ ◀─────────────  │ (自研 REST/SSE) │
└──────────────┘   结构化消息块    └────────┬─────────┘   原始响应        └────────────────┘
                                           │
                                     ┌─────▼─────┐
                                     │  SQLite   │  会话 / 消息 / Trace 统一入库
                                     └───────────┘
```

- **chat-portal**：统一对话窗口前端。左侧选择智能体流程、查看历史会话；右侧可开关执行 Trace 面板。
- **gateway**：Backend-for-Frontend。负责调用中台、把中台动态响应「归一化」为标准消息块、并将会话/消息/Trace 落库。
- **中台**：真实自研智能体中台，承载三个业务流程（智能体），由中台内部完成路由编排。

## 目录结构

```
poc-mock-erp/
├── gateway/                 # BFF 网关（Node + Express + SQLite）
│   ├── config/agent.json    # 中台连接配置：baseUrl、token、3 个流程映射
│   ├── src/
│   │   ├── index.js         # 路由：health/flows/sessions/messages/traces/chat
│   │   ├── config.js        # 配置加载（支持环境变量覆盖）
│   │   ├── db/repository.js # SQLite：sessions / messages / traces
│   │   ├── adapters/        # 中台适配层（createSession / runChatFlow / upload）
│   │   └── normalizers/     # 中台响应 → 标准消息块 + Trace 抽取
│   └── data/                # SQLite 数据库文件（运行时生成）
└── chat-portal/             # React + Vite 前端
    └── src/
        ├── App.tsx                       # 主界面：侧栏 + 对话区 + Trace
        ├── api/client.ts                 # 网关 API 客户端
        ├── components/
        │   ├── MessageList.tsx
        │   ├── TracePanel.tsx
        │   └── renderers/BlockRenderer.tsx  # 多形态消息块渲染
        └── types/message.ts              # 标准消息块协议类型
```

## 快速开始

需要 Node 18+（gateway 使用内置 `node:sqlite`，建议 Node 22+）。

```bash
# 1) 启动网关（默认 http://127.0.0.1:3001）
cd gateway
npm install
npm run dev

# 2) 启动前端（默认 http://127.0.0.1:5173，已配置 /api 代理到网关）
cd ../chat-portal
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173 ，左侧选择一个流程「新建对话」即可。

## 接入的三个智能体流程

| flowKey | 名称 | 说明 |
|---|---|---|
| `sales_order` | 智能销售订单生成 | 口语下单，抽取客户/商品/数量/单价/交期，生成销售订单 |
| `shipment` | 智能发货申请单生成 | 提货函/文字识别，匹配待发货订单，生成发货申请单 |
| `contract_review` | 合同附件智能评审 | 上传合同附件，与 ERP 订单比对，输出风险评审 |

`agentSn` / `versionSn` 等具体映射见 `gateway/config/agent.json`。

## 配置说明（gateway/config/agent.json）

| 字段 | 含义 |
|---|---|
| `baseUrl` | 中台 API 基地址 |
| `token` | 中台 `X-API-TOKEN`（请勿提交到公共仓库） |
| `mode` | `live` 调用真实中台；`mock` 走本地模拟响应（离线演示用） |
| `requestTimeoutMs` | 单次中台调用超时 |
| `flows.<key>` | 每个流程的 `name/description/agentSn/versionSn/inputKey/placeholder` |

可用环境变量覆盖：`PORT`、`DB_PATH`、`AGENT_BASE_URL`、`AGENT_TOKEN`、`AGENT_MODE`。

> 切换为离线演示：把 `mode` 改为 `mock`，前端体验完全一致，但不产生真实中台写入。

## 标准消息块协议

网关把中台动态字段（如 `data.content.output[]`、含 `<think>` 推理段、JSON 字符串）归一化为统一的块数组，前端按 `type` 渲染：

- `markdown` / `text`：富文本 / 纯文本
- `table`：对象数组自动转表格（列取并集）
- `card`：单对象（如订单字段）转键值卡片
- `file`：文件/图片预览与下载
- `json`：兜底，可折叠查看原始数据

`<think>...</think>` 推理内容不进入可见消息，而是抽取为 `reasoning` 类型 Trace。

## API 一览（gateway）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 + 当前模式 |
| GET | `/api/flows` | 可用智能体流程列表（含 `acceptsFile`）|
| GET | `/api/sessions` | 历史会话列表 |
| POST | `/api/sessions` | 新建会话（内部调用中台创建 sessionSn）|
| GET | `/api/sessions/:id/messages` | 会话消息（含结构化块）|
| GET | `/api/sessions/:id/traces` | 会话执行 Trace |
| POST | `/api/sessions/:id/files` | 文件上传（base64 透传中台，返回 `fileSn`）|
| POST | `/api/sessions/:id/chat` | 发送消息（可带 `files`）：代理中台 + 归一化 + 入库（一次性返回）|
| POST | `/api/sessions/:id/chat/stream` | **流式**发送消息（SSE）：实时转发中台逐节点输出，结束后整体入库 |

## 流式输出（SSE）

中台对话流原生支持流式（`stream:true`）。前端默认走 `/chat/stream`，逐节点实时渲染：

- 网关用 `stream:true` 调中台，逐 SSE 事件解析 `data.{id,type,name,currentValue}`，按节点 `id` 累计（同节点后续事件按累计值覆盖），每步向前端推送一次 `event: blocks` 全量快照；推理 `<think>` 段推送 `event: trace`。
- 结束推送 `event: done`（含 `messageId`/`runStatus`），并把完整助手消息 + Trace 落库；出错推送 `event: error`。
- 前端用 `fetch` + `ReadableStream` 读取，占位助手气泡随 `blocks` 增量刷新（先打字动画，逐块出现）。

> 假设：同一节点的 `currentValue` 为「累计值」（覆盖语义）。若中台某字段为增量 token，需要改为追加合并。

## 文件上传与各智能体入参

## 文件上传与各智能体入参

通过中台「对话流入参查询」接口（`/open/v1/chatFlow/inputParams/{agentSn}/{versionSn}`）确认了三个智能体的真实入参：

| flowKey | 文本入参 | 文件入参(DOC) | 图片入参(IMAGE) |
|---|---|---|---|
| `sales_order` | `Query` | — | — |
| `shipment` | `input` | `file` | `image` |
| `contract_review` | `input` | `file` | `image` |

> 注意：发货 / 合同评审两个智能体的文本入参是 `input` 而非 `Query`，已在 `agent.json` 中以 `inputKey` 修正；文件/图片入参键分别由 `fileInputKey` / `imageInputKey` 配置。前端在 `acceptsFile=true` 的流程下显示附件上传按钮，上传得到 `fileSn` 后随消息发送，网关按文件类型注入到对应入参。

## 安全约定

- `agent.json` 内的 `token` 为敏感凭据，已在 `.gitignore` 范围外的真实部署中应改用环境变量注入。
- 网关对中台失败做了降级（返回 error 卡片并记录 error Trace），不向前端泄漏堆栈细节。
```
