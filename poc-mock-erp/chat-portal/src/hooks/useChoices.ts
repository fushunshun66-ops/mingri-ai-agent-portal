import { useCallback, useState } from "react";
import type { ChoiceSelectContext } from "../components/renderers/ChoiceConfirmCard";
import type { ChoiceComposerChip } from "../types/choice";
import { normalizeChoiceText } from "../utils/choiceText";

export function useChoices() {
  const [choiceComposerChips, setChoiceComposerChips] = useState<Record<string, ChoiceComposerChip>>({});
  const [selectedChoiceBySlot, setSelectedChoiceBySlot] = useState<Record<string, string>>({});

  const clearChoiceFill = useCallback(() => {
    setChoiceComposerChips({});
    setSelectedChoiceBySlot({});
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

  const handleFormAction = handleChoiceSelect;

  const handleRemoveChoiceChip = useCallback((slotKey: string) => {
    setChoiceComposerChips((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setSelectedChoiceBySlot((prev) => {
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
  };
}
