import {
  CONTRACT_BASIC_KEYS,
  CONTRACT_SUMMARY_KEYS,
  tryParseObject,
  tryParseObjectArray,
} from "./fieldValue";

export type ContractField = { key?: string; label: string; value: string };

export type ContractSection = {
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type ContractReviewParts = {
  basicFields: ContractField[];
  sections: ContractSection[];
  summary: Record<string, string> | null;
};

function fieldEntriesFromObject(obj: Record<string, unknown>): ContractField[] {
  return Object.entries(obj).map(([label, value]) => ({
    key: label,
    label,
    value: value == null ? "" : String(value),
  }));
}

function sectionFromRows(title: string, rows: Record<string, unknown>[]): ContractSection {
  const columns = orderContractReviewColumns([...new Set(rows.flatMap((row) => Object.keys(row)))]);
  return { title, columns, rows };
}

/** 将中台多种键名/纯文本统一为审核总结结构 */
export function normalizeContractSummary(
  raw: Record<string, string> | string | null | undefined,
): Record<string, string> | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    const obj = tryParseObject(text);
    if (obj) return normalizeContractSummary(obj as Record<string, string>);
    const fromPlain = parseSummaryPlainText(text);
    return fromPlain;
  }

  const total =
    raw["总审核项数"] ??
    raw["总审核项"] ??
    raw["审核项总数"] ??
    raw["total"];
  const passed = raw["通过项数"] ?? raw["通过"] ?? raw["passed"];
  const failed = raw["不通过项数"] ?? raw["不通过"] ?? raw["failed"];

  if (total == null && passed == null && failed == null) return null;

  return {
    总审核项数: total == null ? "" : String(total),
    通过项数: passed == null ? "" : String(passed),
    不通过项数: failed == null ? "" : String(failed),
  };
}

function parseSummaryPlainText(text: string): Record<string, string> | null {
  const normalized = text.replace(/\r/g, "");
  const total = normalized.match(/总审核项\D*(\d+)/)?.[1];
  const passed = normalized.match(/通过\D*(\d+)/)?.[1];
  const failed = normalized.match(/不通过\D*(\d+)/)?.[1];
  if (!total && !passed && !failed) return null;
  return {
    总审核项数: total || "",
    通过项数: passed || "",
    不通过项数: failed || "",
  };
}

export function pickContractBasicFields(fields: ContractField[]): ContractField[] {
  const keyed = fields.filter((f) => CONTRACT_BASIC_KEYS.has(f.key || f.label));
  if (keyed.length > 0) return keyed;
  return fields.filter((f) => !CONTRACT_SUMMARY_KEYS.has(f.key || f.label));
}

export function collectContractSummaryFromFields(fields: ContractField[]): Record<string, string> | null {
  const bag: Record<string, string> = {};
  for (const field of fields) {
    const key = field.key || field.label;
    if (CONTRACT_SUMMARY_KEYS.has(key)) {
      bag[key] = field.value;
    } else if (key === "审核总结" || key.includes("审核总结")) {
      const nested = normalizeContractSummary(field.value);
      if (nested) {
        Object.assign(bag, nested);
      }
    }
  }
  return normalizeContractSummary(bag);
}

/** 从卡片字段（中台 JSON1 三块字符串）解析合同评审结构 */
export function parseContractReviewCardFields(fields: ContractField[]): ContractReviewParts {
  const basicFields: ContractField[] = [];
  const sections: ContractSection[] = [];
  let summary: Record<string, string> | null = null;

  for (const field of fields) {
    const label = field.label.trim();

    if (label === "基本信息" || label.includes("基本信息")) {
      const obj = tryParseObject(field.value);
      if (obj) basicFields.push(...fieldEntriesFromObject(obj));
      continue;
    }

    if (label === "审核内容" || label.includes("审核内容")) {
      const rows = tryParseObjectArray(field.value);
      if (rows) sections.push(sectionFromRows("审核内容", rows));
      continue;
    }

    if (label === "审核总结" || label.includes("审核总结")) {
      const obj = tryParseObject(field.value);
      summary = obj ? normalizeContractSummary(obj as Record<string, string>) : normalizeContractSummary(field.value);
      continue;
    }

    const rows = tryParseObjectArray(field.value);
    if (rows) {
      const rowKeys = new Set(rows.flatMap((r) => Object.keys(r)));
      if (rowKeys.has("审核规则名称") || rowKeys.has("合同值")) {
        sections.push(sectionFromRows(label || "审核内容", rows));
        continue;
      }
    }
  }

  return { basicFields, sections, summary };
}

/** 从分区后的 form + table 块字段拆分基本信息与审核总结 */
export function splitContractFormFields(fields: ContractField[]): {
  basicFields: ContractField[];
  summary: Record<string, string> | null;
} {
  const basicFields = pickContractBasicFields(fields);
  const summary = collectContractSummaryFromFields(fields);
  return { basicFields, summary };
}

export function isContractReviewCardShape(fields: ContractField[]): boolean {
  const labels = new Set(fields.map((f) => f.label.trim()));
  return labels.has("基本信息") || (labels.has("审核内容") && labels.has("审核总结"));
}

export function resolveContractDisplayTitle(title?: string): string {
  if (!title || title === "reply" || title === "结果" || /^json\d*$/i.test(title)) {
    return "合同评审结果";
  }
  if (title === "合同附件智能评审") return "合同评审结果";
  return title;
}

export function isAuditResultColumn(col: string): boolean {
  return col === "审核结果" || col === "结论" || col === "风险等级";
}

const CONTRACT_REVIEW_COLUMN_ORDER = [
  "审核规则名称",
  "审核规则说明",
  "规则描述",
  "原始数据比对",
  "原始数据",
  "字段",
  "合同值",
  "ERP值",
  "审核结果",
  "结论",
  "风险等级",
];

/** 合同评审表格列顺序：审核结果类始终置末列 */
export function orderContractReviewColumns(columns: string[]): string[] {
  const unique = [...new Set(columns)];
  const sorted = [...unique].sort((a, b) => {
    const aAudit = isAuditResultColumn(a);
    const bAudit = isAuditResultColumn(b);
    if (aAudit && !bAudit) return 1;
    if (!aAudit && bAudit) return -1;
    const ai = CONTRACT_REVIEW_COLUMN_ORDER.indexOf(a);
    const bi = CONTRACT_REVIEW_COLUMN_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted;
}

export function isRawComparisonColumn(col: string): boolean {
  return col === "原始数据" || col === "原始数据比对";
}

const RAW_COMPARE_LABELS: Record<string, string> = {
  合同数据: "合同",
  系统数据: "系统",
  合同值: "合同",
  ERP值: "系统",
};

/** 解析「原始数据比对」JSON 或分号文本为键值对 */
export function parseRawComparisonData(value: unknown): { label: string; value: string }[] | null {
  if (value == null) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
      label: RAW_COMPARE_LABELS[k] || k,
      value: v == null ? "" : String(v),
    }));
  }

  const text = String(value).trim();
  if (!text) return null;

  const obj = tryParseObject(text);
  if (obj) {
    return Object.entries(obj).map(([k, v]) => ({
      label: RAW_COMPARE_LABELS[k] || k,
      value: v == null ? "" : String(v),
    }));
  }

  const parts = text.split(/[；;]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((part) => {
      const m = part.match(/^([^：:]+)[：:]\s*(.+)$/);
      return m
        ? { label: RAW_COMPARE_LABELS[m[1].trim()] || m[1].trim(), value: m[2].trim() }
        : { label: "数据", value: part };
    });
  }

  return null;
}

export function formatAuditResult(value: unknown): { text: string; tone: "pass" | "fail" | "neutral" } {
  const text = value == null ? "" : String(value).trim();
  if (!text) return { text: "", tone: "neutral" };
  if (/不通过|失败|不一致|高风险|高|异常|fail/i.test(text)) return { text, tone: "fail" };
  if (/通过|一致|正常|低|pass/i.test(text)) return { text, tone: "pass" };
  return { text, tone: "neutral" };
}
