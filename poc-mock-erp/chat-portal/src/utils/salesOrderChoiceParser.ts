/**
 * 场景1（智能销售订单）专用异常/确认提醒解析
 */

import {
  hasLineStartBracketFieldSections,
  parseBracketSections,
  parseLegacySections,
  normalizePlatformQuotes,
  applyShipmentYesNoMatchOptions,
  type ParsedChoiceBlocks,
} from "./choiceParserShared";
import { tryParseShipmentChoiceBlocks, isReviewConfirmClarifyText } from "./shipmentChoiceParser";

const NUM_LINE_RE = /^(\d+)[.．、)）]\s*(.+)$/;
const FIELD_LABEL = "(?:客户名称|商品名称|产品名称|物料)";
const FIELD_ANCHOR_RE = new RegExp(
  `(?:^|\\n|[。；;!！?？]\\s*)(?:另外[，,]\\s*)?(?:但)?(?:关于)?(${FIELD_LABEL})[「"']([^」"']+)[」"']`,
  "gm",
);
const FOOTER_BLOCK_RE = /(?:^|\n\n)(?:请您|请确认|请明确|请回复)/m;
const OPTION_ENTITY_LINE = /^(?:[\*\-•]\s*)?(?:[\u2460-\u2473\d]+[\s.．、)）]?)?[^：:]{0,20}(?:有限公司|股份有限公司)/;

function stripMarkdownLine(line: string) {
  return String(line)
    .replace(/\*\*/g, "")
    .replace(/^[\s*\-•]+/, "")
    .trim();
}

function cleanOptionLabel(line: string) {
  return line
    .replace(/^\d+[.．、)）]\s*/, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/[；。;]+$/g, "")
    .trim();
}

function extractQuoted(text: string) {
  return [...String(text).matchAll(/[「"]([^」"]+)[」"]/g)].map((m) => m[1].trim()).filter(Boolean);
}

function normalizeEntityName(name: string) {
  return String(name)
    .replace(/[（(][^)）]*[)）]/g, "")
    .trim();
}

function buildOptions(label: string, optionLabels: string[], groupIndex: number) {
  const seen = new Set<string>();
  const options = [];
  for (const raw of optionLabels) {
    const text = normalizeEntityName(cleanOptionLabel(raw));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    options.push({
      id: `choice-${groupIndex}-opt-${options.length}`,
      label: text,
      message: text,
    });
  }
  return options;
}

function extractProductOptionsFromHint(hint: string) {
  if (!hint || !/匹配|标准名称|是否为|是否使用|相似项/.test(hint)) return [];

  const similarItem = hint.match(/匹配到相似项[「"']([^」"']+)[」"']/);
  if (similarItem) return [normalizeEntityName(similarItem[1])].filter(Boolean);

  const matched = hint.match(/(?:仅)?匹配到[「"']([^」"']+)[」"']/);
  if (matched) return [normalizeEntityName(matched[1])].filter(Boolean);

  const whether = hint.match(/(?:是否为|下单的商品是否为)[「"']([^」"']+)[」"']/);
  if (whether) return [normalizeEntityName(whether[1])].filter(Boolean);

  const quotes = extractQuoted(hint).map(normalizeEntityName).filter(Boolean);
  if (/标准名称|是否为/.test(hint) && quotes.length) {
    return [quotes[quotes.length - 1]];
  }
  return [];
}

export function isSalesOrderNarrativeClarifyFormat(text: string) {
  const t = String(text || "");
  if (new RegExp(`${FIELD_LABEL}[「"']`).test(t) && /相似|未找到|不完全一致|未查询到|未匹配|知识库/.test(t)) {
    return true;
  }
  if (/关于(?:客户名称|商品名称|产品名称|物料)[「"']/.test(t)) return true;
  if (/未找到完全匹配项/.test(t) && /(?:^|\n)\s*\d+[.．、)）]\s+\S/m.test(t)) return true;
  if (/仅有以下(?:两个|三个|多个|几个)?相似/.test(t)) return true;
  if (/以下为相似客户/.test(t)) return true;
  return false;
}

function parseSectionBody(body: string) {
  const lines = String(body)
    .split(/\r?\n/)
    .map(stripMarkdownLine)
    .filter(Boolean);
  const options: string[] = [];
  const hintParts: string[] = [];
  const footerParts: string[] = [];
  let inNumbered = false;
  let inFooter = false;

  for (const line of lines) {
    if (!inFooter && /^(请您|请确认|请明确|请回复|如需)/.test(line)) {
      inFooter = true;
      footerParts.push(line);
      continue;
    }
    if (inFooter) {
      footerParts.push(line);
      continue;
    }

    const num = line.match(NUM_LINE_RE);
    if (num) {
      inNumbered = true;
      const label = cleanOptionLabel(num[2]);
      if (label) options.push(label);
      continue;
    }

    if (OPTION_ENTITY_LINE.test(line) && !inNumbered) {
      options.push(line);
      continue;
    }

    if (!inNumbered) {
      hintParts.push(line);
    }
  }

  return {
    hint: hintParts.join(" ").trim().replace(/^[，,、:：\s]+/, ""),
    options,
    footer: footerParts.join("\n").trim(),
  };
}

function splitNarrativeFieldSections(text: string) {
  const t = String(text).trim();
  const anchors: Array<{
    label: string;
    inputValue: string;
    contentStart: number;
    anchorStart: number;
    body?: string;
  }> = [];
  FIELD_ANCHOR_RE.lastIndex = 0;
  let match;
  while ((match = FIELD_ANCHOR_RE.exec(t)) !== null) {
    anchors.push({
      label: match[1].trim(),
      inputValue: match[2].trim(),
      contentStart: match.index + match[0].length,
      anchorStart: match.index,
    });
  }
  if (!anchors.length) return null;

  let footerEnd = t.length;
  const footerMatch = t.match(FOOTER_BLOCK_RE);
  if (footerMatch && footerMatch.index != null) {
    footerEnd = footerMatch.index;
  }

  const sections = anchors.map((anchor, i) => {
    const nextStart = i + 1 < anchors.length ? anchors[i + 1].anchorStart : footerEnd;
    return {
      ...anchor,
      body: t.slice(anchor.contentStart, nextStart).trim(),
    };
  });

  const intro = anchors[0].anchorStart > 0 ? t.slice(0, anchors[0].anchorStart).trim() : undefined;
  const footer = footerEnd < t.length ? t.slice(footerEnd).trim() : undefined;
  return { intro, sections, footer };
}

function parseSalesOrderNarrativeSections(text: string): ParsedChoiceBlocks | null {
  if (!isSalesOrderNarrativeClarifyFormat(text)) return null;

  const split = splitNarrativeFieldSections(text);
  if (!split?.sections?.length) return null;

  const blocks: ParsedChoiceBlocks["blocks"] = [];
  let footer = split.footer;

  for (const section of split.sections) {
    const { hint, options, footer: sectionFooter } = parseSectionBody(section.body || "");
    if (sectionFooter && !footer) footer = sectionFooter;

    let fullHint = hint;
    if (section.inputValue && !fullHint) {
      fullHint = `您提供的${section.label}为「${section.inputValue}」`;
    }

    let optionLabels = options;
    if (!optionLabels.length && /商品|产品|物料/.test(section.label)) {
      optionLabels = extractProductOptionsFromHint(fullHint);
    }

    blocks.push({
      type: "choice",
      label: section.label,
      hint: fullHint || undefined,
      options: buildOptions(section.label, optionLabels, blocks.length),
    });
  }

  if (!blocks.length) return null;

  return { intro: split.intro || undefined, blocks, footer: footer || undefined };
}

const MISSING_FIELD_RE = /缺少关键要素[「"']([^」"']+)[」"']/g;

function hasClarifyChoiceContent(text: string) {
  if (isReviewConfirmClarifyText(text)) return true;
  return (
    /(?:关于)?(?:客户名称|商品名称|产品名称|物料)[「"']/.test(text) &&
    /相似|匹配到|请选择|未找到完全匹配|相似客户/.test(text)
  );
}

function parseSalesOrderMissingFieldsReminder(text: string): ParsedChoiceBlocks | null {
  const t = normalizePlatformQuotes(String(text || "").trim());
  if (!/缺少关键要素/.test(t)) return null;
  if (hasClarifyChoiceContent(t)) return null;

  const fields: string[] = [];
  MISSING_FIELD_RE.lastIndex = 0;
  let match;
  while ((match = MISSING_FIELD_RE.exec(t)) !== null) {
    const name = match[1].trim();
    if (name && !fields.includes(name)) fields.push(name);
  }
  if (!fields.length) return null;

  return {
    blocks: [
      {
        type: "choice",
        label: "信息提醒",
        hint: "该指令尚缺少以下关键要素，请补充后继续：",
        options: [],
        variant: "reminder",
        items: fields,
      },
    ],
  };
}

const ENTITY_NAME_RE = /[\u4e00-\u9fa5A-Za-z0-9（）()·]{2,}(?:有限公司|股份有限公司|集团公司)/g;
const NARRATIVE_CHOICE_RE = /相似|请检查|请选择|请确认|目前库中有/;

function sanitizeCompanyName(raw: string) {
  return raw
    .trim()
    .replace(/^.*(?:目前库中有|库中有|为：|为:)/, "")
    .trim();
}

function extractEntityNames(text: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of String(text || "").matchAll(ENTITY_NAME_RE)) {
    const name = sanitizeCompanyName(m[0]);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function parseNarrativeEntityChoices(text: string): ParsedChoiceBlocks | null {
  const normalized = normalizePlatformQuotes(String(text || "").trim());
  if (!normalized || !NARRATIVE_CHOICE_RE.test(normalized)) return null;
  const entities = extractEntityNames(normalized);
  if (!entities.length) return null;
  return {
    intro: normalized,
    blocks: [
      {
        type: "choice",
        label: "客户",
        hint: "请选择客户",
        options: buildOptions("客户", entities, 0),
      },
    ],
  };
}

function withNarrativeEntityFallback(text: string, parsed: ParsedChoiceBlocks | null) {
  if (parsed?.blocks?.some((b) => b.options.length > 0)) return parsed;
  return parseNarrativeEntityChoices(text) ?? parsed;
}

export function tryParseSalesOrderChoiceBlocks(text: string): ParsedChoiceBlocks | null {
  if (!text) return null;
  const normalized = normalizePlatformQuotes(text);

  if (isReviewConfirmClarifyText(normalized)) {
    const review = tryParseShipmentChoiceBlocks(normalized);
    if (review?.blocks?.length) return review;
  }

  const missing = parseSalesOrderMissingFieldsReminder(normalized);
  if (missing?.blocks.length) return missing;

  const narrative = parseSalesOrderNarrativeSections(normalized);
  if (narrative?.blocks.length) return withNarrativeEntityFallback(normalized, applyShipmentYesNoMatchOptions(narrative));

  if (hasLineStartBracketFieldSections(normalized)) {
    return parseBracketSections(normalized);
  }

  const legacy = parseLegacySections(normalized);
  return withNarrativeEntityFallback(normalized, legacy ? applyShipmentYesNoMatchOptions(legacy) : null);
}
