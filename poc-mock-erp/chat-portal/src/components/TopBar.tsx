import { FLOW_META } from "./flowMeta";
import { Badge } from "@/components/ui/badge";

function ModeBadge({ mode }: { mode?: string }) {
  if (!mode) return null;
  const isLive = mode === "live";
  const isOffline = mode === "offline";
  const label = isLive ? "中台已连接" : isOffline ? "中台离线" : mode;
  
  if (isLive) return (
    <Badge variant="outline" className="topbar-mode topbar-mode--live inline-flex items-center gap-[6px] text-[11px] font-semibold px-[10px] py-[3px] bg-[#eef8f0] text-[#1a7f37] border-[rgba(26,127,55,0.22)] rounded">
      <span className="topbar-mode-dot" style={{ background: "#1a7f37" }} aria-hidden />
      {label}
    </Badge>
  );
  if (isOffline) return (
    <Badge variant="destructive" className="topbar-mode topbar-mode--offline inline-flex items-center gap-[6px] text-[11px] font-semibold px-[10px] py-[3px] bg-[#fff0f0] border-[rgba(255,77,79,0.25)] rounded">
      <span className="topbar-mode-dot" style={{ background: "#ff4d4f" }} aria-hidden />
      {label}
    </Badge>
  );
  return (
    <Badge variant="outline" className="topbar-mode topbar-mode--other inline-flex items-center gap-[6px] text-[11px] font-semibold px-[10px] py-[3px] bg-[#fafafa] rounded">
      <span className="topbar-mode-dot" style={{ background: "#999" }} aria-hidden />
      {label}
    </Badge>
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
        {meta && (() => {
          const isBlue = meta.accent === "cap-accent-blue";
          return (
            <Badge
              variant={isBlue ? "secondary" : "outline"}
              className="text-[10px] font-semibold px-[6px] py-[1px]"
              style={isBlue ? { color: "var(--primary)" } : (!isBlue ? (meta.accent === "cap-accent-orange"
                ? { backgroundColor: "var(--accent-orange-soft)", color: "var(--accent-orange)" }
                : { backgroundColor: "var(--accent-purple-soft)", color: "var(--accent-purple)" }
              ) : undefined)}
            >
              {meta.label}
            </Badge>
          );
        })()}
        <ModeBadge mode={mode} />
      </div>
    </header>
  );
}
