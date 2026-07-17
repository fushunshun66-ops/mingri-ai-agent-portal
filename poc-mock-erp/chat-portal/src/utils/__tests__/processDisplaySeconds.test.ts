import { describe, it, expect } from "vitest";
import { PROCESS_DISPLAY_LAG_MS, toProcessDisplaySeconds } from "../processDisplaySeconds";

describe("toProcessDisplaySeconds", () => {
  it("exports lag constant as 1000ms", () => {
    expect(PROCESS_DISPLAY_LAG_MS).toBe(1000);
  });

  it("returns 0 for elapsed 0 (live tick, min=0)", () => {
    expect(toProcessDisplaySeconds(0)).toBe(0);
  });

  it("returns 0 for elapsed 999 (still within lag window)", () => {
    expect(toProcessDisplaySeconds(999)).toBe(0);
  });

  it("returns 0 at exactly 1000ms elapsed (lag fully consumed, round(0))", () => {
    expect(toProcessDisplaySeconds(1000)).toBe(0);
  });

  it("returns 1 at 1500ms elapsed (round(0.5)=1)", () => {
    expect(toProcessDisplaySeconds(1500)).toBe(1);
  });

  it("returns 3 for elapsed 4000 (real ~4s shows ~3s)", () => {
    expect(toProcessDisplaySeconds(4000)).toBe(3);
  });

  it("returns 4 for elapsed 4500 (round(3.5)=4)", () => {
    expect(toProcessDisplaySeconds(4500)).toBe(4);
  });

  describe("minSeconds=1 (final duration)", () => {
    it("clamps elapsed 0 to 1", () => {
      expect(toProcessDisplaySeconds(0, 1)).toBe(1);
    });

    it("clamps elapsed 500 to 1", () => {
      expect(toProcessDisplaySeconds(500, 1)).toBe(1);
    });

    it("returns 3 for elapsed 4000 with min 1", () => {
      expect(toProcessDisplaySeconds(4000, 1)).toBe(3);
    });
  });
});
