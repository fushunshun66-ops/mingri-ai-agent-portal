import type { TraceStep } from "../types/message";

export function groupTraces(traces: TraceStep[]): Record<string, TraceStep[]> {
  const out: Record<string, TraceStep[]> = {};
  for (const t of traces) {
    const key = t.message_id || "";
    if (!key) continue;
    (out[key] ||= []).push(t);
  }
  return out;
}

export function normalizeLiveTrace(raw: Record<string, unknown>): TraceStep {
  return {
    id: `live-${raw.stepIndex}`,
    session_id: "",
    message_id: null,
    step_index: Number(raw.stepIndex ?? 0),
    step_type: String(raw.stepType ?? ""),
    node_id: (raw.nodeId as string) ?? null,
    payload: raw.payload,
    created_at: "",
  };
}
