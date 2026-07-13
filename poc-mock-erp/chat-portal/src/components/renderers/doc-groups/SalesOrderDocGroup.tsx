import type { MessageBlock } from "../../../types/message";
import type { ChoiceSelectHandler } from "../ChoiceConfirmCard";
import { SalesOrderDoc } from "../SalesOrderDoc";
import { sanitizeFormFields, sanitizeTableColumns } from "../../../utils/formDisplay";

export function renderSalesOrderDocGroup(
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
    .map((b) => ({
      title: b.title,
      columns: sanitizeTableColumns(b.columns, b.rows),
      rows: b.rows,
    }));

  return (
    <div className="block-primary">
      <SalesOrderDoc
        messageId={messageId}
        blockIndex={blockIndex}
        title={formBlock.title}
        fields={sanitizeFormFields(formBlock.fields)}
        sections={sections}
        actions={formBlock.actions}
        onAction={onFormAction}
        disabled={formActionDisabled}
        selectedBySlot={selectedBySlot}
      />
    </div>
  );
}
