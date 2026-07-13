import { FLOW_META } from "../flowMeta";
import { Badge } from "@/components/ui/badge";
import { DocFieldGrid } from "./DocFieldGrid";
import { DocSectionTable } from "./DocSectionTable";
import type { ChoiceSelectHandler } from "./ChoiceConfirmCard";
import {
  normalizeContractSummary,
  resolveContractDisplayTitle,
  type ContractField,
  type ContractSection,
} from "../../utils/contractReview";
import { DocActionButton, DocCardFoot } from "./DocCardFoot";
import { buildDocActionSlotKey, triggerDocAction } from "../../utils/docAction";

function ReviewSummarySection({ summary }: { summary: Record<string, string> }) {
  const normalized = normalizeContractSummary(summary) || summary;
  const total = normalized["总审核项数"];
  const passed = normalized["通过项数"];
  const failed = normalized["不通过项数"];

  return (
    <section className="doc-card-section doc-section--summary">
      <div className="doc-section-head">审核总结</div>
      <div className="doc-review-summary">
        <div className="doc-review-summary-item">
          <span className="doc-review-summary-label">总审核项</span>
          <span className="doc-review-summary-value">{total || "—"}</span>
        </div>
        <div className="doc-review-summary-item doc-review-summary-pass">
          <span className="doc-review-summary-label">通过</span>
          <span className="doc-review-summary-value">{passed || "—"}</span>
        </div>
        <div className="doc-review-summary-item doc-review-summary-fail">
          <span className="doc-review-summary-label">不通过</span>
          <span className="doc-review-summary-value">{failed || "—"}</span>
        </div>
      </div>
    </section>
  );
}

export function ContractReviewDoc({
  messageId,
  blockIndex,
  title,
  basicFields,
  sections,
  summary,
  onAction,
  disabled,
  selectedBySlot,
}: {
  messageId: string;
  blockIndex: number;
  title?: string;
  basicFields: ContractField[];
  sections?: ContractSection[];
  summary?: Record<string, string> | null;
  onAction?: ChoiceSelectHandler;
  disabled?: boolean;
  selectedBySlot?: Record<string, string>;
}) {
  const meta = FLOW_META.contract_review;
  const displayTitle = resolveContractDisplayTitle(title);
  const normalizedSummary = normalizeContractSummary(summary);
  const failCount = Number(normalizedSummary?.["不通过项数"] || 0);
  const badgeLabel = failCount > 0 ? `${failCount} 项待处理` : "评审完成";
  const confirmLabel = "确认结果";
  const confirmSlot = buildDocActionSlotKey(messageId, blockIndex, "confirm");
  const confirmFilled = selectedBySlot?.[confirmSlot] === "confirm";

  return (
    <div className="doc-card cap-accent-purple">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">{meta.module}</span>
          <h3 className="doc-card-title">{displayTitle}</h3>
        </div>
        <Badge
          variant={failCount > 0 ? "destructive" : "secondary"}
          className={failCount > 0
            ? "text-[11px] font-semibold px-[10px] py-[4px] rounded bg-[#fff0f0] text-[#ff4d4f] border-[#ffccc7]"
            : "text-[11px] font-semibold px-[10px] py-[4px] rounded"
          }
        >
          {badgeLabel}
        </Badge>
      </div>
      <div className="doc-card-body">
        {normalizedSummary && <ReviewSummarySection summary={normalizedSummary} />}
        {basicFields.length > 0 && (
          <section className="doc-card-section doc-section--basic">
            <div className="doc-section-head">基本信息</div>
            <DocFieldGrid fields={basicFields} />
          </section>
        )}
        {sections?.map((section, i) => (
          <DocSectionTable
            key={`${section.title || "section"}-${i}`}
            title={section.title}
            columns={section.columns}
            rows={section.rows}
            highlightAuditResult
          />
        ))}
      </div>
      <DocCardFoot
        hint={confirmFilled ? "已填入输入框，确认后发送" : "点击后将选项填入下方输入框"}
        actions={
          <DocActionButton
            label={confirmLabel}
            primary
            filled={confirmFilled}
            disabled={disabled}
            onClick={() =>
              triggerDocAction(onAction, {
                messageId,
                blockIndex,
                actionId: "confirm",
                fieldLabel: displayTitle,
                buttonLabel: confirmLabel,
              })
            }
          />
        }
      />
    </div>
  );
}
