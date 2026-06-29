# 组件升级规范

> 版本：1.0 | 依赖：design-tokens.md | 每个组件均给出完整的 scoped CSS 升级方案

---

## 1. AgentCard（AgentCard.vue）

### 1.1 当前问题

- 基于默认 `el-card`，hover 仅 2px 上移，效果粗糙
- 标签样式平淡，图标过小
- 缺乏能力标签和质感

### 1.2 升级方案：玻璃态微质感卡片

```css
.agent-card {
  cursor: pointer;
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-100);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  /* 入场动画 */
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

.agent-card:hover {
  /* 更柔和的上浮，不再生硬 -2px */
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-100);
}

/* 卡片顶部装饰线 — hover 时展开 */
.agent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-primary-500),
    var(--color-primary-400)
  );
  transition: width var(--duration-slow) var(--ease-out);
  transform: translateX(-50%);
}

.agent-card:hover::before {
  width: 100%;
}

/* 图标区域 — 更大更精致 */
.agent-card-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

/* 自定义头像替代 el-avatar — 更大圆角 */
.agent-card-header .agent-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: linear-gradient(
    135deg,
    var(--color-primary-50),
    var(--color-primary-100)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-primary-600);
  flex-shrink: 0;
  overflow: hidden;
}

.agent-card-header .agent-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 名称 */
.agent-name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin: 0 0 var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 平台标签 — 小药丸 */
.agent-platform .el-tag {
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  padding: 0 8px;
  height: 22px;
  line-height: 22px;
  border: none;
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

/* 能力标签 — 微圆角色块 */
.agent-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.agent-tags .tag-item {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border: none;
}

/* 描述 */
.agent-description {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  line-height: 1.6;
  margin-bottom: var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部统计栏 */
.agent-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-gray-100);
}

.agent-stats {
  display: flex;
  gap: var(--space-4);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.stat-item .el-icon {
  font-size: 14px;
  color: var(--color-gray-300);
}

/* "查看详情" 伪按钮 — hover 时显示 */
.agent-card .view-detail {
  font-size: var(--text-xs);
  color: var(--color-primary-500);
  font-weight: 600;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.agent-card:hover .view-detail {
  opacity: 1;
  transform: translateX(0);
}
```

---

## 2. AgentForm（AgentForm.vue）

### 2.1 当前问题

- 表单区域单调，无视觉引导
- 输入框默认样式无特色
- 分节分隔线为 Element Plus 默认样式

### 2.2 升级方案：精致表单 + 微动效

```css
.agent-form {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-100);
  box-shadow: var(--shadow-sm);
}

/* 表单分节标题（替代 el-divider） */
.form-section-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin: var(--space-8) 0 var(--space-4);
  padding-left: var(--space-3);
  border-left: 3px solid var(--color-primary-500);
}

/* Element Plus 输入框全局微调 */
.agent-form .el-input .el-input__wrapper {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-gray-200);
  transition:
    box-shadow var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
  background: var(--color-gray-50);
}

.agent-form .el-input .el-input__wrapper:hover {
  background: var(--bg-surface);
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.agent-form .el-input.is-focus .el-input__wrapper {
  background: var(--bg-surface);
  box-shadow: 0 0 0 2px var(--color-primary-200);
}

/* 文本域 */
.agent-form .el-textarea .el-textarea__inner {
  border-radius: var(--radius-md);
  border-color: var(--color-gray-200);
  background: var(--color-gray-50);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.agent-form .el-textarea .el-textarea__inner:hover {
  border-color: var(--color-gray-300);
  background: var(--bg-surface);
}

.agent-form .el-textarea .el-textarea__inner:focus {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

/* 选择器 */
.agent-form .el-select .el-select__wrapper {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-gray-200);
  background: var(--color-gray-50);
}

.agent-form .el-select .el-select__wrapper:hover {
  background: var(--bg-surface);
}

/* 图标上传区 */
.icon-upload {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.icon-url-input {
  flex: 1;
}

.icon-divider {
  color: var(--color-gray-300);
  font-size: var(--text-sm);
}

/* 上传按钮 — 虚线边框 + 图标 */
.icon-upload .el-button {
  border-style: dashed;
  border-color: var(--color-gray-200);
  background: transparent;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  transitional: all var(--duration-fast) var(--ease-out);
}

.icon-upload .el-button:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-500);
  background: var(--color-primary-50);
}

/* 提交按钮 */
.agent-form .el-button--primary {
  height: 40px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--duration-normal) var(--ease-out);
}

.agent-form .el-button--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.25);
}

/* 取消按钮 — 幽灵样式 */
.agent-form .el-button.is-plain {
  border-radius: var(--radius-md);
  padding: 0 var(--space-6);
}
```

**Label 样式覆盖**

```css
.agent-form .el-form-item__label {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  padding-bottom: var(--space-1);
}
```

---

## 3. ChatSidebar（ChatSidebar.vue）

### 3.1 当前问题

- 设计简陋，无搜索条、无时间分组
- 会话列表项样式平淡，活跃指示不明显
- 骨架屏动画过于基础

### 3.2 升级方案：现代简约侧边栏

```css
.chat-sidebar {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background: var(--color-gray-50);
  border-right: 1px solid var(--color-gray-200);
  display: flex;
  flex-direction: column;
}

/* 头部：新建按钮 + 标题 */
.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-100);
}

.sidebar-header__title {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--color-gray-800);
  margin-bottom: var(--space-3);
}

.new-chat-btn {
  width: 100%;
  padding: 10px 0;
  background: var(--color-primary-500);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.new-chat-btn:hover {
  background: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.25);
}

.new-chat-btn:active {
  transform: scale(0.98);
}

/* 搜索条 */
.search-box {
  padding: var(--space-3) var(--space-4);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--color-gray-100);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  outline: none;
  box-sizing: border-box;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.search-input::placeholder {
  color: var(--color-gray-400);
}

.search-input:focus {
  background: var(--bg-surface);
  border-color: var(--color-primary-200);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

/* 时间分组（新增） */
.session-group-title {
  padding: var(--space-3) var(--space-4) var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 会话列表 */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-3);
}

.session-item {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
  position: relative;
}

.session-item:hover {
  background: var(--color-gray-100);
}

.session-item--active {
  background: var(--color-primary-50);
  box-shadow: inset 3px 0 0 var(--color-primary-500); /* 左侧活跃指示条 */
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.session-item--active .session-title {
  color: var(--color-primary-700);
  font-weight: 600;
}

.session-meta {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* 删除按钮 — 仅 hover 显示 */
.delete-btn {
  background: none;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--color-gray-300);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--color-accent-red);
  background: var(--color-accent-red-bg);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
}

.empty-state__icon {
  font-size: 32px;
  margin-bottom: var(--space-3);
}

.empty-state__text {
  font-size: var(--text-sm);
  text-align: center;
}
```

---

## 4. ChatMessage（ChatMessage.vue）

### 4.1 当前问题

- Markdown 渲染简陋（仅支持 `**bold**` / `*italic*` / `` `code` ``）
- 代码块无语法高亮
- 链接无样式
- 消息气泡过扁

### 4.2 升级方案：丰富 Markdown 渲染 + 精致气泡

**推荐新增依赖**：`marked` + `highlight.js`（轻量 Markdown + 代码高亮）

```bash
npm install marked highlight.js
```

**CSS 升级：**

```css
.chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-5);
  padding: 0 var(--space-6);
  /* 新消息入场 */
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

/* 对齐 */
.chat-message--user { align-items: flex-end; }
.chat-message--assistant { align-items: flex-start; }

/* 气泡 */
.message-bubble {
  max-width: 72%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  line-height: 1.65;
  word-break: break-word;
}

.message-bubble--user {
  background: linear-gradient(
    135deg,
    var(--color-primary-500),
    var(--color-primary-600)
  );
  color: #fff;
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.15);
  border-bottom-right-radius: var(--radius-sm);
}

.message-bubble--assistant {
  background: var(--bg-surface);
  color: var(--color-gray-700);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
  border-bottom-left-radius: var(--radius-sm);
}

/* 消息内容排版 */
.message-content p {
  margin: 0 0 var(--space-2);
}

.message-content p:last-child {
  margin-bottom: 0;
}

.message-content ul,
.message-content ol {
  padding-left: var(--space-5);
  margin: var(--space-2) 0;
}

.message-content li {
  margin-bottom: var(--space-1);
}

.message-content h1,
.message-content h2,
.message-content h3 {
  font-weight: 600;
  margin: var(--space-4) 0 var(--space-2);
  color: inherit;
}

.message-content h1 { font-size: var(--text-xl); }
.message-content h2 { font-size: var(--text-lg); }
.message-content h3 { font-size: var(--text-md); }

/* 行内代码 */
.message-content :not(pre) > code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}

.message-bubble--assistant .message-content :not(pre) > code {
  background: var(--color-gray-100);
  color: var(--color-accent-red);
}

.message-bubble--user .message-content :not(pre) > code {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

/* 代码块 */
.message-content pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-3) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  position: relative;
}

/* 代码块语言标签（右上角） */
.message-content pre::before {
  content: attr(data-lang);
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  text-transform: uppercase;
}

.message-bubble--user .message-content pre {
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

/* 链接 */
.message-content a {
  color: var(--color-primary-500);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--duration-fast) var(--ease-out);
}

.message-content a:hover {
  color: var(--color-primary-700);
}

.message-bubble--user .message-content a {
  color: #fff;
  text-decoration-color: rgba(255, 255, 255, 0.5);
}

/* 引用块 */
.message-content blockquote {
  border-left: 3px solid var(--color-primary-200);
  padding-left: var(--space-3);
  margin: var(--space-2) 0;
  color: var(--color-gray-500);
  font-style: italic;
}

/* 表格 */
.message-content table {
  border-collapse: collapse;
  width: 100%;
  margin: var(--space-2) 0;
}

.message-content th,
.message-content td {
  border: 1px solid var(--color-gray-200);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-size: var(--text-sm);
}

.message-content th {
  background: var(--color-gray-50);
  font-weight: 600;
}

/* 时间戳 */
.message-time {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  margin-top: var(--space-1);
  padding: 0 var(--space-1);
}

.message-bubble--user + .message-time {
  text-align: right;
}

.message-bubble--assistant + .message-time {
  text-align: left;
}

/* 反馈按钮 */
.message-feedback {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.chat-message:hover .message-feedback {
  opacity: 1;
}

.feedback-btn {
  background: none;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.feedback-btn:hover {
  border-color: var(--color-primary-200);
  background: var(--color-primary-50);
}

.feedback-btn--active {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}
```

---

## 5. ChatInput（ChatInput.vue）

### 5.1 当前问题

- 输入框设计简陋，无指令提示
- 发送按钮无特色
- 缺乏精致感

### 5.2 升级方案：底部输入栏 + 指令建议

```css
.chat-input {
  border-top: 1px solid var(--color-gray-100);
  padding: var(--space-4) var(--space-6);
  background: var(--bg-surface);
}

/* 指令建议行（新增） */
.suggestion-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.suggestion-chip {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.suggestion-chip:hover {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

/* 输入区 */
.input-wrapper {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
}

.input-textarea {
  flex: 1;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 160px;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.input-textarea::placeholder {
  color: var(--color-gray-400);
}

.input-textarea:focus {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input-textarea:disabled {
  background: var(--color-gray-100);
  cursor: not-allowed;
  opacity: 0.6;
}

/* 发送按钮 — 圆形 / 圆角 */
.send-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary-500);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.3);
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background: var(--color-gray-200);
  cursor: not-allowed;
}

/* 发送图标（用 Unicode 或 Element Plus 图标） */
.send-btn::before {
  content: '↑';
  font-size: 18px;
  font-weight: 700;
}

/* 停止按钮 */
.stop-btn {
  height: 40px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-accent-red);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.stop-btn:hover {
  background: #b91c1c;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}
```

---

## 6. AppLayout（AppLayout.vue）

### 6.1 当前问题

- 顶栏为纯白无效果
- 导航项 hover 态简陋
- 侧边栏无活跃指示

### 6.2 升级方案：玻璃态顶栏 + 活跃指示器

```css
.app-layout {
  min-height: 100vh;
  background: var(--bg-page);
}

/* 顶栏 — glass morphism */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-gray-200);
  padding: 0 var(--space-6);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* 品牌 logo */
.brand-logo {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-primary-600);
  margin: 0;
  letter-spacing: -0.5px;
}

/* 导航项 */
.header-nav {
  display: flex;
  gap: var(--space-1);
}

.nav-item {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-600);
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.nav-item:hover {
  color: var(--color-gray-800);
  background: var(--color-gray-100);
}

.nav-item.router-link-active {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  font-weight: 600;
}

/* 管理后台入口 — 微弱区分 */
.admin-nav {
  /* 保持与其他导航项一致，不单独高亮 */
}

/* 用户区 */
.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out);
}

.user-info:hover {
  background: var(--color-gray-100);
}

.username {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-700);
}

/* 侧边栏 */
.app-sidebar {
  background: var(--bg-surface);
  border-right: 1px solid var(--color-gray-100);
  padding-top: var(--space-3);
}

.sidebar-title {
  padding: 0 var(--space-5) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-gray-400);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Element Plus menu 覆盖 */
.app-sidebar .el-menu {
  border-right: none;
}

.app-sidebar .el-menu-item {
  height: 40px;
  margin: 2px var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.app-sidebar .el-menu-item:hover {
  background: var(--color-gray-50);
  color: var(--color-gray-800);
}

.app-sidebar .el-menu-item.is-active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  font-weight: 600;
}

/* 主内容区 */
.app-main {
  background: var(--bg-page);
  min-height: calc(100vh - 56px);
  padding: var(--space-5);
}
```

**路由过渡动画**（在 App.vue 中添加）：

```html
<!-- App.vue -->
<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
```

```css
.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }
```

---

## 7. TagInput（TagInput.vue）

### 7.1 升级方案

```css
.tag-input {
  /* 保留功能逻辑，仅升级视觉 */
}

.tag-input .el-tag {
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-600);
  height: 26px;
  padding: 0 var(--space-3);
  transition: all var(--duration-fast) var(--ease-out);
}

.tag-input .el-tag:hover {
  background: var(--color-primary-100);
  border-color: var(--color-primary-300);
}

.tag-input .el-tag .el-tag__close {
  color: var(--color-primary-400);
}

.tag-input .el-tag .el-tag__close:hover {
  color: var(--color-primary-600);
  background: var(--color-primary-100);
  border-radius: var(--radius-full);
}

/* 新增标签输入框 */
.tag-input .el-input .el-input__wrapper {
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 1px var(--color-gray-200);
}
```
