import { useState } from "react";
import { FLOW_META } from "../flowMeta";
import { Badge } from "@/components/ui/badge";
import { DocFieldGrid } from "./DocFieldGrid";
import { DocSectionTable } from "./DocSectionTable";
import type {
  OrderResultField,
  OrderResultFieldGroup,
  OrderResultSection,
  OrderResultWarning,
} from "../../utils/orderResultEnricher";
import { localizeOrderResultExtras } from "../../utils/extraFieldLabel";
import resultFieldProfiles from "../../config/resultFieldProfiles.json";

const DEFAULT_MESSAGE = "销售订单已完成，可在ERP中查看详情。";

export function OrderResultCard({
  schemaKey,
  orderNo,
  title,
  message,
  fieldGroups,
  sections,
  warnings,
  extras,
}: {
  schemaKey: string;
  orderNo: string;
  title?: string;
  message?: string;
  fieldGroups?: OrderResultFieldGroup[];
  sections?: OrderResultSection[];
  warnings?: OrderResultWarning[];
  extras?: OrderResultField[];
}) {
  const [extrasOpen, setExtrasOpen] = useState(false);
  const meta = FLOW_META[schemaKey] ?? FLOW_META.sales_order;
  const displayTitle = title?.trim() || "销售订单已生成";
  const displayMessage = message?.trim() || DEFAULT_MESSAGE;
  const profileLabels =
    (resultFieldProfiles as Record<string, { extraFieldLabels?: Record<string, string> }>)[schemaKey]
      ?.extraFieldLabels;
  const displayExtras = extras?.length
    ? localizeOrderResultExtras(extras, profileLabels)
    : undefined;
  const hasRichBody = Boolean(fieldGroups?.length || sections?.length || displayExtras?.length);

  return (
    <div className="doc-card cap-accent-success doc-result-card">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">{meta.module}</span>
          <h3 className="doc-card-title">{displayTitle}</h3>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#f6ffed] text-[#389e0d] border-[#b7eb8f]"
        >
          已完成
        </Badge>
      </div>
      <div className="doc-order-result-no" aria-label={`订单号 ${orderNo}`}>
        <span className="doc-order-result-no-value">{orderNo}</span>
        <button type="button" className="doc-order-result-copy" aria-label={`查看订单 ${orderNo}`}>
          查看
        </button>
      </div>
      <p className="doc-order-result-message">{displayMessage}</p>

      {warnings?.length ? (
        <div className="doc-result-warnings" role="alert">
          {warnings.map((warning) => (
            <div
              key={warning.key}
              className={`doc-result-warning doc-result-warning--${warning.tone}`}
            >
              <strong>{warning.label}</strong>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {hasRichBody ? (
      <div className="doc-card-body">
        {fieldGroups?.map((group) => (
          <section key={group.title} className="doc-result-group">
            <div className="doc-result-group-title">{group.title}</div>
            <DocFieldGrid fields={group.fields} />
          </section>
        ))}

        {sections?.map((section) => (
          <DocSectionTable
            key={section.title || section.columns.join("-")}
            title={section.title}
            columns={section.columns}
            rows={section.rows}
          />
        ))}

        {displayExtras?.length ? (
          <section className="doc-result-extras-wrap">
            <button
              type="button"
              className="doc-result-extras-toggle"
              aria-expanded={extrasOpen}
              onClick={() => setExtrasOpen((open) => !open)}
            >
              更多字段 ({displayExtras.length}) {extrasOpen ? "▾" : "▸"}
            </button>
            {extrasOpen ? (
              <div className="doc-result-extras">
                <DocFieldGrid fields={displayExtras} />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
