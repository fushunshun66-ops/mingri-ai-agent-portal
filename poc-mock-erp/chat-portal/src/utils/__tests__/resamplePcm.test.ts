import { describe, it, expect } from "vitest";
import {
  float32ToInt16,
  isApproxSampleRate,
  resampleFloat32ToInt16,
  toFunAsrPcm16,
} from "../resamplePcm";

describe("isApproxSampleRate", () => {
  it("16000 ±100 视为匹配", () => {
    expect(isApproxSampleRate(16000, 16000)).toBe(true);
    expect(isApproxSampleRate(15950, 16000)).toBe(true);
    expect(isApproxSampleRate(16099, 16000)).toBe(true);
  });

  it("48000 相对 16000 不匹配", () => {
    expect(isApproxSampleRate(48000, 16000)).toBe(false);
    expect(isApproxSampleRate(44100, 16000)).toBe(false);
  });

  it("超出默认容差（±100）不匹配", () => {
    expect(isApproxSampleRate(16101, 16000)).toBe(false);
    expect(isApproxSampleRate(15899, 16000)).toBe(false);
  });
});

describe("float32ToInt16", () => {
  it("空输入返回空 Int16Array", () => {
    expect(float32ToInt16(new Float32Array(0))).toEqual(new Int16Array(0));
  });

  it("将 [-1,1] float 映射为 Int16 并 clamp", () => {
    const out = float32ToInt16(new Float32Array([0, 1, -1, 0.5, 2, -2]));
    expect(out).toBeInstanceOf(Int16Array);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(32767);
    // -1 * 32767 → -32767（对称满幅用 32767 标度）
    expect(out[2]).toBe(-32767);
    expect(out[3]).toBe(Math.trunc(0.5 * 32767));
    expect(out[4]).toBe(32767);
    expect(out[5]).toBe(-32768);
  });
});

describe("resampleFloat32ToInt16", () => {
  it("同源采样率：长度不变，等价于 float32ToInt16", () => {
    const input = new Float32Array([0.25, -0.25, 0.5, -0.5]);
    const out = resampleFloat32ToInt16(input, 16000, 16000);
    expect(out.length).toBe(input.length);
    expect(Array.from(out)).toEqual(Array.from(float32ToInt16(input)));
  });

  it("48k→16k：输出长度约为输入的 1/3", () => {
    // 48000/16000 = 3 → 300 样本 → 100 样本
    const input = new Float32Array(300);
    for (let i = 0; i < input.length; i++) input[i] = Math.sin(i / 10);
    const out = resampleFloat32ToInt16(input, 48000, 16000);
    expect(out.length).toBe(100);
  });

  it("线性下采样保留大致波形峰值方向", () => {
    // 构造慢变正弦，时长覆盖至少一个完整周期，避免只采到正半周
    const fromRate = 48000;
    const toRate = 16000;
    const durationSec = 0.04; // 40ms → 50Hz 两个周期
    const n = Math.round(fromRate * durationSec);
    const input = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // 慢变：约 50Hz 正弦，远低于 Nyquist
      input[i] = Math.sin((2 * Math.PI * 50 * i) / fromRate);
    }
    const out = resampleFloat32ToInt16(input, fromRate, toRate);
    expect(out.length).toBe(Math.floor(n / (fromRate / toRate)));

    // 输出应有正负摆动，且幅度接近满量程附近某一帧
    const hasPos = Array.from(out).some((v) => v > 1000);
    const hasNeg = Array.from(out).some((v) => v < -1000);
    expect(hasPos).toBe(true);
    expect(hasNeg).toBe(true);

    const maxAbs = Math.max(...Array.from(out).map(Math.abs));
    expect(maxAbs).toBeGreaterThan(20000);
  });

  it("空输入返回空", () => {
    expect(resampleFloat32ToInt16(new Float32Array(0), 48000, 16000).length).toBe(0);
  });

  it("非法采样率时退化为原样量化（不抛）", () => {
    const input = new Float32Array([0.1, -0.1]);
    expect(resampleFloat32ToInt16(input, 0, 16000).length).toBe(2);
    expect(resampleFloat32ToInt16(input, 48000, 0).length).toBe(2);
  });
});

describe("toFunAsrPcm16", () => {
  it("~16k 直接量化，长度不变", () => {
    const input = new Float32Array([0.2, -0.2, 0.1]);
    expect(toFunAsrPcm16(input, 16000).length).toBe(3);
    expect(toFunAsrPcm16(input, 15950).length).toBe(3);
  });

  it("48k 重采样到 16k（约 1/3 长度）", () => {
    const input = new Float32Array(300).fill(0.3);
    expect(toFunAsrPcm16(input, 48000).length).toBe(100);
  });
});
