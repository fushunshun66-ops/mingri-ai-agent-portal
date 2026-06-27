/**
 * 从助手纯文本/Markdown 解析「需用户确认」项，按 flowKey 路由到各智能体专用解析器。
 */

import {
  hasLineStartBracketFieldSections,
  parseBracketSections,
  parseLegacySections,
  normalizePlatformQuotes,
} from "./choiceParserShared.js";
import {
  isShipmentMissingFormat,
  parseShipmentMissingSections,
  tryParseShipmentChoiceBlocks,
} from "./shipmentChoiceParser.js";
import { tryParseSalesOrderChoiceBlocks } from "./salesOrderChoiceParser.js";

function parseGenericChoiceBlocks(text) {
  const shipment = tryParseShipmentChoiceBlocks(text);
  if (shipment) return shipment;
  if (hasLineStartBracketFieldSections(text)) {
    return parseBracketSections(text);
  }
  return parseLegacySections(text);
}

function parseShipmentChoiceBlocks(text) {
  return tryParseShipmentChoiceBlocks(text);
}

/**
 * @param {string} text
 * @param {string} [flowKey] sales_order | shipment | contract_review
 * @returns {null | { intro?: string, blocks: object[], footer?: string }}
 */
export function parseChoiceBlocksFromText(text, flowKey) {
  if (!text || typeof text !== "string") return null;
  const normalized = normalizePlatformQuotes(text);

  if (flowKey === "sales_order") {
    return tryParseSalesOrderChoiceBlocks(normalized);
  }

  if (flowKey === "shipment") {
    return parseShipmentChoiceBlocks(normalized);
  }

  return parseGenericChoiceBlocks(normalized);
}

/** @deprecated 单块兼容，优先使用 parseChoiceBlocksFromText */
export function parseChoiceFromText(text, flowKey) {
  const parsed = parseChoiceBlocksFromText(text, flowKey);
  if (!parsed) return null;
  return {
    type: "choice",
    intro: parsed.intro,
    groups: parsed.blocks.map((b, i) => ({
      id: `group-${i}`,
      label: b.label,
      hint: b.hint,
      options: b.options,
    })),
    footer: parsed.footer,
  };
}

export function tryChoiceBlocksFromText(text, flowKey) {
  const parsed = parseChoiceBlocksFromText(text, flowKey);
  if (!parsed?.blocks?.length) return null;
  return parsed;
}

export function tryChoiceBlockFromText(text, flowKey) {
  const parsed = tryChoiceBlocksFromText(text, flowKey);
  if (!parsed) return null;
  if (parsed.blocks.length === 1 && !parsed.intro && !parsed.footer) {
    return parsed.blocks[0];
  }
  return null;
}
