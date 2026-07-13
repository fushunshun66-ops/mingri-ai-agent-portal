import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { FormField } from "../../types/message";

function isMonoDetailField(key: string): boolean {
  const k = key.toLowerCase();
  return k === "traceid" || k === "detailid";
}

function ErrorDetailRows({ fields }: { fields: FormField[] }) {
  return (
    <>
      {fields.map((field, index) => (
        <div key={field.key}>
          {index > 0 ? <div className="choice-error-details-divider" /> : null}
          <div className="choice-error-details-row">
            <span className="choice-error-details-label">{field.label}</span>
            <span
              className={
                isMonoDetailField(field.key)
                  ? "choice-error-details-value choice-error-details-value--mono"
                  : "choice-error-details-value"
              }
            >
              {field.value}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

export function ApiErrorCard({
  title = "处理未成功",
  suggestion,
  factFields,
  detailFields,
}: {
  title?: string;
  suggestion?: string;
  factFields: FormField[];
  detailFields: FormField[];
}) {
  const hasDetails = detailFields.length > 0;

  return (
    <div className="choice-card choice-card-error">
      <div className="choice-card-head">
        <span className="choice-card-icon" aria-hidden="true">
          !
        </span>
        <div className="choice-card-head-text">
          <div className="choice-card-title">{title}</div>
          {suggestion ? <p className="choice-card-hint">{suggestion}</p> : null}
        </div>
      </div>

      <div className="choice-card-body choice-card-body-error">
        <div className="choice-error-fact">
          <ErrorDetailRows fields={factFields} />
        </div>

        {hasDetails ? (
          <Collapsible defaultOpen={false} className="group/collapse choice-error-details-wrap">
            <CollapsibleTrigger className="choice-error-details-trigger" type="button">
              <span>技术详情</span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-data-[open]/collapse:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="choice-error-details-panel">
              <ErrorDetailRows fields={detailFields} />
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
