import { FLOW_META } from "../flowMeta";

import { Badge } from "@/components/ui/badge";

import { DocFieldGrid } from "./DocFieldGrid";

import { DocSectionTable } from "./DocSectionTable";

import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";

import { DocActionButton, DocCardFoot } from "./DocCardFoot";

import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

import type { FormAction, FormField } from "../../types/message";



const CONFIRM_LABEL = "确认提交";



export function SalesOrderDoc({

  messageId,

  blockIndex,

  title,

  fields,

  sections,

  actions,

  onAction,

  disabled,

  selectedBySlot,

}: {

  messageId: string;

  blockIndex: number;

  title?: string;

  fields: FormField[];

  sections?: { title?: string; columns: string[]; rows: Record<string, unknown>[] }[];

  actions?: FormAction[];

  onAction?: ChoiceSelectHandler;

  disabled?: boolean;

  selectedBySlot?: Record<string, string>;

}) {

  const meta = FLOW_META.sales_order;

  const displayTitle = title && title !== "reply" && title !== "结果" ? title : "销售订单草稿";

  const docNo = fields.find((f) => /单号|订单号/.test(f.key) || /单号|订单号/.test(f.label))?.value;

  const fallbackSlotKey = buildDocActionSlotKey(messageId, blockIndex, "confirm");

  const fallbackFilled = selectedBySlot?.[fallbackSlotKey] === "confirm";

  const primaryAction = actions?.[0];

  const primaryFilled =

    primaryAction &&

    selectedBySlot?.[buildDocActionSlotKey(messageId, blockIndex, primaryAction.id)] === primaryAction.id;



  return (

    <div className={`doc-card cap-accent-blue`}>

      <div className="doc-card-head">

        <div className="doc-card-head-left">

          <span className="doc-card-module">{meta.module}</span>

          <h3 className="doc-card-title">{displayTitle}</h3>

          {docNo && <span className="doc-card-no">{docNo}</span>}

        </div>

        <Badge variant="outline" className="text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#fff7e6] text-[#d48806] border-[#ffd591]">待确认</Badge>

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

      {actions && actions.length > 0 ? (

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

                        fieldLabel: displayTitle,

                        buttonLabel: action.label,

                      })

                    }

                  />

                );

              })}

            </>

          }

        />

      ) : (

        <DocCardFoot

          hint={fallbackFilled ? "已填入输入框，确认后发送" : "点击后将选项填入下方输入框"}

          actions={

            <DocActionButton

              label={CONFIRM_LABEL}

              primary

              filled={fallbackFilled}

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

      )}

    </div>

  );

}

