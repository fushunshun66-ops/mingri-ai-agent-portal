import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = path.join(__dirname, "..", "..", "config", "flowContent.json");

let cachedContent = null;

export function loadFlowContent() {
  if (!cachedContent) {
    cachedContent = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8"));
  }
  return cachedContent;
}

const FILE_HINTS = {
  contract_review: [/\.pdf$/i, /合同/, /contract/i],
  shipment: [/提货/, /发货/, /\.(png|jpe?g|webp)$/i],
};

const CONFIDENCE_THRESHOLD = 0.35;
const FLOW_PRIORITY = ["contract_review", "shipment", "sales_order"];

function scoreFlow(flowKey, rules, text, fileNames) {
  const keywords = rules.keywords || [];
  const negative = rules.negativeKeywords || [];
  const weight = rules.weight ?? 1;
  let score = 0;
  const matchedKeywords = [];

  for (const kw of keywords) {
    if (text.includes(kw)) {
      score += weight;
      matchedKeywords.push(kw);
    }
  }
  for (const neg of negative) {
    if (text.includes(neg)) score -= weight * 0.5;
  }

  // 强特征：车牌几乎只属于发货场景
  if (flowKey === "shipment" && /车牌|浙[A-Z0-9]|鲁[A-Z0-9]|沪[A-Z0-9]/.test(text)) {
    score += weight * 2;
    matchedKeywords.push("车牌特征");
  }

  const hints = FILE_HINTS[flowKey] || [];
  for (const name of fileNames) {
    for (const re of hints) {
      if (re.test(name)) {
        score += weight * 1.5;
        matchedKeywords.push(`file:${name}`);
        break;
      }
    }
  }

  return { score: Math.max(0, score), matchedKeywords };
}

/**
 * 本地规则意图识别
 * @returns {{ flowKey: string|null, confidence: number, reason: string, candidates: Array, scores: Record<string, number> }}
 */
export function detectIntent(content, files = []) {
  const flowContent = loadFlowContent();
  const text = String(content || "").trim();
  const fileNames = (files || []).map((f) => f.fileName || f.name || "").filter(Boolean);

  if (!text && !fileNames.length) {
    return { flowKey: null, confidence: 0, reason: "输入为空", candidates: [], scores: {} };
  }

  const scores = {};
  const details = {};

  for (const [flowKey, cfg] of Object.entries(flowContent)) {
    const { score, matchedKeywords } = scoreFlow(flowKey, cfg.intentRules || {}, text, fileNames);
    scores[flowKey] = score;
    details[flowKey] = matchedKeywords;
  }

  const maxScore = Math.max(...Object.values(scores), 0);
  if (maxScore === 0) {
    return {
      flowKey: null,
      confidence: 0,
      reason: "未匹配到明确意图，将使用当前所选能力",
      candidates: [],
      scores,
    };
  }

  const topKeys = Object.entries(scores)
    .filter(([, s]) => s === maxScore)
    .map(([k]) => k);

  let flowKey = topKeys[0];
  if (topKeys.length > 1) {
    flowKey = FLOW_PRIORITY.find((k) => topKeys.includes(k)) || topKeys[0];
  }

  const totalPossible = (flowContent[flowKey]?.intentRules?.keywords?.length || 1) * (flowContent[flowKey]?.intentRules?.weight || 1);
  const confidence = Math.min(1, maxScore / Math.max(3, totalPossible * 0.15));

  const candidates = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, score]) => ({
      flowKey: key,
      score,
      matchedKeywords: details[key] || [],
    }));

  const reason =
    confidence >= CONFIDENCE_THRESHOLD
      ? `匹配关键词：${(details[flowKey] || []).slice(0, 5).join("、")}`
      : "置信度较低，建议手动选择能力";

  return {
    flowKey: confidence >= CONFIDENCE_THRESHOLD ? flowKey : null,
    confidence: Number(confidence.toFixed(2)),
    reason,
    candidates,
    scores,
  };
}

export { CONFIDENCE_THRESHOLD };
