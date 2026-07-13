const THINK_RE = /<think>([\s\S]*?)<\/think>/gi;

const FILE_KEYS = new Set(["fileSn", "fileName", "url"]);

import {
  partitionStructuredTree,
  tableBlockFromSection,
  looksLikeTableRows,
  matchSchemaKeyDeep,
  setPartitionSchemas,
} from "./partitioner.js";
import { tryChoiceBlocksFromText } from "./choiceParser.js";
import { tryOrderResultBlock, tryOrderResultFromObject } from "./orderResultParser.js";
import { parseLooseJson, unwrapDocArray } from "./jsonPayload.js";

/** @type {Record<string, object>} */
let formSchemas = {};

export function setFormSchemas(schemas) {
  formSchemas = schemas || {};
  setPartitionSchemas(schemas);
}

function splitThink(text) {
  const reasoning = [];
  const visible = String(text).replace(THINK_RE, (_, inner) => {
    reasoning.push(inner.trim());
    return "";
  });
  return { visible: visible.trim(), reasoning };
}

function tryParseJson(text) {
  return parseLooseJson(text);
}

function unwrapMemoryContent(value) {
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== undefined) return unwrapMemoryContent(parsed);
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value) && "memoryContent" in value) {
    const inner = value.memoryContent;
    if (typeof inner === "string") {
      const parsed = tryParseJson(inner.trim());
      return parsed !== undefined ? parsed : inner;
    }
    if (inner && typeof inner === "object") return inner;
  }
  return value;
}

/** Mock 键值行 [{ 字段, 值 }, ...] → 平面对象 */
function kvRowsToObject(value) {
  if (!looksLikeTableRows(value)) return null;
  const keys = Object.keys(value[0]);
  if (keys.length !== 2 || !keys.includes("字段") || !keys.includes("值")) return null;
  const obj = {};
  for (const row of value) {
    const k = row["字段"];
    const v = row["值"];
    if (k == null || k === "") return null;
    obj[String(k)] = v == null ? "" : v;
  }
  return Object.keys(obj).length >= 2 ? obj : null;
}

function isScalarFormValue(val) {
  return val === null || ["string", "number", "boolean"].includes(typeof val);
}


function isInternalFieldKey(key) {
  if (!key) return false;
  const k = String(key).toLowerCase();
  if (k === "id") return true;
  if (k.endsWith("_id")) return true;
  if (k.startsWith("pk_")) return true;
  return false;
}

function isFalseishSuccess(success) {
  if (success === false || success === 0) return true;
  const s = String(success).trim().toLowerCase();
  return s === "false" || s === "0";
}

function isApiErrorScalars(scalars) {
  if (!("success" in scalars)) return false;
  if (!isFalseishSuccess(scalars.success)) return false;
  return "message" in scalars || "error" in scalars || "code" in scalars;
}

function isFormLikeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length < 2) return false;
  if (entries.some(([k]) => FILE_KEYS.has(k))) return false;
  return entries.every(([, v]) => isScalarFormValue(v));
}

function buildFormBlockFromScalars(scalars, itemName, schemaKey, minFields = 2) {
  const filteredScalars = {};
  for (const [k, v] of Object.entries(scalars)) {
    if (!isInternalFieldKey(k)) filteredScalars[k] = v;
  }
  const keys = Object.keys(filteredScalars);
  if (keys.length < minFields) return null;

  const schema = formSchemas[schemaKey] || formSchemas.generic || {};
  const labels = schema.labels || {};
  const widgets = schema.widgets || {};
  const fieldOrder = schema.fieldOrder || [];

  const orderedKeys = [
    ...fieldOrder.filter((k) => k in filteredScalars),
    ...keys.filter((k) => !fieldOrder.includes(k)),
  ];

  const fields = orderedKeys.map((key) => ({
    key,
    label: labels[key] || key,
    value: filteredScalars[key] == null ? "" : String(filteredScalars[key]),
    widget: widgets[key] || undefined,
  }));

  const actions = (schema.actions || formSchemas.generic?.actions || []).map((a) => ({ ...a }));

  const form = {
    type: "form",
    schemaKey,
    title: schema.title || itemName || "结构化表单",
    fields,
    actions,
  };

  if (isApiErrorScalars(filteredScalars)) {
    form.level = "error";
    form.title = "请求失败";
  }

  return form;
}

function buildFormBlock(obj, itemName) {
  if (!isFormLikeObject(obj)) return null;
  const schemaKey = matchSchemaKeyDeep(obj);
  return buildFormBlockFromScalars(obj, itemName, schemaKey);
}

function cardBlockFromObject(obj, title) {
  const fields = Object.entries(obj).map(([label, val]) => ({
    label,
    value: typeof val === "object" ? JSON.stringify(val) : String(val),
  }));
  return { type: "card", title: title || "结果", fields };
}

function tryPartitionToBlocks(value, itemName) {
  const { headerScalars, listSections, schemaKey } = partitionStructuredTree(value);
  const out = [];
  const scalarCount = Object.keys(headerScalars).length;

  if (scalarCount >= 2 || (scalarCount >= 1 && listSections.length > 0)) {
    const minFields = listSections.length > 0 ? 1 : 2;
    const form = buildFormBlockFromScalars(headerScalars, itemName, schemaKey, minFields);
    if (form) out.push(form);
  }

  for (const section of listSections) {
    out.push(tableBlockFromSection(section));
  }

  return out;
}

function tryFormOrCard(value, itemName) {
  const form = buildFormBlock(value, itemName);
  if (form) return form;
  return cardBlockFromObject(value, itemName);
}

function isFileLike(item) {
  return item && typeof item === "object" && (item.fileSn || item.fileName || item.url);
}

function tableBlock(rows) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { type: "table", columns, rows };
}

function fileBlock(item) {
  return {
    type: "file",
    name: item.fileName || item.name || item.fileSn || "文件",
    fileSn: item.fileSn || null,
    url: item.url || null,
    mime: item.fileType || item.mime || null,
  };
}

function tryInfoMissingBlock(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.Content !== "string") return null;
  if (/\[信息缺失\]|缺少关键要素/.test(value.Content)) {
    return { type: "markdown", content: value.Content };
  }
  return null;
}

const ENTITY_NAME_RE = /[\u4e00-\u9fa5A-Za-z0-9（）()·]{2,}(?:有限公司|股份有限公司|集团公司)/g;
const NARRATIVE_CHOICE_RE = /相似|请检查|请选择|请确认|目前库中有/;

function sanitizeCompanyName(raw) {
  return String(raw || "")
    .trim()
    .replace(/^.*(?:目前库中有|库中有|为：|为:)/, "")
    .trim();
}

function extractEntityNames(text) {
  const seen = new Set();
  const out = [];
  for (const m of String(text || "").matchAll(ENTITY_NAME_RE)) {
    const name = sanitizeCompanyName(m[0]);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function buildNarrativeChoiceBlocks(content) {
  const text = String(content || "").trim();
  if (!text || !NARRATIVE_CHOICE_RE.test(text)) return null;
  const entities = extractEntityNames(text);
  if (!entities.length) return null;
  return [
    {
      type: "choice",
      label: "客户",
      hint: text,
      options: entities.map((v, i) => ({
        id: `choice-narrative-${i}`,
        label: v,
        message: v,
      })),
    },
  ];
}

function tryChoiceBlocksFromNarrativeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const contentVal = value.Content ?? value.content;
  if (typeof contentVal !== "string") return null;
  const dataVal = value.Data ?? value.data;
  if (dataVal && typeof dataVal === "object" && !Array.isArray(dataVal)) {
    const hasDataArrays = Object.values(dataVal).some((v) => Array.isArray(v) && v.length > 0);
    if (hasDataArrays) return null;
  }
  return buildNarrativeChoiceBlocks(contentVal);
}

function tryChoiceBlocksFromNarrativeText(text) {
  if (typeof text !== "string") return null;
  return buildNarrativeChoiceBlocks(text);
}


const CANDIDATE_KEY_LABELS = { customers: "客户", materials: "物料", products: "商品" };

function tryChoiceBlocksFromObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const contentVal = value.Content ?? value.content;
  const dataVal = value.Data ?? value.data;

  if (typeof contentVal !== "string") {
    return null;
  }
  if (!dataVal || typeof dataVal !== "object" || Array.isArray(dataVal)) {
    return null;
  }

  const dataEntries = Object.entries(dataVal);
  if (!dataEntries.some(([, v]) => Array.isArray(v) && v.length > 0 && v.every(x => typeof x === "string"))) {
    return null;
  }

  const blocks = [];
  const trimmed = contentVal.trim();
  let firstChoice = true;

  for (const [key, val] of dataEntries) {
    if (!Array.isArray(val) || !val.length) continue;
    if (!val.every(v => typeof v === "string")) continue;
    const label = CANDIDATE_KEY_LABELS[key] || key;
    blocks.push({
      type: "choice",
      label,
      hint: firstChoice && trimmed ? trimmed : `请选择${label}`,
      options: val.map((v, i) => ({
        id: `choice-${key}-${i}`,
        label: v,
        message: v,
      })),
    });
    firstChoice = false;
  }

  const result = blocks.length > 0 ? blocks : null;
  return result;
}

function processStructuredValue(value, itemName, blocks) {
  value = unwrapDocArray(value);

  const kvObj = kvRowsToObject(value);
  if (kvObj) {
    const form = buildFormBlock(kvObj, itemName);
    if (form) {
      blocks.push(form);
      return true;
    }
  }

  if (looksLikeTableRows(value)) {
    blocks.push(tableBlock(value));
    return true;
  }

  if (Array.isArray(value)) {
    blocks.push({ type: "json", data: value, collapsed: true });
    return true;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const resultBlock = tryOrderResultFromObject(value);
    if (resultBlock) {
      blocks.push(resultBlock);
      return true;
    }

    // 场景①：信息缺失提示（先于场景④，避免含 [信息缺失] 的 Content+Data 被误判）
    const infoMissing = tryInfoMissingBlock(value);
    if (infoMissing) {
      blocks.push(infoMissing);
      return true;
    }

    // 场景④：多候选数据 → choice 块组
    const choiceBlocks = tryChoiceBlocksFromObject(value);
    if (choiceBlocks) {
      blocks.push(...choiceBlocks);
      return true;
    }

    const narrativeChoice = tryChoiceBlocksFromNarrativeObject(value);
    if (narrativeChoice) {
      blocks.push(...narrativeChoice);
      return true;
    }

    // 单字段字符串对象（如 { content: "消息文本" }）→ 直接渲染为 markdown，避免泄露 wrapper 键名
    const objKeys = Object.keys(value);
    if (objKeys.length === 1 && typeof value[objKeys[0]] === "string") {
      blocks.push({ type: "markdown", content: value[objKeys[0]] });
      return true;
    }

    const partitioned = tryPartitionToBlocks(value, itemName);
    if (partitioned.length > 0) {
      blocks.push(...partitioned);
      return true;
    }
    blocks.push(tryFormOrCard(value, itemName));
    return true;
  }

  return false;
}

function outputItemToBlocks(item, flowKey) {
  let value = item.currentValue ?? item.value ?? item.defaultValue;
  value = unwrapMemoryContent(value);
  const blocks = [];
  blocks._reasoning = [];

  if (Array.isArray(value) && value.every(isFileLike) && value.length) {
    value.forEach((f) => blocks.push(fileBlock(f)));
    return blocks;
  }
  if (isFileLike(value) && !Array.isArray(value)) {
    blocks.push(fileBlock(value));
    return blocks;
  }

  if (processStructuredValue(value, item.name, blocks)) {
    return blocks;
  }

  if (typeof value === "string") {
    const { visible, reasoning } = splitThink(value);
    blocks._reasoning = reasoning;
    if (!visible) return blocks;

    const parsed = tryParseJson(visible);
    if (parsed !== undefined) {
      if (processStructuredValue(parsed, item.name, blocks)) {
        return blocks;
      }
    }

    const resultBlock = tryOrderResultBlock(visible, item.name);
    if (resultBlock) {
      blocks.push(resultBlock);
      return blocks;
    }

    const narrativeText = tryChoiceBlocksFromNarrativeText(visible);
    if (narrativeText) {
      blocks.push(...narrativeText);
      return blocks;
    }

    const choiceParsed = tryChoiceBlocksFromText(visible, flowKey);
    if (choiceParsed) {
      if (choiceParsed.intro) {
        const intro = choiceParsed.intro.replace(/[：:]\s*$/u, "").trim();
        if (intro) blocks.push({ type: "markdown", content: intro });
      }
      for (const block of choiceParsed.blocks) {
        blocks.push(block);
      }
      if (choiceParsed.footer) {
        blocks.push({ type: "markdown", content: choiceParsed.footer });
      }
      return blocks;
    }

    blocks.push({ type: "markdown", content: visible });
    return blocks;
  }

  if (value != null) {
    blocks.push({ type: "text", content: String(value) });
  }
  return blocks;
}

export function normalizeOutputItem(item, flowKey) {
  const produced = outputItemToBlocks(item, flowKey);
  return { blocks: [...produced], reasoning: produced._reasoning || [] };
}

function extractOutputItems(data) {
  const content = data?.content;
  if (content && Array.isArray(content.output)) return content.output;
  if (Array.isArray(data?.output)) return data.output;
  if (data?.output && typeof data.output === "object") {
    return Object.entries(data.output).map(([id, currentValue]) => ({ id, name: id, currentValue }));
  }
  return [];
}

export function normalizeChatFlowResponse(body, flowKey) {
  const data = body?.data || {};
  const runId = data.runId != null ? String(data.runId) : null;
  const rawStatus = data.runStatus || data.status || data.messageStatus || (body?.success ? "success" : "fail");
  const runStatus = /complete|success/i.test(rawStatus) ? "SUCCESS" : "FAIL";

  const items = extractOutputItems(data);
  const blocks = [];
  const traces = [];
  let traceIndex = 0;

  for (const item of items) {
    const produced = outputItemToBlocks(item, flowKey);
    for (const r of produced._reasoning || []) {
      traces.push({ stepIndex: traceIndex++, stepType: "reasoning", nodeId: item.id, payload: { name: item.name, text: r } });
    }
    for (const block of produced) {
      blocks.push(block);
      traces.push({
        stepIndex: traceIndex++,
        stepType: "node_output",
        nodeId: item.id,
        payload: { name: item.name, type: item.type, blockType: block.type },
      });
    }
  }

  if (!blocks.length) {
    blocks.push({ type: "json", data, collapsed: false });
  }

  return { blocks, traces, runId, runStatus };
}

export function errorBlocks(message, raw) {
  return {
    blocks: [{ type: "card", title: "调用失败", level: "error", fields: [{ label: "原因", value: message }] }],
    traces: [{ stepIndex: 0, stepType: "error", payload: raw || { message } }],
    runId: null,
    runStatus: "FAIL",
  };
}
