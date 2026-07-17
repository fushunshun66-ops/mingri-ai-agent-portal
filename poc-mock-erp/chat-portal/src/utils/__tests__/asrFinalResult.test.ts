import { describe, it, expect } from "vitest";
import { isAsrFinalResult } from "../asrFinalResult";

describe("isAsrFinalResult", () => {
  it("returns true when is_final is true", () => {
    expect(isAsrFinalResult({ is_final: true, text: "hello" })).toBe(true);
  });

  it("returns true for offline / 2pass-offline even if is_final is false", () => {
    expect(isAsrFinalResult({ is_final: false, mode: "offline", text: "精修" })).toBe(true);
    expect(isAsrFinalResult({ mode: "2pass-offline", text: "精修" })).toBe(true);
  });

  it("returns false for online / 2pass-online partials", () => {
    expect(isAsrFinalResult({ is_final: false, mode: "online", text: "中" })).toBe(false);
    expect(isAsrFinalResult({ mode: "2pass-online", text: "中" })).toBe(false);
  });

  it("returns false when neither is_final nor offline mode", () => {
    expect(isAsrFinalResult({ text: "中" })).toBe(false);
    expect(isAsrFinalResult({ is_final: false, text: "中" })).toBe(false);
  });
});
