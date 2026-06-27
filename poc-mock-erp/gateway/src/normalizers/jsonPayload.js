/**
 * 从文本/包装体中宽松解析 JSON（兼容 markdown 代码块、前后说明文字）。
 */

const CODE_FENCE_RE = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/;

export function stripMarkdownCodeFence(text) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(CODE_FENCE_RE);
  if (m) return m[1].trim();
  return trimmed;
}

function tryParseStrict(text) {
  const trimmed = String(text || "").trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function tryParseFromFirstBrace(text) {
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
    const lastObj = slice.lastIndexOf("}");
    const lastArr = slice.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (end <= 0) return undefined;
    try {
      return JSON.parse(slice.slice(0, end + 1));
    } catch {
      return undefined;
    }
  }
}

/** @returns {unknown | undefined} */
export function parseLooseJson(text) {
  if (text == null) return undefined;
  if (typeof text === "object") return text;

  const unfenced = stripMarkdownCodeFence(text);
  return tryParseStrict(unfenced) ?? tryParseFromFirstBrace(unfenced);
}

/** 文本是否像结构化业务 JSON，而非纯单号结果 */
export function looksLikeStructuredDocJson(text) {
  const t = String(text || "");
  if (/```/.test(t)) return true;
  if (/order_info|"items"\s*:|"收货单位名称"|"客户名称"\s*:|"商品列表"\s*:/.test(t)) return true;
  if (t.includes("{") && t.includes("}") && /"\w+"\s*:/.test(t)) return true;
  return false;
}

/** 中台偶发以单元素数组包装单据对象 */
export function unwrapDocArray(value) {
  if (!Array.isArray(value) || value.length !== 1) return value;
  const only = value[0];
  if (!only || typeof only !== "object" || Array.isArray(only)) return value;
  if (
    "order_info" in only ||
    "items" in only ||
    "客户名称" in only ||
    "订单信息" in only ||
    "基本信息" in only ||
    "审核内容" in only
  ) {
    return only;
  }
  return value;
}
