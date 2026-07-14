import { FLOW_META } from "../flowMeta";
import { Badge } from "@/components/ui/badge";
import { DocFieldGrid } from "./DocFieldGrid";
import { DocSectionTable } from "./DocSectionTable";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

const CONFIRM_LABEL = "确认提交";

export function ShipmentDoc({
  messageId,
  blockIndex,
  title,
  fields,
  sections,
  onAction,
  disabled,
  selectedBySlot,
}: {
  messageId: string;
  blockIndex: number;
  title?: string;
  fields: { key: string; label: string; value: string; widget?: string }[];
  sections?: { title?: string; columns: string[]; rows: Record<string, unknown>[] }[];
  onAction?: ChoiceSelectHandler;
  disabled?: boolean;
  selectedBySlot?: Record<string, string>;
}) {
  const meta = FLOW_META.shipment;
  const displayTitle = title && title !== "reply" && title !== "结果" ? title : "发货申请单";
  const visibleFields = fields.filter((f) => f.value.trim() !== "");
  const docNo = visibleFields.find((f) => /单号|订单号|申请单号/.test(f.key) || /单号|订单号|申请单号/.test(f.label))?.value;
  const slotKey = buildDocActionSlotKey(messageId, blockIndex, "confirm");
  const filled = selectedBySlot?.[slotKey] === "confirm";

  return (
    <div className="doc-card cap-accent-orange">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">{meta.module}</span>
          <h3 className="doc-card-title">{displayTitle}</h3>
          {docNo && <span className="doc-card-no">{docNo}</span>}
        </div>
        <Badge variant="outline" className="text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#fff7e6] text-[#d48806] border-[#ffd591]">待确认</Badge>
      </div>
      <div className="doc-card-body">
        {visibleFields.length > 0 && <DocFieldGrid fields={visibleFields} />}
        {sections?.map((section, i) => (
          <DocSectionTable
            key={`${section.title || "section"}-${i}`}
            title={section.title}
            columns={section.columns}
            rows={section.rows}
          />
        ))}
      </div>
      <DocCardFoot
        hint={filled ? "已提交" : "点击后将直接发送"}
        actions={
          <DocActionButton
            label={CONFIRM_LABEL}
            primary
            filled={filled}
            disabled={disabled || filled}
            onClick={() =>
              triggerDocAction(onAction, {
                messageId,
                blockIndex,
                actionId: "confirm",
                fieldLabel: displayTitle,
                buttonLabel: CONFIRM_LABEL,
                sendImmediately: true,
              })
            }
          />
        }
      />
    </div>
  );
}
