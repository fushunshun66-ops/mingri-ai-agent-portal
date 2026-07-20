import { useState, useId } from "react";
import type { TraceStep } from "../types/message";

const BLOCK_VERB: Record<string, string> = {
  table: "生成表格",
  card: "生成卡片",
  form: "生成表单",
  file: "输出文件",
  json: "整理数据",
  markdown: "组织回复",
  text: "组织回复",
};

function stepVerb(t: TraceStep): string {
  const p = (t.payload || {}) as Record<string, unknown>;
  if (t.step_type === "reasoning") return "推理分析";
  if (t.step_type === "error") return "执行出错";
  if (t.step_type === "node_output") return BLOCK_VERB[String(p.blockType)] || "处理节点";
  return t.step_type;
}

function stepName(t: TraceStep): string {
  const p = (t.payload || {}) as Record<string, unknown>;
  return (p.name as string) || t.node_id || "";
}

export function ProcessPanel({
  traces,
  streaming,
}: {
  traces: TraceStep[];
  streaming: boolean;
  /** 保留兼容；耗时展示已关闭 */
  seconds?: number;
}) {
  // 流式中默认展开，逐步亮起；完成后默认收起，可点开回看
  const [open, setOpen] = useState(streaming);
  const detailId = useId();

  if (!streaming && traces.length === 0) return null;

  const last = traces[traces.length - 1];
  const stepCount = traces.length;

  const barText = streaming
    ? last
      ? `正在${stepVerb(last)}…`
      : "正在思考…"
    : `已完成 ${stepCount} 步处理`;

  return (
    <div className={`process-panel ${open ? "open" : ""} ${streaming ? "streaming" : ""}`}>
      <button
        type="button"
        className="process-bar"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((v) => !v)}
      >
        {streaming ? <span className="process-spinner" /> : <span className="process-check">✓</span>}
        <span className="process-bar-text">{barText}</span>
        {streaming && last && stepName(last) && <span className="process-bar-node">· {stepName(last)}</span>}
        <span className="process-spacer" />
        {/* 耗时展示已关闭
        {seconds ? (
          <span key={seconds} className="process-duration">
            {seconds} 秒
          </span>
        ) : null}
        */}
        <span className={`process-chevron ${open ? "up" : ""}`}>⌄</span>
      </button>

      {open && (
        <div className="process-detail" id={detailId}>
          {traces.length === 0 && <div className="process-empty">正在准备…</div>}
          {traces.map((t, i) => {
            const p = (t.payload || {}) as Record<string, unknown>;
            if (t.step_type === "reasoning") {
              return (
                <blockquote key={t.id || i} className="process-think">
                  {String(p.text || "")}
                </blockquote>
              );
            }
            if (t.step_type === "error") {
              return (
                <div key={t.id || i} className="process-step is-error">
                  <span className="process-dot" />
                  <div className="process-line">
                    <span className="process-verb">{stepVerb(t)}</span>
                    <span className="process-err">{String(p.message || "")}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={t.id || i} className="process-step">
                <span className="process-dot" />
                <div className="process-line">
                  <span className="process-verb">{stepVerb(t)}</span>
                  {stepName(t) && <span className="process-name">{stepName(t)}</span>}
                  {t.node_id && <span className="process-id">{t.node_id}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
