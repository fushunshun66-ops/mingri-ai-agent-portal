export function InfoMissingCard({
  title = "信息缺失",
  fields,
  hint,
}: {
  title?: string;
  fields: string[];
  hint: string;
}) {
  const hasFields = fields.length > 0;

  return (
    <div className="choice-card choice-card-reminder">
      <div className="choice-card-head">
        <span className="choice-card-icon" aria-hidden="true">
          !
        </span>
        <div className="choice-card-head-text">
          <div className="choice-card-title">{title}</div>
          {hint ? <p className="choice-card-hint">{hint}</p> : null}
        </div>
      </div>

      <div className="choice-card-body choice-card-body-reminder">
        {hasFields ? (
          <div className="info-missing-chips">
            {fields.map((field, index) => (
              <span key={`${field}-${index}`} className="info-missing-chip">
                {field}
              </span>
            ))}
          </div>
        ) : (
          <p className="info-missing-empty">未识别到具体缺失字段</p>
        )}
      </div>
    </div>
  );
}
