/**
 * 客户端解析（与 gateway choiceParser 规则一致，按 flowKey 路由）
 */

import {
  hasLineStartBracketFieldSections,
  parseBracketSections,
  parseLegacySections,
  normalizePlatformQuotes,
  type ChoiceBlock,
  type ChoiceOption,
  type ParsedChoiceBlocks,
} from "./choiceParserShared";
import { tryParseShipmentChoiceBlocks } from "./shipmentChoiceParser";
import { tryParseSalesOrderChoiceBlocks } from "./salesOrderChoiceParser";

export type { ChoiceBlock, ChoiceOption, ParsedChoiceBlocks };

function parseGenericChoiceBlocks(text: string): ParsedChoiceBlocks | null {
  const shipment = tryParseShipmentChoiceBlocks(text);
  if (shipment) return shipment;
  if (hasLineStartBracketFieldSections(text)) return parseBracketSections(text);
  return parseLegacySections(text);
}

function parseShipmentChoiceBlocks(text: string): ParsedChoiceBlocks | null {
  return tryParseShipmentChoiceBlocks(text);
}

export function parseChoiceBlocksFromText(text: string, flowKey?: string | null): ParsedChoiceBlocks | null {
  if (!text) return null;
  const normalized = normalizePlatformQuotes(text);

  if (flowKey === "sales_order") {
    return tryParseSalesOrderChoiceBlocks(normalized);
  }

  if (flowKey === "shipment") {
    return parseShipmentChoiceBlocks(normalized);
  }

  return parseGenericChoiceBlocks(normalized);
}

export function parseChoiceFromText(text: string, flowKey?: string | null) {
  return parseChoiceBlocksFromText(text, flowKey);
}
