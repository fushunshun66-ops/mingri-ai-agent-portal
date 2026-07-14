import { describe, it, expect, vi } from "vitest";
import {
  buildDocActionSlotKey,
  isImmediateConfirmAction,
  isModifyDocActionTempDisabled,
  TEMP_DISABLE_MODIFY_DOC_ACTIONS,
  triggerDocAction,
} from "../docAction";

describe("isImmediateConfirmAction", () => {
  it("returns true when actionId is confirm", () => {
    expect(isImmediateConfirmAction("confirm", "确认提交")).toBe(true);
    expect(isImmediateConfirmAction("confirm", "任意标签")).toBe(true);
  });

  it("returns true when label is exactly 确认无误", () => {
    expect(isImmediateConfirmAction("other", "确认无误")).toBe(true);
  });

  it("returns false for modify-style actions", () => {
    expect(isImmediateConfirmAction("modify_qty", "修改数量")).toBe(false);
    expect(isImmediateConfirmAction("modify_date", "修改交期")).toBe(false);
    expect(isImmediateConfirmAction("x", "确认一下")).toBe(false);
  });
});

describe("isModifyDocActionTempDisabled", () => {
  it("returns true for modify actions while temp flag is on", () => {
    expect(TEMP_DISABLE_MODIFY_DOC_ACTIONS).toBe(true);
    expect(isModifyDocActionTempDisabled("modify_qty", "修改数量")).toBe(true);
    expect(isModifyDocActionTempDisabled("modify_date", "修改交期")).toBe(true);
  });

  it("returns false for confirm actions", () => {
    expect(isModifyDocActionTempDisabled("confirm", "确认无误")).toBe(false);
  });
});

describe("triggerDocAction", () => {
  it("passes sendImmediately through to onSelect context", () => {
    const onSelect = vi.fn();
    triggerDocAction(onSelect, {
      messageId: "m1",
      blockIndex: 0,
      actionId: "confirm",
      fieldLabel: "销售订单草稿",
      buttonLabel: "确认无误",
      sendImmediately: true,
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("确认无误", {
      slotKey: buildDocActionSlotKey("m1", 0, "confirm"),
      optionId: "confirm",
      fieldLabel: "销售订单草稿",
      displayLabel: "确认无误",
      sendImmediately: true,
    });
  });

  it("omits sendImmediately when not set (chip fill path)", () => {
    const onSelect = vi.fn();
    triggerDocAction(onSelect, {
      messageId: "m1",
      blockIndex: 0,
      actionId: "modify_qty",
      fieldLabel: "销售订单草稿",
      buttonLabel: "修改数量",
    });

    expect(onSelect).toHaveBeenCalledWith("修改数量", {
      slotKey: buildDocActionSlotKey("m1", 0, "modify_qty"),
      optionId: "modify_qty",
      fieldLabel: "销售订单草稿",
      displayLabel: "修改数量",
      sendImmediately: undefined,
    });
  });

  it("does not call onSelect when handler missing", () => {
    expect(() =>
      triggerDocAction(undefined, {
        messageId: "m1",
        blockIndex: 0,
        actionId: "confirm",
        fieldLabel: "x",
        buttonLabel: "确认无误",
        sendImmediately: true,
      }),
    ).not.toThrow();
  });
});
