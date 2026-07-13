import type { FormField } from "../types/message";

/** 内部/技术字段键：裸 id、*_id、pk_* */
export function isInternalFieldKey(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  if (k === "id") return true;
  if (k.endsWith("_id")) return true;
  if (k.startsWith("pk_")) return true;
  return false;
}

export function sanitizeFormFields(fields: FormField[]): FormField[] {
  return fields.filter((f) => !isInternalFieldKey(f.key));
}

export function sanitizeTableColumns(
  columns: string[],
  rows?: Record<string, unknown>[],
): string[] {
  let cols = columns.filter((c) => !isInternalFieldKey(c));
  if (rows?.length) {
    const keysInRows = new Set(rows.flatMap((row) => Object.keys(row)));
    cols = cols.filter((c) => keysInRows.has(c));
  }
  return cols;
}

function fieldByKey(fields: FormField[], key: string): FormField | undefined {
  return fields.find((f) => f.key.toLowerCase() === key.toLowerCase());
}

function isFalseish(value: string | undefined): boolean {
  if (value == null) return false;
  const s = value.trim().toLowerCase();
  return s === "false" || s === "0";
}

export function isApiErrorForm(fields: FormField[]): boolean {
  const successField = fieldByKey(fields, "success");
  if (!successField) return false;
  if (!isFalseish(successField.value)) return false;
  return fields.some((f) => {
    const k = f.key.toLowerCase();
    return k === "message" || k === "error" || k === "code";
  });
}

const DETAIL_LABELS: Record<string, string> = {
  code: "错误码",
  traceid: "追踪 ID",
  detailId: "详情 ID",
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const DETAIL_SUFFIX_RE =
  /[。；,.]?\s*详细信息[：:]\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i;

/** 从 message 正文剥离尾部「详细信息: uuid」，避免技术 ID 直接展示给用户 */
export function cleanApiErrorMessage(raw: string): {
  message: string;
  embeddedDetailId?: string;
} {
  const trimmed = raw.trim();
  const suffixMatch = trimmed.match(DETAIL_SUFFIX_RE);
  if (suffixMatch) {
    return {
      message: trimmed.replace(DETAIL_SUFFIX_RE, "").replace(/[。；,.]\s*$/, "。").trim(),
      embeddedDetailId: suffixMatch[1],
    };
  }

  const trailingUuid = trimmed.match(
    new RegExp(`[。；,.]?\\s*(${UUID_RE.source})\\s*$`, "i"),
  );
  if (trailingUuid && trimmed.length - trailingUuid[0].length > 20) {
    return {
      message: trimmed.slice(0, trimmed.length - trailingUuid[0].length).replace(/[。；,.]\s*$/, "。").trim(),
      embeddedDetailId: trailingUuid[1],
    };
  }

  return { message: trimmed };
}

function inferErrorTitle(message: string): string {
  if (/销售订单|订单保存|订单提交/.test(message)) return "订单保存失败";
  if (/发货/.test(message)) return "发货申请失败";
  if (/合同/.test(message)) return "合同处理失败";
  return "处理未成功";
}

export function inferErrorSuggestion(message: string): string {
  if (/计量单位/.test(message)) {
    return "请确认商品计量单位与系统档案一致，修正后重新提交。";
  }
  if (/请检查录入|请检查/.test(message)) {
    return "请根据提示修正录入信息后重新操作。";
  }
  return "请稍后重试，或展开下方技术详情联系管理员。";
}

const UNBRACKETED_INVALID_RE = /([\u4e00-\u9fa5a-zA-Z_]+)\s+(\S+)\s+不合法/;

/** 将 ERP 错误 message 解析为结构化事实行（问题字段 / 错误原因 / 处理建议） */
export function parseApiErrorFacts(message: string): FormField[] {
  const facts: FormField[] = [];

  const fieldMatch = message.match(/\[([^\]]+)\]/);
  const invalidValueMatch = message.match(/的值\s*([^,，。\s]+)\s*不合法/);
  const unbracketedMatch = !fieldMatch ? message.match(UNBRACKETED_INVALID_RE) : null;

  if (fieldMatch) {
    facts.push({ key: "field", label: "问题字段", value: fieldMatch[1] });
  } else if (unbracketedMatch) {
    facts.push({ key: "field", label: "问题字段", value: unbracketedMatch[1] });
  }

  if (fieldMatch && invalidValueMatch) {
    facts.push({
      key: "cause",
      label: "错误原因",
      value: `录入「${invalidValueMatch[1]}」不合法，请检查是否与系统档案一致`,
    });
  } else if (unbracketedMatch) {
    facts.push({
      key: "cause",
      label: "错误原因",
      value: `录入「${unbracketedMatch[2]}」不合法，请检查是否与系统档案一致`,
    });
  } else {
    const causeMatch = message.match(/不合法[^。；]*[。；]?/);
    if (causeMatch) {
      facts.push({
        key: "cause",
        label: "错误原因",
        value: causeMatch[0].replace(/[。；]\s*$/, "").trim(),
      });
    } else {
      const trimmed = message.replace(/详细信息[：:].+$/i, "").trim();
      const sentences = trimmed.split(/[。；]/).map((s) => s.trim()).filter(Boolean);
      const cause = sentences.find((s) => /异常|失败|不合法|错误/.test(s)) || sentences[sentences.length - 1];
      if (cause) {
        facts.push({ key: "cause", label: "错误原因", value: cause });
      }
    }
  }

  if (facts.length === 0) {
    facts.push({ key: "summary", label: "错误说明", value: message });
  }

  return facts;
}

export function pickApiErrorDisplay(fields: FormField[]): {
  title: string;
  message: string;
  suggestion: string;
  factFields: FormField[];
  detailFields: FormField[];
} {
  const messageField = fieldByKey(fields, "message");
  const errorField = fieldByKey(fields, "error");
  const rawMessage = messageField?.value?.trim() || errorField?.value?.trim() || "操作未能完成，请稍后重试。";
  const { message, embeddedDetailId } = cleanApiErrorMessage(rawMessage);

  const detailFields = fields
    .filter((f) => {
      const k = f.key.toLowerCase();
      return k === "code" || k === "traceid";
    })
    .map((f) => ({
      ...f,
      label: DETAIL_LABELS[f.key.toLowerCase()] || f.label,
    }));

  if (embeddedDetailId) {
    const hasSame = detailFields.some(
      (f) => f.value.toLowerCase() === embeddedDetailId.toLowerCase(),
    );
    if (!hasSame) {
      detailFields.push({
        key: "detailId",
        label: DETAIL_LABELS.detailId,
        value: embeddedDetailId,
      });
    }
  }

  const suggestion = inferErrorSuggestion(message);

  return {
    title: inferErrorTitle(message),
    message,
    suggestion,
    factFields: parseApiErrorFacts(message),
    detailFields,
  };
}
