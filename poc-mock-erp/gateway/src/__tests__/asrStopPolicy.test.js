import { describe, it, expect } from "vitest";
import { shouldFinishAfterStop } from "../asrStopPolicy.js";

describe("shouldFinishAfterStop", () => {
  it("returns true for offline mode with non-empty text", () => {
    expect(shouldFinishAfterStop({ text: "销售订单", mode: "offline" })).toBe(true);
  });

  it("returns true for 2pass-offline mode with non-empty text", () => {
    expect(shouldFinishAfterStop({ text: "销售订单", mode: "2pass-offline" })).toBe(true);
  });

  it("returns true for offline even when is_final is false", () => {
    expect(
      shouldFinishAfterStop({ text: "精修结果", mode: "offline", is_final: false }),
    ).toBe(true);
  });

  it("returns false for online / 2pass-online intermediate results", () => {
    expect(shouldFinishAfterStop({ text: "销售", mode: "online" })).toBe(false);
    expect(shouldFinishAfterStop({ text: "销售订", mode: "2pass-online" })).toBe(false);
  });

  it("returns false when text is empty even if offline", () => {
    expect(shouldFinishAfterStop({ text: "", mode: "offline" })).toBe(false);
    expect(shouldFinishAfterStop({ text: "   ", mode: "2pass-offline" })).toBe(false);
    expect(shouldFinishAfterStop({ mode: "offline" })).toBe(false);
  });

  it("returns false when mode is missing (do not finish on arbitrary text)", () => {
    expect(shouldFinishAfterStop({ text: "中间结果", is_final: true })).toBe(false);
  });
});
