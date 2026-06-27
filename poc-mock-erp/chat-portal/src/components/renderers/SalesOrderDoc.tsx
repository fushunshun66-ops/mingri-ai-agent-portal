import { FLOW_META } from "../flowMeta";
import { DocFieldGrid } from "./DocFieldGrid";
import { DocSectionTable } from "./DocSectionTable";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

const CONFIRM_LABEL = "确认提交";

export function SalesOrderDoc({
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
  const meta = FLOW_META.sales_order;
  const displayTitle = title && title !== "reply" && title !== "结果" ? title : "销售订单草稿";
  const docNo = fields.find((f) => /单号|订单号/.test(f.key) || /单号|订单号/.test(f.label))?.value;
  const slotKey = buildDocActionSlotKey(messageId, blockIndex, "confirm");
  const filled = selectedBySlot?.[slotKey] === "confirm";

  return (
    <div className={`doc-card cap-accent-blue`}>
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">{meta.module}</span>
          <h3 className="doc-card-title">{displayTitle}</h3>
          {docNo && <span className="doc-card-no">{docNo}</span>}
        </div>
        <span className="doc-card-badge">待确认</span>
      </div>
      <div className="doc-card-body">
        {fields.length > 0 && <DocFieldGrid fields={fields} />}
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
        hint={filled ? "已填入输入框，确认后发送" : "点击后将选项填入下方输入框"}
        actions={
          <DocActionButton
            label={CONFIRM_LABEL}
            primary
            filled={filled}
            disabled={disabled}
            onClick={() =>
              triggerDocAction(onAction, {
                messageId,
                blockIndex,
                actionId: "confirm",
                fieldLabel: displayTitle,
                buttonLabel: CONFIRM_LABEL,
              })
            }
          />
        }
      />
    </div>
  );
}
