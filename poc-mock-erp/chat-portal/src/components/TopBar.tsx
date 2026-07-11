import { FLOW_META } from "./flowMeta";

function ModeBadge({ mode }: { mode?: string }) {
  if (!mode) return null;
  const isLive = mode === "live";
  const isOffline = mode === "offline";
  const label = isLive ? "中台已连接" : isOffline ? "中台离线" : mode;
  const variant = isLive ? "live" : isOffline ? "offline" : "other";
  return (
    <span className={`topbar-mode topbar-mode--${variant}`} title={isLive ? "已连接智能体中台，实时处理" : undefined}>
      <span className="topbar-mode-dot" aria-hidden />
      {label}
    </span>
  );
}

export function TopBar({
  flowName,
  flowKey,
  sessionTitle,
  mode,
  onMenuToggle,
  isSidebarOpen,
}: {
  flowName?: string;
  flowKey?: string;
  sessionTitle?: string | null;
  mode?: string;
  onMenuToggle: () => void;
  isSidebarOpen?: boolean;
}) {
  const meta = flowKey ? FLOW_META[flowKey] : null;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuToggle}
          aria-label={isSidebarOpen ? "关闭菜单" : "打开菜单"}
          aria-expanded={isSidebarOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <nav className="topbar-crumb" aria-label="面包屑">
          <span>智能业务入口</span>
          {meta && (
            <>
              <span className="topbar-crumb-sep">/</span>
              <span>{meta.module}</span>
            </>
          )}
          {flowName && (
            <>
              <span className="topbar-crumb-sep">/</span>
              <span className="topbar-crumb-current">{flowName}</span>
            </>
          )}
        </nav>
        {sessionTitle && sessionTitle !== "新对话" && (
          <p className="topbar-session">{sessionTitle}</p>
        )}
      </div>
      <div className="topbar-right">
        {meta && <span className={`topbar-tag ${meta.accent}`}>{meta.label}</span>}
        <ModeBadge mode={mode} />
      </div>
    </header>
  );
}
