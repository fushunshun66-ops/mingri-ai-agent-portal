import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChoiceSelectHandler } from "../ChoiceConfirmCard";
import { ChoiceConfirmStack } from "../ChoiceConfirmCard";
import { ShipmentDoc } from "../ShipmentDoc";
import { OrderResultCard } from "../OrderResultCard";
import { InfoMissingCard } from "../InfoMissingCard";
import { LazyImage } from "../../LazyImage";
import { parseChoiceBlocksFromText } from "../../../utils/choiceParser";
import { tryParseShipmentDocFromMarkdown } from "../../../utils/structuredDocMarkdown";
import { tryOrderResultBlock } from "../../../utils/orderResultParser";
import { tryParseInfoMissing } from "../../../utils/infoMissing";

export function MarkdownBlock({
  messageId,
  blockIndex,
  content,
  flowKey,
  onChoiceSelect,
  selectedBySlot,
  choiceDisabled,
  skipChoiceParse,
}: {
  messageId: string;
  blockIndex: number;
  content: string;
  flowKey?: string | null;
  onChoiceSelect?: ChoiceSelectHandler;
  selectedBySlot?: Record<string, string>;
  choiceDisabled?: boolean;
  /** 消息中已有独立 choice block 时跳过 markdown 二次解析，避免重复卡片 */
  skipChoiceParse?: boolean;
}) {
  const parsed = skipChoiceParse ? null : parseChoiceBlocksFromText(content, flowKey);
  if (parsed?.blocks.some((b) => b.options.length > 0)) {
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
          fieldGroups={orderResult.fieldGroups}
          sections={orderResult.sections}
          warnings={orderResult.warnings}
          extras={orderResult.extras}
        />
      </div>
    );
  }

  const infoMissing = tryParseInfoMissing(content);
  if (infoMissing) {
    return (
      <div className="block-primary">
        <InfoMissingCard title={infoMissing.title} fields={infoMissing.fields} hint={infoMissing.hint} />
      </div>
    );
  }

  return (
    <div className="block-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) =>
            src ? <LazyImage src={src} alt={alt || ""} className="block-file-image" /> : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
