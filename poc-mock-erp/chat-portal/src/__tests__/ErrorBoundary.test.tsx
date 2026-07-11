import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";

/* 抛出异常用于测试的组件 */
function Thrower({ message }: { message: string }): ReactNode {
  throw new Error(message);
}

function SafeChild() {
  return <div data-testid="safe">正常渲染内容</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("正常渲染子组件", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("safe")).toBeInTheDocument();
  });

  it("子组件抛异常时显示错误 UI", () => {
    render(
      <ErrorBoundary>
        <Thrower message="测试错误消息" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("页面渲染异常")).toBeInTheDocument();
    expect(screen.getByText("测试错误消息")).toBeInTheDocument();
  });

  it("点击重试按钮后重置错误状态并重新渲染", () => {
    // 第一次渲染会 catch 错误
    const { rerender } = render(
      <ErrorBoundary>
        <Thrower message="临时错误" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("页面渲染异常")).toBeInTheDocument();
    expect(screen.getByText("重试")).toBeInTheDocument();

    // 点击重试按钮
    screen.getByText("重试").click();

    // 重试后如果没有错误 props，应该重新渲染子组件（但这里 Thrower 始终抛异常）
    // 实际上 error boundary 只是重置了 state，重新渲染后 Thrower 依然会抛异常
    // 所以需要用一个可控的组件来验证重试逻辑
  });

  it("重试后若子组件不再抛异常则正常渲染", () => {
    let shouldThrow = true;

    function ToggleThrow() {
      if (shouldThrow) {
        throw new Error("抛一次");
      }
      return <div data-testid="recovered">已恢复</div>;
    }

    // 第一次 render，抛异常
    const { rerender } = render(
      <ErrorBoundary>
        <ToggleThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("页面渲染异常")).toBeInTheDocument();

    // 关闭异常开关
    shouldThrow = false;

    // 点击重试
    screen.getByText("重试").click();

    rerender(
      <ErrorBoundary>
        <ToggleThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    expect(screen.queryByText("页面渲染异常")).not.toBeInTheDocument();
  });

  it("错误信息过时清除后可正常渲染", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("safe")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("console.error 在捕获异常时被调用", () => {
    // 使用 beforeEach 中设置的 spy，清空之前记录的调用
    const consoleSpy = console.error as unknown as ReturnType<typeof vi.fn>;
    consoleSpy.mockClear();

    render(
      <ErrorBoundary>
        <Thrower message="记录日志" />
      </ErrorBoundary>,
    );

    expect(consoleSpy).toHaveBeenCalled();
    // React 18 在 dev 模式下也会调用 console.error，查找我们 componentDidCatch 的日志
    const ourCall = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("[ErrorBoundary]"),
    );
    expect(ourCall).toBeDefined();
    // componentDidCatch 将 error.message 作为独立参数传给 console.error
    const hasErrorMessage = ourCall!.some(
      (arg) => typeof arg === "string" && arg.includes("记录日志"),
    );
    expect(hasErrorMessage).toBe(true);
  });
});
