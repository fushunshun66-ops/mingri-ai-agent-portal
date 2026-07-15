import { FLOW_META, detectDocKind } from "../flowMeta";
import { Badge } from "@/components/ui/badge";
import { ContractReviewDoc } from "./ContractReviewDoc";
import { isListFieldLabel, tryParseObjectArray } from "../../utils/fieldValue";
import {
  isContractReviewCardShape,
  parseContractReviewCardFields,
} from "../../utils/contractReview";
import { DocFieldGrid } from "./DocFieldGrid";
import { DocSectionTable } from "./DocSectionTable";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

const DOC_TITLE: Record<string, string> = {
  sales_order: "销售订单草稿",
  shipment: "发货申请单",
  contract_review: "合同评审结果",
};

const LIST_SECTION_TITLES: Record<string, string> = {
  商品列表: "商品明细",
  产品列表: "商品明细",
  订单明细: "商品明细",
  items: "发货明细",
  发货明细: "发货明细",
  费用明细: "费用明细",
  风险提示: "风险提示",
};

export function BusinessDocCard({
  messageId,
  blockIndex,
  title,
  level,
  fields,
  onAction,
  disabled,
  selectedBySlot,
}: {
  messageId: string;
  blockIndex: number;
  title?: string;
  level?: string;
  fields: { label: string; value: string }[];
  onAction?: ChoiceSelectHandler;
  disabled?: boolean;
  selectedBySlot?: Record<string, string>;
}) {
  const kind = detectDocKind(fields);
  const meta = kind ? FLOW_META[kind] : null;

  if (kind === "contract_review" || isContractReviewCardShape(fields)) {
    const { basicFields, sections, summary } = parseContractReviewCardFields(fields);
    return (
      <ContractReviewDoc
        messageId={messageId}
        blockIndex={blockIndex}
        title={title}
        basicFields={basicFields}
        sections={sections}
        summary={summary}
        onAction={onAction}
        disabled={disabled}
        selectedBySlot={selectedBySlot}
      />
    );
  }

  const displayTitle =
    title && title !== "reply" && title !== "结果" ? title : kind ? DOC_TITLE[kind] : "业务单据";
  const docNo = fields.find((f) => /单号|订单号|申请单号/.test(f.label))?.value;

  const scalarFields: { label: string; value: string }[] = [];
  const listSections: { title: string; rows: Record<string, unknown>[] }[] = [];

  for (const f of fields) {
    const rows = isListFieldLabel(f.label) ? tryParseObjectArray(f.value) : tryParseObjectArray(f.value);
    if (rows) {
      listSections.push({
        title: LIST_SECTION_TITLES[f.label] || f.label,
        rows,
      });
    } else {
      scalarFields.push(f);
    }
  }

  return (
    <div className={`doc-card ${level === "error" ? "doc-card-error" : ""} ${meta?.accent || ""}`}>
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          {meta && <span className="doc-card-module">{meta.module}</span>}
          <h3 className="doc-card-title">{displayTitle}</h3>
          {docNo && <span className="doc-card-no">{docNo}</span>}
        </div>
        <Badge
          variant={level === "error" ? "destructive" : "outline"}
          className={level === "error"
            ? "text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#fff0f0] text-[#ff4d4f] border-[#ffccc7]"
            : "text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#fff7e6] text-[#d48806] border-[#ffd591]"
          }
        >
          {level === "error" ? "异常" : "待确认"}
        </Badge>
      </div>
      <div className="doc-card-body">
        {scalarFields.length > 0 && <DocFieldGrid fields={scalarFields} />}
        {listSections.map((section, i) => {
          const columns = [...new Set(section.rows.flatMap((row) => Object.keys(row)))];
          return (
            <DocSectionTable
              key={`${section.title}-${i}`}
              title={section.title}
              columns={columns}
              rows={section.rows}
            />
          );
        })}
      </div>
      <DocCardFoot
        hint={
          selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, "confirm")] === "confirm"
            ? "已提交"
            : "点击后将直接发送"
        }
        actions={
          <DocActionButton
            label="提交订单"
            primary
            filled={selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, "confirm")] === "confirm"}
            disabled={
              disabled ||
              selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, "confirm")] === "confirm"
            }
            onClick={() =>
              triggerDocAction(onAction, {
                messageId,
                blockIndex,
                actionId: "confirm",
                fieldLabel: displayTitle,
                buttonLabel: "提交订单",
                sendImmediately: true,
              })
            }
          />
        }
      />
    </div>
  );
}
