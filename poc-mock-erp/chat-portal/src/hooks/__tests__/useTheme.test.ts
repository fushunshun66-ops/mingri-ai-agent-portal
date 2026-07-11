import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTheme } from "../useTheme";

// ============================================================
// 辅助：重置 DOM 和 localStorage
// ============================================================

function resetDom() {
  document.documentElement.classList.remove("dark");
}

function resetStorage() {
  localStorage.clear();
}

// ============================================================
// useTheme 测试套件
// ============================================================

describe("useTheme", () => {
  beforeEach(() => {
    resetDom();
    resetStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDom();
    resetStorage();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("无 localStorage 时跟随系统偏好（亮色默认）", () => {
      // jsdom 默认 matchMedia("(prefers-color-scheme: dark)").matches === false
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");
    });

    it("localStorage 有 dark 时初始化为 dark", () => {
      localStorage.setItem("theme", "dark");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
    });

    it("localStorage 有 light 时初始化为 light", () => {
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");
    });

    it("localStorage 有非法值时降级为 light", () => {
      localStorage.setItem("theme", "invalid");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");
    });
  });

  // ----------------------------------------------------------
  // .dark class 同步
  // ----------------------------------------------------------

  describe("DOM class 同步", () => {
    it("theme === dark 时 <html> 有 .dark class", () => {
      localStorage.setItem("theme", "dark");
      renderHook(() => useTheme());
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("theme === light 时 <html> 无 .dark class", () => {
      localStorage.setItem("theme", "light");
      renderHook(() => useTheme());
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // toggle 切换
  // ----------------------------------------------------------

  describe("toggle", () => {
    it("light → dark", () => {
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("dark → light", () => {
      localStorage.setItem("theme", "dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("toggle 后持久化到 localStorage", () => {
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem("theme")).toBe("dark");

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem("theme")).toBe("light");
    });
  });

  // ----------------------------------------------------------
  // 系统偏好变化监听
  // ----------------------------------------------------------

  describe("系统偏好变化", () => {
    it("无 localStorage 时跟随系统偏好切换", async () => {
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

      const { result, unmount } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");

      // 模拟系统切换到暗色
      mockMql.matches = true;
      act(() => {
        listeners.forEach((fn) =>
          fn({ matches: true } as MediaQueryListEvent),
        );
      });

      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
      });
      expect(localStorage.getItem("theme")).toBeNull(); // 没有手动设置过，不应写入

      unmount();
    });

    it("有 localStorage 存储时忽略系统偏好变化", async () => {
      localStorage.setItem("theme", "dark");

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

      const { result, unmount } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");

      // 模拟系统切换到亮色 — 应被忽略
      mockMql.matches = false;
      act(() => {
        listeners.forEach((fn) =>
          fn({ matches: false } as MediaQueryListEvent),
        );
      });

      // 状态不变（localStorage 优先）
      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
      });

      unmount();
    });
  });

  // ----------------------------------------------------------
  // 边界情况
  // ----------------------------------------------------------

  describe("边界情况", () => {
    it("localStorage.setItem 抛出异常时降级（无痕模式模拟）", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const { result } = renderHook(() => useTheme());

      // 不应崩溃
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggle();
      });

      // toggle 仍然生效（state 更新），只是持久化失败
      expect(result.current.theme).toBe("dark");

      localStorage.setItem = originalSetItem;
    });
  });
});
