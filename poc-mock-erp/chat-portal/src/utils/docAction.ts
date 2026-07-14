import type { ChoiceSelectHandler } from "../components/renderers/ChoiceConfirmCard";
import { buildChoiceSlotKey } from "../components/renderers/ChoiceConfirmCard";
import { normalizeChoiceText } from "./choiceText";

export function buildDocActionSlotKey(messageId: string, blockIndex: number, actionId: string) {
  return buildChoiceSlotKey(messageId, blockIndex, `action:${actionId}`);
}

/** 临时关闭单据卡「修改数量 / 修改交期」等非确认按钮；恢复时改为 false */
export const TEMP_DISABLE_MODIFY_DOC_ACTIONS = true;

/** 确认主按钮：id=confirm，或标签精确为「确认无误」→ 直接发送 */
export function isImmediateConfirmAction(actionId: string, buttonLabel: string) {
  if (actionId === "confirm") return true;
  return normalizeChoiceText(buttonLabel) === "确认无误";
}

/** 非确认类单据按钮是否临时禁用 */
export function isModifyDocActionTempDisabled(actionId: string, buttonLabel: string) {
  if (!TEMP_DISABLE_MODIFY_DOC_ACTIONS) return false;
  return !isImmediateConfirmAction(actionId, buttonLabel);
}

/** 卡片按钮：默认填入 composer 芯片；sendImmediately 时由上层直接发送 */
export function triggerDocAction(
  onSelect: ChoiceSelectHandler | undefined,
  opts: {
    messageId: string;
    blockIndex: number;
    actionId: string;
    fieldLabel: string;
    buttonLabel: string;
    sendImmediately?: boolean;
  },
) {
  const label = normalizeChoiceText(opts.buttonLabel);
  if (!label || !onSelect) return;
  onSelect(label, {
    slotKey: buildDocActionSlotKey(opts.messageId, opts.blockIndex, opts.actionId),
    optionId: opts.actionId,
    fieldLabel: normalizeChoiceText(opts.fieldLabel) || opts.fieldLabel,
    displayLabel: label,
    sendImmediately: opts.sendImmediately,
  });
}