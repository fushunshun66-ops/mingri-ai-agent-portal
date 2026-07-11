import type { MessageBlock } from "../../../types/message";
import { ChoiceConfirmCard, buildChoiceSlotKey, type ChoiceSelectHandler } from "../ChoiceConfirmCard";

export function ChoiceBlock({
  messageId,
  blockIndex,
  block,
  selectedBySlot,
  onChoiceSelect,
  formActionDisabled,
}: {
  messageId: string;
  blockIndex: number;
  block: MessageBlock & { type: "choice" };
  selectedBySlot?: Record<string, string>;
  onChoiceSelect?: ChoiceSelectHandler;
  formActionDisabled?: boolean;
}) {
  const slotKey = buildChoiceSlotKey(messageId, blockIndex, block.label);
  return (
    <div className="block-primary">
      <ChoiceConfirmCard
        slotKey={slotKey}
        label={block.label}
        hint={block.hint}
        options={block.options}
        variant={block.variant}
        items={block.items}
        selectedOptionId={selectedBySlot?.[slotKey]}
        onSelect={onChoiceSelect}
        disabled={formActionDisabled}
      />
    </div>
  );
}
