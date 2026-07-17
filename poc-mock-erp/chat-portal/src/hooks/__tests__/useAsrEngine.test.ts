import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsrEngine } from "../useAsrEngine";

describe("useAsrEngine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("默认引擎为 funasr", () => {
    const { result } = renderHook(() => useAsrEngine());
    expect(result.current.engine).toBe("funasr");
  });

  it("切换到 qwen 后 engine 更新", () => {
    const { result } = renderHook(() => useAsrEngine());
    act(() => {
      result.current.setEngine("qwen");
    });
    expect(result.current.engine).toBe("qwen");
  });

  it("切换后持久化到 localStorage", () => {
    const { result } = renderHook(() => useAsrEngine());
    act(() => {
      result.current.setEngine("qwen");
    });
    expect(localStorage.getItem("asrEngine")).toBe("qwen");
  });

  it("localStorage 已有值时读取", () => {
    localStorage.setItem("asrEngine", "qwen");
    const { result } = renderHook(() => useAsrEngine());
    expect(result.current.engine).toBe("qwen");
  });

  it("localStorage 非法值回退 funasr", () => {
    localStorage.setItem("asrEngine", "invalid");
    const { result } = renderHook(() => useAsrEngine());
    expect(result.current.engine).toBe("funasr");
  });

  it("可切回 funasr", () => {
    const { result } = renderHook(() => useAsrEngine());
    act(() => {
      result.current.setEngine("qwen");
    });
    act(() => {
      result.current.setEngine("funasr");
    });
    expect(result.current.engine).toBe("funasr");
    expect(localStorage.getItem("asrEngine")).toBe("funasr");
  });
});
