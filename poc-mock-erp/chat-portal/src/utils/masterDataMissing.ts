import type { FormField } from "../types/message";

export type MasterDataMissingInfo = {
  title: "主数据缺失";
  fields: string[];
  hint: string;
  contact?: string;
  factFields: FormField[];
  raw: string;
};

const TAG_FULLWIDTH = "【主数据缺失】";
const TAG_HALFWIDTH = "[主数据缺失]";
/** 捕获「XXX主数据」并匹配「缺失」前缀模式 */
const FIELD_PREFIX_RE = /^(.+?主数据)缺失/;
/** 联系人：姓名，电话（其后可为多空格或「后续…」） */
const CONTACT_RE = /联系人[：:]\s*(.+?)(?=\s{2,}|\s*后续|$)/;

function compressWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function extractContact(text: string): { contact?: string; remainder: string } {
  const match = text.match(CONTACT_RE);
  if (!match) return { remainder: text };
  const contact = match[1].trim();
  const remainder = compressWhitespace(
    `${text.slice(0, match.index)}${text.slice((match.index ?? 0) + match[0].length)}`,
  );
  return { contact, remainder };
}

function buildFactFields(fields: string[], contact?: string): FormField[] {
  const factFields: FormField[] = [];
  if (fields[0]) {
    factFields.push({ key: "missingType", label: "缺失类型", value: fields[0] });
  }
  if (contact) {
    factFields.push({ key: "contact", label: "联系人", value: contact });
  }
  return factFields;
}

export function tryParseMasterDataMissing(text: string): MasterDataMissingInfo | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;

  let body: string | null = null;
  if (trimmed.startsWith(TAG_FULLWIDTH)) {
    body = trimmed.slice(TAG_FULLWIDTH.length);
  } else if (trimmed.startsWith(TAG_HALFWIDTH)) {
    body = trimmed.slice(TAG_HALFWIDTH.length);
  } else {
    return null;
  }

  body = body.trim();
  const fieldMatch = body.match(FIELD_PREFIX_RE);
  let fields: string[] = [];
  let remainder = body;

  if (fieldMatch) {
    const field = fieldMatch[1];
    fields = [field];
    const prefixWithComma = `${field}缺失，`;
    const prefixPlain = `${field}缺失`;
    remainder = body.startsWith(prefixWithComma)
      ? body.slice(prefixWithComma.length)
      : body.slice(prefixPlain.length);
  }

  const { contact, remainder: withoutContact } = extractContact(remainder);
  const hint = compressWhitespace(withoutContact);
  const factFields = buildFactFields(fields, contact);

  return {
    title: "主数据缺失",
    fields,
    hint,
    ...(contact ? { contact } : {}),
    factFields,
    raw: trimmed,
  };
}
