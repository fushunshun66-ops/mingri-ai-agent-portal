import type { Flow } from "../types/message";
import { FLOW_META } from "./flowMeta";
import { IconChevronRight } from "./icons";

export function WelcomeHome({
  flows,
  onPickExample,
  onSelectFlow,
}: {
  flows: Flow[];
  onPickExample: (text: string) => void;
  onSelectFlow: (flowKey: string) => void;
}) {
  const prompts = flows.flatMap((f) =>
    (f.examples || []).slice(0, 2).map((ex) => ({
      text: ex.text,
      flowKey: f.flowKey,
      flowName: FLOW_META[f.flowKey]?.label || f.name,
    })),
  );

  return (
    <div className="workbench">
      <header className="workbench-head">
        <div className="workbench-head-main">
          <p className="workbench-eyebrow">明日控股 · ERP 智能业务入口</p>
          <h1>智能业务办理</h1>
          <p className="workbench-lead">选择业务模块录入需求，或直接在下方输入，系统将自动匹配流程并生成单据</p>
        </div>
        <div className="workbench-stats" aria-hidden>
          <div className="stat-card">
            <span className="stat-value">3</span>
            <span className="stat-label">业务模块</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">—</span>
            <span className="stat-label">待处理单据</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">实时</span>
            <span className="stat-label">中台连接</span>
          </div>
        </div>
      </header>

      <section className="workbench-modules" aria-label="业务模块">
        {flows.map((flow) => {
          const meta = FLOW_META[flow.flowKey] || {
            icon: null,
            accent: "cap-accent-blue",
            label: flow.name,
            module: "业务",
            docType: flow.name,
          };
          return (
            <button
              key={flow.flowKey}
              type="button"
              className={`module-card module-card-btn ${meta.accent}`}
              onClick={() => onSelectFlow(flow.flowKey)}
              aria-label={`开始办理：${flow.name}`}
            >
              <div className="module-card-head">
                <div className="module-card-icon">{meta.icon}</div>
                <div>
                  <span className="module-card-module">{meta.module}</span>
                  <span className="module-card-name">{flow.name}</span>
                </div>
              </div>
              <p className="module-card-desc">{flow.description}</p>
              {(flow.highlights || []).length > 0 && (
                <ul className="module-card-highlights">
                  {(flow.highlights || []).slice(0, 3).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
              <span className="module-card-action" aria-hidden>
                开始办理
                <IconChevronRight />
              </span>
            </button>
          );
        })}
      </section>

      {prompts.length > 0 && (
        <section className="workbench-examples" aria-label="常用示例">
          <h2 className="workbench-section-title">常用业务示例</h2>
          <div className="workbench-example-grid">
            {prompts.slice(0, 6).map((p) => (
              <button
                key={`${p.flowKey}-${p.text}`}
                type="button"
                className="example-item"
                onClick={() => {
                  onSelectFlow(p.flowKey);
                  onPickExample(p.text);
                }}
              >
                <span className={`example-item-tag tag-${p.flowKey}`}>{p.flowName}</span>
                <span className="example-item-text">{p.text}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
