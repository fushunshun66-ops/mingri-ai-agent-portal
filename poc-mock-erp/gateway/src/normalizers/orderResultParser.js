/**
 * 业务单号结果卡：确认提交后中台返回订单号（SO/SD/SR…）→ result 块。
 * live 常见为纯单号：SD202606151051477503
 */

import { looksLikeStructuredDocJson } from "./jsonPayload.js";

const ORDER_NO_TOKEN_RE = /\b((?:SO|SD|SR)\d{8,})\b/i;
const PLAIN_ORDER_NO_RE = /^(?:SO|SD|SR)\d{8,}$/i;
const ORDER_NO_LABEL_RE = /(?:订单号|单号)\s*[：:]?\s*((?:SO|SD|SR)\d{8,})/i;
const SUCCESS_HINT_RE = /已创建|已提交|已生成|创建成功|已完成|完成|已保存|成功/;
const RESULT_ITEM_NAME_RE = /confirm|result|订单|order|output|submit|创建/i;

export const DEFAULT_SALES_ORDER_RESULT_MESSAGE = "销售订单已完成，可在ERP中查看详情。";
export const DEFAULT_SHIPMENT_RESULT_MESSAGE = "发货申请单已完成，可在ERP中查看详情。";

function inferSchemaFromOrderNo(orderNo) {
  if (/^SD/i.test(orderNo) || /^SR/i.test(orderNo)) return "shipment";
  return "sales_order";
}

function buildResultMeta(schemaKey) {
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

function buildResult(orderNo) {
  const schemaKey = inferSchemaFromOrderNo(orderNo);
  const meta = buildResultMeta(schemaKey);
  return {
    type: "result",
    schemaKey: meta.schemaKey,
    orderNo,
    status: "completed",
    title: meta.title,
    message: meta.message,
  };
}

function normalizeOrderNo(raw) {
  const s = String(raw || "").trim();
  if (PLAIN_ORDER_NO_RE.test(s)) return s.toUpperCase();
  const m = s.match(ORDER_NO_TOKEN_RE);
  return m ? m[1].toUpperCase() : null;
}

function extractOrderNo(text) {
  const visible = String(text || "").trim();
  if (PLAIN_ORDER_NO_RE.test(visible)) return visible.toUpperCase();
  const labeled = visible.match(ORDER_NO_LABEL_RE)?.[1];
  if (labeled) return labeled.toUpperCase();
  const token = visible.match(ORDER_NO_TOKEN_RE)?.[1];
  return token ? token.toUpperCase() : null;
}

function isClarifyLike(text) {
  if (/请选择|请确认|相似|不完全一致/.test(text) && (/[①②③④⑤]/.test(text) || /(?:^|\n)\s*\d+[.．、)）]\s/m.test(text))) {
    return true;
  }
  return false;
}

/**
 * @param {string} text
 * @param {string} [itemName] 中台输出节点名，辅助识别纯单号结果
 */
export function tryOrderResultBlock(text, itemName) {
  const visible = String(text || "")
    .replace(/\*\*/g, "")
    .trim();
  if (!visible || isClarifyLike(visible) || looksLikeStructuredDocJson(visible)) return null;

  const orderNo = extractOrderNo(visible);
  if (!orderNo) return null;

  if (PLAIN_ORDER_NO_RE.test(visible)) return buildResult(orderNo);
  if (SUCCESS_HINT_RE.test(visible)) return buildResult(orderNo);
  if (RESULT_ITEM_NAME_RE.test(String(itemName || ""))) return buildResult(orderNo);

  return null;
}

export function tryOrderResultFromObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if ("order_info" in value || "items" in value || "客户名称" in value || "商品列表" in value || "审核内容" in value) {
    return null;
  }

  const orderNoRaw = value.订单号 ?? value.订单编号 ?? value.orderNo ?? value.order_no ?? value.单号;
  const orderNo = normalizeOrderNo(orderNoRaw);
  if (!orderNo) return null;

  const statusText = String(value.状态 ?? value.status ?? value.结果 ?? "");
  const blob = `${statusText} ${JSON.stringify(value)}`;
  if (SUCCESS_HINT_RE.test(blob) || PLAIN_ORDER_NO_RE.test(String(orderNoRaw).trim())) {
    return buildResult(orderNo);
  }

  return null;
}
