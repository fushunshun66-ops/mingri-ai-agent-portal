import { describe, it, expect } from "vitest";
import { parseAsrEngine } from "../asr/parseAsrEngine.js";

describe("parseAsrEngine", () => {
  it("有 engine=qwen 时返回 'qwen'", () => {
    expect(parseAsrEngine("/api/asr/stream?engine=qwen")).toBe("qwen");
  });

  it("有 engine=funasr 时返回 'funasr'", () => {
    expect(parseAsrEngine("/api/asr/stream?engine=funasr")).toBe("funasr");
  });

  it("没有 engine 参数时返回 null", () => {
    expect(parseAsrEngine("/api/asr/stream")).toBeNull();
    expect(parseAsrEngine("/api/asr/stream?foo=bar")).toBeNull();
  });

  it("engine 值为空字符串时返回 null", () => {
    expect(parseAsrEngine("/api/asr/stream?engine=")).toBeNull();
  });

  it("url 为 null / undefined / 空字符串时返回 null", () => {
    expect(parseAsrEngine(null)).toBeNull();
    expect(parseAsrEngine(undefined)).toBeNull();
    expect(parseAsrEngine("")).toBeNull();
  });

  it("engine 大小写敏感（保留原值）", () => {
    expect(parseAsrEngine("/api/asr/stream?engine=Qwen")).toBe("Qwen");
  });
});
