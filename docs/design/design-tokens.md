# 设计 Token 体系 — 企业智能体统一门户

> 版本：1.0 | 日期：2026-06-29 | 适用范围：frontend/ 全部样式

---

## 1. 色彩体系

### 1.1 主色 — 深科技蓝

以 `#1a56db` 为核心主色，比 Element Plus 默认 `#409EFF` 更深沉、更专业，适合 B2B 企业产品。

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-primary-50` | `#e8f0fe` | 最浅底色、选中背景 |
| `--color-primary-100` | `#d2e3fc` | 标签底色、hover 浅底 |
| `--color-primary-200` | `#a8c7fa` | 边框色、进度条底色 |
| `--color-primary-300` | `#7baaf7` | 禁用态边框 |
| `--color-primary-400` | `#4c8df5` | 次要按钮 hover |
| `--color-primary-500` | `#1a56db` | **主色**（按钮、链接、强调） |
| `--color-primary-600` | `#1649ba` | 主色 hover |
| `--color-primary-700` | `#123c99` | 主色 active/pressed |
| `--color-primary-800` | `#0e2f78` | 深色背景上的主色文字 |
| `--color-primary-900` | `#0a2257` | 最深主色（极少使用） |

### 1.2 辅助色

用于标签、状态、分类标识，保持饱和度克制的企业风格。

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-accent-green` | `#059669` | 成功、在线、增长趋势↑ |
| `--color-accent-green-bg` | `#ecfdf5` | 成功底色 |
| `--color-accent-orange` | `#d97706` | 警告、待处理 |
| `--color-accent-orange-bg` | `#fffbeb` | 警告底色 |
| `--color-accent-red` | `#dc2626` | 错误、危险、下降趋势↓ |
| `--color-accent-red-bg` | `#fef2f2` | 错误底色 |
| `--color-accent-purple` | `#7c3aed` | 特殊标签、VIP |
| `--color-accent-purple-bg` | `#f5f3ff` | VIP 底色 |
| `--color-accent-cyan` | `#0891b2` | 信息、链接色备选 |
| `--color-accent-cyan-bg` | `#ecfeff` | 信息底色 |

### 1.3 中性色

用于文字层级、背景层次、边框分隔。

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-gray-50` | `#f9fafb` | 页面底色（替代 `#f5f7fa`） |
| `--color-gray-100` | `#f3f4f6` | 卡片底色、表头 |
| `--color-gray-200` | `#e5e7eb` | 边框、分隔线 |
| `--color-gray-300` | `#d1d5db` | 禁用态边框、占位符色块 |
| `--color-gray-400` | `#9ca3af` | 禁用态文字、占位符文字 |
| `--color-gray-500` | `#6b7280` | 辅助文字、次要说明 |
| `--color-gray-600` | `#4b5563` | 次要标题 |
| `--color-gray-700` | `#374151` | 正文文字 |
| `--color-gray-800` | `#1f2937` | 主标题 |
| `--color-gray-900` | `#111827` | 最强调文字 |

### 1.4 语义色（覆盖 Element Plus 默认）

直接覆盖 Element Plus CSS 变量，使其与主色协调。

| Token | 值 | 说明 |
|-------|-----|------|
| `--el-color-primary` | `var(--color-primary-500)` | Element Plus 主色 |
| `--el-color-primary-light-3` | `var(--color-primary-400)` | Element Plus 浅色 |
| `--el-color-primary-light-5` | `var(--color-primary-200)` | Element Plus 更浅 |
| `--el-color-primary-light-7` | `var(--color-primary-100)` | Element Plus 最浅 |
| `--el-color-primary-light-9` | `var(--color-primary-50)` | Element Plus 极浅 |
| `--el-color-primary-dark-2` | `var(--color-primary-600)` | Element Plus 深色 |
| `--el-color-success` | `var(--color-accent-green)` | 成功色 |
| `--el-color-warning` | `var(--color-accent-orange)` | 警告色 |
| `--el-color-danger` | `var(--color-accent-red)` | 危险色 |
| `--el-color-info` | `var(--color-gray-500)` | 信息色 |

### 1.5 背景色体系

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-page` | `var(--color-gray-50)` | 页面全局底色 |
| `--bg-surface` | `#ffffff` | 卡片、面板、表单容器 |
| `--bg-surface-raised` | `#ffffff` | 弹窗、下拉菜单（最顶层） |
| `--bg-surface-hover` | `var(--color-gray-100)` | 表面 hover 态 |
| `--bg-mask` | `rgba(0, 0, 0, 0.45)` | 遮罩层 |

---

## 2. 字体体系

### 2.1 字体族

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
             'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
```

### 2.2 字号与行高阶梯

| Token | 字号 | 行高 | 字重 | 用途 |
|-------|------|------|------|------|
| `--text-xs` | 12px | 1.5 | 400 | 辅助信息、标签小字 |
| `--text-sm` | 13px | 1.5 | 400 | 次要说明、描述文字 |
| `--text-base` | 14px | 1.6 | 400 | 正文、表格、表单 |
| `--text-md` | 16px | 1.6 | 500 | 次级标题、卡片标题 |
| `--text-lg` | 18px | 1.5 | 600 | 区块标题 |
| `--text-xl` | 20px | 1.4 | 600 | 页面标题 |
| `--text-2xl` | 24px | 1.35 | 700 | Hero 大标题 |
| `--text-3xl` | 30px | 1.3 | 700 | 首页主标题 |
| `--text-4xl` | 36px | 1.2 | 800 | 登录页大标题 |

---

## 3. 间距体系

基于 4px 基准，覆盖所有内外边距、栅格间距。

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-1` | 4px | 极小间距（图标与文字、标签间隙） |
| `--space-2` | 8px | 紧凑间距（组内元素） |
| `--space-3` | 12px | 小间距（表单 label 与 input） |
| `--space-4` | 16px | 常规间距（卡片 padding、区块 gap） |
| `--space-5` | 20px | 中等间距（网格 gap、卡片间） |
| `--space-6` | 24px | 大间距（区块间、页面 padding） |
| `--space-8` | 32px | 特大间距（section 间） |
| `--space-12` | 48px | Hero 区域上下 padding |
| `--space-16` | 64px | 页面级大留白 |

---

## 4. 圆角体系

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 4px | 小标签、代码块、输入框内部 |
| `--radius-md` | 8px | 按钮、输入框、下拉面板、消息气泡 |
| `--radius-lg` | 12px | 卡片、面板、弹窗 |
| `--radius-xl` | 16px | 大卡片、Hero Banner |
| `--radius-full` | 9999px | 头像、徽章、药丸标签 |

---

## 5. 阴影体系

分层阴影，营造层次感和精致感。

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | 微妙层次（表格行、浅底卡片） |
| `--shadow-md` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | 卡片默认（el-card 等） |
| `--shadow-lg` | `0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)` | 卡片 hover、下拉面板 |
| `--shadow-xl` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)` | 弹窗、抽屉 |
| `--shadow-2xl` | `0 20px 40px -12px rgba(0,0,0,0.12)` | 登录卡片、全屏遮罩面板 |

---

## 6. 动效体系

### 6.1 时长

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | 150ms | hover 颜色切换、focus 态 |
| `--duration-normal` | 200ms | 按钮状态、卡片上浮、元素显隐 |
| `--duration-slow` | 300ms | 页面过渡、弹窗进入、展开/收起 |
| `--duration-slower` | 500ms | Hero 入场动画、骨架屏 shimmer |

### 6.2 缓动函数

| Token | 值 | 用途 |
|-------|-----|------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 默认过渡（元素出现、展开） — 类似 ease-out-expo |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 平滑对称过渡（hover 往返、缩放） |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性过渡（弹窗出现、微交互反馈） |

### 6.3 过渡预设

```css
/* 颜色过渡（hover、focus） */
transition: color var(--duration-fast) var(--ease-out),
            background-color var(--duration-fast) var(--ease-out),
            border-color var(--duration-fast) var(--ease-out);

/* 上浮过渡（卡片 hover） */
transition: transform var(--duration-normal) var(--ease-out),
            box-shadow var(--duration-normal) var(--ease-out);

/* 透明度过渡（元素显隐） */
transition: opacity var(--duration-slow) var(--ease-out);

/* 弹窗进入（弹性） */
transition: opacity var(--duration-slow) var(--ease-spring),
            transform var(--duration-slow) var(--ease-spring);
```

### 6.4 关键帧动画

```css
/* 淡入上移（页面过渡、消息出现） */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 淡入缩放（弹窗、卡片加载） */
@keyframes fade-in-scale {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

/* 骨架屏闪烁 */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

/* 打字光标闪烁 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

/* 脉冲（在线指示器） */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}
```

### 6.5 页面过渡

使用 Vue `<Transition>` 包裹 `<router-view>`：

```css
/* 路由切换：淡入 + 轻微上移 */
.page-enter-active {
  transition: opacity var(--duration-slow) var(--ease-out),
              transform var(--duration-slow) var(--ease-out);
}
.page-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }
```

---

## 7. CSS 变量完整清单（main.css :root）

最终 `main.css` 中的 `:root` 块应包含以上所有 token，按分区组织：

```css
:root {
  /* ===== 色彩 ===== */
  /* 主色 */
  --color-primary-50:  #e8f0fe;
  --color-primary-100: #d2e3fc;
  --color-primary-200: #a8c7fa;
  --color-primary-300: #7baaf7;
  --color-primary-400: #4c8df5;
  --color-primary-500: #1a56db;
  --color-primary-600: #1649ba;
  --color-primary-700: #123c99;
  --color-primary-800: #0e2f78;
  --color-primary-900: #0a2257;

  /* 辅助色 */
  --color-accent-green:     #059669;
  --color-accent-green-bg:  #ecfdf5;
  --color-accent-orange:    #d97706;
  --color-accent-orange-bg: #fffbeb;
  --color-accent-red:       #dc2626;
  --color-accent-red-bg:    #fef2f2;
  --color-accent-purple:    #7c3aed;
  --color-accent-purple-bg: #f5f3ff;
  --color-accent-cyan:      #0891b2;
  --color-accent-cyan-bg:   #ecfeff;

  /* 中性色 */
  --color-gray-50:  #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* 背景色 */
  --bg-page:          var(--color-gray-50);
  --bg-surface:       #ffffff;
  --bg-surface-raised:#ffffff;
  --bg-surface-hover: var(--color-gray-100);
  --bg-mask:          rgba(0, 0, 0, 0.45);

  /* ===== Element Plus 语义覆盖 ===== */
  --el-color-primary:         var(--color-primary-500);
  --el-color-primary-light-3: var(--color-primary-400);
  --el-color-primary-light-5: var(--color-primary-200);
  --el-color-primary-light-7: var(--color-primary-100);
  --el-color-primary-light-9: var(--color-primary-50);
  --el-color-primary-dark-2:  var(--color-primary-600);
  --el-color-success:         var(--color-accent-green);
  --el-color-warning:         var(--color-accent-orange);
  --el-color-danger:          var(--color-accent-red);
  --el-color-info:            var(--color-gray-500);

  /* ===== 字体 ===== */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue',
               Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco',
               'Courier New', monospace;

  --text-xs:  12px;
  --text-sm:  13px;
  --text-base:14px;
  --text-md:  16px;
  --text-lg:  18px;
  --text-xl:  20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;

  /* ===== 间距 ===== */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;

  /* ===== 圆角 ===== */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* ===== 阴影 ===== */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg:  0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04);
  --shadow-xl:  0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
  --shadow-2xl: 0 20px 40px -12px rgba(0,0,0,0.12);

  /* ===== 动效时长 ===== */
  --duration-fast:   150ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --duration-slower: 500ms;

  /* ===== 动效缓动函数 ===== */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 8. 与旧版变量对照（迁移参考）

| 旧变量 | 新变量 | 说明 |
|--------|--------|------|
| `--primary-color: #409EFF` | `--el-color-primary: var(--color-primary-500)` | 主色更换，通过覆盖 el 变量影响全局 |
| `--primary-dark: #337ECC` | `--color-primary-600: #1649ba` | 深色变体 |
| `--bg-color: #f5f7fa` | `--bg-page: var(--color-gray-50)` | 页面底色微调为暖灰 |
| `--text-primary: #303133` | `--color-gray-800: #1f2937` | 主文字色微调 |
| `--text-regular: #606266` | `--color-gray-600: #4b5563` | 次要文字 |
| `--text-secondary: #909399` | `--color-gray-500: #6b7280` | 辅助文字 |
| `--border-color: #dcdfe6` | `--color-gray-200: #e5e7eb` | 边框色微调 |
| `--border-radius: 8px` | `--radius-md: 8px` | 保持相同值 |
