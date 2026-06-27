import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageBlock } from "../../types/message";
import { FormBlock } from "./FormBlock";
import { BusinessDocCard } from "./BusinessDocCard";
import { SalesOrderDoc } from "./SalesOrderDoc";
import { ShipmentDoc } from "./ShipmentDoc";
import { ContractReviewDoc } from "./ContractReviewDoc";
import {
  ChoiceConfirmCard,
  ChoiceConfirmStack,
  buildChoiceSlotKey,
  type ChoiceSelectHandler,
} from "./ChoiceConfirmCard";
import { DocSectionTable } from "./DocSectionTable";
import { detectDocKind } from "../flowMeta";
import { isListFieldLabel, tryParseObjectArray } from "../../utils/fieldValue";
import { parseChoiceBlocksFromText } from "../../utils/choiceParser";
import { tryOrderResultBlock } from "../../utils/orderResultParser";
import { tryParseShipmentDocFromMarkdown, unwrapDocArray } from "../../utils/structuredDocMarkdown";
import { splitContractFormFields, orderContractReviewColumns } from "../../utils/contractReview";
import { InlineItemsTable } from "./InlineItemsTable";
import { OrderResultCard } from "./OrderResultCard";

function MarkdownBlock({
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

function TableBlock({
  title,
  columns,
  rows,
}: {
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="block-table">
      <DocSectionTable title={title} columns={columns} rows={rows} />
    </div>
  );
}

function CardFieldValue({ label, value }: { label: string; value: string }) {
  const rows = isListFieldLabel(label) ? tryParseObjectArray(value) : tryParseObjectArray(value);
  if (rows) return <InlineItemsTable rows={rows} />;
  return <>{value}</>;
}

function CardBlock({
  title,
  level,
  fields,
}: {
  title?: string;
  level?: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <div className={`block-card ${level === "error" ? "block-card-error" : ""}`}>
      {title && <div className="block-card-title">{title}</div>}
      <div className="block-card-fields">
        {fields.map((f, i) => (
          <div className="block-card-row" key={i}>
            <span className="block-card-label">{f.label}</span>
            <span className="block-card-value">
              <CardFieldValue label={f.label} value={f.value} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileBlock({ name, url, mime }: { name: string; url?: string | null; mime?: string | null }) {
  const isImage = mime?.startsWith("image") || /\.(png|jpe?g|gif|webp)$/i.test(name);
  return (
    <div className="block-file">
      {isImage && url ? (
        <img src={url} alt={name} className="block-file-image" />
      ) : (
        <div className="block-file-card">
          <span className="block-file-icon">📄</span>
          <span className="block-file-name">{name}</span>
          {url && (
            <a className="block-file-link" href={url} target="_blank" rel="noreferrer">
              下载
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function tryParseShipmentDocFromJsonData(data: unknown) {
  const unwrapped = unwrapDocArray(data);
  if (typeof unwrapped === "string") return tryParseShipmentDocFromMarkdown(unwrapped);
  if (!unwrapped || typeof unwrapped !== "object") return null;
  return tryParseShipmentDocFromMarkdown(JSON.stringify(unwrapped));
}

function JsonBlock({
  data,
  collapsed,
  flowKey,
  messageId,
  blockIndex,
  choiceDisabled,
}: {
  data: unknown;
  collapsed?: boolean;
  flowKey?: string | null;
  messageId?: string;
  blockIndex?: number;
  choiceDisabled?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const shipmentDoc = flowKey === "shipment" ? tryParseShipmentDocFromJsonData(data) : null;
  if (shipmentDoc && messageId != null && blockIndex != null) {
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

  return (
    <div className="block-json">
      <button className="block-json-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "▾ 收起" : "▸ 展开"} 原始数据
      </button>
      {open && <pre className="block-json-pre">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

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
    .map((b) => ({ title: b.title, columns: b.columns, rows: b.rows }));

  return (
    <div className="block-primary">
      <SalesOrderDoc
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
