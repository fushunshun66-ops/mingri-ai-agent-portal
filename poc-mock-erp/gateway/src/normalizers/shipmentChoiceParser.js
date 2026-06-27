/**
 * 场景2（智能发货申请单）专用文本解析。
 * 与销售订单格式独立：缺失提醒、匹配歧义（分段/编号）、Mock **字段** 格式。
 */

import { normalizePlatformQuotes, parseLegacySections, hasLineStartBracketFieldSections, parseBracketSections, applyShipmentYesNoMatchOptions } from "./choiceParserShared.js";

function stripLine(line) {
  return String(line)
    .replace(/\*\*/g, "")
    .replace(/^[\s*\-•]+/, "")
    .trim();
}

function cleanShipmentHint(body) {
  let hint = String(body || "")
    .replace(/^[，,、:：\s]+/, "")
    .replace(/[。.；;,\s]*发货明细中[。.；;,\s]*$/g, "")
    .trim();

  // 去掉中台列表序号尾巴：「请补充：1. 未填写」「。2. 未填写」
  hint = hint
    .replace(/[：:]\s*\d+[.．、)）]\s*未填写\s*$/u, "")
    .replace(/[。.．；;]\s*\d+[.．、)）]\s*未填写\s*$/u, "")
    .replace(/\s+\d+[.．、)）]\s*未填写\s*$/u, "")
    .trim();

  return hint;
}

function normalizeShipmentIntro(intro) {
  if (!intro) return undefined;
  const t = intro.trim();
  // 「发货明细中」只是上下文前缀，不作为卡片区标题
  if (!t || t === "发货明细中") return undefined;
  return t;
}

const SHIPMENT_FIELD_LABELS =
  /^(客户名称|商品名称|物料|仓库属地|收货地址|车牌|数量|提货日期|发货仓库|联系人|联系电话)$/;

const NUM_LINE_RE = /^(\d+)[.．、)）]\s*(.+)$/;

function extractQuoted(text) {
  const normalized = normalizePlatformQuotes(String(text));
  return [...normalized.matchAll(/[「"]([^」"]+)[」"]/g)].map((m) => m[1].trim()).filter(Boolean);
}

function normalizeEntityName(name) {
  return String(name)
    .replace(/[（(][^)）]*[)）]/g, "")
    .trim();
}

function splitIntroAndNumberedOptions(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map(stripLine)
    .filter(Boolean);
  const introLines = [];
  const numbered = [];
  let inNumbered = false;

  for (const line of lines) {
    const m = line.match(NUM_LINE_RE);
    if (m) {
      inNumbered = true;
      numbered.push(m[2].trim());
    } else if (!inNumbered) {
      introLines.push(line);
    }
  }

  return { intro: introLines.join("\n").trim(), numbered };
}

function stripNumberPrefix(line) {
  return stripLine(String(line).replace(/^\d+[.．、)）]\s*/, ""));
}

function isSectionHeaderLine(line) {
  return /^(客户名称|商品名称)[：:]?\s*$/.test(stripLine(line));
}

function extractNarrativeSectionOption(line) {
  const stripped = stripLine(line);
  const closest = stripped.match(/最接近的是[「"']([^」"']+)[」"']/);
  if (closest) return normalizeEntityName(closest[1]);
  const standard = stripped.match(/(?:匹配到(?:的)?标准商品名为|标准名称为)[：:，,\s]*[「"']([^」"']+)[」"']/);
  if (standard) return normalizeEntityName(standard[1]);
  return null;
}

function isNarrativeContextLine(line) {
  const s = stripLine(line);
  return /原始单据|知识库|标准商品|标准名称|命名存在差异|匹配到的|无完全匹配|存在差异|请选择|系统库|匹配项|单据中|请确认是否为|可直接确认|蓝本/.test(
    s,
  );
}

/** 分段复核中的叙述/问句行 → hint，勿当作可选项 */
function isSectionContextHintLine(line) {
  const s = stripLine(line);
  if (/^请确认是否为/.test(s)) return true;
  if (/系统库标准名如下/.test(s)) return true;
  if (/请确认|单据中|系统库|匹配项|可直接确认|蓝本/.test(s) && /[？?]/.test(s)) return true;
  if (isNarrativeContextLine(s) && !extractNarrativeSectionOption(s)) return true;
  return false;
}

function isQuestionOrPromptLine(line) {
  const s = stripLine(line);
  return /[？?]$/.test(s) || /是否应为|请选择哪一个|是否为其他|还是另有/.test(s);
}

function extractStandaloneEntityOption(line) {
  const stripped = stripLine(line);
  if (!stripped || isSectionHeaderLine(stripped)) return null;
  if (/^(请选择|请确认)[：:]?\s*$/.test(stripped)) return null;
  if (/^(客户名称|商品名称)[：:]\s*原始单据/.test(stripped)) return null;
  if (isQuestionOrPromptLine(stripped) || isNarrativeContextLine(stripped)) return null;

  if (/有限公司|股份有限公司/.test(stripped) && stripped.length <= 80) {
    return normalizeEntityName(stripped.replace(/[（(](?:客户|商品)编码[^）)]*[）)]/g, ""));
  }
  if (/聚丙烯|聚乙烯|聚氯乙烯|宁煤|1100N|2500HY|SKU/i.test(stripped) && stripped.length <= 80) {
    if (/请确认|单据|系统库|匹配项|蓝本|可直接确认/.test(stripped)) return null;
    if (stripped.length > 35 && /[，,。；;：:]/.test(stripped)) return null;
    return normalizeEntityName(stripped.replace(/[（(](?:客户|商品)编码[^）)]*[）)]/g, ""));
  }
  return null;
}

function normalizeReviewSectionHeaders(text) {
  return normalizePlatformQuotes(String(text || ""))
    .replace(/(?:^|\n)(【客户名称】)\s*/gm, "\n客户名称：")
    .replace(/(?:^|\n)(【商品名称】)\s*/gm, "\n商品名称：");
}

function findConfirmBlockStart(text) {
  const m = String(text).match(/(?:^|\n\n?)(?:请确认|请选择)[：:]?\s*(?:\n|$)/m);
  return m ? m.index : -1;
}

function parseConfirmQuestionOptions(text) {
  const t = normalizePlatformQuotes(String(text || ""));
  let customer = t.match(/客户名称是否应为\s*[「"']([^」"']+)[」"']/)?.[1]?.trim();
  let product = t.match(/商品名称是否应为\s*[「"']([^」"']+)[」"']/)?.[1]?.trim();
  const footer = t.match(/请回复[^\n]+/)?.[0]?.trim();
  const footerLines = [];

  for (const line of t.split(/\r?\n/).map(stripLine).filter(Boolean)) {
    if (/^(请选择|请确认)[：:]?\s*$/.test(line)) continue;
    if (isQuestionOrPromptLine(line)) {
      footerLines.push(line);
      if (/客户名称是否应为/.test(line)) {
        const q = extractQuoted(line);
        if (q.length) customer = customer || q[q.length - 1];
      }
      if (/商品名称是否应为/.test(line)) {
        const q = extractQuoted(line);
        if (q.length) product = product || q[q.length - 1];
      }
      continue;
    }
    const standalone = extractStandaloneEntityOption(line);
    if (standalone && /有限公司|股份有限公司/.test(standalone) && !customer) {
      customer = standalone;
    }
  }

  return {
    customer: customer ? normalizeEntityName(customer) : undefined,
    product: product ? normalizeEntityName(product) : undefined,
    footer: footer || footerLines.join("\n") || undefined,
  };
}

/** live 复核：客户名称：/商品名称： 叙述 + 请确认/请选择 + 是否应为 */
export function isReviewConfirmClarifyText(text) {
  const t = normalizeReviewSectionHeaders(String(text || ""));
  if (isShipmentMissingFormat(t)) return false;
  if (!/客户名称[：:]/m.test(t) || !/商品名称[：:]/m.test(t)) return false;
  return /(?:进行了复核|匹配歧义|需您确认)/.test(t);
}

function extractShipmentEntityOption(line) {
  const stripped = stripLine(line);
  if (!stripped || isSectionHeaderLine(stripped)) return null;
  if (/^(请您|请确认|请明确|请回复|请点击)/.test(stripped)) return null;
  if (/是否应为/.test(stripped) && !/有限公司|SKU|编码|聚丙烯|聚乙烯|宁煤/.test(stripped)) return null;
  // 叙述句（含问号或复核语境）不作为候选项，避免 hint 中含「1100N」被误判为商品
  if (/[？?]/.test(stripped) || /请确认|单据中|系统库|原始单据|知识库|匹配项/.test(stripped)) return null;

  if (/有限公司|股份有限公司/.test(stripped)) {
    return normalizeEntityName(stripped.replace(/[（(](?:客户|商品)编码[^）)]*[）)]/g, ""));
  }
  if (/SKU|商品编码|聚丙烯|聚乙烯|聚氯乙烯|宁煤|1100N|2500HY|均聚/i.test(stripped) && stripped.length <= 80) {
    return normalizeEntityName(stripped.replace(/[（(](?:客户|商品)编码[^）)]*[）)]/g, ""));
  }
  return null;
}

function parseShipmentSectionContent(rawText) {
  const lines = String(rawText).split(/\r?\n/).map(stripNumberPrefix).filter(Boolean);
  const hintParts = [];
  const options = [];
  const footerParts = [];

  for (const line of lines) {
    if (isSectionHeaderLine(line)) continue;
    if (/^(请您点击|请您确认)/.test(line)) {
      footerParts.push(line);
      continue;
    }
    if (isSectionContextHintLine(line)) {
      hintParts.push(line);
      continue;
    }
    const narrativeOpt = extractNarrativeSectionOption(line);
    if (narrativeOpt) {
      options.push(narrativeOpt);
      hintParts.push(line);
      continue;
    }
    const standalone = extractStandaloneEntityOption(line);
    if (standalone) {
      options.push(standalone);
      continue;
    }
    const entity = extractShipmentEntityOption(line);
    if (entity) {
      options.push(entity);
      continue;
    }
    hintParts.push(line);
  }

  return {
    hint: hintParts.join(" ").trim() || undefined,
    options,
    footer: footerParts.join("\n").trim() || undefined,
  };
}

/** live：客户名称：/商品名称： 分段 + 可选编号列表 */
function isShipmentSectionAmbiguityFormat(text) {
  return isReviewConfirmClarifyText(text);
}

function parseShipmentSectionAmbiguity(text) {
  const t = normalizeReviewSectionHeaders(String(text || "").trim());
  if (!isShipmentSectionAmbiguityFormat(t)) return null;

  const customerIdx = t.search(/(?:^|\n\n?)客户名称[：:]/m);
  if (customerIdx < 0) return null;

  const reviewIntroMatch = t.match(/(收到[\s\S]*?(?:进行了复核|需您确认[^：:\n]{0,20})[：:]?)/);
  const intro =
    reviewIntroMatch?.[1]?.trim().replace(/[：:]\s*$/, "") ||
    (customerIdx > 0 ? stripLine(t.slice(0, customerIdx)) : undefined);
  const confirmIdx = findConfirmBlockStart(t);
  const confirmEnd = confirmIdx >= 0 ? confirmIdx : t.length;

  const rest = t.slice(customerIdx);
  const productIdx = rest.search(/(?:^|\n\n?)商品名称[：:]/m);
  const productAbs = productIdx >= 0 ? customerIdx + productIdx : -1;

  const customerRaw =
    productAbs >= 0 ? t.slice(customerIdx, productAbs) : t.slice(customerIdx, confirmEnd);
  const productRaw =
    productAbs >= 0 ? t.slice(productAbs, confirmEnd) : "";
  const confirmRaw = confirmIdx >= 0 ? t.slice(confirmIdx) : "";

  const customer = parseShipmentSectionContent(customerRaw.replace(/^客户名称[：:]\s*/m, ""));
  const product = productRaw
    ? parseShipmentSectionContent(productRaw.replace(/^商品名称[：:]\s*/m, ""))
    : { hint: undefined, options: [], footer: undefined };

  const confirm = parseConfirmQuestionOptions(confirmRaw);
  if (confirm.customer) {
    customer.options = [confirm.customer, ...customer.options.filter((o) => o !== confirm.customer)];
  }
  if (confirm.product) {
    product.options = [confirm.product, ...product.options.filter((o) => o !== confirm.product)];
  }

  const blocks = [];
  let groupIndex = 0;

  if (customer.hint || customer.options.length) {
    blocks.push({
      type: "choice",
      label: "客户名称",
      hint: trimHintBeforeConfirm(customer.hint),
      options: uniqueChoiceOptions(customer.options, groupIndex++),
    });
  }
  if (product.hint || product.options.length) {
    blocks.push({
      type: "choice",
      label: "商品名称",
      hint: trimHintBeforeConfirm(product.hint),
      options: uniqueChoiceOptions(product.options, groupIndex++),
    });
  }

  if (!blocks.length) return null;
  const footer =
    confirm.footer ||
    [customer.footer, product.footer].filter(Boolean).join("\n") ||
    undefined;
  return { intro: intro || undefined, blocks, footer };
}

function trimHintBeforeConfirm(hint) {
  const h = String(hint || "");
  const idx = h.search(/(?:请您确认|请确认|请选择)[：:]/);
  return idx >= 0 ? h.slice(0, idx).trim() : h.trim();
}

function uniqueChoiceOptions(labels, groupIndex) {
  const seen = new Set();
  const options = [];
  for (const raw of labels) {
    const label = normalizeEntityName(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    options.push({
      id: `choice-${groupIndex}-opt-${options.length}`,
      label,
      message: label,
    });
  }
  return options;
}

function classifyClarifyOption(text) {
  const line = String(text).trim();
  if (/^商品名称[：:]?\s*$/.test(line)) return "skip";
  if (/^客户名称[：:]?\s*$/.test(line)) return "skip";
  if (/^(请您|请确认|请明确|请回复|请点击)/.test(line)) return "footer";
  if (/^客户名称/.test(line)) return "customer";
  if (/商品名称|标准名称|SKU|物料名称|产品名称/.test(line)) return "product";
  if (/客户名称|客户知识库|客户编码/.test(line) && !/商品名称|标准名称|SKU/.test(line)) return "customer";
  if (/有限公司|客户编码/.test(line) && !/商品|SKU|标准名称|物料/.test(line)) return "customer";
  return "other";
}

function candidateNamesFromLine(line, preferLastQuote = false) {
  const quotes = extractQuoted(line).map(normalizeEntityName).filter(Boolean);
  if (quotes.length >= 2) {
    return preferLastQuote ? [quotes[1], quotes[0]] : [quotes[0], quotes[1]];
  }
  return quotes;
}

function extractProductHint(intro) {
  const direct = intro.match(/商品名称是否应为[「"]([^」"]+)[」"]/);
  if (direct) return `商品名称是否应为「${direct[1]}」？请回复确认或提供正确全称。`;

  const afterReview = intro.match(/进行了复核[：:]\s*请您确认[：:]?\s*(.+)/);
  if (afterReview && /商品/.test(afterReview[1])) return afterReview[1].trim();

  return undefined;
}

/** 发货复核/确认：intro 内联提及【客户名称】和【商品名称】+ 下方 1.2.3. 列表 */
export function isShipmentClarifyFormat(text) {
  const t = String(text || "");
  if (isShipmentMissingFormat(t)) return false;
  if (/\*\*(?:客户|商品)(?:名称)?\*\*[：:]/m.test(t)) return false;

  const hasNumbered = /(?:^|\n)\s*\d+[.．、)）]\s+\S/m.test(t);
  if (/【(?:客户名称|商品名称|产品名称)】[和或与及]/.test(t) && hasNumbered) return true;
  if (/进行了复核/.test(t) && hasNumbered) return true;
  if (/原始单据/.test(t) && /知识库/.test(t) && hasNumbered) return true;
  return false;
}

/**
 * @returns {null | { intro?: string, blocks: object[] }}
 */
export function parseShipmentClarifySections(text) {
  if (!text) return null;

  const { intro, numbered } = splitIntroAndNumberedOptions(text);
  if (!numbered.length) return null;

  const customerLines = [];
  const productLines = [];
  const footerLines = [];
  for (const line of numbered) {
    const kind = classifyClarifyOption(line);
    if (kind === "skip") continue;
    if (kind === "footer") {
      footerLines.push(line);
      continue;
    }
    if (kind === "customer") customerLines.push(line);
    else if (kind === "product") productLines.push(line);
  }

  const blocks = [];
  let groupIndex = 0;

  if (customerLines.length) {
    const optionLabels = [];
    for (const line of customerLines) {
      const entity = extractShipmentEntityOption(line);
      if (entity) optionLabels.push(entity);
      else optionLabels.push(...candidateNamesFromLine(line, true));
    }
    blocks.push({
      type: "choice",
      label: "客户名称",
      hint: customerLines[0],
      options: uniqueChoiceOptions(optionLabels, groupIndex++),
    });
  }

  const productHint = extractProductHint(intro);
  const productOptionLabels = [];
  for (const line of productLines) {
    const entity = extractShipmentEntityOption(line);
    if (entity) productOptionLabels.push(entity);
    else productOptionLabels.push(...candidateNamesFromLine(line, true));
  }
  const introProduct = intro.match(/商品名称是否应为[「"]([^」"]+)[」"]/);
  if (introProduct) productOptionLabels.unshift(introProduct[1]);

  if (productHint || productOptionLabels.length) {
    blocks.push({
      type: "choice",
      label: "商品名称",
      hint: productHint,
      options: uniqueChoiceOptions(productOptionLabels, groupIndex++),
    });
  }

  if (!blocks.length) return null;
  const introText = intro.split(/\n客户名称[：:]/)[0]?.trim() || intro;
  const footer = footerLines.length ? footerLines.join("\n") : undefined;
  return { intro: introText || undefined, blocks, footer };
}

/** 是否发货场景缺失/提醒类文本（区别于销售订单确认选择） */
export function isShipmentMissingFormat(text) {
  const t = String(text || "");
  if (/【第\d+条明细】/.test(t)) return true;
  if (/发货单缺少/.test(t)) return true;
  if (/发货明细中【[^】]+】未填写【/.test(t)) return true;
  if (/发货明细中/.test(t) && /【[^】]+】/.test(t) && /(请补充|存在以下信息缺失|未填写)/.test(t)) {
    if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(t)) return false;
    if (/存在多个相似|不完全一致|请选择/.test(t)) return false;
    return true;
  }
  if (/发货明细中/.test(t) && /请补充/.test(t) && /【[^】]+】[，,]?\s*请补充/.test(t)) {
    if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(t)) return false;
    if (/存在多个相似|不完全一致|请选择/.test(t)) return false;
    return true;
  }
  return false;
}

/** 单行：发货明细中【宁煤2500HY】未填写【仓库属地】，请补充… */
function parseShipmentInlineMissing(text) {
  const m = String(text).match(/发货明细中【([^】]+)】未填写【([^】]+)】[，,]?\s*(.+)/);
  if (!m) return null;

  const product = m[1].trim();
  const field = m[2].trim();
  const action = m[3].trim().replace(/[。.；;,\s]*发货明细中[。.；;,\s]*$/g, "").trim();

  return {
    intro: undefined,
    blocks: [
      {
        type: "choice",
        label: field,
        hint: `发货明细【${product}】未填写【${field}】，${action}`,
        options: [],
      },
    ],
  };
}

/**
 * @returns {null | { intro?: string, blocks: object[] }}
 */
export function parseShipmentMissingSections(text) {
  if (!text || typeof text !== "string") return null;

  const inlineOnly = parseShipmentInlineMissing(text);
  if (inlineOnly && !/【第\d+条明细】/.test(text)) return inlineOnly;

  const firstIdx = text.indexOf("【");
  let intro = firstIdx > 0 ? stripLine(text.slice(0, firstIdx)) : undefined;
  if (!intro && /发货单缺少/.test(text)) intro = "发货单缺少";
  intro = normalizeShipmentIntro(intro);

  const blocks = [];
  const re = /【([^】]+)】([^【]*)/g;
  let match;

  while ((match = re.exec(text)) !== null) {
    let label = match[1].trim();
    if (/^第\d+条明细$/.test(label)) continue;

    let hint = cleanShipmentHint(match[2]);
    if (!hint || hint === "未填写") continue;

    // 商品名 + 「存在以下信息缺失」→ 标题改为「发货明细」，hint 保留商品上下文
    if (!SHIPMENT_FIELD_LABELS.test(label) && /存在以下信息缺失/.test(hint)) {
      hint = `【${label}】${hint}`;
      label = "发货明细";
    }

    blocks.push({
      type: "choice",
      label,
      hint,
      options: [],
      variant: "reminder",
    });
  }

  if (!blocks.length) return null;
  return { intro: intro || undefined, blocks };
}

/** 场景2 统一入口：缺失提醒 → 分段歧义 → 编号复核 → Mock ** / 【字段】 */
export function tryParseShipmentChoiceBlocks(text) {
  const t = String(text || "").trim();
  if (!t) return null;

  let parsed = null;
  if (isShipmentMissingFormat(t)) {
    parsed = parseShipmentMissingSections(t);
  } else if (isShipmentSectionAmbiguityFormat(t)) {
    parsed = parseShipmentSectionAmbiguity(t);
  } else if (/\*\*(?:客户|商品)(?:名称)?\*\*[：:]/m.test(t)) {
    parsed = parseLegacySections(t);
  } else if (isShipmentClarifyFormat(t)) {
    parsed = parseShipmentClarifySections(t);
  } else if (hasLineStartBracketFieldSections(t) && !isReviewConfirmClarifyText(t)) {
    parsed = parseBracketSections(t);
  }

  if (!parsed?.blocks?.length) return null;
  return applyShipmentYesNoMatchOptions(parsed);
}
