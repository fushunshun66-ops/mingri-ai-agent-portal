# 视觉设计体系升级 — 实施计划

> 版本：1.0 | 依赖：design-tokens.md、page-redesigns.md、component-upgrades.md

---

## 总体策略

- **纯样式层升级**：不修改任何 Vue `<script setup>` 中的业务逻辑、状态管理、API 调用
- **外科手术式改动**：每个文件只改 `<style scoped>` 块，最小化变更范围
- **新增依赖**：`echarts` + `vue-echarts`（仅 DashboardView 需要）、`marked` + `highlight.js`（仅 ChatMessage 需要）
- **验证机制**：每批次后执行 `npm run build`（vue-tsc 类型检查 + vite build）+ `npm run test`

---

## 批次 1：设计 Token 基础设施

> 目标：建立全局 CSS 变量体系，覆盖 Element Plus 默认主色，确保后续所有页面改动有统一的 Token 可用。

### 需修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/styles/main.css` | **重写** | 替换全部 `:root` 变量，加入完整 Token 体系（见 design-tokens.md 第 7 节） |

### 需新增的文件

| 文件 | 说明 |
|------|------|
| `frontend/src/styles/transitions.css` | 全局过渡动画（页面切换、fade-in-up、shimmer 等关键帧） |

### 步骤

1. **重写 `main.css`**
   - 用 design-tokens.md 第 7 节的完整 `:root` 块替换现有 7 个变量
   - 保留 `* { margin: 0; padding: 0; box-sizing: border-box; }`
   - 更新全局 `body` 样式：`font-family: var(--font-sans)`、`background: var(--bg-page)`
   - 更新通用工具类：`.page-container`、`.page-header` 使用新 Token
   - 覆盖 Element Plus 全局样式：`.el-card`、`.el-button--primary` 等使用新变量

2. **创建 `transitions.css`**
   - 定义 `@keyframes`：`fade-in-up`、`fade-in-scale`、`shimmer`、`blink`、`pulse`、`typing-bounce`
   - 定义页面过渡：`.page-enter-active`、`.page-leave-active` 等

3. **在 `main.ts` 中引入**
   - `import './styles/transitions.css'`（放在 `import './styles/main.css'` 之后）

4. **验证**
   ```bash
   cd frontend && npm run build && npm run test
   ```

### 预期影响

- 全局主色从 `#409EFF` 变为 `#1a56db`
- 所有使用 `var(--primary-color)` / Element Plus 默认色的组件自动跟随新主色
- 页面底色微调为 `#f9fafb`
- **零业务功能影响**

---

## 批次 2：核心页面升级

> 目标：对 5 个核心页面 + 6 个核心组件进行全面视觉升级。

### 需修改的文件

#### 2.1 登录 & 注册页

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/LoginView.vue` | 修改 `<style scoped>` | 左右分栏布局，替代紫色渐变 |
| `frontend/src/views/RegisterView.vue` | 修改 `<style scoped>` | 与 LoginView 保持一致的布局和风格 |

**LoginView.vue 模板改动（仅结构，无逻辑变更）：**
- 在 `<template>` 中添加 `.login-wrapper` 包裹层（品牌区 + 表单区）
- 添加 `.login-brand` 品牌展示区（Logo + Slogan）
- 现有 `el-form` 放到 `.login-form-panel` 中

#### 2.2 首页

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/HomeView.vue` | 修改 `<template>` + `<style scoped>` | Hero 区域重设计、添加搜索框、添加分类 Tab、三步引导卡片重设计 |

**模板改动（保留所有现有 script 逻辑）：**
- Welcome Banner 背景渐变改为 `var(--color-primary-700)` 系
- 新增搜索输入框（`.welcome-search`），搜索功能调用已有的 `agentsStore.searchAgents()`
- 新增 `.category-tabs` 分类胶囊按钮
- 三步引导卡片改为 `.guide-card` 结构

#### 2.3 Agent 市场

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/MarketplaceView.vue` | 修改 `<template>` + `<style scoped>` | 分类 pills、骨架屏、工具栏卡片化 |

**模板改动（保留所有现有 script 逻辑）：**
- 分类筛选从 `el-button` 改为 `.category-pill` 胶囊按钮
- 搜索 + 分类区域包裹在 `.marketplace-toolbar` 中
- 加载态从 `el-skeleton` 改为自定义 `.agent-grid-skeleton`

#### 2.4 对话页

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/ChatView.vue` | 修改 `<style scoped>` | 对话区背景色调整 |

#### 2.5 管理仪表盘

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/admin/DashboardView.vue` | 修改 `<template>` + `<style scoped>` + `<script setup>` | 统计卡片重设计、ECharts 替换手写柱状图、表格优化 |

**模板改动（保留所有现有 script 逻辑）：**
- 统计卡片添加趋势箭头和迷你图表容器
- 平台分布图从手写 `.bar-chart` 替换为 `<v-chart>` ECharts 组件
- 趋势图从手写 `.timeline-chart` 替换为 `<v-chart>` ECharts 组件

**新增依赖操作：**
```bash
cd frontend && npm install echarts vue-echarts
```

#### 2.6 核心组件

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/components/AppLayout.vue` | 修改 `<style scoped>` | 顶栏玻璃态、导航项活跃态、侧边栏活跃指示 |
| `frontend/src/components/AgentCard.vue` | 修改 `<template>` + `<style scoped>` | 玻璃态卡片、顶部装饰线、hover 微动效 |
| `frontend/src/components/AgentForm.vue` | 修改 `<style scoped>` | 输入框微动效、分节标题、上传按钮虚线边框 |
| `frontend/src/components/ChatSidebar.vue` | 修改 `<template>` + `<style scoped>` | 时间分组、活跃指示条、hover 删除按钮 |
| `frontend/src/components/ChatMessage.vue` | 修改 `<script setup>` + `<style scoped>` | Markdown 渲染升级（marked + highlight.js） |
| `frontend/src/components/ChatInput.vue` | 修改 `<template>` + `<style scoped>` | 指令建议栏、精致发送按钮 |
| `frontend/src/components/TagInput.vue` | 修改 `<style scoped>` | 胶囊样式标签 |

**ChatMessage 新增依赖：**
```bash
cd frontend && npm install marked highlight.js
```

#### 同时修改 `App.vue`

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/App.vue` | 修改 `<template>` | 添加 `<router-view v-slot>` + `<transition name="page">` 实现页面过渡动画 |

### 验证

```bash
cd frontend && npm run build && npm run test
```

确保：
- `vue-tsc -b` 零 TypeScript 错误
- `vite build` 成功
- `vitest run` 全量测试通过

---

## 批次 3：次要页面 + 最终验证

> 目标：将新设计 Token 应用到剩余次要页面，确保全站视觉一致。

### 需修改的文件

| 文件 | 操作 | 关键变更 |
|------|------|----------|
| `frontend/src/views/AgentDetailView.vue` | 修改 `<style scoped>` | 详情页卡片样式、标签样式 |
| `frontend/src/views/CreateAgentView.vue` | 修改 `<style scoped>` | （使用 AgentForm 组件，已被批次 2 覆盖） |
| `frontend/src/views/EditAgentView.vue` | 修改 `<style scoped>` | （使用 AgentForm 组件，已被批次 2 覆盖） |
| `frontend/src/views/MyAgentsView.vue` | 修改 `<style scoped>` | Agent 卡片网格、空状态 |
| `frontend/src/views/ConnectionsView.vue` | 修改 `<style scoped>` | 连接卡片样式 |
| `frontend/src/views/ProfileView.vue` | 修改 `<style scoped>` | 个人信息卡片、表单样式 |
| `frontend/src/views/admin/AgentStatsView.vue` | 修改 `<style scoped>` | 统计卡片、表格 |
| `frontend/src/views/admin/UserStatsView.vue` | 修改 `<style scoped>` | 统计卡片、表格 |
| `frontend/src/views/admin/AuditLogView.vue` | 修改 `<style scoped>` | 表格、筛选区域 |

### 步骤

1. 逐个文件更新 `<style scoped>`，使用新 Token 替换硬编码色值
2. 统一卡片 → `border-radius: var(--radius-lg)` + `box-shadow: var(--shadow-md)` + `border: 1px solid var(--color-gray-100)`
3. 统一表格 → 斑马纹 + hover 高亮
4. 统一空状态 → 居中 + 柔和文字色

### 验证

```bash
cd frontend && npm run build && npm run test
# 最终确保测试覆盖率 ≥ 80%
cd frontend && npm run test:coverage
```

---

## 完整文件变更矩阵

### 重写（1 个文件）

| 文件 | 批 |
|------|-----|
| `frontend/src/styles/main.css` | 1 |

### 新增（1 个文件）

| 文件 | 批 |
|------|-----|
| `frontend/src/styles/transitions.css` | 1 |

### 修改（约 18 个文件）

| 文件 | 批 | 改动类型 |
|------|-----|----------|
| `frontend/src/App.vue` | 2 | template（添加 transition） |
| `frontend/src/main.ts` | 1 | 新增 import |
| `frontend/src/views/LoginView.vue` | 2 | template + style |
| `frontend/src/views/RegisterView.vue` | 2 | template + style |
| `frontend/src/views/HomeView.vue` | 2 | template + style |
| `frontend/src/views/MarketplaceView.vue` | 2 | template + style |
| `frontend/src/views/ChatView.vue` | 2 | style |
| `frontend/src/views/admin/DashboardView.vue` | 2 | template + script + style |
| `frontend/src/components/AppLayout.vue` | 2 | style |
| `frontend/src/components/AgentCard.vue` | 2 | template + style |
| `frontend/src/components/AgentForm.vue` | 2 | style |
| `frontend/src/components/ChatSidebar.vue` | 2 | template + style |
| `frontend/src/components/ChatMessage.vue` | 2 | script + style |
| `frontend/src/components/ChatInput.vue` | 2 | template + style |
| `frontend/src/components/TagInput.vue` | 2 | style |
| `frontend/src/views/AgentDetailView.vue` | 3 | style |
| `frontend/src/views/MyAgentsView.vue` | 3 | style |
| `frontend/src/views/ConnectionsView.vue` | 3 | style |
| `frontend/src/views/ProfileView.vue` | 3 | style |
| `frontend/src/views/admin/AgentStatsView.vue` | 3 | style |
| `frontend/src/views/admin/UserStatsView.vue` | 3 | style |
| `frontend/src/views/admin/AuditLogView.vue` | 3 | style |

---

## 新增依赖清单

| 依赖 | 版本（建议） | 用途 | 影响文件 |
|------|-------------|------|----------|
| `echarts` | `^5.5.0` | 管理仪表盘图表（替代手写 CSS 柱状图） | `DashboardView.vue` |
| `vue-echarts` | `^7.0.0` | Vue 3 ECharts 封装组件 | `DashboardView.vue` |
| `marked` | `^15.0.0` | Markdown 解析（替代手写正则替换） | `ChatMessage.vue` |
| `highlight.js` | `^11.10.0` | 代码语法高亮 | `ChatMessage.vue` |

---

## 风险与回滚

| 风险 | 缓解措施 |
|------|----------|
| Element Plus 组件样式被 CSS 变量覆盖后出现视觉异常 | 批次 1 后立即全量截图对比 |
| ECharts 引入导致打包体积增大 | ECharts 按需引入（仅 bar + line），预计增加 ~300KB gzip |
| marked + highlight.js 增加包体积 | 预计增加 ~50KB gzip，可接受 |
| 测试用例依赖具体 CSS 类名或样式断言 | 测试只断言功能行为，不应受样式变更影响 |

**回滚方案**：所有改动在 Git 中有明确 commit 记录，可按批次逐一 revert。

---

## 执行顺序图

```
批次 1（基础设施）
  │
  ├── main.css 重写
  ├── transitions.css 新建
  └── main.ts 引入
        │
        ▼ 验证 ✅
        │
批次 2（核心页面 + 组件）
  │
  ├── LoginView + RegisterView
  ├── HomeView
  ├── MarketplaceView
  ├── ChatView + ChatSidebar + ChatMessage + ChatInput
  ├── DashboardView + echarts 安装
  ├── AppLayout + AgentCard + AgentForm
  ├── App.vue 过渡动画
  └── TagInput
        │
        ▼ 验证 ✅
        │
批次 3（次要页面）
  │
  ├── AgentDetailView
  ├── MyAgentsView
  ├── ConnectionsView
  ├── ProfileView
  └── admin/*（AgentStats、UserStats、AuditLog）
        │
        ▼ 最终验证 ✅（build + test + coverage ≥ 80%）
```

---

## 验收标准

- [ ] `npm run build` 零错误
- [ ] `npm run test` 全量通过
- [ ] `npm run test:coverage` ≥ 80%
- [ ] 登录/注册页：品牌区分栏布局，无色 `#667eea` 或 `#764ba2` 残留
- [ ] 全站主色为 `#1a56db`（深科技蓝），无 `#409EFF` 残留
- [ ] 管理仪表盘使用 ECharts 图表，无手写 CSS 柱状图
- [ ] 对话页有 Markdown 渲染增强（marked + highlight.js）
- [ ] 页面切换有淡入过渡动画
- [ ] Agent 卡片 hover 时有顶部装饰线展开 + 柔和上浮
- [ ] 所有新 Token 可在 Chrome DevTools Computed 面板中验证
