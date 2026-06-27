import type { Flow } from "../types/message";
import { FLOW_META } from "../components/flowMeta";

export type MentionRange = { start: number; query: string };

export function getMentionRange(text: string, cursor: number): MentionRange | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  return { start: before.length - match[0].length, query: match[1] };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flowAliases(flow: Flow): string[] {
  const label = FLOW_META[flow.flowKey]?.label;
  return [...new Set([flow.name, label].filter(Boolean))] as string[];
}

export function filterFlowsForMention(flows: Flow[], query: string): Flow[] {
  const q = query.trim().toLowerCase();
  if (!q) return flows;
  return flows.filter((flow) => {
    const haystack = [flow.name, FLOW_META[flow.flowKey]?.label, flow.flowKey.replace(/_/g, "")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** 发送前解析行首 @智能体名称 */
export function parseAgentMentionFromContent(
  content: string,
  flows: Flow[],
): { flowKey: string | null; cleanContent: string } {
  const trimmed = content.trim();
  if (!trimmed.startsWith("@")) return { flowKey: null, cleanContent: trimmed };

  for (const flow of flows) {
    for (const alias of flowAliases(flow)) {
      const re = new RegExp(`^@${escapeRegExp(alias)}(?=\\s|$)`);
      if (re.test(trimmed)) {
        return {
          flowKey: flow.flowKey,
          cleanContent: trimmed.replace(re, "").trim(),
        };
      }
    }
  }

  return { flowKey: null, cleanContent: trimmed };
}

export function findFlowByKey(flows: Flow[], flowKey: string | null | undefined): Flow | null {
  if (!flowKey) return null;
  return flows.find((f) => f.flowKey === flowKey) ?? null;
}
