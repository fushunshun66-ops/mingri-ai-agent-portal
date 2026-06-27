const LIST_FIELD_LABELS = new Set(["商品列表", "产品列表", "订单明细", "items", "审核内容"]);
const MONEY_COLUMNS = new Set(["单价", "总金额", "金额", "小计金额", "价税合计", "合同值", "ERP值"]);

export const CONTRACT_BASIC_KEYS = new Set(["合同名称", "客户名称", "合同编号", "合同号"]);
export const CONTRACT_SUMMARY_KEYS = new Set([
  "总审核项数",
  "通过项数",
  "不通过项数",
  "总审核项",
  "通过",
  "不通过",
]);
export const CONTRACT_SECTION_LABELS = new Set(["基本信息", "审核内容", "审核总结"]);

export function tryParseObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function tryParseObjectArray(value: string): Record<string, unknown>[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      return parsed as Record<string, unknown>[];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isListFieldLabel(label: string): boolean {
  return LIST_FIELD_LABELS.has(label);
}

export function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function isMoneyColumn(col: string): boolean {
  return MONEY_COLUMNS.has(col);
}
