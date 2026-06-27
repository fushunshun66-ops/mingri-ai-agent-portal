export type QuickPrompt = { text: string; label?: string };

function previewText(text: string, max = 28) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function ComposerQuickPrompts({
  prompts,
  flowKey,
  onPick,
  disabled,
}: {
  prompts: QuickPrompt[];
  flowKey?: string;
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (!prompts.length) return null;

  return (
    <div className="composer-quick-prompts" aria-label="快捷输入">
      <div className="composer-quick-list">
        {prompts.map((item) => (
          <button
            key={item.text}
            type="button"
            className={`composer-quick-item${flowKey ? ` tag-${flowKey}` : ""}`}
            title={item.text}
            disabled={disabled}
            onClick={() => onPick(item.text)}
          >
            {item.label?.trim() || previewText(item.text)}
          </button>
        ))}
      </div>
    </div>
  );
}
