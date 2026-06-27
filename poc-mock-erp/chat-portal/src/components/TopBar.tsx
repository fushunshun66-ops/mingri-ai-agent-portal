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
}: {
  flowName?: string;
  flowKey?: string;
  sessionTitle?: string | null;
  mode?: string;
}) {
  const meta = flowKey ? FLOW_META[flowKey] : null;
  return (
    <header className="topbar">
      <div className="topbar-left">
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
