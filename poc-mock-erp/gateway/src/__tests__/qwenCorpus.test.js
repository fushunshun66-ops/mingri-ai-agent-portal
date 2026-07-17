import { describe, it, expect } from "vitest";
import { hotwordsToCorpusText } from "../asr/qwenCorpus.js";

describe("hotwordsToCorpusText", () => {
  it("按权重降序拼接词条，空格分隔", () => {
    const dict = { 销售订单: 25, 陶氏高压310E: 50, 杭州首明: 40 };
    const result = hotwordsToCorpusText(dict);
    // 50 → 陶氏高压310E, 40 → 杭州首明, 25 → 销售订单
    expect(result).toBe("陶氏高压310E 杭州首明 销售订单");
  });

  it("空 dict 返回空字符串", () => {
    expect(hotwordsToCorpusText({})).toBe("");
  });

  it("null / undefined 返回空字符串", () => {
    expect(hotwordsToCorpusText(null)).toBe("");
    expect(hotwordsToCorpusText(undefined)).toBe("");
  });

  it("单条词条直接返回该词", () => {
    expect(hotwordsToCorpusText({ 聚丙烯: 30 })).toBe("聚丙烯");
  });

  it("相同权重时保持稳定（不崩溃，结果包含全部词条）", () => {
    const dict = { A: 10, B: 10, C: 10 };
    const result = hotwordsToCorpusText(dict);
    expect(result.split(" ").sort()).toEqual(["A", "B", "C"]);
  });

  it("权重为 0 或负数时仍正常排序", () => {
    const dict = { 零权重: 0, 负权重: -5, 正常: 20 };
    const result = hotwordsToCorpusText(dict);
    const words = result.split(" ");
    expect(words[0]).toBe("正常");
    expect(words).toContain("零权重");
    expect(words).toContain("负权重");
  });
});
