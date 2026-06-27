/**
 * 树形 JSON 分区：多层级标量上浮 + 同级多组数组 → 头字段 + 多个明细表。
 */

const FILE_KEYS = new Set(["fileSn", "fileName", "url"]);

/** @type {Record<string, object>} */
let formSchemas = {};

export function setPartitionSchemas(schemas) {
  formSchemas = schemas || {};
}

function isScalarFormValue(val) {
  return val === null || ["string", "number", "boolean"].includes(typeof val);
}

export function looksLikeTableRows(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item && typeof item === "object" && !Array.isArray(item))
  );
}

function collectAllKeys(node) {
  const keys = new Set();
  function walk(val) {
    if (val == null || typeof val !== "object") return;
    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }
    for (const [k, v] of Object.entries(val)) {
      keys.add(k);
      walk(v);
    }
  }
  walk(node);
  return keys;
}

export function matchSchemaKeyDeep(root) {
  let bestKey = null;
  let bestScore = 0;
  for (const [key, schema] of Object.entries(formSchemas)) {
    if (key === "generic") continue;
    const matchKeys = schema.matchKeys || [];
    if (!matchKeys.length) continue;
    const keySet = schema.deepMatch ? collectAllKeys(root) : new Set(Object.keys(root || {}));
    const score = matchKeys.filter((k) => keySet.has(k)).length;
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey || "generic";
}

function isAllScalars(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj) && Object.values(obj).every(isScalarFormValue);
}

function normalizeRow(row, fieldMap) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = fieldMap?.[k] || k;
    out[nk] = v;
  }
  return out;
}

function findListSectionConfig(sectionConfigs, key) {
  return sectionConfigs.find((s) => (s.keys || []).includes(key));
}

function orderColumns(columnOrder, rows) {
  const fromRows = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  let ordered;
  if (!columnOrder?.length) {
    ordered = fromRows;
  } else {
    ordered = [...columnOrder.filter((c) => fromRows.includes(c)), ...fromRows.filter((c) => !columnOrder.includes(c))];
  }
  const auditResultCols = new Set(["审核结果", "结论", "风险等级"]);
  const rest = ordered.filter((c) => !auditResultCols.has(c));
  const audit = ordered.filter((c) => auditResultCols.has(c));
  return [...rest, ...audit];
}

function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function parseSummaryPlainText(text) {
  const normalized = String(text).replace(/\r/g, "");
  const total = normalized.match(/总审核项\D*(\d+)/)?.[1];
  const passed = normalized.match(/通过\D*(\d+)/)?.[1];
  const failed = normalized.match(/不通过\D*(\d+)/)?.[1];
  if (!total && !passed && !failed) return null;
  const out = {};
  if (total) out["总审核项数"] = total;
  if (passed) out["通过项数"] = passed;
  if (failed) out["不通过项数"] = failed;
  return out;
}

function isSummarySectionKey(key) {
  return key === "审核总结" || String(key).includes("审核总结");
}

/**
 * @returns {{ headerScalars: Record<string, unknown>, listSections: Array<{ sectionKey: string, title: string, rows: object[], columnOrder: string[] }>, schemaKey: string }}
 */
export function partitionStructuredTree(root) {
  const schemaKey = matchSchemaKeyDeep(root);
  const schema = formSchemas[schemaKey] || formSchemas.generic || {};
  const sectionConfigs = schema.listSections || [];
  const unwrapPaths = new Set(schema.unwrapPaths || []);
  const listSectionKeys = new Set();
  for (const sec of sectionConfigs) {
    for (const k of sec.keys || []) listSectionKeys.add(k);
  }

  const headerScalars = {};
  const listSections = [];
  const consumedListKeys = new Set();

  function addListSection(key, rows, config) {
    const normalized = rows.map((r) => normalizeRow(r, config?.fieldMap));
    if (config?.flattenWhenSingle && normalized.length === 1) {
      for (const [k, v] of Object.entries(normalized[0])) {
        if (!listSectionKeys.has(k)) headerScalars[k] = v;
      }
      consumedListKeys.add(key);
      return;
    }
    listSections.push({
      sectionKey: key,
      title: config?.title || key,
      rows: normalized,
      columnOrder: orderColumns(config?.columnOrder, normalized),
    });
    consumedListKeys.add(key);
  }

  function handleArray(key, val, autoGeneric) {
    if (!looksLikeTableRows(val)) return false;
    const config = findListSectionConfig(sectionConfigs, key);
    if (config) {
      addListSection(key, val, config);
      return true;
    }
    if (autoGeneric || schemaKey === "generic") {
      listSections.push({
        sectionKey: key,
        title: key,
        rows: val,
        columnOrder: orderColumns([], val),
      });
      consumedListKeys.add(key);
      return true;
    }
    return false;
  }

  function processNode(node, autoGeneric = false) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;

    for (const [key, val] of Object.entries(node)) {
      if (FILE_KEYS.has(key) || consumedListKeys.has(key)) continue;

      if (Array.isArray(val)) {
        handleArray(key, val, autoGeneric);
        continue;
      }

      if (typeof val === "string") {
        const parsed = tryParseJsonString(val);
        if (parsed !== null) {
          if (Array.isArray(parsed)) {
            if (handleArray(key, parsed, autoGeneric)) continue;
          } else if (parsed && typeof parsed === "object") {
            if (unwrapPaths.has(key) || isAllScalars(parsed)) {
              for (const [ck, cv] of Object.entries(parsed)) {
                if (consumedListKeys.has(ck)) continue;
                if (Array.isArray(cv)) {
                  handleArray(ck, cv, autoGeneric);
                } else if (isScalarFormValue(cv) && !listSectionKeys.has(ck)) {
                  headerScalars[ck] = cv;
                } else if (cv && typeof cv === "object" && !Array.isArray(cv) && isAllScalars(cv)) {
                  for (const [dk, dv] of Object.entries(cv)) {
                    if (isScalarFormValue(dv) && !listSectionKeys.has(dk)) headerScalars[dk] = dv;
                  }
                }
              }
              continue;
            }
            processNode(parsed, autoGeneric);
            continue;
          }
        }
        if (isSummarySectionKey(key)) {
          const plain = parseSummaryPlainText(val);
          if (plain) {
            for (const [sk, sv] of Object.entries(plain)) {
              if (!listSectionKeys.has(sk)) headerScalars[sk] = sv;
            }
            continue;
          }
        }
        if (!listSectionKeys.has(key)) headerScalars[key] = val;
        continue;
      }

      if (isScalarFormValue(val)) {
        if (!listSectionKeys.has(key)) headerScalars[key] = val;
        continue;
      }

      if (val && typeof val === "object") {
        if (unwrapPaths.has(key) || isAllScalars(val)) {
          for (const [ck, cv] of Object.entries(val)) {
            if (consumedListKeys.has(ck)) continue;
            if (Array.isArray(cv)) {
              handleArray(ck, cv, autoGeneric);
            } else if (isScalarFormValue(cv) && !listSectionKeys.has(ck)) {
              headerScalars[ck] = cv;
            } else if (cv && typeof cv === "object" && !Array.isArray(cv)) {
              if (isAllScalars(cv)) {
                for (const [dk, dv] of Object.entries(cv)) {
                  if (isScalarFormValue(dv) && !listSectionKeys.has(dk)) headerScalars[dk] = dv;
                }
              } else {
                processNode(cv, autoGeneric);
              }
            }
          }
        } else {
          processNode(val, autoGeneric);
        }
      }
    }
  }

  processNode(root, schemaKey === "generic");

  return { headerScalars, listSections, schemaKey };
}

export function tableBlockFromSection(section) {
  return {
    type: "table",
    title: section.title,
    columns: section.columnOrder.length ? section.columnOrder : orderColumns([], section.rows),
    rows: section.rows,
  };
}
