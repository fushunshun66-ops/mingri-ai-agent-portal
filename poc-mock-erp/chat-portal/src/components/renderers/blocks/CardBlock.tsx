import { isListFieldLabel, tryParseObjectArray } from "../../../utils/fieldValue";
import { InlineItemsTable } from "../InlineItemsTable";

function CardFieldValue({ label, value }: { label: string; value: string }) {
  const rows = isListFieldLabel(label) ? tryParseObjectArray(value) : tryParseObjectArray(value);
  if (rows) return <InlineItemsTable rows={rows} />;
  return <>{value}</>;
}

export function CardBlock({
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
