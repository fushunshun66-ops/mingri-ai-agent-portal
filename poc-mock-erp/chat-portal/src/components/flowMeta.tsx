import type { ReactNode } from "react";
import { IconContract, IconOrder, IconTruck } from "./icons";
import { isListFieldLabel, tryParseObjectArray } from "../utils/fieldValue";

export const FLOW_META: Record<
  string,
  { icon: ReactNode; accent: string; label: string; module: string; docType: string }
> = {
  sales_order: {
    icon: <IconOrder />,
    accent: "cap-accent-blue",
    label: "销售订单",
    module: "销售管理",
    docType: "销售订单",
  },
  shipment: {
    icon: <IconTruck />,
    accent: "cap-accent-orange",
    label: "发货申请",
    module: "物流管理",
    docType: "发货申请单",
  },
  contract_review: {
    icon: <IconContract />,
    accent: "cap-accent-purple",
    label: "合同评审",
    module: "法务合规",
    docType: "合同评审",
  },
};

const ORDER_KEYS = ["客户名称", "商品名称", "数量", "单价", "总金额", "交付日期"];
const SHIPMENT_KEYS = ["单号", "客户编号", "收货单位名称", "物料", "仓库属地", "发货数量"];

function collectKeyHits(labels: Set<string>, keys: string[]): number {
  return keys.filter((k) => labels.has(k)).length;
}

function collectOrderKeyHits(labels: Set<string>): number {
  let hits = collectKeyHits(labels, ORDER_KEYS);
  if (labels.has("商品列表")) {
    for (const label of labels) {
      if (!isListFieldLabel(label)) continue;
      hits += 1;
    }
    if (labels.has("客户名称") || labels.has("总金额")) hits += 1;
  }
  return hits;
}

export function detectDocKind(fields: { label: string; value: string }[]): string | null {
  const labels = new Set(fields.map((f) => f.label));

  for (const f of fields) {
    if (isListFieldLabel(f.label)) {
      const rows = tryParseObjectArray(f.value);
      if (rows?.[0]) {
        const rowKeys = new Set(Object.keys(rows[0]));
        const merged = new Set([...labels, ...rowKeys]);
        if (ORDER_KEYS.filter((k) => merged.has(k)).length >= 3) return "sales_order";
        if (SHIPMENT_KEYS.filter((k) => merged.has(k)).length >= 3) return "shipment";
      }
    }
  }

  if (collectOrderKeyHits(labels) >= 3) return "sales_order";
  if (collectKeyHits(labels, SHIPMENT_KEYS) >= 3) return "shipment";
  if (labels.has("申请单号") || labels.has("车牌") || labels.has("订单号")) return "shipment";
  if (labels.has("基本信息") && labels.has("审核内容")) return "contract_review";
  if (labels.has("合同值") || labels.has("ERP值") || labels.has("风险等级")) return "contract_review";
  if (labels.has("审核规则名称") || labels.has("审核结果")) return "contract_review";
  return null;
}
