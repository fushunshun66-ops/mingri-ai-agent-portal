import { describe, it, expect } from "vitest";
import { tryParseInfoMissing } from "../infoMissing";

const DEFAULT_HINT = "请在下方输入框补充上述信息后发送。";

describe("tryParseInfoMissing", () => {
  it("parses single book-title field", () => {
    const raw = "[信息缺失] 该指令缺少关键要素「客户姓名」。";
    const result = tryParseInfoMissing(raw);
    expect(result).toEqual({
      title: "信息缺失",
      fields: ["客户姓名"],
      hint: DEFAULT_HINT,
      raw,
    });
  });

  it("parses multiple book-title fields", () => {
    const raw = "[信息缺失] 该指令缺少关键要素「物料名称」「物料数量」「物料单价」。";
    const result = tryParseInfoMissing(raw);
    expect(result).toEqual({
      title: "信息缺失",
      fields: ["物料名称", "物料数量", "物料单价"],
      hint: DEFAULT_HINT,
      raw,
    });
  });

  it("parses 请输入… list with 、 and 及 separators", () => {
    const raw = "[信息缺失]请输入客户名称、物料名称、物料数量及单价";
    const result = tryParseInfoMissing(raw);
    expect(result).toEqual({
      title: "信息缺失",
      fields: ["客户名称", "物料名称", "物料数量", "单价"],
      hint: "请输入客户名称、物料名称、物料数量及单价",
      raw,
    });
  });

  it("parses single material name field", () => {
    const raw = "[信息缺失] 该指令缺少关键要素「物料名称」。";
    const result = tryParseInfoMissing(raw);
    expect(result).toEqual({
      title: "信息缺失",
      fields: ["物料名称"],
      hint: DEFAULT_HINT,
      raw,
    });
  });

  it("returns null for ordinary markdown without tag", () => {
    expect(tryParseInfoMissing("这是普通说明文字")).toBeNull();
  });

  it("returns null when tag is not at the start", () => {
    expect(tryParseInfoMissing("提示：[信息缺失] 该指令缺少关键要素「客户姓名」。")).toBeNull();
  });

  it("trims leading whitespace before matching tag", () => {
    const raw = "  [信息缺失] 该指令缺少关键要素「客户姓名」。";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户姓名"]);
    expect(result!.raw).toBe(raw.trim());
  });

  it("uses body as hint when tag present but no fields", () => {
    const raw = "[信息缺失] 请补充完整后再试。";
    const result = tryParseInfoMissing(raw);
    expect(result).toEqual({
      title: "信息缺失",
      fields: [],
      hint: "请补充完整后再试。",
      raw,
    });
  });

  it("splits 请输入… also by 和", () => {
    const raw = "[信息缺失]请输入客户名称和物料名称";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户名称", "物料名称"]);
  });

  it("parses ASCII double-quoted fields", () => {
    const raw = '[信息缺失] 该指令缺少关键要素"客户姓名"。';
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户姓名"]);
    expect(result!.hint).toBe(DEFAULT_HINT);
  });

  it("parses curly quotation marks after normalize", () => {
    const raw = "[信息缺失] 该指令缺少关键要素\u201c物料名称\u201d\u201c物料数量\u201d。";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["物料名称", "物料数量"]);
  });

  it("dedupes repeated quoted field names", () => {
    const raw = "[信息缺失] 缺少关键要素「客户姓名」「客户姓名」「物料名称」。";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户姓名", "物料名称"]);
  });

  it("strips trailing punctuation from 请输入 fields", () => {
    const raw = "[信息缺失]请输入客户名称、物料名称。";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户名称", "物料名称"]);
  });

  it("does not split 以及 as 及", () => {
    const raw = "[信息缺失]请输入客户名称以及物料名称";
    const result = tryParseInfoMissing(raw);
    expect(result).not.toBeNull();
    expect(result!.fields).toEqual(["客户名称", "物料名称"]);
  });
});
