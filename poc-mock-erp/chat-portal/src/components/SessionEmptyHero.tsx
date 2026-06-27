import type { Flow } from "../types/message";
import { FLOW_META } from "./flowMeta";

export function SessionEmptyHero({ flow }: { flow?: Flow | null }) {
  if (!flow) return null;
  const meta = FLOW_META[flow.flowKey] || { icon: null, accent: "cap-accent-blue", module: "业务", docType: flow.name };

  return (
    <div className="session-workbench-empty">
      <div className={`session-workbench-icon ${meta.accent}`}>{meta.icon}</div>
      <p className="session-workbench-module">{meta.module}</p>
      <h2>{flow.name}</h2>
      <p className="session-workbench-desc">{flow.description}</p>
      {(flow.highlights || []).length > 0 && (
        <ul className="session-workbench-highlights">
          {(flow.highlights || []).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {flow.acceptsFile && (
        <p className="session-workbench-tip">支持上传附件，可直接拖拽到下方输入区</p>
      )}
    </div>
  );
}
