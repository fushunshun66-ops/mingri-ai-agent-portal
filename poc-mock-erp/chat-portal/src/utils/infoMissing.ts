import { normalizePlatformQuotes } from "./choiceParserShared";

export type InfoMissingInfo = {
  title: "信息缺失";
  fields: string[];
  hint: string;
  raw: string;
};

const TAG = "[信息缺失]";
const DEFAULT_HINT = "请在下方输入框补充上述信息后发送。";
/** 与 salesOrder MISSING_FIELD_RE / extractQuoted 一致：书名号 + 直引号 + 单引号 */
const QUOTED_FIELD_RE = /[「"']([^」"']+)[」"']/g;
const PLEASE_SPLIT_RE = /以及|及|和|、/;
const TRAILING_PUNCT_RE = /[。．.；;，,\s]+$/u;

function extractQuotedFields(body: string): string[] {
  const fields: string[] = [];
  for (const match of body.matchAll(QUOTED_FIELD_RE)) {
    const name = match[1]?.trim();
    if (name && !fields.includes(name)) fields.push(name);
  }
  return fields;
}

function extractPleaseInputFields(body: string): string[] | null {
  if (!body.startsWith("请输入")) return null;
  const rest = body.slice("请输入".length).trim();
  if (!rest) return [];
  return rest
    .split(PLEASE_SPLIT_RE)
    .map((part) => part.trim().replace(TRAILING_PUNCT_RE, ""))
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index);
}

export function tryParseInfoMissing(text: string): InfoMissingInfo | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed.startsWith(TAG)) return null;

  const body = normalizePlatformQuotes(trimmed.slice(TAG.length).trim());
  const quotedFields = extractQuotedFields(body);
  if (quotedFields.length > 0) {
    return {
      title: "信息缺失",
      fields: quotedFields,
      hint: DEFAULT_HINT,
      raw: trimmed,
    };
  }

  const pleaseFields = extractPleaseInputFields(body);
  if (pleaseFields !== null) {
    return {
      title: "信息缺失",
      fields: pleaseFields,
      hint: body,
      raw: trimmed,
    };
  }

  return {
    title: "信息缺失",
    fields: [],
    hint: body,
    raw: trimmed,
  };
}
