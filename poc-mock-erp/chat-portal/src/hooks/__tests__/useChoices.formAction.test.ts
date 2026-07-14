import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChoices } from "../useChoices";
import { buildDocActionSlotKey } from "../../utils/docAction";

function confirmCtx(slotKey: string) {
  return {
    slotKey,
    optionId: "confirm",
    fieldLabel: "销售订单草稿",
    displayLabel: "确认无误",
    sendImmediately: true as const,
  };
}

describe("useChoices handleFormAction sendImmediately", () => {
  it("calls send callback and does not fill composer chip when sendImmediately", () => {
    const sendImmediately = vi.fn();
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = sendImmediately;

    const slotKey = buildDocActionSlotKey("msg-1", 0, "confirm");

    act(() => {
      result.current.handleFormAction("确认无误", confirmCtx(slotKey));
    });

    expect(sendImmediately).toHaveBeenCalledTimes(1);
    expect(sendImmediately).toHaveBeenCalledWith("确认无误");
    expect(Object.keys(result.current.choiceComposerChips)).toHaveLength(0);
    expect(result.current.selectedChoiceBySlot[slotKey]).toBe("confirm");
  });

  it("连续两次 sendImmediately 只调用一次 send（H1）", () => {
    const sendImmediately = vi.fn();
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = sendImmediately;
    const slotKey = buildDocActionSlotKey("msg-1", 0, "confirm");

    act(() => {
      result.current.handleFormAction("确认无误", confirmCtx(slotKey));
      result.current.handleFormAction("确认无误", confirmCtx(slotKey));
    });

    expect(sendImmediately).toHaveBeenCalledTimes(1);
  });

  it("sendImmediatelyRef 为空时不更新 selected、不发送（H4）", () => {
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = null;
    const slotKey = buildDocActionSlotKey("msg-1", 0, "confirm");

    act(() => {
      result.current.handleFormAction("确认无误", confirmCtx(slotKey));
    });

    expect(result.current.selectedChoiceBySlot[slotKey]).toBeUndefined();
  });

  it("clearChoiceFill 保留已直发确认槽（H2）", () => {
    const sendImmediately = vi.fn();
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = sendImmediately;
    const confirmSlot = buildDocActionSlotKey("msg-1", 0, "confirm");
    const modifySlot = buildDocActionSlotKey("msg-1", 0, "modify_qty");

    act(() => {
      result.current.handleFormAction("修改数量", {
        slotKey: modifySlot,
        optionId: "modify_qty",
        fieldLabel: "销售订单草稿",
        displayLabel: "修改数量",
      });
      result.current.handleFormAction("确认无误", confirmCtx(confirmSlot));
    });

    expect(result.current.selectedChoiceBySlot[confirmSlot]).toBe("confirm");
    expect(result.current.choiceComposerChips[modifySlot]).toBeTruthy();

    act(() => {
      result.current.clearChoiceFill();
    });

    expect(result.current.choiceComposerChips[modifySlot]).toBeUndefined();
    expect(result.current.selectedChoiceBySlot[modifySlot]).toBeUndefined();
    expect(result.current.selectedChoiceBySlot[confirmSlot]).toBe("confirm");
  });

  it("fills chip and does not send when sendImmediately is absent", () => {
    const sendImmediately = vi.fn();
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = sendImmediately;

    const slotKey = buildDocActionSlotKey("msg-1", 0, "modify_qty");

    act(() => {
      result.current.handleFormAction("修改数量", {
        slotKey,
        optionId: "modify_qty",
        fieldLabel: "销售订单草稿",
        displayLabel: "修改数量",
      });
    });

    expect(sendImmediately).not.toHaveBeenCalled();
    expect(result.current.choiceComposerChips[slotKey]?.displayLabel).toBe("修改数量");
    expect(result.current.selectedChoiceBySlot[slotKey]).toBe("modify_qty");
  });

  it("handleChoiceSelect ignores sendImmediately (choice cards stay chip-only)", () => {
    const sendImmediately = vi.fn();
    const { result } = renderHook(() => useChoices());
    result.current.sendImmediatelyRef.current = sendImmediately;

    act(() => {
      result.current.handleChoiceSelect("选项A", {
        slotKey: "slot-a",
        optionId: "a",
        fieldLabel: "请选择",
        displayLabel: "选项A",
        sendImmediately: true,
      });
    });

    expect(sendImmediately).not.toHaveBeenCalled();
    expect(result.current.choiceComposerChips["slot-a"]?.displayLabel).toBe("选项A");
  });
});
