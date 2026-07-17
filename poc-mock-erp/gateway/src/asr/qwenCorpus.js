/**
 * 将热词权重字典转换为 Qwen3-ASR corpus.text 字符串。
 * 按权重降序排列，空格分隔，最长约 10000 tokens。
 * @param {Record<string, number> | null | undefined} dict
 * @returns {string}
 */
export function hotwordsToCorpusText(dict) {
  if (!dict || typeof dict !== "object" || Array.isArray(dict)) return "";
  const entries = Object.entries(dict);
  if (entries.length === 0) return "";
  // 按权重降序排列
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([word]) => word).join(" ");
}
