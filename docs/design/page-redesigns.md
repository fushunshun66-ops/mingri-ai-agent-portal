# 核心页面重设计规范

> 版本：1.0 | 依赖：design-tokens.md | 所有页面均保留现有功能逻辑，仅升级 CSS/样式层

---

## 1. 登录页（LoginView.vue）& 注册页（RegisterView.vue）

### 1.1 当前问题

- 紫色渐变 `#667eea → #764ba2` 背景，风格陈旧
- 纯白居中卡片，缺乏品牌特征
- 无左侧品牌区，登录体验单调

### 1.2 设计目标

- 现代企业风格，干净克制的蓝白灰配色
- 左右分栏：左侧品牌展示区 + 右侧表单区
- 卡片使用微玻璃态效果，替代纯白硬卡片

### 1.3 布局方案

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │                  │  │                  │  │
│  │   Logo + 品牌名   │  │   登录 / 注册     │  │
│  │                  │  │                  │  │
│  │   企业智能体      │  │   [表单输入区]    │  │
│  │   统一门户        │  │                  │  │
│  │                  │  │   [提交按钮]      │  │
│  │   一句话 Slogan   │  │                  │  │
│  │                  │  │   [底部链接]      │  │
│  │   [装饰插图]      │  │                  │  │
│  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

### 1.4 详细 CSS 规范

**页面容器 `.login-page` / `.register-page`**

```css
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  /* 右上角极淡几何装饰 — 使用 after 伪元素 + radial-gradient */
  position: relative;
  overflow: hidden;
}

.login-page::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
```

**分栏容器 `.login-wrapper` / `.register-wrapper`**

```css
.login-wrapper {
  display: flex;
  max-width: 900px;
  width: 100%;
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
  position: relative;
  z-index: 1;
}
```

**左侧品牌区 `.login-brand`**

```css
.login-brand {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 微纹理叠加 — 使用 repeating 点阵 */
  position: relative;
}

.login-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 20px 20px;
}

.login-brand__logo {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: var(--space-3);
  position: relative;
  z-index: 1;
}

.login-brand__slogan {
  font-size: var(--text-base);
  opacity: 0.75;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  max-width: 260px;
}
```

**右侧表单区 `.login-form-panel`**

```css
.login-form-panel {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-form-panel h2 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
}

.login-form-panel p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-bottom: var(--space-8);
}
```

**Element Plus 输入框微调**

```css
/* 登录页专用 — 更大圆角 */
.login-form-panel .el-input .el-input__wrapper {
  border-radius: var(--radius-md);
  padding: 2px 12px;
  box-shadow: 0 0 0 1px var(--color-gray-200);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.login-form-panel .el-input .el-input__wrapper:hover {
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.login-form-panel .el-input.is-focus .el-input__wrapper {
  box-shadow: 0 0 0 2px var(--color-primary-200);
}
```

**提交按钮**

```css
.login-btn {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: 600;
  margin-top: var(--space-2);
  /* Element Plus 按钮会自动跟随 --el-color-primary */
  transition: all var(--duration-normal) var(--ease-out);
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.3);
}
```

### 1.5 响应式

```css
@media (max-width: 768px) {
  .login-brand { display: none; }
  .login-wrapper { max-width: 420px; border-radius: var(--radius-lg); }
  .login-form-panel { padding: var(--space-8) var(--space-6); }
}
```

---

## 2. 首页（HomeView.vue）

### 2.1 当前问题

- Welcome Banner 使用旧主色渐变 `#409EFF → #764ba2`
- "三步引导"卡片样式简陋，纯 el-card 无设计感
- 搜索功能缺失，无法快速找 Agent
- 推荐区域无分类 Tab，信息扁平

### 2.2 设计目标

- Hero 区域：品牌渐变背景 + 搜索框 + 实时统计数据
- 精选 Agent 卡片网格，带分类 Tab 切换
- 三步引导使用精致卡片，带图标和步骤序号

### 2.3 布局方案

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Hero Banner                                │  │
│  │  欢迎回来，{用户名}                          │  │
│  │  探索和使用企业内部 AI Agent                  │  │
│  │  ┌──────────────────────────────┐          │  │
│  │  │ 🔍 搜索 Agent...              │          │  │
│  │  └──────────────────────────────┘          │  │
│  │  [🤖 128 Agents] [👥 456 用户] [💬 1.2K 会话] │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  推荐 Agent  [全部] [对话类] [分析类] [工具类] │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │  │
│  │  │ Card │ │ Card │ │ Card │ │ Card │      │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ ①发现│ │ ②安装│ │ ③使用│                    │
│  └──────┘ └──────┘ └──────┘                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 2.4 Hero Banner 规范

```css
.welcome-banner {
  position: relative;
  background: linear-gradient(135deg, var(--color-primary-700) 0%, var(--color-primary-500) 50%, var(--color-primary-600) 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-12);
  color: #fff;
  overflow: hidden;
}

/* 背景装饰 — 右上角模糊渐变圆 */
.welcome-banner::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
}

/* 微纹理叠加 */
.welcome-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

.welcome-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  position: relative;
  z-index: 1;
}

.welcome-subtitle {
  font-size: var(--text-lg);
  opacity: 0.85;
  position: relative;
  z-index: 1;
  margin-top: var(--space-2);
  margin-bottom: var(--space-6);
}

/* 搜索框（新增） */
.welcome-search {
  max-width: 480px;
  margin-bottom: var(--space-8);
  position: relative;
  z-index: 1;
}

/* 统计行 */
.welcome-stats {
  display: flex;
  gap: var(--space-8);
  position: relative;
  z-index: 1;
}

.welcome-stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.welcome-stat-item__value {
  font-size: var(--text-xl);
  font-weight: 700;
}

.welcome-stat-item__label {
  font-size: var(--text-sm);
  opacity: 0.75;
}
```

### 2.5 推荐 Agent 区域

```css
.recommended-section {
  margin-top: var(--space-8);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.section-header h2 {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-gray-800);
}

/* 分类 Tab（新增） */
.category-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.category-tab {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.category-tab:hover {
  background: var(--color-gray-100);
}

.category-tab--active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-color: var(--color-primary-200);
  font-weight: 600;
}
```

### 2.6 三步引导卡片

```css
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  margin-top: var(--space-8);
}

.guide-card {
  position: relative;
  padding: var(--space-6);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
  transition: all var(--duration-normal) var(--ease-out);
  border: 1px solid var(--color-gray-100);
}

.guide-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-100);
}

/* 步骤序号圆 */
.guide-card__step {
  width: 40px;
  height: 40px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: #fff;
  font-size: var(--text-lg);
  font-weight: 700;
}

.guide-card__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
}

.guide-card__desc {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  line-height: 1.5;
}
```

---

## 3. Agent 市场（MarketplaceView.vue）

### 3.1 当前问题

- 分类筛选用默认按钮，视觉上平淡
- 卡片网格间距生硬，无加载骨架屏
- 分页区域无设计感

### 3.2 设计目标

- 分类 Tab 使用胶囊/pill 风格
- 搜索框更精致，带图标装饰
- Agent 卡片重新设计（详见 component-upgrades.md）
- 骨架屏加载态

### 3.3 详细规范

**搜索 + 分类 + 排序栏**

```css
.marketplace-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
}

/* 搜索框 */
.marketplace-toolbar .search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.marketplace-toolbar .search-input .el-input__wrapper {
  border-radius: var(--radius-md);
  background: var(--color-gray-50);
  box-shadow: none;
  border: 1px solid var(--color-gray-200);
  transition: all var(--duration-fast) var(--ease-out);
}

.marketplace-toolbar .search-input.is-focus .el-input__wrapper {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

/* 分类 pills */
.category-filter {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.category-pill {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-600);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  white-space: nowrap;
}

.category-pill:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.category-pill--active {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}

.category-pill--active:hover {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}
```

**骨架屏加载态**

```css
/* 替代 el-skeleton — 自定义更精致的骨架屏 */
.agent-grid-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}

.skeleton-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

.skeleton-card__header {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.skeleton-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 0%,
    var(--color-gray-50) 50%,
    var(--color-gray-100) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card__line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 0%,
    var(--color-gray-50) 50%,
    var(--color-gray-100) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card__line--short { width: 60%; }
.skeleton-card__line--medium { width: 80%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**分页区域**

```css
.pagination-area {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
}
```

---

## 4. 对话页（ChatView.vue）

### 4.1 当前问题

- 消息气泡扁平，缺乏层次
- 无打字动画
- 侧边栏设计简陋，无搜索功能
- 整体对话区视觉平淡

### 4.2 设计目标

- 参考 Notion AI / ChatGPT 风格 — 精致、柔和、层次分明
- 消息气泡：更大圆角、微妙阴影、流畅动画
- 新增"正在输入"动画指示器
- 侧边栏：时间分组、搜索条

### 4.3 详细规范

**对话主区域**

```css
.chat-main {
  background: var(--color-gray-50); /* 暖灰底，比纯白柔和 */
}

/* 消息列表背景 — 极浅灰 */
.message-list {
  background:
    linear-gradient(to bottom, var(--color-gray-50), #ffffff 10%);
}
```

**消息气泡（ChatMessage.vue 重设计）**

```css
.message-bubble {
  max-width: 72%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  line-height: 1.65;
  word-break: break-word;
  /* 统一入场动画 */
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

/* 用户消息 — 蓝色系，更精致的阴影 */
.message-bubble--user {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: #fff;
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.15);
  border-bottom-right-radius: var(--radius-sm);
}

/* AI 消息 — 白色卡片 */
.message-bubble--assistant {
  background: var(--bg-surface);
  color: var(--color-gray-700);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
  border-bottom-left-radius: var(--radius-sm);
}
```

**代码块样式**

```css
.message-content pre {
  background: var(--color-gray-800);
  color: #e5e7eb;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.message-content code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

/* 行内代码 */
.message-content :not(pre) > code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

/* 消息中用户代码（蓝底白字上） */
.message-bubble--user .message-content :not(pre) > code {
  background: rgba(255, 255, 255, 0.18);
}
```

**打字动画指示器**

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-gray-300);
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
```

---

## 5. 管理仪表盘（DashboardView.vue）

### 5.1 当前问题

- 手写 CSS 柱状图，无真正可视化能力
- 统计卡片设计平淡
- 表格无斑马纹、hover 高亮

### 5.2 设计目标

- 引入 ECharts 替代手写柱状图
- 统计卡片：彩色图标 + 趋势箭头 + 迷你折线
- 数据表格：斑马纹 + hover 高亮 + 响应式优化

### 5.3 统计卡片

```css
.metric-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
  transition: all var(--duration-normal) var(--ease-out);
}

.metric-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-100);
  transform: translateY(-1px);
}

/* 卡片头部：图标 + 数值 + 趋势 */
.metric-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.metric-card__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/* 趋势箭头 */
.metric-card__trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.metric-card__trend--up {
  color: var(--color-accent-green);
  background: var(--color-accent-green-bg);
}

.metric-card__trend--down {
  color: var(--color-accent-red);
  background: var(--color-accent-red-bg);
}

.metric-card__value {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-gray-900);
  line-height: 1;
}

.metric-card__label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}
```

### 5.4 ECharts 图表区

```css
.chart-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
}

.chart-panel__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin-bottom: var(--space-4);
}

.chart-container {
  width: 100%;
  height: 280px; /* ECharts 需要在 JS 中初始化 */
}
```

**ECharts 主题色适配**（在图表初始化时通过 option 设置）：

```typescript
// 使用设计 Token 中的色彩
const CHART_COLORS = {
  primary: '#1a56db',
  primaryLight: '#7baaf7',
  green: '#059669',
  orange: '#d97706',
  gray: '#e5e7eb',
  grayText: '#6b7280',
}
```

### 5.5 数据表格

```css
/* 表格面板 */
.table-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
}

/* Element Plus 表格覆盖 */
.table-panel .el-table {
  --el-table-border-color: var(--color-gray-100);
  --el-table-header-bg-color: var(--color-gray-50);
  --el-table-row-hover-bg-color: var(--color-primary-50);
}

.table-panel .el-table th {
  font-weight: 600;
  color: var(--color-gray-600);
  font-size: var(--text-sm);
}

.table-panel .el-table td {
  color: var(--color-gray-700);
}
```

### 5.6 ECharts 引入说明

在 `DashboardView.vue` 中新增对 ECharts 的使用：

```bash
# 新增依赖
npm install echarts vue-echarts
```

图表配置要点：
- **平台分布图**：横向柱状图（bar），使用 `--color-primary-500` 渐变
- **趋势图**：折线面积图（line + areaStyle），双系列（会话/消息），30 天数据点
  - 会话：`--color-primary-500`
  - 消息：`--color-accent-green`
