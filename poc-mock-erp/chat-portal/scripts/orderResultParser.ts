/**
 * 与 gateway orderResultParser 规则一致（客户端 markdown 兜底）
 */

import { enrichOrderResultBlock } from "./orderResultEnricher";
import type { OrderResultFieldGroup, OrderResultSection, OrderResultWarning, OrderResultField } from "./orderResultEnricher";

const CODE_FENCE_RE = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/;

const ORDER_NO_TOKEN_RE = /\b((?:SO|SD|SR)\d{8,})\b/i;
const PLAIN_ORDER_NO_RE = /^(?:SO|SD|SR)\d{8,}$/i;
const ORDER_NO_LABEL_RE = /(?:订单号|单号)\s*[：:]?\s*((?:SO|SD|SR)\d{8,})/i;
const SUCCESS_HINT_RE = /已创建|已提交|已生成|创建成功|已完成|完成|已保存|成功/;

export const DEFAULT_SALES_ORDER_RESULT_MESSAGE = "销售订单已完成，可在ERP中查看详情。";
export const DEFAULT_SHIPMENT_RESULT_MESSAGE = "发货申请单已完成，可在ERP中查看详情。";

export type OrderResultBlock = {
  type: "result";
  schemaKey: string;
  orderNo: string;
  status: string;
  title: string;
  message: string;
  fieldGroups?: OrderResultFieldGroup[];
  sections?: OrderResultSection[];
  warnings?: OrderResultWarning[];
  extras?: OrderResultField[];
};

function stripMarkdownCodeFence(text: string) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(CODE_FENCE_RE);
  if (m) return m[1].trim();
  return trimmed;
}

export function parseFirstJsonValue(text: string): unknown {
  const s = String(text || "");
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) start = firstObj;
  else if (firstArr >= 0) start = firstArr;
  if (start < 0) return undefined;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function tryParseStrict(text: string): unknown {
  const trimmed = String(text || "").trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function tryParseFromFirstBrace(text: string): unknown {
  const s = String(text || "");
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) start = firstObj;
  else if (firstArr >= 0) start = firstArr;
  if (start < 0) return undefined;

  const slice = s.slice(start);
  try {
    return JSON.parse(slice);
  } catch {
    return parseFirstJsonValue(slice) ?? parseFirstJsonValue(s);
  }
}

export function parseLooseJson(text: unknown): unknown {
  if (text == null) return undefined;
  if (typeof text === "object") return text;

  const unfenced = stripMarkdownCodeFence(String(text));
  return tryParseStrict(unfenced) ?? tryParseFromFirstBrace(unfenced) ?? parseFirstJsonValue(unfenced);
}

function isOrderResultObject(obj: Record<string, unknown>) {
  if ("orderCode" in obj || "orderNo" in obj || "order_no" in obj || "订单号" in obj || "订单编号" in obj || "单号" in obj) {
    return true;
  }
  if (obj.success === true) return true;
  return false;
}

function looksLikeStructuredDocJson(text: string) {
  const t = String(text || "");
  if (/```/.test(t)) return true;
  if (/order_info|"items"\s*:|"收货单位名称"|"客户名称"\s*:|"商品列表"\s*:/.test(t)) return true;

  const first = parseFirstJsonValue(t) ?? parseLooseJson(t);
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const obj = first as Record<string, unknown>;
    if (isOrderResultObject(obj)) return false;
    if ("order_info" in obj || "items" in obj || "客户名称" in obj || "商品列表" in obj || "审核内容" in obj) {
      return true;
    }
  }

  if (t.includes("{") && t.includes("}") && /"\w+"\s*:/.test(t)) return true;
  return false;
}

function inferSchemaFromOrderNo(orderNo: string) {
  if (/^SD/i.test(orderNo) || /^SR/i.test(orderNo)) return "shipment";
  return "sales_order";
}

function buildResultMeta(schemaKey: string) {
  if (schemaKey === "shipment") {
    return {
      schemaKey,
      title: "发货申请单已生成",
      message: DEFAULT_SHIPMENT_RESULT_MESSAGE,
    };
  }
  return {
    schemaKey: "sales_order",
    title: "销售订单已生成",
    message: DEFAULT_SALES_ORDER_RESULT_MESSAGE,
  };
}

function buildResult(orderNo: string, messageOverride?: string, sourceValue?: unknown): OrderResultBlock {
  const schemaKey = inferSchemaFromOrderNo(orderNo);
  const meta = buildResultMeta(schemaKey);
  const base: OrderResultBlock = {
    type: "result",
    schemaKey: meta.schemaKey,
    orderNo,
    status: "completed",
    title: meta.title,
    message: messageOverride || meta.message,
  };
  if (sourceValue && typeof sourceValue === "object") {
    return enrichOrderResultBlock(base, sourceValue);
  }
  return base;
}

function normalizeOrderNo(raw: unknown) {
  const s = String(raw || "").trim();
  if (PLAIN_ORDER_NO_RE.test(s)) return s.toUpperCase();
  const m = s.match(ORDER_NO_TOKEN_RE);
  return m ? m[1].toUpperCase() : null;
}

function extractOrderNo(text: string) {
  const visible = text.trim();
  if (PLAIN_ORDER_NO_RE.test(visible)) return visible.toUpperCase();
  const labeled = visible.match(ORDER_NO_LABEL_RE)?.[1];
  if (labeled) return labeled.toUpperCase();
  const token = visible.match(ORDER_NO_TOKEN_RE)?.[1];
  return token ? token.toUpperCase() : null;
}

function isClarifyLike(text: string) {
  if (/请选择|请确认|相似|不完全一致/.test(text) && (/[①②③④⑤]/.test(text) || /(?:^|\n)\s*\d+[.．、)）]\s/m.test(text))) {
    return true;
  }
  return false;
}

export function tryOrderResultFromObject(value: unknown): OrderResultBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if ("order_info" in obj || "items" in obj || "客户名称" in obj || "商品列表" in obj || "审核内容" in obj) {
    return null;
  }

  const orderNoRaw = obj.订单号 ?? obj.订单编号 ?? obj.orderNo ?? obj.order_no ?? obj.单号 ?? obj.orderCode;
  const orderNo = normalizeOrderNo(orderNoRaw);
  if (!orderNo) return null;

  const messageText = obj.message != null ? String(obj.message).trim() : "";
  const statusText = String(obj.状态 ?? obj.status ?? obj.结果 ?? "");
  const blob = `${statusText} ${messageText} ${JSON.stringify(obj)}`;

  if (obj.success === true || SUCCESS_HINT_RE.test(blob) || PLAIN_ORDER_NO_RE.test(String(orderNoRaw).trim())) {
    return buildResult(orderNo, messageText || undefined, obj);
  }

  return null;
}

export function tryOrderResultBlock(text: string): OrderResultBlock | null {
  const visible = String(text || "")
    .replace(/\*\*/g, "")
    .trim();
  if (!visible || isClarifyLike(visible)) return null;

  const parsed = parseLooseJson(visible);
  if (parsed && typeof parsed === "object") {
    const fromObj = tryOrderResultFromObject(parsed);
    if (fromObj) return fromObj;
  }

  if (looksLikeStructuredDocJson(visible)) return null;

  const orderNo = extractOrderNo(visible);
  if (!orderNo) return null;

  if (PLAIN_ORDER_NO_RE.test(visible)) return buildResult(orderNo);
  if (SUCCESS_HINT_RE.test(visible)) return buildResult(orderNo);

  return null;
}
