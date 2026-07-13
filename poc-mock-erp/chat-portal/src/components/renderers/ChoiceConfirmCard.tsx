import type { ChoiceOption } from "../../utils/choiceParser";

export type ChoiceSelectContext = {
  slotKey: string;
  optionId: string;
  fieldLabel: string;
  displayLabel: string;
};

export type ChoiceSelectHandler = (message: string, context: ChoiceSelectContext) => void;

export function buildChoiceSlotKey(messageId: string, blockIndex: number, fieldLabel: string) {
  return `${messageId}::${blockIndex}::${fieldLabel}`;
}

export function ChoiceConfirmCard({
  slotKey,
  label,
  hint,
  options,
  variant = "confirm",
  items,
  selectedOptionId,
  onSelect,
  disabled,
}: {
  slotKey: string;
  label: string;
  hint?: string;
  options: ChoiceOption[];
  variant?: "confirm" | "reminder";
  items?: string[];
  selectedOptionId?: string | null;
  onSelect?: ChoiceSelectHandler;
  disabled?: boolean;
}) {
  const isReminder = variant === "reminder";
  const title = isReminder ? label : label && label !== "请选择" ? label : "请选择";

  return (
    <div className={`choice-card${isReminder ? " choice-card-reminder" : ""}`}>
      <div className="choice-card-head">
        <span className="choice-card-icon" aria-hidden="true">
          {isReminder ? "!" : "?"}
        </span>
        <div className="choice-card-head-text">
          <div className="choice-card-title">{title}</div>
          {hint && <p className="choice-card-hint">{hint}</p>}
        </div>
      </div>

      {isReminder && items && items.length > 0 && (
        <div className="choice-card-body choice-card-body-reminder">
          <ul className="choice-reminder-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {!isReminder && options.length > 0 && (
        <div className="choice-card-body">
          {options.length > 1 && <div className="choice-pick-label">请选择</div>}
          <div className="choice-option-list">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`choice-option${selectedOptionId === opt.id ? " choice-option-selected" : ""}`}
                disabled={disabled}
                onClick={() =>
                  onSelect?.(opt.message, {
                    slotKey,
                    optionId: opt.id,
                    fieldLabel: label,
                    displayLabel: opt.label,
                  })
                }
              >
                <span className="choice-option-text">{opt.label}</span>
                <span className="choice-option-action">
                  {selectedOptionId === opt.id ? "已选" : "选择"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChoiceConfirmStack({
  messageId,
  blockIndex,
  intro,
  blocks,
  footer,
  selectedBySlot,
  onSelect,
  disabled,
}: {
  messageId: string;
  blockIndex: number;
  intro?: string;
  blocks: { label: string; hint?: string; options: ChoiceOption[]; variant?: "confirm" | "reminder"; items?: string[] }[];
  footer?: string;
  selectedBySlot?: Record<string, string>;
  onSelect?: ChoiceSelectHandler;
  disabled?: boolean;
}) {
  const introText = intro?.replace(/[：:]\s*$/u, "").trim();
  return (
    <div className="choice-confirm-stack">
      {blocks.map((block, i) => {
        const slotKey = buildChoiceSlotKey(messageId, blockIndex, `${block.label}#${i}`);
        const hint = i === 0 && introText ? introText : block.hint;
        return (
          <ChoiceConfirmCard
            key={slotKey}
            slotKey={slotKey}
            label={block.label}
            hint={hint}
            options={block.options}
            variant={block.variant}
            items={block.items}
            selectedOptionId={selectedBySlot?.[slotKey]}
            onSelect={onSelect}
            disabled={disabled}
          />
        );
      })}
      {footer && <p className="choice-stack-footer">{footer}</p>}
    </div>
  );
}
