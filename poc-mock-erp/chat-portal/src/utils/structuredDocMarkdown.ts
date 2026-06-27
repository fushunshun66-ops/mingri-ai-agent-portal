/**
 * 客户端 markdown 兜底：从中台原文提取 JSON 单据（与 gateway jsonPayload 规则一致）
 */

const CODE_FENCE_RE = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/;

function stripMarkdownCodeFence(text: string) {
  const trimmed = text.trim();
  const m = trimmed.match(CODE_FENCE_RE);
  if (m) return m[1].trim();
  return trimmed;
}

function tryParseFromFirstBrace(text: string): unknown | undefined {
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  let start = -1;
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) start = firstObj;
  else if (firstArr >= 0) start = firstArr;
  if (start < 0) return undefined;

  const slice = text.slice(start);
  try {
    return JSON.parse(slice);
  } catch {
    const end = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
    if (end <= 0) return undefined;
    try {
      return JSON.parse(slice.slice(0, end + 1));
    } catch {
      return undefined;
    }
  }
}

export function parseLooseJson(text: string): unknown | undefined {
  const unfenced = stripMarkdownCodeFence(text);
  if (unfenced.startsWith("{") || unfenced.startsWith("[")) {
    try {
      return JSON.parse(unfenced);
    } catch {
      /* fall through */
    }
  }
  return tryParseFromFirstBrace(unfenced);
}

export function unwrapDocArray(value: unknown): unknown {
  if (!Array.isArray(value) || value.length !== 1) return value;
  const only = value[0];
  if (!only || typeof only !== "object" || Array.isArray(only)) return value;
  const obj = only as Record<string, unknown>;
  if ("order_info" in obj || "items" in obj || "客户名称" in obj || "订单信息" in obj) return only;
  return value;
}

export function looksLikeStructuredDocMarkdown(text: string) {
  return /```/.test(text) || /order_info|"items"\s*:|"收货单位名称"/.test(text);
}

type ScalarRecord = Record<string, string | number | boolean | null>;

function isScalar(val: unknown) {
  return val === null || ["string", "number", "boolean"].includes(typeof val);
}

function flattenShipmentLike(root: Record<string, unknown>) {
  const header: ScalarRecord = {};
  const items: Record<string, unknown>[] = [];

  for (const [key, val] of Object.entries(root)) {
    if (key === "order_info" && val && typeof val === "object" && !Array.isArray(val)) {
      for (const [hk, hv] of Object.entries(val as Record<string, unknown>)) {
        if (isScalar(hv)) header[hk] = hv as ScalarRecord[string];
      }
      continue;
    }
    if (key === "items" && Array.isArray(val)) {
      for (const row of val) {
        if (row && typeof row === "object" && !Array.isArray(row)) items.push(row as Record<string, unknown>);
      }
      continue;
    }
    if (isScalar(val)) header[key] = val as ScalarRecord[string];
  }

  return { header, items };
}

/** 从 markdown/JSON 文本构建发货单卡片所需字段（仅客户端兜底） */
export function tryParseShipmentDocFromMarkdown(text: string) {
  if (!looksLikeStructuredDocMarkdown(text)) return null;
  const parsed = unwrapDocArray(parseLooseJson(text));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const { header, items } = flattenShipmentLike(parsed as Record<string, unknown>);
  const headerEntries = Object.entries(header).filter(([, v]) => v != null && String(v).trim() !== "");
  if (headerEntries.length < 2 && items.length === 0) return null;
  if (!("单号" in header) && !("收货单位名称" in header) && items.length === 0) return null;

  const fields = headerEntries.map(([key, value]) => ({
    key,
    label: key,
    value: String(value),
  }));

  return {
    fields,
    sections: items.length
      ? [{ title: "发货明细", columns: [...new Set(items.flatMap((row) => Object.keys(row)))], rows: items }]
      : [],
  };
}
