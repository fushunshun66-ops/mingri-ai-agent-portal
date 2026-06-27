function formatFieldValue(value: string, widget?: string): string {
  if (!widget || widget === "text") return value;
  if (widget === "currency" && value && !/[^\d.,]/.test(value.replace(/[,，]/g, ""))) {
    return value.includes("元") ? value : `${value} 元`;
  }
  return value;
}

export function DocFieldGrid({
  fields,
}: {
  fields: { key?: string; label: string; value: string; widget?: string }[];
}) {
  return (
    <div className="doc-field-grid">
      {fields.map((field) => (
        <div className="doc-field-row" key={field.key || field.label}>
          <span className="doc-field-label">{field.label}</span>
          <span className="doc-field-value">{formatFieldValue(field.value, field.widget)}</span>
        </div>
      ))}
    </div>
  );
}
