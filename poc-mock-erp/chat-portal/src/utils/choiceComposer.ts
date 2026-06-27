import type { ChoiceComposerChip } from "../types/choice";
import { normalizeChoiceText } from "./choiceText";

/** 将确认芯片与自由文本合并为发送内容 */
export function composeChoiceComposerContent(freeText: string, chips: ChoiceComposerChip[]) {
  const parts = chips.map((c) => normalizeChoiceText(c.message)).filter(Boolean);
  const extra = normalizeChoiceText(freeText);
  if (parts.length && extra) return `${parts.join("\n")}\n${extra}`;
  if (parts.length) return parts.join("\n");
  return extra;
}

export function hasComposerPayload(
  freeText: string,
  chips: ChoiceComposerChip[],
  hasFiles = false,
) {
  return Boolean(freeText.trim() || chips.length > 0 || hasFiles);
}
