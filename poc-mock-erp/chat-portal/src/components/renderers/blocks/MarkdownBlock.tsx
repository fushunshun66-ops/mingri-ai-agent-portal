import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChoiceSelectHandler } from "../ChoiceConfirmCard";
import { ChoiceConfirmStack } from "../ChoiceConfirmCard";
import { ShipmentDoc } from "../ShipmentDoc";
import { OrderResultCard } from "../OrderResultCard";
import { parseChoiceBlocksFromText } from "../../../utils/choiceParser";
import { tryParseShipmentDocFromMarkdown } from "../../../utils/structuredDocMarkdown";
import { tryOrderResultBlock } from "../../../utils/orderResultParser";

export function MarkdownBlock({
  messageId,
  blockIndex,
  content,
  flowKey,
  onChoiceSelect,
  selectedBySlot,
  choiceDisabled,
}: {
  messageId: string;
  blockIndex: number;
  content: string;
  flowKey?: string | null;
  onChoiceSelect?: ChoiceSelectHandler;
  selectedBySlot?: Record<string, string>;
  choiceDisabled?: boolean;
}) {
  const parsed = parseChoiceBlocksFromText(content, flowKey);
  if (parsed?.blocks.length) {
    return (
      <div className="block-primary">
        <ChoiceConfirmStack
          messageId={messageId}
          blockIndex={blockIndex}
          intro={parsed.intro}
          blocks={parsed.blocks}
          footer={parsed.footer}
          selectedBySlot={selectedBySlot}
          onSelect={onChoiceSelect}
          disabled={choiceDisabled}
        />
      </div>
    );
  }

  const shipmentDoc = flowKey === "shipment" ? tryParseShipmentDocFromMarkdown(content) : null;
  if (shipmentDoc) {
    return (
      <div className="block-primary">
        <ShipmentDoc
          messageId={messageId}
          blockIndex={blockIndex}
          title="发货申请单"
          fields={shipmentDoc.fields}
          sections={shipmentDoc.sections}
          disabled={choiceDisabled}
        />
      </div>
    );
  }

  const orderResult = tryOrderResultBlock(content);
  if (orderResult) {
    return (
      <div className="block-primary">
        <OrderResultCard
          schemaKey={orderResult.schemaKey}
          orderNo={orderResult.orderNo}
          title={orderResult.title}
          message={orderResult.message}
        />
      </div>
    );
  }
  return (
    <div className="block-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
