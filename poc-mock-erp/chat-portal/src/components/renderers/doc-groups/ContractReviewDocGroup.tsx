import type { MessageBlock } from "../../../types/message";
import type { ChoiceSelectHandler } from "../ChoiceConfirmCard";
import { ContractReviewDoc } from "../ContractReviewDoc";
import { splitContractFormFields, orderContractReviewColumns } from "../../../utils/contractReview";

export function renderContractReviewDocGroup(
  blocks: MessageBlock[],
  messageId: string,
  blockIndex: number,
  onFormAction?: ChoiceSelectHandler,
  formActionDisabled?: boolean,
  selectedBySlot?: Record<string, string>,
) {
  const formBlock = blocks[0];
  if (formBlock.type !== "form") return null;
  const { basicFields, summary } = splitContractFormFields(formBlock.fields);
  const sections = blocks
    .slice(1)
    .filter((b): b is MessageBlock & { type: "table" } => b.type === "table")
    .map((b) => ({
      title: b.title,
      columns: orderContractReviewColumns(b.columns),
      rows: b.rows,
    }));

  return (
    <div className="block-primary">
      <ContractReviewDoc
        messageId={messageId}
        blockIndex={blockIndex}
        title={formBlock.title}
        basicFields={basicFields}
        sections={sections}
        summary={summary}
        onAction={onFormAction}
        disabled={formActionDisabled}
        selectedBySlot={selectedBySlot}
      />
    </div>
  );
}
