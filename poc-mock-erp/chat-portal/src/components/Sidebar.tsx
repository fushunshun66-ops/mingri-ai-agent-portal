import type { Flow, Session } from "../types/message";
import mrjtLogo from "../assets/mrjt-logo.png";
import { Button } from "@/components/ui/button";
import { FLOW_META } from "./flowMeta";
import { IconNew } from "./icons";

function formatSessionTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

type SessionStatus = "running" | "active" | "idle";

function resolveSessionStatus(
  sessionId: string,
  activeId: string | null,
  sending: boolean,
  uploading: boolean,
): SessionStatus {
  if (activeId !== sessionId) return "idle";
  if (sending || uploading) return "running";
  return "active";
}

const STATUS_LABEL: Record<SessionStatus, string | null> = {
  running: "处理中",
  active: "当前",
  idle: null,
};

export function Sidebar({
  sessions,
  activeId,
  draftFlowKey,
  showFlowPicker,
  sending,
  uploading,
  onGoHome,
  onNewSession,
  onLoadSession,
  flows,
  isOpen,
  onClose,
}: {
  sessions: Session[];
  activeId: string | null;
  draftFlowKey: string | null;
  showFlowPicker: boolean;
  sending: boolean;
  uploading: boolean;
  onGoHome: () => void;
  onNewSession: (flowKey: string) => void;
  onLoadSession: (id: string) => void;
  flows: Flow[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const runningCount = sessions.filter(
    (s) => resolveSessionStatus(s.id, activeId, sending, uploading) === "running",
  ).length;

  return (
    <>
      <div
        className={`sidebar-backdrop${isOpen ? " visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar${isOpen ? " open" : ""}`}>
      <button type="button" className="brand" onClick={onGoHome} aria-label="返回首页">
        <img src={mrjtLogo} alt="明日控股" className="brand-logo" />
        <div className="brand-text">
          <span className="brand-sub">智能业务入口</span>
        </div>
      </button>

      <Button className="new-chat-btn" onClick={onGoHome}>
        <IconNew />
        新建业务办理
      </Button>

      {showFlowPicker && (
        <nav className="sidebar-modules" aria-label="业务模块">
          <div className="sidebar-section-head sidebar-section-head--nav">
            <span className="sidebar-section-label sidebar-section-label--nav">业务模块</span>
            <span className="sidebar-section-hint">切换办理类型</span>
          </div>
          <div className="sidebar-module-panel">
            {flows.map((flow) => (
              <button
                key={flow.flowKey}
                type="button"
                className={`flow-chip ${draftFlowKey === flow.flowKey ? "active" : ""}`}
                onClick={() => onNewSession(flow.flowKey)}
              >
                <span className={`flow-dot ${FLOW_META[flow.flowKey]?.accent || ""}`} />
                <span className="flow-chip-name">{flow.name}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className={`sidebar-history ${showFlowPicker ? "sidebar-history--split" : ""}`}>
        <div className="sidebar-section-head sidebar-section-head--history">
          <span className="sidebar-section-label sidebar-section-label--history">办理记录</span>
          {runningCount > 0 && (
            <span className="sidebar-running-count" aria-live="polite">
              {runningCount} 进行中
            </span>
          )}
        </div>
        <div className="session-list">
        {sessions.map((s) => {
          const meta = FLOW_META[s.flow_key];
          const status = resolveSessionStatus(s.id, activeId, sending, uploading);
          const statusLabel = STATUS_LABEL[status];
          return (
            <button
              key={s.id}
              type="button"
              className={`session-item session-item--${status}`}
              onClick={() => onLoadSession(s.id)}
              aria-current={status === "active" || status === "running" ? "true" : undefined}
            >
              <div className="session-item-head">
                <span
                  className={`session-status-dot session-status-dot--${status}`}
                  aria-hidden
                  title={statusLabel || undefined}
                />
                <span className="session-item-title" title={s.title}>{s.title}</span>
              </div>
              <div className="session-item-foot">
                <div className="session-item-meta">
                  {statusLabel && (
                    <span className={`session-status-badge session-status-badge--${status}`}>{statusLabel}</span>
                  )}
                  {meta && <span className={`session-item-tag ${meta.accent}`}>{meta.label}</span>}
                </div>
                <span className="session-item-time">{formatSessionTime(s.updated_at || s.created_at)}</span>
              </div>
            </button>
          );
        })}
        {sessions.length === 0 && <div className="session-empty">完成首条办理后将显示在此</div>}
        </div>
      </div>
    </aside>
    </>
  );
}
