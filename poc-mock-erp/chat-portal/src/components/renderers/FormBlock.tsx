import { DocFieldGrid } from "./DocFieldGrid";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

const SCHEMA_LABELS: Record<string, string> = {
  sales_order: "销售订单",
  shipment: "发货申请",
  generic: "结构化数据",
};

export function FormBlock({
  messageId,
  blockIndex,
  schemaKey,
  title,
  fields,
  actions,
  onAction,
  disabled,
  selectedBySlot,
}: {
  messageId: string;
  blockIndex: number;
  schemaKey: string;
  title?: string;
  fields: { key: string; label: string; value: string; widget?: string }[];
  actions?: { id: string; label: string; message: string }[];
  onAction?: ChoiceSelectHandler;
  disabled?: boolean;
  selectedBySlot?: Record<string, string>;
}) {
  const schemaLabel = SCHEMA_LABELS[schemaKey] || schemaKey;
  const cardTitle = title || "结构化表单";
  const primaryAction = actions?.[0];
  const primaryFilled =
    primaryAction && selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, primaryAction.id)] === primaryAction.id;

  return (
    <div className="doc-card doc-card-generic">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">结构化数据</span>
          <h3 className="doc-card-title">{cardTitle}</h3>
        </div>
        <span className="doc-card-badge doc-card-badge-info">{schemaLabel}</span>
      </div>
      <div className="doc-card-body">
        <DocFieldGrid fields={fields} />
      </div>
      {actions && actions.length > 0 && (
        <DocCardFoot
          hint={primaryFilled ? "已填入输入框，确认后发送" : "点击后将选项填入下方输入框"}
          actions={
            <>
              {actions.map((action, i) => {
                const slotKey = buildDocActionSlotKey(messageId, blockIndex, action.id);
                const filled = selectedBySlot?.[slotKey] === action.id;
                return (
                  <DocActionButton
                    key={action.id}
                    label={action.label}
                    primary={i === 0}
                    filled={filled}
                    disabled={disabled}
                    onClick={() =>
                      triggerDocAction(onAction, {
                        messageId,
                        blockIndex,
                        actionId: action.id,
                        fieldLabel: cardTitle,
                        buttonLabel: action.label,
                      })
                    }
                  />
                );
              })}
            </>
          }
        />
      )}
    </div>
  );
}
