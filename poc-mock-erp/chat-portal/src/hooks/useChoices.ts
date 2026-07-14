import { useCallback, useRef, useState } from "react";
import type { ChoiceSelectContext } from "../components/renderers/ChoiceConfirmCard";
import type { ChoiceComposerChip } from "../types/choice";
import { normalizeChoiceText } from "../utils/choiceText";

export function useChoices() {
  const [choiceComposerChips, setChoiceComposerChips] = useState<Record<string, ChoiceComposerChip>>({});
  const [selectedChoiceBySlot, setSelectedChoiceBySlot] = useState<Record<string, string>>({});
  /** 由 useChatSession 注入 handleSend，供 sendImmediately 表单动作使用 */
  const sendImmediatelyRef = useRef<((text: string) => void | Promise<void>) | null>(null);
  /** 直发 in-flight 闸门，防止双重点击重复提交 */
  const immediateInFlightRef = useRef(false);
  /** 已成功发起直发的确认槽：clearChoiceFill 不清这些槽 */
  const submittedImmediateSlotsRef = useRef<Set<string>>(new Set());

  const clearChoiceFill = useCallback(() => {
    setChoiceComposerChips({});
    setSelectedChoiceBySlot((prev) => {
      const kept: Record<string, string> = {};
      for (const [slotKey, optionId] of Object.entries(prev)) {
        if (submittedImmediateSlotsRef.current.has(slotKey)) {
          kept[slotKey] = optionId;
        }
      }
      return kept;
    });
  }, []);

  const handleChoiceSelect = useCallback((message: string, context: ChoiceSelectContext) => {
    const trimmed = normalizeChoiceText(message);
    const { slotKey, optionId, fieldLabel, displayLabel } = context;
    const label = normalizeChoiceText(displayLabel) || trimmed;
    if (!label) return;

    setChoiceComposerChips((prev) => ({
      ...prev,
      [slotKey]: {
        slotKey,
        fieldLabel: normalizeChoiceText(fieldLabel) || fieldLabel,
        displayLabel: label,
        message: label,
        optionId,
      },
    }));

    setSelectedChoiceBySlot((prev) => ({ ...prev, [slotKey]: optionId }));

    requestAnimationFrame(() => {
      const el = document.querySelector(".composer textarea") as HTMLTextAreaElement | null;
      el?.focus();
      const len = el?.value.length ?? 0;
      el?.setSelectionRange(len, len);
    });
  }, []);

  const handleFormAction = useCallback(
    (message: string, context: ChoiceSelectContext) => {
      if (context.sendImmediately) {
        const trimmed = normalizeChoiceText(message);
        if (!trimmed) return;

        const send = sendImmediatelyRef.current;
        // H4：无 send 回调时不标已提交
        if (!send) return;

        // H1：in-flight 或该槽已提交则忽略
        if (immediateInFlightRef.current) return;
        if (submittedImmediateSlotsRef.current.has(context.slotKey)) return;

        immediateInFlightRef.current = true;
        submittedImmediateSlotsRef.current.add(context.slotKey);
        setSelectedChoiceBySlot((prev) => ({ ...prev, [context.slotKey]: context.optionId }));

        void Promise.resolve(send(trimmed)).finally(() => {
          immediateInFlightRef.current = false;
        });
        return;
      }
      handleChoiceSelect(message, context);
    },
    [handleChoiceSelect],
  );

  const handleRemoveChoiceChip = useCallback((slotKey: string) => {
    setChoiceComposerChips((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setSelectedChoiceBySlot((prev) => {
      if (submittedImmediateSlotsRef.current.has(slotKey)) return prev;
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }, []);

  return {
    choiceComposerChips,
    selectedChoiceBySlot,
    handleChoiceSelect,
    handleFormAction,
    handleRemoveChoiceChip,
    clearChoiceFill,
    sendImmediatelyRef,
  };
}
