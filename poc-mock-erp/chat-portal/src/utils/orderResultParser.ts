/**
 * 与 gateway orderResultParser 规则一致（客户端 markdown 兜底）
 */

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
};

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

function buildResult(orderNo: string): OrderResultBlock {
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

export function tryOrderResultBlock(text: string): OrderResultBlock | null {
  const visible = String(text || "")
    .replace(/\*\*/g, "")
    .trim();
  if (!visible || isClarifyLike(visible)) return null;
  if (/```/.test(visible) || /order_info|"items"\s*:|"收货单位名称"/.test(visible)) return null;
  if (visible.includes("{") && visible.includes("}") && /"\w+"\s*:/.test(visible)) return null;

  const orderNo = extractOrderNo(visible);
  if (!orderNo) return null;

  if (PLAIN_ORDER_NO_RE.test(visible)) return buildResult(orderNo);
  if (SUCCESS_HINT_RE.test(visible)) return buildResult(orderNo);

  return null;
}
