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

/**
 * 中台「记忆/知识库」节点常输出 { bucketSn, memoryContent, createTime } 包装体，
 * memoryContent 内才是真正的业务 JSON（如销售订单字段）。展开后再走 form/card/table 逻辑。
 */
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

function isFormLikeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length < 2) return false;
  if (entries.some(([k]) => FILE_KEYS.has(k))) return false;
  return entries.every(([, v]) => isScalarFormValue(v));
}

function buildFormBlockFromScalars(scalars, itemName, schemaKey, minFields = 2) {
  const keys = Object.keys(scalars);
  if (keys.length < minFields) return null;

  const schema = formSchemas[schemaKey] || formSchemas.generic || {};
  const labels = schema.labels || {};
  const widgets = schema.widgets || {};
  const fieldOrder = schema.fieldOrder || [];

  const orderedKeys = [
    ...fieldOrder.filter((k) => k in scalars),
    ...keys.filter((k) => !fieldOrder.includes(k)),
  ];

  const fields = orderedKeys.map((key) => ({
    key,
    label: labels[key] || key,
    value: scalars[key] == null ? "" : String(scalars[key]),
    widget: widgets[key] || undefined,
  }));

  const actions = (schema.actions || formSchemas.generic?.actions || []).map((a) => ({ ...a }));

  return {
    type: "form",
    schemaKey,
    title: schema.title || itemName || "结构化表单",
    fields,
    actions,
  };
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

/**
 * 将一个输出项（{ id, type, name, currentValue }）转换为消息块数组。
 * 同时收集 <think> 推理段（挂在返回数组的 _reasoning 上）。
 */
function outputItemToBlocks(item, flowKey) {
  let value = item.currentValue ?? item.value ?? item.defaultValue;
  value = unwrapMemoryContent(value);
  const blocks = [];
  blocks._reasoning = [];

  // 文件/知识类
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

  // 字符串：先剥离 <think>，再尝试识别 JSON 字符串以优化展示
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

/**
 * 单个输出项归一化（供流式逐事件复用）。
 * 返回 { blocks, reasoning }。
 */
export function normalizeOutputItem(item, flowKey) {
  const produced = outputItemToBlocks(item, flowKey);
  return { blocks: [...produced], reasoning: produced._reasoning || [] };
}

/**
 * 取出输出项数组，兼容两种结构：
 * - 实际：data.content.output = [{id,type,name,currentValue,...}]
 * - 文档：data.output = { var_xxx: value }
 */
function extractOutputItems(data) {
  const content = data?.content;
  if (content && Array.isArray(content.output)) return content.output;
  if (Array.isArray(data?.output)) return data.output;
  if (data?.output && typeof data.output === "object") {
    return Object.entries(data.output).map(([id, currentValue]) => ({ id, name: id, currentValue }));
  }
  return [];
}

/**
 * 中台对话流响应 → { blocks, traces, runId, runStatus }
 */
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
