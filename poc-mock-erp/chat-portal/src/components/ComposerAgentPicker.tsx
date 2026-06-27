import type { Flow } from "../types/message";
import { FLOW_META } from "./flowMeta";
import { IconChevronRight } from "./icons";

export function ComposerAgentPicker({
  flows,
  activeIndex,
  onPick,
  onHover,
}: {
  flows: Flow[];
  activeIndex: number;
  onPick: (flow: Flow) => void;
  onHover: (index: number) => void;
}) {
  if (!flows.length) return null;

  return (
    <div className="composer-agent-picker" role="listbox" aria-label="选择智能体">
      <div className="composer-agent-picker-title">指定智能体</div>
      {flows.map((flow, index) => {
        const meta = FLOW_META[flow.flowKey];
        return (
          <button
            key={flow.flowKey}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            className={`composer-agent-picker-item${index === activeIndex ? " is-active" : ""} ${meta?.accent || ""}`}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(flow)}
          >
            <span className="composer-agent-picker-dot" />
            <span className="composer-agent-picker-body">
              <span className="composer-agent-picker-name">{flow.name}</span>
              <span className="composer-agent-picker-desc">{flow.description}</span>
            </span>
            <IconChevronRight />
          </button>
        );
      })}
    </div>
  );
}
