/**
 * TDD: ChoiceConfirmCard 点击选项后应携带 sendImmediately: true
 * 写在实现之前——第一个断言当前会 FAIL（ChoiceConfirmCard onClick 未传 sendImmediately）
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceConfirmCard } from "../ChoiceConfirmCard";
import type { ChoiceSelectContext } from "../ChoiceConfirmCard";

const OPTS = [
  { id: "a", label: "选项A", message: "选项A" },
  { id: "b", label: "选项B", message: "选项B" },
];

describe("ChoiceConfirmCard — 点击选项直发行为", () => {
  it("onClick 上下文应包含 sendImmediately: true", () => {
    const onSelect = vi.fn<[string, ChoiceSelectContext], void>();
    render(
      <ChoiceConfirmCard
        slotKey="slot-test"
        label="请选择"
        options={OPTS}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("选项A").closest("button")!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [, ctx] = onSelect.mock.calls[0]!;
    expect(ctx.sendImmediately).toBe(true);
  });

  it("onClick 消息内容为 opt.message", () => {
    const onSelect = vi.fn<[string, ChoiceSelectContext], void>();
    render(
      <ChoiceConfirmCard
        slotKey="slot-test"
        label="请选择"
        options={OPTS}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("选项B").closest("button")!);

    const [msg] = onSelect.mock.calls[0]!;
    expect(msg).toBe("选项B");
  });

  it("disabled 时点击不触发 onSelect", () => {
    const onSelect = vi.fn();
    render(
      <ChoiceConfirmCard
        slotKey="slot-test"
        label="请选择"
        options={OPTS}
        onSelect={onSelect}
        disabled
      />,
    );

    const btn = screen.getByText("选项A").closest("button")!;
    fireEvent.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
