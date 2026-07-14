import { describe, it, expect } from "vitest";
import { AUDIO_LEVEL_GAIN, computeRmsLevel } from "../audioLevel";

describe("computeRmsLevel", () => {
  it("空采样返回 0", () => {
    expect(computeRmsLevel([])).toBe(0);
    expect(computeRmsLevel(new Float32Array(0))).toBe(0);
  });

  it("全零采样返回 0", () => {
    expect(computeRmsLevel([0, 0, 0, 0])).toBe(0);
  });

  it("RMS = sqrt(mean(x^2))，再乘 gain 并 clamp 到 [0,1]", () => {
    // samples: 0.5, -0.5 → mean sq = 0.25 → rms = 0.5
    const samples = [0.5, -0.5];
    const gain = 1;
    expect(computeRmsLevel(samples, gain)).toBeCloseTo(0.5, 5);
  });

  it("默认 gain 放大后仍不超过 1", () => {
    // rms ≈ 1 → * AUDIO_LEVEL_GAIN ≫ 1 → clamp 1
    expect(computeRmsLevel([1, -1, 1, -1])).toBe(1);
    expect(AUDIO_LEVEL_GAIN).toBeGreaterThanOrEqual(4);
    expect(AUDIO_LEVEL_GAIN).toBeLessThanOrEqual(8);
  });

  it("静音附近小幅采样经 gain 后仍可视但不越界", () => {
    // rms = 0.1 → * 6 = 0.6
    const level = computeRmsLevel(new Float32Array([0.1, -0.1, 0.1, -0.1]), 6);
    expect(level).toBeCloseTo(0.6, 5);
  });

  it("负 gain 也会被 clamp 到 ≥0", () => {
    expect(computeRmsLevel([0.5], -10)).toBe(0);
  });

  it("含 NaN 的采样最终返回有限数 0，不向外泄漏 NaN", () => {
    expect(computeRmsLevel([NaN, NaN])).toBe(0);
    expect(Number.isFinite(computeRmsLevel([NaN, 0.5]))).toBe(true);
    expect(computeRmsLevel([NaN, 0.5])).toBe(0);
  });

  it("Infinity 经 clamp 后为 1；-Infinity / NaN gain 不向外泄漏非有限值", () => {
    expect(computeRmsLevel([1], Infinity)).toBe(1);
    expect(computeRmsLevel([1], -Infinity)).toBe(0);
    expect(computeRmsLevel([0.5], NaN)).toBe(0);
  });
});
