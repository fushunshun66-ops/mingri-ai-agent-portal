import type { MessageBlock } from "../../types/message";
import { FormBlock } from "./FormBlock";
import { BusinessDocCard } from "./BusinessDocCard";
import { SalesOrderDoc } from "./SalesOrderDoc";
import { ShipmentDoc } from "./ShipmentDoc";
import { ContractReviewDoc } from "./ContractReviewDoc";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { detectDocKind } from "../flowMeta";
import { splitContractFormFields } from "../../utils/contractReview";
import { tryOrderResultBlock } from "../../utils/orderResultParser";
import { OrderResultCard } from "./OrderResultCard";

import { MarkdownBlock } from "./blocks/MarkdownBlock";
import { TableBlock } from "./blocks/TableBlock";
import { CardBlock } from "./blocks/CardBlock";
import { FileBlock } from "./blocks/FileBlock";
import { JsonBlock } from "./blocks/JsonBlock";
import { ChoiceBlock } from "./blocks/ChoiceBlock";
import { renderSalesOrderDocGroup } from "./doc-groups/SalesOrderDocGroup";
import { renderShipmentDocGroup } from "./doc-groups/ShipmentDocGroup";
import { renderContractReviewDocGroup } from "./doc-groups/ContractReviewDocGroup";

export function BlockRenderer({
  messageId,
  blockIndex,
  block,
  flowKey,
  onFormAction,
  onChoiceSelect,
  selectedBySlot,
  formActionDisabled,
}: {
  messageId: string;
  blockIndex: number;
  block: MessageBlock;
  flowKey?: string | null;
  onFormAction?: ChoiceSelectHandler;
  onChoiceSelect?: ChoiceSelectHandler;
  selectedBySlot?: Record<string, string>;
  formActionDisabled?: boolean;
}) {
  switch (block.type) {
    case "markdown":
      return (
        <MarkdownBlock
          messageId={messageId}
          blockIndex={blockIndex}
          content={block.content}
          flowKey={flowKey}
          onChoiceSelect={onChoiceSelect}
          selectedBySlot={selectedBySlot}
          choiceDisabled={formActionDisabled}
        />
      );
    case "choice":
      return (
        <ChoiceBlock
          messageId={messageId}
          blockIndex={blockIndex}
          block={block}
          selectedBySlot={selectedBySlot}
          onChoiceSelect={onChoiceSelect}
          formActionDisabled={formActionDisabled}
        />
      );
    case "text": {
      const textResult = tryOrderResultBlock(block.content);
      if (textResult) {
        return (
          <div className="block-primary">
            <OrderResultCard
              schemaKey={textResult.schemaKey}
              orderNo={textResult.orderNo}
              title={textResult.title}
              message={textResult.message}
            />
          </div>
        );
      }
      return <div className="block-text">{block.content}</div>;
    }
    case "table":
      return <TableBlock title={block.title} columns={block.columns} rows={block.rows} />;
    case "card":
      if (detectDocKind(block.fields)) {
        return (
          <div className="block-primary">
            <BusinessDocCard
              messageId={messageId}
              blockIndex={blockIndex}
              title={block.title}
              level={block.level}
              fields={block.fields}
              onAction={onFormAction}
              disabled={formActionDisabled}
              selectedBySlot={selectedBySlot}
            />
          </div>
        );
      }
      return <CardBlock title={block.title} level={block.level} fields={block.fields} />;
    case "result":
      return (
        <div className="block-primary">
          <OrderResultCard
            schemaKey={block.schemaKey}
            orderNo={block.orderNo}
            title={block.title}
            message={block.message}
          />
        </div>
      );
    case "form":
      if (block.schemaKey === "sales_order") {
        return (
          <div className="block-primary">
            <SalesOrderDoc
              messageId={messageId}
              blockIndex={blockIndex}
              title={block.title}
              fields={block.fields}
              onAction={onFormAction}
              disabled={formActionDisabled}
              selectedBySlot={selectedBySlot}
            />
          </div>
        );
      }
      if (block.schemaKey === "shipment") {
        return (
          <div className="block-primary">
            <ShipmentDoc
              messageId={messageId}
              blockIndex={blockIndex}
              title={block.title}
              fields={block.fields}
              onAction={onFormAction}
              disabled={formActionDisabled}
              selectedBySlot={selectedBySlot}
            />
          </div>
        );
      }
      if (block.schemaKey === "contract_review") {
        const { basicFields, summary } = splitContractFormFields(block.fields);
        return (
          <div className="block-primary">
            <ContractReviewDoc
              messageId={messageId}
              blockIndex={blockIndex}
              title={block.title}
              basicFields={basicFields}
              summary={summary}
              onAction={onFormAction}
              disabled={formActionDisabled}
              selectedBySlot={selectedBySlot}
            />
          </div>
        );
      }
      return (
        <div className="block-primary">
          <FormBlock
            messageId={messageId}
            blockIndex={blockIndex}
            schemaKey={block.schemaKey}
            title={block.title}
            fields={block.fields}
            actions={block.actions}
            onAction={onFormAction}
            disabled={formActionDisabled}
            selectedBySlot={selectedBySlot}
          />
        </div>
      );
    case "file":
      return <FileBlock name={block.name} url={block.url} mime={block.mime} />;
    case "json":
      return (
        <JsonBlock
          data={block.data}
          collapsed={block.collapsed}
          flowKey={flowKey}
          messageId={messageId}
          blockIndex={blockIndex}
          choiceDisabled={formActionDisabled}
        />
      );
    default:
      return null;
  }
}

export function isDocGroupLead(block: MessageBlock): boolean {
  return (
    block.type === "form" &&
    (block.schemaKey === "sales_order" || block.schemaKey === "shipment" || block.schemaKey === "contract_review")
  );
}

export function isDocGroupFollow(block: MessageBlock): boolean {
  return block.type === "table" && Boolean(block.title);
}

export function renderDocGroup(
  blocks: MessageBlock[],
  messageId: string,
  blockIndex: number,
  onFormAction?: ChoiceSelectHandler,
  formActionDisabled?: boolean,
  selectedBySlot?: Record<string, string>,
) {
  const lead = blocks[0];
  if (lead.type !== "form") return null;
  if (lead.schemaKey === "contract_review") {
    return renderContractReviewDocGroup(blocks, messageId, blockIndex, onFormAction, formActionDisabled, selectedBySlot);
  }
  if (lead.schemaKey === "shipment") {
    return renderShipmentDocGroup(blocks, messageId, blockIndex, onFormAction, formActionDisabled, selectedBySlot);
  }
  return renderSalesOrderDocGroup(blocks, messageId, blockIndex, onFormAction, formActionDisabled, selectedBySlot);
}

export { renderSalesOrderDocGroup, renderShipmentDocGroup, renderContractReviewDocGroup };
