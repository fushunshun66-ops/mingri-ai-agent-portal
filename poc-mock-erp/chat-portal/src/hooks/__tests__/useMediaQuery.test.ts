import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "../useMediaQuery";

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初始匹配状态", () => {
    it("matchMedia.matches === true 时返回 true", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
      expect(result.current).toBe(true);
    });

    it("matchMedia.matches === false 时返回 false", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
      expect(result.current).toBe(false);
    });
  });

  describe("变化事件响应", () => {
    it("media 状态变化时更新 matches", () => {
      const listeners = new Set<(e: MediaQueryListEvent) => void>();
      const mockMql = {
        matches: false,
        addEventListener: vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
          listeners.add(fn);
        }),
        removeEventListener: vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
          listeners.delete(fn);
        }),
      };

      vi.spyOn(window, "matchMedia").mockReturnValue(mockMql as unknown as MediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
      expect(result.current).toBe(false);

      act(() => {
        listeners.forEach((fn) => fn({ matches: true } as MediaQueryListEvent));
      });

      expect(result.current).toBe(true);
    });
  });

  describe("清理 listener", () => {
    it("unmount 时移除事件监听", () => {
      const removeSpy = vi.fn();
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeSpy,
      } as unknown as MediaQueryList);

      const { unmount } = renderHook(() => useMediaQuery("(max-width: 768px)"));
      unmount();

      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));
    });
  });

  describe("query 变化时重新绑定", () => {
    it("query 改变时用新 query 重新注册 listener", () => {
      const addSpy = vi.fn();
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        addEventListener: addSpy,
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList);

      const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(max-width: 768px)" },
      });

      expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 768px)");

      rerender({ query: "(max-width: 1024px)" });

      expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 1024px)");
    });
  });

  describe("addEventListener 调用验证", () => {
    it("注册的是 change 事件", () => {
      const addSpy = vi.fn();
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        addEventListener: addSpy,
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList);

      renderHook(() => useMediaQuery("(max-width: 768px)"));

      expect(addSpy).toHaveBeenCalledWith("change", expect.any(Function));
    });
  });
});
