import type { ChoiceSelectHandler } from "../components/renderers/ChoiceConfirmCard";
import { buildChoiceSlotKey } from "../components/renderers/ChoiceConfirmCard";
import { normalizeChoiceText } from "./choiceText";

export function buildDocActionSlotKey(messageId: string, blockIndex: number, actionId: string) {
  return buildChoiceSlotKey(messageId, blockIndex, `action:${actionId}`);
}

/** 卡片按钮：仅将选项标签填入输入框芯片，不直接发送 */
export function triggerDocAction(
  onSelect: ChoiceSelectHandler | undefined,
  opts: {
    messageId: string;
    blockIndex: number;
    actionId: string;
    fieldLabel: string;
    buttonLabel: string;
  },
) {
  const label = normalizeChoiceText(opts.buttonLabel);
  if (!label || !onSelect) return;
  onSelect(label, {
    slotKey: buildDocActionSlotKey(opts.messageId, opts.blockIndex, opts.actionId),
    optionId: opts.actionId,
    fieldLabel: normalizeChoiceText(opts.fieldLabel) || opts.fieldLabel,
    displayLabel: label,
  });
}
