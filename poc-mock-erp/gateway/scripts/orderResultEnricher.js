import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profilesPath = path.join(__dirname, "../../config/resultFieldProfiles.json");

let resultFieldProfiles = null;

function loadProfiles() {
  if (!resultFieldProfiles) {
    resultFieldProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf8"));
  }
  return resultFieldProfiles;
}

export function setResultFieldProfiles(profiles) {
  resultFieldProfiles = profiles || {};
}

const VERIFY_STATE_MAP = {
  0: "待审核",
  1: "审核中",
  2: "已审核",
  3: "已驳回",
};

function isScalar(value) {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function extractOrderPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value.raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return raw.data;
    return raw;
  }
  return value;
}

function looksLikeYuanAmount(num) {
  if (!Number.isFinite(num)) return false;
  if (String(num).includes(".")) return true;
  return Math.abs(num) > 0 && Math.abs(num) < 100;
}

function formatCurrency(num) {
  if (!Number.isFinite(num)) return String(num ?? "");
  const yuan = looksLikeYuanAmount(num) ? num : num / 100;
  return yuan.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num) {
  if (!Number.isFinite(num)) return String(num ?? "");
  return Number.isInteger(num) ? String(num) : num.toLocaleString("zh-CN");
}

function formatDateValue(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T]\d{2}:\d{2}:\d{2})?/);
  return m ? m[1] : s;
}

function formatDateTimeValue(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
  return m ? m[1].replace("T", " ") : s;
}

function formatFieldValue(rawValue, widget, payload, profile) {
  if (rawValue == null || rawValue === "") return "";
  if (widget === "verifystate") {
    const key = String(rawValue);
    return VERIFY_STATE_MAP[key] ?? VERIFY_STATE_MAP[Number(key)] ?? String(rawValue);
  }
  if (widget === "date") return formatDateValue(rawValue);
  if (widget === "datetime") return formatDateTimeValue(rawValue);
  if (widget === "currency") return formatCurrency(Number(rawValue));
  if (widget === "number") return formatNumber(Number(rawValue));
  return String(rawValue);
}

function shouldExcludeKey(key, profile) {
  if (!key) return true;
  if ((profile.excludeKeys || []).includes(key)) return true;
  for (const pattern of profile.excludePatterns || []) {
    if (new RegExp(pattern).test(key)) return true;
  }
  if (/^pk_[^_]+$/.test(key)) return true;
  if (/^item/i.test(key)) return true;
  return false;
}

function buildFieldGroups(payload, profile) {
  const groups = [];
  for (const group of profile.fieldGroups || []) {
    const fields = [];
    for (const field of group.fields || []) {
      if (!(field.key in payload)) continue;
      const raw = payload[field.key];
      if (!isScalar(raw)) continue;
      const value = formatFieldValue(raw, field.widget, payload, profile);
      if (value === "") continue;
      fields.push({ key: field.key, label: field.label, value, widget: field.widget });
    }
    if (fields.length) groups.push({ title: group.title, fields });
  }
  return groups;
}

function buildSections(payload, profile) {
  const lineCfg = profile.lineItems;
  if (!lineCfg?.key) return [];
  const rowsRaw = payload[lineCfg.key];
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) return [];

  const columnMap = lineCfg.columnMap || {};
  const columns = Object.values(columnMap);
  const currencyCols = new Set(["含税单价", "含税金额"]);

  const rows = rowsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return {};
      const mapped = {};
      for (const [srcKey, label] of Object.entries(columnMap)) {
        if (!(srcKey in row)) continue;
        const raw = row[srcKey];
        if (!isScalar(raw)) continue;
        if (currencyCols.has(label)) {
          mapped[label] = formatCurrency(Number(raw));
        } else if (label === "数量") {
          mapped[label] = formatNumber(Number(raw));
        } else {
          mapped[label] = String(raw);
        }
      }
      return mapped;
    })
    .filter((row) => Object.keys(row).length > 0);

  if (!rows.length) return [];
  return [{ title: lineCfg.title || "明细", columns, rows }];
}

function buildWarnings(payload, profile) {
  const warnings = [];
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

function collectShownKeys(profile) {
  const keys = new Set(profile.excludeKeys || []);
  for (const group of profile.fieldGroups || []) {
    for (const field of group.fields || []) keys.add(field.key);
  }
  for (const key of profile.warningFields || []) keys.add(key);
  if (profile.lineItems?.key) keys.add(profile.lineItems.key);
  return keys;
}

function buildExtras(payload, profile, shownKeys) {
  const extras = [];
  for (const [key, raw] of Object.entries(payload)) {
    if (shownKeys.has(key) || shouldExcludeKey(key, profile)) continue;
    if (!isScalar(raw)) continue;
    const value = String(raw).trim();
    if (!value) continue;
    extras.push({ key, label: key, value });
  }
  return extras;
}

export function enrichOrderResultBlock(baseResult, sourceValue) {
  const payload = extractOrderPayload(sourceValue);
  const profiles = loadProfiles();
  const profile = profiles[baseResult.schemaKey] || profiles.sales_order;
  if (!profile || !Object.keys(payload).length) return { ...baseResult };

  const shownKeys = collectShownKeys(profile);
  const fieldGroups = buildFieldGroups(payload, profile);
  const sections = buildSections(payload, profile);
  const warnings = buildWarnings(payload, profile);
  const extras = buildExtras(payload, profile, shownKeys);

  const enriched = { ...baseResult };
  if (fieldGroups.length) enriched.fieldGroups = fieldGroups;
  if (sections.length) enriched.sections = sections;
  if (warnings.length) enriched.warnings = warnings;
  if (extras.length) enriched.extras = extras;
  return enriched;
}
