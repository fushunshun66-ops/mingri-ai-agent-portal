import profiles from "../config/resultFieldProfiles.json";
import {
  resolveExtraFieldLabel,
  shouldHideExtraFieldKey,
} from "./extraFieldLabel";

export type OrderResultField = {
  key: string;
  label: string;
  value: string;
  widget?: string;
};

export type OrderResultFieldGroup = {
  title: string;
  fields: OrderResultField[];
};

export type OrderResultSection = {
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type OrderResultWarning = {
  key: string;
  label: string;
  message: string;
  tone: "warning" | "error";
};

const VERIFY_STATE_MAP: Record<string | number, string> = {
  0: "待审核",
  1: "审核中",
  2: "已审核",
  3: "已驳回",
};

let resultFieldProfiles: typeof profiles | null = null;

function loadProfiles() {
  if (!resultFieldProfiles) resultFieldProfiles = profiles;
  return resultFieldProfiles;
}

export function setResultFieldProfiles(next: typeof profiles) {
  resultFieldProfiles = next;
}

function isScalar(value: unknown): value is string | number | boolean | null | undefined {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function extractOrderPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const raw = obj.raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rawObj = raw as Record<string, unknown>;
    if (rawObj.data && typeof rawObj.data === "object" && !Array.isArray(rawObj.data)) {
      return rawObj.data as Record<string, unknown>;
    }
    return rawObj;
  }
  return obj;
}

/** 金额按「元」展示（接口单位已是元，禁止 ÷100） */
function formatYuanCurrency(num: number) {
  if (!Number.isFinite(num)) return String(num ?? "");
  return num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num: number) {
  if (!Number.isFinite(num)) return String(num ?? "");
  return Number.isInteger(num) ? String(num) : num.toLocaleString("zh-CN");
}

function formatDateValue(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T]\d{2}:\d{2}:\d{2})?/);
  return m ? m[1] : s;
}

function formatFieldValue(rawValue: unknown, widget?: string) {
  if (rawValue == null || rawValue === "") return "";
  if (widget === "verifystate") {
    const key = String(rawValue);
    return VERIFY_STATE_MAP[key] ?? VERIFY_STATE_MAP[Number(key)] ?? String(rawValue);
  }
  if (widget === "date") return formatDateValue(rawValue);
  if (widget === "currency") return formatYuanCurrency(Number(rawValue));
  if (widget === "number") return formatNumber(Number(rawValue));
  return String(rawValue);
}

function shouldExcludeKey(key: string, profile: (typeof profiles)["sales_order"]) {
  if (!key) return true;
  if ((profile.excludeKeys || []).includes(key)) return true;
  for (const pattern of profile.excludePatterns || []) {
    if (new RegExp(pattern).test(key)) return true;
  }
  if (/^pk_[^_]+$/.test(key)) return true;
  if (/^item/i.test(key)) return true;
  return false;
}

function buildFieldGroups(payload: Record<string, unknown>, profile: (typeof profiles)["sales_order"]) {
  const groups: OrderResultFieldGroup[] = [];
  for (const group of profile.fieldGroups || []) {
    const fields: OrderResultField[] = [];
    for (const field of group.fields || []) {
      if (!(field.key in payload)) continue;
      const raw = payload[field.key];
      if (!isScalar(raw)) continue;
      const value = formatFieldValue(raw, field.widget);
      if (!value) continue;
      fields.push({ key: field.key, label: field.label, value, widget: field.widget });
    }
    if (fields.length) groups.push({ title: group.title, fields });
  }
  return groups;
}

function buildSections(payload: Record<string, unknown>, profile: (typeof profiles)["sales_order"]) {
  const lineCfg = profile.lineItems;
  if (!lineCfg?.key) return [] as OrderResultSection[];
  const rowsRaw = payload[lineCfg.key];
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) return [];

  const columnMap = lineCfg.columnMap || {};
  const columns = Object.values(columnMap);
  const currencyCols = new Set(["含税单价", "含税金额"]);

  const rows = rowsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return {};
      const mapped: Record<string, unknown> = {};
      for (const [srcKey, label] of Object.entries(columnMap)) {
        const item = row as Record<string, unknown>;
        if (!(srcKey in item)) continue;
        const raw = item[srcKey];
        if (!isScalar(raw)) continue;
        if (currencyCols.has(label)) mapped[label] = formatYuanCurrency(Number(raw));
        else if (label === "数量") mapped[label] = formatNumber(Number(raw));
        else mapped[label] = String(raw);
      }
      return mapped;
    })
    .filter((row) => Object.keys(row).length > 0);

  if (!rows.length) return [];
  return [{ title: lineCfg.title || "明细", columns, rows }];
}

function buildWarnings(payload: Record<string, unknown>, profile: (typeof profiles)["sales_order"]) {
  const warnings: OrderResultWarning[] = [];
  for (const key of profile.warningFields || []) {
    const raw = payload[key];
    if (raw == null || raw === "") continue;
    const text = String(raw).trim();
    if (!text) continue;
    const tone = /失败|报错|错误|fail/i.test(text) || key === "signFailRemark" ? "error" : "warning";
    warnings.push({
      key,
      label: key === "signFailRemark" ? "签章失败说明" : key === "signRemark" ? "签章说明" : key,
      message: text,
      tone,
    });
  }
  return warnings;
}

function collectShownKeys(profile: (typeof profiles)["sales_order"]) {
  const keys = new Set(profile.excludeKeys || []);
  for (const group of profile.fieldGroups || []) {
    for (const field of group.fields || []) keys.add(field.key);
  }
  for (const key of profile.warningFields || []) keys.add(key);
  if (profile.lineItems?.key) keys.add(profile.lineItems.key);
  return keys;
}

function buildExtras(payload: Record<string, unknown>, profile: (typeof profiles)["sales_order"], shownKeys: Set<string>) {
  const profileLabels = (profile as { extraFieldLabels?: Record<string, string> }).extraFieldLabels;
  const extras: OrderResultField[] = [];
  for (const [key, raw] of Object.entries(payload)) {
    if (shownKeys.has(key) || shouldExcludeKey(key, profile)) continue;
    if (shouldHideExtraFieldKey(key)) continue;
    if (!isScalar(raw)) continue;
    const value = String(raw).trim();
    if (!value) continue;
    extras.push({
      key,
      label: resolveExtraFieldLabel(key, profileLabels),
      value,
    });
  }
  extras.sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  return extras;
}

export function enrichOrderResultBlock<T extends { schemaKey: string }>(baseResult: T, sourceValue: unknown): T & {
  fieldGroups?: OrderResultFieldGroup[];
  sections?: OrderResultSection[];
  warnings?: OrderResultWarning[];
  extras?: OrderResultField[];
} {
  const payload = extractOrderPayload(sourceValue);
  const allProfiles = loadProfiles();
  const profile = allProfiles[baseResult.schemaKey as keyof typeof allProfiles];
  if (!profile || !Object.keys(payload).length) return { ...baseResult };

  const shownKeys = collectShownKeys(profile);
  const fieldGroups = buildFieldGroups(payload, profile);
  const sections = buildSections(payload, profile);
  const warnings = buildWarnings(payload, profile);
  const extras = buildExtras(payload, profile, shownKeys);

  const enriched = { ...baseResult } as T & {
    fieldGroups?: OrderResultFieldGroup[];
    sections?: OrderResultSection[];
    warnings?: OrderResultWarning[];
    extras?: OrderResultField[];
  };
  if (fieldGroups.length) enriched.fieldGroups = fieldGroups;
  if (sections.length) enriched.sections = sections;
  if (warnings.length) enriched.warnings = warnings;
  if (extras.length) enriched.extras = extras;
  return enriched;
}
