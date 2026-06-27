/**
 * 通用 choice 文本解析（【字段】、**字段**、①② 等），供各 flow 专用解析器复用。
 */

/** 中台 live 常输出弯引号 “ ”，归一化为直引号便于解析 */
export function normalizePlatformQuotes(text) {
  return String(text ?? "")
    .replace(/[\u201c\u201e\u2033]/g, '"')
    .replace(/[\u201d\u201f\u2036]/g, '"')
    .replace(/[\u2018\u201a]/g, "'")
    .replace(/[\u2019\u201b]/g, "'");
}

const OPTION_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+)$/;
const NUM_OPTION_RE = /^(\d+)[.．、)）]\s*(.+)$/;
const INLINE_OPTION_MARK = /[①②③④⑤⑥⑦⑧⑨⑩]/;
const INLINE_OPTION_RE = /[①②③④⑤⑥⑦⑧⑨⑩]\s*([^①②③④⑤⑥⑦⑧⑨⑩；;\n]+)/g;
const FIELD_COLON_RE = /^(.+?)[：:](.+)$/;
const CONFIRM_HINT_RE = /(请选择|请确认|请从以下|相似|未找到|不完全一致|是否需要|查询到相关|请核对|请回复|重新输入)/;
const ENTITY_RE = /(有限公司|股份有限公司|集团公司|集团)/;

function stripMarkdownLine(line) {
  return String(line)
    .replace(/\*\*/g, "")
    .replace(/^[\s*\-•]+/, "")
    .trim();
}

function extractQuoted(text) {
  const normalized = normalizePlatformQuotes(text);
  return [...normalized.matchAll(/[「"]([^」"]+)[」"]/g)].map((m) => m[1].trim()).filter(Boolean);
}

function cleanOptionLabel(line) {
  return line
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/^\d+[.．、)）]\s*/, "")
    .replace(/[；。;]+$/g, "")
    .trim();
}

function isTrivialHint(hint) {
  const t = hint.replace(/\s/g, "");
  return !t || /^[。.，,、；;：:]+$/.test(t);
}

function splitInlineNumberedOptions(line) {
  if (!INLINE_OPTION_MARK.test(line)) return null;
  const idx = line.search(INLINE_OPTION_MARK);
  let hintPart = line.slice(0, idx).trim().replace(/[：:，,]+$/g, "");
  const options = [];
  for (const m of line.slice(idx).matchAll(INLINE_OPTION_RE)) {
    const text = cleanOptionLabel(m[1]);
    if (text) options.push(text);
  }
  if (!options.length) return null;
  return { hintPart, options };
}

function isPureEntityOptionLine(line) {
  if (!ENTITY_RE.test(line)) return false;
  if (CONFIRM_HINT_RE.test(line)) return false;
  if (INLINE_OPTION_MARK.test(line)) return false;
  return line.length <= 80;
}

function isLikelyOptionLine(line) {
  if (!line) return false;
  if (OPTION_RE.test(line)) return true;
  if (INLINE_OPTION_MARK.test(line)) return false;
  return isPureEntityOptionLine(line);
}

function buildOptions(label, optionLabels, groupIndex) {
  return optionLabels.map((raw, i) => {
    const text = cleanOptionLabel(raw);
    return {
      id: `choice-${groupIndex}-opt-${i}`,
      label: text,
      message: text,
    };
  });
}

function processLine(line, hintParts, optionLines) {
  const stripped = stripMarkdownLine(line);
  if (!stripped) return;

  const optMatch = stripped.match(OPTION_RE);
  if (optMatch) {
    optionLines.push(optMatch[1]);
    return;
  }

  const numMatch = stripped.match(NUM_OPTION_RE);
  if (numMatch) {
    optionLines.push(numMatch[2]);
    return;
  }

  const inline = splitInlineNumberedOptions(stripped);
  if (inline) {
    if (inline.hintPart && !isTrivialHint(inline.hintPart)) hintParts.push(inline.hintPart);
    optionLines.push(...inline.options);
    return;
  }

  if (isLikelyOptionLine(stripped)) {
    optionLines.push(stripped);
    return;
  }

  hintParts.push(stripped);
}

function buildChoiceBlock(label, body, groupIndex) {
  const lines = body.split(/\r?\n/).map(stripMarkdownLine).filter(Boolean);
  const hintParts = [];
  const optionLines = [];

  for (const line of lines) {
    processLine(line, hintParts, optionLines);
  }

  if (!optionLines.length && !lines.length && body.trim()) {
    processLine(body.trim(), hintParts, optionLines);
  }

  let hint = hintParts.join(" ").trim().replace(/^[\s：:]+/, "");
  if (isTrivialHint(hint)) hint = "";

  const options = buildOptions(label, optionLines, groupIndex);
  if (!options.length && !hint) return null;

  return {
    type: "choice",
    label,
    hint: hint || undefined,
    options,
  };
}

function isTrivialBracketReferenceBody(body) {
  const t = String(body || "").trim();
  if (!t) return true;
  if (/^[和或与及、，,\s]+$/.test(t)) return true;
  if (t.length <= 2 && !/[「"\d①②]/.test(t)) return true;
  return false;
}

export function parseBracketSections(text) {
  const firstIdx = text.indexOf("【");
  const intro = firstIdx > 0 ? stripMarkdownLine(text.slice(0, firstIdx)) : undefined;
  const blocks = [];

  const re = /【([^】]+)】([^【]*)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const body = match[2].trim();
    if (isTrivialBracketReferenceBody(body)) continue;
    const block = buildChoiceBlock(match[1].trim(), body, blocks.length);
    if (block) blocks.push(block);
  }

  if (!blocks.length) return null;
  const introText = intro ? intro.replace(/[：:]\s*$/u, "").trim() : undefined;
  return { intro: introText || undefined, blocks };
}

export function parseLegacySections(text) {
  const lines = text.split(/\r?\n/).map(stripMarkdownLine).filter(Boolean);
  const intro = [];
  const footer = [];
  const groups = [];
  let current = null;
  let seenGroup = false;

  for (const line of lines) {
    const optMatch = line.match(OPTION_RE);
    if (optMatch) {
      if (!current) {
        current = { label: "请选择", hint: "", optionLines: [] };
      }
      current.optionLines.push(optMatch[1]);
      seenGroup = true;
      continue;
    }

    const inline = splitInlineNumberedOptions(line);
    if (inline && seenGroup && current) {
      if (inline.hintPart && !isTrivialHint(inline.hintPart)) {
        current.hint = current.hint ? `${current.hint} ${inline.hintPart}` : inline.hintPart;
      }
      current.optionLines.push(...inline.options);
      continue;
    }

    if (current && seenGroup) {
      const numMatch = line.match(NUM_OPTION_RE);
      if (numMatch) {
        current.optionLines.push(numMatch[2]);
        continue;
      }
      if (isLikelyOptionLine(line)) {
        current.optionLines.push(line);
        continue;
      }
    }

    const fieldMatch = line.match(FIELD_COLON_RE);
    if (fieldMatch && CONFIRM_HINT_RE.test(line)) {
      if (current && (current.optionLines?.length || current.hint)) groups.push(current);
      current = {
        label: fieldMatch[1].trim(),
        hint: fieldMatch[2].trim(),
        optionLines: [],
      };
      seenGroup = true;

      const inlineInField = splitInlineNumberedOptions(fieldMatch[2]);
      if (inlineInField) {
        current.hint = inlineInField.hintPart || "";
        current.optionLines.push(...inlineInField.options);
      }

      const quoted = extractQuoted(line);
      if (quoted.length >= 2) {
        current.optionLines.push(...quoted);
      }
      continue;
    }

    if (!seenGroup) {
      intro.push(line);
      continue;
    }

    if (current && current.optionLines.length === 0) {
      current.hint = current.hint ? `${current.hint} ${line}` : line;
      continue;
    }

    if (current) {
      current.hint = current.hint ? `${current.hint} ${line}` : line;
      continue;
    }

    footer.push(line);
  }

  if (current && (current.optionLines.length || current.hint)) groups.push(current);

  const blocks = groups
    .map((g, i) => {
      const options = buildOptions(g.label, g.optionLines, i);
      const hint = isTrivialHint(g.hint) ? undefined : g.hint || undefined;
      if (!options.length && !hint) return null;
      return {
        type: "choice",
        label: g.label,
        hint,
        options,
      };
    })
    .filter(Boolean);

  if (!blocks.length) return null;

  return {
    intro: intro.length ? intro.join("\n") : undefined,
    blocks,
    footer: footer.length ? footer.join("\n") : undefined,
  };
}

export function hasLineStartBracketFieldSections(text) {
  return /(?:^|\n)\s*【(?:客户|商品|产品|物料|供应商)[^】]{0,12}】/m.test(text);
}

const SINGLE_NEAR_MATCH_HINT_RE =
  /仅匹配到(?:一个)?(?:相近项|相似项)|匹配到相似项|(?:知识库|系统)(?:中)?仅匹配到[「"'][^」"']+[」"']|仅匹配到[「"'][^」"']+[」"'][，,]?.{0,40}(?:未找到完全一致|存在差异|未查询到)/;

/** 商品 hint 是否为「仅匹配到一个相近项/相似项」类 yes/no 确认 */
export function isSingleNearMatchHint(hint) {
  return SINGLE_NEAR_MATCH_HINT_RE.test(String(hint || ""));
}

export function extractSingleNearMatchName(hint) {
  const h = normalizePlatformQuotes(String(hint || ""));
  const direct = h.match(/仅匹配到(?:一个)?(?:相近项|相似项)[：:，,\s]*[「"']([^」"']+)[」"']/);
  if (direct) return direct[1].trim();
  const similar = h.match(/匹配到相似项[「"']([^」"']+)[」"']/);
  if (similar) return similar[1].trim();
  const kbMatch = h.match(/(?:知识库|系统)(?:中)?仅匹配到[「"']([^」"']+)[」"']/);
  if (kbMatch) return kbMatch[1].trim();
  const fallback = h.match(/仅匹配到[「"']([^」"']+)[」"']/);
  return fallback?.[1]?.trim();
}

export function buildYesNoMatchOptions(matchedName, groupIndex) {
  const name = String(matchedName || "").trim();
  if (!name) return [];
  return [
    { id: `choice-${groupIndex}-opt-0`, label: "是", message: name },
    { id: `choice-${groupIndex}-opt-1`, label: "否", message: "否" },
  ];
}

function trimHintBeforeConfirm(hint) {
  const h = String(hint || "");
  const idx = h.search(/请您确认[：:]/);
  return idx >= 0 ? h.slice(0, idx).trim() : h.trim();
}

/** 场景2：单相近项商品块 → 是/否 可点选 */
export function applyShipmentYesNoMatchOptions(parsed) {
  if (!parsed?.blocks?.length) return parsed;
  let footer = parsed.footer;
  const blocks = parsed.blocks.map((block, groupIndex) => {
    if (!/商品|产品|物料/.test(block.label)) return block;
    if (!isSingleNearMatchHint(block.hint)) return block;
    const matched = extractSingleNearMatchName(block.hint);
    if (!matched) return block;
    const trimmedHint = trimHintBeforeConfirm(block.hint);
    const confirmTail = String(block.hint || "").slice(trimmedHint.length).trim();
    if (confirmTail && !footer) {
      footer = confirmTail;
    }
    return {
      ...block,
      hint: trimmedHint || undefined,
      options: buildYesNoMatchOptions(matched, groupIndex),
    };
  });
  return { ...parsed, blocks, footer };
}
