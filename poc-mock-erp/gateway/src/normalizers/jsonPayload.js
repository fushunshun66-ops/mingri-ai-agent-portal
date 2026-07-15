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

/**
 * 安全地将 Python dict/list literal 字符串转换为 JSON 字符串（不使用 eval）。
 * 策略：逐字符状态机，处理单引号字符串 → 双引号，Python 关键字替换。
 */
function convertPythonToJsonStr(s) {
  let result = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'") {
      // 单引号字符串 → 双引号字符串
      result += '"';
      i++;
      while (i < s.length) {
        const sc = s[i];
        if (sc === "\\") {
          const next = s[i + 1];
          if (next === "'") {
            // Python \' 转义 → JSON 中直接输出单引号（不需转义）
            result += "'";
            i += 2;
          } else {
            result += "\\" + (next || "");
            i += 2;
          }
        } else if (sc === '"') {
          // 单引号字符串内的裸双引号 → JSON 中必须转义
          result += '\\"';
          i++;
        } else if (sc === "'") {
          // 单引号字符串结束
          result += '"';
          i++;
          break;
        } else {
          result += sc;
          i++;
        }
      }
    } else if (ch === '"') {
      // 双引号字符串（直接透传）
      result += '"';
      i++;
      while (i < s.length) {
        const sc = s[i];
        if (sc === "\\") {
          result += "\\" + (s[i + 1] || "");
          i += 2;
        } else if (sc === '"') {
          result += '"';
          i++;
          break;
        } else {
          result += sc;
          i++;
        }
      }
    } else {
      // 非字符串区域：替换 Python 关键字
      const rest = s.slice(i);
      if (/^None(?![a-zA-Z0-9_])/.test(rest)) { result += "null";  i += 4; }
      else if (/^True(?![a-zA-Z0-9_])/.test(rest)) { result += "true";  i += 4; }
      else if (/^False(?![a-zA-Z0-9_])/.test(rest)) { result += "false"; i += 5; }
      else { result += ch; i++; }
    }
  }
  return result;
}

/** 尝试将 Python dict/list literal 字符串解析为 JS 值（禁止 eval） */
function tryParsePythonLiteral(text) {
  const s = String(text || "").trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return undefined;
  // 快速排除：已经是合法 JSON（不含单引号作为字符串定界符）
  // 若无单引号则跳过（交给已有逻辑处理）
  if (!s.includes("'")) return undefined;
  try {
    const jsonStr = convertPythonToJsonStr(s);
    return JSON.parse(jsonStr);
  } catch {
    return undefined;
  }
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
    tryParsePythonLiteral(unfenced) ??
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
