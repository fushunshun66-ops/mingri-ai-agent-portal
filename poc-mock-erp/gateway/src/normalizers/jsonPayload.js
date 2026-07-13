/**
 * 从文本/包装体中宽松解析 JSON（兼容 markdown 代码块、前后说明文字、拼接 JSON）。
 */

const CODE_FENCE_RE = /\`\`\`(?:json|JSON)?\s*\n?([\s\S]*?)\`\`\`/;

export function stripMarkdownCodeFence(text) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(CODE_FENCE_RE);
  if (m) return m[1].trim();
  return trimmed;
}

/** 括号计数提取第一个完整 JSON 对象/数组（处理 {...}{...} 拼接） */
export function parseFirstJsonValue(text) {
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
    return parseFirstJsonValue(slice) ?? parseFirstJsonValue(s);
  }
}

/** @returns {unknown | undefined} */
export function parseLooseJson(text) {
  if (text == null) return undefined;
  if (typeof text === "object") return text;

  const unfenced = stripMarkdownCodeFence(text);
  return (
    tryParseStrict(unfenced) ??
    tryParseFromFirstBrace(unfenced) ??
    parseFirstJsonValue(unfenced)
  );
}

function isOrderResultObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  if ("orderCode" in obj || "orderNo" in obj || "order_no" in obj || "订单号" in obj || "订单编号" in obj || "单号" in obj) {
    return true;
  }
  if (obj.success === true) return true;
  return false;
}

/** 文本是否像结构化业务 JSON，而非纯单号结果 */
export function looksLikeStructuredDocJson(text) {
  const t = String(text || "");
  if (/\`\`\`/.test(t)) return true;
  if (/order_info|"items"\s*:|"收货单位名称"|"客户名称"\s*:|"商品列表"\s*:/.test(t)) return true;

  const first = parseFirstJsonValue(t) ?? parseLooseJson(t);
  if (first && typeof first === "object" && !Array.isArray(first)) {
    if (isOrderResultObject(first)) return false;
    if ("order_info" in first || "items" in first || "客户名称" in first || "商品列表" in first || "审核内容" in first) {
      return true;
    }
  }

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
