import { DocFieldGrid } from "./DocFieldGrid";
import { Badge } from "@/components/ui/badge";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import { ApiErrorCard } from "./ApiErrorCard";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";
import {
  isApiErrorForm,
  pickApiErrorDisplay,
  sanitizeFormFields,
} from "../../utils/formDisplay";
import type { FormAction, FormField } from "../../types/message";

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
  level,
}: {
  messageId: string;
  blockIndex: number;
  schemaKey: string;
  title?: string;
  fields: FormField[];
  actions?: FormAction[];
  onAction?: ChoiceSelectHandler;
  disabled?: boolean;
  selectedBySlot?: Record<string, string>;
  level?: "info" | "error";
}) {
  const schemaLabel = SCHEMA_LABELS[schemaKey] || schemaKey;
  const isError = level === "error" || isApiErrorForm(fields);
  const errorDisplay = isError ? pickApiErrorDisplay(fields) : null;
  const displayFields = isError ? [] : sanitizeFormFields(fields);
  const cardTitle = isError ? (errorDisplay?.title ?? "请求失败") : title || "结构化表单";
  const primaryAction = actions?.[0];
  const primaryFilled =
    primaryAction && selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, primaryAction.id)] === primaryAction.id;

  if (isError && errorDisplay) {
    return (
      <ApiErrorCard
        title={errorDisplay.title}
        suggestion={errorDisplay.suggestion}
        factFields={errorDisplay.factFields}
        detailFields={errorDisplay.detailFields}
      />
    );
  }

  return (
    <div className="doc-card doc-card-generic">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">结构化数据</span>
          <h3 className="doc-card-title">{cardTitle}</h3>
        </div>
        <Badge
          variant="secondary"
          className="text-[11px] font-semibold px-[10px] py-[4px] rounded"
          style={{ color: "var(--primary)" }}
        >
          {schemaLabel}
        </Badge>
      </div>
      <div className="doc-card-body">
        {displayFields.length > 0 && <DocFieldGrid fields={displayFields} />}
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
