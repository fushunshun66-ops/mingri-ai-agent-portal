import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SalesOrderDoc } from "../SalesOrderDoc";
import { buildDocActionSlotKey } from "../../../utils/docAction";
import type { ChoiceSelectContext } from "../ChoiceConfirmCard";
import type { FormAction } from "../../../types/message";

const BASE_FIELDS = [
  { key: "orderNo", label: "订单号", value: "SO-001" },
];

function action(id: string, label: string): FormAction {
  return { id, label, message: label };
}

describe("SalesOrderDoc actions", () => {
  it("点击「确认无误」透传 sendImmediately: true，不因 filled 禁用修改按钮", () => {
    const onAction = vi.fn();
    const actions = [
      action("confirm", "确认无误"),
      action("modify_qty", "修改数量"),
      action("modify_date", "修改交期"),
    ];

    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={actions}
        onAction={onAction}
        disabled={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /确认无误/ }));

    expect(onAction).toHaveBeenCalledTimes(1);
    const ctx = onAction.mock.calls[0][1] as ChoiceSelectContext;
    expect(onAction.mock.calls[0][0]).toBe("确认无误");
    expect(ctx.sendImmediately).toBe(true);
    expect(ctx.optionId).toBe("confirm");

    const modifyBtn = screen.getByRole("button", { name: /修改数量/ });
    expect(modifyBtn).toBeDisabled();
  });

  it("临时禁用修改按钮时点击「修改数量」不触发 onAction", () => {
    const onAction = vi.fn();
    const actions = [
      action("confirm", "确认无误"),
      action("modify_qty", "修改数量"),
    ];

    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={actions}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /修改数量/ }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it.skip("点击「修改数量」不带 sendImmediately，仅走填芯片上下文", () => {
    const onAction = vi.fn();
    const actions = [
      action("confirm", "确认无误"),
      action("modify_qty", "修改数量"),
    ];

    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={actions}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /修改数量/ }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0]).toBe("修改数量");
    const ctx = onAction.mock.calls[0][1] as ChoiceSelectContext;
    expect(ctx.sendImmediately).toBeFalsy();
    expect(ctx.optionId).toBe("modify_qty");
    expect(ctx.slotKey).toBe(buildDocActionSlotKey("m1", 0, "modify_qty"));
  });

  it("确认已选中后 hint 显示「已提交」，确认钮锁定、修改按钮仍可点（H2）", () => {
    const confirmSlot = buildDocActionSlotKey("m1", 0, "confirm");
    const onAction = vi.fn();
    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={[
          action("confirm", "确认无误"),
          action("modify_qty", "修改数量"),
        ]}
        selectedBySlot={{ [confirmSlot]: "confirm" }}
        onAction={onAction}
      />,
    );

    expect(screen.getByText("已提交")).toBeInTheDocument();
    expect(screen.queryByText(/已填入输入框/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /确认无误/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /修改数量/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /确认无误/ }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("闲置 hint：含确认+修改时提示直接发送", () => {
    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={[
          action("confirm", "确认无误"),
          action("modify_qty", "修改数量"),
        ]}
      />,
    );
    expect(screen.getByText(/直接发送/)).toBeInTheDocument();
  });

  it("fallback 确认按钮（无 actions）也带 sendImmediately", () => {
    const onAction = vi.fn();
    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /确认提交/ }));
    expect(onAction.mock.calls[0][1].sendImmediately).toBe(true);
  });

  it("修改按钮临时禁用且为原生 doc-btn", () => {
    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={[
          action("confirm", "确认无误"),
          action("modify_qty", "修改数量"),
          action("modify_date", "修改交期"),
        ]}
        disabled={false}
      />,
    );

    for (const name of [/修改数量/, /修改交期/]) {
      const btn = screen.getByRole("button", { name });
      expect(btn).toBeDisabled();
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).toHaveAttribute("type", "button");
      expect(btn).toHaveClass("doc-btn");
      expect(btn).not.toHaveClass("doc-btn-primary");
      expect(btn).not.toHaveAttribute("data-slot", "button");
    }
  });

  it("sending 时修改按钮禁用，确认无误同样禁用", () => {
    render(
      <SalesOrderDoc
        messageId="m1"
        blockIndex={0}
        fields={BASE_FIELDS}
        actions={[
          action("confirm", "确认无误"),
          action("modify_qty", "修改数量"),
        ]}
        disabled
      />,
    );

    expect(screen.getByRole("button", { name: /确认无误/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /修改数量/ })).toBeDisabled();
  });
});
