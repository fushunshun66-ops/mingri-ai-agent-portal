import type { MessageBlock } from "../../../types/message";
import type { ChoiceSelectHandler } from "../ChoiceConfirmCard";
import { ShipmentDoc } from "../ShipmentDoc";

export function renderShipmentDocGroup(
  blocks: MessageBlock[],
  messageId: string,
  blockIndex: number,
  onFormAction?: ChoiceSelectHandler,
  formActionDisabled?: boolean,
  selectedBySlot?: Record<string, string>,
) {
  const formBlock = blocks[0];
  if (formBlock.type !== "form") return null;
  const sections = blocks
    .slice(1)
    .filter((b): b is MessageBlock & { type: "table" } => b.type === "table")
    .map((b) => ({ title: b.title, columns: b.columns, rows: b.rows }));

  return (
    <div className="block-primary">
      <ShipmentDoc
        messageId={messageId}
        blockIndex={blockIndex}
        title={formBlock.title}
        fields={formBlock.fields}
        sections={sections}
        onAction={onFormAction}
        disabled={formActionDisabled}
        selectedBySlot={selectedBySlot}
      />
    </div>
  );
}
